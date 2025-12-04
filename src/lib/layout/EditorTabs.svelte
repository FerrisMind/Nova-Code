<svelte:options runes={true} />
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    editorStore,
    tabsForGroup,
    activeTabForGroup,
    setTabEdgeVisibility,
    setActiveTabVisibility,
    type EditorTab
  } from '../stores/editorStore';
  import {
    editorGroups,
    moveTabToGroup,
    setActiveGroup,
    setActiveTab as setActiveGroupTab,
    splitRightFromActive,
    MAX_GROUPS,
    type EditorGroupId
  } from '../stores/layout/editorGroupsStore';
  import Icon from '../common/Icon.svelte';
  import { getLanguageIcon } from '../mocks/languageIcons';

  let {
    groupId,
    isActive = false
  }: { groupId: EditorGroupId; isActive?: boolean } = $props();

  let stateTabs: EditorTab[] = $state([]);
  let currentActive: EditorTab | null = $state(null);
  let tabContainer: HTMLDivElement | null = null;
  let scrollbarTrack: HTMLDivElement | null = null;
  let scrollbarThumb: HTMLSpanElement | null = null;
  let animationFrame: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let maxScrollDistance = 0;
  let maxThumbOffset = 0;
  let currentThumbWidth = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let hoverActive = false;
  let scrollActive = false;
  let scrollVisible = $state(false);
  let scrollVisibilityTimer: ReturnType<typeof setTimeout> | null = null;
  const SCROLL_VISIBILITY_TIMEOUT = 1200;

  let groupCount = $state(1);
  let moveTargets: EditorGroupId[] = $state([]);
  let contextMenuOpen = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);
  let contextTabId: string | null = $state(null);
  let actionsMenuOpen = $state(false);
  let activeTabAtRightEdge = $state(false);


  const tabsUnsub = tabsForGroup(groupId).subscribe((tabs) => {
    stateTabs = tabs;
    requestAnimationFrame(() => updateActiveTabVisibility());
  });

  const activeTabUnsub = activeTabForGroup(groupId).subscribe(($active) => {
    currentActive = $active;
    requestAnimationFrame(() => updateActiveTabVisibility());
  });

  const groupsUnsub = editorGroups.subscribe(($state) => {
    groupCount = $state.groups.length;
    moveTargets = $state.groups.filter((g) => g.id !== groupId).map((g) => g.id);
  });

  const showActiveIndicator = $derived(isActive && !!currentActive && groupCount > 1);

  const scheduleScrollbarUpdate = () => {
    if (typeof requestAnimationFrame !== 'function') {
      updateScrollbar();
      return;
    }

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }

    animationFrame = requestAnimationFrame(() => {
      animationFrame = null;
      updateScrollbar();
    });
  };

  const updateScrollbar = () => {
    if (!tabContainer || !scrollbarTrack || !scrollbarThumb) {
      return;
    }

    const containerWidth = tabContainer.clientWidth;
    const contentWidth = tabContainer.scrollWidth;
    maxScrollDistance = Math.max(contentWidth - containerWidth, 0);

    if (maxScrollDistance === 0) {
      scrollbarTrack.style.opacity = '0';
      scrollbarTrack.style.pointerEvents = 'none';
      scrollbarThumb.style.opacity = '0';
      return;
    }

    scrollbarTrack.style.opacity = '1';
    scrollbarTrack.style.pointerEvents = 'auto';

    const trackWidth = scrollbarTrack.clientWidth;
    const trackAvailableWidth = Math.max(trackWidth, 0);
    const calculatedThumbWidth = Math.max((containerWidth / contentWidth) * trackAvailableWidth, 32);
    currentThumbWidth = Math.min(calculatedThumbWidth, trackAvailableWidth);
    scrollbarThumb.style.width = `${currentThumbWidth}px`;

    maxThumbOffset = Math.max(trackAvailableWidth - currentThumbWidth, 0);
    const scrollRatio = Math.min(Math.max(tabContainer.scrollLeft / maxScrollDistance, 0), 1);
    const thumbOffset = maxThumbOffset * scrollRatio;
    scrollbarThumb.style.transform = `translateX(${thumbOffset}px)`;
    scrollbarThumb.style.opacity = '1';
  };

  const handleContainerScroll = () => {
    scheduleScrollbarUpdate();
    triggerScrollVisibility();
    updateActiveTabVisibility();
  };

  const handleWindowResize = () => {
    scheduleScrollbarUpdate();
    updateActiveTabVisibility();
  };

  const updateActiveTabVisibility = () => {
    if (!tabContainer || !currentActive) {
      setTabEdgeVisibility(groupId, false);
      setActiveTabVisibility(groupId, false);
      activeTabAtRightEdge = false;
      return;
    }

    const activeTabElement = tabContainer.querySelector(`[data-tab-id="${currentActive.id}"]`) as HTMLElement;
    if (!activeTabElement) {
      setTabEdgeVisibility(groupId, false);
      setActiveTabVisibility(groupId, false);
      activeTabAtRightEdge = false;
      return;
    }

    const containerRect = tabContainer.getBoundingClientRect();
    const tabRect = activeTabElement.getBoundingClientRect();

    const isAtRightEdge = tabRect.right >= containerRect.right - 20;
    const isAtLeftEdge = tabRect.left <= containerRect.left + 20;
    const isVisible = tabRect.left < containerRect.right && tabRect.right > containerRect.left;
    
    // Проверяем, пересекается ли активный таб с левым краем actions-tab-bg
    // Левый край фонового элемента находится на ~88px от правого края контейнера
    const actionsTabBgLeft = containerRect.right - 88;
    // Таб пересекает левый край фонового элемента, если его левая сторона левее левого края фона,
    // а правая сторона правее левого края фона
    const isOverlappingActionsBgLeft = tabRect.left < actionsTabBgLeft && tabRect.right >= actionsTabBgLeft && isVisible;

    setTabEdgeVisibility(groupId, isAtRightEdge && isVisible);
    setActiveTabVisibility(groupId, isAtLeftEdge && isVisible);
    activeTabAtRightEdge = isOverlappingActionsBgLeft;
  };

  const updateScrollbarVisibility = () => {
    const shouldShow = hoverActive || scrollActive;
    if (scrollVisible === shouldShow) return;
    scrollVisible = shouldShow;
  };

  const triggerScrollVisibility = () => {
    scrollActive = true;
    updateScrollbarVisibility();

    if (scrollVisibilityTimer !== null) {
      clearTimeout(scrollVisibilityTimer);
    }

    scrollVisibilityTimer = window.setTimeout(() => {
      scrollActive = false;
      scrollVisibilityTimer = null;
      updateScrollbarVisibility();
    }, SCROLL_VISIBILITY_TIMEOUT);
  };

  const handleMouseEnter = () => {
    hoverActive = true;
    updateScrollbarVisibility();
  };

  const handleMouseLeave = () => {
    hoverActive = false;
    updateScrollbarVisibility();
  };

  const stopThumbDrag = () => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    window.removeEventListener('pointermove', handleThumbPointerMove);
    window.removeEventListener('pointerup', stopThumbDrag);
    window.removeEventListener('pointercancel', stopThumbDrag);
  };

  const handleThumbPointerMove = (event: PointerEvent) => {
    if (!isDragging || !tabContainer || maxThumbOffset <= 0) {
      return;
    }

    event.preventDefault();
    const delta = event.clientX - dragStartX;
    const ratio = delta / maxThumbOffset;
    const target = dragStartScrollLeft + ratio * maxScrollDistance;
    tabContainer.scrollLeft = Math.min(Math.max(target, 0), maxScrollDistance);
  };

  const startThumbDrag = (event: PointerEvent) => {
    if (maxScrollDistance <= 0 || !tabContainer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
    dragStartX = event.clientX;
    dragStartScrollLeft = tabContainer.scrollLeft;

    triggerScrollVisibility();

    window.addEventListener('pointermove', handleThumbPointerMove);
    window.addEventListener('pointerup', stopThumbDrag);
    window.addEventListener('pointercancel', stopThumbDrag);
  };

  const handleTrackPointerDown = (event: PointerEvent) => {
    if (!tabContainer || maxScrollDistance <= 0 || !scrollbarTrack) {
      return;
    }

    if (event.target === scrollbarThumb) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = scrollbarTrack.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const available =
      rect.width - currentThumbWidth > 0 ? rect.width - currentThumbWidth : rect.width;
    const clamped = Math.min(Math.max(clickX - currentThumbWidth / 2, 0), Math.max(available, 0));
    const ratio = available <= 0 ? 0 : clamped / available;
    tabContainer.scrollLeft = ratio * maxScrollDistance;

    triggerScrollVisibility();
  };

  onMount(() => {
    if (tabContainer) {
      tabContainer.addEventListener('scroll', handleContainerScroll, { passive: true });
    }

    window.addEventListener('resize', handleWindowResize);

    const observer = new ResizeObserver(() => {
      scheduleScrollbarUpdate();
    });
    resizeObserver = observer;

    if (tabContainer) {
      observer.observe(tabContainer);
    }

    if (scrollbarTrack) {
      observer.observe(scrollbarTrack);
    }

    scheduleScrollbarUpdate();

    return () => {
      if (tabContainer) {
        tabContainer.removeEventListener('scroll', handleContainerScroll);
      }

      window.removeEventListener('resize', handleWindowResize);

      observer.disconnect();
      stopThumbDrag();
    };
  });

  $effect(() => {
    stateTabs;
    currentActive;
    scrollVisible;
    scheduleScrollbarUpdate();
  });

  onDestroy(() => {
    tabsUnsub();
    activeTabUnsub();
    groupsUnsub();

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }

    resizeObserver?.disconnect();
    stopThumbDrag();
  });

  const focusTab = (id: string) => {
    setActiveGroup(groupId);
    setActiveGroupTab(groupId, id);
    editorStore.setActiveEditor(id);
  };

  const setActive = (id: string) => {
    focusTab(id);
  };

  const close = (id: string) => {
    editorStore.closeEditor(id);
    if (contextTabId === id) {
      closeContextMenu();
    }
  };

  const handleSplit = () => {
    if (!currentActive || groupCount >= MAX_GROUPS) return;
    setActiveGroup(groupId);
    setActiveGroupTab(groupId, currentActive.id);
    editorStore.setActiveEditor(currentActive.id);
    splitRightFromActive();
  };

  const openContextMenu = (event: MouseEvent, tabId: string) => {
    event.preventDefault();
    contextMenuOpen = true;
    contextTabId = tabId;
    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
  };

  const closeContextMenu = () => {
    contextMenuOpen = false;
    contextTabId = null;
  };

  const moveToGroup = (targetId: EditorGroupId) => {
    if (!contextTabId) return;
    moveTabToGroup(contextTabId, groupId, targetId);
    editorStore.setActiveEditor(contextTabId);
    closeContextMenu();
  };

  const toggleActionsMenu = (event: MouseEvent) => {
    event.stopPropagation();
    actionsMenuOpen = !actionsMenuOpen;
  };

  const closeActionsMenu = () => {
    actionsMenuOpen = false;
  };

  const closeAllTabs = () => {
    stateTabs.forEach((tab) => editorStore.closeEditor(tab.id));
    closeActionsMenu();
  };
</script>

<div
  class="tabs-bar-wrapper"
  class:hidden={stateTabs.length === 0}
  class:scroll-visible={scrollVisible}
  onpointerenter={handleMouseEnter}
  onpointerleave={handleMouseLeave}
  role="presentation"
>
  <div class="tabs-main">
    <div class="tabs-bar" bind:this={tabContainer}>
      {#if stateTabs.length === 0}
        <div class="tabs-empty">Open a file from Explorer to get started.</div>
      {:else}
        {#each stateTabs as tab (tab.id)}
          <div
            class="tab"
            class:active={currentActive && currentActive.id === tab.id}
            class:with-indicator={showActiveIndicator && currentActive && currentActive.id === tab.id}
            data-tab-id={tab.id}
            role="tab"
            tabindex="0"
            onclick={() => setActive(tab.id)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(tab.id)}
            oncontextmenu={(event) => openContextMenu(event, tab.id)}
            title={tab.path}
          >
            <span class="tab-title">
              <Icon name={getLanguageIcon(tab.title)} size={16} useAdaptiveColor={true} />
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
              onclick={(event) => {
                event.stopPropagation();
                close(tab.id);
              }}
            >
              <Icon name="lucide:X" size={16} />
            </button>
          </div>
        {/each}
      {/if}
    </div>
    <div class="actions-tab-bg" class:hide-bottom-curve={activeTabAtRightEdge}></div>
    <div class="actions-tab">
      <button
        class="icon-button"
        aria-label="Split editor right"
        title={groupCount >= MAX_GROUPS ? 'Maximum groups reached' : 'Split editor right'}
        onclick={handleSplit}
        disabled={groupCount >= MAX_GROUPS || !currentActive}
      >
        <Icon name="lucide:columns-2" size={24} />
      </button>
      <button
        class="icon-button"
        aria-label="More editor actions"
        title="More editor actions"
        onclick={toggleActionsMenu}
      >
        <Icon name="lucide:Ellipsis" size={24} />
      </button>
    </div>
  </div>

  <div class="tabs-scrollbar" aria-hidden="true">
    <div
      class="tabs-scrollbar-track"
      bind:this={scrollbarTrack}
      onpointerdown={handleTrackPointerDown}
    >
      <span
        class="tabs-scrollbar-thumb"
        bind:this={scrollbarThumb}
        onpointerdown={startThumbDrag}
      ></span>
    </div>
  </div>

  {#if contextMenuOpen}
    <div
      class="tab-menu-backdrop"
      role="button"
      tabindex="0"
      aria-label="Close tab context menu"
      onclick={closeContextMenu}
      onkeydown={(event) =>
        (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') && closeContextMenu()}
    ></div>
    <div
      class="tab-menu"
      style={`top:${contextMenuY}px;left:${contextMenuX}px;`}
      role="menu"
      tabindex="-1"
      onkeydown={(event) => event.key === 'Escape' && closeContextMenu()}
    >
      {#if moveTargets.length === 0}
        <div class="tab-menu-empty">No other groups</div>
      {:else}
        {#each moveTargets as targetId}
          <button class="tab-menu-item" type="button" onclick={() => moveToGroup(targetId)}>
            Move to Group {targetId}
          </button>
        {/each}
      {/if}
    </div>

  {/if}

  {#if actionsMenuOpen}
    <div
      class="tab-menu-backdrop"
      role="button"
      tabindex="0"
      aria-label="Close actions menu"
      onclick={closeActionsMenu}
      onkeydown={(event) =>
        (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') && closeActionsMenu()}
    ></div>
    <div
      class="tab-menu actions-menu"
      role="menu"
      tabindex="-1"
      onkeydown={(event) => event.key === 'Escape' && closeActionsMenu()}
    >
      <button class="tab-menu-item" type="button" onclick={closeAllTabs}>
        Close all tabs
      </button>
    </div>
  {/if}
</div>

<style>
  .tabs-bar-wrapper {
    position: relative;
    display: flex;
    align-items: stretch;
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
    height: 34px;
    overflow: hidden;
    user-select: none;
    box-shadow: none !important;
  }

  .tabs-main {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .tabs-bar {
    flex: 1;
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: stretch;
    height: 100%;
    background-color: var(--nc-level-0);
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    gap: 2px;
    padding: 0;
    position: relative;
    user-select: none;
    box-sizing: border-box;
    scrollbar-width: none;
    -ms-overflow-style: none;
    border-radius: 0 !important;
  }

  .tabs-bar::after {
    content: '';
    flex: 0 0 84px;
  }

  .tabs-empty {
    padding: 0 12px;                      /* 3 * 4px */
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg-muted);
    display: flex;
    align-items: center;
  }

  .actions-tab-bg {
    position: absolute;
    right: -2px;
    bottom: 0;
    display: inline-flex;
    align-items: center;
    background: var(--nc-level-0);
    border-radius: 0;
    padding: 0 12px;
    height: calc(100% + 2px);
    width: calc(84px + 4px);
    box-sizing: border-box;
    z-index: 0;
  }

  /* Вогнутое скругление слева снизу у фонового элемента */
  .actions-tab-bg::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: -10px;
    width: 10px;
    height: 10px;
    background: transparent;
    border-bottom-right-radius: 10px;
    box-shadow: 5px 5px 0 5px var(--nc-level-0);
  }

  /* Обычное скругление когда активный таб пересекается с фоновым элементом */
  .actions-tab-bg.hide-bottom-curve {
    border-bottom-left-radius: 10px;
  }

  .actions-tab-bg.hide-bottom-curve::before {
    display: none;
  }

  /* Вогнутое скругление слева сверху у фонового элемента */
  .actions-tab-bg::after {
    content: '';
    position: absolute;
    top: 0;
    left: -10px;
    width: 10px;
    height: 10px;
    background: transparent;
    border-top-right-radius: 10px;
    box-shadow: 5px -5px 0 5px var(--nc-level-0);
  }

  .actions-tab {
    position: absolute;
    right: 0;
    bottom: 2px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--nc-tab-bg-active);
    background: var(--nc-tab-bg-active);
    color: var(--nc-fg);
    border-radius: 8px;
    padding: 0 10px;
    height: calc(100% - 2px);
    box-sizing: border-box;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    z-index: 1;
  }

  .actions-tab .icon-button {
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.12s ease, color 0.12s ease, opacity 0.12s ease, border-color 0.12s ease;
  }

  .actions-tab .icon-button:hover:not(:disabled) {
    background: var(--nc-level-5);
    border-color: var(--nc-border-subtle);
  }

  .actions-tab .icon-button:disabled {
    opacity: 0.6;
    cursor: default;
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
    background-color: var(--nc-level-0);
    transition: background-color 0.12s ease, color 0.12s ease;
    border-radius: 8px 8px 8px 8px;
    flex-shrink: 0;
    border: 1px solid var(--nc-level-5);
    border-bottom-color: var(--nc-level-5);
    user-select: none;
    -webkit-user-select: none;
    height: 100%;
    overflow: visible;
  }

  .tab:not(.active) {
    height: calc(100% - 2px);
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
    border-color: transparent;
    border-bottom-color: transparent;
    position: relative;
  }

  .tab.with-indicator {
    box-shadow: inset 0 3px 0 0 var(--nc-accent);
  }

  /* Вогнутое скругление слева снизу */
  .tab.active::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: -8px;
    width: 8px;
    height: 8px;
    background: transparent;
    border-bottom-right-radius: 8px;
    box-shadow: 4px 4px 0 4px var(--nc-tab-bg-active);
  }

  /* Вогнутое скругление справа снизу */
  .tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: -8px;
    width: 8px;
    height: 8px;
    background: transparent;
    border-bottom-left-radius: 8px;
    box-shadow: -4px 4px 0 4px var(--nc-tab-bg-active);
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
    font-size: 12px;                      /* match FileTree font */
    pointer-events: none;
  }

  .tab-dirty {
    color: var(--nc-accent);
    font-size: 12px;                      /* 3 * 4px */
    pointer-events: none;
  }

  .tab-close {
    margin-left: 0;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font-size: 12px;                      /* 3 * 4px */
    width: 20px;
    height: 20px;
    padding: 0;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease, background-color 0.12s ease;
    flex-shrink: 0;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tab-close.visible {
    opacity: 0.7;
  }

  .tab-close.visible:hover {
    opacity: 1;
    background-color: var(--nc-level-5);
    border-color: var(--nc-level-3);
  }

  .tab:not(.active):hover .tab-close {
    opacity: 0.7;
  }

  .tab:not(.active) .tab-close:hover {
    opacity: 1;
    background-color: var(--nc-level-5);
    border-color: var(--nc-level-3);
  }

  .tabs-bar::-webkit-scrollbar {
    display: none;
  }

  .tabs-scrollbar {
    position: absolute;
    left: 0;
    right: 84px;
    bottom: 0;
    height: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .tabs-scrollbar-track {
    width: 100%;
    min-width: 120px;
    height: 6px;
    border-radius: 999px;
    background: transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .tabs-scrollbar-thumb {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    height: 6px;
    border-radius: 999px;
    background: var(--nc-accent);
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    pointer-events: none;
  }

  .tabs-bar-wrapper.scroll-visible .tabs-scrollbar {
    opacity: 1;
    pointer-events: auto;
  }

  .tabs-bar-wrapper.scroll-visible .tabs-scrollbar-track,
  .tabs-bar-wrapper.scroll-visible .tabs-scrollbar-thumb {
    opacity: 1;
    pointer-events: auto;
  }

  .tabs-bar-wrapper.hidden {
    display: none;
  }

  .tab-menu-backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 20;
  }

  .tab-menu {
    position: fixed;
    z-index: 25;
    min-width: 180px;
    padding: 6px;
    background-color: var(--nc-bg-elevated, #1e1e1e);
    border: 1px solid var(--nc-border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    gap: 4px;
    outline: none;
  }

  .tab-menu-item {
    border: none;
    background: transparent;
    color: var(--nc-fg);
    text-align: left;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
  }

  .tab-menu-item:hover {
    background-color: var(--nc-level-4);
  }

  .tab-menu-empty {
    padding: 6px 8px;
    font-size: 12px;
    color: var(--nc-fg-muted);
  }

  .actions-menu {
    position: absolute;
    right: 8px;
    top: 40px;
  }
</style>
