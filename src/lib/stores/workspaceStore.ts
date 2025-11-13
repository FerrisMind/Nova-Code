import { writable } from 'svelte/store';
import type { FileNode } from '../types/fileNode';
import { fileService } from '../services/fileService';

/**
 * Хранилище workspace-файлов, построенное на Tauri-командах.
 * Держит дерево файлов, флаг загрузки/ошибки и позволяет Explorer/Editor
 * синхронизироваться с текущим filesystem-видом.
 */

interface WorkspaceState {
  name: string;
  files: FileNode[];
  loading: boolean;
  error?: string;
}

const initialState: WorkspaceState = {
  name: 'Nova Workspace',
  files: [],
  loading: true
};

const internal = writable<WorkspaceState>(initialState);

const loadWorkspaceFiles = async () => {
  try {
    const files = await fileService.listWorkspaceFiles();
    internal.set({
      name: 'Nova Workspace',
      files,
      loading: false
    });
  } catch (error) {
    internal.set({
      name: 'Nova Workspace',
      files: [],
      loading: false,
      error: String(error)
    });
  }
};

let unsubscribeWatcher: (() => void) | null = null;

const setupWatcher = async () => {
  if (unsubscribeWatcher) {
    unsubscribeWatcher();
  }
  unsubscribeWatcher = await fileService.onFileChange(() => {
    void loadWorkspaceFiles();
  });
};

void setupWatcher();
void loadWorkspaceFiles();

export const stopWorkspaceWatching = () => {
  if (unsubscribeWatcher) {
    unsubscribeWatcher();
    unsubscribeWatcher = null;
  }
};

export const workspaceStore = {
  subscribe: internal.subscribe,
  refresh: loadWorkspaceFiles
};

/**
 * Утилита для получения дерева файлов (используется editorStore / ExplorerView).
 */
export const getWorkspaceFiles = (): FileNode[] => {
  let snapshot: WorkspaceState | undefined;
  const unsubscribe = internal.subscribe((state) => {
    snapshot = state;
  });
  unsubscribe();
  return snapshot?.files ?? [];
};
