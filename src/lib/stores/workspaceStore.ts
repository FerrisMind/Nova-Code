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
  root: string | null;
}

const deriveWorkspaceName = (root: string | null): string => {
  if (!root || root === '.' || root === './') {
    return 'Nova Workspace';
  }
  const normalized = root.replace(/\\/g, '/').replace(/\/+$/, '');
  const segments = normalized.split('/');
  return segments.at(-1) || 'Workspace';
};

let currentRoot: string | null = fileService.getWorkspaceRoot() || '.';

const internal = writable<WorkspaceState>({
  name: deriveWorkspaceName(currentRoot),
  files: [],
  loading: true,
  root: currentRoot
});

const loadWorkspaceFiles = async () => {
  if (!currentRoot) {
    internal.set({
      name: 'No Folder Opened',
      files: [],
      loading: false,
      root: null
    });
    return;
  }

  internal.update((state) => ({
    ...state,
    loading: true,
    root: currentRoot,
    error: undefined
  }));

  try {
    const files = await fileService.listWorkspaceFiles(currentRoot);
    internal.set({
      name: deriveWorkspaceName(currentRoot),
      files,
      loading: false,
      root: currentRoot
    });
  } catch (error) {
    internal.set({
      name: deriveWorkspaceName(currentRoot),
      files: [],
      loading: false,
      error: String(error),
      root: currentRoot
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
void fileService.startFileWatcher();
void loadWorkspaceFiles();

export const stopWorkspaceWatching = () => {
  if (unsubscribeWatcher) {
    unsubscribeWatcher();
    unsubscribeWatcher = null;
  }
};

export const workspaceStore = {
  subscribe: internal.subscribe,
  refresh: loadWorkspaceFiles,
  openFolder: (root: string) => {
    currentRoot = root;
    fileService.setWorkspaceRoot(root);
    void loadWorkspaceFiles();
  },
  closeFolder: () => {
    currentRoot = null;
    void loadWorkspaceFiles();
  }
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
