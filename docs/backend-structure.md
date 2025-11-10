# Backend Structure: Nova Code

## Архитектурная схема
Трёхслойная архитектура:
1. **Command Layer** — Tauri commands (API для frontend)
2. **Service Layer** — бизнес-логика (файлы, Git, LSP)
3. **Infrastructure Layer** — работа с ОС (fs, процессы, SQLite)

## Модули

### `src-tauri/src/commands/`
- `file_commands.rs` — открытие/сохранение/удаление файлов, чтение папок
- `git_commands.rs` — status, diff, commit, push/pull
- `terminal_commands.rs` — создание PTY, отправка команд
- `settings_commands.rs` — чтение/запись конфига
- `lsp_commands.rs` — запуск LSP-сервера, проксирование JSON-RPC

### `src-tauri/src/services/`
- `file_service.rs` — рекурсивный обход директорий, watchdog для изменений
- `git_service.rs` — обёртка над git2, кэширование статуса
- `lsp_manager.rs` — lifecycle LSP-процессов, маппинг языков → серверы
- `config_service.rs` — парсинг JSON-конфига, валидация

### `src-tauri/src/db/`
- `schema.rs` — SQLite таблицы (recent_files, settings, lsp_cache)
- `repository.rs` — CRUD для работы с БД

### `src-tauri/src/utils/`
- `path_utils.rs` — нормализация путей, относительные/абсолютные
- `process_utils.rs` — управление дочерними процессами (терминал, LSP)

## API-эндпоинты (Tauri Commands)

### File Operations
- `open_file(path: String) -> Result<String, Error>` — содержимое файла
- `save_file(path: String, content: String) -> Result<(), Error>`
- `read_directory(path: String) -> Result<Vec<FileEntry>, Error>`
- `watch_directory(path: String) -> EventStream`

### Git
- `git_status(repo_path: String) -> Result<GitStatus, Error>`
- `git_diff(file_path: String) -> Result<String, Error>`
- `git_commit(message: String, files: Vec<String>) -> Result<(), Error>`

### Terminal
- `create_terminal(shell: String) -> Result<u32, Error>` — возвращает terminal_id
- `send_to_terminal(terminal_id: u32, input: String)`
- `terminal_output_stream(terminal_id: u32) -> EventStream`

### LSP
- `start_lsp(language: String) -> Result<u32, Error>` — lsp_id
- `lsp_request(lsp_id: u32, method: String, params: Value) -> Result<Value, Error>`

### Settings
- `get_settings() -> Result<Config, Error>`
- `update_settings(config: Config) -> Result<(), Error>`

## Модели данных

struct FileEntry {
path: String,
name: String,
is_directory: bool,
size: u64,
modified: i64,
}

struct GitStatus {
branch: String,
modified: Vec<String>,
staged: Vec<String>,
untracked: Vec<String>,
}

struct Config {
theme: String,
font_size: u8,
keybindings: HashMap<String, String>,
lsp_servers: HashMap<String, String>,
}

text

## Dependency Flow
- Commands → Services → Infrastructure
- Services не зависят друг от друга (слабая связанность)
- DB repository инжектится через DI-паттерн
- LSP Manager использует Process Utils для управления процессами