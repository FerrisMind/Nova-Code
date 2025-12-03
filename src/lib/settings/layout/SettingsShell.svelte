<script lang="ts">
  // src/lib/settings/layout/SettingsShell.svelte
  // ----------------------------------------------------------------------------
  // Новый двухпанельный контейнер настроек с редизайном.
  //
  // Архитектура:
  // - Левая панель (280px): навигация с 2 главными секциями (Appearance, Editor)
  // - Правая панель: контент выбранной секции с подсекциями
  // - Sticky footer: Export/Import/Reset
  // - Inline search: live фильтрация настроек
  //
  // Адаптивность:
  // - < 768px: hamburger menu, навигация скрывается
  // ----------------------------------------------------------------------------

  import { createEventDispatcher, onMount } from 'svelte';
  import { Menu, X, Search } from '@lucide/svelte';
  import SettingsNav from '$lib/settings/layout/SettingsNav.svelte';
  import SettingsFooter from '$lib/settings/layout/SettingsFooter.svelte';
  import AppearanceSection from '$lib/settings/sections/AppearanceSection.svelte';
  import EditorSection from '$lib/settings/sections/EditorSection.svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { searchSettings } from '$lib/settings/registry';

  import type {
    SettingId,
    SettingDefinition,
    SettingsSectionDefinition
  } from '$lib/settings/types';

  // ---------------------------------------------------------------------------
  // Типы событий
  // ---------------------------------------------------------------------------
  
  type SettingsShellSectionChangeDetail = {
    sectionId: string;
  };

  const dispatch = createEventDispatcher<{
    sectionchange: SettingsShellSectionChangeDetail;
  }>();

  // ---------------------------------------------------------------------------
  // Публичные пропсы
  // ---------------------------------------------------------------------------

  interface SettingsShellProps {
    /** Уникальный ID для shell */
    id?: string;
    /** Начальная секция при открытии */
    initialSectionId?: 'appearance' | 'editor';
    /** Компактный режим (для встраивания в sidebar) */
    compactMode?: boolean;
  }

  let {
    id = undefined,
    initialSectionId = 'appearance',
    compactMode = false
  }: SettingsShellProps = $props();

  // ---------------------------------------------------------------------------
  // Локальное состояние
  // ---------------------------------------------------------------------------

  // Активная секция: 'appearance' или 'editor'
  let activeSectionId = $state<'appearance' | 'editor'>(initialSectionId);
  
  // Мобильное меню открыто/закрыто
  let mobileMenuOpen = $state(false);
  
  // Ширина viewport для адаптивности
  let windowWidth = $state(1024);
  
  // Контейнер для скролла
  let contentContainer: HTMLElement;
  
  // Поиск по настройкам
  let searchQuery = $state('');
  let searchResults = $state<ReturnType<typeof searchSettings>>([]);
  let isSearching = $state(false);

  // Проверка мобильного режима
  const isMobile = () => windowWidth < 768;
  
  // Debounce для поиска
  let searchTimeout: ReturnType<typeof setTimeout>;
  
  function handleSearch(query: string) {
    searchQuery = query;
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (!query.trim()) {
      isSearching = false;
      searchResults = [];
      return;
    }
    
    searchTimeout = setTimeout(() => {
      isSearching = true;
      searchResults = searchSettings(query, { limit: 10 });
    }, 150);
  }
  
  function clearSearch() {
    searchQuery = '';
    isSearching = false;
    searchResults = [];
  }

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  function handleSectionSelect(sectionId: 'appearance' | 'editor') {
    if (sectionId === activeSectionId) return;
    
    activeSectionId = sectionId;
    
    // Закрываем мобильное меню при выборе
    if (isMobile()) {
      mobileMenuOpen = false;
    }
    
    // Скроллим контент вверх
    if (contentContainer) {
      contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    dispatch('sectionchange', { sectionId });
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  // Слушаем resize для адаптивности
  onMount(() => {
    windowWidth = window.innerWidth;
    
    const handleResize = () => {
      windowWidth = window.innerWidth;
      // Закрываем мобильное меню при переходе на desktop
      if (!isMobile()) {
        mobileMenuOpen = false;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  // ---------------------------------------------------------------------------
  // Секции навигации
  // ---------------------------------------------------------------------------
  
  const navSections = [
    { id: 'appearance' as const, label: 'Appearance', icon: 'palette' },
    { id: 'editor' as const, label: 'Editor', icon: 'code' }
  ];
</script>

<div
  class="settings-shell-root"
  class:compact={compactMode}
  class:mobile={isMobile()}
  data-shell-id={id}
>
  <!-- Mobile Header with Hamburger -->
  {#if isMobile()}
    <header class="mobile-header">
      <button 
        class="hamburger-btn"
        onclick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        {#if mobileMenuOpen}
          <X size={24} />
        {:else}
          <Menu size={24} />
        {/if}
      </button>
      
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <span class="breadcrumb-item">Settings</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">
          {activeSectionId === 'appearance' ? 'Appearance' : 'Editor'}
        </span>
      </nav>
    </header>
  {/if}

  <div class="settings-layout">
    <!-- Левая панель: Навигация -->
    <aside 
      class="nav-panel"
      class:open={mobileMenuOpen}
      aria-label="Settings navigation"
    >
      <div class="nav-content">
        <!-- Заголовок (только desktop) -->
        {#if !isMobile()}
          <div class="nav-header">
            <h2 class="nav-title">Settings</h2>
          </div>
          
          <!-- Inline Search -->
          <div class="search-container">
            <div class="search-input-wrapper">
              <Search size={16} class="search-icon" />
              <input
                type="text"
                class="search-input"
                placeholder="Search settings..."
                value={searchQuery}
                oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
                onkeydown={(e) => e.key === 'Escape' && clearSearch()}
              />
              {#if searchQuery}
                <button class="search-clear" onclick={clearSearch} aria-label="Clear search">
                  <X size={14} />
                </button>
              {/if}
            </div>
            
            {#if isSearching && searchResults.length > 0}
              <div class="search-results">
                {#each searchResults as result (result.settingId)}
                  <button 
                    class="search-result-item"
                    onclick={() => {
                      // Переключиться на нужную секцию
                      if (result.category === 'appearance') {
                        handleSectionSelect('appearance');
                      } else {
                        handleSectionSelect('editor');
                      }
                      clearSearch();
                    }}
                  >
                    <span class="result-label">{result.label}</span>
                    <span class="result-section">{result.category}</span>
                  </button>
                {/each}
              </div>
            {/if}
            
            {#if isSearching && searchQuery && searchResults.length === 0}
              <div class="search-empty">
                No settings found
              </div>
            {/if}
          </div>
          
          <Separator class="nav-separator" />
        {/if}
        
        <!-- Навигация по секциям -->
        <SettingsNav
          sections={navSections}
          {activeSectionId}
          onselect={handleSectionSelect}
        />
      </div>
    </aside>

    <!-- Overlay для мобильного меню -->
    {#if isMobile() && mobileMenuOpen}
      <button 
        class="mobile-overlay"
        onclick={() => mobileMenuOpen = false}
        aria-label="Close menu"
        tabindex="-1"
      ></button>
    {/if}

    <!-- Правая панель: Контент -->
    <main 
      class="content-panel" 
      bind:this={contentContainer}
      id={`section-${activeSectionId}`}
      aria-labelledby={`tab-${activeSectionId}`}
    >
      <div class="content-inner">
        {#if activeSectionId === 'appearance'}
          <AppearanceSection />
        {:else if activeSectionId === 'editor'}
          <EditorSection />
        {/if}
      </div>
      
      <!-- Sticky Footer -->
      <SettingsFooter />
    </main>
  </div>
</div>

<style>
  /* =========================================================================
   * Settings Shell — Root Container
   * ========================================================================= */
  
  .settings-shell-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: var(--settings-space-md, 16px);
    background: var(--nc-level-1, hsl(var(--background)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
    overflow: hidden;
    box-sizing: border-box;
  }

  /* =========================================================================
   * Layout Grid
   * ========================================================================= */

  .settings-layout {
    display: grid;
    grid-template-columns: var(--settings-nav-width, 280px) 1fr;
    gap: var(--settings-space-md, 16px);
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* =========================================================================
   * Navigation Panel (Left)
   * ========================================================================= */

  .nav-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-xl, 16px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .nav-content {
    display: flex;
    flex-direction: column;
    padding: var(--settings-space-lg, 24px);
    gap: var(--settings-space-md, 16px);
  }

  .nav-header {
    padding-bottom: var(--settings-space-sm, 8px);
  }

  .nav-title {
    margin: 0;
    font-size: var(--settings-font-size-xl, 20px);
    font-weight: 600;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    letter-spacing: -0.02em;
  }

  :global(.nav-separator) {
    margin: var(--settings-space-sm, 8px) 0;
  }

  /* =========================================================================
   * Search
   * ========================================================================= */

  .search-container {
    position: relative;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.search-icon) {
    position: absolute;
    left: 12px;
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: var(--settings-space-sm, 10px) var(--settings-space-sm, 12px);
    padding-left: 36px;
    padding-right: 32px;
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-md, 8px);
    background: var(--nc-level-1, hsl(var(--background)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
    font-size: var(--settings-font-size-sm, 13px);
    outline: none;
    transition: 
      border-color var(--settings-transition-fast, 150ms),
      box-shadow var(--settings-transition-fast, 150ms);
  }

  .search-input:focus {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
    box-shadow: 0 0 0 3px hsl(var(--settings-primary, 217 91% 60%) / 0.15);
  }

  .search-input::placeholder {
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    opacity: 0.7;
  }

  .search-clear {
    position: absolute;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--nc-level-3, hsl(var(--muted)));
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    cursor: pointer;
    transition: background-color var(--settings-transition-fast, 150ms);
  }

  .search-clear:hover {
    background: var(--nc-level-4, hsl(var(--accent)));
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    margin-top: var(--settings-space-xs, 4px);
    padding: var(--settings-space-xs, 4px);
    background: var(--nc-level-0, hsl(var(--popover)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-md, 8px);
    box-shadow: var(--settings-shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
    max-height: 300px;
    overflow-y: auto;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--settings-space-sm, 8px) var(--settings-space-sm, 12px);
    border: none;
    border-radius: var(--settings-radius-sm, 6px);
    background: transparent;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    font-size: var(--settings-font-size-sm, 13px);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--settings-transition-fast, 150ms);
  }

  .search-result-item:hover {
    background: var(--nc-level-2, hsl(var(--accent)));
  }

  .result-label {
    font-weight: 500;
  }

  .result-section {
    font-size: var(--settings-font-size-xs, 11px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    text-transform: capitalize;
  }

  .search-empty {
    padding: var(--settings-space-md, 16px);
    text-align: center;
    font-size: var(--settings-font-size-sm, 13px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
  }

  /* =========================================================================
   * Content Panel (Right)
   * ========================================================================= */

  .content-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-xl, 16px);
  }

  .content-inner {
    flex: 1;
    padding: var(--settings-space-lg, 24px);
    padding-bottom: calc(var(--settings-space-lg, 24px) + 60px); /* Отступ для sticky footer */
    max-width: var(--settings-content-max-width, 900px);
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* =========================================================================
   * Mobile Styles
   * ========================================================================= */

  .settings-shell-root.mobile .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-shell-root.mobile .nav-panel {
    position: fixed;
    top: var(--settings-space-md, 16px);
    left: var(--settings-space-md, 16px);
    bottom: var(--settings-space-md, 16px);
    width: var(--settings-nav-width, 280px);
    z-index: 100;
    transform: translateX(calc(-100% - var(--settings-space-md, 16px)));
    transition: transform var(--settings-transition-normal, 200ms);
    box-shadow: var(--settings-shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
    border-radius: var(--settings-radius-xl, 16px);
  }

  .settings-shell-root.mobile .nav-panel.open {
    transform: translateX(0);
  }

  .mobile-header {
    display: flex;
    align-items: center;
    gap: var(--settings-space-md, 16px);
    padding: var(--settings-space-md, 16px);
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-xl, 16px);
    margin-bottom: var(--settings-space-md, 16px);
  }

  .hamburger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: var(--settings-radius-md, 8px);
    background: transparent;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    cursor: pointer;
    transition: background-color var(--settings-transition-fast, 150ms);
  }

  .hamburger-btn:hover {
    background: var(--nc-level-2, hsl(var(--accent)));
  }

  .hamburger-btn:focus-visible {
    outline: 2px solid hsl(var(--settings-primary, 217 91% 60%));
    outline-offset: 2px;
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 8px);
    font-size: var(--settings-font-size-sm, 13px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
  }

  .breadcrumb-item.active {
    color: var(--nc-palette-text, hsl(var(--foreground)));
    font-weight: 500;
  }

  .breadcrumb-separator {
    opacity: 0.5;
  }

  .mobile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 90;
    border: none;
    cursor: pointer;
    backdrop-filter: blur(2px);
  }

  /* =========================================================================
   * Compact Mode (for sidebar embedding)
   * ========================================================================= */

  .settings-shell-root.compact .settings-layout {
    grid-template-columns: 220px 1fr;
  }

  .settings-shell-root.compact .nav-content {
    padding: var(--settings-space-md, 16px);
  }

  .settings-shell-root.compact .content-inner {
    padding: var(--settings-space-lg, 24px);
  }

  /* =========================================================================
   * Scrollbar Styling
   * ========================================================================= */

  .nav-panel::-webkit-scrollbar,
  .content-panel::-webkit-scrollbar {
    width: 8px;
  }

  .nav-panel::-webkit-scrollbar-thumb,
  .content-panel::-webkit-scrollbar-thumb {
    background-color: var(--nc-level-3, hsl(var(--border)));
    border-radius: 4px;
  }

  .nav-panel::-webkit-scrollbar-track,
  .content-panel::-webkit-scrollbar-track {
    background: transparent;
  }
</style>
