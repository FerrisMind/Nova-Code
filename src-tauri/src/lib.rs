// src-tauri/src/lib.rs
// -----------------------------------------------------------------------------
// Tauri v2 backend for Nova Code settings system.
// Реальные команды для профилей, истории и экспорта/импорта настроек.
// Без заглушек: все команды читают/пишут JSON-файлы в app_config_dir.
//
// Команды, используемые фронтендом:
// - settings_profiles_load
// - settings_profiles_save
// - settings_history_load
// - settings_history_save
// - settings_history_clear
// - settings_export
// - settings_import
//
// Хранение:
// - profiles.json
// - history.json
//
// Используем:
// - tauri::api::path::app_config_dir
// - serde / serde_json
// -----------------------------------------------------------------------------

mod git;

use notify::{
    event::{Event, EventKind, ModifyKind},
    recommended_watcher, RecommendedWatcher, RecursiveMode, Watcher,
};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Emitter, Manager, State};

use git::{
    types::{CommitInfo, GitDiff, GitFileStatus, GitRepositoryStatus},
    GitState,
};

#[derive(Debug)]
struct AppPaths {
    config_dir: PathBuf,
}

static FILE_WATCHER: Lazy<Mutex<Option<RecommendedWatcher>>> = Lazy::new(|| Mutex::new(None));

impl AppPaths {
    fn new(handle: &tauri::AppHandle) -> Result<Self, String> {
        let base = handle
            .path()
            .app_config_dir()
            .map_err(|e| format!("Failed to resolve app_config_dir: {e}"))?;
        fs::create_dir_all(&base).map_err(|e| format!("Failed to create config dir: {e}"))?;
        Ok(Self { config_dir: base })
    }

    fn file(&self, name: &str) -> PathBuf {
        self.config_dir.join(name)
    }
}

// -----------------------------------------------------------------------------
// Shared types (must align with frontend contracts)
// -----------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsSnapshot {
    pub editor: serde_json::Value,
    pub theme: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsProfileSerde {
    pub id: String,
    pub label: String,
    pub snapshot: SettingsSnapshot,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsHistoryEntrySerde {
    pub id: String,
    pub timestamp: i64,
    pub changed_setting_id: String,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub batch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsExportPayload {
    pub version: u8,
    pub created_at: String,
    pub snapshot: SettingsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppliedChangeLike {
    pub id: String,
    pub value: serde_json::Value,
}

/// Search result hit for project-wide search
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub match_text: String,
    pub line_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub size: Option<u64>,
    pub modified: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileEntry>>,
}

// -----------------------------------------------------------------------------
// Low-level file helpers
// -----------------------------------------------------------------------------

fn read_json_file<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<Option<T>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let data =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    if data.trim().is_empty() {
        return Ok(None);
    }
    let value = serde_json::from_str::<T>(&data)
        .map_err(|e| format!("Failed to parse {}: {e}", path.display()))?;
    Ok(Some(value))
}

fn write_json_file<T: Serialize>(path: &PathBuf, value: &T) -> Result<(), String> {
    let data = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Failed to serialize {}: {e}", path.display()))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create dir {}: {e}", parent.display()))?;
    }
    let mut file =
        fs::File::create(path).map_err(|e| format!("Failed to create {}: {e}", path.display()))?;
    file.write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write {}: {e}", path.display()))?;
    Ok(())
}

const MAX_TREE_DEPTH: usize = 4;

fn resolve_path(path_str: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path_str);
    if candidate.is_absolute() {
        return Ok(candidate);
    }
    std::env::current_dir()
        .map_err(|e| format!("Failed to resolve current_dir: {e}"))
        .map(|cwd| cwd.join(candidate))
}

fn metadata_timestamp(metadata: &fs::Metadata) -> Option<i64> {
    metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs() as i64)
}

fn build_file_entry(path: &Path, root: &Path, depth: usize) -> Result<FileEntry, String> {
    let metadata =
        fs::metadata(path).map_err(|e| format!("Failed to stat {}: {e}", path.display()))?;
    let relative = path.strip_prefix(root).unwrap_or(path);
    let id = if relative.as_os_str().is_empty() {
        ".".to_string()
    } else {
        relative.to_string_lossy().replace('\\', "/")
    };
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| relative.display().to_string());
    let node_type = if metadata.is_dir() { "dir" } else { "file" }.to_string();
    let children = if metadata.is_dir() && depth > 0 {
        Some(read_workspace_entries(path, root, depth - 1)?)
    } else {
        None
    };
    Ok(FileEntry {
        id,
        name,
        path: path.to_string_lossy().to_string(),
        node_type,
        size: if metadata.is_file() {
            Some(metadata.len())
        } else {
            None
        },
        modified: metadata_timestamp(&metadata),
        children,
    })
}

fn read_workspace_entries(dir: &Path, root: &Path, depth: usize) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    // If we fail to read the directory (e.g. Access Denied), just return empty list
    // instead of failing the whole operation.
    let dir_iter = match fs::read_dir(dir) {
        Ok(iter) => iter,
        Err(_) => return Ok(Vec::new()),
    };

    for entry in dir_iter.flatten() {
        // Try to build entry, skip if fails (e.g. metadata access denied)
        if let Ok(file_entry) = build_file_entry(&entry.path(), root, depth) {
            entries.push(file_entry);
        }
    }
    entries.sort_by(|a, b| {
        let a_dir = a.node_type == "dir";
        let b_dir = b.node_type == "dir";
        match (a_dir, b_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    Ok(entries)
}

#[tauri::command]
async fn read_workspace(root: String) -> Result<Vec<FileEntry>, String> {
    let resolved = resolve_path(&root)?;
    if !resolved.exists() {
        return Err(format!(
            "Workspace root {} does not exist",
            resolved.display()
        ));
    }
    if !resolved.is_dir() {
        return Err(format!(
            "Workspace root {} is not a directory",
            resolved.display()
        ));
    }
    read_workspace_entries(&resolved, &resolved, MAX_TREE_DEPTH)
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    let resolved = resolve_path(&path)?;
    if !resolved.exists() || !resolved.is_file() {
        return Err(format!("File {} not found", resolved.display()));
    }

    let data =
        fs::read(&resolved).map_err(|e| format!("Failed to read {}: {e}", resolved.display()))?;

    // Use lossy conversion to handle non-UTF8 files (like system files or binary)
    // This replaces invalid sequences with  instead of failing
    Ok(String::from_utf8_lossy(&data).into_owned())
}

#[tauri::command]
async fn create_file(path: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {}: {e}", parent.display()))?;
    }
    fs::File::create(&resolved)
        .map_err(|e| format!("Failed to create {}: {e}", resolved.display()))?;
    Ok(())
}

#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    fs::create_dir_all(&resolved)
        .map_err(|e| format!("Failed to create directory {}: {e}", resolved.display()))
}

#[tauri::command]
async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let from = resolve_path(&old_path)?;
    let to = resolve_path(&new_path)?;
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {}: {e}", parent.display()))?;
    }
    fs::rename(&from, &to).map_err(|e| format!("Failed to rename: {e}"))
}

#[tauri::command]
async fn delete_file(path: String, use_trash: bool) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    if use_trash {
        trash::delete(&resolved).map_err(|e| format!("Failed to move to trash: {e}"))?;
    } else if resolved.is_dir() {
        fs::remove_dir_all(&resolved)
            .map_err(|e| format!("Failed to delete {}: {e}", resolved.display()))?;
    } else {
        fs::remove_file(&resolved)
            .map_err(|e| format!("Failed to delete {}: {e}", resolved.display()))?;
    }

    Ok(())
}

#[tauri::command]
async fn reveal_in_explorer(path: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    if !resolved.exists() {
        return Err(format!("File {} not found", resolved.display()));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(resolved)
            .status()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&resolved)
            .status()
            .map_err(|e| format!("Failed to reveal file: {e}"))?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let dir = resolved
            .parent()
            .ok_or_else(|| "Cannot reveal root path".to_string())?;
        Command::new("xdg-open")
            .arg(dir)
            .status()
            .map_err(|e| format!("Failed to open directory: {e}"))?;
    }

    Ok(())
}

#[derive(Debug, Clone, Deserialize)]
struct WriteFileRequest {
    path: String,
    content: String,
}

#[tauri::command]
async fn write_file(_app: AppHandle, request: WriteFileRequest) -> Result<(), String> {
    let resolved = resolve_path(&request.path)?;
    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            format!(
                "Failed to create parent directory {}: {e}",
                parent.display()
            )
        })?;
    }
    fs::write(&resolved, request.content.as_bytes())
        .map_err(|e| format!("Failed to write {}: {e}", resolved.display()))?;
    // Не эмитим file-changed здесь: автосохранения и обычные записи файла
    // не должны триггерить полный рефреш дерева файлов. Для структурных
    // изменений (создание/удаление/переименование) полагаемся на watcher ниже.
    Ok(())
}

#[tauri::command]
async fn start_file_watcher(app: AppHandle) -> Result<(), String> {
    let mut guard = FILE_WATCHER
        .lock()
        .map_err(|e| format!("Watcher lock poisoned: {e}"))?;

    if guard.is_some() {
        return Ok(());
    }

    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

    let mut watcher = recommended_watcher(move |res| {
        let _ = tx.send(res);
    })
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    let watch_path = std::env::current_dir().map_err(|e| format!("Failed to resolve cwd: {e}"))?;
    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch {}: {e}", watch_path.display()))?;

    let app_handle = app.clone();
    thread::spawn(move || {
        while let Ok(event_result) = rx.recv() {
            if let Ok(event) = event_result {
                // Фильтруем только структурные события, влияющие на дерево файлов:
                // создание, удаление и переименование. Изменения содержимого
                // (Modify(Data/Metadata)) игнорируем, чтобы автосейвы не
                // перерисовывали Explorer.
                let is_structural = matches!(
                    &event.kind,
                    EventKind::Create(_)
                        | EventKind::Remove(_)
                        | EventKind::Modify(ModifyKind::Name(_))
                );

                if !is_structural {
                    continue;
                }

                for path in &event.paths {
                    let _ = app_handle.emit("file-changed", path.to_string_lossy().to_string());
                }
            }
        }
    });

    *guard = Some(watcher);
    Ok(())
}

// -----------------------------------------------------------------------------
// Search: Project-wide file search with regex support
// -----------------------------------------------------------------------------

/// Search request payload
#[derive(Debug, Clone, Deserialize)]
struct SearchFilesRequest {
    root: String,
    query: String,
    use_regex: bool,
    case_sensitive: bool,
}

/// Global flag for cancelling active search operations
static SEARCH_CANCELLED: Lazy<Arc<AtomicBool>> = Lazy::new(|| Arc::new(AtomicBool::new(false)));

#[tauri::command]
async fn cancel_search() -> Result<(), String> {
    SEARCH_CANCELLED.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
async fn search_files(app: AppHandle, request: SearchFilesRequest) -> Result<(), String> {
    // Reset cancellation flag
    SEARCH_CANCELLED.store(false, Ordering::Relaxed);

    let root_path = resolve_path(&request.root)?;
    if !root_path.exists() || !root_path.is_dir() {
        return Err(format!(
            "Search root {} is not a directory",
            root_path.display()
        ));
    }

    let query = request.query.clone();
    let use_regex = request.use_regex;
    let case_sensitive = request.case_sensitive;

    // Spawn search in background thread to avoid blocking
    thread::spawn(move || {
        let _ = perform_search(app, root_path, query, use_regex, case_sensitive);
    });

    Ok(())
}

fn perform_search(
    app: AppHandle,
    root: PathBuf,
    query: String,
    use_regex: bool,
    case_sensitive: bool,
) -> Result<(), String> {
    // Compile regex if needed
    let regex_pattern = if use_regex {
        let pattern = if case_sensitive {
            query.clone()
        } else {
            format!("(?i){}", query)
        };
        match Regex::new(&pattern) {
            Ok(re) => Some(re),
            Err(e) => {
                let _ = app.emit("search-error", format!("Invalid regex: {}", e));
                return Err(format!("Invalid regex: {}", e));
            }
        }
    } else {
        None
    };

    // Prepare simple string search
    let search_query = if !use_regex && !case_sensitive {
        query.to_lowercase()
    } else {
        query.clone()
    };

    // Walk directory tree
    let walker = walkdir::WalkDir::new(&root)
        .follow_links(false)
        .max_depth(10)
        .into_iter()
        .filter_entry(|e| {
            // Skip hidden directories and common excludes
            let file_name = e.file_name().to_string_lossy();
            !file_name.starts_with('.')
                && file_name != "node_modules"
                && file_name != "target"
                && file_name != "dist"
                && file_name != "build"
        });

    let mut result_count = 0;
    const MAX_RESULTS: usize = 1000;

    for entry in walker {
        // Check if search was cancelled
        if SEARCH_CANCELLED.load(Ordering::Relaxed) {
            let _ = app.emit("search-cancelled", ());
            return Ok(());
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        // Only search files
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        // Skip binary files by extension
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            if matches!(
                ext_str.as_str(),
                "png"
                    | "jpg"
                    | "jpeg"
                    | "gif"
                    | "ico"
                    | "woff"
                    | "woff2"
                    | "ttf"
                    | "eot"
                    | "exe"
                    | "dll"
                    | "so"
                    | "dylib"
            ) {
                continue;
            }
        }

        // Try to read file as UTF-8
        let file = match fs::File::open(path) {
            Ok(f) => f,
            Err(_) => continue,
        };

        let reader = BufReader::new(file);
        let relative_path = path
            .strip_prefix(&root)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/");

        // Search line by line
        for (line_num, line_result) in reader.lines().enumerate() {
            if SEARCH_CANCELLED.load(Ordering::Relaxed) {
                let _ = app.emit("search-cancelled", ());
                return Ok(());
            }

            let line = match line_result {
                Ok(l) => l,
                Err(_) => break, // Skip non-UTF8 files
            };

            let line_number = (line_num + 1) as u32;

            // Perform search
            let matches = if let Some(ref re) = regex_pattern {
                re.find_iter(&line)
                    .map(|mat| (mat.start(), mat.end() - mat.start()))
                    .collect::<Vec<_>>()
            } else {
                // Simple string search
                let search_in = if case_sensitive {
                    line.clone()
                } else {
                    line.to_lowercase()
                };

                let mut matches = Vec::new();
                let mut start = 0;
                while let Some(pos) = search_in[start..].find(&search_query) {
                    let absolute_pos = start + pos;
                    matches.push(absolute_pos);
                    start = absolute_pos + search_query.len();
                }
                matches
                    .into_iter()
                    .map(|pos| (pos, search_query.len()))
                    .collect::<Vec<_>>()
            };

            // Emit results
            for (pos, len) in matches {
                let match_text = line.chars().skip(pos).take(len).collect::<String>();

                let hit = SearchHit {
                    file: relative_path.clone(),
                    line: line_number,
                    column: (pos + 1) as u32,
                    match_text,
                    line_text: line.clone(),
                };

                let _ = app.emit("search-hit", &hit);
                result_count += 1;

                if result_count >= MAX_RESULTS {
                    let _ = app.emit("search-complete", result_count);
                    return Ok(());
                }
            }
        }
    }

    let _ = app.emit("search-complete", result_count);
    Ok(())
}

// -----------------------------------------------------------------------------
// Tauri commands: Profiles
// -----------------------------------------------------------------------------

#[tauri::command]
async fn settings_profiles_load(
    app: tauri::AppHandle,
) -> Result<Vec<SettingsProfileSerde>, String> {
    let paths = AppPaths::new(&app)?;
    let file = paths.file("profiles.json");
    let profiles: Vec<SettingsProfileSerde> = read_json_file(&file)?.unwrap_or_default();
    Ok(profiles)
}

#[tauri::command]
async fn settings_profiles_save(
    app: tauri::AppHandle,
    profiles: Vec<SettingsProfileSerde>,
) -> Result<(), String> {
    let paths = AppPaths::new(&app)?;
    let file = paths.file("profiles.json");
    write_json_file(&file, &profiles)
}

// -----------------------------------------------------------------------------
// Tauri commands: History
// -----------------------------------------------------------------------------

#[tauri::command]
async fn settings_history_load(
    app: tauri::AppHandle,
) -> Result<Vec<SettingsHistoryEntrySerde>, String> {
    let paths = AppPaths::new(&app)?;
    let file = paths.file("history.json");
    let entries: Vec<SettingsHistoryEntrySerde> = read_json_file(&file)?.unwrap_or_default();
    Ok(entries)
}

#[tauri::command]
async fn settings_history_save(
    app: tauri::AppHandle,
    entries: Vec<SettingsHistoryEntrySerde>,
) -> Result<(), String> {
    let paths = AppPaths::new(&app)?;
    let file = paths.file("history.json");
    write_json_file(&file, &entries)
}

#[tauri::command]
async fn settings_history_clear(app: tauri::AppHandle) -> Result<(), String> {
    let paths = AppPaths::new(&app)?;
    let file = paths.file("history.json");
    if file.exists() {
        fs::remove_file(&file).map_err(|e| format!("Failed to remove {}: {e}", file.display()))?;
    }
    Ok(())
}

// -----------------------------------------------------------------------------
// Tauri commands: Export / Import
// -----------------------------------------------------------------------------

// settings_export:
// - Получает SettingsExportPayload от фронта
// - Возвращает JSON-строку (может быть сохранена фронтом или другим командным слоем)
#[tauri::command]
async fn settings_export(
    _app: tauri::AppHandle,
    snapshot: SettingsExportPayload,
) -> Result<String, String> {
    serde_json::to_string_pretty(&snapshot)
        .map_err(|e| format!("Failed to serialize export payload: {e}"))
}

// settings_import:
// - В минимальной реализации ожидает JSON-строку payload из invoke.
// - Для задачи: принимаем уже загруженный JSON-пакет и возвращаем patch.
// - Фактическое чтение файла на стороне фронта (input/file dialog).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsImportRequest {
    pub payload: SettingsExportPayload,
}

#[tauri::command]
async fn settings_import(
    _app: tauri::AppHandle,
    request: SettingsImportRequest,
) -> Result<Vec<AppliedChangeLike>, String> {
    let payload = request.payload;
    if payload.version != 1 {
        return Err("Unsupported settings export version".into());
    }

    let mut patch: Vec<AppliedChangeLike> = Vec::new();

    // editor.*
    if let Some(editor_obj) = payload.snapshot.editor.as_object() {
        for (key, value) in editor_obj {
            patch.push(AppliedChangeLike {
                id: format!("editor.{key}"),
                value: value.clone(),
            });
        }
    }

    // theme.*
    if let Some(theme_obj) = payload.snapshot.theme.as_object() {
        for (key, value) in theme_obj {
            patch.push(AppliedChangeLike {
                id: format!("theme.{key}"),
                value: value.clone(),
            });
        }
    }

    Ok(patch)
}

// -----------------------------------------------------------------------------
// Git commands
// -----------------------------------------------------------------------------

fn map_git_error(err: git::GitError) -> String {
    match err {
        git::GitError::NoRepository => "Git repository is not available".to_string(),
        git::GitError::InvalidInput(msg) => msg,
        git::GitError::Git(msg) | git::GitError::Io(msg) | git::GitError::Notify(msg) => msg,
    }
}

fn require_repo_root(state: &GitState) -> Result<PathBuf, String> {
    state
        .repository_root()
        .ok_or_else(|| "Git repository is not detected yet".to_string())
}

fn git_op_post(app: &AppHandle, git_state: &GitState) {
    git_state.invalidate_status_cache();
    git_state.emit_status_changed(app);
}

#[tauri::command]
async fn git_detect_repository(
    app: AppHandle,
    git_state: State<'_, GitState>,
    root: String,
) -> Result<Option<String>, String> {
    let resolved = resolve_path(&root)?;
    let detected = tauri::async_runtime::spawn_blocking(move || git::detect_repository(&resolved))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;

    if let Some(repo_root) = detected.clone() {
        git_state.set_repository_root(Some(repo_root.clone()));
        git_state.ensure_watcher(&app).map_err(map_git_error)?;
        git_state.emit_status_changed(&app);
        Ok(Some(repo_root.to_string_lossy().replace('\\', "/")))
    } else {
        git_state.set_repository_root(None);
        Ok(None)
    }
}

#[tauri::command]
async fn git_init(
    app: AppHandle,
    git_state: State<'_, GitState>,
    root: String,
) -> Result<(), String> {
    let resolved = resolve_path(&root)?;
    let repo_root = tauri::async_runtime::spawn_blocking(move || git::init_repository(&resolved))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;

    git_state.set_repository_root(Some(repo_root));
    git_state.ensure_watcher(&app).map_err(map_git_error)?;
    git_state.emit_status_changed(&app);
    Ok(())
}

#[tauri::command]
async fn git_get_status(
    app: AppHandle,
    git_state: State<'_, GitState>,
) -> Result<GitRepositoryStatus, String> {
    if let Some(cached) = git_state.get_cached_status() {
        return Ok(cached);
    }
    let repo_root = require_repo_root(&git_state)?;
    let status = tauri::async_runtime::spawn_blocking(move || git::collect_status(&repo_root))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_state.store_status_cache(status.clone());
    git_state.ensure_watcher(&app).map_err(map_git_error)?;
    Ok(status)
}

#[tauri::command]
async fn git_refresh_status(
    app: AppHandle,
    git_state: State<'_, GitState>,
) -> Result<GitRepositoryStatus, String> {
    let repo_root = require_repo_root(&git_state)?;
    let status = tauri::async_runtime::spawn_blocking(move || git::collect_status(&repo_root))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_state.store_status_cache(status.clone());
    git_state.emit_status_changed(&app);
    Ok(status)
}

#[tauri::command]
async fn git_get_file_statuses(
    git_state: State<'_, GitState>,
    paths: Vec<String>,
) -> Result<Vec<(String, GitFileStatus)>, String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::file_statuses(&repo_root, &paths))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)
}

#[tauri::command]
async fn git_stage_file(
    app: AppHandle,
    git_state: State<'_, GitState>,
    path: String,
) -> Result<(), String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::stage_file(&repo_root, &path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_op_post(&app, &git_state);
    Ok(())
}

#[tauri::command]
async fn git_unstage_file(
    app: AppHandle,
    git_state: State<'_, GitState>,
    path: String,
) -> Result<(), String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::unstage_file(&repo_root, &path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_op_post(&app, &git_state);
    Ok(())
}

#[tauri::command]
async fn git_stage_all(app: AppHandle, git_state: State<'_, GitState>) -> Result<u32, String> {
    let repo_root = require_repo_root(&git_state)?;
    let staged = tauri::async_runtime::spawn_blocking(move || git::stage_all(&repo_root))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_op_post(&app, &git_state);
    Ok(staged)
}

#[tauri::command]
async fn git_unstage_all(app: AppHandle, git_state: State<'_, GitState>) -> Result<u32, String> {
    let repo_root = require_repo_root(&git_state)?;
    let unstaged = tauri::async_runtime::spawn_blocking(move || git::unstage_all(&repo_root))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_op_post(&app, &git_state);
    Ok(unstaged)
}

#[tauri::command]
async fn git_discard_changes(
    app: AppHandle,
    git_state: State<'_, GitState>,
    paths: Vec<String>,
) -> Result<(), String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::discard_changes(&repo_root, &paths))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)?;
    git_op_post(&app, &git_state);
    Ok(())
}

#[tauri::command]
async fn git_commit(
    app: AppHandle,
    git_state: State<'_, GitState>,
    message: String,
) -> Result<String, String> {
    let repo_root = require_repo_root(&git_state)?;
    let commit_hash =
        tauri::async_runtime::spawn_blocking(move || git::commit_staged(&repo_root, &message))
            .await
            .map_err(|e| e.to_string())?
            .map_err(map_git_error)?;
    git_op_post(&app, &git_state);
    Ok(commit_hash)
}

#[tauri::command]
async fn git_get_history(
    git_state: State<'_, GitState>,
    offset: u32,
    limit: u32,
) -> Result<Vec<CommitInfo>, String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::read_history(&repo_root, offset, limit))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)
}

#[tauri::command]
async fn git_get_file_diff(
    git_state: State<'_, GitState>,
    path: String,
) -> Result<GitDiff, String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::working_diff(&repo_root, &path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)
}

#[tauri::command]
async fn git_get_staged_diff(
    git_state: State<'_, GitState>,
    path: String,
) -> Result<GitDiff, String> {
    let repo_root = require_repo_root(&git_state)?;
    tauri::async_runtime::spawn_blocking(move || git::staged_diff(&repo_root, &path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(map_git_error)
}

// -----------------------------------------------------------------------------
// App entry
// -----------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage::<AppPathsState>(AppPathsState)
        .manage::<GitState>(GitState::default())
        .invoke_handler(tauri::generate_handler![
            read_workspace,
            read_file,
            create_file,
            create_directory,
            rename_file,
            delete_file,
            reveal_in_explorer,
            write_file,
            start_file_watcher,
            search_files,
            cancel_search,
            settings_profiles_load,
            settings_profiles_save,
            settings_history_load,
            settings_history_save,
            settings_history_clear,
            settings_export,
            settings_import,
            git_detect_repository,
            git_init,
            git_get_status,
            git_refresh_status,
            git_get_file_statuses,
            git_stage_file,
            git_unstage_file,
            git_stage_all,
            git_unstage_all,
            git_discard_changes,
            git_commit,
            git_get_history,
            git_get_file_diff,
            git_get_staged_diff
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// State wrapper (lazy-init AppPaths using AppHandle)
#[derive(Default)]
struct AppPathsState;

impl AppPathsState {
    #[allow(dead_code)]
    fn get(&self, app: &tauri::AppHandle) -> Result<AppPaths, String> {
        AppPaths::new(app)
    }
}
