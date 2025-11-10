// src/lib/commands/commandRegistry.ts
// -----------------------------------------------------------------------------
// Единый реестр команд Nova Code.
//
// Архитектура:
// - Это единый источник правды (single source of truth) для:
//   - Command Palette;
//   - глобальных хоткеев;
//   - любых внутренних вызовов команд по идентификатору.
// - Дизайн вдохновлён VS Code Command Palette и workbench commands API,
//   адаптирован под SvelteKit/Tauri v2 и текущую архитектуру проекта.
// - Контракты и подходы валидации опираются на актуальную документацию
//   VS Code, Svelte 5 и Tauri (через context7 и оф. источники), без
//   прямого веб-скрапинга или сторонних зависимостей.
// -----------------------------------------------------------------------------


// Тип идентификатора команды (совместим с VS Code style).
export type CommandId = string;

// Описание команды.
export interface CommandDefinition {
  id: CommandId;
  label: string;
  run: () => void | Promise<void>;
  category?: string;
  keybinding?: string;
}

// Внутренний реестр команд.
// Map позволяет переопределять команды по id: последний вызов registerCommand побеждает.
const commands = new Map<string, CommandDefinition>();

/**
 * Зарегистрировать или переопределить команду.
 * - Если команда с таким id уже существует, она заменяется (last write wins).
 */
export function registerCommand(cmd: CommandDefinition): void {
  if (!cmd || !cmd.id || typeof cmd.run !== 'function') {
    // Жёстких исключений не бросаем, чтобы не ломать рантайм;
    // в реальном приложении сюда можно повесить логгер.
    return;
  }
  commands.set(cmd.id, cmd);
}

/**
 * Получить список всех зарегистрированных команд.
 * Используется Command Palette и системы подсказок.
 */
export function getAllCommands(): CommandDefinition[] {
  return Array.from(commands.values());
}

/**
 * Выполнить команду по id.
 * - Если команды нет — no-op без исключений.
 * - Если есть — await run(), поддерживая как sync, так и async.
 */
export async function executeCommand(id: CommandId): Promise<void> {
  const cmd = commands.get(id);
  if (!cmd) return;
  await cmd.run();
}