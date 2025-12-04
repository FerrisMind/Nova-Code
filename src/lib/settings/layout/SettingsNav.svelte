<script lang="ts">
  // src/lib/settings/layout/SettingsNav.svelte
  // ----------------------------------------------------------------------------
  // Упрощённая навигация для страницы настроек.
  //
  // Две главные секции:
  // - Appearance (тема, палитра, профили, импорт/экспорт)
  // - Editor (все настройки редактора в аккордеонах)
  //
  // Особенности:
  // - Иконки Lucide для каждой секции
  // - Активное состояние с подсветкой
  // - Keyboard navigation (Enter, Space)
  // - Минималистичный дизайн
  // ----------------------------------------------------------------------------

  import { Palette, Code2 } from '@lucide/svelte';

  // ---------------------------------------------------------------------------
  // Типы
  // ---------------------------------------------------------------------------

  interface NavSection {
    id: 'appearance' | 'editor';
    label: string;
    icon: string;
  }

  interface SettingsNavProps {
    sections: NavSection[];
    activeSectionId: 'appearance' | 'editor';
    onselect: (sectionId: 'appearance' | 'editor') => void;
  }

  let { sections, activeSectionId, onselect }: SettingsNavProps = $props();

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  function handleClick(sectionId: 'appearance' | 'editor') {
    onselect(sectionId);
  }

  function handleKeydown(event: KeyboardEvent, sectionId: 'appearance' | 'editor', index: number) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onselect(sectionId);
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusItem(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(sections.length - 1);
        break;
    }
  }

  function focusItem(index: number) {
    const clampedIndex = Math.max(0, Math.min(index, sections.length - 1));
    const buttons = document.querySelectorAll<HTMLButtonElement>('.nav-button');
    buttons[clampedIndex]?.focus();
  }

  // Получаем компонент иконки по id
  function getIcon(iconId: string) {
    switch (iconId) {
      case 'palette':
        return Palette;
      case 'code':
        return Code2;
      default:
        return Palette;
    }
  }
</script>

<nav class="settings-nav" aria-label="Settings sections">
  <ul class="nav-list" role="tablist" aria-orientation="vertical">
    {#each sections as section, index (section.id)}
      {@const isActive = section.id === activeSectionId}
      {@const IconComponent = getIcon(section.icon)}

      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-button"
          class:active={isActive}
          role="tab"
          aria-selected={isActive}
          aria-controls={`section-${section.id}`}
          tabindex={isActive ? 0 : -1}
          onclick={() => handleClick(section.id)}
          onkeydown={(e) => handleKeydown(e, section.id, index)}
        >
          <span class="nav-icon">
            <IconComponent size={18} />
          </span>
          <span class="nav-label">{section.label}</span>

          {#if isActive}
            <span class="nav-indicator" aria-hidden="true"></span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .settings-nav {
    display: flex;
    flex-direction: column;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-xs, 4px);
  }

  .nav-item {
    margin: 0;
  }

  .nav-button {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 12px);
    width: 100%;
    padding: var(--settings-space-sm, 12px) var(--settings-space-md, 16px);
    border: none;
    border-radius: var(--settings-radius-md, 8px);
    background: transparent;
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    font-size: var(--settings-font-size-base, 14px);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    position: relative;
    transition:
      background-color var(--settings-transition-fast, 150ms),
      color var(--settings-transition-fast, 150ms);
  }

  .nav-button:hover {
    background: var(--nc-level-2, hsl(var(--accent)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
  }

  .nav-button:focus-visible {
    outline: 2px solid hsl(var(--settings-primary, 217 91% 60%));
    outline-offset: 2px;
  }

  .nav-button.active {
    background: var(--nc-level-2, hsl(var(--accent)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: inherit;
    opacity: 0.8;
  }

  .nav-button.active .nav-icon {
    opacity: 1;
    color: hsl(var(--settings-primary, 217 91% 60%));
  }

  .nav-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 24px;
    background: hsl(var(--settings-primary, 217 91% 60%));
    border-radius: 0 2px 2px 0;
  }

  /* Hover state enhancements */
  .nav-button:hover .nav-icon {
    opacity: 1;
  }

  /* Focus within for accessibility */
  .nav-list:focus-within .nav-button:not(:focus-visible) {
    opacity: 0.8;
  }

  .nav-list:focus-within .nav-button:focus-visible {
    opacity: 1;
  }
</style>
