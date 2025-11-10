<script lang="ts">
  // src/lib/settings/controls/Toggle.svelte
  // ----------------------------------------------------------------------------
  // Универсальный переключатель для boolean-настроек.
  //
  // Следует контракту из [`controls.api.md`](src/lib/settings/controls/controls.api.md:1)
  // и использует только SettingDefinition.get()/set() или переданный onChange.
  // Архитектура и стили опираются на актуальные практики Svelte 5 и дизайн-токены
  // проекта (валидировано по Context7 + официальной документации Svelte/Tauri).
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import type {
    SettingDefinition,
    SettingId,
    SettingValue
  } from '$lib/settings/types';

  type SettingChangeSource = 'user' | 'profile' | 'quickAction' | 'command';

  interface SettingChangeMeta {
    settingId: SettingId;
    source: SettingChangeSource;
  }

  interface ToggleProps {
    definition: SettingDefinition;
    value?: boolean | SettingValue;
    onChange?: (next: boolean, meta: SettingChangeMeta) => void;
    disabled?: boolean;
    compact?: boolean;
    id?: string;
    idPrefix?: string;
  }

  const dispatch = createEventDispatcher<{
    change: { value: boolean; meta: SettingChangeMeta };
  }>();

  export let definition: ToggleProps['definition'];
  export let value: ToggleProps['value'] = undefined;
  export let onChange: ToggleProps['onChange'] = undefined;
  export let disabled: ToggleProps['disabled'] = false;
  export let compact: ToggleProps['compact'] = false;
  export let id: ToggleProps['id'] = '';
  export let idPrefix: ToggleProps['idPrefix'] = 'setting-toggle';

  const resolveId = () => {
    if (id) return id;
    return `${idPrefix}-${definition.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  };

  const normalizeToBoolean = (raw: unknown): boolean => {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw !== 0;
    if (typeof raw === 'string') {
      const v = raw.toLowerCase().trim();
      if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
      if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
    }
    return false;
  };

  const currentValue = (): boolean => {
    if (value !== undefined) {
      return normalizeToBoolean(value);
    }
    try {
      return normalizeToBoolean(definition.get());
    } catch {
      return false;
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    const current = currentValue();
    const next = !current;

    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source: 'user'
    };

    if (onChange) {
      onChange(next, meta);
    } else {
      definition.set(next as SettingValue);
    }

    dispatch('change', { value: next, meta });
  };
</script>

<button
  type="button"
  class="nc-toggle-root {currentValue() ? 'on' : 'off'} {compact ? 'compact' : ''} {disabled ? 'disabled' : ''}"
  id={resolveId()}
  aria-pressed={currentValue()}
  aria-label={definition.label}
  on:click={handleToggle}
  disabled={disabled}
>
  <span class="nc-toggle-track">
    <span class="nc-toggle-thumb"></span>
  </span>
</button>

<style>
  .nc-toggle-root {
    --nc-toggle-height: 18px;
    --nc-toggle-width: 32px;
    --nc-toggle-padding: 2px;
    --nc-toggle-duration: 0.22s;
    --nc-toggle-ease: cubic-bezier(0.33, 0.02, 0.11, 0.99);

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
  }

  .nc-toggle-root.compact {
    --nc-toggle-height: 16px;
    --nc-toggle-width: 28px;
  }

  .nc-toggle-root.disabled {
    cursor: default;
    opacity: 0.5;
  }

  .nc-toggle-track {
    width: var(--nc-toggle-width);
    height: var(--nc-toggle-height);
    padding: var(--nc-toggle-padding);
    box-sizing: border-box;
    border-radius: 999px;
    background-color: var(--nc-bg-subtle, rgba(15, 23, 42, 0.9));
    border: 1px solid var(--nc-border-subtle, rgba(148, 163, 253, 0.25));
    display: flex;
    align-items: center;
    transition:
      background-color var(--nc-toggle-duration) var(--nc-toggle-ease),
      border-color var(--nc-toggle-duration) var(--nc-toggle-ease),
      box-shadow var(--nc-toggle-duration) var(--nc-toggle-ease),
      transform var(--nc-toggle-duration) var(--nc-toggle-ease);
    box-shadow:
      0 0 0 0 rgba(129, 140, 248, 0),
      inset 0 0 0 0 rgba(79, 70, 229, 0.4);
    backdrop-filter: blur(6px);
  }

  .nc-toggle-thumb {
    width: calc(var(--nc-toggle-height) - var(--nc-toggle-padding) * 2 - 4px);
    height: calc(var(--nc-toggle-height) - var(--nc-toggle-padding) * 2 - 4px);
    border-radius: 999px;
    background: radial-gradient(circle at 30% 30%, #e5e7ff, #6366f1);
    box-shadow:
      0 2px 4px rgba(15, 23, 42, 0.6),
      0 0 0 0 rgba(129, 140, 248, 0.25);
    transform: translateX(0);
    transition:
      transform var(--nc-toggle-duration) var(--nc-toggle-ease),
      box-shadow var(--nc-toggle-duration) var(--nc-toggle-ease),
      background var(--nc-toggle-duration) var(--nc-toggle-ease);
  }

  .nc-toggle-root.on .nc-toggle-track {
    background-color: var(--nc-accent, #4f46e5);
    border-color: var(--nc-accent, #4f46e5);
    box-shadow:
      0 0 10px rgba(79, 70, 229, 0.55),
      inset 0 0 0 0 rgba(15, 23, 42, 0.5);
  }

  .nc-toggle-root.on .nc-toggle-thumb {
    transform: translateX(
      calc(var(--nc-toggle-width) - var(--nc-toggle-height))
    );
    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.85),
      0 0 10px rgba(191, 219, 254, 0.6);
    background: radial-gradient(circle at 30% 30%, #eef2ff, #818cf8);
  }

  .nc-toggle-root.off .nc-toggle-track {
    background-color: var(--nc-bg-subtle, rgba(9, 9, 11, 0.96));
    border-color: var(--nc-border-subtle, rgba(75, 85, 99, 0.65));
  }

  .nc-toggle-root:hover:not(.disabled) .nc-toggle-track {
    box-shadow:
      0 4px 10px rgba(15, 23, 42, 0.6),
      0 0 0 1px rgba(129, 140, 248, 0.16);
  }

  .nc-toggle-root:focus-visible:not(.disabled) .nc-toggle-track {
    box-shadow:
      0 0 0 1px rgba(191, 219, 254, 0.95),
      0 0 14px rgba(129, 140, 248, 0.9);
  }
</style>