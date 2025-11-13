<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activityStore, type ActivityId } from '../stores/activityStore';
  import { sidebarViews } from './sidebarRegistry';
  import { layoutState, setLeftSidebarWidth } from '../stores/layout/layoutStore';

  /**
   * Left SideBar:
   * - рендерит активное левое представление из sidebarRegistry по $activityStore;
   * - управляет видимостью и шириной через layoutState;
   * - реализует drag-resize справа (VS Code-like).
   *
   * Store layoutState:
   * - не знает о конкретных компонентах, только видимость/размеры контейнеров.
   */

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 600;

  // Все левые вьюшки из реестра.
  const leftViews = sidebarViews.filter((v) => v.position === 'left');

  // Текущее активное id хранится в activityStore.
  let activeId: ActivityId;
  const unsubscribeActivity = activityStore.subscribe((value) => {
    activeId = value;
  });

  // Текущее активное view-конфиг для левой панели.
  $: activeView = leftViews.find((v) => v.id === activeId);

  // Drag-resize: обработчик на вертикальном хендле справа.
  let isResizing = false;

  const onHandleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    isResizing = true;

    const startX = event.clientX;
    const startWidth = $layoutState.leftSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = e.clientX - startX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setLeftSidebarWidth(next);
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

  // Отписка от activityStore при уничтожении компонента.
  onDestroy(() => {
    unsubscribeActivity();
  });
</script>

{#if $layoutState.leftSidebarVisible}
  <div
    class="sidebar"
    style={`width: ${$layoutState.leftSidebarWidth}px`}
  >
    {#if activeView}
      <svelte:component this={activeView.component} />
    {/if}

    <!-- Вертикальный ресайз-хендл справа:
         Делаем его тем же паттерном, что и у BottomPanel (тонкий, прозрачно-реактивный). -->
    <div
      class="resize-handle"
      role="button"
      aria-label="Resize sidebar"
      tabindex="0"
      on:mousedown={onHandleMouseDown}
    ></div>
  </div>
{/if}

<style>
  .sidebar {
    position: relative;
    background-color: var(--nc-level-1);
    border-right: 1px solid var(--nc-border-subtle);
    color: var(--nc-fg-muted);
    display: flex;
    flex-direction: column;
    overflow: visible;
    box-sizing: border-box;
    border-radius: 12px;  /* Rounded corners on all sides */
  }

  /* Ресайз-хендл слева:
     - повторяет паттерн BottomPanel: тонкая зона, прозрачная,
       подсвечивается только по hover;
     - кликабельная область ровно по границе. */
  .resize-handle {
    position: absolute;
    top: 0;
    right: -4px;
    width: 4px;                /* Handle sits in gap between panels */
    height: 100%;
    cursor: col-resize;
    background: transparent;
    z-index: 1;
  }

  .resize-handle:hover {
    background-color: var(--nc-highlight-subtle);
  }
</style>
