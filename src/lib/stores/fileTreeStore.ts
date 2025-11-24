// src/lib/stores/fileTreeStore.ts
// -----------------------------------------------------------------------------
// UI-store для состояния файлового дерева (Explorer), вдохновлённый моделью
// VS Code Explorer и согласованный с архитектурой Nova Code.
//
// Ответственность:
// - отслеживание раскрытых директорий;
// - отслеживание выбранного файла;
// - синхронизация выделения с активной вкладкой редактора;
// - работа поверх mocks/workspaceStore без прямых зависимостей от Tauri/FS.
//
// Дизайн и API опираются на практики VS Code / Svelte 5 / Tauri v2, проверенные
// через context7 и актуальную официальную документацию.
// -----------------------------------------------------------------------------

import { writable, derived, get, type Readable } from 'svelte/store';
import type { FileNode } from '../types/fileNode';
import { workspaceStore } from './workspaceStore';
import { editorStore, activeEditor } from './editorStore';

// -----------------------------------------------------------------------------
// Типы
// -----------------------------------------------------------------------------

export type FileNodeId = string;

interface FileTreeState {
  expanded: Set<FileNodeId>;
  selectedFileId: FileNodeId | null;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции
// -----------------------------------------------------------------------------

/**
 * Normalize path for comparison (handle Windows backslashes).
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase();
}

/**
 * Рекурсивный поиск узла по id в дереве файлов.
 * Чистая утилита, использующая FileNode из mocks/workspaceStore.
 */
function findNodeById(nodes: FileNode[], id: FileNodeId): FileNode | null {
  const targetId = normalizePath(id);
  for (const node of nodes) {
    if (normalizePath(node.id) === targetId) return node;
    if (node.type === 'dir' && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Рекурсивный поиск узла по пути.
 * Используется как запасной вариант сопоставления активной вкладки и FileNode.
 */
function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  const targetPath = normalizePath(path);
  for (const node of nodes) {
    if (normalizePath(node.path) === targetPath) return node;
    if (node.type === 'dir' && node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Построение списка всех родительских директорий для заданного узла.
 * Возвращает массив id директорий от корня до родителя целевого узла.
 */
function collectParentDirs(
  nodes: FileNode[],
  targetId: FileNodeId,
  acc: FileNodeId[] = []
): FileNodeId[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return acc;
    }
    if (node.type === 'dir' && node.children) {
      const nextAcc = [...acc, node.id];
      const found = collectParentDirs(node.children, targetId, nextAcc);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Получить актуальное дерево файлов из workspaceStore.
 * workspaceStore сейчас read-only и основан на mocks.
 */
function getWorkspaceFilesSnapshot(): FileNode[] {
  let snapshot: { files: FileNode[] } = { files: [] };
  workspaceStore.subscribe((state) => {
    snapshot = state;
  })();
  return snapshot.files;
}

// -----------------------------------------------------------------------------
// Внутренний writable store
// -----------------------------------------------------------------------------

const internal = writable<FileTreeState>({
  expanded: new Set<FileNodeId>(),
  selectedFileId: null
});

// -----------------------------------------------------------------------------
// Публичный readable store
// -----------------------------------------------------------------------------

/**
 * Публичное состояние дерева:
 * - expanded: Set с id раскрытых директорий;
 * - selectedFileId: id выбранного файла или null.
 *
 * Отдаём как Readable, модификации только через экспортированные функции.
 */
export const fileTreeState: Readable<FileTreeState> = derived(
  internal,
  ($state) => $state
);

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

/**
 * Проверить, раскрыта ли директория с данным id.
 */
export function isExpanded(id: FileNodeId): boolean {
  const { expanded } = get(internal);
  return expanded.has(id);
}

/**
 * Раскрыть директорию.
 */
export function expand(id: FileNodeId): void {
  internal.update((state) => {
    if (state.expanded.has(id)) return state;
    const next = new Set(state.expanded);
    next.add(id);
    return {
      ...state,
      expanded: next
    };
  });
}

/**
 * Свернуть директорию.
 */
export function collapse(id: FileNodeId): void {
  internal.update((state) => {
    if (!state.expanded.has(id)) return state;
    const next = new Set(state.expanded);
    next.delete(id);
    return {
      ...state,
      expanded: next
    };
  });
}

/**
 * Переключить состояние директории (раскрыта/свернута).
 */
export function toggleDir(id: FileNodeId): void {
  internal.update((state) => {
    const next = new Set(state.expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return {
      ...state,
      expanded: next
    };
  });
}

/**
 * Выбрать файл по id.
 * Не открывает вкладку напрямую: для этого отвечает editorStore / fileTreeActions.
 */
export function selectFile(id: FileNodeId): void {
  internal.update((state) => ({
    ...state,
    selectedFileId: id
  }));
}

/**
 * syncWithActiveTab:
 * - Синхронизирует selectedFileId и expanded с активной вкладкой редактора.
 * - Принимает tabId или null.
 * - Ищет соответствующий FileNode:
 *   - по id (fileId === tabId),
 *   - по path из activeEditor при необходимости.
 * - Раскрывает все родительские директории найденного узла.
 *
 * Вызывать:
 * - из подписки на activeEditor (см. ExplorerView.svelte);
 * - при изменениях layout/groups, если потребуется.
 */
export function syncWithActiveTab(tabId: string | null): void {
  // console.log('[fileTreeStore] syncWithActiveTab called', tabId);
  const files = getWorkspaceFilesSnapshot();

  if (!tabId) {
    // Если активной вкладки нет — не сбрасываем expanded, только выбор.
    internal.update((state) => ({
      ...state,
      selectedFileId: null
    }));
    return;
  }

  // Пытаемся найти FileNode напрямую по id.
  let node = findNodeById(files, tabId);
  // console.log('[fileTreeStore] findNodeById result', node?.id);

  // Если не нашли по id, пробуем по path активного редактора.
  if (!node) {
    const $active = get(activeEditor);
    if ($active?.path) {
      node = findNodeByPath(files, $active.path);
      // console.log('[fileTreeStore] findNodeByPath result', node?.id);
    }
  }

  if (!node || node.type !== 'file') {
    // Если вкладка не соответствует файлу в дереве, не ломаем состояние.
    // console.log('[fileTreeStore] node not found or not a file');
    return;
  }

  const parentDirs = collectParentDirs(files, node.id) ?? [];

  internal.update((state) => {
    // console.log('[fileTreeStore] updating state with selectedFileId', node!.id);
    const nextExpanded = new Set(state.expanded);
    for (const dirId of parentDirs) {
      nextExpanded.add(dirId);
    }
    return {
      ...state,
      expanded: nextExpanded,
      selectedFileId: node!.id
    };
  });
}

/**
 * Expand parents and select the provided node in the tree.
 */
export function revealNode(node: FileNode | null): void {
  if (!node) return;

  const files = getWorkspaceFilesSnapshot();
  const target = findNodeById(files, node.id) ?? findNodeByPath(files, node.path);
  if (!target || target.type !== 'file') return;

  const parentDirs = collectParentDirs(files, target.id) ?? [];

  internal.update((state) => {
    const nextExpanded = new Set(state.expanded);
    for (const dirId of parentDirs) {
      nextExpanded.add(dirId);
    }
    return {
      ...state,
      expanded: nextExpanded,
      selectedFileId: target.id
    };
  });
}
