// src/lib/stores/THEME_PALETTES.ts
// -----------------------------------------------------------------------------
// Единый источник правды для цветовых палитр Nova Code.
// 
// Цели модуля:
// - Жестко зафиксировать утвержденные палитры для светлой и темной тем.
// - Не изобретать новые цвета: используются только значения из спецификации.
// - Предоставить компактный, типобезопасный контракт для themeStore, layout,
//   settings/registry и любых потребителей.
//
// Модуль согласован с:
// - THEME_SYSTEM (src/lib/stores/THEME_SYSTEM.md)
// - актуальными практиками темизации UI (Svelte 5 / Tauri v2; см. context7 / оф. доки).
//
// ВАЖНО:
// - Этот файл является единственной точкой правды для набора палитр.
// - Изменение значений палитр должно происходить только на основании
//   утвержденных дизайн-спецификаций.
// -----------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark';

// Идентификаторы палитр. Используются в сторах и реестре настроек.
export type ThemePaletteId =
  | 'light-default'
  | 'light-alt-1'
  | 'light-alt-2'
  | 'light-alt-3'
  | 'dark-default'
  | 'dark-alt-1'
  | 'dark-alt-2'
  | 'dark-alt-3';

// Базовая структура палитры.
export interface ThemePalette {
  id: ThemePaletteId;
  label: string;
  mode: ThemeMode;

  // Основной фон оболочки приложения (Level 0).
  backgroundPrimary: string;

  // Уровни фона для иерархии:
  // Level -1: -7 пунктов (темная) / +5 пунктов (светлая) — для таббара
  // Level 0: backgroundPrimary
  // Level 1-2: +8-10 пунктов (рабочая область/карточки)
  // Level 3: +12-14 пунктов (кнопки обычные)
  // Level 5: +14-16 пунктов (hover)
  backgroundLevels: Record<0 | 1 | 2 | 3 | 4 | 5, string>;
  backgroundLevelMinus1: string;

  // Основной цвет текста для данной палитры.
  textColor: string;
}

// -----------------------------------------------------------------------------
// Набор утвержденных палитр
// -----------------------------------------------------------------------------
//
// Светлая тема — допустимые цвета:
//   #F5F7FA, #FAF8F5, #FFF9E6, #F0F4F1
// Основной фон (primary base) для light-default: #F5F7FA
// Цвет текста: #232323
//
// Темная тема — допустимые цвета:
//   #1E1E1E, #2B2D30, #1A1D2E, #1C2321
// Основной фон (primary base) для dark-default: #1A1D2E
// Цвет текста: #E8E8E8
//
// Для alt-вариантов:
// - используются только перечисленные цвета;
// - различается только выбор backgroundPrimary;
// - backgroundVariants всегда представляет перестановку/набор этих же значений.

export const PALETTES: Record<ThemePaletteId, ThemePalette> = {
  // ---------------------------------------------------------------------------
  // LIGHT
  // ---------------------------------------------------------------------------
  'light-default': {
    id: 'light-default',
    label: 'Light / Default',
    mode: 'light',
    backgroundPrimary: '#F5F7FA',
    backgroundLevels: calculateBackgroundLevels('#F5F7FA', 'light'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#F5F7FA', 'light'),
    textColor: '#2e2e2e'
  },
  'light-alt-1': {
    id: 'light-alt-1',
    label: 'Light / Alt 1',
    mode: 'light',
    backgroundPrimary: '#FAF8F5',
    backgroundLevels: calculateBackgroundLevels('#FAF8F5', 'light'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#FAF8F5', 'light'),
    textColor: '#2e2e2e'
  },
  'light-alt-2': {
    id: 'light-alt-2',
    label: 'Light / Alt 2',
    mode: 'light',
    backgroundPrimary: '#FFF9E6',
    backgroundLevels: calculateBackgroundLevels('#FFF9E6', 'light'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#FFF9E6', 'light'),
    textColor: '#2e2e2e'
  },
  'light-alt-3': {
    id: 'light-alt-3',
    label: 'Light / Alt 3',
    mode: 'light',
    backgroundPrimary: '#F0F4F1',
    backgroundLevels: calculateBackgroundLevels('#F0F4F1', 'light'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#F0F4F1', 'light'),
    textColor: '#2e2e2e'
  },

  // ---------------------------------------------------------------------------
  // DARK
  // ---------------------------------------------------------------------------
  'dark-default': {
    id: 'dark-default',
    label: 'Dark / Default',
    mode: 'dark',
    backgroundPrimary: '#1A1D2E',
    backgroundLevels: calculateBackgroundLevels('#1A1D2E', 'dark'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#1A1D2E', 'dark'),
    textColor: '#E8E8E8'
  },
  'dark-alt-1': {
    id: 'dark-alt-1',
    label: 'Dark / Alt 1',
    mode: 'dark',
    backgroundPrimary: '#1E1E1E',
    backgroundLevels: calculateBackgroundLevels('#1E1E1E', 'dark'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#1E1E1E', 'dark'),
    textColor: '#E8E8E8'
  },
  'dark-alt-2': {
    id: 'dark-alt-2',
    label: 'Dark / Alt 2',
    mode: 'dark',
    backgroundPrimary: '#2B2D30',
    backgroundLevels: calculateBackgroundLevels('#2B2D30', 'dark'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#2B2D30', 'dark'),
    textColor: '#E8E8E8'
  },
  'dark-alt-3': {
    id: 'dark-alt-3',
    label: 'Dark / Alt 3',
    mode: 'dark',
    backgroundPrimary: '#1C2321',
    backgroundLevels: calculateBackgroundLevels('#1C2321', 'dark'),
    backgroundLevelMinus1: calculateBackgroundLevelMinus1('#1C2321', 'dark'),
    textColor: '#E8E8E8'
  }
};

// -----------------------------------------------------------------------------
// Утилиты для расчета уровней фона
// -----------------------------------------------------------------------------

/**
 * Рассчитывает уровни фона на основе базового цвета.
 * Для темной темы: светлее с каждым уровнем (+яркость).
 * Для светлой темы: темнее с каждым уровнем (-яркость).
 * 
 * Иерархия уровней:
 * Level 0: Базовый фон (сайдбар)
 * Level 1-2: +8-10 пунктов (рабочая область/карточки)
 * Level 3: +12-14 пунктов (кнопки обычные)
 * Level 4: +14-16 пунктов (промежуточный)
 * Level 5: +14-16 пунктов (hover-состояния)
 */
function calculateBackgroundLevels(baseColor: string, mode: ThemeMode): Record<0 | 1 | 2 | 3 | 4 | 5, string> {
  // Преобразуем hex в HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const [h, s, baseL] = hexToHsl(baseColor);
  const levels: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
    0: baseColor,
    1: baseColor,
    2: baseColor,
    3: baseColor,
    4: baseColor,
    5: baseColor
  };

  // Уровни согласно спецификации:
  // Level 0: 0 (базовый)
  // Level 1: +8 пунктов
  // Level 2: +10 пунктов
  // Level 3: +13 пунктов (среднее между 12-14)
  // Level 4: +15 пунктов
  // Level 5: +16 пунктов
  const adjustments = [0, 8, 10, 13, 15, 16];

  for (let i = 1; i <= 5; i++) {
    let newL = baseL;
    if (mode === 'dark') {
      // Темная тема: светлее (+яркость)
      newL = Math.min(100, baseL + adjustments[i]);
    } else {
      // Светлая тема: темнее (-яркость)
      newL = Math.max(0, baseL - adjustments[i]);
    }
    levels[i as 0 | 1 | 2 | 3 | 4 | 5] = hslToHex(h, s, newL);
  }

  return levels;
}

/**
 * Рассчитывает уровень фона -1 на основе базового цвета.
 * Для темной темы: темнее на 7 пунктов (среднее 6-8).
 * Для светлой темы: светлее на 5 пунктов (среднее 4-6).
 */
function calculateBackgroundLevelMinus1(baseColor: string, mode: ThemeMode): string {
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  };

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const [h, s, baseL] = hexToHsl(baseColor);
  let newL = baseL;
  if (mode === 'dark') {
    // Темная тема: темнее (-яркость)
    newL = Math.max(0, baseL - 7);
  } else {
    // Светлая тема: светлее (+яркость)
    newL = Math.min(100, baseL + 5);
  }
  return hslToHex(h, s, newL);
}

/**
 * Получить палитру по ID.
 * Предполагается, что id всегда валиден (контролируется реестром настроек и themeStore).
 */
export function getPaletteById(id: ThemePaletteId): ThemePalette {
  return PALETTES[id];
}

/**
 * Получить палитру по режиму по умолчанию.
 * - Для light → light-default
 * - Для dark → dark-default
 */
export function getDefaultPaletteForMode(mode: ThemeMode): ThemePalette {
  return mode === 'light' ? PALETTES['light-default'] : PALETTES['dark-default'];
}

/**
 * Список палитр для указанного режима (для UI-реестра настроек).
 * Возвращает строго зафиксированный набор без псевдо-вариантов.
 */
export function listPalettesByMode(mode: ThemeMode): ThemePalette[] {
  return (Object.values(PALETTES) as ThemePalette[]).filter(
    (palette) => palette.mode === mode
  );
}