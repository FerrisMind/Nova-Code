<script lang="ts">
  // src/lib/settings/controls/CardSelect.svelte
  // ----------------------------------------------------------------------------
  // Визуальный выбор из ограниченного набора вариантов через карточки.
  //
  // Контракт:
  // - Работает поверх SettingDefinition и options-пропа.
  // - Источник значения: value ?? definition.get().
  // - При выборе:
  //   - если onChange передан — делегирует ему;
  //   - иначе вызывает definition.set(next).
  // - Никаких заглушек, только реальный get/set.
  //
  // Реализация следует [`controls.api.md`](src/lib/settings/controls/controls.api.md:1)
  // и best practices Svelte 5 (подтверждено по Context7/официальной документации).
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import type {
    SettingDefinition,
    SettingId,
    SettingValue
  } from '$lib/settings/types';
  import Icon from '$lib/common/Icon.svelte';

  type SettingChangeSource = 'user' | 'profile' | 'quickAction' | 'command';

  type SettingChangeMeta = {
    settingId: SettingId;
    source: SettingChangeSource;
  };

  // Тип опций: используется только внутри файла; при необходимости
  // внешний код может описать совместимый тип самостоятельно.
  type CardSelectOption = {
  value: SettingValue;
  label: string;
  description?: string;
  icon?: string;
  badge?: string;
  // Необязательные поля для "color palette" режима:
  // Если заданы, карточка отрисует мини-превью палитры.
  backgroundColor?: string;
  textColor?: string;
};

  type CardSelectProps = {
    definition: SettingDefinition;
    options: CardSelectOption[];
    value?: SettingValue;
    onChange?: (next: SettingValue, meta: SettingChangeMeta) => void;
    disabled?: boolean;
    columns?: number;
    idPrefix?: string;
  };

  const dispatch = createEventDispatcher<{
    change: { value: SettingValue; meta: SettingChangeMeta };
    select: { value: SettingValue; meta: SettingChangeMeta };
  }>();

  export let definition: CardSelectProps['definition'];
  export let options: CardSelectProps['options'] = [];
  export let value: CardSelectProps['value'] = undefined;
  export let onChange: CardSelectProps['onChange'] = undefined;
  export let disabled: CardSelectProps['disabled'] = false;
  export let columns: CardSelectProps['columns'] = 0;
  export let idPrefix: CardSelectProps['idPrefix'] = 'setting-card';

  const current = (): SettingValue | undefined => {
    if (value !== undefined) return value;
    try {
      return definition.get();
    } catch {
      return undefined;
    }
  };

  const isActive = (opt: CardSelectOption): boolean => {
    return String(opt.value) === String(current());
  };

  const resolveCardId = (opt: CardSelectOption): string => {
    const base = `${idPrefix}-${definition.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const val = String(opt.value).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${base}-${val}`;
  };

  const selectOption = (opt: CardSelectOption) => {
    if (disabled) return;
    const next = opt.value;
    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source: 'user'
    };

    if (onChange) {
      onChange(next, meta);
    } else {
      definition.set(next);
    }

    dispatch('change', { value: next, meta });
    dispatch('select', { value: next, meta });
  };

  const handleKeydown = (event: KeyboardEvent, opt: CardSelectOption) => {
    if (disabled) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      selectOption(opt);
    }
  };

  const gridStyle = () => {
    if (columns && columns > 0) {
      return `grid-template-columns: repeat(${columns}, minmax(0, 1fr));`;
    }
    return 'grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));';
  };
</script>

<div class="nc-card-select-root {disabled ? 'disabled' : ''}">
  <div class="nc-card-grid" style={gridStyle()}>
    {#each options as option (String(option.value))}
      {@const active = isActive(option)}
      <button
        type="button"
        class="nc-card {active ? 'active' : ''} {disabled ? 'is-disabled' : ''}"
        id={resolveCardId(option)}
        aria-pressed={active}
        aria-label={option.label}
        on:click={() => selectOption(option)}
        on:keydown={(e) => handleKeydown(e, option)}
        disabled={disabled}
      >
        <div class="nc-card-header">
          {#if option.icon}
            <span class="nc-card-icon">
              <Icon name={option.icon} size={14} />
            </span>
          {/if}
          <span class="nc-card-label">{option.label}</span>
          {#if option.badge}
            <span class="nc-card-badge">{option.badge}</span>
          {/if}
        </div>

        {#if option.backgroundColor || option.textColor}
          <!-- Мини-превью цветовой палитры:
               - фон берется из backgroundColor;
               - текстовая метка — из textColor;
               - не добавляет новой логики, только визуализация опций. -->
          <div
            class="nc-card-palette-preview"
            style={`background-color: ${option.backgroundColor ?? 'transparent'}; color: ${option.textColor ?? 'inherit'};`}
          >
            <span class="nc-card-palette-swatch" />
          </div>
        {/if}

        {#if option.description}
          <div class="nc-card-description">
            {option.description}
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .nc-card-select-root {
    display: block;
    width: 100%;
  }

  .nc-card-select-root.disabled {
    opacity: 0.55;
  }

  .nc-card-grid {
    display: grid;
    gap: 6px;
    width: 100%;
  }

  .nc-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 6px 7px;
    width: 100%;
    border-radius: 8px;
    border: 1px solid rgba(75, 85, 99, 0.55);
    background:
      radial-gradient(
        circle at top left,
        rgba(129, 140, 248, 0.11),
        transparent
      ),
      rgba(6, 8, 16, 0.98);
    color: var(--nc-fg, #e5e7eb);
    text-align: left;
    cursor: pointer;
    box-shadow:
      0 8px 18px rgba(15, 23, 42, 0.65),
      inset 0 0 0 0 rgba(129, 140, 248, 0.08);
    outline: none;
    transition:
      transform 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      box-shadow 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      border-color 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      background-color 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      background 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99);
    font-size: 10px;
    box-sizing: border-box;
  }

  .nc-card.is-disabled {
    cursor: default;
  }

  .nc-card:hover:not(.is-disabled) {
    transform: translateY(-1px);
    border-color: rgba(129, 140, 248, 0.9);
    box-shadow:
      0 10px 24px rgba(15, 23, 42, 0.85),
      0 0 14px rgba(129, 140, 248, 0.28);
  }

  .nc-card:focus-visible:not(.is-disabled) {
    border-color: var(--nc-accent, #4f46e5);
    box-shadow:
      0 0 0 1px rgba(191, 219, 254, 0.95),
      0 0 18px rgba(129, 140, 248, 0.96);
  }

  .nc-card.active {
    border-color: var(--nc-accent, #4f46e5);
    box-shadow:
      0 10px 26px rgba(15, 23, 42, 0.98),
      0 0 18px rgba(79, 70, 229, 0.7),
      inset 0 0 0 1px rgba(148, 163, 253, 0.16);
    background:
      radial-gradient(
        circle at top left,
        rgba(79, 70, 229, 0.18),
        transparent
      ),
      rgba(5, 8, 18, 0.98);
  }

  .nc-card-header {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
  }

  .nc-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 6px;
    background-color: rgba(15, 23, 42, 0.98);
    box-shadow:
      0 1px 3px rgba(15, 23, 42, 0.9),
      0 0 6px rgba(129, 140, 248, 0.4);
    color: var(--nc-accent, #818cf8);
    flex-shrink: 0;
  }

  .nc-card-label {
    font-size: 10px;
    font-weight: 500;
    color: var(--nc-fg, #e5e7eb);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .nc-card-badge {
    padding: 1px 4px;
    border-radius: 999px;
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    background-color: rgba(79, 70, 229, 0.18);
    color: var(--nc-accent, #818cf8);
    flex-shrink: 0;
  }

  .nc-card-description {
    font-size: 8px;
    color: var(--nc-fg-muted, #9ca3af);
    opacity: 0.9;
    line-height: 1.35;
  }

  .nc-card-palette-preview {
    margin-top: 3px;
    padding: 3px 4px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 253, 0.18);
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 7px;
  }

  .nc-card-palette-swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background-color: currentColor;
    box-shadow: 0 0 4px rgba(15, 23, 42, 0.5);
  }
</style>