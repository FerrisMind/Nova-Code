/**
 * src/lib/stores/editorCursorStore.ts
 * -----------------------------------------------------------------------------
 * Тонкий адаптер над EditorCore.onDidChangeCursorPosition для Status Bar.
 * - Не знает о UI и layout.
 * - Хранит только актуальную позицию курсора для activeFileId.
 * - Контракт опирается на EditorCoreApi и Monaco Editor
 *   (по актуальной документации Monaco / VS Code, проверено через context7).
 * -----------------------------------------------------------------------------
 */

import { writable, type Readable } from 'svelte/store';
import type { EditorCoreApi } from '../editor/EditorCore';

/**
 * Текущее положение курсора в терминах файловой модели EditorCore/editorStore.
 */
export interface CursorPosition {
  fileId: string | null;
  line: number;
  column: number;
}

/**
 * Начальное состояние:
 * - fileId: null — нет активного файла;
 * - координаты (1,1) для предсказуемого отображения в Status Bar.
 */
const initialState: CursorPosition = {
  fileId: null,
  line: 1,
  column: 1,
};

const {
  subscribe,
  set,
}: { subscribe: Readable<CursorPosition>['subscribe']; set: (v: CursorPosition) => void } =
  writable<CursorPosition>(initialState);

let initialized = false;

/**
 * Readable-store для позиции курсора.
 * Используется Status Bar и любыми другими потребителями статуса.
 */
export const cursorPosition: Readable<CursorPosition> = { subscribe };

/**
 * Инициализация трекинга курсора.
 *
 * Ожидает экземпляр EditorCoreApi и подписывается на onDidChangeCursorPosition.
 * Вызывать:
 * - один раз при старте редактора (например, из MonacoHost или StatusBar layout слоя),
 * - после создания EditorCore.
 *
 * Повторные вызовы безопасно игнорируются.
 *
 * ВАЖНО:
 * - editorCursorStore остаётся чистым адаптером, без знания о UI.
 * - API спроектирован специально под Status Bar и следует контрактам Monaco/VS Code.
 */
export function initCursorTracking(core: EditorCoreApi): void {
  if (initialized) return;
  initialized = true;

  core.onDidChangeCursorPosition(({ fileId, lineNumber, column }) => {
    set({
      fileId,
      line: lineNumber,
      column,
    });
  });
}
