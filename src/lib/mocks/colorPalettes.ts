/**
 * Цветовые палитры для темной и светлой тем.
 * Каждая палитра содержит основной фон, вторичные цвета и цвет текста.
 * 
 * Структура:
 * - light: Палитра для светлой темы
 * - dark: Палитра для темной темы
 */

export type PaletteId = 'palette1' | 'palette2' | 'palette3' | 'palette4';

export interface ColorLevel {
  level0: string;  // Базовый фон (Level 0)
  level1: string;  // Рабочая область/карточки +8-10 pts (Level 1-2)
  level3: string;  // Кнопки в обычном состоянии +12-14 pts (Level 3)
  level5: string;  // Hover-состояния +14-16 pts (Level 5)
}

export interface ColorPalette {
  name: string;
  description: string;
  light: ColorLevel & {
    text: string;    // Основной текст
    border: string;  // Границы
  };
  dark: ColorLevel & {
    text: string;    // Основной текст
    border: string;  // Границы
  };
}

/**
 * Коллекция цветовых палитр
 */
export const colorPalettes: Record<PaletteId, ColorPalette> = {
  palette1: {
    name: 'Default',
    description: 'Основная палитра',
    light: {
      level0: '#F5F7FA',   // Базовый фон (SideBar)
      level1: '#F1F3F6',   // -8 pts (рабочая область)
      level3: '#E7EAEF',   // -12 pts (кнопки)
      level5: '#DFE3E9',   // -14 pts (hover)
      text: '#2E2E2E',
      border: '#D0D0D0'
    },
    dark: {
      level0: '#1A1D2E',   // Базовый фон (SideBar)
      level1: '#1E2135',   // +8 pts (рабочая область)
      level3: '#24273A',   // +12 pts (кнопки)
      level5: '#282D3E',   // +14 pts (hover)
      text: '#E8E8E8',
      border: '#3A3A3A'
    }
  },

  palette2: {
    name: 'Palette 2',
    description: 'Альтернативная палитра',
    light: {
      level0: '#FAF8F5',   // Базовый фон (SideBar)
      level1: '#F6F4F1',   // -8 pts
      level3: '#ECE8E1',   // -12 pts
      level5: '#E4DFDA',   // -14 pts
      text: '#2E2E2E',
      border: '#D0D0D0'
    },
    dark: {
      level0: '#2B2D30',   // Базовый фон (SideBar)
      level1: '#2F3135',   // +8 pts
      level3: '#35373A',   // +12 pts
      level5: '#393B3E',   // +14 pts
      text: '#E8E8E8',
      border: '#3A3A3A'
    }
  },

  palette3: {
    name: 'Palette 3',
    description: 'Альтернативная палитра',
    light: {
      level0: '#FFF9E6',   // Базовый фон (SideBar)
      level1: '#FBF5DE',   // -8 pts
      level3: '#F1E9D0',   // -12 pts
      level5: '#E9E1C8',   // -14 pts
      text: '#2E2E2E',
      border: '#D0D0D0'
    },
    dark: {
      level0: '#1E1E1E',   // Базовый фон (SideBar)
      level1: '#222222',   // +8 pts
      level3: '#282828',   // +12 pts
      level5: '#2C2C2C',   // +14 pts
      text: '#E8E8E8',
      border: '#3A3A3A'
    }
  },

  palette4: {
    name: 'Palette 4',
    description: 'Еще одна альтернативная палитра',
    light: {
      level0: '#F0F4F1',   // Базовый фон (SideBar)
      level1: '#ECEFF0',   // -8 pts
      level3: '#E2E5E6',   // -12 pts
      level5: '#DADDE0',   // -14 pts
      text: '#2E2E2E',
      border: '#D0D0D0'
    },
    dark: {
      level0: '#1A1F1D',   // Базовый фон (SideBar)
      level1: '#1E2321',   // +8 pts
      level3: '#262D2B',   // +12 pts
      level5: '#2A3131',   // +14 pts
      text: '#E8E8E8',
      border: '#3A3A3A'
    }
  }
};

/**
 * Получить палитру по ID
 */
export function getPalette(paletteId: PaletteId): ColorPalette {
  return colorPalettes[paletteId];
}

/**
 * Получить все доступные палитры (для списков выбора)
 */
export function getAllPalettes(): Array<{ id: PaletteId; name: string; description: string }> {
  return Object.entries(colorPalettes).map(([id, palette]) => ({
    id: id as PaletteId,
    name: palette.name,
    description: palette.description
  }));
}
