// src/lib/stores/settingsHistoryStore.ts
// -----------------------------------------------------------------------------
// Реализация стора истории изменений настроек.
//
// Соответствует контракту из
// [`settingsHistoryStore.api.md`](src/lib/stores/settingsHistoryStore.api.md:1)
// и требованиям задачи:
// - не дублирует бизнес-логику: изменения применяет только через settingsStore;
// - предоставляет реальные методы appendChanges / undoLast / undoById / clearHistory;
// - готов к интеграции с Tauri-персистентностью через invoke-команды
//   (settings_history_load / settings_history_save / settings_history_clear)
//   без заглушек с точки зрения публичного API.
//
// В этом файле реализована in-memory логика + прямые вызовы Tauri-команд,
// которые должны быть добавлены в Rust-часть (src-tauri/src/lib.rs).
// -----------------------------------------------------------------------------

import { writable, type Readable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { settingsStore } from '$lib/stores/settingsStore';
import type {
  SettingId,
  SettingValue,
  SettingsHistoryEntry
} from '$lib/settings/types';
import type { SettingPatch } from '$lib/stores/settingsStore';

// -----------------------------------------------------------------------------
// Типы по контракту
// -----------------------------------------------------------------------------

export type HistoryEntryId = string;

export interface ExtendedSettingsHistoryEntry extends SettingsHistoryEntry {
  id: HistoryEntryId;
  source: 'user' | 'profile' | 'quickAction' | 'command' | 'import';
  batchId?: string;
}

export interface SettingsHistoryState {
  entries: ExtendedSettingsHistoryEntry[];
  limit: number;
}

export interface SettingsHistoryStore extends Readable<SettingsHistoryState> {
  init(): Promise<void>;
  appendChanges(
    changes: {
      settingId: SettingId;
      oldValue: SettingValue;
      newValue: SettingValue;
    }[],
    meta: {
      source: 'user' | 'profile' | 'quickAction' | 'command' | 'import';
      batchId?: string;
    }
  ): Promise<void>;
  undoLast(): Promise<void>;
  undoById(id: HistoryEntryId): Promise<void>;
  clearHistory(): Promise<void>;
  setLimit(limit: number): void;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции
// -----------------------------------------------------------------------------

function generateEntryId(): HistoryEntryId {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStateSnapshot(subscribeFn: SettingsHistoryStore['subscribe']): SettingsHistoryState {
  let snapshot: SettingsHistoryState | undefined;
  const unsub = subscribeFn((s) => {
    snapshot = s;
  });
  unsub();
  if (!snapshot) {
    throw new Error('SettingsHistoryStore state is not initialized');
  }
  return snapshot;
}

async function persistHistory(entries: ExtendedSettingsHistoryEntry[]): Promise<void> {
  try {
    await invoke('settings_history_save', { entries });
  } catch {
    // Ошибку намеренно не пробрасываем выше:
    // история в памяти остается консистентной; логирование можно добавить отдельно.
  }
}

async function loadHistoryFromBackend(): Promise<ExtendedSettingsHistoryEntry[] | null> {
  try {
    const raw = (await invoke('settings_history_load')) as
      | ExtendedSettingsHistoryEntry[]
      | null
      | undefined;
    if (!raw) return null;
    return raw
      .filter((e) => e && typeof e.id === 'string')
      .map((e) => ({
        ...e
      }));
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Фабрика стора
// -----------------------------------------------------------------------------

export function createSettingsHistoryStore(initialLimit = 200): SettingsHistoryStore {
  const { subscribe, set, update } = writable<SettingsHistoryState>({
    entries: [],
    limit: initialLimit
  });

  let initialized = false;

  const store: SettingsHistoryStore = {
    subscribe,

    async init(): Promise<void> {
      if (initialized) return;
      initialized = true;

      const loaded = await loadHistoryFromBackend();
      if (loaded && Array.isArray(loaded)) {
        update((state) => {
          const truncated =
            loaded.length > state.limit
              ? loaded.slice(loaded.length - state.limit)
              : loaded;
          return {
            ...state,
            entries: truncated
          };
        });
      }
    },

    async appendChanges(
      changes,
      meta
    ): Promise<void> {
      if (!changes || changes.length === 0) return;

      const now = Date.now();

      update((state) => {
        const nextEntries = [...state.entries];

        for (const change of changes) {
          const entry: ExtendedSettingsHistoryEntry = {
            id: generateEntryId(),
            timestamp: now,
            changedSettingId: change.settingId,
            oldValue: change.oldValue,
            newValue: change.newValue,
            source: meta.source,
            batchId: meta.batchId
          };
          nextEntries.push(entry);
        }

        // Ограничение по limit: обрезаем с головы
        const overflow = nextEntries.length - state.limit;
        const entries =
          overflow > 0 ? nextEntries.slice(overflow) : nextEntries;

        // Асинхронное сохранение (без await в update)
        void persistHistory(entries);

        return {
          ...state,
          entries
        };
      });
    },

    async undoLast(): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      if (state.entries.length === 0) return;

      const last = state.entries[state.entries.length - 1];

      // Собираем группу по batchId, если он есть
      let group: ExtendedSettingsHistoryEntry[];
      if (last.batchId) {
        const batchId = last.batchId;
        // Берем все записи с этим batchId с конца подряд
        group = [];
        for (let i = state.entries.length - 1; i >= 0; i--) {
          const e = state.entries[i];
          if (e.batchId === batchId) {
            group.unshift(e);
          } else if (group.length > 0) {
            break;
          }
        }
        if (group.length === 0) {
          group = [last];
        }
      } else {
        group = [last];
      }

      // Формируем patch из oldValue
      const patch: SettingPatch[] = group.map((e) => ({
        id: e.changedSettingId,
        value: e.oldValue
      }));

      if (patch.length === 0) return;

      settingsStore.applyChanges(patch, { source: 'command' });

      // Удаляем использованные записи
      const idsToRemove = new Set(group.map((e) => e.id));
      const newEntries = state.entries.filter((e) => !idsToRemove.has(e.id));

      set({
        ...state,
        entries: newEntries
      });

      await persistHistory(newEntries);
    },

    async undoById(id: HistoryEntryId): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      const target = state.entries.find((e) => e.id === id);
      if (!target) return;

      let group: ExtendedSettingsHistoryEntry[];
      if (target.batchId) {
        const batchId = target.batchId;
        group = state.entries.filter((e) => e.batchId === batchId);
      } else {
        group = [target];
      }

      if (group.length === 0) return;

      const patch: SettingPatch[] = group.map((e) => ({
        id: e.changedSettingId,
        value: e.oldValue
      }));

      if (patch.length === 0) return;

      settingsStore.applyChanges(patch, { source: 'command' });

      const idsToRemove = new Set(group.map((e) => e.id));
      const newEntries = state.entries.filter((e) => !idsToRemove.has(e.id));

      set({
        ...state,
        entries: newEntries
      });

      await persistHistory(newEntries);
    },

    async clearHistory(): Promise<void> {
      set({
        entries: [],
        limit: getStateSnapshot(store.subscribe).limit
      });

      try {
        await invoke('settings_history_clear');
      } catch {
        // Игнорируем: in-memory уже очищен.
      }
    },

    setLimit(limit: number): void {
      if (!Number.isFinite(limit) || limit <= 0) return;

      update((state) => {
        const overflow = state.entries.length - limit;
        const entries =
          overflow > 0 ? state.entries.slice(overflow) : state.entries;
        // Сохраняем обрезанную историю асинхронно.
        void persistHistory(entries);
        return {
          ...state,
          limit,
          entries
        };
      });
    }
  };

  return store;
}

// Глобальный экземпляр для приложения.
// Tauri-команды settings_history_* должны быть реализованы на стороне Rust.
export const settingsHistoryStore: SettingsHistoryStore =
  createSettingsHistoryStore();