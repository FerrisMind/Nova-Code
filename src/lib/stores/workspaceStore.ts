import { writable } from 'svelte/store';
import { workspaceFiles, type FileNode } from '../mocks/files.mock';

/**
 * Минимальный workspaceStore:
 * - фиксированное имя workspace
 * - статическое дерево файлов из mocks
 * Этого достаточно для ExplorerView и editorStore.
 */

interface WorkspaceState {
  name: string;
  files: FileNode[];
}

const initialState: WorkspaceState = {
  name: 'Nova Workspace',
  files: workspaceFiles
};

export const workspaceStore = writable<WorkspaceState>(initialState);

/**
 * Утилита для получения дерева файлов (используется editorStore / ExplorerView).
 */
export const getWorkspaceFiles = (): FileNode[] => workspaceFiles;