# Nova Code Settings — Tauri Integration

Этот документ описывает фактическую Tauri v2-интеграцию подсистемы настроек Nova Code. Все сведения основаны на реализации в [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs:1) и фронтенд-сторах настроек.

Ключевые модули:
- Backend:
  - [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs:1)
- Frontend:
  - [`stores/settingsStore.ts`](src/lib/stores/settingsStore.ts:1)
  - [`stores/settingsProfilesStore.ts`](src/lib/stores/settingsProfilesStore.ts:1)
  - [`stores/settingsHistoryStore.ts`](src/lib/stores/settingsHistoryStore.ts:1)
  - [`settings/registry.ts`](src/lib/settings/registry.ts:1)
  - [`settings/types.ts`](src/lib/settings/types.ts:1)

## 1. Назначение и хранение данных

Tauri-слой отвечает за persistance профилей, истории и экспорт/импорт настроек. Все операции выполняются через `tauri::command` и используют безопасные пути.

Хранилище:

- Базовая директория:
  - вычисляется через `tauri::api::path::app_config_dir(config)` (см. [`AppPaths::new`](src-tauri/src/lib.rs:35));
  - директория создается при инициализации (если отсутствует).
- Файлы:
  - `profiles.json`
    - список профилей настроек.
  - `history.json`
    - список записей истории изменений.
- Экспорт:
  - на стороне Rust:
    - `settings_export` принимает структуру `SettingsExportPayload` и возвращает JSON-строку;
  - на стороне фронтенда:
    - строка сохраняется/обрабатывается вызывающим кодом (напр. через диалог сохранения).

Форматы структур синхронизированы с фронтендом:

- `SettingsSnapshot` (Rust, [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs:51)):
  - `editor: serde_json::Value`
  - `theme: serde_json::Value`
- Профили:
  - `SettingsProfileSerde`:
    - `id: String`
    - `label: String`
    - `snapshot: SettingsSnapshot`
    - `icon: Option<String>`
    - `isDefault: bool`
- История:
  - `SettingsHistoryEntrySerde`:
    - `id: String`
    - `timestamp: i64`
    - `changedSettingId: String`
    - `oldValue: serde_json::Value`
    - `newValue: serde_json::Value`
    - `source?: String`
    - `batchId?: String`
- Экспорт:
  - `SettingsExportPayload`:
    - `version: u8`
    - `createdAt: String` (ISO)
    - `snapshot: SettingsSnapshot`

## 2. Реальные команды Tauri

Все команды зарегистрированы в `invoke_handler` в [`run()`](src-tauri/src/lib.rs:247).

### 2.1. Профили

1) `settings_profiles_load`

- Сигнатура (Rust):
  - `async fn settings_profiles_load(app: tauri::AppHandle) -> Result<Vec<SettingsProfileSerde>, String>`
- Поведение:
  - читает `profiles.json` из `app_config_dir`;
  - при отсутствии файла возвращает `[]`;
  - парсит JSON в `Vec<SettingsProfileSerde>`.
- Использование на фронтенде:
  - [`settingsProfilesStore.init`](src/lib/stores/settingsProfilesStore.ts:176) вызывает:
    - `invoke('settings_profiles_load')` для начальной загрузки.

2) `settings_profiles_save`

- Сигнатура:
  - `async fn settings_profiles_save(app: tauri::AppHandle, profiles: Vec<SettingsProfileSerde>) -> Result<(), String>`
- Поведение:
  - сериализует `profiles` в `profiles.json` (pretty JSON);
  - создает директорию при необходимости.
- Использование:
  - [`settingsProfilesStore`](src/lib/stores/settingsProfilesStore.ts:150) вызывает `invoke('settings_profiles_save', { profiles })` после любых изменений.

### 2.2. История

1) `settings_history_load`

- Сигнатура:
  - `async fn settings_history_load(app: tauri::AppHandle) -> Result<Vec<SettingsHistoryEntrySerde>, String>`
- Поведение:
  - читает `history.json` из `app_config_dir`;
  - при отсутствии файла возвращает `[]`.
- Использование:
  - [`createSettingsHistoryStore.init`](src/lib/stores/settingsHistoryStore.ts:125) вызывает `invoke('settings_history_load')` для восстановления истории.

2) `settings_history_save`

- Сигнатура:
  - `async fn settings_history_save(app: tauri::AppHandle, entries: Vec<SettingsHistoryEntrySerde>) -> Result<(), String>`
- Поведение:
  - перезаписывает `history.json` сохраненным списком.
- Использование:
  - [`persistHistory`](src/lib/stores/settingsHistoryStore.ts:84) вызывает `invoke('settings_history_save', { entries })` при изменении истории.

3) `settings_history_clear`

- Сигнатура:
  - `async fn settings_history_clear(app: tauri::AppHandle) -> Result<(), String>`
- Поведение:
  - удаляет `history.json`, если файл существует.
- Использование:
  - [`clearHistory`](src/lib/stores/settingsHistoryStore.ts:267) вызывает `invoke('settings_history_clear')` после сброса in-memory истории.

### 2.3. Экспорт / Импорт

1) `settings_export`

- Сигнатура:
  - `async fn settings_export(_app: tauri::AppHandle, snapshot: SettingsExportPayload) -> Result<String, String>`
- Поведение:
  - сериализует переданный `SettingsExportPayload` в JSON-строку;
  - не пишет файлы, не читает состояние самостоятельно.
- Ожидаемое использование:
  - фронтенд формирует:
    - `SettingsExportPayload { version, createdAt, snapshot }`,
    - `snapshot` строится на базе [`settingsStore.getSnapshot()`](src/lib/stores/settingsStore.ts:242);
  - вызывает `invoke('settings_export', { snapshot: payload })`;
  - сохраняет возвращенный JSON пользователю (save dialog / clipboard и т.д.).

2) `settings_import`

- Типы:
  - `SettingsImportRequest { payload: SettingsExportPayload }`
- Сигнатура:
  - `async fn settings_import(_app: tauri::AppHandle, request: SettingsImportRequest) -> Result<Vec<AppliedChangeLike>, String>`
- Поведение:
  - проверяет `payload.version`:
    - при несовместимой версии — `Err("Unsupported settings export version")`.
  - строит patch (вектор `AppliedChangeLike`):
    - для каждого поля `editor.*` из `payload.snapshot.editor`:
      - `id = "editor.{key}"`, `value = value`.
    - для каждого поля `theme.*` из `payload.snapshot.theme`:
      - `id = "theme.{key}"`, `value = value`.
  - не применяет изменения сам; только возвращает предлагаемый patch.
- Применение на фронтенде:
  - вызывающий код:
    - загружает JSON-файл,
    - валидирует структуру,
    - вызывает `invoke('settings_import', { payload })`,
    - получает `[{ id, value }, ...]`,
    - передает массив в [`settingsStore.applyChanges(patch, { source: 'import' })`](src/lib/stores/settingsStore.ts:248),
    - при необходимости обновляет baseline и историю.

Таким образом:
- логика экспорта/импорта значений реализуется фронтендом;
- Rust-слой предоставляет гарантированно совместимый формат и простую трансформацию.

## 3. Формат данных и соответствие фронтенду

Фронтенд-тип `SettingsSnapshot` из [`settings/types.ts`](src/lib/settings/types.ts:146) и Rust-тип `SettingsSnapshot` из [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs:51) согласованы по назначению:

- фронтенд:
  - жестко типизированные структуры `editor: EditorSettings`, `theme: ThemeState`;
- backend:
  - `serde_json::Value`, допускающий эволюцию схемы без ломающих изменений.

Профили и история:

- [`settingsProfilesStore.ts`](src/lib/stores/settingsProfilesStore.ts:33) ожидает структуру, согласованную с `SettingsProfileSerde`:
  - поля `id`, `label`, `snapshot`, `icon`, `isDefault` интерпретируются напрямую.
- [`settingsHistoryStore.ts`](src/lib/stores/settingsHistoryStore.ts:34) совместим с `SettingsHistoryEntrySerde`:
  - при импорте/загрузке используется только существующие поля;
  - дополнительные поля (`source`, `batchId`) имеют `#[serde(default)]` в Rust-структуре.

Экспорт/импорт:

- Вся цепочка:
  - `settingsStore.getSnapshot()` ↔ `SettingsSnapshot` (TS)
  - сериализация/десериализация через `SettingsExportPayload`
  - `settings_export` / `settings_import` в Rust
  - применение patch через `settingsStore.applyChanges`
- гарантирует:
  - единый формат,
  - отсутствие дублирования бизнес-логики.

## 4. Точки интеграции во фронтенде

Фронтенд вызывает Tauri-команды только через согласованные модули:

- Профили:
  - [`settingsProfilesStore.init`](src/lib/stores/settingsProfilesStore.ts:176) → `settings_profiles_load`
  - операции изменения профилей → `settings_profiles_save`
- История:
  - [`createSettingsHistoryStore.init`](src/lib/stores/settingsHistoryStore.ts:125) → `settings_history_load`
  - изменение истории → `settings_history_save`
  - очистка истории → `settings_history_clear`
- Экспорт/импорт:
  - абстрактный слой (на базе API из [`settings/commands_and_quick_actions.api.md`](src/lib/settings/commands_and_quick_actions.api.md:1)):
    - использует `settings_export` и `settings_import` для формирования и интерпретации snapshot-пакетов.

Settings UI (`SettingsShell`, контролы, preview) не вызывают Tauri напрямую:
- взаимодействуют только с:
  - доменными сторами,
  - `settingsStore`,
  - `settingsProfilesStore`,
  - `settingsHistoryStore`,
  - абстракциями экспорта/импорта.

## 5. Безопасность и best practices

Реализация соответствует ключевым практикам Tauri v2 и общим требованиям безопасности:

- Пути:
  - только `app_config_dir` через `tauri::api::path::app_config_dir`;
  - явное создание директорий (`fs::create_dir_all`);
  - отсутствие произвольных путей, зависящих от пользовательского ввода.
- Запись/чтение JSON:
  - обертки `read_json_file` и `write_json_file` с:
    - обработкой отсутствия файла;
    - проверкой пустого содержимого;
    - детализированными сообщениями об ошибках.
- Импорт:
  - `settings_import`:
    - валидирует `version`;
    - не применяет изменения к системе сам;
    - возвращает только структурированный patch, который фронтенд может дополнительно валидировать.
- Отказоустойчивость:
  - при ошибках IO/JSON — ошибки возвращаются как `Err(String)`;
  - фронтенд-сторы отражают ошибки в своем состоянии (`error`), не нарушая общий контракт.

Любые изменения в командах, форматах данных или местах хранения должны:

1. Быть согласованы с существующими типами фронтенда (`SettingsSnapshot`, профили, история).
2. Быть проверены по официальной документации Tauri v2:
   - команды,
   - работа с `app_config_dir`,
   - I/O.
3. Быть дополнительно валидированы через Context7:
   - для актуальности примеров и корректности использования API.

## 6. Правила для дальнейших изменений

При добавлении новых возможностей подсистемы настроек с участием Tauri:

- Не внедрять Tauri-вызовы напрямую в UI-компоненты:
  - использовать отдельные модули persistance/интеграции.
- Соблюдать существующую схему:
  - фронтенд формирует/читает `SettingsSnapshot` и производные структуры;
  - Rust-слой отвечает только за надежное хранение и простые трансформации.
- При изменении формата:
  - повышать `version` в `SettingsExportPayload`;
  - в `settings_import` реализовывать обработку нескольких версий или явный отказ с понятной ошибкой.
- Перед мержем:
  - сверяться с актуальными Tauri v2 docs и Context7;
  - проверять, что контракты в:
    - [`README_SETTINGS.md`](src/lib/settings/README_SETTINGS.md:1),
    - [`commands_and_quick_actions.api.md`](src/lib/settings/commands_and_quick_actions.api.md:1),
    - [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs:1)
  - остаются согласованными.

Этот README фиксирует текущее состояние Tauri-интеграции системы настроек и служит источником правды для backend-части Nova Code.