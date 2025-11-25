# Product Requirements Document: Nova Code (MVP)

## Цель
Лёгкий настольный редактор кода (клон VS Code core) на Tauri v2 + Svelte 5 + Monaco Editor, закрывающий базовые сценарии редактирования и навигации без Git/расширений/отладчика/IntelliSense/split/minimap/автосохранения/мультикурсора.

## Проблема
Электрон-редакторы потребляют 300–800 МБ RAM и стартуют 3–5 с. Nova Code должен запускаться <1 с и удерживать <150 МБ RAM в idle, предоставляя знакомый UX.

## Пользователи
- Разработчики, привыкшие к VS Code UI, но желающие лёгкий офлайн-редактор.
- Кросс-платформенность: macOS/Linux/Windows.

## Функциональные требования (MVP)
- **Редактор (Monaco):** подсветка JS/TS/Python/Rust/HTML/CSS/JSON/MD; line numbers; folding; auto-closing brackets/quotes; базовое completion (без LSP); soft wrap toggle; dirty-маркер; закрытие вкладок с подтверждением.
- **Файловый проводник:** дерево; read/create/delete/rename; подсветка активного файла; поиск по имени; watcher обновляет дерево; открытие файлов через дерево/палитру.
- **Поиск/замена:** Ctrl+F поиск в файле; Ctrl+H замена (regex/whole word/case, replace all); Cmd/Ctrl+Shift+F поиск по проекту с отменой и переходом к матчу.
- **UI:** Sidebar с Explorer; Command Palette (Cmd/Ctrl+Shift+P) с командами открытия, тем, wrap, терминала, настроек, goto line/symbol; Status Bar (путь/язык, позиция каретки, CRLF/LF, таб/пробел, wrap, тема, терминал); Breadcrumbs (путь + outline).
- **Терминал:** встроенный xterm.js, PTY (bash/zsh/pwsh/cmd), рабочая директория — корень workspace; toggle Ctrl+`; поддержка resize/scrollback.
- **Настройки/темы:** light/dark; шрифты редактора и размер; tabSize/insertSpaces; wrap; auto-close brackets/quotes; keybindings; хранить last_workspace/last_active_file; применение без перезапуска.

## Нефункциональные требования
- Производительность: старт <1 с; открытие файла <300 мс; первые результаты project search <1 с.
- Память: idle <150 МБ.
- Размер дистрибутива: <50 МБ.
- UX: все destructive действия с подтверждением; клавиатурная навигация в дереве и палитре; latency UI <50 мс.

## Ограничения (Out of Scope)
- Git интеграция, расширения/плагины, отладчик, IntelliSense/LSP, minimap, split view, автосохранение, мультикурсор, remote dev, marketplace.

## Метрики успеха
- Время запуска (p50/p95).
- Пиковое потребление RAM в idle.
- SLA на открытие файла и поиск.
- Пользовательские тесты: ≥80% задач выполняются без блокеров (по скрипту из MVP-функций).

## Открытые вопросы (после MVP)
- Расширение языков (Go, Java, C++).
- Git и diff UI.
- Плагины/темы совместимые с VS Code marketplace.
- LSP/IntelliSense и split view.

