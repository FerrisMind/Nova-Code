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

  // Основной фон оболочки приложения.
  backgroundPrimary: string;

  // Варианты фона для разных уровней вложенности/слоев.
  // Допускаются только значения из утвержденного списка для соответствующей темы.
  backgroundVariants: string[];

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
    backgroundVariants: ['#F5F7FA', '#FAF8F5', '#FFF9E6', '#F0F4F1'],
    textColor: '#232323'
  },
  'light-alt-1': {
    id: 'light-alt-1',
    label: 'Light / Alt 1',
    mode: 'light',
    backgroundPrimary: '#FAF8F5',
    backgroundVariants: ['#FAF8F5', '#F5F7FA', '#FFF9E6', '#F0F4F1'],
    textColor: '#232323'
  },
  'light-alt-2': {
    id: 'light-alt-2',
    label: 'Light / Alt 2',
    mode: 'light',
    backgroundPrimary: '#FFF9E6',
    backgroundVariants: ['#FFF9E6', '#F5F7FA', '#FAF8F5', '#F0F4F1'],
    textColor: '#232323'
  },
  'light-alt-3': {
    id: 'light-alt-3',
    label: 'Light / Alt 3',
    mode: 'light',
    backgroundPrimary: '#F0F4F1',
    backgroundVariants: ['#F0F4F1', '#F5F7FA', '#FAF8F5', '#FFF9E6'],
    textColor: '#232323'
  },

  // ---------------------------------------------------------------------------
  // DARK
  // ---------------------------------------------------------------------------
  'dark-default': {
    id: 'dark-default',
    label: 'Dark / Default',
    mode: 'dark',
    backgroundPrimary: '#1A1D2E',
    backgroundVariants: ['#1A1D2E', '#1E1E1E', '#2B2D30', '#1C2321'],
    textColor: '#E8E8E8'
  },
  'dark-alt-1': {
    id: 'dark-alt-1',
    label: 'Dark / Alt 1',
    mode: 'dark',
    backgroundPrimary: '#1E1E1E',
    backgroundVariants: ['#1E1E1E', '#1A1D2E', '#2B2D30', '#1C2321'],
    textColor: '#E8E8E8'
  },
  'dark-alt-2': {
    id: 'dark-alt-2',
    label: 'Dark / Alt 2',
    mode: 'dark',
    backgroundPrimary: '#2B2D30',
    backgroundVariants: ['#2B2D30', '#1A1D2E', '#1E1E1E', '#1C2321'],
    textColor: '#E8E8E8'
  },
  'dark-alt-3': {
    id: 'dark-alt-3',
    label: 'Dark / Alt 3',
    mode: 'dark',
    backgroundPrimary: '#1C2321',
    backgroundVariants: ['#1C2321', '#1A1D2E', '#1E1E1E', '#2B2D30'],
    textColor: '#E8E8E8'
  }
};

// -----------------------------------------------------------------------------
// Утилиты
// -----------------------------------------------------------------------------

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