<script lang="ts">
  // src/lib/settings/layout/SettingsShell.svelte
  // ----------------------------------------------------------------------------
  // Трехпанельный контейнер настроек (SettingsShell).
  //
  // В рамках данного subtasks:
  // - Использует settingsRegistry как источник секций и SettingDefinition.
  // - Рендерит:
  //   - слева: SettingsNav (список секций),
  //   - по центру: SettingsContent (список настроек выбранной секции),
  //   - справа: SettingsPreview (данные активной настройки).
  // - Поддерживает:
  //   - initialSectionId / initialSettingId / externalSelection;
  //   - compactMode (компактный вид для sidebar);
  //   - showPreviewPane (управление правой панелью).
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
  import SettingsContent from '$lib/settings/layout/SettingsContent.svelte';
  import SettingsPreview from '$lib/settings/layout/SettingsPreview.svelte';

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

  // undefined — автоматический режим; true/false — форс отображения превью.
  export let showPreviewPane: boolean | undefined = undefined;

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

  // Плейсхолдеры для dirty-счетчиков (реальная логика будет в settingsStore).
  const emptyDirtySection: Record<string, number> = {};
  const emptyDirtySetting: Record<string, number> = {};

  // Связанные настройки для превью (reactive)
  let relatedSettings: SettingDefinition[] = [];

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

    // Обновляем relatedSettings для превью.
    if (activeSettingDefinition) {
      relatedSettings = activeSectionSettings.filter(
        (s) => s.id !== activeSettingDefinition!.id
      );
    } else {
      relatedSettings = [];
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
    relatedSettings = [];

    dispatch('sectionchange', {
      sectionId: section.id,
      section
    });

    emitBusSectionFocused(section.id);
  }

  function handleSettingFocus(event: CustomEvent<{ settingId: string }>) {
    const settingId = event.detail.settingId;
    const def = getSetting(settingId);
    if (!def) return;

    activeSettingId = def.id;
    activeSettingDefinition = def;

    activeSectionId = def.section;
    activeSection = getSectionById(def.section);
    activeSectionSettings = activeSection
      ? getSettingsBySection(activeSection.id)
      : [];

    relatedSettings = activeSectionSettings.filter((s) => s.id !== def.id);

    dispatch('settingfocus', {
      settingId: def.id,
      sectionId: def.section,
      definition: def
    });

    emitBusSettingFocused(def.id);
  }

  function handleSettingClick(event: CustomEvent<{ settingId: string }>) {
    const settingId = event.detail.settingId;
    const def = getSetting(settingId);
    if (!def) return;

    activeSettingId = def.id;
    activeSettingDefinition = def;
    relatedSettings = activeSectionSettings.filter((s) => s.id !== def.id);
  }

  // ---------------------------------------------------------------------------
  // Решение о видимости правой панели превью
  // ---------------------------------------------------------------------------

  let shouldShowPreview = false;

  $: {
    if (showPreviewPane === true) {
      shouldShowPreview = true;
    } else if (showPreviewPane === false) {
      shouldShowPreview = false;
    } else {
      // Автоматический режим:
      // - в compactMode по умолчанию скрываем превью,
      // - иначе показываем, только если есть активная настройка.
      shouldShowPreview = !compactMode && !!activeSettingDefinition;
    }
  }

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

  <!-- Центральная панель: настройки выбранной секции -->
  <div class="pane pane-center">
    <SettingsContent
      section={activeSection}
      settings={activeSectionSettings}
      activeSettingId={activeSettingId}
      dirtyBySetting={emptyDirtySetting}
      on:settingfocus={handleSettingFocus}
      on:settingclick={handleSettingClick}
    />
  </div>

  <!-- Правая панель: превью активной настройки -->
  {#if shouldShowPreview}
    <div class="pane pane-right">
      <SettingsPreview
        activeSettingDefinition={activeSettingDefinition}
        relatedSettings={relatedSettings}
        helpText={undefined}
      />
    </div>
  {/if}
</div>

<style>
  .settings-shell-root {
    display: grid;
    grid-template-rows: 1fr;
    gap: 8px;
    width: 100%;
    height: 100%;
    padding: 8px;
    box-sizing: border-box;
    color: var(--nc-fg);
    background:
      radial-gradient(
        circle at top left,
        rgba(129, 140, 248, 0.05),
        transparent
      ),
      var(--nc-bg);
    backdrop-filter: blur(12px);
  }

  .settings-shell-root.full {
    grid-template-columns: 210px minmax(0, 1.9fr) 300px;
  }

  .settings-shell-root.compact {
    grid-template-columns: 190px minmax(0, 2.2fr) auto;
    padding: 6px;
    gap: 6px;
  }

  .pane {
    height: 100%;
    box-sizing: border-box;
  }

  .pane-left {
    border-radius: 10px;
    background-color: rgba(10, 16, 25, 0.98);
    box-shadow:
      0 14px 30px rgba(15, 23, 42, 0.66),
      inset 0 0 0 1px rgba(15, 23, 42, 0.96);
    overflow: hidden;
  }

  .pane-center {
    min-width: 0;
  }

  .pane-right {
    min-width: 0;
  }

  .settings-shell-root.compact .pane-right {
    max-width: 260px;
  }

  @media (max-width: 900px) {
    .settings-shell-root.full {
      grid-template-columns: 180px minmax(0, 1.8fr) 260px;
    }
  }
</style>