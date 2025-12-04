<script lang="ts">
  // src/lib/settings/layout/SettingsFooter.svelte
  // ----------------------------------------------------------------------------
  // Sticky footer для страницы настроек.
  //
  // Функционал:
  // - Export: скачивание настроек в JSON
  // - Import: загрузка настроек из JSON (с подтверждением)
  // - Last saved: метка времени последнего сохранения
  //
  // Стиль: glassmorphism с backdrop-filter
  // ----------------------------------------------------------------------------

  import { Download, Upload, Clock } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { settingsStore } from '$lib/stores/settingsStore';

  // ---------------------------------------------------------------------------
  // Состояние
  // ---------------------------------------------------------------------------

  let isExporting = $state(false);
  let isImporting = $state(false);
  let showImportDialog = $state(false);
  let importFile: File | null = $state(null);
  let lastSaved = $state<Date | null>(null);
  let fileInput: HTMLInputElement;

  // ---------------------------------------------------------------------------
  // Export функционал
  // ---------------------------------------------------------------------------

  async function handleExport() {
    if (isExporting) return;

    isExporting = true;

    try {
      // Получаем текущий snapshot настроек
      const snapshot = settingsStore.getSnapshot();

      // Формируем JSON
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: snapshot,
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // Создаём blob и скачиваем
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `nova-code-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      lastSaved = new Date();
    } catch (error) {
      console.error('Failed to export settings:', error);
    } finally {
      isExporting = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Import функционал
  // ---------------------------------------------------------------------------

  function handleImportClick() {
    fileInput?.click();
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && file.type === 'application/json') {
      importFile = file;
      showImportDialog = true;
    }

    // Reset input для повторного выбора того же файла
    input.value = '';
  }

  async function confirmImport() {
    if (!importFile || isImporting) return;

    isImporting = true;

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      // Валидация структуры
      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('Invalid settings file format');
      }

      // Применяем настройки через store
      await settingsStore.applyChanges(data.settings, { source: 'import' });

      lastSaved = new Date();
      showImportDialog = false;
      importFile = null;
    } catch (error) {
      console.error('Failed to import settings:', error);
      // TODO: показать toast с ошибкой
    } finally {
      isImporting = false;
    }
  }

  function cancelImport() {
    showImportDialog = false;
    importFile = null;
  }

  // ---------------------------------------------------------------------------
  // Форматирование времени
  // ---------------------------------------------------------------------------

  function formatLastSaved(date: Date | null): string {
    if (!date) return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  }
</script>

<!-- Hidden file input for import -->
<input
  type="file"
  accept=".json,application/json"
  class="hidden-input"
  bind:this={fileInput}
  onchange={handleFileSelect}
/>

<footer class="settings-footer">
  <div class="footer-content">
    <!-- Left side: Last saved -->
    <div class="footer-left">
      {#if lastSaved}
        <span class="last-saved">
          <Clock size={14} />
          <span>Saved {formatLastSaved(lastSaved)}</span>
        </span>
      {/if}
    </div>

    <!-- Right side: Export/Import -->
    <div class="footer-right">
      <div class="action-buttons">
        <Button variant="outline" size="sm" onclick={handleExport} disabled={isExporting}>
          <Download size={16} />
          <span>Export</span>
        </Button>

        <Button variant="outline" size="sm" onclick={handleImportClick} disabled={isImporting}>
          <Upload size={16} />
          <span>Import</span>
        </Button>
      </div>
    </div>
  </div>
</footer>

<!-- Import Confirmation Dialog -->
<AlertDialog.Root bind:open={showImportDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Import Settings?</AlertDialog.Title>
      <AlertDialog.Description>
        This will replace your current settings with the imported ones.
        {#if importFile}
          <br /><br />
          <strong>File:</strong>
          {importFile.name}
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={cancelImport}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmImport}>Import</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .settings-footer {
    position: sticky;
    bottom: 0;
    flex-shrink: 0;
    z-index: 10;
    background: var(--nc-level-0, hsl(var(--card)));
    border-radius: 0 0 var(--settings-radius-xl, 16px) var(--settings-radius-xl, 16px);
    padding: var(--settings-space-sm, 12px) var(--settings-space-lg, 24px);
  }

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: var(--settings-content-max-width, 900px);
    margin: 0 auto;
    gap: var(--settings-space-md, 16px);
  }

  .footer-left {
    display: flex;
    align-items: center;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: var(--settings-space-md, 16px);
  }

  .last-saved {
    display: flex;
    align-items: center;
    gap: var(--settings-space-xs, 4px);
    font-size: var(--settings-font-size-xs, 11px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 8px);
  }

  /* Кнопки Export/Import - темно-серый фон с рамкой и скругленными углами */
  :global(.settings-footer .action-buttons button[data-slot='button']) {
    background: var(--nc-level-1, hsl(var(--muted))) !important;
    color: var(--nc-palette-text, hsl(var(--foreground))) !important;
    border: 1px solid var(--nc-palette-border, hsl(var(--border))) !important;
    border-color: var(--nc-palette-border, hsl(var(--border))) !important;
    border-radius: var(--settings-radius-md, 8px) !important;
    padding: calc(0.5rem + 0.5px) calc(0.75rem + 0.5px) !important;
  }

  :global(.settings-footer .action-buttons button[data-slot='button']:hover:not(:disabled)) {
    background: var(--nc-level-2, hsl(var(--accent))) !important;
    color: var(--nc-palette-text, hsl(var(--foreground))) !important;
    border-color: var(--nc-palette-border, hsl(var(--border))) !important;
  }

  :global(.settings-footer button[data-slot='button']:disabled) {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .footer-content {
      flex-direction: column;
      gap: var(--settings-space-sm, 8px);
    }

    .footer-right {
      width: 100%;
      justify-content: flex-end;
    }

    .action-buttons {
      flex: 1;
      justify-content: flex-end;
    }
  }
</style>
