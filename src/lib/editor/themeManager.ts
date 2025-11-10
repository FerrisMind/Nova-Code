import type * as monaco from 'monaco-editor';

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
  getAvailableThemes(): Array<{ id: string; name: string; type: 'built-in' | 'custom' }> {
    const themes: Array<{ id: string; name: string; type: 'built-in' | 'custom' }> = [];

    // Встроенные темы
    Object.entries(builtInThemes).forEach(([id, name]) => {
      themes.push({ id, name, type: 'built-in' });
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
   * Создать новую тему на основе существующей
   */
  createThemeFromCurrent(name: string): CustomTheme | null {
    if (!this.currentThemeId) return null;

    const currentCustomTheme = this.customThemes.get(this.currentThemeId);
    if (currentCustomTheme) {
      // Клонируем существующую кастомную тему
      return { ...currentCustomTheme, name };
    }

    // Создаем базовую тему на основе встроенной
    const baseTheme: CustomTheme = {
      name,
      base: this.currentThemeId === 'vs' ? 'vs' : 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' }
      ],
      colors: {
        'editor.background': this.currentThemeId === 'vs' ? '#FFFFFF' : '#1E1E1E',
        'editor.foreground': this.currentThemeId === 'vs' ? '#000000' : '#D4D4D4',
        'editor.lineHighlightBackground': this.currentThemeId === 'vs' ? '#F0F0F0' : '#2A2A2A',
        'editorCursor.foreground': '#FFFFFF',
        'editor.selectionBackground': this.currentThemeId === 'vs' ? '#ADD6FF' : '#264F78'
      }
    };

    return baseTheme;
  }
}

// Глобальный экземпляр менеджера тем
export const themeManager = new ThemeManager();