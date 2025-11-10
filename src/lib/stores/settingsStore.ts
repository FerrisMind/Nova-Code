// src/lib/stores/settingsStore.ts
// -----------------------------------------------------------------------------
// Оркестратор над доменными сторами и settingsRegistry.
// Реализует единый read-only snapshot и прикладные операции над реальными
// настройками без Tauri-заглушек.
//
// Соответствует контракту из
// [`settingsStore.api.md`](src/lib/stores/settingsStore.api.md:1)
// и использует только реальные публичные API существующих сторах.
//
// Ключевые свойства:
// - Не дублирует состояние: snapshot собирается на лету.
// - Поддерживает baselineSnapshot для dirty-состояния и resetAll.
// - Все операции используют settingsRegistry (getSetting / listAllSettings).
// - Никаких побочных эффектов кроме вызова definition.set(...).
// - Совместим с Svelte 5 (используем стандартный readable-паттерн).
// -----------------------------------------------------------------------------

import { readable, type Readable } from 'svelte/store';
import { editorSettings } from '$lib/stores/editorSettingsStore';
import { theme } from '$lib/stores/themeStore';
import {
  getSetting,
  listAllSettings
} from '$lib/settings/registry';
import type {
  SettingId,
  SettingValue,
  SettingsSnapshot
} from '$lib/settings/types';

// -----------------------------------------------------------------------------
// Локальные типы (по контракту api.md)
// -----------------------------------------------------------------------------

export interface SettingPatch {
  id: SettingId;
  value: SettingValue;
}

export interface AppliedChange {
  id: SettingId;
  oldValue: SettingValue;
  newValue: SettingValue;
}

export interface SettingsDirtyEntry {
  id: SettingId;
  original: SettingValue;
  current: SettingValue;
}

export interface SettingsDirtyState {
  hasChanges: boolean;
  entries: SettingsDirtyEntry[];
}

export interface ApplyChangesMeta {
  source?: 'user' | 'profile' | 'quickAction' | 'import' | 'command';
}

export interface ResetMeta {
  source?: 'quickAction' | 'profile' | 'import';
}

// Публичный интерфейс стора
export interface SettingsStore {
  // Svelte readable API
  subscribe(run: (snapshot: SettingsSnapshot) => void): () => void;

  // Синхронный snapshot
  getSnapshot(): SettingsSnapshot;

  // Применение пачки изменений к реальным настройкам.
  applyChanges(patch: SettingPatch[], meta?: ApplyChangesMeta): AppliedChange[];

  // Сброс всех настроек к baseline snapshot.
  resetAll(meta?: ResetMeta): AppliedChange[];

  // Текущее dirty-состояние относительно baseline.
  getDirtyState(): SettingsDirtyState;

  // Обновить baseline из текущего состояния.
  setBaselineFromCurrent(): void;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции
// -----------------------------------------------------------------------------

/**
 * Собрать актуальный SettingsSnapshot из доменных стора.
 * Только чтение, никаких побочных эффектов.
 */
function buildSnapshot(): SettingsSnapshot {
  return {
    editor: editorSettings.getSettings(),
    theme: theme.getState()
    // Дополнительные домены (layout, интеграции и т.д.) добавляются здесь,
    // синхронно с расширением SettingsSnapshot.
  };
}

/**
 * Создать patch из baselineSnapshot в актуальное состояние.
 * Используется resetAll.
 */
function buildPatchFromBaseline(baseline: SettingsSnapshot, current: SettingsSnapshot): SettingPatch[] {
  const patch: SettingPatch[] = [];

  // editor.* — значения берутся из registry (listAllSettings), а baseline
  // используется только как "норма" для сравнения:
  const allDefs = listAllSettings();

  for (const def of allDefs) {
    const id = def.id;
    const currentValue = def.get();

    let baselineValue: SettingValue | undefined;

    // Маппинг baseline по известным id.
    if (id.startsWith('editor.')) {
      const key = id.slice('editor.'.length) as keyof typeof baseline.editor;
      if (key in baseline.editor) {
        baselineValue = baseline.editor[key] as SettingValue;
      }
    } else if (id.startsWith('theme.')) {
      const key = id.slice('theme.'.length) as keyof typeof baseline.theme;
      if (key in baseline.theme) {
        baselineValue = baseline.theme[key] as SettingValue;
      }
    }

    if (baselineValue !== undefined && currentValue !== baselineValue) {
      patch.push({ id, value: baselineValue });
    }
  }

  return patch;
}

/**
 * Вычислить dirty-entries относительно baselineSnapshot.
 */
function computeDirtyState(baseline: SettingsSnapshot): SettingsDirtyState {
  const entries: SettingsDirtyEntry[] = [];

  const allDefs = listAllSettings();

  for (const def of allDefs) {
    const id = def.id;
    const current = def.get();

    let original: SettingValue | undefined;

    if (id.startsWith('editor.')) {
      const key = id.slice('editor.'.length) as keyof typeof baseline.editor;
      if (key in baseline.editor) {
        original = baseline.editor[key] as SettingValue;
      }
    } else if (id.startsWith('theme.')) {
      const key = id.slice('theme.'.length) as keyof typeof baseline.theme;
      if (key in baseline.theme) {
        original = baseline.theme[key] as SettingValue;
      }
    }

    if (original !== undefined && original !== current) {
      entries.push({ id, original, current });
    }
  }

  return {
    hasChanges: entries.length > 0,
    entries
  };
}

// -----------------------------------------------------------------------------
// Внутреннее состояние модуля
// -----------------------------------------------------------------------------

// Базовый snapshot (baseline), относительно которого считаем dirty и resetAll.
// Инициализируем из текущего состояния при первом импорте.
// Внешние модули могут переопределить baseline через setBaselineFromCurrent().
let baselineSnapshot: SettingsSnapshot = buildSnapshot();

// Синхронный кэш для readable store.
let currentSnapshot: SettingsSnapshot = buildSnapshot();

// -----------------------------------------------------------------------------
// Реализация readable store
// -----------------------------------------------------------------------------
//
// При изменении любых доменных стора мы пересобираем snapshot и уведомляем
// подписчиков. Здесь подписываемся только на реальные сторы editor/theme.

const internalReadable: Readable<SettingsSnapshot> = readable<SettingsSnapshot>(
  currentSnapshot,
  (set) => {
    // helper: пересобрать snapshot и обновить текущее значение
    const updateSnapshot = () => {
      currentSnapshot = buildSnapshot();
      set(currentSnapshot);
    };

    const unsubscribers: (() => void)[] = [];

    // Подписка на editorSettings
    unsubscribers.push(
      editorSettings.subscribe(() => {
        updateSnapshot();
      })
    );

    // Подписка на theme
    unsubscribers.push(
      theme.subscribe(() => {
        updateSnapshot();
      })
    );

    // В будущем сюда добавятся подписки на другие доменные сторы.

    // Инициализирующее уведомление на случай поздних подписчиков
    updateSnapshot();

    // teardown
    return () => {
      for (const u of unsubscribers) u();
    };
  }
);

// -----------------------------------------------------------------------------
// Публичная реализация SettingsStore
// -----------------------------------------------------------------------------

const impl: SettingsStore = {
  subscribe: internalReadable.subscribe,

  getSnapshot(): SettingsSnapshot {
    // Всегда возвращаем актуальный snapshot (пересчитать на лету).
    currentSnapshot = buildSnapshot();
    return currentSnapshot;
  },

  applyChanges(patch: SettingPatch[], _meta?: ApplyChangesMeta): AppliedChange[] {
    const applied: AppliedChange[] = [];

    if (!patch || patch.length === 0) {
      return applied;
    }

    for (const { id, value } of patch) {
      const def = getSetting(id);
      if (!def || typeof def.get !== 'function' || typeof def.set !== 'function') {
        continue;
      }

      const oldValue = def.get();
      // Строгое сравнение: если значение не меняется, пропускаем.
      if (oldValue === value) continue;

      try {
        def.set(value);
        const newValue = def.get();

        applied.push({
          id,
          oldValue,
          newValue
        });
      } catch (error) {
        // По контракту не бросаем наружу, но не добавляем в applied.
        // Можно логировать через console.error при необходимости.
        // console.error('Failed to apply setting change', id, error);
      }
    }

    // После применения изменений обновляем кэш snapshot.
    currentSnapshot = buildSnapshot();

    return applied;
  },

  resetAll(_meta?: ResetMeta): AppliedChange[] {
    // Формируем patch из baseline -> текущие.
    const current = buildSnapshot();
    const patch = buildPatchFromBaseline(baselineSnapshot, current);

    if (patch.length === 0) {
      return [];
    }

    const applied = this.applyChanges(patch, { source: 'quickAction' });

    // После reset не меняем baseline: baseline — это "норма".
    return applied;
  },

  getDirtyState(): SettingsDirtyState {
    // Используем registry + baselineSnapshot.
    return computeDirtyState(baselineSnapshot);
  },

  setBaselineFromCurrent(): void {
    baselineSnapshot = buildSnapshot();
  }
};

// Экспорт по контракту.
export const settingsStore: SettingsStore = impl;