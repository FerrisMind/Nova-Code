// src/lib/sidebar/fileTreeActions.ts
// ----------------------------------------------------------------------------- 
// Команды файлового Tree в Explorer: открытие, новые файлы/папки, переименование и удаление.
// ----------------------------------------------------------------------------- 

import type { FileNode } from '../types/fileNode';
import { editorStore } from '../stores/editorStore';
import { getActiveGroupId, splitRightFromActive } from '../stores/layout/editorGroupsStore';
import { revealNode } from '../stores/fileTreeStore';
import { fileService } from '../services/fileService';
import { workspaceStore } from '../stores/workspaceStore';

type PathString = string;

const normalize = (value: string): string => value.replace(/\\/g, '/');

const getParentPath = (value: string): string => {
  const normalized = normalize(value).replace(/\/+$/, '');
  const idx = normalized.lastIndexOf('/');
  if (idx <= 0) {
    return normalized || '.';
  }
  return normalized.slice(0, idx);
};

const joinPath = (dir: string, name: string): string => {
  const normalizedDir = normalize(dir).replace(/\/+$/, '');
  if (!normalizedDir || normalizedDir === '.') {
    return name;
  }
  return `${normalizedDir}/${name}`;
};

const computeTargetDir = (node: FileNode | null): PathString => {
  if (!node) {
    return '.';
  }
  if (node.type === 'dir') {
    return node.path;
  }
  return getParentPath(node.path);
};

const handleError = (action: string, error: unknown): void => {
  console.error(`${action} failed`, error);
  alert(`${action} failed: ${error}`);
};

export type FileTreeActionId =
  | 'open'
  | 'openToSide'
  | 'revealInExplorer'
  | 'newFile'
  | 'newFolder'
  | 'rename'
  | 'delete';

export function open(node: FileNode): void {
  if (node.type !== 'file') return;
  const targetGroupId = getActiveGroupId();
  editorStore.ensureTabForFile(node.id || node.path, {
    activate: true,
    groupId: targetGroupId
  });
}

export function openToSide(node: FileNode): void {
  if (node.type !== 'file') return;
  const targetGroupId = getActiveGroupId();

  const tab = editorStore.ensureTabForFile(node.id || node.path, {
    activate: true,
    groupId: targetGroupId
  });

  if (!tab) return;
  splitRightFromActive();
}

export function revealInExplorer(_node: FileNode): void {
  if (!_node) return;
  fileService.revealInExplorer(_node.path).catch((err) => handleError('Reveal', err));
  revealNode(_node);
}

export async function newFile(node: FileNode | null): Promise<void> {
  const dir = computeTargetDir(node);
  const path = joinPath(dir, `new-file-${Date.now()}.txt`);

  try {
    await fileService.createFile(path);
    await workspaceStore.refresh();
  } catch (error) {
    handleError('Create file', error);
  }
}

export async function newFolder(node: FileNode | null): Promise<void> {
  const dir = computeTargetDir(node);
  const path = joinPath(dir, `new-folder-${Date.now()}`);

  try {
    await fileService.createDirectory(path);
    await workspaceStore.refresh();
  } catch (error) {
    handleError('Create folder', error);
  }
}

export async function rename(node: FileNode): Promise<void> {
  const newName = window.prompt('Rename to', node.name);
  if (!newName || !newName.trim()) return;
  const trimmed = newName.trim();
  const targetDir = getParentPath(node.path);
  const newPath = joinPath(targetDir, trimmed);

  try {
    await fileService.renameFile(node.path, newPath);
    await workspaceStore.refresh();
  } catch (error) {
    handleError('Rename', error);
  }
}

export async function deleteNode(node: FileNode): Promise<void> {
  const useTrash = window.confirm(
    'Move to Trash? Press Cancel to delete permanently.'
  );

  try {
    await fileService.deleteFile(node.path, useTrash);
    await workspaceStore.refresh();
  } catch (error) {
    handleError('Delete', error);
  }
}
