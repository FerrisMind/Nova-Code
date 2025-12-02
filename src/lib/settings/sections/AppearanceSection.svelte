<script lang="ts">
  // src/lib/settings/sections/AppearanceSection.svelte
  // ----------------------------------------------------------------------------
  // Секция Appearance — внешний вид приложения.
  //
  // Подсекции (h2):
  // - Theme & Palette — выбор темы и цветовой палитры
  // - Profiles — управление профилями настроек
  // - Import & Export — кнопки импорта/экспорта (дублируются из footer для контекста)
  //
  // Использует CardSelect для визуальных настроек с preview.
  // ----------------------------------------------------------------------------

  import { Palette, User, Plus, Trash2, Check, Sun, Moon } from '@lucide/svelte';
  import { Separator } from '$lib/components/ui/separator';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import CardSelect from '$lib/settings/controls/CardSelect.svelte';
  import ProfileCard from '$lib/settings/controls/ProfileCard.svelte';
  import SaveIndicator from '$lib/settings/controls/SaveIndicator.svelte';
  import { getSetting } from '$lib/settings/registry';
  import { theme } from '$lib/stores/themeStore';
  import { settingsProfilesStore } from '$lib/stores/settingsProfilesStore';
  import {
    PALETTES,
    listPalettesByMode,
    type ThemePalette
  } from '$lib/stores/THEME_PALETTES';

  // ---------------------------------------------------------------------------
  // Состояние
  // ---------------------------------------------------------------------------

  // Состояние профилей
  let profilesState = $state<{ profiles: any[]; activeProfileId: string | null }>({ 
    profiles: [], 
    activeProfileId: null 
  });
  
  // Отслеживаем изменения темы для обновления палитр
  let currentTheme = $state(theme.getState());
  
  // Индикатор сохранения для темы
  let themeSaveVisible = $state(false);
  let paletteSaveVisible = $state(false);

  // Подписка на theme store
  $effect(() => {
    const unsubscribe = theme.subscribe((state) => {
      currentTheme = state;
    });
    return unsubscribe;
  });

  // Подписка на profiles store
  $effect(() => {
    const unsubscribe = settingsProfilesStore.subscribe((state) => {
      profilesState = {
        profiles: state.profiles ?? [],
        activeProfileId: state.activeProfileId
      };
    });
    return unsubscribe;
  });

  // ---------------------------------------------------------------------------
  // Определения настроек из registry
  // ---------------------------------------------------------------------------

  const themeModeDef = getSetting('theme.mode');
  const themePaletteDef = getSetting('theme.palette');

  // ---------------------------------------------------------------------------
  // Опции для CardSelect
  // ---------------------------------------------------------------------------

  // Опции темы (Light/Dark)
  const themeModeOptions = [
    { 
      value: false, 
      label: 'Light', 
      description: 'Светлая тема',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1e'
    },
    { 
      value: true, 
      label: 'Dark', 
      description: 'Тёмная тема',
      backgroundColor: '#1a1a1e',
      textColor: '#e0e0e0'
    }
  ];

  // Динамические опции палитры на основе текущего режима
  const getPaletteOptions = () => {
    const palettes = listPalettesByMode(currentTheme.mode);
    return palettes.map((palette) => ({
      value: palette.id,
      label: palette.label,
      description: palette.label,
      backgroundColor: palette.backgroundPrimary,
      textColor: palette.textColor,
      // Передаём все уровни для мини-UI preview
      levels: palette.backgroundLevels,
      levelMinus1: palette.backgroundLevelMinus1
    }));
  };

  // ---------------------------------------------------------------------------
  // Обработчики изменений с индикатором сохранения
  // ---------------------------------------------------------------------------

  function handleThemeModeChange(isDark: boolean) {
    const newMode = isDark ? 'dark' : 'light';
    theme.setTheme(newMode);
    themeSaveVisible = true;
  }

  function handlePaletteChange() {
    paletteSaveVisible = true;
  }

  // ---------------------------------------------------------------------------
  // Профили
  // ---------------------------------------------------------------------------

  async function createProfile() {
    const name = prompt('Название профиля:');
    if (name && settingsProfilesStore.createProfileFromCurrent) {
      await settingsProfilesStore.createProfileFromCurrent({ label: name });
    }
  }

  async function applyProfile(profileId: string) {
    if (settingsProfilesStore.applyProfile) {
      await settingsProfilesStore.applyProfile(profileId);
    }
  }

  async function deleteProfile(profileId: string) {
    if (confirm('Удалить этот профиль?') && settingsProfilesStore.deleteProfile) {
      await settingsProfilesStore.deleteProfile(profileId);
    }
  }
</script>

<div class="appearance-section">
  <!-- =========================================================================
       Theme & Palette
       ========================================================================= -->
  <section class="settings-subsection" id="theme-palette">
    <header class="subsection-header">
      <div class="header-icon">
        <Palette size={20} />
      </div>
      <div class="header-content">
        <h2 class="subsection-title">Theme & Palette</h2>
        <p class="subsection-description">
          Выберите цветовую тему и палитру для интерфейса
        </p>
      </div>
    </header>

    <div class="settings-group">
      <!-- Theme Mode -->
      <div class="setting-row">
        <div class="setting-info">
          <label class="setting-label">Color Theme</label>
          <p class="setting-description">
            Переключение между светлой и тёмной темами
          </p>
        </div>
        <div class="setting-control">
          <div class="theme-switcher" role="radiogroup" aria-label="Color theme">
            <button
              type="button"
              class="theme-option"
              class:active={currentTheme.mode === 'light'}
              role="radio"
              aria-checked={currentTheme.mode === 'light'}
              onclick={() => handleThemeModeChange(false)}
            >
              <Sun size={16} />
              <span>Light</span>
            </button>
            <button
              type="button"
              class="theme-option"
              class:active={currentTheme.mode === 'dark'}
              role="radio"
              aria-checked={currentTheme.mode === 'dark'}
              onclick={() => handleThemeModeChange(true)}
            >
              <Moon size={16} />
              <span>Dark</span>
            </button>
          </div>
          <SaveIndicator visible={themeSaveVisible} compact onHide={() => themeSaveVisible = false} />
        </div>
      </div>

      <!-- Color Palette -->
      {#if themePaletteDef}
        <div class="setting-row setting-row--full">
          <div class="setting-info">
            <label class="setting-label">Color Palette</label>
            <p class="setting-description">
              Цветовая схема для выбранной темы
            </p>
          </div>
          <div class="setting-control setting-control--cards">
            <CardSelect
              definition={themePaletteDef}
              options={getPaletteOptions()}
              columns={3}
              on:change={handlePaletteChange}
            />
            <SaveIndicator visible={paletteSaveVisible} compact onHide={() => paletteSaveVisible = false} />
          </div>
        </div>
      {/if}
    </div>
  </section>

  <Separator class="section-separator" />

  <!-- =========================================================================
       Profiles
       ========================================================================= -->
  <section class="settings-subsection" id="profiles">
    <header class="subsection-header">
      <div class="header-icon">
        <User size={20} />
      </div>
      <div class="header-content">
        <h2 class="subsection-title">Profiles</h2>
        <p class="subsection-description">
          Сохраняйте и переключайтесь между наборами настроек
        </p>
      </div>
    </header>

    <div class="profiles-grid">
      {#if profilesState.profiles && profilesState.profiles.length > 0}
        {#each profilesState.profiles as profile (profile.id)}
          <ProfileCard
            {profile}
            isActive={profile.id === profilesState.activeProfileId}
            onApply={() => applyProfile(profile.id)}
            onDelete={() => deleteProfile(profile.id)}
          />
        {/each}
      {/if}

      <!-- Create New Profile Card -->
      <button class="profile-card profile-card--create" onclick={createProfile}>
        <Plus size={24} />
        <span>Create Profile</span>
      </button>
    </div>

    {#if !profilesState.profiles || profilesState.profiles.length === 0}
      <p class="empty-state">
        Профилей пока нет. Создайте первый профиль, чтобы сохранить текущие настройки.
      </p>
    {/if}
  </section>
</div>

<style>
  .appearance-section {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-xl, 32px);
  }

  /* =========================================================================
   * Subsection
   * ========================================================================= */

  .settings-subsection {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-lg, 24px);
  }

  .subsection-header {
    display: flex;
    align-items: flex-start;
    gap: var(--settings-space-md, 16px);
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--settings-radius-md, 8px);
    background: hsl(var(--settings-primary, 217 91% 60%) / 0.1);
    color: hsl(var(--settings-primary, 217 91% 60%));
    flex-shrink: 0;
  }

  .header-content {
    flex: 1;
  }

  .subsection-title {
    margin: 0;
    font-size: var(--settings-font-size-xl, 20px);
    font-weight: 600;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    letter-spacing: -0.01em;
  }

  .subsection-description {
    margin: var(--settings-space-xs, 4px) 0 0;
    font-size: var(--settings-font-size-sm, 13px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    line-height: 1.5;
  }

  :global(.section-separator) {
    margin: var(--settings-space-sm, 8px) 0;
  }

  /* =========================================================================
   * Settings Group & Row
   * ========================================================================= */

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-lg, 24px);
  }

  .setting-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--settings-space-lg, 24px);
    padding: var(--settings-space-md, 16px);
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-lg, 12px);
    transition: border-color var(--settings-transition-fast, 150ms);
  }

  .setting-row:hover {
    border-color: var(--nc-level-4, hsl(var(--border)));
  }

  .setting-row--full {
    flex-direction: column;
    align-items: stretch;
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }

  .setting-label {
    display: block;
    font-size: var(--settings-font-size-base, 14px);
    font-weight: 500;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    margin-bottom: var(--settings-space-xs, 4px);
  }

  .setting-description {
    margin: 0;
    font-size: var(--settings-font-size-sm, 13px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    line-height: 1.4;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 8px);
    flex-shrink: 0;
  }

  .setting-control--cards {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    margin-top: var(--settings-space-md, 16px);
  }

  /* =========================================================================
   * Theme Switcher
   * ========================================================================= */

  .theme-switcher {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--nc-level-2, hsl(var(--muted)));
    border-radius: var(--settings-radius-md, 8px);
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: var(--settings-radius-sm, 6px);
    background: transparent;
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    font-size: var(--settings-font-size-sm, 13px);
    font-weight: 500;
    cursor: pointer;
    transition: 
      background-color var(--settings-transition-fast, 150ms),
      color var(--settings-transition-fast, 150ms),
      box-shadow var(--settings-transition-fast, 150ms);
  }

  .theme-option:hover:not(.active) {
    color: var(--nc-palette-text, hsl(var(--foreground)));
  }

  .theme-option.active {
    background: var(--nc-level-0, hsl(var(--card)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
    box-shadow: var(--settings-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
  }

  .theme-option:focus-visible {
    outline: 2px solid hsl(var(--settings-primary, 217 91% 60%));
    outline-offset: 1px;
  }

  /* =========================================================================
   * Profiles Grid
   * ========================================================================= */

  .profiles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--settings-space-md, 16px);
  }

  .profile-card--create {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--settings-space-sm, 8px);
    min-height: 120px;
    padding: var(--settings-space-lg, 24px);
    border: 2px dashed var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-lg, 12px);
    background: transparent;
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    font-size: var(--settings-font-size-sm, 13px);
    cursor: pointer;
    transition: 
      border-color var(--settings-transition-fast, 150ms),
      color var(--settings-transition-fast, 150ms),
      background-color var(--settings-transition-fast, 150ms);
  }

  .profile-card--create:hover {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
    color: hsl(var(--settings-primary, 217 91% 60%));
    background: hsl(var(--settings-primary, 217 91% 60%) / 0.05);
  }

  .profile-card--create:focus-visible {
    outline: 2px solid hsl(var(--settings-primary, 217 91% 60%));
    outline-offset: 2px;
  }

  .empty-state {
    text-align: center;
    padding: var(--settings-space-lg, 24px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    font-size: var(--settings-font-size-sm, 13px);
  }

</style>

