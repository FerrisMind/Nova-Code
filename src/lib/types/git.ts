// src/lib/types/git.ts
// -----------------------------------------------------------------------------
// TypeScript зеркала для Git-модуля backend (Rust) и нормализованные UI-типы.
// Все пути от backend приходят относительно корня репозитория (forward slash).
// -----------------------------------------------------------------------------

// Сырые статусы, соответствующие сериализации Rust enums (serde).
export type RawGitFileStatus =
  | 'Modified'
  | 'Added'
  | 'Deleted'
  | 'Conflicted'
  | 'Untracked'
  | { Renamed: { old_path: string } }
  | { Copied: { source: string } };

export interface RawGitFileChange {
  path: string; // repo-relative
  status: RawGitFileStatus;
  staged: boolean;
}

export interface RawGitRepositoryStatus {
  repository_path: string; // absolute repo root (native separators normalized to /)
  current_branch: string | null;
  is_detached: boolean;
  ahead: number;
  behind: number;
  staged_changes: RawGitFileChange[];
  changes: RawGitFileChange[];
  untracked: string[]; // repo-relative
}

export interface CommitInfo {
  hash: string;
  short_hash: string;
  message: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  parent_hashes: string[];
}

export interface GitDiff {
  path: string; // repo-relative
  old_content: string;
  new_content: string;
  language: string;
  binary: boolean;
}

// Нормализованный статус для UI.
export type GitFileStatusKind =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'conflicted'
  | 'untracked';

export interface GitFileStatusNormalized {
  kind: GitFileStatusKind;
  oldPath?: string;
  source?: string;
}

export interface GitFileChangeNormalized {
  repoPath: string;
  workspacePath?: string;
  staged: boolean;
  status: GitFileStatusNormalized;
}

export interface GitRepositoryStatusNormalized {
  repoPath: string;
  workspaceRoot?: string;
  currentBranch: string | null;
  isDetached: boolean;
  ahead: number;
  behind: number;
  staged: GitFileChangeNormalized[];
  changes: GitFileChangeNormalized[];
  untracked: Array<{
    repoPath: string;
    workspacePath?: string;
  }>;
}

export type FileStatusEntry = {
  repoPath: string;
  workspacePath?: string;
  status: GitFileStatusNormalized;
};

export type GitHistoryPage = CommitInfo[];

export class GitServiceError extends Error {
  severity: 'info' | 'warning' | 'error' | 'fatal';
  details?: unknown;

  constructor(message: string, severity: GitServiceError['severity'] = 'error', details?: unknown) {
    super(message);
    this.name = 'GitServiceError';
    this.severity = severity;
    this.details = details;
  }
}
