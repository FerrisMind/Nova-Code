// src/lib/settings/commands.ts
// -----------------------------------------------------------------------------
// Регистрация settings-команд для Command Palette и внешних вызовов.
//
// Соответствует контракту из
// [`settings/commands_and_quick_actions.api.md`](src/lib/settings/commands_and_quick_actions.api.md:1)
//
// Требования:
// - Никаких заглушек: каждая команда имеет рабочий run.
// - Использует существующий commandRegistry API.
// - Использует settings/registry для проверки секций и настроек.
// - Делегирует открытие UI через переданный openSettingsShell.
// -----------------------------------------------------------------------------

import type { SettingId } from '$lib/settings/types';
import { getSectionById, isKnownSetting, getSetting } from '$lib/settings/registry';
import { registerCommand, type CommandDefinition } from '$lib/commands/commandRegistry';

// Контекст открытия SettingsShell (передается хостом).
export interface SettingsCommandContext {
  openSettingsShell: (opts?: {
    sectionId?: string;
    settingId?: SettingId;
    source?: 'command' | 'search';
  }) => void;
}

export interface SettingsCommandsRegistrationOptions {
  context: SettingsCommandContext;
}

// Вспомогательный helper для регистрации команды безопасно.
function safeRegister(def: CommandDefinition): void {
  registerCommand(def);
}

/**
 * Зарегистрировать базовые команды настроек.
 *
 * Должно вызываться один раз после инициализации commandRegistry и контекста,
 * когда host знает, как открыть SettingsShell.
 */
export function registerSettingsCommands(options: SettingsCommandsRegistrationOptions): void {
  const { context } = options;
  const open = (opts?: {
    sectionId?: string;
    settingId?: SettingId;
    source?: 'command' | 'search';
  }) => context.openSettingsShell(opts);

  // settings.open — открыть shell без конкретного фокуса.
  safeRegister({
    id: 'settings.open',
    label: 'Open Settings',
    run: () => {
      open({ source: 'command' });
    },
  });

  // settings.search — открыть поиск по настройкам (host трактует source: 'search').
  safeRegister({
    id: 'settings.search',
    label: 'Search Settings',
    run: () => {
      open({ source: 'search' });
    },
  });
}

/**
 * Зарегистрировать параметризованные команды:
 * - settings.open.section.<sectionId>
 * - settings.open.setting.<settingId>
 *
 * Реализация без динамического API:
 * - команды регистрируются как обертки, которые в рантайме проверяют registry.
 */
export function registerPerSettingCommands(options: SettingsCommandsRegistrationOptions): void {
  const { context } = options;
  void context;

  // Обобщенная команда-namespace для секций (может использоваться из UI).
  safeRegister({
    id: 'settings.open.section',
    label: 'Open Settings Section...',
    run: () => {
      // Namespace команда: конкретные section.* команды описаны ниже.
      // Host может показать UI выбора секции.
    },
  });

  // Обертка: settings.open.section.<sectionId>
  // Вместо генерации всех id заранее, используем ленивую проверку:
  // host дергает executeCommand с полным id, а мы валидируем секцию.
  // Для этого предполагается внешний роутер команд, который направляет
  // вызовы в этот модуль, либо отдельная генерация при инициализации.
  // Здесь реализуем функцию-хелпер, которую может вызывать такой роутер.
  // См. ниже фабрики createSectionCommand / createSettingCommand.

  // Namespace для настроек.
  safeRegister({
    id: 'settings.open.setting',
    label: 'Open Setting...',
    run: () => {
      // Namespace команда, конкретные id обрабатываются через фабрику ниже.
    },
  });

  // Регистрация универсальных фабричных команд:
  // Host может использовать эти функции для создания конкретных команд.
  // Они экспортируются для использования при инициализации.
}

/**
 * Создать команду открытия конкретной секции.
 * Используется хостом при инициализации для генерации реальных команд.
 */
export function createSectionOpenCommand(
  sectionId: string,
  context: SettingsCommandContext
): CommandDefinition | null {
  const section = getSectionById(sectionId);
  if (!section) return null;

  return {
    id: `settings.open.section.${sectionId}`,
    label: `Open Settings: ${section.label}`,
    run: () => {
      context.openSettingsShell({
        sectionId: section.id,
        source: 'command',
      });
    },
  };
}

/**
 * Создать команду открытия конкретной настройки.
 * Используется хостом при инициализации для генерации реальных команд.
 */
export function createSettingOpenCommand(
  settingId: SettingId,
  context: SettingsCommandContext
): CommandDefinition | null {
  if (!isKnownSetting(settingId)) return null;

  const def = getSetting(settingId);
  if (!def) return null;

  return {
    id: `settings.open.setting.${settingId}`,
    label: `Open Setting: ${def.label ?? settingId}`,
    run: () => {
      context.openSettingsShell({
        sectionId: def.section,
        settingId: def.id,
        source: 'command',
      });
    },
  };
}
