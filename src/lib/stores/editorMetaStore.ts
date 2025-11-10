// src/lib/stores/editorMetaStore.ts
// -----------------------------------------------------------------------------
// Хелпер для мета-информации активного редактора (язык, EOL, индентация).
// - Не является отдельным "умным" стором с побочными эффектами.
// - Тонкий derived-слой над editorStore.activeEditor и EditorCore.getModelMetadata.
// - Спроектирован специально для Status Bar, по аналогии с контрактами VS Code.
// -----------------------------------------------------------------------------
//
// ВАЖНО ПО АРХИТЕКТУРЕ:
// - Этот модуль не тянет EditorCore напрямую, чтобы избежать циклов.
// - Ожидается явная инициализация через initEditorMeta(core), где core: EditorCoreApi.
// - Status Bar читает activeEditorMeta для отображения статуса.
// -----------------------------------------------------------------------------

import { derived, writable, type Readable } from 'svelte/store';
import { activeEditor } from './editorStore';
import type { EditorCoreApi } from '../editor/EditorCore';

export interface EditorMeta {
  languageId: string | null;
  eol: 'LF' | 'CRLF' | null;
  tabSize: number | null;
  insertSpaces: boolean | null;
}

/**
 * Внутренний writable для хранения ссылки на EditorCoreApi.
 * Это позволяет избежать прямого импорта из MonacoHost и циклических зависимостей.
 */
const coreStore = writable<EditorCoreApi | null>(null);

/**
 * Явная инициализация мета-слоя.
 *
 * Вызывать один раз после создания EditorCore:
 * - например, в MonacoHost/EditorArea, рядом с initCursorTracking.
 */
export function initEditorMeta(core: EditorCoreApi): void {
  coreStore.set(core);
}

/**
 * Derived-store с мета-информацией активного редактора.
 *
 * Логика:
 * - Берём activeEditor из editorStore.
 * - Через EditorCore.getModelMetadata(fileId) получаем:
 *   - languageId
 *   - eol
 *   - tabSize
 *   - insertSpaces
 *
 * Если данных нет — возвращаем null-поля (Status Bar решает, как это отрисовать).
 */
export const activeEditorMeta: Readable<EditorMeta> = derived(
  [activeEditor, coreStore],
  ([$activeEditor, $core]): EditorMeta => {
    if (!$activeEditor || !$core) {
      return {
        languageId: null,
        eol: null,
        tabSize: null,
        insertSpaces: null
      };
    }

    const meta = $core.getModelMetadata($activeEditor.id);
    if (!meta) {
      return {
        languageId: null,
        eol: null,
        tabSize: null,
        insertSpaces: null
      };
    }

    return {
      languageId: meta.languageId,
      eol: meta.eol,
      tabSize: meta.tabSize,
      insertSpaces: meta.insertSpaces
    };
  },
  {
    languageId: null,
    eol: null,
    tabSize: null,
    insertSpaces: null
  }
);