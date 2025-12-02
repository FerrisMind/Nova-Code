<script lang="ts">
  // src/lib/settings/controls/SelectControl.svelte
  // ----------------------------------------------------------------------------
  // Обёртка над shadcn-svelte Select для технических настроек.
  //
  // Использование:
  // - Для настроек с множеством опций (wordWrap, lineNumbers, etc.)
  // - Dropdown вместо карточек для компактности
  //
  // API совместим с другими контролами (definition, on:change)
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import * as Select from '$lib/components/ui/select';
  import type {
    SettingDefinition,
    SettingId,
    SettingValue
  } from '$lib/settings/types';

  // ---------------------------------------------------------------------------
  // Типы
  // ---------------------------------------------------------------------------

  type SettingChangeSource = 'user' | 'profile' | 'quickAction' | 'command';

  interface SettingChangeMeta {
    settingId: SettingId;
    source: SettingChangeSource;
  }

  interface SelectOption {
    value: string;
    label: string;
  }

  interface SelectControlProps {
    definition: SettingDefinition;
    options: SelectOption[];
    value?: SettingValue;
    onChange?: (next: SettingValue, meta: SettingChangeMeta) => void;
    disabled?: boolean;
    placeholder?: string;
  }

  const dispatch = createEventDispatcher<{
    change: { value: SettingValue; meta: SettingChangeMeta };
  }>();

  let {
    definition,
    options,
    value = undefined,
    onChange = undefined,
    disabled = false,
    placeholder = 'Select...'
  }: SelectControlProps = $props();

  // ---------------------------------------------------------------------------
  // Состояние
  // ---------------------------------------------------------------------------

  // Получаем текущее значение
  const getCurrentValue = (): string => {
    if (value !== undefined) return String(value);
    try {
      return String(definition.get());
    } catch {
      return '';
    }
  };

  let selectedValue = $state(getCurrentValue());

  // Синхронизация при изменении value извне
  $effect(() => {
    selectedValue = getCurrentValue();
  });

  // Получаем label для текущего значения
  const getSelectedLabel = (): string => {
    const option = options.find(opt => opt.value === selectedValue);
    return option?.label ?? selectedValue;
  };

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  function handleValueChange(newValue: string | undefined) {
    if (!newValue || disabled) return;
    
    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source: 'user'
    };

    if (onChange) {
      onChange(newValue, meta);
    } else {
      definition.set(newValue as SettingValue);
    }

    selectedValue = newValue;
    dispatch('change', { value: newValue, meta });
  }
</script>

<Select.Root 
  type="single"
  value={selectedValue}
  onValueChange={handleValueChange}
  {disabled}
>
  <Select.Trigger class="select-trigger">
    {getSelectedLabel()}
  </Select.Trigger>
  
  <Select.Content class="select-content">
    {#each options as option (option.value)}
      <Select.Item value={option.value} class="select-item">
        {option.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>

<style>
  :global(.select-trigger) {
    min-width: 140px;
    padding: var(--settings-space-sm, 8px) var(--settings-space-sm, 12px);
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-md, 8px);
    background: var(--nc-level-1, hsl(var(--background)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
    font-size: var(--settings-font-size-sm, 13px);
    cursor: pointer;
    transition: border-color var(--settings-transition-fast, 150ms);
  }

  :global(.select-trigger:hover:not(:disabled)) {
    border-color: var(--nc-level-4, hsl(var(--border)));
  }

  :global(.select-trigger:focus) {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
    outline: none;
  }

  :global(.select-trigger:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.select-content) {
    background: var(--nc-level-0, hsl(var(--popover)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-md, 8px);
    box-shadow: var(--settings-shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
    padding: var(--settings-space-xs, 4px);
    min-width: 140px;
    z-index: 50;
  }

  :global(.select-item) {
    padding: var(--settings-space-sm, 8px) var(--settings-space-sm, 12px);
    border-radius: var(--settings-radius-sm, 6px);
    font-size: var(--settings-font-size-sm, 13px);
    color: var(--nc-palette-text, hsl(var(--foreground)));
    cursor: pointer;
    transition: background-color var(--settings-transition-fast, 150ms);
  }

  :global(.select-item:hover) {
    background: var(--nc-level-2, hsl(var(--accent)));
  }

  :global(.select-item[data-highlighted]) {
    background: var(--nc-level-2, hsl(var(--accent)));
    outline: none;
  }

  :global(.select-item[data-selected]) {
    background: hsl(var(--settings-primary, 217 91% 60%) / 0.1);
    color: hsl(var(--settings-primary, 217 91% 60%));
    font-weight: 500;
  }
</style>

