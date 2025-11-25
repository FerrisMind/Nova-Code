<script lang="ts">
  // src/lib/settings/controls/CardSelect.svelte
  // ----------------------------------------------------------------------------
  // Адаптированный компонент на основе shadcn-svelte Radio Group с карточным дизайном.
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from "svelte";
  import type {
    SettingDefinition,
    SettingId,
    SettingValue,
  } from "$lib/settings/types";
  import Icon from "$lib/common/Icon.svelte";

  type SettingChangeSource = "user" | "profile" | "quickAction" | "command";

  type SettingChangeMeta = {
    settingId: SettingId;
    source: SettingChangeSource;
  };

  type CardSelectOption = {
    value: SettingValue;
    label: string;
    description?: string;
    icon?: string;
    badge?: string;
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

  export let definition: CardSelectProps["definition"];
  export let options: CardSelectProps["options"] = [];
  export let value: CardSelectProps["value"] = undefined;
  export let onChange: CardSelectProps["onChange"] = undefined;
  export let disabled: CardSelectProps["disabled"] = false;
  export let columns: CardSelectProps["columns"] = 0;
  export let idPrefix: CardSelectProps["idPrefix"] = "setting-card";

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
    const base = `${idPrefix}-${definition.id}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const val = String(opt.value).replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${base}-${val}`;
  };

  const selectOption = (opt: CardSelectOption) => {
    if (disabled) return;
    const next = opt.value;
    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source: "user",
    };

    if (onChange) {
      onChange(next, meta);
    } else {
      definition.set(next);
    }

    dispatch("change", { value: next, meta });
    dispatch("select", { value: next, meta });
  };

  const handleKeydown = (event: KeyboardEvent, opt: CardSelectOption) => {
    if (disabled) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      selectOption(opt);
    }
  };

  const gridStyle = () => {
    if (columns && columns > 0) {
      return `grid-template-columns: repeat(${columns}, minmax(0, 1fr));`;
    }
    return "grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));";
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
        onclick={() => selectOption(option)}
        onkeydown={(e) => handleKeydown(e, option)}
        {disabled}
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
          <div
            class="nc-card-palette-preview"
            style={`background-color: ${option.backgroundColor ?? "transparent"}; color: ${option.textColor ?? "inherit"};`}
          >
            <span class="nc-card-palette-swatch"></span>
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
    gap: 8px;
    width: 100%;
  }

  .nc-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 8px;
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--nc-palette-border);
    background: var(--nc-level-1);
    color: var(--nc-palette-text);
    text-align: left;
    cursor: pointer;
    outline: none;
    transition:
      border-color 0.12s ease,
      background-color 0.12s ease;
    font-size: 12px;
    box-sizing: border-box;
  }

  .nc-card.is-disabled {
    cursor: default;
    opacity: 0.5;
  }

  .nc-card:hover:not(.is-disabled) {
    background: var(--nc-level-2);
    border-color: var(--nc-level-3);
  }

  .nc-card:focus-visible:not(.is-disabled) {
    border-color: var(--nc-level-4);
  }

  .nc-card.active {
    border-color: var(--nc-level-4);
    background: var(--nc-level-2);
  }

  .nc-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .nc-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background-color: var(--nc-level-4);
    color: var(--nc-palette-text);
    flex-shrink: 0;
  }

  .nc-card-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--nc-palette-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .nc-card-badge {
    padding: 4px;
    border-radius: 4px;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    background-color: var(--nc-level-3);
    color: var(--nc-level-5);
    flex-shrink: 0;
  }

  .nc-card-description {
    font-size: 12px;
    color: var(--nc-level-4);
    opacity: 0.9;
    line-height: 1.35;
  }

  .nc-card-palette-preview {
    margin-top: 4px;
    padding: 4px;
    border-radius: 4px;
    border: 1px solid var(--nc-level-4);
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 8px;
  }

  .nc-card-palette-swatch {
    width: 12px;
    height: 12px;
    border-radius: 4px;
    background-color: currentColor;
  }
</style>
