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

use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::PathBuf, time::UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug)]
struct AppPaths {
    config_dir: PathBuf,
}

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

fn build_file_entry(
    path: &std::path::Path,
    root: &std::path::Path,
    depth: usize,
) -> Result<FileEntry, String> {
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

fn read_workspace_entries(
    dir: &std::path::Path,
    root: &std::path::Path,
    depth: usize,
) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir_iter =
        fs::read_dir(dir).map_err(|e| format!("Failed to read {}: {e}", dir.display()))?;
    for entry in dir_iter {
        let entry = entry.map_err(|e| format!("Failed to iterate {}: {e}", dir.display()))?;
        entries.push(build_file_entry(&entry.path(), root, depth)?);
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
    fs::read_to_string(&resolved).map_err(|e| format!("Failed to read {}: {e}", resolved.display()))
}

#[derive(Debug, Clone, Deserialize)]
struct WriteFileRequest {
    path: String,
    content: String,
}

#[tauri::command]
async fn write_file(app: AppHandle, request: WriteFileRequest) -> Result<(), String> {
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
    app.emit("file-changed", request.path)
        .map_err(|e| format!("Failed to emit file change event: {e}"))?;
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
// App entry
// -----------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage::<AppPathsState>(AppPathsState)
        .invoke_handler(tauri::generate_handler![
            read_workspace,
            read_file,
            write_file,
            settings_profiles_load,
            settings_profiles_save,
            settings_history_load,
            settings_history_save,
            settings_history_clear,
            settings_export,
            settings_import
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
