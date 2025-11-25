import { writable, type Writable } from 'svelte/store';

/**
 * Настройки редактора Monaco Editor
 */
export interface EditorSettings {
  // Тема Monaco
  theme: string;

  // Шрифт
  fontSize: number;
  fontFamily: string;
  fontLigatures: boolean;

  // Табуляция
  tabSize: number;
  insertSpaces: boolean;

  // Отображение
  renderWhitespace: 'selection' | 'boundary' | 'trailing' | 'all' | 'none';
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  wordWrapColumn: number;
  minimap: boolean;
  folding: boolean;
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  bracketPairColorization: boolean;
}

/**
 * Создает реактивное хранилище для управления настройками редактора
 */
const createEditorSettingsStore = () => {
  // Начальные настройки по умолчанию
  const defaultSettings: EditorSettings = {
    // theme: 'auto' -> следует за UI palette (nova-*). Любая другая строка выступает override (github-dark и т.п.).
    theme: 'auto',
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontLigatures: true,
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection',
    wordWrap: 'on',
    wordWrapColumn: 80,
    minimap: true,
    folding: true,
    lineNumbers: 'on',
    bracketPairColorization: true
  };

  const store: Writable<EditorSettings> = writable(defaultSettings);

  /**
   * Установить тему редактора
   */
  const setTheme = (theme: string) => {
    store.update((settings) => ({ ...settings, theme }));
  };

  /**
   * Установить размер шрифта
   */
  const setFontSize = (fontSize: number) => {
    store.update((settings) => ({ ...settings, fontSize }));
  };

  /**
   * Установить семейство шрифтов
   */
  const setFontFamily = (fontFamily: string) => {
    store.update((settings) => ({ ...settings, fontFamily }));
  };

  /**
   * Включить/выключить лигатуры шрифта
   */
  const setFontLigatures = (fontLigatures: boolean) => {
    store.update((settings) => ({ ...settings, fontLigatures }));
  };

  /**
   * Установить размер табуляции
   */
  const setTabSize = (tabSize: number) => {
    store.update((settings) => ({ ...settings, tabSize }));
  };

  /**
   * Установить использование пробелов вместо табуляции
   */
  const setInsertSpaces = (insertSpaces: boolean) => {
    store.update((settings) => ({ ...settings, insertSpaces }));
  };

  /**
   * Установить отображение пробелов и табуляции
   */
  const setRenderWhitespace = (renderWhitespace: 'selection' | 'boundary' | 'trailing' | 'all' | 'none') => {
    store.update((settings) => ({ ...settings, renderWhitespace }));
  };

  /**
   * Установить перенос слов
   */
  const setWordWrap = (wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded') => {
    store.update((settings) => ({ ...settings, wordWrap }));
  };

  /**
   * Установить колонку переноса слов
   */
  const setWordWrapColumn = (wordWrapColumn: number) => {
    store.update((settings) => ({ ...settings, wordWrapColumn }));
  };

  /**
   * Включить/выключить миникарту
   */
  const setMinimap = (minimap: boolean) => {
    store.update((settings) => ({ ...settings, minimap }));
  };

  /**
   * Включить/выключить сворачивание кода
   */
  const setFolding = (folding: boolean) => {
    store.update((settings) => ({ ...settings, folding }));
  };

  /**
   * Установить отображение номеров строк
   */
  const setLineNumbers = (lineNumbers: 'on' | 'off' | 'relative' | 'interval') => {
    store.update((settings) => ({ ...settings, lineNumbers }));
  };

  /**
   * Включить/выключить цветовую подсветку пар скобок
   */
  const setBracketPairColorization = (bracketPairColorization: boolean) => {
    store.update((settings) => ({ ...settings, bracketPairColorization }));
  };

  /**
   * Сбросить все настройки к значениям по умолчанию
   */
  const resetToDefaults = () => {
    store.set(defaultSettings);
  };

  /**
   * Получить текущее состояние (синхронно)
   */
  let currentSettings = defaultSettings;
  store.subscribe((settings) => {
    currentSettings = settings;
  });

  return {
    subscribe: store.subscribe,
    setTheme,
    setFontSize,
    setFontFamily,
    setFontLigatures,
    setTabSize,
    setInsertSpaces,
    setRenderWhitespace,
    setWordWrap,
    setWordWrapColumn,
    setMinimap,
    setFolding,
    setLineNumbers,
    setBracketPairColorization,
    resetToDefaults,
    getSettings: () => currentSettings
  };
};

export const editorSettings = createEditorSettingsStore();
