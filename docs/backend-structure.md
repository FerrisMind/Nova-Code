# Backend Structure: Nova Code (MVP)

Цель: минимальный, воспроизводимый backend под Tauri v2, закрывающий функции MVP (редактор, файловый проводник, поиск/замена, терминал, темы/настройки). Не включаем Git, расширения, LSP/IntelliSense, split/minimap/автосохранение.

## Слои
1. **Command Layer** — Tauri commands (API для фронтенда).
2. **Service Layer** — файловые операции, поиск, терминал, настройки.
3. **Infrastructure Layer** — fs, процесс-менеджер (PTY), SQLite/JSON конфиг, события (watcher).

## Директории
- `src-tauri/src/commands/`
  - `file_commands.rs` — чтение/запись/создание/удаление/переименование, дерево, watcher.
  - `search_commands.rs` — поиск текста (проект), поиск по именам.
  - `terminal_commands.rs` — PTY create/send/stream, resize, close.
  - `settings_commands.rs` — CRUD настроек.
- `src-tauri/src/services/`
  - `file_service.rs` — fs-операции + watcher (notify/polling fallback).
  - `search_service.rs` — walkdir + regex; потоковые результаты.
  - `terminal_service.rs` — PTY lifecycle (bash/zsh/pwsh/cmd), resize, cwd=workspace.
  - `config_service.rs` — JSON/SQLite конфиг (settings, last_workspace, shortcuts).
- `src-tauri/src/utils/`
  - `path_utils.rs` — нормализация путей, безопасные относительные пути.
  - `process_utils.rs` — запуск PTY, управление stdout/stderr.

## Команды (Tauri)
### File Operations
- `read_directory(path: String) -> Result<Vec<FileEntry>, Error>`
- `open_file(path: String) -> Result<String, Error>`
- `save_file(path: String, content: String) -> Result<(), Error>`
- `create_file(path: String) -> Result<(), Error>`
- `create_dir(path: String) -> Result<(), Error>`
- `delete_entry(path: String) -> Result<(), Error>`
- `rename_entry(old_path: String, new_path: String) -> Result<(), Error>`
- `watch_directory(path: String) -> EventStream<FileEvent>`

### Search
- `search_files(root: String, query: String, use_regex: bool) -> EventStream<SearchHit>`
- `search_names(root: String, query: String) -> Result<Vec<NameHit>, Error>`

### Terminal
- `create_terminal(shell: String) -> Result<u32, Error>` // возвращает terminal_id
- `send_to_terminal(id: u32, input: String) -> Result<(), Error>`
- `terminal_output_stream(id: u32) -> EventStream<TerminalChunk>`
- `resize_terminal(id: u32, cols: u16, rows: u16) -> Result<(), Error>`
- `close_terminal(id: u32) -> Result<(), Error>`

### Settings
- `get_settings() -> Result<Config, Error>`
- `update_settings(config: Config) -> Result<(), Error>`

## Структуры
```rust
struct FileEntry {
  path: String,
  name: String,
  is_directory: bool,
  size: u64,
  modified: i64,
}

struct FileEvent {
  kind: String, // created|deleted|modified|renamed
  path: String,
}

struct SearchHit {
  file: String,
  line: u32,
  column: u32,
  match_text: String,
}

struct NameHit {
  path: String,
  name: String,
}

struct TerminalChunk {
  id: u32,
  data: String,
}

struct Config {
  theme: String,          // light|dark
  font_family: String,
  font_size: u8,
  tab_size: u8,
  insert_spaces: bool,
  wrap: bool,
  auto_close_brackets: bool,
  auto_close_quotes: bool,
  last_workspace: Option<String>,
  last_active_file: Option<String>,
  keybindings: HashMap<String, String>, // command -> shortcut
}
```

## Потоки и события
- Watcher отправляет `FileEvent` в фронтенд; фронт обновляет дерево/вкладки.
- Поиск по проекту — EventStream `SearchHit` с возможностью отмены.
- Терминал — поток `TerminalChunk`; закрытие уведомляет фронтенд.
- Лёгкая шина событий: все EventStream проходят через единый emitter в фронте, чтобы синхронизировать дерево/вкладки/статус-бар без дублирования подписок.

## Dependency Flow
Commands → Services → Infrastructure. Сервисы не знают о UI, минимум shared state. Config сервис инкапсулирует формат хранения.
