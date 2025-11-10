import { writable, type Writable } from 'svelte/store';
import {
  type ThemeMode,
  type ThemePaletteId,
  getDefaultPaletteForMode
} from './THEME_PALETTES';

/**
 * Режим темы UI.
 * Совпадает с mode из палитр и используется как источник правды
 * для light/dark оформления оболочки.
 */
export type Theme = ThemeMode;

/**
 * Состояние темизации:
 * - mode: текущий светлый/темный режим;
 * - palette: выбранная цветовая палитра для этого режима.
 *
 * Контракт:
 * - palette всегда ссылается на один из ThemePaletteId.
 * - Для каждого режима по умолчанию используется getDefaultPaletteForMode(mode).
 */
export interface ThemeState {
  mode: Theme;
  palette: ThemePaletteId;
}

/**
 * Создает реактивное хранилище для управления темой и палитрой.
 *
 * Хранилище является единым источником правды:
 * - все потребители (layout, Settings, editor) читают только отсюда;
 * - никакой логики палитр вне этого слоя.
 */
const createThemeStore = () => {
  const initialMode: Theme = 'dark';
  const initialPalette = getDefaultPaletteForMode(initialMode);

  const initialState: ThemeState = {
    mode: initialMode,
    palette: initialPalette.id
  };

  const store: Writable<ThemeState> = writable(initialState);

  /**
   * Установить режим темы (light/dark).
   * При смене режима:
   * - пытаемся сохранить "слот" палитры (default/alt-1/alt-2/alt-3);
   * - если текущая палитра dark-alt-2, при переходе на light выберется light-alt-2.
   */
  const setTheme = (mode: Theme) => {
    store.update((state) => {
      // Извлекаем "слот" палитры из текущего ID
      const currentPaletteSlot = state.palette.replace(/^(light|dark)-/, '');
      
      // Формируем новый ID палитры для нового режима
      const newPaletteId = `${mode}-${currentPaletteSlot}` as ThemePaletteId;
      
      return {
        mode,
        palette: newPaletteId
      };
    });
  };

  /**
   * Переключить режим темы (dark ↔ light).
   * Сохраняет "слот" палитры при переключении.
   */
  const toggleTheme = () => {
    store.update((state) => {
      const nextMode: Theme = state.mode === 'dark' ? 'light' : 'dark';
      
      // Извлекаем "слот" палитры из текущего ID
      const currentPaletteSlot = state.palette.replace(/^(light|dark)-/, '');
      
      // Формируем новый ID палитры для нового режима
      const newPaletteId = `${nextMode}-${currentPaletteSlot}` as ThemePaletteId;

      return {
        mode: nextMode,
        palette: newPaletteId
      };
    });
  };

  /**
   * Установить цветовую палитру.
   * Предполагается, что id валиден (ThemePaletteId) и приходит:
   * - из settings/registry (theme.palette),
   * - из UI-контролов, основанных на THEME_PALETTES.
   */
  const setPalette = (palette: ThemePaletteId) => {
    store.update((state) => ({
      ...state,
      palette
    }));
  };

  /**
   * Получить текущее состояние (синхронно).
   * Используется для инициализации layout / editor до подписки.
   */
  let currentState = initialState;
  store.subscribe((state) => {
    currentState = state;
  });

  return {
    subscribe: store.subscribe,
    setTheme,
    toggleTheme,
    setPalette,
    getState: () => currentState
  };
};

export const theme = createThemeStore();