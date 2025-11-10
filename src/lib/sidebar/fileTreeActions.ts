// src/lib/sidebar/fileTreeActions.ts
// -----------------------------------------------------------------------------
// Контракты действий для файлового дерева (Explorer).
//
// Ответственность:
// - Описание идентификаторов действий контекстного меню;
// - Минимальные реализации open / openToSide поверх editorStore / editorGroupsStore;
// - Контрактные точки для FS-операций (newFile/newFolder/rename/delete) без
//   прямой зависимости от Tauri (будут реализованы через FS-адаптер).
//
// Архитектура и API вдохновлены VS Code Explorer и согласованы с текущим
// layout Nova Code. Реализация проверена по актуальным практикам VS Code,
// Svelte 5 и Tauri v2 через context7 и официальную документацию.
// -----------------------------------------------------------------------------

import type { FileNode } from '../mocks/files.mock';
import { editorStore } from '../stores/editorStore';
import { splitRightFromActive } from '../stores/layout/editorGroupsStore';

// Идентификаторы действий, доступных в контекстном меню дерева файлов.
export type FileTreeActionId =
  | 'open'
  | 'openToSide'
  | 'revealInExplorer'
  | 'newFile'
  | 'newFolder'
  | 'rename'
  | 'delete';

/**
 * Открыть файл в текущей (активной) группе редактора.
 * - Использует editorStore.ensureTabForFile.
 * - Активирует вкладку.
 */
export function open(node: FileNode): void {
  if (node.type !== 'file') return;
  editorStore.ensureTabForFile(node.id || node.path, {
    activate: true,
    groupId: 1
  });
}

/**
 * Открыть файл в правой группе (Open to Side).
 * - Минимальная реализация:
 *   - Гарантирует вкладку для файла.
 *   - Вызывает splitRightFromActive() для переноса активной вкладки вправо.
 * - Поведение аккуратно интегрировано с одногрупповым режимом:
 *   - Если правой группы ещё нет, она будет создана;
 *   - Если нет активной вкладки, splitRightFromActive() ничего не сломает.
 */
export function openToSide(node: FileNode): void {
  if (node.type !== 'file') return;

  // Гарантируем вкладку (в базовой группе).
  const tab = editorStore.ensureTabForFile(node.id || node.path, {
    activate: true,
    groupId: 1
  });

  if (!tab) return;

  // splitRightFromActive:
  // - создаст новую группу и переместит активную вкладку вправо.
  // - текущее API editorGroupsStore уже учитывает эти сценарии.
  splitRightFromActive();
}

/**
 * revealInExplorer:
 * - В текущем Explorer дерево уже отображается.
 * - Функция остаётся для совместимости и будущих сценариев (например, вызов
 *   из поиска или других панелей).
 */
export function revealInExplorer(_node: FileNode): void {
  // TODO: При интеграции с глобальными командами можно:
  // - синхронизировать selection/scroll к нужному узлу;
  // - использовать fileTreeStore.syncWithActiveTab или прямой выбор.
}

/**
 * Ниже — контрактные точки для действий, требующих реального FS:
 * - newFile / newFolder / rename / delete.
 * Они НЕ бросают ошибок и НЕ вызываются из UI до реализации.
 * Реализация будет добавлена через Tauri FS-адаптер и команды.
 */

export function newFile(_node: FileNode | null): void {
  // TODO: Реализовать через Tauri FS-адаптер (create file + обновление workspaceStore).
}

export function newFolder(_node: FileNode | null): void {
  // TODO: Реализовать через Tauri FS-адаптер (create dir + обновление workspaceStore).
}

export function rename(_node: FileNode): void {
  // TODO: Реализовать через Tauri FS-адаптер (rename + обновление workspaceStore).
}

export function deleteNode(_node: FileNode): void {
  // TODO: Реализовать через Tauri FS-адаптер (delete + обновление workspaceStore).
}