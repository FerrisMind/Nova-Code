import type * as monaco from 'monaco-editor';
import { getPaletteById, type ThemePaletteId } from '../stores/THEME_PALETTES';
import type { ThemeState } from '../stores/themeStore';

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
  vs: 'Light',
  'vs-dark': 'Dark',
  'hc-black': 'High Contrast Dark',
  'hc-light': 'High Contrast Light',
} as const;

/**
 * Менеджер тем для Monaco Editor
 */
export class ThemeManager {
  private monaco: typeof monaco | null = null;
  private customThemes = new Map<string, CustomTheme>();
  private currentThemeId: string | null = null;
  private initialized = false;
  private themesLoaded = false;

  /**
   * Инициализировать менеджер с экземпляром Monaco
   */
  initialize(monacoInstance: typeof monaco) {
    if (this.initialized) return;
    this.monaco = monacoInstance;
    this.initialized = true;
  }

  /**
   * Проверить, инициализирован ли менеджер
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Проверить, загружены ли темы
   */
  areThemesLoaded(): boolean {
    return this.themesLoaded;
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
      if (
        !theme.name ||
        !theme.base ||
        !Array.isArray(theme.rules) ||
        typeof theme.colors !== 'object'
      ) {
        return { success: false, error: 'Неверная структура темы' };
      }

      // Генерируем уникальный ID для темы
      const themeId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Регистрируем тему в Monaco
      this.monaco.editor.defineTheme(themeId, {
        base: theme.base,
        inherit: theme.inherit,
        rules: theme.rules,
        colors: theme.colors,
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
  getAvailableThemes(): Array<{
    id: string;
    name: string;
    type: 'built-in' | 'custom' | 'popular';
  }> {
    const themes: Array<{ id: string; name: string; type: 'built-in' | 'custom' | 'popular' }> = [];

    // Встроенные темы
    Object.entries(builtInThemes).forEach(([id, name]) => {
      themes.push({ id, name, type: 'built-in' });
    });

    // Популярные темы
    const popularThemes = [
      'monokai',
      'dracula',
      'one-dark-pro',
      'material',
      'nord',
      'github-light',
      'solarized-light',
      'atom-one-light',
    ];
    popularThemes.forEach((id) => {
      const name = id.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
        { token: 'number', foreground: isDark ? 'B5CEA8' : '09885A' },
      ],
      colors: {
        'editor.background': palette.backgroundLevels[1],
        'editor.foreground': palette.textColor,
        'editor.lineHighlightBackground': palette.backgroundLevels[5],
        'editorCursor.foreground': palette.textColor,
        'editor.selectionBackground': isDark ? '#264F78' : '#ADD6FF',
        'editorLineNumber.foreground': isDark ? '#858585' : '#237893',
        'editorLineNumber.activeForeground': palette.textColor,
      },
    };

    return theme;
  }

  /**
   * Загрузить популярные темы из monaco-themes
   */
  /**
   * Загрузить популярные темы из monaco-themes
   */
  /**
   * Загрузить популярные темы из monaco-themes.
   * Теперь это не блокирует инициализацию редактора.
   */
  async loadPopularThemes(): Promise<void> {
    if (!this.monaco || this.themesLoaded) return;

    // Запускаем загрузку в фоне, не блокируя основной поток
    // Используем dynamic imports для lazy loading
    const themeLoaders = {
      monokai: () => import('monaco-themes/themes/Monokai.json'),
      dracula: () => import('monaco-themes/themes/Dracula.json'),
      nord: () => import('monaco-themes/themes/Nord.json'),
      'github-light': () => import('monaco-themes/themes/GitHub Light.json'),
      'github-dark': () => import('monaco-themes/themes/GitHub Dark.json'),
      'solarized-light': () => import('monaco-themes/themes/Solarized-light.json'),
      'solarized-dark': () => import('monaco-themes/themes/Solarized-dark.json'),
      'night-owl': () => import('monaco-themes/themes/Night Owl.json'),
    };

    const promises = Object.entries(themeLoaders).map(async ([id, loader]) => {
      try {
        const module = await loader();
        const themeData =
          (module as { default?: monaco.editor.IStandaloneThemeData }).default ??
          (module as monaco.editor.IStandaloneThemeData);
        this.monaco!.editor.defineTheme(id, themeData);
      } catch (error) {
        console.warn(`[ThemeManager] Failed to load theme ${id}:`, error);
      }
    });

    await Promise.all(promises);
    this.themesLoaded = true;
  }
}

// Глобальный экземпляр менеджера тем
export const themeManager = new ThemeManager();

/**
 * Возвращает ID темы Monaco на основе состояния UI и опционального override из настроек редактора.
 * - Если editorTheme явно задана (и не 'auto'), используется она.
 * - Иначе тема следует за palette из ThemeState: nova-${palette}.
 */
export function getMonacoThemeId(themeState: ThemeState, editorTheme?: string): string {
  if (editorTheme && editorTheme !== 'auto') {
    return editorTheme;
  }

  return `nova-${themeState.palette}`;
}
