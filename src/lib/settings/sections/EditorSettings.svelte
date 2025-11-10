<script lang="ts">
  /**
   * EditorSettings.svelte
   * Секция настроек редактора с glassmorphism-картами
   * 
   * Категории:
   * - Форматирование (Font, Size, Line Height)
   * - Поведение (Auto Save, Tab Size, Word Wrap)
   * - Дополнительно (Minimap, Line Numbers, Bracket Matching)
   */
  
  import { editorSettings } from '$lib/stores/editorSettingsStore';
  import Toggle from '../controls/Toggle.svelte';
  import RangeInput from '../controls/RangeInput.svelte';
  import CardSelect from '../controls/CardSelect.svelte';
  import { getSetting } from '../registry';
  import Icon from '$lib/common/Icon.svelte';

  // Опции для Font Family
  const fontFamilyOptions = [
    { value: 'JetBrains Mono', label: 'JetBrains Mono', icon: 'lucide:Code2', badge: 'Popular' },
    { value: 'Fira Code', label: 'Fira Code', icon: 'lucide:Code2' },
    { value: 'Monaco', label: 'Monaco', icon: 'lucide:Code2' },
    { value: 'Consolas', label: 'Consolas', icon: 'lucide:Code2' },
    { value: 'monospace', label: 'System Mono', icon: 'lucide:Monitor' }
  ];

  // Опции для Word Wrap
  const wordWrapOptions = [
    { value: 'off', label: 'Off', description: 'No wrapping' },
    { value: 'on', label: 'On', description: 'Wrap at viewport' },
    { value: 'wordWrapColumn', label: 'Column', description: 'Wrap at column' },
    { value: 'bounded', label: 'Bounded', description: 'Wrap at min(viewport, column)' }
  ];

  // Получаем определения настроек из registry
  const fontSizeDef = getSetting('editor.fontSize')!;
  const lineHeightDef = getSetting('editor.lineHeight')!;
  const tabSizeDef = getSetting('editor.tabSize')!;
  const autoSaveDef = getSetting('editor.autoSave')!;
  const minimapDef = getSetting('editor.minimap')!;
  const lineNumbersDef = getSetting('editor.lineNumbers')!;
  const bracketMatchingDef = getSetting('editor.bracketMatching')!;

  let customSettingsCount = $state(0);

  // Подсчёт кастомизированных настроек (для badge в навигации)
  $effect(() => {
    const settings = editorSettings.getSettings();
    customSettingsCount = Object.keys(settings).length;
  });
</script>

<div class="editor-settings">
  <!-- Форматирование -->
  <section class="settings-card">
    <div class="card-header">
      <Icon name="lucide:Type" size={20} />
      <div class="header-content">
        <h2>Форматирование</h2>
        <p class="subtitle">Настройки шрифта и отображения текста</p>
      </div>
    </div>

    <div class="settings-group">
      <div class="setting-item">
        <div class="setting-label">
          <label for="font-family">Семейство шрифтов</label>
          <span class="setting-description">Моноширинный шрифт для редактора кода</span>
        </div>
        <CardSelect
          definition={getSetting('editor.fontFamily')!}
          options={fontFamilyOptions}
          columns={3}
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <label for="font-size">Размер шрифта</label>
          <span class="setting-description">Размер текста в пикселях (12-24px)</span>
        </div>
        <RangeInput
          definition={fontSizeDef}
          min={12}
          max={24}
          step={1}
          showScale={true}
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <label for="line-height">Высота строки</label>
          <span class="setting-description">Множитель высоты строки (1.0-2.0)</span>
        </div>
        <RangeInput
          definition={lineHeightDef}
          min={1.0}
          max={2.0}
          step={0.1}
          showScale={true}
        />
      </div>
    </div>
  </section>

  <!-- Поведение -->
  <section class="settings-card">
    <div class="card-header">
      <Icon name="lucide:Settings" size={20} />
      <div class="header-content">
        <h2>Поведение</h2>
        <p class="subtitle">Автосохранение, табуляция и перенос строк</p>
      </div>
    </div>

    <div class="settings-group">
      <div class="setting-item">
        <div class="setting-label">
          <label for="auto-save">Автосохранение</label>
          <span class="setting-description">Автоматически сохранять файлы при изменении</span>
        </div>
        <Toggle definition={autoSaveDef} />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <label for="tab-size">Размер табуляции</label>
          <span class="setting-description">Количество пробелов для отступа (2-8)</span>
        </div>
        <RangeInput
          definition={tabSizeDef}
          min={2}
          max={8}
          step={1}
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <label for="word-wrap">Перенос строк</label>
          <span class="setting-description">Режим переноса длинных строк</span>
        </div>
        <CardSelect
          definition={getSetting('editor.wordWrap')!}
          options={wordWrapOptions}
          columns={2}
        />
      </div>
    </div>
  </section>

  <!-- Дополнительно -->
  <section class="settings-card">
    <div class="card-header">
      <Icon name="lucide:Wrench" size={20} />
      <div class="header-content">
        <h2>Дополнительно</h2>
        <p class="subtitle">Миникарта, нумерация строк и другие опции</p>
      </div>
    </div>

    <div class="settings-group">
      <div class="setting-item">
        <div class="setting-label">
          <label for="minimap">Миникарта</label>
          <span class="setting-description">Показывать миникарту кода справа</span>
        </div>
        <Toggle definition={minimapDef} />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <label for="line-numbers">Номера строк</label>
          <span class="setting-description">Показывать номера строк слева</span>
        </div>
        <Toggle definition={lineNumbersDef} />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <label for="bracket-matching">Подсветка скобок</label>
          <span class="setting-description">Выделять парные скобки</span>
        </div>
        <Toggle definition={bracketMatchingDef} />
      </div>
    </div>
  </section>
</div>

<style>
  .editor-settings {
    display: flex;
    flex-direction: column;
    gap: 32px;                            /* 8 * 4px - воздух между картами */
    padding: 24px;                        /* 6 * 4px */
    max-width: 900px;
    margin: 0 auto;
  }

  /* Glassmorphism карточка */
  .settings-card {
    background: linear-gradient(
      135deg,
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.7),
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.5)
    );
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;                  /* 4 * 4px */
    padding: 24px;                        /* 6 * 4px */
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

  /* Заголовок карточки */
  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;                            /* 4 * 4px */
    margin-bottom: 24px;                  /* 6 * 4px */
    padding-bottom: 16px;                 /* 4 * 4px */
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .header-content {
    flex: 1;
  }

  .card-header h2 {
    margin: 0;
    font-size: 20px;                      /* 5 * 4px */
    font-weight: 600;
    color: var(--nc-fg);
    letter-spacing: -0.01em;
  }

  .subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;                      /* 3.25 * 4px */
    color: var(--nc-fg-muted, rgba(255, 255, 255, 0.6));
    line-height: 1.4;
  }

  /* Группа настроек */
  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 24px;                            /* 6 * 4px */
  }

  /* Отдельная настройка */
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 12px;                            /* 3 * 4px */
  }

  .setting-label {
    display: flex;
    flex-direction: column;
    gap: 4px;                             /* 1 * 4px */
  }

  .setting-label label {
    font-size: 14px;                      /* 3.5 * 4px */
    font-weight: 500;
    color: var(--nc-fg);
  }

  .setting-description {
    font-size: 13px;                      /* 3.25 * 4px */
    color: var(--nc-fg-muted, rgba(255, 255, 255, 0.5));
    line-height: 1.4;
  }

  /* Адаптивность */
  @media (max-width: 768px) {
    .editor-settings {
      padding: 16px;
      gap: 24px;
    }

    .settings-card {
      padding: 16px;
    }

    .card-header h2 {
      font-size: 18px;
    }
  }
</style>
