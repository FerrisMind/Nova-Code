// src/lib/services/fileService.ts
// -----------------------------------------------------------------------------
// Frontend-обёртка над Tauri-командами работы с файлами и деревом workspace.
// Предоставляет единый асинхронный API, которое можно тестировать и постепенно
// заменить моковую логику при переходе к реальному файловому backend.
// -----------------------------------------------------------------------------

import type { FileNode } from '../types/fileNode';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

let workspaceRoot = '.';
const FILE_CHANGED_EVENT = 'file-changed';

export interface FileService {
  readFile(fileId: string): Promise<string>;
  writeFile(fileId: string, content: string): Promise<void>;
  listWorkspaceFiles(rootOverride?: string): Promise<FileNode[]>;
  onFileChange(cb: (fileId: string) => void): Promise<() => void>;
  createFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  deleteFile(path: string, useTrash: boolean): Promise<void>;
  revealInExplorer(path: string): Promise<void>;
  setWorkspaceRoot(root: string): void;
  getWorkspaceRoot(): string;
  startFileWatcher(): Promise<void>;
}

export const fileService: FileService = {
  async readFile(fileId) {
    return invoke<string>('read_file', { path: fileId });
  },

  async writeFile(fileId, content) {
    await invoke<void>('write_file', { path: fileId, content });
  },

  async listWorkspaceFiles(rootOverride?: string) {
    const targetRoot = rootOverride ?? workspaceRoot;
    return invoke<FileNode[]>('read_workspace', { root: targetRoot || '.' });
  },

  async onFileChange(cb) {
    const unlisten = await listen<string>(FILE_CHANGED_EVENT, (event) => {
      cb(event.payload);
    });
    return () => {
      unlisten();
    };
  },

  async createFile(path) {
    await invoke<void>('create_file', { path });
  },

  async createDirectory(path) {
    await invoke<void>('create_directory', { path });
  },

  async renameFile(oldPath, newPath) {
    await invoke<void>('rename_file', { oldPath, newPath });
  },

  async deleteFile(path, useTrash) {
    await invoke<void>('delete_file', { path, useTrash });
  },

  async revealInExplorer(path) {
    await invoke<void>('reveal_in_explorer', { path });
  },

  async startFileWatcher() {
    await invoke<void>('start_file_watcher');
  },

  setWorkspaceRoot(root: string) {
    workspaceRoot = root || '.';
  },

  getWorkspaceRoot() {
    return workspaceRoot;
  }
};
