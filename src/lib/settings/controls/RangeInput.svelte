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
    gap: 6px;
    padding: 2px 0;
    color: var(--nc-fg);
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
    border-radius: 999px;
    background: linear-gradient(
      to right,
      rgba(79, 70, 229, 0.85),
      rgba(129, 140, 248, 0.55)
    );
    outline: none;
    transition:
      box-shadow 0.18s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      background-color 0.18s cubic-bezier(0.33, 0.02, 0.11, 0.99);
    box-shadow:
      0 0 0 1px rgba(15, 23, 42, 0.9),
      0 4px 8px rgba(15, 23, 42, 0.85);
    background-color: var(--nc-bg-subtle, #020817);
  }

  .nc-range-root.disabled .nc-range-slider {
    cursor: default;
  }

  .nc-range-slider:hover:not(:disabled) {
    box-shadow:
      0 0 0 1px rgba(79, 70, 229, 0.4),
      0 6px 12px rgba(15, 23, 42, 0.9);
  }

  .nc-range-slider:focus-visible {
    box-shadow:
      0 0 0 1px rgba(191, 219, 254, 0.9),
      0 0 16px rgba(129, 140, 248, 0.9);
  }

  .nc-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: radial-gradient(circle at 30% 30%, #eff6ff, #4f46e5);
    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.9),
      0 0 8px rgba(129, 140, 248, 0.7);
    cursor: pointer;
    transition:
      transform 0.18s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      box-shadow 0.18s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      background 0.18s cubic-bezier(0.33, 0.02, 0.11, 0.99);
  }

  .nc-range-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: none;
    background: radial-gradient(circle at 30% 30%, #eff6ff, #4f46e5);
    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.9),
      0 0 8px rgba(129, 140, 248, 0.7);
    cursor: pointer;
  }

  .nc-range-slider:hover::-webkit-slider-thumb {
    transform: scale(1.02);
    box-shadow:
      0 3px 8px rgba(15, 23, 42, 0.95),
      0 0 10px rgba(191, 219, 254, 0.9);
  }

  .nc-range-slider:hover::-moz-range-thumb {
    transform: scale(1.02);
  }

  .nc-range-scale {
    position: absolute;
    inset: 100% 0 auto 0;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: var(--nc-fg-muted, #9ca3af);
    padding-top: 1px;
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
    width: 46px;
  }

  .nc-range-input {
    width: 100%;
    padding: 2px 4px;
    border-radius: 6px;
    border: 1px solid var(--nc-border-subtle, rgba(75, 85, 99, 0.8));
    background-color: rgba(6, 8, 16, 0.98);
    color: var(--nc-fg, #e5e7eb);
    font-size: 9px;
    line-height: 1.2;
    box-sizing: border-box;
    outline: none;
    transition:
      border-color 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      box-shadow 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      background-color 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99);
  }

  .nc-range-input:focus-visible {
    border-color: var(--nc-accent, #4f46e5);
    box-shadow:
      0 0 0 1px rgba(79, 70, 229, 0.7),
      0 6px 16px rgba(15, 23, 42, 0.9);
    background-color: rgba(10, 16, 25, 1);
  }

  .nc-range-input:hover:not(:disabled) {
    border-color: rgba(148, 163, 253, 0.8);
  }
</style>