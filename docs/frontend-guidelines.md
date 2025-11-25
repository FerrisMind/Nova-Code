# Frontend Guidelines: Nova Code (MVP)

Цель: интерфейс и сторы, гарантирующие полный набор функций MVP (редактор, вкладки, проводник, поиск/замена, палитра команд, статус-бар, хлебные крошки, терминал, настройки/темы). Исключено: Git, расширения, LSP/IntelliSense, split/minimap, автосохранение, мультикурсор.

## Структура каталогов
```
src/
└─ lib/
   ├─ components/
   │  ├─ editor/
   │  │  ├─ MonacoEditor.svelte
   │  │  ├─ EditorTabs.svelte
   │  │  └─ InlineSearch.svelte   // Ctrl+F/Ctrl+H UI
   │  ├─ sidebar/
   │  │  ├─ FileTree.svelte
   │  │  └─ ExplorerToolbar.svelte
   │  ├─ command/
   │  │  └─ CommandPalette.svelte
   │  ├─ search/
   │  │  └─ ProjectSearchPanel.svelte
   │  ├─ terminal/
   │  │  └─ TerminalView.svelte
   │  ├─ status/
   │  │  ├─ StatusBar.svelte
   │  │  └─ Breadcrumbs.svelte
   │  ├─ settings/
   │  │  └─ SettingsEditor.svelte
   │  └─ ui/
   │     ├─ Button.svelte
   │     ├─ Input.svelte
   │     ├─ Modal.svelte
   │     └─ Toggle.svelte
   ├─ stores/
   │  ├─ editor.svelte.ts
   │  ├─ files.svelte.ts
   │  ├─ search.svelte.ts
   │  ├─ terminal.svelte.ts
   │  └─ settings.svelte.ts
   ├─ services/
   │  ├─ tauri-api.ts
   │  └─ keybindings.ts
   ├─ utils/
   │  ├─ path.ts
   │  └─ syntax-helpers.ts
   └─ styles/
      └─ theme.css
└─ routes/
   └─ +page.svelte
```

## Компоненты и обязанности
- **MonacoEditor**: инициализация Monaco (theme, language, folding, lineNumbers, autoClosingBrackets/quotes), бинды на `editorStore` (content, dirty), hotkeys Ctrl+S/Ctrl+F/Ctrl+H.
- **EditorTabs**: список открытых файлов, индикатор dirty, закрытие с подтверждением.
- **InlineSearch**: поиск/замена в текущем файле, regex/whole word/case toggles.
- **FileTree + ExplorerToolbar**: дерево, CRUD узлов, фильтр по имени, подсветка активного файла, sync с вкладками.
- **CommandPalette**: fuzzy поиск по командам, исполнение (открыть файл/папку, тема, настройки, терминал, поиск, toggle wrap, go to line/symbol).
- **ProjectSearchPanel**: Cmd/Ctrl+Shift+F UI, запуск `search_files`, кнопка Cancel, отображение результатов, клик открывает файл на позиции.
- **TerminalView**: xterm.js, управление PTY через `terminalStore`, кнопка закрытия, индикатор состояния.
- **StatusBar**: язык файла, позиция каретки, CRLF/LF, табы/пробелы, wrap, активная тема, терминал (on/off).
- **Breadcrumbs**: путь файла + символы (outline) из Monaco.
- **SettingsEditor**: формы для темы (light/dark), шрифтов/размера, tab size, insertSpaces, wrap, auto close brackets/quotes, шорткаты; сохраняет через `settingsStore`.

## Сторы (Svelte 5 runes)
- `editorStore`: `openFiles` (Map path→{model, content}), `activeFile`, `dirty`, методы `openFile`, `setContent`, `saveFile`, `closeFile`, `setLanguage`. Используются моноковские модели и встроенная undo/redo история, чтобы каждая вкладка держала независимую историю. События: onChange → dirty, onSave → reset dirty.
- `filesStore`: `workspacePath`, `tree`, `filter`, `activePath`; методы `loadTree`, `create`, `delete`, `rename`, `highlight(path)`. Служит виртуальной FS для открытых путей и синхронизации с деревом.
- `searchStore`: состояние project search (`query`, `useRegex`, `results`, `isLoading`, `cancel`), in-file search state (case/word/regex).
- `terminalStore`: `sessions` map id→{shell,status}, `activeId`; методы `create`, `send`, `resize`, `close`, `togglePanel`.
- `settingsStore`: `config` (theme, font, tabSize, insertSpaces, wrap, autoCloseBrackets/Quotes, keybindings, last_workspace, last_active_file); методы `load`, `update`, `applyTheme`.

Все сторы используют runes `$state`/`$derived`/`$effect` и типизированы TS (strict).

## Горячие клавиши (keybindings)
- Cmd/Ctrl+O — открыть файл.
- Cmd/Ctrl+S — сохранить активный файл.
- Cmd/Ctrl+Shift+P — Command Palette.
- Cmd/Ctrl+Shift+F — поиск по проекту.
- Cmd/Ctrl+F — поиск в файле.
- Cmd/Ctrl+H — замена в файле.
- Cmd/Ctrl+` — открыть/закрыть терминал.
- Cmd/Ctrl+G — перейти к строке.
- Esc — закрыть палитру/поиск/терминал фокусно.

## Тема и стили
- Переменные CSS в `:root`: `--bg`, `--bg-alt`, `--text`, `--muted`, `--accent`, `--border`.
- Поддержка `data-theme="light|dark"`; синхронизация с Monaco через `monaco.editor.setTheme`.
- Типографика: `font-family: 'Fira Code', 'SFMono-Regular', Consolas, monospace` для редактора; UI — системный стек.
- Spacing: 4px grid.

## UX требования
- Дерево поддерживает клавиатурную навигацию (↑/↓/Enter).
- Все destructive действия с подтверждением.
- Командная палитра и поиск открываются <50 мс.
- Project search потоково отображает результаты, имеет Cancel.
- Терминал открывается в корне workspace, отображает stderr/stdout.
- Статус-бар и breadcrumbs обновляются при смене активного файла/каретки <50 мс.

## Производительность
- Lazy-инициализация Monaco при первом открытии файла.
- Debounce для project search (300 мс) и фильтра по имени (150 мс).
- Watcher события батчатся (throttle 100 мс).

## Ограничения MVP (фронт)
- Не рендерим minimap и split view.
- Нет автосохранения; только явный save.
- LSP/IntelliSense выключены: используем встроенный Monaco completion.
- Нет Git UI/команд.
