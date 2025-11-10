<script lang="ts">
  // src/lib/settings/layout/SettingsAllContent.svelte
  // ----------------------------------------------------------------------------
  // Центральная панель с всеми секциями настроек как блоками в одном скролле.
  //
  // Функционал:
  // - Рендерит все секции как отдельные блоки с заголовками
  // - Поддерживает те же контролы, что и SettingsContent
  // - Генерирует события settingfocus и settingclick
  // - Использует Intersection Observer для определения видимой секции
  // ----------------------------------------------------------------------------

  import { createEventDispatcher, onMount } from 'svelte';
  import type { SettingsSectionDefinition, SettingDefinition } from '$lib/settings/types';

  import Toggle from '$lib/settings/controls/Toggle.svelte';
  import RangeInput from '$lib/settings/controls/RangeInput.svelte';
  import CardSelect from '$lib/settings/controls/CardSelect.svelte';
  import { theme } from '$lib/stores/themeStore';
  import { getSections, getSettingsBySection } from '$lib/settings/registry';

  const dispatch = createEventDispatcher<{
    settingfocus: { settingId: string };
    settingclick: { settingId: string };
    sectionvisible: { sectionId: string };
  }>();

  // ---------------------------------------------------------------------------
// Переменные для синхронизации по скроллбару
  // ---------------------------------------------------------------------------

  let container: HTMLElement;
  let sections: HTMLElement[] = [];
  let scrollHandler: (() => void) | null = null;

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

  /**
   * Контейнер прокрутки для Intersection Observer
   */
  export let scrollContainer: HTMLElement | null = null;

  // Реактивно отслеживаем изменения режима темы для обновления опций палитр
  $: currentMode = $theme.mode;

  // Получаем все секции и их настройки
  $: allSections = getSections();
  $: sectionsWithSettings = allSections.map(section => ({
    section,
    settings: getSettingsBySection(section.id)
  }));

  // ---------------------------------------------------------------------------
// Синхронизация по скроллбару
  // ---------------------------------------------------------------------------

  function updateActiveSection() {
    if (!scrollContainer || sections.length === 0) return;

    const scrollTop = scrollContainer.scrollTop;
    let closestSection = sections[0];
    let minDistance = Math.abs(sections[0].offsetTop - scrollTop);

    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const distance = Math.abs(section.offsetTop - scrollTop);
      if (distance < minDistance) {
        minDistance = distance;
        closestSection = section;
      }
    }

    const sectionId = closestSection.getAttribute('data-section-id');
    if (sectionId) {
      dispatch('sectionvisible', { sectionId });
    }
  }

  onMount(() => {
    if (container && scrollContainer) {
      const scrollElement = scrollContainer as HTMLElement;
      
      // Получаем все секции
      sections = Array.from(container.querySelectorAll('[data-section-id]')) as HTMLElement[];
      
      // Добавляем обработчик скролла с throttling для лучшей производительности
      let timeout: number;
      scrollHandler = () => {
        clearTimeout(timeout);
        timeout = setTimeout(updateActiveSection, 100);
      };
      scrollElement.addEventListener('scroll', scrollHandler);
      
      // Начальная синхронизация
      updateActiveSection();
    }

    return () => {
      if (scrollContainer && scrollHandler) {
        const scrollElement = scrollContainer as HTMLElement;
        scrollElement.removeEventListener('scroll', scrollHandler);
      }
    };
  });

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

  const isBooleanControl = (setting: SettingDefinition): boolean => {
    return setting.control === 'boolean' || setting.control === 'toggle';
  };

  const isRangeControl = (setting: SettingDefinition): boolean => {
    return setting.control === 'slider';
  };

  const isSelectLikeControl = (setting: SettingDefinition): boolean => {
    return setting.control === 'select' || setting.control === 'radio';
  };

  const hasOptions = (setting: SettingDefinition): boolean => {
    if (!setting.options) return false;
    const opts = typeof setting.options === 'function' ? setting.options() : setting.options;
    return opts.length > 0;
  };

  const getNumericRangeMeta = (setting: SettingDefinition): { min: number; max: number; step?: number } | null => {
    // Для slider контрола, если есть числовые ограничения, но пока возвращаем null
    // В будущем можно добавить range в типы
    return null;
  };

  const mapOptionsToCards = (setting: SettingDefinition) => {
    if (!setting.options) return [];
    const opts = typeof setting.options === 'function' ? setting.options() : setting.options;
    return opts.map(option => ({
      value: option.value,
      label: option.label,
      description: option.label // Используем label как description
    }));
  };
</script>

<div class="settings-all-content-root" bind:this={container}>
  {#each sectionsWithSettings as { section, settings }}
    <div class="section-block" data-section-id={section.id}>
      <div class="section-header">
        <div class="title-row">
          <h3 class="section-title">{section.label}</h3>
          <span class="section-id">{section.id}</span>
        </div>
        {#if section.label}
          <p class="section-description">{section.label}</p>
        {/if}
      </div>

      <div class="settings-list">
        {#each settings as setting}
          {@const dirty = isDirty(setting.id)}
          {@const active = activeSettingId === setting.id}

          <button
            class="setting-item {active ? 'active' : ''} {dirty ? 'dirty' : ''}"
            on:mouseenter={() => handleMouseEnter(setting.id)}
            on:click={() => handleClick(setting.id)}
          >
            <div class="setting-main">
              <div class="setting-label-row">
                <span class="setting-label">{setting.label}</span>
                <span class="setting-id">{setting.id}</span>
              </div>
              {#if setting.description}
                <div class="setting-description">{setting.description}</div>
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
              {:else if isSelectLikeControl(setting) && hasOptions(setting)}
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
    </div>
  {/each}
</div>

<style>
  .settings-all-content-root {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 12px;
    height: 100%;
    box-sizing: border-box;
    color: var(--nc-palette-text);
    background: transparent;
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--nc-level-1);
    border: 1px solid var(--nc-palette-border);
    border-radius: 8px;
    padding: 12px;
  }

  .section-block + .section-block {
    margin-top: 8px;
  }

  .section-header {
    padding: 0;
    background: transparent;
    border-radius: 0;
    border: none;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .section-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--nc-palette-text);
  }

  .section-id {
    font-size: 12px;
    color: var(--nc-palette-text);
    opacity: 0.7;
  }

  .section-description {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: var(--nc-palette-text);
    opacity: 0.8;
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-item {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--nc-level-2);
    border: 1px solid var(--nc-palette-border);
    cursor: pointer;
    transition: all 0.12s ease;
    outline: none;
  }

  .setting-item:hover {
    border-color: var(--nc-level-3);
    background: var(--nc-level-1);
  }

  .setting-item.active {
    border-color: var(--nc-level-4);
    background: var(--nc-level-1);
  }

  .setting-item.dirty {
    border-color: #fb923c;
  }

  .setting-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .setting-label-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .setting-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--nc-palette-text);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 300px;
  }

  .setting-id {
    font-size: 12px;
    color: var(--nc-palette-text);
    opacity: 0.75;
  }

  .setting-description {
    font-size: 12px;
    color: var(--nc-palette-text);
    opacity: 0.8;
  }

  .setting-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 120px;
    text-align: right;
  }

  .setting-value-label {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--nc-palette-text);
    opacity: 0.7;
  }

  .setting-value {
    font-size: 12px;
    color: var(--nc-level-5);
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
    width: 192px;
  }

  .setting-control-hint {
    font-size: 8px;
    color: var(--nc-palette-text);
    opacity: 0.7;
  }

  .setting-dirty-indicator {
    width: 8px;
    height: 8px;
    border-radius: 8px;
    background: radial-gradient(
      circle,
      #fb923c,
      #c2410c
    );
    box-shadow: 0 0 8px rgba(248, 250, 252, 0.4);
  }

  .empty-hint {
    padding: 16px;
    font-size: 12px;
    color: var(--nc-palette-text);
  }

  .settings-all-content-root::-webkit-scrollbar {
    width: 8px;
  }

  .settings-all-content-root::-webkit-scrollbar-thumb {
    background-color: var(--nc-level-4);
    border-radius: 4px;
  }
</style>