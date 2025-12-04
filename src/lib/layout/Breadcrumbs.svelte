<script lang="ts">
  import { activeEditor, type EditorTab } from '../stores/editorStore';
  import { workspaceStore } from '../stores/workspaceStore';
  import Icon from '../common/Icon.svelte';
  import { getLanguageIcon } from '../mocks/languageIcons';
  import { onDestroy } from 'svelte';

  let { tab = null }: { tab: EditorTab | null } = $props();

  let workspaceRoot = $state<string | null>(null);
  let activeFromStore = $state<EditorTab | null>(null);

  const unsubscribeWorkspace = workspaceStore.subscribe((state) => {
    workspaceRoot = state.root;
  });

  const unsubscribeEditor = activeEditor.subscribe(($active) => {
    activeFromStore = $active;
  });

  const activeTab = $derived(tab ?? activeFromStore);

  const normalizedPath = $derived(
    (() => {
      if (!activeTab) return null;
      const raw = (activeTab.path || activeTab.id).replace(/\\/g, '/');
      if (workspaceRoot) {
        const normalizedRoot = workspaceRoot.replace(/\\/g, '/');
        if (raw.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
          const sliced = raw.slice(normalizedRoot.length);
          return sliced.startsWith('/') ? sliced.slice(1) : sliced;
        }
      }
      return raw;
    })() as string | null
  );

  const pathParts = $derived(
    normalizedPath ? normalizedPath.split('/').filter((p: string) => p.length > 0) : []
  );
  const fileName = $derived(pathParts[pathParts.length - 1] || '');
  const fileIcon = $derived(fileName ? getLanguageIcon(fileName) : 'lucide:File');

  onDestroy(() => {
    unsubscribeEditor();
    unsubscribeWorkspace();
  });
</script>

{#if normalizedPath}
  <div class="breadcrumbs">
    {#each pathParts as part, index (`${index}-${part}`)}
      <div class="crumb">
        <span class="text">{part}</span>
        <Icon name="lucide:chevron-right" size={12} className="separator" />
      </div>
    {/each}
    {#key fileName}
      <div class="crumb active">
        <Icon name={fileIcon} size={14} className="file-icon" useAdaptiveColor={true} />
        <span class="text">{fileName}</span>
      </div>
    {/key}
  </div>
{/if}

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 16px;
    background-color: var(--nc-tab-bg-active);
    border-bottom: 1px solid var(--nc-bg-elevated);
    font-size: 12px;
    color: var(--nc-fg-muted);
    overflow: hidden;
    white-space: nowrap;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .crumb {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .crumb .text {
    cursor: pointer;
  }

  .crumb .text:hover {
    color: var(--nc-fg);
  }

  .crumb.active {
    color: var(--nc-fg);
    font-weight: 500;
    display: flex;
    align-items: center;
  }

  .breadcrumbs :global(.separator) {
    color: var(--nc-fg-muted);
    opacity: 0.6;
    margin: 0 2px;
  }

  .crumb.active :global(.file-icon) {
    margin-right: 4px;
    flex-shrink: 0;
  }
</style>

<svelte:options runes={true} />
