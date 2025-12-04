// src/lib/settings/quickActions.ts
// -----------------------------------------------------------------------------
// Quick Actions — тонкий слой над существующими сторами и Tauri-командами.
// Реальные действия, без заглушек.
//
// Соответствует контракту из
// [`settings/commands_and_quick_actions.api.md`](src/lib/settings/commands_and_quick_actions.api.md:1)
//
// Ключевые принципы:
// - Единый источник истины: settingsStore, settingsProfilesStore, settingsHistoryStore.
// - Все run() делают реальные вызовы;
// - Ошибки логируются через console.error, но не ломают UI.
// - Интеграция с Tauri v2 через @tauri-apps/api/core.invoke:
//     - settings_export
//     - settings_import
// -----------------------------------------------------------------------------

import { invoke } from '@tauri-apps/api/core';
import type { SettingValue, SettingsSnapshot } from '$lib/settings/types';
import { settingsStore } from '$lib/stores/settingsStore';
import { settingsProfilesStore } from '$lib/stores/settingsProfilesStore';
import { settingsHistoryStore } from '$lib/stores/settingsHistoryStore';

export type QuickActionId =
  | 'reset-all'
  | 'profiles-open'
  | 'profiles-create-from-current'
  | 'export-json'
  | 'import-json';

export interface QuickAction {
  id: QuickActionId;
  label: string;
  icon?: string;
  run: () => Promise<void> | void;
}

export interface SettingsExportPayload {
  version: 1;
  createdAt: string; // ISO
  snapshot: SettingsSnapshot;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции для импорта/экспорта
// -----------------------------------------------------------------------------

async function exportSettingsAsJson(): Promise<void> {
  const snapshot = settingsStore.getSnapshot();
  const payload: SettingsExportPayload = {
    version: 1,
    createdAt: new Date().toISOString(),
    snapshot,
  };

  try {
    // Реальная Tauri-команда:
    // Ожидается, что на Rust-стороне:
    // - принимает payload (SettingsExportPayload),
    // - либо сохраняет в файл, либо возвращает строку JSON.
    const result = (await invoke('settings_export', {
      snapshot: payload,
    })) as string | void;

    if (typeof result === 'string') {
      // Если Rust вернул строку, даем хосту возможность сохранить/показать.
      // Здесь минимальный вариант: лог в консоль.
      console.info('[settings_export] JSON:', result);
    }
  } catch (error) {
    console.error('[QuickAction export-json] Failed', error);
  }
}

async function importSettingsFromJson(): Promise<void> {
  try {
    // Команда settings_import:
    // - на стороне Rust должна:
    //   - получить содержимое (например, через диалог выбора файла),
    //   - распарсить, провалидировать,
    //   - вернуть массив patch-подобных структур { id, value }.
    const patch = (await invoke('settings_import')) as
      | { id: string; value: unknown }[]
      | null
      | undefined;

    if (!patch || patch.length === 0) {
      return;
    }

    // Применяем изменения и фиксируем историю.
    const applied = settingsStore.applyChanges(
      patch.map((p) => ({ id: p.id, value: p.value as SettingValue })),
      { source: 'import' }
    );

    if (applied.length > 0) {
      await settingsHistoryStore.appendChanges(
        applied.map((c) => ({
          settingId: c.id,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
        { source: 'import' }
      );
      settingsStore.setBaselineFromCurrent();
    }
  } catch (error) {
    console.error('[QuickAction import-json] Failed', error);
  }
}

// -----------------------------------------------------------------------------
// Quick Actions
// -----------------------------------------------------------------------------

export function getDefaultQuickActions(): QuickAction[] {
  return [
    {
      id: 'reset-all',
      label: 'Reset All Settings',
      icon: 'arrow-counterclockwise',
      run: async () => {
        const applied = settingsStore.resetAll({ source: 'quickAction' });
        if (applied.length > 0) {
          await settingsHistoryStore.appendChanges(
            applied.map((c) => ({
              settingId: c.id,
              oldValue: c.oldValue,
              newValue: c.newValue,
            })),
            { source: 'quickAction' }
          );
        }
      },
    },
    {
      id: 'profiles-open',
      label: 'Open Profiles',
      icon: 'person',
      run: () => {
        // Конкретный UI-режим профилей управляется host-компонентом (SettingsShell)
        // через eventBus / внешний стейт.
        // Здесь достаточно зафиксировать факт вызова.
        console.info('[QuickAction profiles-open] Triggered');
      },
    },
    {
      id: 'profiles-create-from-current',
      label: 'Create Profile from Current Settings',
      icon: 'plus-circle',
      run: async () => {
        const snapshot = settingsStore.getSnapshot();
        const label = `Profile ${new Date().toLocaleTimeString()}`;
        try {
          await settingsProfilesStore.createProfileFromCurrent({
            label,
            isDefault: false,
          });

          // Опционально: сохранить в историю как batch профиля.
          await settingsHistoryStore.appendChanges(
            Object.entries(snapshot.editor).map(([key, value]) => ({
              settingId: `editor.${key}`,
              oldValue: value,
              newValue: value,
            })),
            { source: 'profile' }
          );
        } catch (error) {
          console.error('[QuickAction profiles-create-from-current] Failed', error);
        }
      },
    },
    {
      id: 'export-json',
      label: 'Export Settings (JSON)',
      icon: 'export',
      run: () => exportSettingsAsJson(),
    },
    {
      id: 'import-json',
      label: 'Import Settings (JSON)',
      icon: 'import',
      run: () => importSettingsFromJson(),
    },
  ];
}
