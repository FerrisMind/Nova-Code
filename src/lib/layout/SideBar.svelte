<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { activityStore, type ActivityId } from '../stores/activityStore';
  import { sidebarViews } from './sidebarRegistry';
  import {
    layoutState,
    setLeftSidebarWidth,
    setLeftSidebarVisible,
  } from '../stores/layout/layoutStore';

  /**
   * Left SideBar:
   * - рендерит активное левое представление из sidebarRegistry по $activityStore;
   * - управляет видимостью и шириной через layoutState;
   * - реализует drag-resize справа (VS Code-like).
   *
   * Store layoutState:
   * - не знает о конкретных компонентах, только видимость/размеры контейнеров.
   */

  const MIN_WIDTH = 220;
  let windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;

  // Reactive max width: 62.5% of window width
  const MAX_WIDTH = $derived(Math.floor(windowWidth * 0.625));

  // Функция обновления размеров окна
  const updateWindowWidth = () => {
    windowWidth = window.innerWidth;
    const newMaxWidth = Math.floor(windowWidth * 0.625);
    // Если текущая ширина сайдбара больше нового максимума, подгоняем
    if ($layoutState.leftSidebarWidth > newMaxWidth) {
      setLeftSidebarWidth(newMaxWidth);
    }
    // Если текущая ширина меньше минимума, устанавливаем минимум
    if ($layoutState.leftSidebarWidth < MIN_WIDTH) {
      setLeftSidebarWidth(MIN_WIDTH);
    }
  };

  // Все левые вьюшки из реестра.
  const leftViews = sidebarViews.filter((v) => v.position === 'left');

  // Текущее активное id хранится в activityStore.
  let activeId: ActivityId;
  const unsubscribeActivity = activityStore.subscribe((value) => {
    activeId = value;
  });

  // Текущее активное view-конфиг для левой панели.
  const activeView = $derived(leftViews.find((v) => v.id === activeId));

  // Drag-resize: обработчик на вертикальном хендле справа.
  let isResizing = $state(false);
  let hideTimer: number | null = $state(null);

  const onHandleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    isResizing = true;

    const startX = event.clientX;
    const startWidth = $layoutState.leftSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = e.clientX - startX;
      const proposedWidth = startWidth + delta;
      if (proposedWidth < MIN_WIDTH) {
        // Если ширина меньше минимальной, запускаем таймер на скрытие с задержкой
        if (hideTimer === null) {
          hideTimer = window.setTimeout(() => {
            setLeftSidebarVisible(false);
            hideTimer = null;
          }, 500);
        }
      } else {
        // Если ширина достаточная, отменяем таймер
        if (hideTimer !== null) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        const next = Math.min(MAX_WIDTH, proposedWidth);
        setLeftSidebarWidth(next);
      }
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      // Очищаем таймер при отпускании мыши
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  onMount(() => {
    // Инициализируем ширину окна
    updateWindowWidth();
    // Добавляем обработчик изменения размера окна
    window.addEventListener('resize', updateWindowWidth);
  });

  // Отписка от activityStore при уничтожении компонента.
  onDestroy(() => {
    unsubscribeActivity();
    // Удаляем обработчик изменения размера окна
    window.removeEventListener('resize', updateWindowWidth);
    // Очищаем таймер при уничтожении компонента
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  });
</script>

{#if $layoutState.leftSidebarVisible}
  <div class="sidebar" style={`width: ${$layoutState.leftSidebarWidth}px`}>
    {#if activeView}
      {@const ActiveView = activeView.component}
      <ActiveView />
    {/if}

    <!-- Вертикальный ресайз-хендл справа:
         Делаем его тем же паттерном, что и у BottomPanel (тонкий, прозрачно-реактивный). -->
    <div
      class="resize-handle"
      class:resizing={isResizing}
      role="button"
      aria-label="Resize sidebar"
      tabindex="0"
      onmousedown={onHandleMouseDown}
    ></div>
  </div>
{/if}

<style>
  .sidebar {
    position: relative;
    background-color: var(--nc-level-1);
    color: var(--nc-fg-muted);
    display: flex;
    flex-direction: column;
    overflow: visible;
    box-sizing: border-box;
    border-radius: 12px; /* Rounded corners on all sides */
  }

  /* Ресайз-хендл слева:
     - повторяет паттерн BottomPanel: тонкая зона, прозрачная,
       подсвечивается только по hover;
     - кликабельная область ровно по границе. */
  .resize-handle {
    position: absolute;
    top: 0;
    right: -4px;
    width: 4px; /* Handle sits in gap between panels */
    height: 100%;
    cursor: col-resize;
    background-color: transparent;
    border-radius: 5px;
    z-index: 1;
  }

  .resize-handle:hover,
  .resize-handle.resizing {
    background-color: rgba(128, 128, 128, 0.6);
  }
</style>

<svelte:options runes={true} />
