<script lang="ts">
  // src/lib/sidebar/FileTree.svelte
  // ---------------------------------------------------------------------------
  // Рекурсивный рендерер дерева файлов/директорий для Explorer.
  // Работает поверх FileNode из mocks/workspaceStore и UI-store fileTreeStore.
  // Архитектура повторяет ключевые идеи VS Code Explorer:
  // - отдельный источник данных (workspaceStore / mocks);
  // - отдельный UI-store для состояния дерева (раскрытие/выделение);
  // - чистый Svelte-компонент без прямых зависимостей от Tauri/FS.
  //
  // Дизайн и поведение согласованы с ExplorerView и общей
  // цветовой/типографической системой Nova Code.
  // ---------------------------------------------------------------------------

import type { FileNode } from '../types/fileNode';
  import Icon from '../common/Icon.svelte';
  import { getLanguageIcon } from '../mocks/languageIcons';
  import {
    fileTreeState,
    toggleDir,
    selectFile,
    isExpanded,
    type FileNodeId
  } from '../stores/fileTreeStore';
  import { editorStore } from '../stores/editorStore';
  import * as fileTreeActions from './fileTreeActions';
  import FileTreeContextMenu from './FileTreeContextMenu.svelte';
  import { createEventDispatcher } from 'svelte';

  export let nodes: FileNode[] = [];
  export let depth: number = 0;

  const dispatch = createEventDispatcher<{
    open: { node: FileNode };
  }>();

  // Подписка на состояние дерева с явным типом.
  let treeState: {
    expanded: Set<FileNodeId>;
    selectedFileId: FileNodeId | null;
  };

  const unsubscribe = fileTreeState.subscribe((state) => {
    treeState = state;
  });

  const baseIndent = 12; // 3 * 4px
  const perDepth = 12; // 3 * 4px

  // Локальное состояние контекстного меню.
  let contextVisible = false;
  let contextX = 0;
  let contextY = 0;
  let contextNode: FileNode | null = null;

  function onDirClick(node: FileNode): void {
    toggleDir(node.id);
  }

  function onFileClick(node: FileNode): void {
    selectFile(node.id as FileNodeId);
    editorStore.ensureTabForFile(node.id || node.path, {
      activate: true,
      groupId: 1
    });
    dispatch('open', { node });
  }

  function isSelected(node: FileNode): boolean {
    return treeState?.selectedFileId === node.id;
  }

  function onContextMenu(event: MouseEvent, node: FileNode): void {
    event.preventDefault();
    contextVisible = true;
    contextX = event.clientX;
    contextY = event.clientY;
    contextNode = node;
  }

  function handleContextAction(
    event: CustomEvent<{ id: fileTreeActions.FileTreeActionId; node: FileNode }>
  ): void {
    const { id, node } = event.detail;
    contextVisible = false;

    switch (id) {
      case 'open':
        fileTreeActions.open(node);
        break;
      case 'openToSide':
        fileTreeActions.openToSide(node);
        break;
      case 'revealInExplorer':
        fileTreeActions.revealInExplorer(node);
        break;
      case 'newFile':
        fileTreeActions.newFile(node);
        break;
      case 'newFolder':
        fileTreeActions.newFolder(node);
        break;
      case 'rename':
        fileTreeActions.rename(node);
        break;
      case 'delete':
        fileTreeActions.deleteNode(node);
        break;
      default:
        // Other actions will route through the Tauri FS adapter.
        break;
    }
  }

  function closeContextMenu(): void {
    contextVisible = false;
    contextNode = null;
  }
</script>

<div class="file-tree">
  {#each nodes as node (node.id)}
    {#if node.type === 'dir'}
      <div
        class="row dir-row"
        style={`padding-left:${baseIndent + depth * perDepth}px`}
        role="button"
        tabindex="0"
        aria-expanded={isExpanded(node.id)}
        on:click={() => onDirClick(node)}
        on:keydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onDirClick(node);
          }
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault();
            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
            const syntheticEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: rect.left,
              clientY: rect.top
            });
            onContextMenu(syntheticEvent, node);
          }
        }}
        on:contextmenu={(e) => onContextMenu(e, node)}
      >
        <Icon
          name={isExpanded(node.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'}
          size={14}
          className="chevron"
        />
        <Icon
          name={isExpanded(node.id) ? 'lucide:folder-open' : 'lucide:folder'}
          size={14}
          className="folder-icon"
        />
        <span class="name">{node.name}</span>
      </div>

      {#if isExpanded(node.id) && node.children}
        <!-- Рекурсивный вызов того же компонента для поддерева -->
        <svelte:self nodes={node.children} depth={depth + 1} on:open />
      {/if}
    {:else}
      <button
        class={`row file-row ${isSelected(node) ? 'is-selected' : ''} ${contextVisible && contextNode?.id === node.id ? 'context-focus' : ''}`}
        style={`padding-left:${baseIndent + depth * perDepth}px`}
        on:click={() => onFileClick(node)}
        on:contextmenu={(e) => onContextMenu(e, node)}
        type="button"
      >
        <Icon name={getLanguageIcon(node.name)} size={14} />
        <span class="name">{node.name}</span>
      </button>
    {/if}
  {/each}

  {#if contextVisible && contextNode}
    <FileTreeContextMenu
      visible={contextVisible}
      x={contextX}
      y={contextY}
      node={contextNode}
      on:action={handleContextAction}
      on:close={closeContextMenu}
    />
  {/if}
</div>

<style>
  .file-tree {
    /* Контейнер без собственных отступов; их задают строки и depth. */
    display: block;
  }

  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px; /* 1.5 * 4px */
    padding-right: 8px; /* 2 * 4px */
    box-sizing: border-box;
    color: var(--nc-fg-muted);
    font-size: 12px; /* 3 * 4px */
    cursor: default;
  }

  .dir-row {
    height: 24px; /* 6 * 4px */
    user-select: none;
  }

  .file-row {
    border: none;
    background: transparent;
    cursor: pointer;
    height: 24px; /* 6 * 4px */
    text-align: left;
  }

  .file-row:hover {
    background-color: var(--nc-level-5);
    color: var(--nc-fg);
    border-radius: 4px;
    padding: 0 8px;
  }

  .file-row.is-selected {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
    border-radius: 4px;
    padding: 0 8px;
  }

  .file-row.context-focus {
    /* Match the hover styling so the row stays highlighted while the context menu is open. */
    background-color: var(--nc-level-5);
    color: var(--nc-fg);
    border-radius: 4px;
    padding: 0 8px;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    color: var(--nc-fg-muted);
    flex-shrink: 0;
  }

  .folder-icon {
    color: var(--nc-fg);
    flex-shrink: 0;
  }
</style>
