import type * as monacoNamespace from 'monaco-editor';
import type { EditorCoreApi, EditorDiagnostic } from './EditorCore';
import { updateDiagnosticsForFile } from '../stores/diagnosticsStore';

let markersSubscription: monacoNamespace.IDisposable | null = null;

/**
 * Подписка на изменения маркеров Monaco и трансляция их в diagnosticsStore.
 * Инициализируется на уровне конкретного EditorCore и снимается при dispose.
 */
export function attachDiagnosticsTracking(
  monaco: typeof monacoNamespace,
  core: EditorCoreApi
): void {
  detachDiagnosticsTracking();

  markersSubscription = monaco.editor.onDidChangeMarkers((uris) => {
    uris.forEach((uri) => {
      const model = monaco.editor.getModel(uri);
      if (!model) return;

      const fileId = core.getFileIdByUri(uri.toString());
      if (!fileId) return;

      const markers = monaco.editor.getModelMarkers({ resource: uri });
      const diagnostics: EditorDiagnostic[] = markers.map((marker) => {
        const rawCode = marker.code;
        const code =
          rawCode === undefined
            ? undefined
            : typeof rawCode === 'string' || typeof rawCode === 'number'
              ? String(rawCode)
              : typeof rawCode === 'object' && rawCode !== null && 'value' in rawCode
                ? String((rawCode as { value: unknown }).value)
                : undefined;

        const severity =
          marker.severity === monaco.MarkerSeverity.Error
            ? 'error'
            : marker.severity === monaco.MarkerSeverity.Warning
              ? 'warning'
              : marker.severity === monaco.MarkerSeverity.Info
                ? 'info'
                : 'hint';

        return {
          severity,
          message: marker.message,
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          code,
        };
      });

      updateDiagnosticsForFile(fileId, diagnostics);
    });
  });
}

/**
 * Снять подписку на маркеры.
 */
export function detachDiagnosticsTracking(): void {
  if (markersSubscription) {
    markersSubscription.dispose();
    markersSubscription = null;
  }
}
