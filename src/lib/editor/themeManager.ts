import type * as monaco from 'monaco-editor';
import { getPaletteById, type ThemePaletteId } from '../stores/THEME_PALETTES';

/**
 * Структура кастомной темы Monaco Editor
 */
export interface CustomTheme {
  name: string;
  base: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  inherit: boolean;
  rules: Array<{
    token: string;
    foreground?: string;
    background?: string;
    fontStyle?: string;
  }>;
  colors: Record<string, string>;
}

/**
 * Встроенные темы Monaco Editor
 */
export const builtInThemes = {
  'vs': 'Light',
  'vs-dark': 'Dark',
  'hc-black': 'High Contrast Dark',
  'hc-light': 'High Contrast Light'
} as const;

/**
 * Менеджер тем для Monaco Editor
 */
export class ThemeManager {
  private monaco: typeof monaco | null = null;
  private customThemes = new Map<string, CustomTheme>();
  private currentThemeId: string | null = null;

  /**
   * Инициализировать менеджер с экземпляром Monaco
   */
  initialize(monacoInstance: typeof monaco) {
    this.monaco = monacoInstance;
  }

  /**
   * Зарегистрировать встроенную тему
   */
  registerBuiltInTheme(themeId: keyof typeof builtInThemes) {
    if (!this.monaco) return;

    // Встроенные темы уже доступны в Monaco
    // Просто устанавливаем тему
    this.monaco.editor.setTheme(themeId);
  }

  /**
   * Зарегистрировать кастомную тему из JSON
   */
  registerCustomTheme(themeJson: string): { success: boolean; error?: string; themeId?: string } {
    if (!this.monaco) {
      return { success: false, error: 'Monaco не инициализирован' };
    }

    try {
      const theme: CustomTheme = JSON.parse(themeJson);

      // Валидация структуры темы
      if (!theme.name || !theme.base || !Array.isArray(theme.rules) || typeof theme.colors !== 'object') {
        return { success: false, error: 'Неверная структура темы' };
      }

      // Генерируем уникальный ID для темы
      const themeId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Регистрируем тему в Monaco
      this.monaco.editor.defineTheme(themeId, {
        base: theme.base,
        inherit: theme.inherit,
        rules: theme.rules,
        colors: theme.colors
      });

      // Сохраняем тему в коллекции
      this.customThemes.set(themeId, theme);

      return { success: true, themeId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Ошибка парсинга JSON: ${errorMessage}` };
    }
  }

  /**
   * Применить тему по ID
   */
  applyTheme(themeId: string): boolean {
    if (!this.monaco) return false;

    try {
      this.monaco.editor.setTheme(themeId);
      this.currentThemeId = themeId;
      return true;
    } catch (error) {
      console.error('Ошибка применения темы:', error);
      return false;
    }
  }

  /**
   * Получить список доступных тем
   */
  getAvailableThemes(): Array<{ id: string; name: string; type: 'built-in' | 'custom' | 'popular' }> {
    const themes: Array<{ id: string; name: string; type: 'built-in' | 'custom' | 'popular' }> = [];

    // Встроенные темы
    Object.entries(builtInThemes).forEach(([id, name]) => {
      themes.push({ id, name, type: 'built-in' });
    });

    // Популярные темы
    const popularThemes = [
      'monokai', 'dracula', 'one-dark-pro', 'material', 'nord',
      'github-light', 'solarized-light', 'atom-one-light'
    ];
    popularThemes.forEach(id => {
      const name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      themes.push({ id, name, type: 'popular' });
    });

    // Кастомные темы
    this.customThemes.forEach((theme, id) => {
      themes.push({ id, name: theme.name, type: 'custom' });
    });

    return themes;
  }

  /**
   * Экспортировать кастомную тему в JSON
   */
  exportTheme(themeId: string): string | null {
    const theme = this.customThemes.get(themeId);
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  }

  /**
   * Удалить кастомную тему
   */
  removeCustomTheme(themeId: string): boolean {
    if (!this.customThemes.has(themeId)) return false;

    this.customThemes.delete(themeId);
    return true;
  }

  /**
   * Получить текущую тему
   */
  getCurrentTheme(): string | null {
    return this.currentThemeId;
  }

  /**
   * Создать тему Monaco на основе палитры приложения
   */
  createThemeFromPalette(paletteId: ThemePaletteId): CustomTheme {
    const palette = getPaletteById(paletteId);
    const isDark = palette.mode === 'dark';

    const theme: CustomTheme = {
      name: palette.label,
      base: isDark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: isDark ? '569CD6' : '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: isDark ? 'CE9178' : 'A31515' },
        { token: 'number', foreground: isDark ? 'B5CEA8' : '09885A' }
      ],
      colors: {
        'editor.background': palette.backgroundLevels[1],
        'editor.foreground': palette.textColor,
        'editor.lineHighlightBackground': palette.backgroundLevels[5],
        'editorCursor.foreground': palette.textColor,
        'editor.selectionBackground': isDark ? '#264F78' : '#ADD6FF',
        'editorLineNumber.foreground': isDark ? '#858585' : '#237893',
        'editorLineNumber.activeForeground': palette.textColor
      }
    };

    return theme;
  }

  /**
   * Загрузить популярные темы из monaco-themes
   */
  async loadPopularThemes(): Promise<void> {
    if (!this.monaco) return;

    const themes = [
      { name: 'Monokai', file: 'Monokai.json', base: 'vs-dark' },
      { name: 'Dracula', file: 'Dracula.json', base: 'vs-dark' },
      { name: 'One Dark Pro', file: 'One Dark Pro.json', base: 'vs-dark' },
      { name: 'Material Dark', file: 'Material.json', base: 'vs-dark' },
      { name: 'Nord', file: 'Nord.json', base: 'vs-dark' },
      { name: 'GitHub Light', file: 'GitHub Light.json', base: 'vs' },
      { name: 'Solarized Light', file: 'Solarized Light.json', base: 'vs' },
      { name: 'Atom One Light', file: 'Atom One Light.json', base: 'vs' }
    ];

    for (const theme of themes) {
      try {
        const themeData = await import(/* @vite-ignore */ `monaco-themes/themes/${theme.file}`);
        this.monaco.editor.defineTheme(theme.name.toLowerCase().replace(/\s+/g, '-'), themeData.default || themeData);
      } catch (error) {
        console.warn(`Failed to load theme ${theme.name}:`, error);
      }
    }
  }
}

// Глобальный экземпляр менеджера тем
export const themeManager = new ThemeManager();
