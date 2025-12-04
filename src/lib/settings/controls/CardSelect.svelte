<script lang="ts">
  // src/lib/settings/controls/CardSelect.svelte
  // ----------------------------------------------------------------------------
  // Адаптированный компонент на основе shadcn-svelte Radio Group с карточным дизайном.
  // ----------------------------------------------------------------------------
  import type { SettingDefinition, SettingId, SettingValue } from '$lib/settings/types';
  import Icon from '$lib/common/Icon.svelte';

  type SettingChangeSource = 'user' | 'profile' | 'quickAction' | 'command';

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
    // Palette levels for mini-UI preview
    levels?: Record<0 | 1 | 2 | 3 | 4 | 5, string>;
    levelMinus1?: string;
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

  let {
    definition,
    options = [],
    value = undefined,
    onChange = undefined,
    disabled = false,
    columns = 0,
    idPrefix = 'setting-card',
    onchange,
    onselect,
  }: CardSelectProps & {
    onchange?: (detail: { value: SettingValue; meta: SettingChangeMeta }) => void;
    onselect?: (detail: { value: SettingValue; meta: SettingChangeMeta }) => void;
  } = $props();

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
      source: 'user',
    };

    if (onChange) {
      onChange(next, meta);
    } else {
      definition.set(next);
    }

    onchange?.({ value: next, meta });
    onselect?.({ value: next, meta });
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
      {@const hasPreview = option.levels !== undefined}
      <button
        type="button"
        class="nc-card {active ? 'active' : ''} {disabled ? 'is-disabled' : ''} {hasPreview
          ? 'has-preview'
          : ''}"
        id={resolveCardId(option)}
        aria-pressed={active}
        aria-label={option.label}
        onclick={() => selectOption(option)}
        onkeydown={(e) => handleKeydown(e, option)}
        {disabled}
      >
        {#if hasPreview && option.levels}
          <!-- Palette Preview: мини-UI интерфейс -->
          <div class="nc-palette-preview" style={`background-color: ${option.levels[0]};`}>
            <div class="preview-ui">
              <!-- Мини-sidebar -->
              <div
                class="preview-sidebar"
                style={`background-color: ${option.levelMinus1 ?? option.levels[0]};`}
              >
                <div
                  class="preview-sidebar-item"
                  style={`background-color: ${option.levels[2]};`}
                ></div>
                <div
                  class="preview-sidebar-item"
                  style={`background-color: ${option.levels[3]};`}
                ></div>
                <div
                  class="preview-sidebar-item active"
                  style={`background-color: ${option.levels[4]};`}
                ></div>
              </div>
              <!-- Мини-контент -->
              <div class="preview-content" style={`background-color: ${option.levels[1]};`}>
                <!-- Мини-заголовок -->
                <div
                  class="preview-title"
                  style={`background-color: ${option.textColor}; opacity: 0.9;`}
                ></div>
                <!-- Мини-текст строки -->
                <div class="preview-text-row">
                  <div
                    class="preview-text"
                    style={`background-color: ${option.textColor}; opacity: 0.5;`}
                  ></div>
                  <div
                    class="preview-text short"
                    style={`background-color: ${option.textColor}; opacity: 0.3;`}
                  ></div>
                </div>
                <!-- Мини-кнопки -->
                <div class="preview-buttons">
                  <div class="preview-btn primary" style="background-color: #6F9DFF;"></div>
                  <div class="preview-btn" style={`background-color: ${option.levels[3]};`}></div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <div class="nc-card-footer">
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

          {#if option.description && !hasPreview}
            <div class="nc-card-description">
              {option.description}
            </div>
          {/if}
        </div>

        {#if active}
          <div class="nc-card-check">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
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
    gap: 12px;
    width: 100%;
  }

  .nc-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0;
    width: 100%;
    border-radius: var(--settings-radius-lg, 12px);
    border: 2px solid var(--nc-palette-border);
    background: var(--nc-level-1);
    color: var(--nc-palette-text);
    text-align: left;
    cursor: pointer;
    outline: none;
    overflow: hidden;
    transition:
      border-color 0.15s ease,
      transform 0.15s ease,
      box-shadow 0.15s ease;
    font-size: 12px;
    box-sizing: border-box;
  }

  .nc-card:not(.has-preview) {
    padding: 12px;
  }

  .nc-card.is-disabled {
    cursor: default;
    opacity: 0.5;
  }

  .nc-card:hover:not(.is-disabled) {
    border-color: var(--nc-level-4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .nc-card:focus-visible:not(.is-disabled) {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
    box-shadow: 0 0 0 3px hsl(var(--settings-primary, 217 91% 60%) / 0.2);
  }

  .nc-card.active {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
    box-shadow: 0 0 0 1px hsl(var(--settings-primary, 217 91% 60%));
  }

  .nc-card.active:hover {
    transform: translateY(-1px);
  }

  /* =========================================================================
   * Palette Preview (mini UI)
   * ========================================================================= */

  .nc-palette-preview {
    padding: 8px;
    min-height: 80px;
    display: flex;
    align-items: stretch;
    justify-content: center;
    border-radius: var(--settings-radius-md, 8px) var(--settings-radius-md, 8px) 0 0;
  }

  .preview-ui {
    display: flex;
    gap: 4px;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
  }

  /* Mini Sidebar */
  .preview-sidebar {
    width: 20px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px 3px;
    border-radius: 4px;
  }

  .preview-sidebar-item {
    width: 100%;
    height: 8px;
    border-radius: 2px;
    opacity: 0.6;
  }

  .preview-sidebar-item.active {
    opacity: 1;
  }

  /* Mini Content */
  .preview-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 4px;
  }

  .preview-title {
    width: 60%;
    height: 6px;
    border-radius: 2px;
  }

  .preview-text-row {
    display: flex;
    gap: 4px;
  }

  .preview-text {
    width: 70%;
    height: 4px;
    border-radius: 1px;
  }

  .preview-text.short {
    width: 40%;
  }

  .preview-buttons {
    display: flex;
    gap: 4px;
    margin-top: auto;
  }

  .preview-btn {
    width: 28px;
    height: 10px;
    border-radius: 3px;
  }

  .preview-btn.primary {
    width: 36px;
  }

  /* =========================================================================
   * Card Footer (label)
   * ========================================================================= */

  .nc-card-footer {
    padding: 10px 12px;
    background: var(--nc-level-0);
    border-top: 1px solid var(--nc-palette-border);
  }

  .nc-card:not(.has-preview) .nc-card-footer {
    padding: 0;
    background: transparent;
    border-top: none;
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
    font-weight: 600;
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
    font-size: 11px;
    color: var(--nc-fg-muted);
    opacity: 0.9;
    line-height: 1.35;
    margin-top: 4px;
  }

  /* =========================================================================
   * Active Check Mark
   * ========================================================================= */

  .nc-card-check {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: hsl(var(--settings-primary, 217 91% 60%));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
</style>

<svelte:options runes={true} />
