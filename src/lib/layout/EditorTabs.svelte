<script lang="ts">
  import { editorStore, activeEditor, type EditorTab } from '../stores/editorStore';
  import Icon from '../common/Icon.svelte';
  import { getLanguageIcon } from '../mocks/languageIcons';

  let stateTabs: EditorTab[] = [];
  let currentActive: EditorTab | null = null;

  const unsubscribeStore = editorStore.subscribe(($state: any) => {
    stateTabs = $state.openTabs;
  });

  const unsubscribeActive = activeEditor.subscribe(($active) => {
    currentActive = $active;
  });

  const setActive = (id: string) => {
    editorStore.setActiveEditor(id);
  };

  const close = (id: string) => {
    editorStore.closeEditor(id);
  };
</script>

<div class="tabs-bar" class:hidden={stateTabs.length === 0}>
  {#if stateTabs.length === 0}
    <div class="tabs-empty">Open a file from Explorer to get started.</div>
  {:else}
    {#each stateTabs as tab (tab.id)}
      <div
        class="tab"
        class:active={currentActive && currentActive.id === tab.id}
        role="tab"
        tabindex="0"
        on:click={() => setActive(tab.id)}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(tab.id)}
        title={tab.path}
      >
        <span class="tab-title">
          <Icon name={getLanguageIcon(tab.title)} size={16} />
          {tab.title}
        </span>
        {#if tab.isDirty}
          <span class="tab-dirty">
            <Icon name="lucide:CircleDot" size={12} />
          </span>
        {/if}
        <button
          class="tab-close"
          class:visible={currentActive && currentActive.id === tab.id}
          aria-label={`Close ${tab.title}`}
          on:click|stopPropagation={() => close(tab.id)}
        >
          <Icon name="lucide:X" size={16} />
        </button>
      </div>
    {/each}
  {/if}
</div>

<style>
  .tabs-bar {
    display: flex;
    align-items: stretch;
    height: 36px;                         /* 9 * 4px */
    background-color: var(--nc-level-1);
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    gap: 2px;
    padding: 0;
  }

  .tabs-empty {
    padding: 0 12px;                      /* 3 * 4px */
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg-muted);
    display: flex;
    align-items: center;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;                             /* 2 * 4px */
    width: 192px;                         /* 48 * 4px - фиксированная ширина */
    padding: 0 12px;                      /* 3 * 4px */
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg-muted);
    cursor: pointer;
    background-color: var(--nc-level-1);
    transition: background-color 0.12s ease, color 0.12s ease;
    border-radius: 8px 8px 0 0;
    flex-shrink: 0;
    border: 1px solid var(--nc-border-subtle);
    border-bottom-color: var(--nc-border-subtle);
  }

  .tab:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
    border-color: var(--nc-level-3);
    border-bottom-color: var(--nc-level-3);
  }

  .tab.active {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
    border-color: var(--nc-level-3);
    border-bottom-color: var(--nc-tab-bg-active);
  }

  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    font-size: 16px;                      /* 4 * 4px */
  }

  .tab-dirty {
    color: var(--nc-accent);
    font-size: 12px;                      /* 3 * 4px */
  }

  .tab-close {
    margin-left: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 12px;                      /* 3 * 4px */
    padding: 4px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease, background-color 0.12s ease;
    flex-shrink: 0;
    border-radius: 4px;
  }

  .tab-close.visible {
    opacity: 0.7;
  }

  .tab-close.visible:hover {
    opacity: 1;
    background-color: var(--nc-level-2);
  }

  .tab:not(.active):hover .tab-close {
    opacity: 0.7;
  }

  .tab:not(.active) .tab-close:hover {
    opacity: 1;
    background-color: var(--nc-level-2);
    border-color: var(--nc-level-2);
  }

  .tabs-bar::-webkit-scrollbar {
    height: 4px;                          /* 1 * 4px */
  }

  .tabs-bar::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
    border-radius: 4px;                   /* 1 * 4px */
  }

  .tabs-bar.hidden {
    display: none;
  }
</style>
