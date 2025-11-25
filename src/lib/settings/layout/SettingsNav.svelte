<script lang="ts">
  // src/lib/settings/layout/SettingsNav.svelte
  // ----------------------------------------------------------------------------
  // Левая панель навигации для трехпанельного SettingsShell.
  //
  // Ответственность:
  // - Отображать список секций, полученный снаружи (из settingsRegistry).
  // - Подсвечивать активную секцию.
  // - Показывать иконку (по id) и счетчик "грязных" настроек по секции, если он передан.
  // - Эмитить onSelect(sectionId) вверх через DOM-событие `select`.
  //
  // Важно:
  // - Не знает про registry или сторы напрямую.
  // - Работает только с входными пропсами (sections, activeSectionId, dirtyBySection).
  // - Без заглушек и фиктивной логики.
  //
  // В визуальном стиле повторяет существующие сайдбар-паттерны и использует CSS-переменные.
  // Дополнительно добавлен легкий glassmorphism, не конфликтующий с общим оформлением.
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import type { SettingsSectionDefinition } from '$lib/settings/types';
  import Icon from '$lib/common/Icon.svelte';

  const dispatch = createEventDispatcher<{
    select: { sectionId: string };
  }>();

  export let sections: SettingsSectionDefinition[] = [];
  export let activeSectionId: string | undefined;
  /**
   * Опциональная карта "грязных" настроек: sectionId -> count.
   * Источник данных — внешний orchestrator (например, settingsStore).
   */
  export let dirtyBySection: Record<string, number> | undefined;

  /**
   * Опциональный маппер sectionId -> iconId для интеграции с текущим набором иконок.
   * По умолчанию подбираем простые значения.
   */
  export let sectionIcons:
    | Record<string, string>
    | undefined;

  const getIconName = (sectionId: string): string | undefined => {
    if (sectionIcons && sectionIcons[sectionId]) return sectionIcons[sectionId];

    if (sectionId.startsWith('appearance')) return 'color-palette';
    if (sectionId.startsWith('editor')) return 'settings';
    if (sectionId.startsWith('workbench')) return 'layout';
    if (sectionId.startsWith('integrations')) return 'plug';
    if (sectionId.startsWith('experimental')) return 'flask';

    return undefined;
  };

  const handleSelect = (sectionId: string) => {
    dispatch('select', { sectionId });
  };

  const getDirtyCount = (sectionId: string): number => {
    if (!dirtyBySection) return 0;
    return dirtyBySection[sectionId] ?? 0;
  };
</script>

<nav class="settings-nav-root">
  <div class="sections-list">
    {#each sections as section (section.id)}
      {@const isActive = section.id === activeSectionId}
      {@const dirty = getDirtyCount(section.id)}
      <button
        type="button"
        class="section-item {isActive ? 'active' : ''}"
        on:click={() => handleSelect(section.id)}
      >
        <div class="section-left">
          {#if getIconName(section.id)}
            <Icon name={getIconName(section.id) ?? ''} size={14} />
          {/if}
          <span class="label">{section.label}</span>
        </div>

        {#if dirty > 0}
          <span class="dirty-badge">{dirty}</span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

<style>
  .settings-nav-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 4px;
    box-sizing: border-box;
    color: var(--nc-palette-text);
    background: transparent;
    gap: 6px;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-item {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    color: var(--nc-fg-muted);
    font-size: 13px;
    transition: all 0.12s ease;
    border: 1px solid var(--nc-palette-border);
    background-color: var(--nc-level-2);
  }

  .section-item:hover {
    background-color: var(--nc-level-3);
    color: var(--nc-palette-text);
    border-color: var(--nc-level-4);
  }

  .section-item.active {
    background: var(--nc-level-3);
    color: var(--nc-palette-text);
    border-color: var(--nc-level-4);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
  }

  .section-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .label {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 152px;
  }

  .dirty-badge {
    min-width: 16px;
    padding: 0 4px;
    height: 16px;
    border-radius: 8px;
    background-color: var(--nc-level-5);
    color: var(--nc-level-0);
    font-size: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>
