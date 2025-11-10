<script lang="ts">
  /**
   * AppearanceSettings.svelte
   * Секция настроек внешнего вида
   * 
   * Категории:
   * - Тема (Dark/Light Mode, Color Palette)
   * - Цвета (Accent Color, Custom Colors)
   * - Интерфейс (UI Scale, Animation Speed)
   */
  
  import { theme } from '$lib/stores/themeStore';
  import Toggle from '../controls/Toggle.svelte';
  import RangeInput from '../controls/RangeInput.svelte';
  import CardSelect from '../controls/CardSelect.svelte';
  import { getSetting } from '../registry';
  import Icon from '$lib/common/Icon.svelte';
  import { PALETTES, type ThemePalette } from '$lib/stores/THEME_PALETTES';

  // Опции для темы (Light/Dark)
  const themeOptions = [
    { 
      value: 'dark', 
      label: 'Dark', 
      description: 'Тёмная тема',
      icon: 'lucide:Moon',
      backgroundColor: '#1a1a1e',
      textColor: '#e0e0e0'
    },
    { 
      value: 'light', 
      label: 'Light', 
      description: 'Светлая тема',
      icon: 'lucide:Sun',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1e'
    },
    { 
      value: 'auto', 
      label: 'Auto', 
      description: 'Следовать системе',
      icon: 'lucide:Monitor'
    }
  ];

  // Конвертация цветовых палитр в опции для CardSelect
  const paletteOptions = Object.entries(PALETTES).map(([key, palette]: [string, ThemePalette]) => ({
    value: key,
    label: palette.label || key,
    description: `${palette.textColor}`,
    backgroundColor: palette.backgroundPrimary,
    textColor: palette.textColor,
    badge: palette.label?.includes('Default') ? 'Default' : undefined
  }));

  // Получаем определения настроек
  const themeModeDef = getSetting('theme.mode')!;
  const accentColorDef = getSetting('theme.accentColor');
  
  let currentTheme = $state(theme.getState());
  
  $effect(() => {
    currentTheme = theme.getState();
  });
</script>

<div class="appearance-settings">
  <!-- Тема -->
  <section class="settings-card">
    <div class="card-header">
      <Icon name="lucide:Palette" size={20} />
      <div class="header-content">
        <h2>Тема</h2>
        <p class="subtitle">Выберите светлую или тёмную тему</p>
      </div>
    </div>

    <div class="settings-group">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Режим темы</span>
          <span class="setting-description">Тёмная, светлая или автоматический выбор</span>
        </div>
        <CardSelect
          definition={themeModeDef}
          options={themeOptions}
          columns={3}
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Цветовая палитра</span>
          <span class="setting-description">Предустановленные цветовые схемы</span>
        </div>
        <CardSelect
          definition={getSetting('theme.palette')!}
          options={paletteOptions}
          columns={2}
        />
      </div>
    </div>
  </section>

  <!-- Цвета -->
  <section class="settings-card">
    <div class="card-header">
      <Icon name="lucide:Droplet" size={20} />
      <div class="header-content">
        <h2>Цвета</h2>
        <p class="subtitle">Настройка акцентного цвета и других параметров</p>
      </div>
    </div>

    <div class="settings-group">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Акцентный цвет</span>
          <span class="setting-description">Основной цвет для выделения элементов</span>
        </div>
        <div class="color-preview-wrapper">
          <input
            type="color"
            class="color-picker"
            value={currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'}
            oninput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              accentColorDef?.set(target.value);
            }}
          />
          <span class="color-value">{currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'}</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Насыщенность</span>
          <span class="setting-description">Интенсивность цветов в интерфейсе (0-100%)</span>
        </div>
        <RangeInput
          definition={getSetting('theme.saturation')!}
          min={0}
          max={100}
          step={5}
          showScale={true}
        />
      </div>
    </div>
  </section>

  <!-- Интерфейс -->
  <section class="settings-card">
    <div class="card-header">
      <Icon name="lucide:Layout" size={20} />
      <div class="header-content">
        <h2>Интерфейс</h2>
        <p class="subtitle">Масштаб и скорость анимаций</p>
      </div>
    </div>

    <div class="settings-group">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Масштаб UI</span>
          <span class="setting-description">Размер элементов интерфейса (80-120%)</span>
        </div>
        <RangeInput
          definition={getSetting('appearance.uiScale')!}
          min={80}
          max={120}
          step={5}
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Скорость анимаций</span>
          <span class="setting-description">Длительность переходов и анимаций</span>
        </div>
        <CardSelect
          definition={getSetting('appearance.animationSpeed')!}
          options={[
            { value: 'slow', label: 'Slow', description: 'Медленно' },
            { value: 'normal', label: 'Normal', description: 'Нормально', badge: 'Default' },
            { value: 'fast', label: 'Fast', description: 'Быстро' },
            { value: 'none', label: 'None', description: 'Без анимаций' }
          ]}
          columns={2}
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label">Эффект размытия</span>
          <span class="setting-description">Glassmorphism эффекты в интерфейсе</span>
        </div>
        <Toggle definition={getSetting('appearance.blurEffects')!} />
      </div>
    </div>
  </section>

  <!-- Предпросмотр текущей темы -->
  <section class="settings-card theme-preview">
    <div class="card-header">
      <Icon name="lucide:Eye" size={20} />
      <div class="header-content">
        <h2>Предпросмотр</h2>
        <p class="subtitle">Как выглядит текущая тема</p>
      </div>
    </div>

    <div class="preview-container" style="
      background: {currentTheme.mode === 'dark' ? '#1a1a1e' : '#ffffff'};
      color: {currentTheme.mode === 'dark' ? '#e0e0e0' : '#1a1a1e'};
      border-color: {currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'};
    ">
      <div class="preview-header" style="background: {currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'};">
        <span>Title Bar</span>
      </div>
      <div class="preview-content">
        <div class="preview-sidebar" style="background: {currentTheme.mode === 'dark' ? '#252526' : '#f3f3f3'};">
          <div class="preview-item active" style="background: {currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'}20;">Active Item</div>
          <div class="preview-item">Item 2</div>
          <div class="preview-item">Item 3</div>
        </div>
        <div class="preview-editor">
          <div class="preview-code">
            <span style="color: {currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'};">function</span> hello() {'{'}
            <br />
            &nbsp;&nbsp;<span style="color: {currentTheme.mode === 'dark' ? '#e0e0e0' : '#1a1a1e'}80;">console.log</span>(<span style="color: {currentTheme.mode === 'dark' ? '#007ACC' : '#0066CC'};">"Hello Nova!"</span>);
            <br />
            {'}'}
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .appearance-settings {
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding: 24px;
    max-width: 900px;
    margin: 0 auto;
  }

  .settings-card {
    background: linear-gradient(
      135deg,
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.7),
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.5)
    );
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 
      0 4px 6px rgba(0, 0, 0, 0.1),
      0 1px 3px rgba(0, 0, 0, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 0.05);
    transition: all 0.3s cubic-bezier(0.33, 0.02, 0.11, 0.99);
  }

  .settings-card:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 12px rgba(0, 0, 0, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 1px rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .header-content {
    flex: 1;
  }

  .card-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--nc-fg);
    letter-spacing: -0.01em;
  }

  .subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: var(--nc-fg-muted, rgba(255, 255, 255, 0.6));
    line-height: 1.4;
  }

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .setting-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-label .label {
    font-size: 14px;
    font-weight: 500;
    color: var(--nc-fg);
  }

  .setting-description {
    font-size: 13px;
    color: var(--nc-fg-muted, rgba(255, 255, 255, 0.5));
    line-height: 1.4;
  }

  /* Color Picker */
  .color-preview-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .color-picker {
    width: 80px;
    height: 40px;
    border: 2px solid var(--nc-border, rgba(255, 255, 255, 0.1));
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .color-picker:hover {
    border-color: var(--nc-accent, #007ACC);
    transform: scale(1.05);
  }

  .color-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: var(--nc-fg-muted);
    text-transform: uppercase;
  }

  /* Theme Preview */
  .theme-preview {
    background: linear-gradient(
      135deg,
      rgba(var(--nc-accent-rgb, 0, 122, 204), 0.05),
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.5)
    );
  }

  .preview-container {
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .preview-header {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    color: white;
  }

  .preview-content {
    display: flex;
    height: 200px;
  }

  .preview-sidebar {
    width: 180px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-item {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    transition: all 0.2s ease;
  }

  .preview-item.active {
    font-weight: 500;
  }

  .preview-editor {
    flex: 1;
    padding: 16px;
    font-family: 'JetBrains Mono', monospace;
  }

  .preview-code {
    font-size: 13px;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .appearance-settings {
      padding: 16px;
      gap: 24px;
    }

    .settings-card {
      padding: 16px;
    }

    .card-header h2 {
      font-size: 18px;
    }

    .preview-content {
      flex-direction: column;
      height: auto;
    }

    .preview-sidebar {
      width: 100%;
    }
  }
</style>
