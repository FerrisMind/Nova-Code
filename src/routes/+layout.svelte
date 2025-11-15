<script lang="ts">
  import { onMount } from 'svelte';
  import Titlebar from '../lib/layout/Titlebar.svelte';
  import ActivityBar from '../lib/layout/ActivityBar.svelte';
  import SideBar from '../lib/layout/SideBar.svelte';
  import RightSideBar from '../lib/layout/RightSideBar.svelte';
  import EditorTabs from '../lib/layout/EditorTabs.svelte';
  import EditorArea from '../lib/layout/EditorArea.svelte';
  import BottomPanel from '../lib/layout/BottomPanel.svelte';
  import StatusBar from '../lib/layout/StatusBar.svelte';
  import CommandPalette from '../lib/commands/CommandPalette.svelte';
  import { layoutState, toggleLeftSidebar, setRightSidebarWidth, setRightSidebarVisible } from '../lib/stores/layout/layoutStore';
  import { initDefaultCommands } from '../lib/commands/defaultCommands';
  import { openCommandPalette } from '../lib/stores/commandPaletteStore';

  import { theme, type ThemeState } from '../lib/stores/themeStore';
  import {
    getPaletteById,
    type ThemePaletteId
  } from '../lib/stores/THEME_PALETTES';

  // Для SvelteKit layout корректно принимаем children через $props (Svelte 5 runes, use context7).
  const { children } = $props();

  /**
   * Реактивное состояние темы и палитры.
   * Значение инициализируется фактическим состоянием стора в onMount.
   */
  let themeState = $state<ThemeState>({
    mode: 'dark',
    palette: 'dark-default'
  });

  // Right sidebar resizing state
  let isRightResizing = $state(false);
  let rightHideTimer: number | null = null;

  /**
   * Установить CSS-переменные для текущей темы и палитры
   * Структура уровней:
   * - Level 0: Базовый фон
   * - Level 1-2: Рабочая область/карточки (+8-10 pts)
   * - Level 3: Кнопки в обычном состоянии (+12-14 pts)
   * - Level 5: Hover-состояния (+14-16 pts)
   */
  const applyThemeColors = (state: ThemeState) => {
    const palette = getPaletteById(state.palette);
    const isLight = state.mode === 'light';

    // Мэппинг через уровни фона:
    // - backgroundLevels[0] → базовый фон;
    // - backgroundLevels[1-5] → уровни вложенности.
    const levels = palette.backgroundLevels;
    const textColor = palette.textColor;

    const root = document.documentElement;

    // Установить data-theme для глобальных селекторов/devicon.
    root.setAttribute('data-theme', state.mode);

    // Уровни фона (palette → CSS custom properties).
    root.style.setProperty('--nc-level-minus1', palette.backgroundLevelMinus1); // Level -1: Таббар
    root.style.setProperty('--nc-level-0', levels[0]); // Base / shell
    root.style.setProperty('--nc-level-1', levels[1]); // Рабочая область/карточки
    root.style.setProperty('--nc-level-2', levels[2]); // Рабочая область/карточки
    root.style.setProperty('--nc-level-3', levels[3]); // Кнопки обычные
    root.style.setProperty('--nc-level-4', levels[4]); // Hover
    root.style.setProperty('--nc-level-5', levels[5]); // Hover

    // Активный таб
    root.style.setProperty('--nc-tab-bg-active', levels[1]);

    // Текст в соответствии со спецификацией.
    root.style.setProperty('--nc-palette-text', textColor);

    // Границы:
    // Для согласованности используем фиксированные значения под тему, без выдуманных цветов.
    root.style.setProperty(
      '--nc-palette-border',
      isLight ? '#D0D0D0' : '#3A3A3A'
    );

    // CSS-класс для применения theme-dark / theme-light маппинга.
    document.documentElement.className = `theme-${state.mode}`;
  };

  // Apply colors when mounting and on theme change
  onMount(() => {
    // Theme initialization
    const currentState = theme.getState();
    themeState = currentState;
    applyThemeColors(currentState);

    const unsubscribeTheme = theme.subscribe((newState) => {
      themeState = newState;
      applyThemeColors(newState);
    });

    // Initialize base commands (idempotent).
    initDefaultCommands();

    // Global workbench hotkeys:
    // - Ctrl+B: toggle left sidebar (VS Code-like).
    // - F1 / Ctrl+Shift+P / Cmd+Shift+P: open Command Palette.
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+B — toggle left sidebar.
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleLeftSidebar();
        return;
      }

      // F1 — open command palette.
      if (e.key === 'F1') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Ctrl+Shift+P / Cmd+Shift+P — open command palette.
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        openCommandPalette();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      unsubscribeTheme();
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  // Right sidebar resize handler
  const MIN_RIGHT_WIDTH = 220;
  const MAX_RIGHT_WIDTH_RATIO = 0.625;

  const handleRightSidebarResize = (event: MouseEvent) => {
    event.preventDefault();
    isRightResizing = true;

    const startX = event.clientX;
    const startWidth = $layoutState.rightSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isRightResizing) return;
      const delta = startX - e.clientX;
      const proposedWidth = startWidth + delta;
      if (proposedWidth < MIN_RIGHT_WIDTH) {
        // Если ширина меньше минимальной, запускаем таймер на скрытие с задержкой
        if (rightHideTimer === null) {
          rightHideTimer = window.setTimeout(() => {
            setRightSidebarVisible(false);
            rightHideTimer = null;
          }, 500);
        }
      } else {
        // Если ширина достаточная, отменяем таймер
        if (rightHideTimer !== null) {
          clearTimeout(rightHideTimer);
          rightHideTimer = null;
        }
        const maxWidth = Math.floor(window.innerWidth * MAX_RIGHT_WIDTH_RATIO);
        const next = Math.min(maxWidth, proposedWidth);
        setRightSidebarWidth(next);
      }
    };

    const onMouseUp = () => {
      if (!isRightResizing) return;
      isRightResizing = false;
      // Очищаем таймер при отпускании мыши
      if (rightHideTimer !== null) {
        clearTimeout(rightHideTimer);
        rightHideTimer = null;
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
</script>

<div class={`nova-root theme-${themeState.mode}`}>
  <Titlebar />

  <div class="nova-main">
    <ActivityBar />

    <div class="nova-center" class:sidebar-hidden={!$layoutState.leftSidebarVisible}>
      <SideBar />

      <!-- EditorRegion + BottomPanel делят вертикаль; справа опциональный RightSideBar -->
      <div class="nova-editor-region">
        <EditorTabs />
        <div class="nova-editor-stack">
          <EditorArea />
          <BottomPanel />
        </div>
        {@render children?.()}
      </div>

      <!-- Resize handle для правой панели (между editor region и правой панелью) -->
      {#if $layoutState.rightSidebarVisible}
        <div
          class="right-resize-handle"
          class:resizing={isRightResizing}
          role="button"
          aria-label="Resize right sidebar"
          tabindex="0"
          onmousedown={handleRightSidebarResize}
        ></div>
      {/if}

      <!-- Правая боковая панель (опциональная, управляется layoutStore) -->
      <RightSideBar />
    </div>
  </div>

  <StatusBar />

  <!-- Command Palette overlay (inspired by VS Code Command Palette).
       Рендерится рядом с корневым layout, чтобы перекрывать весь UI. -->
  <CommandPalette />
</div>

<style>
  .nova-root {
    /* Строгая 4px-сетка для всего UI */
    --grid: 4px;

    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: var(--nc-bg);
    color: var(--nc-fg);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', -system-ui, sans-serif;
    font-size: 13px;                      /* базовый размер: 3.25 * 4px ~ комфортно */
    line-height: 1.5;
  }

  .nova-main {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
  }

  .nova-center {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .nova-center.sidebar-hidden .nova-editor-region {
    margin-left: 0;
  }

  .nova-editor-region {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    background-color: var(--nc-tab-bg-active);
    border-radius: 12px;
    margin: 0 0 0 4px;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  /* Стек редактора + нижней панели:
     - EditorArea занимает всё доступное пространство.
     - BottomPanel (если видима) съедает высоту снизу.
     - Ширина стека = ширина editor region => панель совпадает по ширине с кодом. */
  .nova-editor-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    gap: 4px; /* 1 * 4px spacing between editor and bottom panel */
    background-color: var(--nc-level-0);
  }

  .nova-editor-stack > :global(.editor-area-root) {
    flex: 1;
    min-height: 0;
  }

  /* Right sidebar resize handle */
  .right-resize-handle {
    flex-shrink: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background-color: transparent;
    border-radius: 5px;
    z-index: 1;
  }

  .right-resize-handle:hover,
  .right-resize-handle.resizing {
    background-color: rgba(128, 128, 128, 0.6);
  }

  .theme-dark {
    /* Уровни яркости палитры */
    --nc-bg: var(--nc-level-0, #1a1d2e);              /* Level 0: Базовый фон */
    --nc-bg-elevated: var(--nc-level-1, #1e2135);    /* Level 1: Рабочая область */
    --nc-bg-button: var(--nc-level-3, #24273a);      /* Level 3: Кнопки */
    --nc-bg-hover: var(--nc-level-5, #282d3e);       /* Level 5: Hover-состояния */
    
    --nc-fg: var(--nc-palette-text, #e8e8e8);
    --nc-fg-muted: #a8aab0;
    --nc-border-subtle: var(--nc-palette-border, #3a3a3a);
    --nc-tab-bg: var(--nc-level-0);
    
    /* Акцент остается фиксированным */
    --nc-accent: #6F9DFF;
    --nc-accent-soft: rgba(111, 157, 255, 0.18);
    --nc-highlight: rgba(111, 157, 255, 0.55);
    --nc-highlight-subtle: rgba(111, 157, 255, 0.12);
    --nc-tab-bg-active: var(--nc-level-1);
    --nc-activity-bg: var(--nc-level-0);
  }

  .theme-light {
    /* Уровни яркости палитры */
    --nc-bg: var(--nc-level-0, #f5f7fa);              /* Level 0: Базовый фон */
    --nc-bg-elevated: var(--nc-level-1, #f1f3f6);    /* Level 1: Рабочая область */
    --nc-bg-button: var(--nc-level-3, #e7eaef);      /* Level 3: Кнопки */
    --nc-bg-hover: var(--nc-level-5, #dfe3e9);       /* Level 5: Hover-состояния */
    
    --nc-fg: var(--nc-palette-text, #2E2E2E);
    --nc-fg-muted: #5a5a5a;
    --nc-border-subtle: var(--nc-palette-border, #d0d0d0);
    --nc-tab-bg: var(--nc-level-0);
    
    /* Акцент остается фиксированным */
    --nc-accent: #4F6FAF;
    --nc-accent-soft: rgba(79, 111, 175, 0.12);
    --nc-highlight: rgba(79, 111, 175, 0.16);
    --nc-highlight-subtle: rgba(79, 111, 175, 0.08);
    --nc-tab-bg-active: var(--nc-level-1);
    --nc-activity-bg: var(--nc-level-0);
  }

  /* Глобальное правило: все отступы/размеры кратны 4px. */
  :global(html),
  :global(body),
  :global(.nova-root),
  :global(.nova-root *) {
    box-sizing: border-box;
  }

  /* Глобальные стили для скроллбаров */
  :global(*::-webkit-scrollbar) {
    width: 10px;
    height: 10px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(*::-webkit-scrollbar-thumb) {
    background-color: rgba(128, 128, 128, 0.4);
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background-color: rgba(128, 128, 128, 0.6);
  }

  :global(*::-webkit-scrollbar-thumb:active) {
    background-color: rgba(128, 128, 128, 0.8);
  }

  :global(*::-webkit-scrollbar-corner) {
    background: transparent;
  }

  /* Firefox scrollbar styles */
  :global(*) {
    scrollbar-width: thin;
    scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
  }

  /* Для темной темы - более светлые скроллбары */
  :global(.theme-dark *::-webkit-scrollbar-thumb) {
    background-color: rgba(160, 160, 160, 0.3);
  }

  :global(.theme-dark *::-webkit-scrollbar-thumb:hover) {
    background-color: rgba(160, 160, 160, 0.5);
  }

  :global(.theme-dark *::-webkit-scrollbar-thumb:active) {
    background-color: rgba(160, 160, 160, 0.7);
  }

  /* Для светлой темы - более темные скроллбары */
  :global(.theme-light *::-webkit-scrollbar-thumb) {
    background-color: rgba(80, 80, 80, 0.3);
  }

  :global(.theme-light *::-webkit-scrollbar-thumb:hover) {
    background-color: rgba(80, 80, 80, 0.5);
  }

  :global(.theme-light *::-webkit-scrollbar-thumb:active) {
    background-color: rgba(80, 80, 80, 0.7);
  }

  /* Monaco Editor специфичные стили для скроллбаров */
  :global(.monaco-scrollable-element > .scrollbar) {
    background: transparent !important;
  }

  :global(.monaco-scrollable-element > .scrollbar > .slider) {
    background: rgba(128, 128, 128, 0.4) !important;
    border-radius: 5px !important;
  }

  :global(.monaco-scrollable-element > .scrollbar > .slider:hover) {
    background: rgba(128, 128, 128, 0.6) !important;
  }

  :global(.monaco-scrollable-element > .scrollbar > .slider:active) {
    background: rgba(128, 128, 128, 0.8) !important;
  }

  :global(.theme-dark .monaco-scrollable-element > .scrollbar > .slider) {
    background: rgba(160, 160, 160, 0.3) !important;
  }

  :global(.theme-dark .monaco-scrollable-element > .scrollbar > .slider:hover) {
    background: rgba(160, 160, 160, 0.5) !important;
  }

  :global(.theme-dark .monaco-scrollable-element > .scrollbar > .slider:active) {
    background: rgba(160, 160, 160, 0.7) !important;
  }

  :global(.theme-light .monaco-scrollable-element > .scrollbar > .slider) {
    background: rgba(80, 80, 80, 0.3) !important;
  }

  :global(.theme-light .monaco-scrollable-element > .scrollbar > .slider:hover) {
    background: rgba(80, 80, 80, 0.5) !important;
  }

  :global(.theme-light .monaco-scrollable-element > .scrollbar > .slider:active) {
    background: rgba(80, 80, 80, 0.7) !important;
  }
</style>
