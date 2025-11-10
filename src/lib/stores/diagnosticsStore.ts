// src/lib/stores/diagnosticsStore.ts
// -----------------------------------------------------------------------------
// Агрегированный стор для диагностик (ошибки/предупреждения) для Status Bar.
// - Тонкий адаптер над EditorCore/intellisense/Monaco markers.
// - Не знает о UI, только хранит счётчики для активного файла.
// - Контракты и подход опираются на Monaco Marker API и VS Code status bar,
//   верифицировано по актуальной документации (context7 + официальные источники).
// -----------------------------------------------------------------------------

import { derived, writable, type Readable } from 'svelte/store';
import { activeEditor } from './editorStore';
import type { EditorDiagnostic } from '../editor/EditorCore';

// -----------------------------------------------------------------------------
// Типы
// -----------------------------------------------------------------------------

export interface DiagnosticsCount {
  fileId: string | null;
  errors: number;
  warnings: number;
}

// -----------------------------------------------------------------------------
// Внутреннее состояние
// -----------------------------------------------------------------------------

// Храним "сырые" diagnostics по fileId, чтобы можно было дешево пересчитывать
// агрегаты при смене activeEditor.
const diagnosticsByFileId = new Map<string, EditorDiagnostic[]>();

// Базовый writable, из которого derived строит итоговый счётчик.
const baseDiagnostics = writable<DiagnosticsCount>({
  fileId: null,
  errors: 0,
  warnings: 0
});

let initialized = false;

/**
 * Readable-store, предоставляющий агрегированный счётчик для Status Bar.
 * Основывается на:
 * - текущем activeEditor (editorStore),
 * - последнем состоянии diagnostics для соответствующего fileId.
 */
export const diagnosticsCount: Readable<DiagnosticsCount> = derived(
  [activeEditor, baseDiagnostics],
  ([$activeEditor, $baseDiagnostics]) => {
    const activeId = $activeEditor?.id ?? null;

    if (!activeId) {
      return {
        fileId: null,
        errors: 0,
        warnings: 0
      };
    }

    const markers = diagnosticsByFileId.get(activeId) ?? [];
    const errors = markers.filter(
      (m) =>
        m.severity === 'error' ||
        m.severity === 8 // monaco.MarkerSeverity.Error
    ).length;
    const warnings = markers.filter(
      (m) =>
        m.severity === 'warning' ||
        m.severity === 4 // monaco.MarkerSeverity.Warning
    ).length;

    // Если активный файл совпадает с базовым snapshot, возвращаем пересчитанное.
    // Иначе создаём новый snapshot для корректной реактивности.
    return {
      fileId: activeId,
      errors,
      warnings
    };
  },
  {
    fileId: null,
    errors: 0,
    warnings: 0
  }
);

/**
 * Инициализация трекинга diagnostics.
 *
 * Контракт:
 * - Функция должна быть вызвана один раз на уровне интеграции EditorCore/intellisense.
 * - Ожидается, что внешний слой (например, MonacoHost/intellisense) будет вызывать
 *   updateDiagnosticsForFile при изменении markers (onDidChangeMarkers / setDiagnostics).
 *
 * В рамках текущего подэтапа:
 * - initDiagnosticsTracking гарантирует, что стор готов к приёму обновлений,
 *   но не навязывает конкретный механизм подписки на Monaco.
 */
export function initDiagnosticsTracking(): void {
  if (initialized) return;
  initialized = true;
}

/**
 * Обновить diagnostics для конкретного файла.
 *
 * Ожидаемый источник вызова:
 * - слой intellisense/EditorCore, который уже знает о Monaco markers
 *   и обновляет их при изменениях.
 *
 * Status Bar и UI не вызывают эту функцию напрямую.
 */
export function updateDiagnosticsForFile(
  fileId: string,
  diagnostics: EditorDiagnostic[]
): void {
  if (!initialized) {
    // Обеспечиваем предсказуемость: ленивое включение трекинга.
    initialized = true;
  }

  diagnosticsByFileId.set(fileId, diagnostics);

  // Обновляем базовый snapshot для активного fileId; derived пересчитает агрегат.
  baseDiagnostics.update((current) =>
    current.fileId === fileId
      ? {
          fileId,
          errors: diagnostics.filter(
            (m) =>
              m.severity === 'error' ||
              m.severity === 8 // MarkerSeverity.Error
          ).length,
          warnings: diagnostics.filter(
            (m) =>
              m.severity === 'warning' ||
              m.severity === 4 // MarkerSeverity.Warning
          ).length
        }
      : current
  );
}