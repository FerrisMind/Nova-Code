<script lang="ts">
  import { sidebarViews } from './sidebarRegistry';
  import { layoutState, setRightSidebarWidth } from '../stores/layout/layoutStore';

  /**
   * RightSideBar:
   * - опциональная правая панель в стиле VS Code (Outline/Timeline и др.);
   * - использует sidebarRegistry как единый источник конфигурации;
   * - управляет шириной через layoutState.rightSidebarWidth;
   * - видимость контролируется layoutState.rightSidebarVisible;
   * - реализует drag-resize с хендлом слева.
   *
   * Текущая реализация:
   * - если есть зарегистрированные right-views, берём первый как активный;
   * - готова к расширению до отдельного activityStore справа без ломки API.
   */

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 600;

  // Все правые вьюшки. На данный момент реальные right-views не зарегистрированы,
  // поэтому панель остаётся пассивной до появления конкретных компонентов.
  const rightViews = sidebarViews.filter((v) => v.position === 'right');

  // Пока активным считается первый зарегистрированный right-view (если он есть).
  $: activeRightView = rightViews[0];

  let isResizing = false;

  const onHandleMouseDown = (event: MouseEvent) => {
    if (!activeRightView) return;
    event.preventDefault();
    isResizing = true;

    const startX = event.clientX;
    const startWidth = $layoutState.rightSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // Хендл слева: положительное смещение влево увеличивает ширину.
      const delta = startX - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setRightSidebarWidth(next);
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
</script>

{#if $layoutState.rightSidebarVisible && activeRightView}
  <div
    class="right-sidebar"
    style={`width: ${$layoutState.rightSidebarWidth}px`}
  >
    <svelte:component this={activeRightView.component} />

    <!-- Ручка слева для изменения ширины правой панели: интерактивный элемент button -->
    <button
      class="resize-handle-left"
      type="button"
      aria-label="Resize right sidebar"
      on:mousedown={onHandleMouseDown}
    ></button>
  </div>
{/if}

<style>
  .right-sidebar {
    position: relative;
    background-color: var(--nc-bg);
    border-left: 1px solid var(--nc-border-subtle);
    color: var(--nc-fg-muted);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  .resize-handle-left {
    position: absolute;
    top: 0;
    left: -2px;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
  }

  .resize-handle-left:hover {
    background-color: var(--nc-highlight-subtle);
  }
</style>