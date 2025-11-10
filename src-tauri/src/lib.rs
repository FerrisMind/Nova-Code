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
use std::{fs, io::Write, path::PathBuf};
use tauri::Manager;

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
