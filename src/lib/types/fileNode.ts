// src/lib/types/fileNode.ts
// -----------------------------------------------------------------------------
// Утилитные типы для представления файловой структуры workspace.
// Согласованы с Rust-командой `read_workspace`, которая возвращает идентификатор,
// имя, путь и информацию о типе (директория/файл), а также metadata.
// -----------------------------------------------------------------------------

export type FileNodeType = 'file' | 'dir';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileNodeType;
  size?: number;
  modified?: number;
  children?: FileNode[];
}
