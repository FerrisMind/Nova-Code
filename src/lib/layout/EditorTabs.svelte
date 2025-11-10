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
      >
        <Icon name={getLanguageIcon(tab.title)} size={14} />
        <span class="tab-title">{tab.title}</span>
        {#if tab.isDirty}
          <span class="tab-dirty">
            <Icon name="lucide:CircleDot" size={9} />
          </span>
        {/if}
        <button
          class="tab-close"
          aria-label={`Close ${tab.title}`}
          on:click|stopPropagation={() => close(tab.id)}
        >
          <Icon name="lucide:X" size={10} />
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
    background-color: var(--nc-bg);
    border-bottom: 1px solid var(--nc-border-subtle);
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
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
    gap: 8px;                             /* 2 * 4px */
    max-width: 192px;                     /* 48 * 4px */
    padding: 0 12px;                      /* 3 * 4px */
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg-muted);
    cursor: pointer;
    border-right: 1px solid var(--nc-border-subtle);
    background-color: var(--nc-tab-bg);
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .tab:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .tab.active {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-dirty {
    color: var(--nc-accent);
    font-size: 8px;                       /* 2 * 4px */
  }

  .tab-close {
    margin-left: 0;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 12px;                      /* 3 * 4px */
    padding: 0;
    cursor: pointer;
    opacity: 0.7;
  }

  .tab-close:hover {
    opacity: 1;
    color: var(--nc-fg);
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
