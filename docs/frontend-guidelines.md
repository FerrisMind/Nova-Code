# Frontend Guidelines: Nova Code

## Структура папок

src/
├── lib/
│ ├── components/
│ │ ├── editor/
│ │ │ ├── MonacoEditor.svelte
│ │ │ ├── EditorTabs.svelte
│ │ │ └── SplitView.svelte
│ │ ├── sidebar/
│ │ │ ├── FileTree.svelte
│ │ │ ├── GitPanel.svelte
│ │ │ └── SearchPanel.svelte
│ │ ├── terminal/
│ │ │ └── TerminalView.svelte
│ │ └── ui/
│ │ ├── Button.svelte
│ │ ├── Input.svelte
│ │ └── Modal.svelte
│ ├── stores/
│ │ ├── editor.svelte.ts
│ │ ├── files.svelte.ts
│ │ ├── git.svelte.ts
│ │ └── settings.svelte.ts
│ ├── services/
│ │ ├── tauri-api.ts
│ │ ├── lsp-client.ts
│ │ └── keybindings.ts
│ └── utils/
│ ├── path.ts
│ └── syntax-helpers.ts
├── routes/
│ └── +page.svelte
└── app.css

text

## Компонентная архитектура
- **Атомарные компоненты** (ui/): изолированные, без бизнес-логики, пропсы + события
- **Композитные компоненты** (editor/sidebar/terminal): используют stores, вызывают сервисы
- **Контейнеры** (routes/): оркестрируют layout, инициализируют stores

Правило: компонент либо презентационный (получает данные через props), либо контейнер (работает со stores).

## State Management
- **Svelte 5 Runes** для локального состояния: `$state`, `$derived`, `$effect`
- **Глобальные stores** (в `.svelte.ts` файлах):
  - `editorStore` — открытые файлы, активная вкладка, позиции курсора
  - `filesStore` — дерево файлов, выбранная папка
  - `gitStore` — статус репозитория, staged изменения
  - `settingsStore` — конфиг из Tauri backend

Пример store:
// editor.svelte.ts
import { invoke } from '@tauri-apps/api/core';

class EditorStore {
openFiles = $state<Map<string, string>>(new Map());
activeFile = $state<string | null>(null);

async openFile(path: string) {
const content = await invoke<string>('open_file', { path });
this.openFiles.set(path, content);
this.activeFile = path;
}
}

export const editorStore = new EditorStore();

text

## Стиль кода
- **Naming:**
  - Компоненты: PascalCase (`MonacoEditor.svelte`)
  - Функции/переменные: camelCase (`activeFile`)
  - Константы: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Форматирование:** Prettier (2 spaces, single quotes, trailing comma)
- **Типизация:** strict TypeScript (no `any`, explicit return types)
- **Event handlers:** `on` prefix (`onClick`, `onFileSelect`)

## UI Kit / Design System
- **Цветовая схема:** CSS custom properties в `:root`
  - `--bg-primary`, `--bg-secondary`, `--text-primary`, `--accent`
- **Spacing:** 4px grid (`--spacing-1: 4px`, `--spacing-2: 8px`, ...)
- **Typography:** system fonts (`-apple-system, BlinkMacSystemFont, Segoe UI`)
- **Компоненты UI:** переиспользуемые Button/Input с вариантами через props

## Performance
- **Lazy loading:** динамические импорты для тяжёлых компонентов (Monaco Editor)
- **Виртуализация:** `svelte-virtual-list` для списка файлов (>1000 элементов)
- **Memoization:** `$derived` для вычисляемых значений, избегать лишних реактивных зависимостей
- **Debouncing:** для search input и autosave (300ms)
- **Web Workers:** парсинг больших файлов и syntax highlighting в фоне
