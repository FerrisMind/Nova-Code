<script lang="ts">
  // src/lib/settings/controls/RangeInput.svelte
  // ----------------------------------------------------------------------------
  // Обёртка для shadcn-svelte Slider с number input, сохраняет оригинальный API.
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from "svelte";
  import { Slider } from "$lib/components/ui/slider";
  import type {
    SettingDefinition,
    SettingId,
    SettingValue,
  } from "$lib/settings/types";

  type SettingChangeSource = "user" | "profile" | "quickAction" | "command";

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

  let {
    definition,
    value = undefined,
    onChange = undefined,
    min,
    max,
    step = 1,
    disabled = false,
    showScale = false,
    compact = false,
    id = "",
    idPrefix = "setting-range",
  }: RangeInputProps = $props();

  if (min === undefined || max === undefined) {
    throw new Error("RangeInput requires explicit min and max props.");
  }

  const resolveId = () => {
    if (id) return id;
    return `${idPrefix}-${definition.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  };

  const normalizeNumber = (raw: unknown): number => {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
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

  let sliderValue = $state(currentNumber());
  let inputBuffer = $state(String(currentNumber()));

  const syncFromCurrent = () => {
    const current = currentNumber();
    sliderValue = current;
    inputBuffer = String(current);
  };

  // Синхронизация при изменении value
  $effect(() => {
    syncFromCurrent();
  });

  const commitValue = (
    nextRaw: unknown,
    source: SettingChangeSource = "user",
  ) => {
    const parsed = normalizeNumber(nextRaw);
    const clamped = clamp(applyStep(parsed));
    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source,
    };

    if (onChange) {
      onChange(clamped, meta);
    } else {
      definition.set(clamped as SettingValue);
    }

    sliderValue = clamped;
    inputBuffer = String(clamped);
    dispatch("change", { value: clamped, meta });
  };

  const handleSliderChange = (val: number | number[]) => {
    if (disabled) return;
    const next = Array.isArray(val) ? val[0] : val;
    commitValue(next, "user");
  };

  const handleNumberInput = (event: Event) => {
    if (disabled) return;
    const target = event.currentTarget as HTMLInputElement;
    inputBuffer = target.value;
  };

  const handleNumberBlur = () => {
    if (disabled) {
      syncFromCurrent();
      return;
    }
    commitValue(inputBuffer, "user");
  };

  const handleNumberKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!disabled) {
        commitValue(inputBuffer, "user");
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      syncFromCurrent();
    }
  };
</script>

<div
  class="nc-range-root {compact ? 'compact' : ''} {disabled ? 'disabled' : ''}"
>
  <div class="nc-range-slider-wrap">
    <Slider
      type="single"
      value={sliderValue}
      {min}
      {max}
      {step}
      {disabled}
      onValueChange={handleSliderChange}
      aria-label={definition.label}
      class="nc-slider-custom"
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
      {min}
      {max}
      {step}
      {disabled}
      value={inputBuffer}
      oninput={handleNumberInput}
      onblur={handleNumberBlur}
      onkeydown={handleNumberKeydown}
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

  :global(.nc-slider-custom) {
    width: 100%;
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
