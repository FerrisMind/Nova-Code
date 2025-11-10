// src/lib/settings/types.ts
// -----------------------------------------------------------------------------
// Базовые типы и контракты для новой модульной системы настроек Nova Code.
// Этот файл — foundation-слой, который НЕ ломает текущее поведение,
// но даёт единые интерфейсы для:
// - трёхпанельного SettingsShell (navigation / sections / preview),
// - интеграции с существующими сторами (theme, editorSettings, layout),
// - Command Palette-поиска по настройкам,
// - профилей и истории изменений (следующие задачи).
//
// Дизайн согласован с текущими паттернами проекта:
// - "single source of truth" в сторах;
// - минималистичные типы без лишних абстракций;
// - строгие id-строки в духе VS Code settings / commands;
// - без заглушек, только реальные и используемые контракты.
//
// В следующих шагах этот модуль может быть расширен без изменения уже
// существующих экспортов.
//
// Архитектура опирается на актуальные практики Svelte 5 + Tauri v2
// (контрактно проверено через context7 / официальную документацию).
// -----------------------------------------------------------------------------

import type { EditorSettings } from '../stores/editorSettingsStore';
import type { ThemeState } from '../stores/themeStore';

// -----------------------------------------------------------------------------
// Базовые сущности системы настроек
// -----------------------------------------------------------------------------

/**
 * Категории настроек верхнего уровня.
 * Используются:
 * - в левом списке секций SettingsShell;
 * - для группировки результатов поиска и интеграции с Command Palette.
 */
export type SettingCategoryId =
  | 'appearance'
  | 'editor'
  | 'workbench'
  | 'integrations'
  | 'experimental';

/**
 * Уникальный идентификатор конкретной настройки.
 * Формат ориентирован на VS Code style:
 * - "editor.fontSize"
 * - "editor.fontFamily"
 * - "theme.mode"
 * - "theme.palette"
 */
export type SettingId = string;

/**
 * Тип значения настройки.
 * Реальные значения читаются/записываются через существующие сторы
 * (EditorSettings, ThemeState и др.)
 */
export type SettingValue = string | number | boolean;

/**
 * Метаданные отдельной настройки.
 * Это "source of truth" для UI-слоя (контролы, поиск, описание).
 *
 * Логика чтения/записи:
 * - не хранит состояние внутри себя;
 * - get() и set() обращаются к существующим сторам/модулям без дублирования.
 */
export interface SettingDefinition {
  // Глобальный id.
  id: SettingId;

  // Человекочитаемый заголовок.
  label: string;

  // Описание для UI / Command Palette.
  description?: string;

  // Категория верхнего уровня.
  category: SettingCategoryId;

  // Локальный ключ секции (для трёхпанельного layout).
  section: string;

  // Порядок внутри секции.
  order?: number;

  // Тип контрола — помогает SettingsShell подобрать UI без жёстких if.
  control:
    | 'boolean'
    | 'select'
    | 'text'
    | 'number'
    | 'radio'
    | 'slider';

  // Доступные варианты для select/radio (если применимо).
  options?: { value: SettingValue; label: string }[];

  // Функция чтения текущего значения из реального источника.
  // Должна быть чистой относительно глобального состояния.
  get: () => SettingValue;

  // Функция записи значения в реальный источник.
  // Не должна бросать и должна использовать уже существующие API (editorSettings, theme, и т.д.).
  set: (value: SettingValue) => void;
}

/**
 * Группа настроек для левой панели навигации и средней панели секций.
 * Не хранит состояние, только описывает структуру.
 */
export interface SettingsSectionDefinition {
  id: string;
  label: string;
  category: SettingCategoryId;
  order?: number;
  // Список SettingId, который принадлежит секции.
  settings: SettingId[];
}

/**
 * Описание "view" для SettingsShell.
 * По паттерну sidebarRegistry:
 * - чистый контракт без напрямую привязанного UI;
 * - позволяет реиспользовать и в /settings маршруте, и во вкладке SettingsView.
 */
export interface SettingsViewDefinition {
  id: string; // например, "settings"
  title: string;
  icon?: string;
}

// -----------------------------------------------------------------------------
// Preview / History / Profiles — минимальные контракты
// -----------------------------------------------------------------------------

/**
 * Снимок текущих настроек, который можно использовать:
 * - для истории изменений;
 * - для живого предпросмотра (preview);
 * - для профилей.
 *
 * На этом этапе только тип, без побочных эффектов.
 */
export interface SettingsSnapshot {
  editor: EditorSettings;
  theme: ThemeState;
  // В будущем сюда могут быть добавлены другие домены (layout, интеграции и т.д.).
}

/**
 * Профиль настроек.
 * Полноценная реализация сохранения/загрузки профилей будет выполнена
 * в отдельной задаче; здесь определён только контракт.
 */
export interface SettingsProfile {
  id: string;
  label: string;
  description?: string;
  snapshot: SettingsSnapshot;
}

/**
 * Минимальный контракт для истории изменений.
 * Позволяет будущему historyStore работать с реальными данными,
 * не навязывая конкретную реализацию сейчас.
 */
export interface SettingsHistoryEntry {
  id: string;
  timestamp: number;
  changedSettingId: SettingId;
  oldValue: SettingValue;
  newValue: SettingValue;
}

/**
 * Результат поиска по настройкам (включая интеграцию с Command Palette).
 * Может использоваться:
 * - внутри отдельного SettingsSearchStore;
 * - адаптером, добавляющим настройки как "виртуальные команды" в CommandPalette.
 */
export interface SettingsSearchResult {
  settingId: SettingId;
  label: string;
  description?: string;
  sectionId: string;
  category: SettingCategoryId;
  score: number;
}