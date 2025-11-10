<script lang="ts">
  import { onMount } from 'svelte';
  import { bottomPanelStore } from '../stores/bottomPanelStore';
  import { mockLogs } from '../mocks/logs.mock';
  import Icon from '../common/Icon.svelte';
  import {
    layoutState,
    toggleBottomPanel,
    setBottomPanelHeight
  } from '../stores/layout/layoutStore';

  /**
   * BottomPanel:
   * - источник видимости по умолчанию — layoutState.bottomPanelVisible;
   * - синхронизируется с legacy bottomPanelStore для совместимости API;
   * - высота управляется layoutState.bottomPanelHeight с drag-resize сверху;
   * - не меняет внешний контракт bottomPanelStore.toggle().
   */

  let localVisible = false;

  // Синхронизация с legacy bottomPanelStore:
  const unsubscribeLegacy = bottomPanelStore.subscribe(($s) => {
    // Если legacy говорит "скрыть" — уважаем это и в layoutState.
    if (!$s.visible && $layoutState.bottomPanelVisible) {
      toggleBottomPanel();
    }
    // Если legacy включает, но layout выключен — включаем layout.
    if ($s.visible && !$layoutState.bottomPanelVisible) {
      toggleBottomPanel();
    }
    localVisible = $s.visible;
  });

  const toggle = () => {
    // Триггерим оба слоя: legacy store + layoutStore.
    bottomPanelStore.toggle();
    toggleBottomPanel();
  };

  // Drag-resize сверху: двигаем границу и обновляем bottomPanelHeight.
  const MIN_HEIGHT = 120;
  const MAX_HEIGHT = 480;
  let isResizing = false;

  const onHandleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    isResizing = true;

    const startY = event.clientY;
    const startHeight = $layoutState.bottomPanelHeight;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = startY - e.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta));
      setBottomPanelHeight(next);
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  onMount(() => {
    return () => {
      unsubscribeLegacy();
    };
  });
</script>

{#if $layoutState.bottomPanelVisible}
  <div
    class="bottom-panel"
    style={`flex: 0 0 ${$layoutState.bottomPanelHeight}px`}
  >
    <!-- Хендл для изменения высоты:
         визуально и концептуально совпадает с ресайз-полосой сайдбара:
         тонкая прозрачная зона по границе, проявляется только по hover. -->
    <div
      class="resize-handle-top"
      role="button"
      aria-label="Resize bottom panel"
      tabindex="0"
      on:mousedown={onHandleMouseDown}
    ></div>
    <div class="bottom-header">
      <div class="tabs">
        <div class="tab active">TERMINAL</div>
        <div class="tab">OUTPUT</div>
      </div>
      <div class="actions">
        <button class="icon-btn" on:click={toggle} title="Hide Panel">
          <Icon name="terminal" size={14} />
        </button>
      </div>
    </div>
    <div class="bottom-body">
      {#each mockLogs as line, i}
        <div class="log-line">
          <span class="log-prefix">{i + 1}</span>
          <span class="log-text">{line}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .bottom-panel {
    /* Нижняя панель — часть editor stack:
       - совпадает по ширине с code editor (внутри nova-editor-region),
       - вытесняет EditorArea по вертикали,
       - не трогает ActivityBar и SideBar.
       Высота управляется через layoutStore.bottomPanelHeight. */
    position: relative;
    width: 100%;
    background-color: var(--nc-bg);
    border-top: 1px solid var(--nc-border-subtle);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg-muted);
  }

  /* Горизонтальный хендл для изменения высоты:
     - тот же визуальный паттерн, что и у .resize-handle в SideBar.svelte:
       узкая прозрачная полоса по границе, подсветка только по hover. */
  .resize-handle-top {
    position: absolute;
    top: 0;              /* ровно по верхней границе панели */
    left: 0;
    right: 0;
    height: 3px;         /* тонкая зона захвата */
    cursor: row-resize;
    background: transparent;
  }

  .resize-handle-top:hover {
    background-color: var(--nc-highlight-subtle);
  }

  .bottom-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    border-bottom: 1px solid var(--nc-border-subtle);
    height: 36px;                         /* 9 * 4px */
    box-sizing: border-box;
  }

  .tabs {
    display: flex;
    gap: 8px;                             /* 2 * 4px */
  }

  .tab {
    padding: 4px 12px;                    /* 1 * 4px, 3 * 4px */
    border-radius: 4px 4px 0 0;           /* 1 * 4px */
    background: transparent;
    color: var(--nc-fg-muted);
    cursor: default;
    font-size: 12px;                      /* 3 * 4px */
  }

  .tab.active {
    background: var(--nc-tab-bg-active);
    color: var(--nc-fg);
    border: 1px solid var(--nc-border-subtle);
    border-bottom-color: var(--nc-tab-bg-active);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;                             /* 1 * 4px */
  }

  .icon-btn {
    width: 24px;                          /* 6 * 4px */
    height: 24px;                         /* 6 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
    border: none;
    background: transparent;
    color: var(--nc-fg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-btn:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .bottom-body {
    flex: 1;
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    overflow-y: auto;
    font-family: Menlo, Monaco, 'SF Mono', 'Fira Code', ui-monospace, monospace;
  }

  .log-line {
    display: flex;
    gap: 8px;                             /* 2 * 4px */
    align-items: baseline;
    line-height: 1.5;
  }

  .log-prefix {
    width: 24px;                          /* 6 * 4px */
    text-align: right;
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
    color: var(--nc-highlight);
    user-select: none;
  }

  .log-text {
    color: var(--nc-fg-muted);
  }

  .bottom-body::-webkit-scrollbar {
    height: 4px;                          /* 1 * 4px */
    width: 8px;                           /* 2 * 4px */
  }

  .bottom-body::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight);
    border-radius: 4px;                   /* 1 * 4px */
  }
</style>
