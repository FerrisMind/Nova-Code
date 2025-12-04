<script lang="ts">
  // src/lib/settings/controls/SaveIndicator.svelte
  // ----------------------------------------------------------------------------
  // Компонент индикатора сохранения "✓ Сохранено".
  // 
  // Поведение:
  // - Появляется с анимацией fade-in (200ms)
  // - Держится указанное время (по умолчанию 2000ms)
  // - Исчезает с анимацией fade-out (300ms)
  // 
  // Использование:
  // - Передать `visible={true}` для показа индикатора
  // - Компонент автоматически скроется через `duration` мс
  // - Можно передать кастомный текст через `text`
  // ----------------------------------------------------------------------------

  import { Check } from "@lucide/svelte";

  interface SaveIndicatorProps {
    /** Показывать индикатор */
    visible?: boolean;
    /** Текст индикатора */
    text?: string;
    /** Время показа в мс (после него начнётся fade-out) */
    duration?: number;
    /** Callback после полного скрытия */
    onHide?: () => void;
    /** Компактный режим */
    compact?: boolean;
  }

  let {
    visible = false,
    text = "Сохранено",
    duration = 2000,
    onHide = undefined,
    compact = false
  }: SaveIndicatorProps = $props();

  // Состояние анимации: 'entering' | 'visible' | 'exiting' | 'hidden'
  let animationState = $state<'entering' | 'visible' | 'exiting' | 'hidden'>('hidden');
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Реакция на изменение visible
  $effect(() => {
    if (visible) {
      // Начинаем показ
      animationState = 'entering';
      
      // Через 200ms (время анимации входа) переходим в visible
      setTimeout(() => {
        animationState = 'visible';
      }, 200);

      // Через duration начинаем скрытие
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        animationState = 'exiting';
        
        // Через 300ms (время анимации выхода) полностью скрываем
        setTimeout(() => {
          animationState = 'hidden';
          onHide?.();
        }, 300);
      }, duration);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });

  // Определяем CSS класс анимации
  const getAnimationClass = () => {
    switch (animationState) {
      case 'entering':
      case 'visible':
        return 'save-indicator-enter';
      case 'exiting':
        return 'save-indicator-exit';
      default:
        return '';
    }
  };

  // Не рендерим если полностью скрыт
  const shouldRender = () => animationState !== 'hidden';
</script>

{#if shouldRender()}
  <span 
    class="save-indicator {getAnimationClass()} {compact ? 'compact' : ''}"
    aria-live="polite"
    role="status"
  >
    <Check class={`save-indicator-icon ${compact ? 'compact' : ''}`} />
    <span class="save-indicator-text">{text}</span>
  </span>
{/if}

<style>
  .save-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: var(--settings-radius-sm, 6px);
    background-color: hsl(var(--settings-success, 160 84% 39%) / 0.15);
    color: hsl(var(--settings-success, 160 84% 39%));
    font-size: var(--settings-font-size-xs, 11px);
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
  }

  .save-indicator.compact {
    padding: 2px 6px;
    gap: 3px;
    font-size: 10px;
  }

  .save-indicator-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  .save-indicator-icon.compact {
    width: 10px;
    height: 10px;
  }

  .save-indicator-text {
    line-height: 1;
  }

  /* Анимации определены в app.css */
</style>


