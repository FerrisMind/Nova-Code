<script lang="ts">
// src/lib/sidebar/FileTreeContextMenu.svelte
// -----------------------------------------------------------------------------
// Минимальный, но рабочий контекстное меню для узлов файлового дерева.
// Ответственность:
// - отрисовать список действий для выбранного узла;
// - пробросить выбранное действие наружу через событие "action";
// - не выполнять побочных эффектов напрямую.
//
// Архитектура:
// - контекстное меню используется FileTree.svelte;
// - действия реализуются в fileTreeActions.ts;
// - дизайн и API повторяют идеи VS Code Explorer, без зависимостей от Tauri.
// -----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
import type { FileNode } from '../types/fileNode';
  import type { FileTreeActionId } from './fileTreeActions';

  export let visible: boolean = false;
  export let x: number = 0;
  export let y: number = 0;
  export let node: FileNode | null = null;

  const dispatch = createEventDispatcher<{
    action: { id: FileTreeActionId; node: FileNode };
    close: void;
  }>();

  function trigger(id: FileTreeActionId) {
    if (!node) return;
    dispatch('action', { id, node });
  }

  function handleBlur() {
    dispatch('close');
  }
</script>

{#if visible && node}
  <div
    class="ctx-backdrop"
    role="presentation"
    aria-hidden="true"
    on:click={() => dispatch('close')}
  ></div>

  <div
    class="ctx-menu"
    style={`top:${y}px;left:${x}px;`}
    tabindex="0"
    role="menu"
    on:blur={handleBlur}
    on:keydown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dispatch('close');
      }
    }}
  >
    <button class="ctx-item" type="button" on:click={() => trigger('open')}>
      Open
    </button>
    <button class="ctx-item" type="button" on:click={() => trigger('openToSide')}>
      Open to Side
    </button>
    <button class="ctx-item" type="button" on:click={() => trigger('revealInExplorer')}>
      Reveal in Explorer
    </button>
    <div class="ctx-separator"></div>
    <button class="ctx-item" type="button" on:click={() => trigger('newFile')}>
      New File
    </button>
    <button class="ctx-item" type="button" on:click={() => trigger('newFolder')}>
      New Folder
    </button>
    <button class="ctx-item" type="button" on:click={() => trigger('rename')}>
      Rename
    </button>
    <button class="ctx-item" type="button" on:click={() => trigger('delete')}>
      Delete
    </button>
  </div>
{/if}

<style>
  .ctx-backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 40;
  }

  .ctx-menu {
    position: fixed;
    z-index: 50;
    min-width: 160px;
    padding: 4px 0;
    background-color: var(--nc-bg-elevated, #1e1e1e);
    border: 1px solid var(--nc-border-subtle);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    font-size: 12px; /* 3 * 4px */
    color: var(--nc-fg);
  }

  .ctx-item {
    width: 100%;
    padding: 4px 10px; /* компактно, в духе VS Code */
    background: none;
    border: none;
    color: var(--nc-fg-muted);
    text-align: left;
    cursor: pointer;
    font-size: 12px;
  }

  .ctx-item:hover:not(:disabled) {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .ctx-item:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .ctx-separator {
    margin: 4px 0;
    border-top: 1px solid var(--nc-border-subtle);
  }
</style>
