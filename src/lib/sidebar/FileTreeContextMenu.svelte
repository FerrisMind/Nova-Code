<svelte:options runes={true} />
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
  import type { FileNode } from '../types/fileNode';
  import type { FileTreeActionId } from './fileTreeActions';

  let {
    visible = false,
    x = 0,
    y = 0,
    node = null,
    onaction,
    onclose
  }: {
    visible?: boolean;
    x?: number;
    y?: number;
    node?: FileNode | null;
    onaction?: (detail: { id: FileTreeActionId; node: FileNode }) => void;
    onclose?: () => void;
  } = $props();

  function trigger(id: FileTreeActionId) {
    if (!node) return;
    onaction?.({ id, node });
  }

  function handleBlur() {
    onclose?.();
  }
</script>

{#if visible && node}
  <div
    class="ctx-backdrop"
    role="presentation"
    aria-hidden="true"
    onclick={() => onclose?.()}
  ></div>

  <div
    class="ctx-menu"
    style={`top:${y}px;left:${x}px;`}
    tabindex="0"
    role="menu"
    onblur={handleBlur}
    onkeydown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onclose?.();
      }
    }}
  >
    <button class="ctx-item" type="button" onclick={() => trigger('open')}>
      Open
    </button>
    <button class="ctx-item" type="button" onclick={() => trigger('openToSide')}>
      Open to Side
    </button>
    <button class="ctx-item" type="button" onclick={() => trigger('revealInExplorer')}>
      Reveal in Explorer
    </button>
    <div class="ctx-separator"></div>
    <button class="ctx-item" type="button" onclick={() => trigger('newFile')}>
      New File
    </button>
    <button class="ctx-item" type="button" onclick={() => trigger('newFolder')}>
      New Folder
    </button>
    <button class="ctx-item" type="button" onclick={() => trigger('rename')}>
      Rename
    </button>
    <button class="ctx-item" type="button" onclick={() => trigger('delete')}>
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
