// src/lib/services/fileService.ts
// -----------------------------------------------------------------------------
// Frontend-обёртка над Tauri-командами работы с файлами и деревом workspace.
// Предоставляет единый асинхронный API, которое можно тестировать и постепенно
// заменить моковую логику при переходе к реальному файловому backend.
// -----------------------------------------------------------------------------

import type { FileNode } from '../types/fileNode';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const WORKSPACE_ROOT = '.';
const FILE_CHANGED_EVENT = 'file-changed';

export interface FileService {
  readFile(fileId: string): Promise<string>;
  writeFile(fileId: string, content: string): Promise<void>;
  listWorkspaceFiles(): Promise<FileNode[]>;
  onFileChange(cb: (fileId: string) => void): Promise<() => void>;
}

export const fileService: FileService = {
  async readFile(fileId) {
    return invoke<string>('read_file', { path: fileId });
  },

  async writeFile(fileId, content) {
    await invoke<void>('write_file', { path: fileId, content });
  },

  async listWorkspaceFiles() {
    return invoke<FileNode[]>('read_workspace', { root: WORKSPACE_ROOT });
  },

  async onFileChange(cb) {
    const unlisten = await listen<string>(FILE_CHANGED_EVENT, (event) => {
      cb(event.payload);
    });
    return () => {
      unlisten();
    };
  }
};
