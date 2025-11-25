<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sidebarViews } from './sidebarRegistry';
  import { layoutState, setRightSidebarWidth, setRightSidebarVisible } from '../stores/layout/layoutStore';

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

  const MIN_WIDTH = 220;
  let windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;

  // Reactive max width: 70% of window width
  const MAX_WIDTH = $derived(Math.floor(windowWidth * 0.7));

  // Функция обновления размеров окна
  const updateWindowWidth = () => {
    windowWidth = window.innerWidth;
    const newMaxWidth = Math.floor(windowWidth * 0.7);
    // Если текущая ширина сайдбара больше нового максимума, подгоняем
    if ($layoutState.rightSidebarWidth > newMaxWidth) {
      setRightSidebarWidth(newMaxWidth);
    }
    // Если текущая ширина меньше минимума, устанавливаем минимум
    if ($layoutState.rightSidebarWidth < MIN_WIDTH) {
      setRightSidebarWidth(MIN_WIDTH);
    }
  };

  // Все правые вьюшки. На данный момент реальные right-views не зарегистрированы,
  // поэтому панель остаётся пассивной до появления конкретных компонентов.
  const rightViews = $derived(sidebarViews.filter((v) => v.position === 'right'));

  // Пока активным считается первый зарегистрированный right-view (если он есть).
  const activeRightView = $derived(rightViews[0]);

  let isResizing = false;

  const onHandleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    isResizing = true;

    const startX = event.clientX;
    const startWidth = $layoutState.rightSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = e.clientX - startX;
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

  onMount(() => {
    // Инициализируем ширину окна
    updateWindowWidth();
    // Добавляем обработчик изменения размера окна
    window.addEventListener('resize', updateWindowWidth);
  });

  onDestroy(() => {
    // Удаляем обработчик изменения размера окна
    window.removeEventListener('resize', updateWindowWidth);
  });
</script>

{#if $layoutState.rightSidebarVisible}
  <div
    class="right-sidebar"
    style={`width: ${$layoutState.rightSidebarWidth}px`}
  >
    {#if activeRightView}
      {@const Component = activeRightView.component}
      <Component />
    {/if}
  </div>
{/if}

<style>
  .right-sidebar {
    position: relative;
    background-color: var(--nc-level-1);
    color: var(--nc-fg-muted);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    border-radius: 12px;
    margin-right: 4px;
  }
</style>