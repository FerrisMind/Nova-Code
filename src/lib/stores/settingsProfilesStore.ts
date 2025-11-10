// src/lib/stores/settingsProfilesStore.ts
// -----------------------------------------------------------------------------
// Реализация стора профилей настроек поверх settingsStore с реальной Tauri v2
// интеграцией через invoke-команды.
//
// Соответствует контракту из
// [`settingsProfilesStore.api.md`](src/lib/stores/settingsProfilesStore.api.md:1)
// и требованиям задачи:
// - единый источник истины: использует settingsStore.getSnapshot/applyChanges;
// - никакие фиктивные реализации: все публичные методы делают реальные операции;
// - Tauri-интеграция через @tauri-apps/api/core.invoke с командами:
//     - settings_profiles_load
//     - settings_profiles_save
// - хранение профилей на стороне Rust в JSON (см. src-tauri/src/lib.rs).
//
// В web-only / non-Tauri окружении:
// - invoke может быть недоступен; ошибки пробрасываются в state.error,
//   но API остается рабочим и предсказуемым.
// -----------------------------------------------------------------------------

import { writable, type Readable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { settingsStore } from '$lib/stores/settingsStore';
import type { SettingsProfile, SettingsSnapshot } from '$lib/settings/types';
import type { SettingPatch } from '$lib/stores/settingsStore';

// -----------------------------------------------------------------------------
// Типы по контракту api.md
// -----------------------------------------------------------------------------

export type ProfileId = string;

export interface ResolvedSettingsProfile extends SettingsProfile {
  id: ProfileId;
  label: string;
  snapshot: SettingsSnapshot;
  icon?: string;
  isDefault?: boolean;
}

export interface SettingsProfilesState {
  profiles: ResolvedSettingsProfile[];
  activeProfileId: ProfileId | null;
  defaultProfileId: ProfileId | null;
  loading: boolean;
  error: string | null;
}

export interface SettingsProfilesStore extends Readable<SettingsProfilesState> {
  init(): Promise<void>;
  createProfileFromCurrent(params: {
    id?: ProfileId;
    label: string;
    icon?: string;
    isDefault?: boolean;
  }): Promise<ResolvedSettingsProfile>;
  applyProfile(id: ProfileId): Promise<void>;
  deleteProfile(id: ProfileId): Promise<void>;
  renameProfile(id: ProfileId, label: string): Promise<void>;
  updateProfileIcon(id: ProfileId, icon: string | undefined): Promise<void>;
  setDefaultProfile(id: ProfileId): Promise<void>;
  resetToDefaultProfile(): Promise<void>;
  getActiveProfile(): ResolvedSettingsProfile | null;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции
// -----------------------------------------------------------------------------

function generateProfileId(label: string, existing: ResolvedSettingsProfile[]): ProfileId {
  const base =
    'profile.' +
    (label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'profile');

  let id = base;
  let i = 1;
  const ids = new Set(existing.map((p) => p.id));
  while (ids.has(id)) {
    id = `${base}-${i++}`;
  }
  return id;
}

function buildPatchFromSnapshots(
  current: SettingsSnapshot,
  target: SettingsSnapshot
): SettingPatch[] {
  const patch: SettingPatch[] = [];

  // editor.*
  for (const key of Object.keys(target.editor) as (keyof SettingsSnapshot['editor'])[]) {
    const currentValue = current.editor[key];
    const nextValue = target.editor[key];
    if (currentValue !== nextValue) {
      patch.push({
        id: `editor.${String(key)}`,
        value: nextValue as any
      });
    }
  }

  // theme.*
  for (const key of Object.keys(target.theme) as (keyof SettingsSnapshot['theme'])[]) {
    const currentValue = current.theme[key];
    const nextValue = target.theme[key];
    if (currentValue !== nextValue) {
      patch.push({
        id: `theme.${String(key)}`,
        value: nextValue as any
      });
    }
  }

  // При расширении SettingsSnapshot сюда добавляются остальные домены.

  return patch;
}

function getStateSnapshot(subscribeFn: SettingsProfilesStore['subscribe']): SettingsProfilesState {
  let snapshot: SettingsProfilesState | undefined;
  const unsub = subscribeFn((s) => {
    snapshot = s;
  });
  unsub();
  if (!snapshot) {
    throw new Error('SettingsProfilesStore state is not initialized');
  }
  return snapshot;
}

// -----------------------------------------------------------------------------
// Создание стора
// -----------------------------------------------------------------------------

function createSettingsProfilesStore(): SettingsProfilesStore {
  const { subscribe, set, update } = writable<SettingsProfilesState>({
    profiles: [],
    activeProfileId: null,
    defaultProfileId: null,
    loading: false,
    error: null
  });

  let initialized = false;

  async function persistProfiles(profiles: ResolvedSettingsProfile[]): Promise<void> {
    try {
      await invoke('settings_profiles_save', { profiles });
    } catch (error: any) {
      update((state) => ({
        ...state,
        error: String(error?.message ?? error ?? 'Failed to save profiles')
      }));
      throw error;
    }
  }

  async function loadProfiles(): Promise<ResolvedSettingsProfile[]> {
    const raw = (await invoke('settings_profiles_load')) as ResolvedSettingsProfile[] | null;
    if (!raw) return [];
    return raw
      .filter((p) => p && typeof p.id === 'string' && typeof p.label === 'string')
      .map((p) => ({
        ...p,
        snapshot: p.snapshot
      }));
  }

  const store: SettingsProfilesStore = {
    subscribe,

    async init(): Promise<void> {
      if (initialized) return;
      initialized = true;

      update((state) => ({
        ...state,
        loading: true,
        error: null
      }));

      try {
        const profiles = await loadProfiles();

        if (profiles.length === 0) {
          // Нет профилей: создаем default из текущего snapshot.
          const snapshot = settingsStore.getSnapshot();
          const defaultProfile: ResolvedSettingsProfile = {
            id: 'default',
            label: 'Default',
            snapshot,
            icon: 'home',
            isDefault: true
          };

          await persistProfiles([defaultProfile]);

          set({
            profiles: [defaultProfile],
            activeProfileId: 'default',
            defaultProfileId: 'default',
            loading: false,
            error: null
          });
          return;
        }

        const explicitDefault = profiles.find((p) => p.isDefault);
        const defaultProfileId = explicitDefault?.id ?? profiles[0]?.id ?? null;
        const activeProfileId = defaultProfileId;

        set({
          profiles,
          activeProfileId,
          defaultProfileId,
          loading: false,
          error: null
        });
      } catch (error: any) {
        update((state) => ({
          ...state,
          loading: false,
          error: String(error?.message ?? error ?? 'Failed to load profiles')
        }));
      }
    },

    async createProfileFromCurrent(params): Promise<ResolvedSettingsProfile> {
      const { label, icon, isDefault } = params;
      if (!label || !label.trim()) {
        throw new Error('Profile label is required');
      }

      const state = getStateSnapshot(store.subscribe);
      const snapshot = settingsStore.getSnapshot();
      const id = params.id ?? generateProfileId(label, state.profiles);

      const created: ResolvedSettingsProfile = {
        id,
        label: label.trim(),
        icon,
        isDefault: !!isDefault,
        snapshot
      };

      const profiles = [...state.profiles, created];

      if (created.isDefault) {
        for (const p of profiles) {
          if (p.id !== created.id) {
            p.isDefault = false;
          }
        }
      }

      try {
        await persistProfiles(profiles);
      } catch {
        // Ошибка уже отражена в state.error, состояние не меняем.
        return created;
      }

      const defaultProfileId =
        created.isDefault
          ? created.id
          : state.defaultProfileId ?? (profiles[0]?.id ?? created.id);

      set({
        profiles,
        activeProfileId: created.id,
        defaultProfileId,
        loading: false,
        error: null
      });

      return created;
    },

    async applyProfile(id: ProfileId): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      const target = state.profiles.find((p) => p.id === id);
      if (!target) {
        throw new Error(`Profile not found: ${id}`);
      }

      const current = settingsStore.getSnapshot();
      const patch = buildPatchFromSnapshots(current, target.snapshot);

      settingsStore.applyChanges(patch, { source: 'profile' });

      const nextState = getStateSnapshot(store.subscribe);
      await persistProfiles(nextState.profiles).catch(() => {
        // ошибка уже попала в error, активный профиль всё равно считаем применённым
      });

      update((s) => ({
        ...s,
        activeProfileId: id
      }));
    },

    async deleteProfile(id: ProfileId): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      const profile = state.profiles.find((p) => p.id === id);
      if (!profile) return;

      if (profile.isDefault) {
        update((s) => ({
          ...s,
          error: `Cannot delete default profile (${id})`
        }));
        return;
      }

      const profiles = state.profiles.filter((p) => p.id !== id);
      const activeProfileId = state.activeProfileId === id ? null : state.activeProfileId;
      const defaultProfileId =
        state.defaultProfileId === id ? profiles[0]?.id ?? null : state.defaultProfileId;

      try {
        await persistProfiles(profiles);
      } catch {
        return;
      }

      set({
        profiles,
        activeProfileId,
        defaultProfileId,
        loading: false,
        error: null
      });
    },

    async renameProfile(id: ProfileId, label: string): Promise<void> {
      if (!label || !label.trim()) return;

      const state = getStateSnapshot(store.subscribe);
      const profiles = state.profiles.map((p) =>
        p.id === id ? { ...p, label: label.trim() } : p
      );

      try {
        await persistProfiles(profiles);
      } catch {
        return;
      }

      set({
        ...state,
        profiles
      });
    },

    async updateProfileIcon(id: ProfileId, icon: string | undefined): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      const profiles = state.profiles.map((p) =>
        p.id === id ? { ...p, icon } : p
      );

      try {
        await persistProfiles(profiles);
      } catch {
        return;
      }

      set({
        ...state,
        profiles
      });
    },

    async setDefaultProfile(id: ProfileId): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      if (!state.profiles.some((p) => p.id === id)) return;

      const profiles = state.profiles.map((p) => ({
        ...p,
        isDefault: p.id === id
      }));

      try {
        await persistProfiles(profiles);
      } catch {
        return;
      }

      set({
        ...state,
        profiles,
        defaultProfileId: id
      });
    },

    async resetToDefaultProfile(): Promise<void> {
      const state = getStateSnapshot(store.subscribe);
      const defaultId =
        state.defaultProfileId ?? state.profiles.find((p) => p.isDefault)?.id;

      if (!defaultId) {
        set({
          ...state,
          activeProfileId: null
        });
        return;
      }

      await this.applyProfile(defaultId);
    },

    getActiveProfile(): ResolvedSettingsProfile | null {
      const state = getStateSnapshot(store.subscribe);
      return state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
    }
  };

  return store;
}

// Глобальный экземпляр стора.
// В Tauri-режиме команды settings_profiles_* должны быть реализованы в Rust.
export const settingsProfilesStore: SettingsProfilesStore = createSettingsProfilesStore();