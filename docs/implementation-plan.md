# Implementation Plan: Nova Code (MVP only)

Фокус: доставить 100% требований MVP (редактор, вкладки, проводник, поиск/замена, палитра команд, статус-бар, breadcrumbs, терминал, настройки/темы). Вне scope: Git, расширения, отладчик, мультикурсор, IntelliSense/LSP, minimap, split view, автосохранение.

## Acceptance Checklist (должно быть готово к демо)
- Monaco: подсветка JS/TS/Python/Rust/HTML/CSS/JSON/MD, line numbers, folding, auto close brackets/quotes, базовое completion, soft wrap toggle.
- Вкладки: множественные файлы, dirty-маркер, закрытие с подтверждением.
- Файловое дерево: read/create/delete/rename, поиск по имени, подсветка активного файла, watcher обновляет дерево.
- Поиск/замена: Ctrl+F/Ctrl+H в файле с regex; Cmd/Ctrl+Shift+F по проекту с отменой и переходом к матчу.
- Command Palette: Cmd/Ctrl+Shift+P, команды (open folder/file, theme switch, terminal toggle, settings, search, wrap toggle, go to line/symbol).
- Терминал: встроенный xterm.js, запускается в корне, поддерживает bash/zsh/pwsh/cmd, toggle Ctrl+`.
- UI: Status Bar (позиция, CRLF/LF, таб/пробел, язык, тема, терминал), Breadcrumbs (путь + outline), Sidebar с Explorer.
- Настройки: light/dark темы, шрифт/размер, tabSize, insertSpaces, wrap, auto close brackets/quotes, keybindings; применяется без перезапуска; хранение last_workspace/last_active_file.
- SLA: старт <1 c, открытие файла <300 мс, поиск по проекту выдаёт первые результаты <1 с.

## Этап 1 (недели 1–2): каркас и редактор
- Поднять Tauri v2 + Svelte 5 runes, базовый layout (Sidebar + Editor + StatusBar).
- Интегрировать Monaco, включить подсветку, folding, lineNumbers, auto-closing, completion без LSP.
- Сторы `editorStore`, `filesStore`, `settingsStore`; команды Tauri для файлов чтение/сохранение.
- Вкладки с dirty-маркером; Status Bar обновляет позицию/язык/CRLF/indent.
- Темы light/dark (CSS vars + Monaco setTheme); SettingsEditor базовых опций.

## Этап 2 (недели 3–4): проводник, поиск/замена
- Реализовать FileTree CRUD (create/delete/rename) + подсветка активного файла, watcher-интеграция.
- Inline поиск/замена в файле (Ctrl+F/H) с regex; синхронизация с Monaco.
- Project search (Cmd/Ctrl+Shift+F) + потоковый вывод + Cancel; переход к матчу.
- Breadcrumbs по пути файла + символам outline.
- Улучшить Command Palette: команды wrap/theme/terminal/search/open/settings.

## Этап 3 (недели 5–6): терминал и полировка
- xterm.js + PTY команды (create/send/resize/close); toggle Ctrl+`.
- Статус-бар интеграция терминала; хранение last_workspace/last_active_file.
- Производительность: lazy Monaco, debounce поиска, throttle watcher, >50 МБ plain-text предупреждение.
- QA по чеклисту, устранение багов, упаковка артефактов (dev/prod билд).

## Риски и смягчение
- Производительность Monaco в WebView: тест на больших файлах, включить lazy init.
- Watcher на Linux: fallback на polling.
- Терминал на Windows: использовать conPTY; graceful fallback при ошибке запуска shell.

