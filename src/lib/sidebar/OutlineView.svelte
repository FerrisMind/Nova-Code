<script lang="ts">
  /**
   * OutlineView компонент для правой панели
   * Показывает структуру текущего файла
   */
  import { activeEditor } from '../stores/editorStore';
  import Icon from '../common/Icon.svelte';
  import { getLanguageIcon } from '../mocks/languageIcons';
  import { onDestroy } from 'svelte';

  let fileName = '';
  let filePath = '';

  const unsubscribe = activeEditor.subscribe(($active) => {
    if ($active) {
      filePath = $active.path || $active.id;
      const parts = filePath.replace(/\\/g, '/').split('/');
      fileName = parts.pop() || '';
    } else {
      fileName = '';
      filePath = '';
    }
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<div class="outline-view">
  <div class="outline-header">
    <h2>Outline</h2>
  </div>
  <div class="outline-content">
    {#if fileName}
      <div class="file-info">
        <Icon name={getLanguageIcon(fileName)} size={16} />
        <span class="file-name">{fileName}</span>
      </div>
      <div class="separator"></div>
      <p class="placeholder">
        Symbols outline is not available.<br />
        (Requires Language Server)
      </p>
    {:else}
      <p class="placeholder">No active file</p>
    {/if}
  </div>
</div>

<style>
  .outline-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0;
    color: var(--nc-fg-muted);
    font-size: 12px;
  }

  .outline-header {
    padding: 8px 16px;
    border-bottom: 1px solid var(--nc-border-subtle, #333);
    background-color: var(--nc-level-1);
  }

  .outline-header h2 {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--nc-fg-muted);
    letter-spacing: 0.5px;
  }

  .outline-content {
    flex: 1;
    padding: 12px 16px;
    overflow-y: auto;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: var(--nc-fg);
    font-weight: 500;
  }

  .separator {
    height: 1px;
    background-color: var(--nc-border-subtle, #333);
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .placeholder {
    margin: 0;
    color: var(--nc-fg-muted);
    opacity: 0.7;
    line-height: 1.5;
    font-style: italic;
  }
</style>
