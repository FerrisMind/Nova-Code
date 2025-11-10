<script lang="ts">
  // src/lib/settings/controls/RangeInput.svelte
  // ----------------------------------------------------------------------------
  // Комбинированный слайдер + числовой input для number-настроек.
  //
  // Реализует контракт из [`controls.api.md`](src/lib/settings/controls/controls.api.md:1):
  // - работает поверх SettingDefinition<number>;
  // - использует только definition.get()/set() или переданный onChange;
  // - без заглушек, без обращения к глобальным сторам напрямую;
  // - минималистичный, аккуратный UI с плавными анимациями.
  //
  // Архитектура и стили синхронизированы с актуальными практиками Svelte 5
  // (подтверждено через Context7 + официальную документацию).
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import type { SettingDefinition, SettingId, SettingValue } from '$lib/settings/types';

  type SettingChangeSource = 'user' | 'profile' | 'quickAction' | 'command';

  interface SettingChangeMeta {
    settingId: SettingId;
    source: SettingChangeSource;
  }

  interface RangeInputProps {
    definition: SettingDefinition;
    value?: number | SettingValue;
    onChange?: (next: number, meta: SettingChangeMeta) => void;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
    showScale?: boolean;
    compact?: boolean;
    id?: string;
    idPrefix?: string;
  }

  const dispatch = createEventDispatcher<{
    change: { value: number; meta: SettingChangeMeta };
  }>();

  export let definition: RangeInputProps['definition'];
  export let value: RangeInputProps['value'] = undefined;
  export let onChange: RangeInputProps['onChange'] = undefined;
  export let min: RangeInputProps['min'];
  export let max: RangeInputProps['max'];
  export let step: RangeInputProps['step'] = 1;
  export let disabled: RangeInputProps['disabled'] = false;
  export let showScale: RangeInputProps['showScale'] = false;
  export let compact: RangeInputProps['compact'] = false;
  export let id: RangeInputProps['id'] = '';
  export let idPrefix: RangeInputProps['idPrefix'] = 'setting-range';

  if (min === undefined || max === undefined) {
    // Строгий контракт: компонент требует явных границ,
    // чтобы избежать неявного поведения.
    throw new Error('RangeInput requires explicit min and max props.');
  }

  const resolveId = () => {
    if (id) return id;
    return `${idPrefix}-${definition.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  };

  const normalizeNumber = (raw: unknown): number => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const parsed = Number(String(raw).trim());
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const clamp = (num: number): number => {
    if (Number.isNaN(num)) return currentNumber();
    if (num < min) return min;
    if (num > max) return max;
    return num;
  };

  const applyStep = (num: number): number => {
    if (!step || step <= 0) return num;
    const count = Math.round((num - min) / step);
    return min + count * step;
  };

  const currentNumber = (): number => {
    if (value !== undefined) {
      const v = normalizeNumber(value);
      return Number.isNaN(v) ? min : clamp(v);
    }
    try {
      const v = normalizeNumber(definition.get());
      return Number.isNaN(v) ? min : clamp(v);
    } catch {
      return min;
    }
  };

  let inputBuffer: string = String(currentNumber());

  const syncBufferFromCurrent = () => {
    inputBuffer = String(currentNumber());
  };

  const commitValue = (nextRaw: unknown, source: SettingChangeSource = 'user') => {
    const parsed = normalizeNumber(nextRaw);
    const clamped = clamp(applyStep(parsed));
    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source
    };

    if (onChange) {
      onChange(clamped, meta);
    } else {
      definition.set(clamped as SettingValue);
    }

    inputBuffer = String(clamped);
    dispatch('change', { value: clamped, meta });
  };

  const handleSliderInput = (event: Event) => {
    if (disabled) return;
    const target = event.currentTarget as HTMLInputElement;
    commitValue(target.value, 'user');
  };

  const handleNumberInput = (event: Event) => {
    if (disabled) return;
    const target = event.currentTarget as HTMLInputElement;
    inputBuffer = target.value;
  };

  const handleNumberBlur = () => {
    if (disabled) {
      syncBufferFromCurrent();
      return;
    }
    commitValue(inputBuffer, 'user');
  };

  const handleNumberKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!disabled) {
        commitValue(inputBuffer, 'user');
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      syncBufferFromCurrent();
    }
  };

  // Обновляем буфер, если source-of-truth изменился извне.
  $: syncBufferFromCurrent();
</script>

<div class="nc-range-root {compact ? 'compact' : ''} {disabled ? 'disabled' : ''}">
  <div class="nc-range-slider-wrap">
    <input
      id={resolveId()}
      type="range"
      min={min}
      max={max}
      step={step}
      value={currentNumber()}
      class="nc-range-slider"
      aria-label={definition.label}
      disabled={disabled}
      on:input={handleSliderInput}
    />
    {#if showScale}
      <div class="nc-range-scale">
        <span class="tick left">{min}</span>
        <span class="tick right">{max}</span>
      </div>
    {/if}
  </div>

  <div class="nc-range-input-wrap">
    <input
      class="nc-range-input"
      type="number"
      min={min}
      max={max}
      step={step}
      {disabled}
      bind:value={inputBuffer}
      on:input={handleNumberInput}
      on:blur={handleNumberBlur}
      on:keydown={handleNumberKeydown}
      aria-label={definition.label}
    />
  </div>
</div>

<style>
  .nc-range-root {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    color: var(--nc-palette-text);
  }

  .nc-range-root.compact {
    gap: 4px;
  }

  .nc-range-root.disabled {
    opacity: 0.5;
  }

  .nc-range-slider-wrap {
    position: relative;
    flex: 1;
    min-width: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .nc-range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 4px;
    background: var(--nc-level-2);
    outline: none;
    transition:
      background-color 0.12s ease;
  }

  .nc-range-root.disabled .nc-range-slider {
    cursor: default;
  }

  .nc-range-slider:hover:not(:disabled) {
    background: var(--nc-level-3);
  }

  .nc-range-slider:focus-visible {
    background: var(--nc-level-3);
  }

  .nc-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 8px;
    background: var(--nc-level-4);
    cursor: pointer;
    transition:
      transform 0.12s ease,
      background 0.12s ease;
  }

  .nc-range-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 8px;
    border: none;
    background: var(--nc-level-4);
    cursor: pointer;
  }

  .nc-range-slider:hover::-webkit-slider-thumb {
    transform: scale(1.1);
    background: var(--nc-level-5);
  }

  .nc-range-slider:hover::-moz-range-thumb {
    transform: scale(1.1);
    background: var(--nc-level-5);
  }

  .nc-range-slider:focus::-webkit-slider-thumb {
    transform: scale(1.15);
    background: var(--nc-level-5);
  }

  .nc-range-slider:focus::-moz-range-thumb {
    transform: scale(1.15);
  }

  .nc-range-scale {
    position: absolute;
    inset: 100% 0 auto 0;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: var(--nc-fg-muted, #9ca3af);
    padding-top: 4px;
    pointer-events: none;
  }

  .nc-range-scale .tick.left,
  .nc-range-scale .tick.right {
    opacity: 0.85;
  }

  .nc-range-input-wrap {
    width: 52px;
    flex-shrink: 0;
  }

  .nc-range-root.compact .nc-range-input-wrap {
    width: 48px;
  }

  .nc-range-input {
    width: 100%;
    padding: 4px;
    border-radius: 8px;
    border: 1px solid var(--nc-palette-border);
    background-color: var(--nc-level-1);
    color: var(--nc-palette-text);
    font-size: 12px;
    line-height: 1.2;
    box-sizing: border-box;
    outline: none;
    transition:
      border-color 0.12s ease,
      background-color 0.12s ease;
  }

  .nc-range-input:focus-visible {
    border-color: var(--nc-level-5);
    background-color: var(--nc-level-2);
  }

  .nc-range-input:hover:not(:disabled) {
    border-color: var(--nc-level-4);
  }
</style>