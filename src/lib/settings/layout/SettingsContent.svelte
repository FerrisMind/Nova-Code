<script lang="ts">
  // src/lib/settings/layout/SettingsContent.svelte
  // ----------------------------------------------------------------------------
  // Центральная панель трехпанельного SettingsShell.
  //
  // Обновленная версия:
  // - По-прежнему:
  //   - показывает секцию, список настроек и генерирует события:
  //     - settingfocus: { settingId }
  //     - settingclick: { settingId }
  // - Дополнительно:
  //   - Поддерживает умные контролы:
  //     - Toggle для boolean-настроек;
  //     - RangeInput для числовых диапазонов;
  //     - CardSelect для select/radio-настроек;
  //   - Контрол выбирается строго на основе SettingDefinition.control и метаданных registry.
  //   - Все изменения делают реальные definition.set(), без моков.
  //
  // Архитектура:
  // - Работает только с SettingDefinition[] и их get/set;
  // - Не знает о глобальных сторах напрямую;
  // - Не ломает API SettingsShell и registry.
  //
  // Реализация опирается на:
  // - [`types.ts`](src/lib/settings/types.ts:1)
  // - [`registry.ts`](src/lib/settings/registry.ts:1)
  // - [`controls/*.svelte`](src/lib/settings/controls/controls.api.md:1)
  // - практики Svelte 5 (валидировано по Context7 + официальным докам).
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import type { SettingsSectionDefinition, SettingDefinition } from '$lib/settings/types';

  import Toggle from '$lib/settings/controls/Toggle.svelte';
  import RangeInput from '$lib/settings/controls/RangeInput.svelte';
  import CardSelect from '$lib/settings/controls/CardSelect.svelte';

  const dispatch = createEventDispatcher<{
    settingfocus: { settingId: string };
    settingclick: { settingId: string };
  }>();

  /**
   * Текущая активная секция.
   */
  export let section: SettingsSectionDefinition | undefined;

  /**
   * Настройки, принадлежащие текущей секции.
   * Предполагается, что приходит уже отсортированный массив.
   */
  export let settings: SettingDefinition[] = [];

  /**
   * Id активной настройки (например, выбранной в превью).
   * Используется только для подсветки.
   */
  export let activeSettingId: string | undefined;

  /**
   * Опциональная карта "грязных" настроек (settingId -> boolean|число).
   * В этом subtasks используется только для визуальной подсветки.
   */
  export let dirtyBySetting:
    | Record<string, number | boolean>
    | undefined;

  const handleMouseEnter = (settingId: string) => {
    dispatch('settingfocus', { settingId });
  };

  const handleClick = (settingId: string) => {
    dispatch('settingclick', { settingId });
  };

  const isDirty = (settingId: string): boolean => {
    if (!dirtyBySetting) return false;
    const v = dirtyBySetting[settingId];
    if (typeof v === 'number') return v > 0;
    return Boolean(v);
  };

  const formatValue = (definition: SettingDefinition): string => {
    try {
      const raw = definition.get();
      if (typeof raw === 'boolean') return raw ? 'On' : 'Off';
      if (raw === null || raw === undefined) return '';
      return String(raw);
    } catch {
      return '';
    }
  };

  // ---------------------------------------------------------------------------
  // Вспомогательная логика выбора контрола
  // ---------------------------------------------------------------------------

  const isBooleanControl = (def: SettingDefinition): boolean => {
    return def.control === 'boolean';
  };

  const isRangeControl = (def: SettingDefinition): boolean => {
    // В текущем контракте control: 'number' | 'slider'
    // Используем RangeInput только для реально числовых настроек:
    return def.control === 'slider' || def.control === 'number';
  };

  const isSelectLikeControl = (def: SettingDefinition): boolean => {
    return def.control === 'select' || def.control === 'radio';
  };

  const getNumericRangeMeta = (def: SettingDefinition):
    | { min: number; max: number; step?: number }
    | undefined => {
    // На этом этапе registry не хранит отдельного meta-объекта.
    // Чтобы не добавлять фиктивную структуру, задаем реальные диапазоны
    // только для конкретных известных id, основанных на реальных настройках.
    switch (def.id) {
      case 'editor.fontSize':
        return { min: 8, max: 32, step: 1 };
      case 'editor.tabSize':
        return { min: 1, max: 8, step: 1 };
      case 'editor.wordWrapColumn':
        return { min: 40, max: 240, step: 1 };
      default:
        return undefined;
    }
  };

  const mapOptionsToCards = (def: SettingDefinition) => {
    if (!def.options || def.options.length === 0) return [];
    // Минимальный адаптер: CardSelectOption совместим с { value, label }.
    return def.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      description: undefined,
      icon: undefined,
      badge: undefined
    }));
  };
</script>

<div class="settings-content-root">
  {#if section}
    <header class="section-header">
      <div class="title-row">
        <h2 class="section-title">{section.label}</h2>
        <span class="section-id">{section.id}</span>
      </div>
      <p class="section-description">
        Structured settings for this area. Values are live from the underlying stores.
      </p>
    </header>

    <div class="settings-list">
      {#each settings as setting (setting.id)}
        {@const isActive = setting.id === activeSettingId}
        {@const dirty = isDirty(setting.id)}

        <button
          type="button"
          class="setting-item {isActive ? 'active' : ''} {dirty ? 'dirty' : ''}"
          on:mouseenter={() => handleMouseEnter(setting.id)}
          on:focus={() => handleMouseEnter(setting.id)}
          on:click={() => handleClick(setting.id)}
          aria-pressed={isActive}
        >
          <div class="setting-main">
            <div class="setting-label-row">
              <div class="setting-label">
                {setting.label}
              </div>
              <div class="setting-id">
                {setting.id}
              </div>
            </div>
            {#if setting.description}
              <div class="setting-description">
                {setting.description}
              </div>
            {/if}
          </div>

          <div class="setting-meta">
            <div class="setting-value-label">Current</div>

            <!-- Умный контрол или fallback. Контролы всегда используют реальный get/set. -->
            {#if isBooleanControl(setting)}
              <div class="setting-control">
                <Toggle definition={setting} compact={true} />
              </div>
            {:else if isRangeControl(setting)}
              {@const rangeMeta = getNumericRangeMeta(setting)}
              {#if rangeMeta}
                <div class="setting-control">
                  <RangeInput
                    definition={setting}
                    min={rangeMeta.min}
                    max={rangeMeta.max}
                    step={rangeMeta.step ?? 1}
                    compact={true}
                  />
                </div>
              {:else}
                <!-- Нет безопасного диапазона: показываем только readonly значение -->
                <div class="setting-value">
                  {formatValue(setting)}
                </div>
              {/if}
            {:else if isSelectLikeControl(setting) && setting.options && setting.options.length > 0}
              <!-- Для select/radio используем CardSelect, опции берем из real definition.options -->
              <div class="setting-control cards">
                <CardSelect
                  definition={setting}
                  options={mapOptionsToCards(setting)}
                  columns={2}
                />
              </div>
            {:else}
              <!-- Fallback: строго readonly текст для остальных настроек -->
              <div class="setting-value">
                {formatValue(setting)}
              </div>
            {/if}

            <!-- Для отладки и прозрачности оставляем control-hint -->
            <div class="setting-control-hint">
              {setting.control}
            </div>

            {#if dirty}
              <div class="setting-dirty-indicator" aria-label="Modified setting"></div>
            {/if}
          </div>
        </button>
      {/each}

      {#if settings.length === 0}
        <div class="empty-hint">
          No settings are registered for this section in the registry.
        </div>
      {/if}
    </div>
  {:else}
    <div class="empty-hint">
      Select a section on the left to view its settings.
    </div>
  {/if}
</div>

<style>
  .settings-content-root {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 12px 10px;
    height: 100%;
    box-sizing: border-box;
    color: var(--nc-fg);
    background:
      radial-gradient(
        circle at top left,
        rgba(148, 163, 253, 0.06),
        transparent
      ),
      rgba(10, 16, 25, 0.92);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    box-shadow:
      0 16px 40px rgba(15, 23, 42, 0.55),
      inset 0 0 0 1px rgba(148, 163, 253, 0.03);
    overflow: hidden;
  }

  .section-header {
    padding: 4px 4px 8px;
    border-bottom: 1px solid var(--nc-border-subtle);
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .section-title {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--nc-fg);
  }

  .section-id {
    font-size: 10px;
    color: var(--nc-fg-muted);
    opacity: 0.7;
  }

  .section-description {
    margin: 2px 0 0 0;
    font-size: 11px;
    color: var(--nc-fg-muted);
  }

  .settings-list {
    flex: 1;
    padding: 6px 4px 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
  }

  .setting-item {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 8px;
    border-radius: 8px;
    background: radial-gradient(
        circle at top left,
        rgba(148, 163, 253, 0.04),
        transparent
      ),
      rgba(12, 17, 28, 0.98);
    border: 1px solid rgba(148, 163, 253, 0.06);
    cursor: pointer;
    transition: all 0.12s ease;
    box-shadow: 0 0 0 rgba(15, 23, 42, 0);
    outline: none;
  }

  .setting-item:hover {
    background-color: var(--nc-tab-bg-active);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.45);
    border-color: var(--nc-border-subtle);
  }

  .setting-item.active {
    border-color: var(--nc-accent);
    box-shadow:
      0 10px 26px rgba(37, 99, 235, 0.38),
      0 0 0 1px rgba(37, 99, 235, 0.16);
  }

  .setting-item.dirty {
    border-color: rgba(249, 115, 22, 0.7);
  }

  .setting-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .setting-label-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .setting-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--nc-fg);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 260px;
  }

  .setting-id {
    font-size: 9px;
    color: var(--nc-fg-muted);
    opacity: 0.75;
  }

  .setting-description {
    font-size: 10px;
    color: var(--nc-fg-muted);
  }

  .setting-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 120px;
    text-align: right;
  }

  .setting-value-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--nc-fg-muted);
    opacity: 0.7;
  }

  .setting-value {
    font-size: 11px;
    color: var(--nc-accent);
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .setting-control {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .setting-control.cards {
    width: 180px;
  }

  .setting-control-hint {
    font-size: 8px;
    color: var(--nc-fg-muted);
    opacity: 0.7;
  }

  .setting-dirty-indicator {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: radial-gradient(
      circle,
      #fb923c,
      #c2410c
    );
    box-shadow: 0 0 8px rgba(248, 250, 252, 0.4);
  }

  .empty-hint {
    padding: 16px;
    font-size: 11px;
    color: var(--nc-fg-muted);
  }

  .settings-list::-webkit-scrollbar {
    width: 6px;
  }

  .settings-list::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
    border-radius: 999px;
  }
</style>