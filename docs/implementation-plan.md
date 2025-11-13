# Implementation Plan: Nova Code

## Phase 1: MVP (Core Editor) - 6 weeks

**Goal:** Deliver a working editor shell with basic file opening/editing and command layers.

**Progress:** ✅ 100% (Phase 1 is complete: Monaco/editor tabs, Explorer, settings, auto-save and real Tauri open/save/list commands form the full workbench loop; the tab bar now uses a themed overlay scrollbar with drag support and selection disabled.)

**Deliverables:**
- ✅ Tauri v2 + Svelte 5 boilerplate, workbench layout, and command palette scaffolding are in place.
- ✅ Monaco Editor integration with multi-file models, syntax highlighting, and dirty-state tracking.
- ✅ File explorer tree + selection sync with the active tab via `fileTreeStore`; workspace data now loads through `workspaceStore` backed by `fileService`, and the workspace refreshes when the watcher fires.
- ✅ Opening/saving through Tauri commands now updates real files via `fileService` + `editorStore.updateContent`.
- ✅ Editor tabs support multiple files, group navigation, and close actions with dirty markers.
- ✅ Tab strip overlay scrollbar now hugs the bottom edge, mirrors the theme palette, auto-hides off-hover, keeps thumb dragging + pointer hit areas in sync, matches the visible tab viewport width, and further clamps its width to the actual tab row so the highlight never spills past the last tab.
- ✅ Core settings (theme, editor behavior, auto-save) toggle live stores; history/profiles persistence sync is slated for next phases.
- ✅ Layout is responsive across macOS/Linux/Windows; packaging/build scripts will move forward in Phase 2/3.

**Risks:**
- Monaco performance in Tauri WebView (validate with bigger files).
- Linux file watcher reliability (fallback to polling still required).

---

## Фаза 2: LSP + Terminal — 4 недели

**Цель:** Добавить автодополнение и встроенный терминал

**Deliverables:**
- LSP Manager: запуск/остановка LSP-серверов
- Поддержка 3 LSP из коробки (TypeScript, Python, Rust)
- Проксирование JSON-RPC между Monaco и LSP через Tauri
- Встроенный терминал через xterm.js + PTY на Rust-стороне
- Split view (горизонтальный/вертикальный)
- Горячие клавиши (конфигурируемые)

**Риски:**
- Сложность настройки LSP-серверов (документация для пользователей)
- Проблемы с PTY на Windows (возможна другая реализация через conPTY)

---

## Фаза 3: Git Integration — 3 недели

**Цель:** Базовая работа с Git из UI

**Deliverables:**
- Git-панель: отображение статуса (modified/staged/untracked)
- Diff view для изменённых файлов
- Stage/unstage файлов через UI
- Commit с message input
- Push/pull (базовая аутентификация через SSH)
- Branch switcher (список веток, переключение)

**Риски:**
- Аутентификация SSH на разных ОС (возможно, использование системного Git)
- Производительность git_status на больших репозиториях (кэширование)

---

## Фаза 4: Polish + Plugins — 3 недели

**Цель:** Стабилизация, оптимизация, система расширений

**Deliverables:**
- Поиск/замена по файлам (regex support)
- Темизация: импорт VS Code themes (JSON)
- Система плагинов: загрузка JavaScript-модулей через API
- Документация API для разработчиков плагинов
- Автообновление через Tauri Updater
- Performance profiling: оптимизация времени запуска и потребления памяти
- Beta-тестирование: сбор фидбека, багфиксы

**Риски:**
- Security плагинов (песочница для выполнения кода)
- Совместимость VS Code themes (не все фичи Monaco могут поддерживаться)

---

## Общая длительность: 16 недель (4 месяца)

**Post-launch итерации:**
- Поддержка дополнительных языков (Java, C++, Go)
- Remote development (SSH, Docker)
- Collaborative editing (WebRTC)
- Marketplace для плагинов
