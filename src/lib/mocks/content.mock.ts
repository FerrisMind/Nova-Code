/**
 * Mock-содержимое файлов для отображения в CodeEditor.
 * Простая модель: fileId (из files.mock.ts) -> массив строк.
 * Для псевдоподсветки будут использоваться CSS-классы на основе эвристик по строкам.
 */

export const fileContents: Record<string, string[]> = {
  'layout-svelte': [
    '<script lang="ts">',
    "  import Titlebar from '../lib/layout/Titlebar.svelte';",
    "  import ActivityBar from '../lib/layout/ActivityBar.svelte';",
    "  import SideBar from '../lib/layout/SideBar.svelte';",
    "  import EditorTabs from '../lib/layout/EditorTabs.svelte';",
    "  import EditorArea from '../lib/layout/EditorArea.svelte';",
    "  import BottomPanel from '../lib/layout/BottomPanel.svelte';",
    "  import StatusBar from '../lib/layout/StatusBar.svelte';",
    '',
    "  import { theme } from '../lib/stores/themeStore';",
    '</script>',
    '',
    '<div class={`nova-root theme-${$theme}`}>',
    '  <Titlebar />',
    '  <div class="nova-main">',
    '    <ActivityBar />',
    '    <div class="nova-center">',
    '      <SideBar />',
    '      <div class="nova-editor-region">',
    '        <EditorTabs />',
    '        <EditorArea />',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <BottomPanel />',
    '  <StatusBar />',
    '</div>'
  ],
  'layout-ts': [
    '// SPA mode for Tauri + SvelteKit',
    'export const ssr = false;'
  ],
  'tauri-main-rs': [
    'fn main() {',
    '    // Tauri v2 bootstrap mock',
    '    println!("Nova Code (mock)");',
    '}'
  ],
  'tauri-cargo-toml': [
    '[package]',
    'name = "nova-code"',
    'version = "0.1.0"',
    'edition = "2021"',
    '',
    '[dependencies]',
    '# ...',
    ''
  ],
  'pkg-json': [
    '{',
    '  "name": "nova-code",',
    '  "private": true,',
    '  "scripts": {',
    '    "dev": "vite dev",',
    '    "build": "vite build"',
    '  }',
    '}'
  ],
  'readme-md': [
    '# Nova Code',
    '',
    'Cursor/VS Code-like UI built with SvelteKit + Tauri v2 (mock).'
  ]
};

/**
 * Возвращает mock-контент для fileId, либо placeholder.
 */
export function getFileContentLines(fileId: string): string[] {
  return fileContents[fileId] ?? ['// No mock content for this file yet.'];
}