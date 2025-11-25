<script lang="ts">
  import { afterUpdate, onDestroy, onMount } from 'svelte';
  import { editorStore, activeEditor, type EditorTab } from '../stores/editorStore';
  import Icon from '../common/Icon.svelte';
  import { getLanguageIcon } from '../mocks/languageIcons';

  let stateTabs: EditorTab[] = [];
  let currentActive: EditorTab | null = null;
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
  let scrollVisible = false;
  let scrollVisibilityTimer: ReturnType<typeof setTimeout> | null = null;
  const SCROLL_VISIBILITY_TIMEOUT = 1200;

  const unsubscribeStore = editorStore.subscribe(($state: any) => {
    stateTabs = $state.openTabs;
  });

  const unsubscribeActive = activeEditor.subscribe(($active) => {
    currentActive = $active;
  });

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
  };

  const handleWindowResize = () => {
    scheduleScrollbarUpdate();
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

  afterUpdate(() => {
    scheduleScrollbarUpdate();
  });

  onDestroy(() => {
    unsubscribeStore();
    unsubscribeActive();

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }

    resizeObserver?.disconnect();
    stopThumbDrag();
  });

  const setActive = (id: string) => {
    editorStore.setActiveEditor(id);
  };

  const close = (id: string) => {
    editorStore.closeEditor(id);
  };
</script>

<div
  class="tabs-bar-wrapper"
  class:hidden={stateTabs.length === 0}
  class:scroll-visible={scrollVisible}
  on:pointerenter={handleMouseEnter}
  on:pointerleave={handleMouseLeave}
  role="presentation"
>
  <div
    class="tabs-bar"
    bind:this={tabContainer}
  >
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
          on:click|stopPropagation={() => close(tab.id)}
        >
          <Icon name="lucide:X" size={16} />
        </button>
        </div>
      {/each}
    {/if}
  </div>
  <div class="tabs-scrollbar" aria-hidden="true">
    <div
      class="tabs-scrollbar-track"
      bind:this={scrollbarTrack}
      on:pointerdown={handleTrackPointerDown}
    >
      <span
        class="tabs-scrollbar-thumb"
        bind:this={scrollbarThumb}
        on:pointerdown={startThumbDrag}
      ></span>
    </div>
  </div>
</div>

<style>
  .tabs-bar-wrapper {
    position: relative;
    display: flex;
    align-items: stretch;
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
    height: 30px;
    overflow: hidden;
    user-select: none;
  }

  .tabs-bar {
    flex: 1;
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: stretch;
    height: 100%;
    background-color: var(--nc-level-minus1);
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
    background-color: var(--nc-level-minus1);
    transition: background-color 0.12s ease, color 0.12s ease;
    border-radius: 8px 8px 0 0;
    flex-shrink: 0;
    border: 1px solid var(--nc-level-5);
    border-bottom-color: var(--nc-level-5);
    user-select: none;
    -webkit-user-select: none;
    height: 100%;
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
    font-size: 12px;                      /* match FileTree font */
  }

  .tab-dirty {
    color: var(--nc-accent);
    font-size: 12px;                      /* 3 * 4px */
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
    right: 0;
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
</style>
