<svelte:options runes={true} />
<script lang="ts">
  import { onDestroy } from 'svelte';
  import EditorTabs from './EditorTabs.svelte';
  import EditorArea from './EditorArea.svelte';
  import {
    activeTabForGroup,
    editorStore,
    type EditorTab
  } from '../stores/editorStore';
  import {
    setActiveGroup,
    setActiveTab as setActiveGroupTab,
    type EditorGroupId
  } from '../stores/layout/editorGroupsStore';

  let {
    groupId,
    isActive = false
  }: { groupId: EditorGroupId; isActive?: boolean } = $props();

  let activeTab: EditorTab | null = null;

  const activeTabUnsub = activeTabForGroup(groupId).subscribe((value) => {
    activeTab = value;
  });

  const focusGroup = () => {
    setActiveGroup(groupId);
    if (activeTab) {
      setActiveGroupTab(groupId, activeTab.id);
      editorStore.setActiveEditor(activeTab.id);
    }
  };

  onDestroy(() => {
    activeTabUnsub();
  });
</script>

<div
  class="editor-group"
  class:active={isActive}
  role="button"
  aria-pressed={isActive}
  tabindex="0"
  onclick={focusGroup}
  onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && focusGroup()}
  onfocusin={focusGroup}
>
  <EditorTabs {groupId} {isActive} />
  <EditorArea {groupId} />
</div>

<style>
  .editor-group {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    background: var(--nc-level-0);
    border-top: 0;
    border-radius: 0 12px 12px 12px;
    overflow: hidden;
  }

  .editor-group.active {
    border-top-color: transparent;
  }
</style>
