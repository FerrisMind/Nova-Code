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
  <Select.Trigger>
    {getSelectedLabel()}
  </Select.Trigger>
  
  <Select.Content>
    {#each options as option (option.value)}
      <Select.Item value={option.value}>
        {option.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>

