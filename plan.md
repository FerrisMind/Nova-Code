# План интеграции и оптимизации Monaco

Общий прогресс: 0%

---

## Задачи

### 1. Централизация тем Monaco через ThemeManager и ThemeState

- ⬜️ Вынести маппинг `ThemeState + editorSettings.theme → monacoThemeId` в helper
- ⬜️ Перенести применение темы (`setTheme`) в `themeManager.applyTheme(monacoThemeId)` из `MonacoHost.svelte`
- ⬜️ Удалить установку темы из `EditorCore.attachTo` и `EditorCore.configure`, оставив там только редакторские опции


### 2. Курсор и метаданные модели для StatusBar

- ⬜️ Подключить `initCursorTracking(core)` в `MonacoHost.svelte` после успешной инициализации `EditorCore`
- ⬜️ Подключить `initEditorMeta(core)` в `MonacoHost.svelte` для обновления `activeEditorMeta`
- ⬜️ Убедиться, что сторы `cursorPosition` и `activeEditorMeta` корректно обновляют `StatusBar` для активного редактора


### 3. Интеграция diagnostics Monaco с diagnosticsStore

- ⬜️ Добавить модуль `diagnosticsAdapter` с подпиской на `monaco.editor.onDidChangeMarkers`
- ⬜️ Организовать маппинг `uri → fileId` через существующий `EditorCore` и формирование `EditorDiagnostic[]`
- ⬜️ Вызывать `updateDiagnosticsForFile(fileId, diagnostics)` из адаптера и инициализировать/очищать его из `MonacoHost.svelte`


### 4. Поддержка дополнительных языков (Rust, TOML и др.) через basic-languages

- ⬜️ Добавить модуль `languageSupport` с `mapLanguageIdToMonaco(langId)` и `ensureLanguageRegistered(langId)`
- ⬜️ Реализовать lazy-importы `monaco-editor/esm/vs/basic-languages/*` для необходимых языков (rs, toml, py и т.п.)
- ⬜️ Вызывать `ensureLanguageRegistered(language)` и использовать нормализованный monaco-ID в `EditorCore.setModel`


### 5. Обработка больших и бинарных файлов на уровне EditorArea

- ⬜️ Добавить `fileValidator` (проверка размера, бинарности, формирование `FileValidationResult`)
- ⬜️ В `EditorArea` вызывать `validateFile(path, size)` до чтения содержимого и выбора режима (error view / warning + оптимизации)
- ⬜️ Для файлов 10–50 МБ применять рекомендованные оптимизации к `MonacoHost.options`, для >50 МБ и бинарных показывать простой error-экран без Monaco


### 6. Финальная проверка и минимальная уборка

- ⬜️ Проверить отсутствие лишних прямых вызовов `monaco.editor.setTheme(...)` вне ThemeManager/adapter
- ⬜️ Убедиться, что все init-функции (курсор, метаданные, diagnostics) idempotent и не создают утечек при размонтировании `MonacoHost`
- ⬜️ Локально пройтись по основным сценариям (открытие/редактирование файлов, смена темы, большие файлы) и зафиксировать возможные follow-up’ы
