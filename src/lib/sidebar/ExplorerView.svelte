<script lang="ts">
  // src/lib/sidebar/ExplorerView.svelte
  // ---------------------------------------------------------------------------
  // Обновлённый Explorer:
  // - использует workspaceStore как источник дерева файлов;
  // - использует FileTree для рекурсивного рендера;
  // - синхронизирует выделение с активной вкладкой editorStore через
  //   fileTreeStore.syncWithActiveTab.
  //
  // Архитектура:
  // - повторяет ключевые идеи VS Code Explorer;
  // - работает поверх mocks/workspaceStore и editorStore/editorGroupsStore;
  // - без зависимостей от Tauri/реального FS.
  // ---------------------------------------------------------------------------

  import { workspaceStore } from '../stores/workspaceStore';
import type { FileNode } from '../types/fileNode';
  import FileTree from './FileTree.svelte';
  import { activeEditor } from '../stores/editorStore';
  import { syncWithActiveTab } from '../stores/fileTreeStore';

  let workspaceName = 'Workspace';
  let rootFiles: FileNode[] = [];

  // Подписка на workspaceStore.
  workspaceStore.subscribe((w) => {
    workspaceName = w.name;
    rootFiles = w.files;
  });

  // Подписка на активный редактор для синхронизации выделения в дереве.
  activeEditor.subscribe(($active) => {
    const id = $active?.id ?? null;
    syncWithActiveTab(id);
  });
</script>

<div class="explorer-root">
  <div class="explorer-header">
    <div class="label">EXPLORER</div>
    <div class="workspace">{workspaceName}</div>
  </div>

  <div class="explorer-tree">
    {#if rootFiles && rootFiles.length > 0}
      <FileTree nodes={rootFiles} depth={0} />
    {:else}
      <div class="empty">No files in workspace</div>
    {/if}
  </div>
</div>

<style>
  .explorer-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--nc-fg-muted);
    font-size: 12px; /* 3 * 4px */
  }

  .explorer-header {
    padding: 8px 12px; /* 2 * 4px, 3 * 4px */
    border-bottom: 1px solid var(--nc-border-subtle);
  }

  .label {
    font-size: 10px; /* 2.5 * 4px ~ округлено */
    letter-spacing: 0.12em;
    color: var(--nc-fg-muted);
    font-weight: 600;
  }

  .workspace {
    margin-top: 4px; /* 1 * 4px */
    font-size: 12px; /* 3 * 4px */
    color: var(--nc-fg);
  }

  .explorer-tree {
    flex: 1;
    overflow-y: auto;
    padding: 8px 4px; /* 2 * 4px */
  }

  .explorer-tree::-webkit-scrollbar {
    width: 8px; /* 2 * 4px */
  }

  .explorer-tree::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight);
    border-radius: 4px; /* 1 * 4px */
  }

  .empty {
    padding: 8px 12px;
    color: var(--nc-fg-muted);
    font-style: italic;
  }
</style>
