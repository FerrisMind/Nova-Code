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
  import Icon from '$lib/common/Icon.svelte';
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

  // Определяем нужны ли иконки (для theme.mode)
  const showIcons = () => definition.id === 'theme.mode';

</script>

<button
  type="button"
  class="nc-toggle-root {currentValue() ? 'on' : 'off'} {compact ? 'compact' : ''} {disabled ? 'disabled' : ''} {showIcons() ? 'with-icons' : ''}"
  id={resolveId()}
  aria-pressed={currentValue()}
  aria-label={definition.label}
  on:click={handleToggle}
  disabled={disabled}
>
  {#if showIcons()}
    <span class="nc-toggle-icon nc-toggle-icon-left">
      <Icon name="sun" size={compact ? 12 : 14} />
    </span>
  {/if}
  
  <span class="nc-toggle-track">
    <span class="nc-toggle-thumb"></span>
  </span>
  
  {#if showIcons()}
    <span class="nc-toggle-icon nc-toggle-icon-right">
      <Icon name="moon" size={compact ? 12 : 14} />
    </span>
  {/if}
</button>

<style>
  .nc-toggle-root {
    --nc-toggle-height: 20px;
    --nc-toggle-width: 36px;
    --nc-toggle-padding: 4px;
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
    --nc-toggle-width: 32px;
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
    border-radius: 12px;
    background-color: var(--nc-level-1);
    border: 1px solid var(--nc-palette-border);
    display: flex;
    align-items: center;
    transition:
      background-color var(--nc-toggle-duration) var(--nc-toggle-ease),
      border-color var(--nc-toggle-duration) var(--nc-toggle-ease);
  }

  .nc-toggle-thumb {
    width: calc(var(--nc-toggle-height) - var(--nc-toggle-padding) * 2 - 4px);
    height: calc(var(--nc-toggle-height) - var(--nc-toggle-padding) * 2 - 4px);
    border-radius: 8px;
    background: var(--nc-level-3);
    transform: translateX(0);
    transition:
      transform var(--nc-toggle-duration) var(--nc-toggle-ease),
      background var(--nc-toggle-duration) var(--nc-toggle-ease);
  }

  .nc-toggle-root.on .nc-toggle-track {
    background-color: var(--nc-level-3);
    border-color: var(--nc-level-4);
  }

  .nc-toggle-root.on .nc-toggle-thumb {
    transform: translateX(
      calc(var(--nc-toggle-width) - var(--nc-toggle-height))
    );
    background: var(--nc-level-5);
  }

  .nc-toggle-root.off .nc-toggle-track {
    background-color: var(--nc-level-1);
    border-color: var(--nc-palette-border);
  }

  .nc-toggle-root:hover:not(.disabled) .nc-toggle-track {
    background-color: var(--nc-level-2);
    border-color: var(--nc-level-3);
  }

  .nc-toggle-root:focus-visible:not(.disabled) .nc-toggle-track {
    border-color: var(--nc-level-4);
  }

  /* Иконки для theme.mode */
  .nc-toggle-root.with-icons {
    gap: 8px;
  }

  .nc-toggle-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--nc-palette-text);
    opacity: 0.5;
    transition: opacity var(--nc-toggle-duration) var(--nc-toggle-ease);
  }

  .nc-toggle-root.off .nc-toggle-icon-left {
    opacity: 1;
  }

  .nc-toggle-root.on .nc-toggle-icon-right {
    opacity: 1;
  }
</style>