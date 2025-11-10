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
  <div class="settings-nav-header">
    <div class="title">Settings</div>
    <div class="subtitle">Sections</div>
  </div>

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
    padding: 8px 6px;
    box-sizing: border-box;
    color: var(--nc-fg-muted);
    background:
      linear-gradient(
        to bottom,
        rgba(148, 163, 253, 0.04),
        rgba(15, 23, 42, 0.12)
      );
    backdrop-filter: blur(10px);
    border-right: 1px solid var(--nc-border-subtle);
    gap: 4px;
  }

  .settings-nav-header {
    padding: 4px 6px 6px;
    border-radius: 6px;
  }

  .title {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--nc-fg-muted);
    opacity: 0.88;
  }

  .subtitle {
    font-size: 10px;
    color: var(--nc-fg-muted);
    opacity: 0.7;
  }

  .sections-list {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .section-item {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--nc-fg-muted);
    font-size: 11px;
    transition: all 0.12s ease;
    border: 1px solid transparent;
    background-color: transparent;
  }

  .section-item:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
    border-color: var(--nc-border-subtle);
  }

  .section-item.active {
    background:
      linear-gradient(
        to right,
        rgba(129, 140, 248, 0.18),
        rgba(15, 23, 42, 0.02)
      );
    color: var(--nc-fg);
    border-color: var(--nc-accent);
    box-shadow: 0 0 18px rgba(15, 23, 42, 0.35);
  }

  .section-left {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .label {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 150px;
  }

  .dirty-badge {
    min-width: 16px;
    padding: 0 4px;
    height: 16px;
    border-radius: 999px;
    background-color: var(--nc-accent);
    color: var(--nc-bg);
    font-size: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);
  }

  .sections-list::-webkit-scrollbar {
    width: 4px;
  }

  .sections-list::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
    border-radius: 999px;
  }
</style>