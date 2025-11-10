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
  import { toggleLeftSidebar } from '../lib/stores/layout/layoutStore';
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

    // Мэппинг строго через утвержденные палитры:
    // - backgroundPrimary → базовый фон;
    // - backgroundVariants → уровни вложенности.
    const [level0, level1, level3, level5] = palette.backgroundVariants;
    const textColor = palette.textColor;

    const root = document.documentElement;

    // Установить data-theme для глобальных селекторов/devicon.
    root.setAttribute('data-theme', state.mode);

    // Базовые уровни яркости (palette → CSS custom properties).
    root.style.setProperty('--nc-level-0', level0); // Base / shell
    root.style.setProperty('--nc-level-1', level1 ?? level0);
    root.style.setProperty('--nc-level-3', level3 ?? level1 ?? level0);
    root.style.setProperty('--nc-level-5', level5 ?? level3 ?? level1 ?? level0);

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

  // Применить цвета при монтировании и при изменении темы
  onMount(() => {
    // Инициализация темы
    const currentState = theme.getState();
    themeState = currentState;
    applyThemeColors(currentState);

    const unsubscribeTheme = theme.subscribe((newState) => {
      themeState = newState;
      applyThemeColors(newState);
    });

    // Инициализация базовых команд (идемпотентна).
    initDefaultCommands();

    // Глобальные хоткеи workbench-уровня:
    // - Ctrl+B: toggle left sidebar (VS Code-like) — уже использовался.
    // - F1 / Ctrl+Shift+P / Cmd+Shift+P: открыть Command Palette.
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+B — переключение левого сайдбара.
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleLeftSidebar();
        return;
      }

      // F1 — открыть палитру команд.
      if (e.key === 'F1') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Ctrl+Shift+P / Cmd+Shift+P — открыть палитру команд.
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
</script>

<div class={`nova-root theme-${themeState.mode}`}>
  <Titlebar />

  <div class="nova-main">
    <ActivityBar />

    <div class="nova-center">
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
  }

  .nova-editor-region {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    background-color: var(--nc-tab-bg-active);
    border-left: 1px solid var(--nc-border-subtle);
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
  }

  .nova-editor-stack > :global(.editor-area-root) {
    flex: 1;
    min-height: 0;
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
    --nc-accent: #3b82f6;
    --nc-accent-soft: rgba(59, 130, 246, 0.18);
    --nc-highlight: rgba(59, 130, 246, 0.55);
    --nc-highlight-subtle: rgba(59, 130, 246, 0.12);
    --nc-tab-bg-active: var(--nc-level-5);
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
    --nc-accent: #2563eb;
    --nc-accent-soft: rgba(37, 99, 235, 0.12);
    --nc-highlight: rgba(37, 99, 235, 0.16);
    --nc-highlight-subtle: rgba(37, 99, 235, 0.08);
    --nc-tab-bg-active: var(--nc-level-5);
    --nc-activity-bg: var(--nc-level-0);
  }

  /* Глобальное правило: все отступы/размеры кратны 4px. */
  :global(html),
  :global(body),
  :global(.nova-root),
  :global(.nova-root *) {
    box-sizing: border-box;
  }
</style>
