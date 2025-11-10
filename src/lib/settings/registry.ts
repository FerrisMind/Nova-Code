// src/lib/settings/registry.ts
// -----------------------------------------------------------------------------
// Минимальная, полностью рабочая реализация реестра настроек Nova Code.
// Соответствует контракту из [`registry.api.md`](src/lib/settings/registry.api.md:1)
// и опирается только на реальные сторы / существующие поля.
//
// Цели:
// - Единый источник правды для секций и настроек.
// - Без побочных эффектов при импорте (только статические структуры и чистые get/set).
// - Только реальные настройки: theme.mode, theme.palette, editor.* из editorSettingsStore.
//
// В дальнейшем может быть расширен без ломки публичного API.
// Для разработки/расширения рекомендуется сверяться с актуальной документацией
// Svelte и сопутствующих библиотек через Context7.
//
// -----------------------------------------------------------------------------

import type {
  SettingId,
  SettingValue,
  SettingDefinition,
  SettingsSectionDefinition,
  SettingsSearchResult
} from '$lib/settings/types';
import { editorSettings } from '$lib/stores/editorSettingsStore';
import { theme } from '$lib/stores/themeStore';
import {
  type ThemePaletteId,
  listPalettesByMode
} from '$lib/stores/THEME_PALETTES';

// -----------------------------------------------------------------------------
// Локальные типы по контракту
// -----------------------------------------------------------------------------

export type SectionId = string;

export interface SettingsSearchOptions {
  sectionId?: SectionId;
  categoryId?: string;
  limit?: number;
}

export interface SettingsRegistry {
  // Секции
  getSections(): SettingsSectionDefinition[];
  getSectionById(id: SectionId): SettingsSectionDefinition | undefined;

  // Настройки
  getSetting(id: SettingId): SettingDefinition | undefined;
  getSettingsBySection(sectionId: SectionId): SettingDefinition[];
  listAllSettings(): SettingDefinition[];

  // Утилиты
  isKnownSetting(id: SettingId): boolean;

  // Поиск
  search(query: string, options?: SettingsSearchOptions): SettingsSearchResult[];
}

// -----------------------------------------------------------------------------
// Статические описания секций
// -----------------------------------------------------------------------------
//
// Секции подобраны минимально, чтобы покрыть реальные настройки тем и редактора.
// Идентификаторы и структура согласованы с архитектурой трехпанельного layout.

const sections: SettingsSectionDefinition[] = [
  {
    id: 'appearance.theme',
    label: 'Theme & Palette',
    category: 'appearance',
    order: 10,
    settings: ['theme.mode', 'theme.palette']
  },
  {
    id: 'editor.core',
    label: 'Editor Basics',
    category: 'editor',
    order: 20,
    settings: ['editor.theme', 'editor.fontSize', 'editor.fontFamily', 'editor.fontLigatures']
  },
  {
    id: 'editor.layout',
    label: 'Editor Layout',
    category: 'editor',
    order: 30,
    settings: [
      'editor.tabSize',
      'editor.insertSpaces',
      'editor.renderWhitespace',
      'editor.wordWrap',
      'editor.wordWrapColumn'
    ]
  },
  {
    id: 'editor.ui',
    label: 'Editor UI',
    category: 'editor',
    order: 40,
    settings: [
      'editor.minimap',
      'editor.folding',
      'editor.lineNumbers',
      'editor.bracketPairColorization'
    ]
  }
];

// -----------------------------------------------------------------------------
// Статические описания настроек (минимальный реальный subset)
// -----------------------------------------------------------------------------
//
// ВАЖНО:
// - Каждый SettingDefinition.get()/set() использует реальные публичные методы стора.
// - Никаких фиктивных id или несуществующих полей.
// - Значения читаются синхронно через getState()/getSettings() или подписки,
//   уже инкапсулированные внутри самих стора.

const settings: SettingDefinition[] = [
  // ---------------------------------------------------------------------------
  // Appearance / Theme
  // ---------------------------------------------------------------------------
  {
    id: 'theme.mode',
    label: 'Цветовая тема',
    description: 'Переключение между светлой и тёмной темами интерфейса.',
    category: 'appearance',
    section: 'appearance.theme',
    order: 10,
    control: 'select',
    options: [
      { value: 'light', label: 'Светлая' },
      { value: 'dark', label: 'Тёмная' }
    ],
    get: () => theme.getState().mode,
    set: (value: SettingValue) => {
      const mode = value === 'light' ? 'light' : 'dark';
      theme.setTheme(mode);
    }
  },
  {
    id: 'theme.palette',
    label: 'Цветовая палитра',
    description:
      'Выберите утверждённую палитру фона и текста для текущей темы. Доступные варианты зависят от светлого/тёмного режима.',
    category: 'appearance',
    section: 'appearance.theme',
    order: 20,
    control: 'select',
    // Опции вычисляются на основе текущего режима темы.
    // Значения строго соответствуют ThemePaletteId из THEME_PALETTES.ts.
    get: () => theme.getState().palette,
    set: (value: SettingValue) => {
      theme.setPalette(String(value) as ThemePaletteId);
    },
    options: (() => {
      // Опции включают только валидные ThemePaletteId.
      // Карточки палитр будут визуально использовать цвета через CardSelect.
      const light = listPalettesByMode('light');
      const dark = listPalettesByMode('dark');
      return [
        ...light.map((p) => ({
          value: p.id as ThemePaletteId,
          label: p.label,
          // Мини-превью для светлой палитры
          backgroundColor: p.backgroundPrimary,
          textColor: p.textColor
        })),
        ...dark.map((p) => ({
          value: p.id as ThemePaletteId,
          label: p.label,
          // Мини-превью для тёмной палитры
          backgroundColor: p.backgroundPrimary,
          textColor: p.textColor
        }))
      ];
    })()
  },

  // ---------------------------------------------------------------------------
  // Editor core
  // ---------------------------------------------------------------------------
  {
    id: 'editor.theme',
    label: 'Editor Theme',
    description: 'Monaco editor color theme id.',
    category: 'editor',
    section: 'editor.core',
    order: 10,
    control: 'select',
    get: () => editorSettings.getSettings().theme,
    set: (value: SettingValue) => {
      editorSettings.setTheme(String(value));
    }
  },
  {
    id: 'editor.fontSize',
    label: 'Font Size',
    description: 'Font size in the code editor (px).',
    category: 'editor',
    section: 'editor.core',
    order: 20,
    control: 'slider',
    get: () => editorSettings.getSettings().fontSize,
    set: (value: SettingValue) => {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      editorSettings.setFontSize(Number.isFinite(n) ? n : editorSettings.getSettings().fontSize);
    }
  },
  {
    id: 'editor.fontFamily',
    label: 'Font Family',
    description: 'CSS font-family used in the editor.',
    category: 'editor',
    section: 'editor.core',
    order: 30,
    control: 'text',
    get: () => editorSettings.getSettings().fontFamily,
    set: (value: SettingValue) => {
      editorSettings.setFontFamily(String(value));
    }
  },
  {
    id: 'editor.fontLigatures',
    label: 'Font Ligatures',
    description: 'Toggle font ligatures in the editor.',
    category: 'editor',
    section: 'editor.core',
    order: 40,
    control: 'boolean',
    get: () => editorSettings.getSettings().fontLigatures,
    set: (value: SettingValue) => {
      editorSettings.setFontLigatures(Boolean(value));
    }
  },

  // ---------------------------------------------------------------------------
  // Editor layout / behavior
  // ---------------------------------------------------------------------------
  {
    id: 'editor.tabSize',
    label: 'Tab Size',
    description: 'Number of spaces per tab.',
    category: 'editor',
    section: 'editor.layout',
    order: 10,
    control: 'slider',
    get: () => editorSettings.getSettings().tabSize,
    set: (value: SettingValue) => {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      editorSettings.setTabSize(Number.isFinite(n) ? n : editorSettings.getSettings().tabSize);
    }
  },
  {
    id: 'editor.insertSpaces',
    label: 'Insert Spaces',
    description: 'Use spaces instead of tab characters.',
    category: 'editor',
    section: 'editor.layout',
    order: 20,
    control: 'boolean',
    get: () => editorSettings.getSettings().insertSpaces,
    set: (value: SettingValue) => {
      editorSettings.setInsertSpaces(Boolean(value));
    }
  },
  {
    id: 'editor.renderWhitespace',
    label: 'Render Whitespace',
    description: 'Controls how whitespace is rendered in the editor.',
    category: 'editor',
    section: 'editor.layout',
    order: 30,
    control: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'selection', label: 'Selection' },
      { value: 'boundary', label: 'Boundary' },
      { value: 'trailing', label: 'Trailing' },
      { value: 'all', label: 'All' }
    ],
    get: () => editorSettings.getSettings().renderWhitespace,
    set: (value: SettingValue) => {
      const allowed = ['selection', 'boundary', 'trailing', 'all', 'none'] as const;
      const v = String(value);
      editorSettings.setRenderWhitespace(
        (allowed.includes(v as (typeof allowed)[number]) ? v : 'selection') as any
      );
    }
  },
  {
    id: 'editor.wordWrap',
    label: 'Word Wrap',
    description: 'Controls whether lines should wrap.',
    category: 'editor',
    section: 'editor.layout',
    order: 40,
    control: 'select',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
      { value: 'wordWrapColumn', label: 'At Column' },
      { value: 'bounded', label: 'Bounded' }
    ],
    get: () => editorSettings.getSettings().wordWrap,
    set: (value: SettingValue) => {
      const allowed = ['off', 'on', 'wordWrapColumn', 'bounded'] as const;
      const v = String(value);
      editorSettings.setWordWrap(
        (allowed.includes(v as (typeof allowed)[number]) ? v : 'on') as any
      );
    }
  },
  {
    id: 'editor.wordWrapColumn',
    label: 'Word Wrap Column',
    description: 'Column at which to wrap lines when wordWrap is set accordingly.',
    category: 'editor',
    section: 'editor.layout',
    order: 50,
    control: 'slider',
    get: () => editorSettings.getSettings().wordWrapColumn,
    set: (value: SettingValue) => {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      editorSettings.setWordWrapColumn(
        Number.isFinite(n) && n > 0 ? n : editorSettings.getSettings().wordWrapColumn
      );
    }
  },

  // ---------------------------------------------------------------------------
  // Editor UI
  // ---------------------------------------------------------------------------
  {
    id: 'editor.minimap',
    label: 'Minimap',
    description: 'Show the editor minimap.',
    category: 'editor',
    section: 'editor.ui',
    order: 10,
    control: 'boolean',
    get: () => editorSettings.getSettings().minimap,
    set: (value: SettingValue) => {
      editorSettings.setMinimap(Boolean(value));
    }
  },
  {
    id: 'editor.folding',
    label: 'Code Folding',
    description: 'Enable code folding.',
    category: 'editor',
    section: 'editor.ui',
    order: 20,
    control: 'boolean',
    get: () => editorSettings.getSettings().folding,
    set: (value: SettingValue) => {
      editorSettings.setFolding(Boolean(value));
    }
  },
  {
    id: 'editor.lineNumbers',
    label: 'Line Numbers',
    description: 'Controls display of line numbers.',
    category: 'editor',
    section: 'editor.ui',
    order: 30,
    control: 'select',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
      { value: 'relative', label: 'Relative' },
      { value: 'interval', label: 'Interval' }
    ],
    get: () => editorSettings.getSettings().lineNumbers,
    set: (value: SettingValue) => {
      const allowed = ['on', 'off', 'relative', 'interval'] as const;
      const v = String(value);
      editorSettings.setLineNumbers(
        (allowed.includes(v as (typeof allowed)[number]) ? v : 'on') as any
      );
    }
  },
  {
    id: 'editor.bracketPairColorization',
    label: 'Bracket Pair Colorization',
    description: 'Toggle bracket pair colorization.',
    category: 'editor',
    section: 'editor.ui',
    order: 40,
    control: 'boolean',
    get: () => editorSettings.getSettings().bracketPairColorization,
    set: (value: SettingValue) => {
      editorSettings.setBracketPairColorization(Boolean(value));
    }
  }
];

// -----------------------------------------------------------------------------
// Индексы для быстрого доступа
// -----------------------------------------------------------------------------

const byId: Map<SettingId, SettingDefinition> = new Map();
const bySection: Map<SectionId, SettingDefinition[]> = new Map();
const sectionById: Map<SectionId, SettingsSectionDefinition> = new Map();

for (const section of sections) {
  sectionById.set(section.id, section);
}

for (const def of settings) {
  byId.set(def.id, def);
  if (!bySection.has(def.section)) {
    bySection.set(def.section, []);
  }
  bySection.get(def.section)!.push(def);
}

// Гарантируем стабильный порядок настроек внутри секций
for (const [key, arr] of bySection.entries()) {
  arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  bySection.set(key, arr);
}

// -----------------------------------------------------------------------------
// Реализация SettingsRegistry
// -----------------------------------------------------------------------------

const registryImpl: SettingsRegistry = {
  getSections: () => {
    return [...sections].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id)
    );
  },

  getSectionById: (id: SectionId) => {
    return sectionById.get(id);
  },

  getSetting: (id: SettingId) => {
    return byId.get(id);
  },

  getSettingsBySection: (sectionId: SectionId) => {
    return bySection.get(sectionId)?.slice() ?? [];
  },

  listAllSettings: () => {
    return [...settings];
  },

  isKnownSetting: (id: SettingId) => {
    return byId.has(id);
  },

  search: (query: string, options?: SettingsSearchOptions): SettingsSearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SettingsSearchResult[] = [];

    for (const def of settings) {
      if (options?.sectionId && def.section !== options.sectionId) continue;
      if (options?.categoryId && def.category !== options.categoryId) continue;

      const haystack =
        (def.id + ' ' + def.label + ' ' + (def.description ?? '')).toLowerCase();

      if (!haystack.includes(q)) continue;

      const section = sectionById.get(def.section);
      const baseScore =
        (def.id.toLowerCase() === q ? 100 : 0) +
        (def.label.toLowerCase().includes(q) ? 50 : 0) +
        (def.description?.toLowerCase().includes(q) ? 20 : 0);

      results.push({
        settingId: def.id,
        label: def.label,
        description: def.description,
        sectionId: def.section,
        category: def.category,
        score: baseScore || 10
      });
    }

    results.sort((a, b) => b.score - a.score);

    if (options?.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }
};

// -----------------------------------------------------------------------------
// Публичный API модуля (по контракту)
// -----------------------------------------------------------------------------

export const settingsRegistry: SettingsRegistry = registryImpl;

export const getSections = (): SettingsSectionDefinition[] => settingsRegistry.getSections();
export const getSectionById = (
  id: SectionId
): SettingsSectionDefinition | undefined => settingsRegistry.getSectionById(id);
export const getSetting = (id: SettingId): SettingDefinition | undefined =>
  settingsRegistry.getSetting(id);
export const getSettingsBySection = (sectionId: SectionId): SettingDefinition[] =>
  settingsRegistry.getSettingsBySection(sectionId);
export const listAllSettings = (): SettingDefinition[] =>
  settingsRegistry.listAllSettings();
export const isKnownSetting = (id: SettingId): boolean =>
  settingsRegistry.isKnownSetting(id);
export const searchSettings = (
  query: string,
  options?: SettingsSearchOptions
): SettingsSearchResult[] => settingsRegistry.search(query, options);

// -----------------------------------------------------------------------------
// Комментарий по интеграции:
// - Модуль не создает подписок и не вызывает Tauri-команды.
// - Может безопасно использоваться в SSR и при инициализации приложения.
// - SettingsShell и команды работают только через этот контракт без дублирования логики.
// -----------------------------------------------------------------------------