# Application Flow: Nova Code (MVP)

Цель: гарантировать реализацию полного списка функций MVP VS Code‑клона на Tauri v2 + Svelte 5 + Monaco. Исключено в MVP: Git, расширения, отладчик, мультикурсор, IntelliSense/LSP, minimap, split view, автосохранение.

## 1) Старт и загрузка workspace
- При запуске Tauri поднимает WebView, фронтенд вызывает `get_settings()`.
- Если есть `last_workspace`, вызывается `read_directory(last_workspace)`; иначе модалка “Open Folder”.
- Дерево Sidebar строится из ответа; активный путь подсвечен. Если есть `last_active_file`, вызывается `open_file(last_active_file)` и активируется вкладка.
- SLA: старт <1 c. Ошибка доступа → модалка выбора другой папки.

## 2) Файловое дерево (Sidebar)
- API: `read_directory(path)` → `{path,name,is_directory,size,modified}`.
- Операции: `create_file`, `create_dir`, `delete_entry`, `rename_entry`; после каждой — рефреш дерева.
- Поиск по имени: локальный фильтр + опция `search_names(root, query)` для больших деревьев.
- Активный файл подсвечивается при смене вкладки; раскрытие узлов синхронизируется.
- SLA: локальные операции <200 мс.

## 3) Открытие файла
- Триггер: двойной клик или Cmd/Ctrl+O.
- `open_file(path)` читает файл (лимит 50 МБ); >50 МБ → prompt “Open as plain text?”.
- Monaco: создаётся/привязывается модель, включены подсветка (JS/TS/Python/Rust/HTML/CSS/JSON/Markdown), line numbers, code folding, auto-closing brackets/quotes, базовый Monaco completion (без LSP), soft wrap по настройке.
- Вкладка создаётся/активируется; `editorStore.openFiles` обновляется.

## 4) Редактирование и сохранение
- `onChange` в Monaco помечает модель dirty; вкладка получает индикатор.
- Cmd/Ctrl+S вызывает `save_file(path, content)`; автосохранения нет (по ограничению MVP).
- Успех: запись <200 мс, dirty-состояние сброшено, статус-бар обновляет время сохранения.
- Конфликты: файл изменён на диске → prompt “Reload or Keep local”; permissions → modal “Save failed, save as?”.

## 5) Вкладки
- Каждое открытие создаёт вкладку с названием и иконкой типа.
- Закрытие: клик по кресту или шорткат; если dirty → подтверждение.
- Переключение синхронизирует подсветку узла в дереве и статус-бар (позиция, CRLF/LF, пробелы/таб, тема).

## 6) Поиск и замена в файле (Ctrl+F / Ctrl+H)
- Ctrl+F: inline панель Monaco, режимы case/whole word/regex, переходы Enter/Shift+Enter.
- Ctrl+H: добавляет Replacement + кнопки Replace/Replace All, toggle regex.
- Ошибки: невалидный regex → inline сообщение. SLA: поиск <50 мс на 10k строк.

## 7) Поиск по проекту (Cmd/Ctrl+Shift+F)
- Debounce 300 мс, вызов `search_files(root, query, use_regex)`.
- Backend потоково отдаёт `{file, line, column, match_text}`; фронтенд рендерит список, кнопка Cancel.
- Клик по результату открывает файл и ставит каретку в позицию.
- SLA: первые результаты <1 с; невалидный regex → подсветка поля.

## 8) Command Palette (Cmd/Ctrl+Shift+P)
- Источник команд: статический список с fuzzy-фильтром. Команды: открыть файл/папку, переключить тему, открыть терминал, открыть настройки, поиск по проекту, toggle wrap, переход к строке/символу.
- Палитра открывается <50 мс, закрывается по Esc, выполняет выбранную команду.

## 9) Терминал (Cmd/Ctrl+`)
- Открытие/закрытие терминала горячей клавишей.
- `create_terminal(shell)` стартует PTY (bash/zsh/pwsh/cmd) в корне workspace; `send_to_terminal` для ввода; `terminal_output_stream` для вывода.
- xterm.js отображает вывод, поддерживает resize/scrollback; закрытие по кнопке/команде.
- Успех: `pwd` показывает корень проекта; ошибка запуска → toast с логом.

## 10) Status Bar и Breadcrumbs
- Статус-бар: путь/язык активного файла, позиция каретки (строка:колонка), CRLF/LF, пробелы/таб, активная тема, индикатор терминала (открыт/закрыт).
- Breadcrumbs: относительный путь + символы документа (из Monaco outline); клики переходят к секции.
- SLA: обновление <50 мс при смене каретки/файла.

## 11) Настройки и темы
- Settings Editor поверх `get_settings()/update_settings()`.
- Секции: Editor (шрифт, размер, табы, wrap, авто-закрытие скобок/кавычек), Themes (light/dark), Keybindings (перечень шорткатов).
- Применение обновляет сторы и Monaco options без перезапуска; настройки сохраняются в конфиг.

## 12) Ограничения MVP
- Не реализуем: Git, расширения/плагины, отладчик, мультикурсор, IntelliSense/LSP, minimap, split view, автосохранение.

