<script lang="ts">
  // src/lib/settings/layout/SettingsShell.svelte
  // ----------------------------------------------------------------------------
  // Двухпанельный контейнер настроек (SettingsShell).
  //
  // В рамках данного subtasks:
  // - Использует settingsRegistry как источник секций и SettingDefinition.
  // - Рендерит:
  //   - слева: SettingsNav (список секций),
  //   - справа: SettingsContent (список настроек выбранной секции).
  // - Поддерживает:
  //   - initialSectionId / initialSettingId / externalSelection;
  //   - compactMode (компактный вид для sidebar).
  // - Не изменяет значения настроек (set вызывают только будущие controls/оркестраторы).
  // - Не ломает существующий функционал: опирается только на registry/get().
  //
  // Реализованные DOM-события:
  // - settingfocus
  // - sectionchange
  //
  // Остальные события и полноценный eventBus будут добавлены в следующих задачах.
  // ----------------------------------------------------------------------------

  import { createEventDispatcher, onMount } from 'svelte';
  import SettingsNav from '$lib/settings/layout/SettingsNav.svelte';
  import SettingsAllContent from '$lib/settings/layout/SettingsAllContent.svelte';

  import type {
    SettingId,
    SettingDefinition,
    SettingsSectionDefinition
  } from '$lib/settings/types';
  import {
    getSections,
    getSectionById,
    getSettingsBySection,
    getSetting
  } from '$lib/settings/registry';

  // Типы деталей событий для текущей реализации
  type SettingsShellSettingFocusDetail = {
    settingId: SettingId;
    sectionId: string;
    definition: SettingDefinition;
  };

  type SettingsShellSectionChangeDetail = {
    sectionId: string;
    section: SettingsSectionDefinition;
  };

  const dispatch = createEventDispatcher<{
    settingfocus: SettingsShellSettingFocusDetail;
    sectionchange: SettingsShellSectionChangeDetail;
  }>();

  // ---------------------------------------------------------------------------
  // Публичные пропсы (минимальный subset контракта)
  // ---------------------------------------------------------------------------

  export let id: string | undefined = undefined;

  export let initialSectionId: string | undefined = undefined;
  export let initialSettingId: string | undefined = undefined;

  export let compactMode: boolean = false;

  // Внешний выбор (команды, поиск, профили, быстрые действия).
  // Необязательный проп; по умолчанию отсутствует.
  export let externalSelection:
    | {
        sectionId?: string;
        settingId?: string;
        source?: 'command' | 'search' | 'profile' | 'quickAction';
      }
    | undefined = undefined;

  // Упрощенный контракт eventBus для будущей интеграции.
  // Необязательный проп; отсутствие не ломает Shell.
  type SettingsShellExternalEvent =
    | { type: 'opened'; via?: 'route' | 'sidebar' | 'command' }
    | { type: 'section-focused'; sectionId: string }
    | { type: 'setting-focused'; settingId: SettingId };

  interface SettingsShellEventBus {
    openShell(payload?: {
      sectionId?: string;
      settingId?: string;
      source?: 'command' | 'profile' | 'quickAction';
    }): void;
    focusSection(sectionId: string): void;
    focusSetting(settingId: SettingId): void;
    triggerQuickAction(action: unknown): void;
    subscribe(listener: (event: SettingsShellExternalEvent) => void): () => void;
  }

  export let eventBus: SettingsShellEventBus | undefined = undefined;

  // ---------------------------------------------------------------------------
  // Локальное состояние shell
  // ---------------------------------------------------------------------------

  const allSections = getSections();

  let activeSectionId: string | undefined;
  let activeSection: SettingsSectionDefinition | undefined;
  let activeSectionSettings: SettingDefinition[] = [];

  let activeSettingId: SettingId | undefined;
  let activeSettingDefinition: SettingDefinition | undefined;

  // Поисковый запрос
  let searchQuery: string = '';

  // Контейнер прокрутки для Intersection Observer
  let scrollContainer: HTMLElement;

  // Плейсхолдеры для dirty-счетчиков (реальная логика будет в settingsStore).
  const emptyDirtySection: Record<string, number> = {};
  const emptyDirtySetting: Record<string, number> = {};

  // ---------------------------------------------------------------------------
  // Инициализация выбора
  // ---------------------------------------------------------------------------

  function ensureInitialSelection() {
    // 1) externalSelection.settingId — высший приоритет
    if (externalSelection?.settingId) {
      const def = getSetting(externalSelection.settingId);
      if (def) {
        activeSectionId = def.section;
        activeSettingId = def.id;
        return;
      }
    }

    // 2) externalSelection.sectionId
    if (!activeSettingId && externalSelection?.sectionId) {
      const section = getSectionById(externalSelection.sectionId);
      if (section) {
        activeSectionId = section.id;
      }
    }

    // 3) initialSettingId
    if (!activeSettingId && initialSettingId) {
      const def = getSetting(initialSettingId);
      if (def) {
        activeSectionId = def.section;
        activeSettingId = def.id;
        return;
      }
    }

    // 4) initialSectionId
    if (!activeSectionId && initialSectionId) {
      const section = getSectionById(initialSectionId);
      if (section) {
        activeSectionId = section.id;
      }
    }

    // 5) Fallback: первая секция
    if (!activeSectionId && allSections.length > 0) {
      activeSectionId = allSections[0].id;
    }
  }

  function syncDerivedState() {
    activeSection = activeSectionId ? getSectionById(activeSectionId) : undefined;
    activeSectionSettings = activeSection
      ? getSettingsBySection(activeSection.id)
      : [];

    if (activeSettingId) {
      const def = getSetting(activeSettingId);
      if (def) {
        activeSettingDefinition = def;

        // Если секция активной настройки отличается — синхронизация.
        if (def.section !== activeSectionId) {
          activeSectionId = def.section;
          activeSection = getSectionById(def.section);
          activeSectionSettings = activeSection
            ? getSettingsBySection(activeSection.id)
            : [];
        }
      } else {
        activeSettingDefinition = undefined;
      }
    } else {
      activeSettingDefinition = undefined;
    }
  }

  function emitBusOpened() {
    if (!eventBus) return;
    eventBus.openShell({
      sectionId: activeSectionId,
      settingId: activeSettingId,
      source:
        externalSelection?.source === 'command' ||
        externalSelection?.source === 'profile' ||
        externalSelection?.source === 'quickAction'
          ? externalSelection.source
          : undefined
    });
  }

  function emitBusSectionFocused(sectionId: string) {
    if (!eventBus) return;
    eventBus.focusSection(sectionId);
  }

  function emitBusSettingFocused(settingId: SettingId) {
    if (!eventBus) return;
    eventBus.focusSetting(settingId);
  }

  // Инициализация при монтировании
  onMount(() => {
    ensureInitialSelection();
    syncDerivedState();
    emitBusOpened();
  });

  // Реакция на изменения внешнего выбора
  $: if (externalSelection) {
    ensureInitialSelection();
    syncDerivedState();
  }

  // ---------------------------------------------------------------------------
  // Обработчики событий
  // ---------------------------------------------------------------------------

  function handleSectionSelect(sectionId: string) {
    if (sectionId === activeSectionId) return;
    const section = getSectionById(sectionId);
    if (!section) return;

    activeSectionId = section.id;
    activeSection = section;
    activeSectionSettings = getSettingsBySection(section.id);

    // При смене секции сбрасываем активную настройку (минимально предсказуемое поведение).
    activeSettingId = undefined;
    activeSettingDefinition = undefined;

    dispatch('sectionchange', {
      sectionId: section.id,
      section
    });

    emitBusSectionFocused(section.id);

    // Скроллим к секции в правой панели
    if (scrollToSection) {
      scrollToSection(sectionId);
    }
  }

  function scrollToSection(sectionId: string) {
    // Эта функция будет передана в SettingsAllContent
    const element = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (element && scrollContainer) {
      const rect = element.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const sectionTop = rect.top - containerRect.top + scrollContainer.scrollTop;
      scrollContainer.scrollTo({
        top: Math.max(sectionTop - 16, 0),
        behavior: 'smooth'
      });
    }
  }

  function handleSettingFocus(event: CustomEvent<{ settingId: string }>) {
    const settingId = event.detail.settingId;
    const def = getSetting(settingId);
    if (!def) return;

    activeSettingId = def.id;
    activeSettingDefinition = def;

    // Не меняем активную секцию при фокусе на настройке - только по скроллу
    // activeSectionId = def.section;
    // activeSection = getSectionById(def.section);
    // activeSectionSettings = activeSection
    //   ? getSettingsBySection(activeSection.id)
    //   : [];

    dispatch('settingfocus', {
      settingId: def.id,
      sectionId: def.section,
      definition: def
    });

    emitBusSettingFocused(def.id);
  }

  function handleSectionVisible(event: CustomEvent<{ sectionId: string }>) {
    const sectionId = event.detail.sectionId;
    if (sectionId === activeSectionId) return;
    
    const section = getSectionById(sectionId);
    if (!section) return;

    activeSectionId = section.id;
    activeSection = section;
    activeSectionSettings = getSettingsBySection(section.id);

    // При смене секции сбрасываем активную настройку
    activeSettingId = undefined;
    activeSettingDefinition = undefined;

    dispatch('sectionchange', {
      sectionId: section.id,
      section
    });

    emitBusSectionFocused(section.id);
  }

  function handleSettingClick(event: CustomEvent<{ settingId: string }>) {
    const settingId = event.detail.settingId;
    const def = getSetting(settingId);
    if (!def) return;

    activeSettingId = def.id;
    activeSettingDefinition = def;
  }

  // ---------------------------------------------------------------------------
  // Иконки секций для SettingsNav (минимальный реалистичный mapping)
  const sectionIcons: Record<string, string> = {
    'appearance.theme': 'color-palette',
    'editor.core': 'settings',
    'editor.layout': 'settings',
    'editor.ui': 'layout'
  };
</script>

<div
  class="settings-shell-root {compactMode ? 'compact' : 'full'}"
  data-shell-id={id}
>
  <div class="settings-container">
    <!-- Левая панель: секции -->
    <div class="pane pane-left">
      <SettingsNav
        sections={allSections}
        activeSectionId={activeSectionId}
        dirtyBySection={emptyDirtySection}
        sectionIcons={sectionIcons}
        on:select={(e) => handleSectionSelect(e.detail.sectionId)}
      />
    </div>
    <div class="pane pane-right">
      <div class="search-container">
        <input
          type="search"
          class="search-input"
          placeholder="Search settings..."
          bind:value={searchQuery}
        />
      </div>
      <div class="content-scrollable" bind:this={scrollContainer}>
        <SettingsAllContent
          activeSettingId={activeSettingId}
          dirtyBySetting={emptyDirtySetting}
          scrollContainer={scrollContainer}
          on:settingfocus={handleSettingFocus}
          on:settingclick={handleSettingClick}
          on:sectionvisible={handleSectionVisible}
        />
      </div>
    </div>
  </div>
</div>

<style>
  .settings-shell-root {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
    height: 100%;
    padding: 32px;
    box-sizing: border-box;
    color: var(--nc-fg);
    background: var(--nc-tab-bg-active);
  }

  .settings-container {
    display: grid;
    grid-template-columns: 256px minmax(500px, 700px);
    gap: 8px;
    width: 100%;
    max-width: 1100px;
    height: 100%;
    margin: 0 auto;
    align-items: flex-start;
  }

  .settings-shell-root.compact .settings-container {
    grid-template-columns: 216px minmax(400px, 600px);
    gap: 8px;
  }

  .pane {
    height: 100%;
    box-sizing: border-box;
  }

  .pane-left {
    border-radius: 12px;
    background-color: var(--nc-level-0);
    border: 1px solid var(--nc-palette-border);
    overflow: hidden;
  }

  .pane-right {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    overflow: hidden;
  }

  .search-container {
    padding: 12px;
    background: var(--nc-level-0);
    border-radius: 8px;
    border: 1px solid var(--nc-palette-border);
  }

  .search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--nc-palette-border);
    border-radius: 6px;
    background: var(--nc-level-1);
    color: var(--nc-palette-text);
    font-size: 14px;
    outline: none;
    transition: border-color 0.12s ease;
  }

  .search-input:focus {
    border-color: var(--nc-level-4);
  }

  .search-input::placeholder {
    color: var(--nc-palette-text);
    opacity: 0.6;
  }

  .content-scrollable {
    border-radius: 8px;
    border: 1px solid var(--nc-palette-border);
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    background: var(--nc-level-0);
  }

  @media (max-width: 1200px) {
    .settings-container {
      grid-template-columns: 220px minmax(450px, 1fr);
      gap: 20px;
    }
  }

  @media (max-width: 900px) {
    .settings-shell-root {
      padding: 16px;
    }
    
    .settings-container {
      grid-template-columns: 180px minmax(350px, 1fr);
      gap: 12px;
    }
  }
</style>