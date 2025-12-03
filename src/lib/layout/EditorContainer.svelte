<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import EditorGroup from './EditorGroup.svelte';
  import {
    editorGroups,
    groupProportions,
    hydrateEditorGroups,
    updateProportions,
    type EditorGroupState,
    type EditorGroupsState
  } from '../stores/layout/editorGroupsStore';
  import { loadEditorLayout, persistEditorLayout } from '../stores/layout/editorLayoutPersistence';

  let groups: EditorGroupState[] = [];
  let proportions: number[] = [];
  let activeGroupId = 1;
  let containerEl: HTMLDivElement | null = null;

  let resizeIndex: number | null = null;
  let resizeStartX = 0;
  let containerWidth = 0;
  let isResizing = false;

  const unsubscribeGroups = editorGroups.subscribe(($state) => {
    groups = $state.groups;
    activeGroupId = $state.activeGroupId;
  });

  const unsubscribeProportions = groupProportions.subscribe(($values) => {
    proportions = $values;
  });

  const handleResizeStart = (event: MouseEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    if (!containerEl) return;

    isResizing = true;
    resizeIndex = index;
    resizeStartX = event.clientX;
    containerWidth = containerEl.clientWidth;

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
  };

  const handleResizeMove = (event: MouseEvent) => {
    if (resizeIndex === null || containerWidth === 0) return;
    const delta = event.clientX - resizeStartX;
    const normalized = containerWidth > 0 ? delta / containerWidth : 0;
    updateProportions(resizeIndex, normalized);
  };

  const handleResizeKey = (event: KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -0.02 : 0.02;
    updateProportions(index, delta);
  };

  const stopResize = () => {
    if (!isResizing) return;
    resizeIndex = null;
    isResizing = false;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
  };

  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const schedulePersist = (snapshot: EditorGroupsState) => {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = window.setTimeout(() => {
      persistEditorLayout(snapshot).catch((error) => {
        console.warn('[layout] failed to persist editor groups', error);
      });
    }, 500);
  };

  onMount(() => {
    let cancelled = false;

    loadEditorLayout()
      .then((snapshot) => {
        if (!cancelled && snapshot) {
          hydrateEditorGroups(snapshot);
        }
      })
      .catch((error) => console.warn('[layout] failed to restore editor layout', error));

    const persistUnsub = editorGroups.subscribe((state) => {
      schedulePersist(state);
    });

    return () => {
      cancelled = true;
      stopResize();
      persistUnsub();
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
    };
  });

  onDestroy(() => {
    stopResize();
    unsubscribeGroups();
    unsubscribeProportions();
  });
</script>

<div class="editor-container" bind:this={containerEl}>
  {#if groups.length === 0}
    <div class="empty-state">No editor groups</div>
  {:else}
    {#each groups as group, index}
      <div class="group-slot" style={`flex: ${proportions[index] ?? 1} 1 0%`}>
        <EditorGroup
          groupId={group.id}
          isActive={group.id === activeGroupId}
        />
      </div>

      {#if index < groups.length - 1}
        <button
          class="group-resize-handle"
          class:resizing={resizeIndex === index}
          class:active={isResizing && resizeIndex === index}
          on:mousedown={(event) => handleResizeStart(event, index)}
          on:keydown={(event) => handleResizeKey(event, index)}
          tabindex="0"
          type="button"
          aria-label="Resize editor groups"
        ></button>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .editor-container {
    display: flex;
    gap: 0;
    width: 100%;
    height: 100%;
    min-height: 0;
    position: relative;
  }

  .group-slot {
    display: flex;
    flex: 1;
    min-width: 0;
    position: relative;
  }

  .group-resize-handle {
    flex: 0 0 2px;
    width: 2px;
    height: 100%;
    align-self: stretch;
    background: transparent;
    cursor: col-resize;
    transition: width 0.12s ease, background-color 0.12s ease;
    border-radius: 2px;
    border: none;
    padding: 0;
  }

  .group-resize-handle:hover,
  .group-resize-handle.resizing {
    width: 4px;
    background: var(--nc-level-4);
  }

  .empty-state {
    padding: 16px;
    color: var(--nc-fg-muted);
    font-size: 12px;
  }
</style>
