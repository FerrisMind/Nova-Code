// src/lib/services/gitService.ts
// -----------------------------------------------------------------------------
// Обёртка над Tauri Git-командами. Нормализует пути (repo-relative → workspace)
// и статусы, предоставляет единый API для UI/сторов.
// -----------------------------------------------------------------------------

import { invoke } from '@tauri-apps/api/core';
import {
  type CommitInfo,
  type FileStatusEntry,
  type GitDiff,
  GitServiceError,
  type GitFileChangeNormalized,
  type GitFileStatusNormalized,
  type GitRepositoryStatusNormalized,
  type RawGitFileChange,
  type RawGitFileStatus,
  type RawGitRepositoryStatus,
} from '../types/git';

let workspaceRoot: string | null = null;
let repoRoot: string | null = null;

type InvokePayload = Record<string, unknown>;

const normalizeBase = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '');

const joinPath = (base: string, relative: string) => {
  const cleanBase = normalizeBase(base);
  const cleanRel = relative.replace(/^\/+/, '');
  return `${cleanBase}/${cleanRel}`;
};

const workspaceToRepoPath = (path: string): string => {
  if (!workspaceRoot) return path.replace(/\\/g, '/');
  const base = normalizeBase(workspaceRoot);
  const candidate = normalizeBase(path);
  if (candidate.startsWith(base)) {
    const rel = candidate.slice(base.length).replace(/^\/+/, '');
    return rel.length === 0 ? '.' : rel;
  }
  return path.replace(/\\/g, '/');
};

const repoToWorkspacePath = (repoPath: string): string | undefined => {
  if (!workspaceRoot) return undefined;
  return joinPath(workspaceRoot, repoPath);
};

const toGitError = (err: unknown): GitServiceError => {
  if (err instanceof GitServiceError) return err;
  const message = typeof err === 'string' ? err : ((err as Error)?.message ?? 'Git error');
  return new GitServiceError(message, 'error', err);
};

const normalizeStatus = (status: RawGitFileStatus): GitFileStatusNormalized => {
  if (typeof status === 'string') {
    switch (status) {
      case 'Added':
        return { kind: 'added' };
      case 'Modified':
        return { kind: 'modified' };
      case 'Deleted':
        return { kind: 'deleted' };
      case 'Conflicted':
        return { kind: 'conflicted' };
      case 'Untracked':
        return { kind: 'untracked' };
      default:
        return { kind: 'modified' };
    }
  }

  if ('Renamed' in status) {
    return { kind: 'renamed', oldPath: status.Renamed.old_path };
  }

  if ('Copied' in status) {
    return { kind: 'copied', source: status.Copied.source };
  }

  return { kind: 'modified' };
};

const mapChange = (change: RawGitFileChange): GitFileChangeNormalized => {
  const repoPath = change.path.replace(/\\/g, '/');
  return {
    repoPath,
    workspacePath: repoToWorkspacePath(repoPath),
    staged: change.staged,
    status: normalizeStatus(change.status),
  };
};

const mapStatus = (raw: RawGitRepositoryStatus): GitRepositoryStatusNormalized => {
  repoRoot = raw.repository_path;
  const workspacePath = workspaceRoot ?? undefined;

  return {
    repoPath: raw.repository_path,
    workspaceRoot: workspacePath,
    currentBranch: raw.current_branch,
    isDetached: raw.is_detached,
    ahead: raw.ahead,
    behind: raw.behind,
    staged: raw.staged_changes.map(mapChange),
    changes: raw.changes.map(mapChange),
    untracked: raw.untracked.map((path) => {
      const repoPathNormalized = path.replace(/\\/g, '/');
      return {
        repoPath: repoPathNormalized,
        workspacePath: repoToWorkspacePath(repoPathNormalized),
      };
    }),
  };
};

const invokeGit = async <T>(command: string, payload: InvokePayload = {}): Promise<T> => {
  try {
    return await invoke<T>(command, payload);
  } catch (err) {
    throw toGitError(err);
  }
};

export const gitService = {
  setWorkspaceRoot(root: string | null) {
    workspaceRoot = root ? normalizeBase(root) : null;
  },

  getWorkspaceRoot() {
    return workspaceRoot;
  },

  getRepositoryRoot() {
    return repoRoot;
  },

  async detectRepository(root: string): Promise<string | null> {
    const detected = await invokeGit<string | null>('git_detect_repository', { root });
    repoRoot = detected ?? null;
    return detected;
  },

  async initRepository(root: string): Promise<void> {
    await invokeGit<void>('git_init', { root });
  },

  async getStatus(): Promise<GitRepositoryStatusNormalized> {
    const status = await invokeGit<RawGitRepositoryStatus>('git_get_status');
    return mapStatus(status);
  },

  async refreshStatus(): Promise<GitRepositoryStatusNormalized> {
    const status = await invokeGit<RawGitRepositoryStatus>('git_refresh_status');
    return mapStatus(status);
  },

  async getFileStatuses(paths: string[]): Promise<FileStatusEntry[]> {
    const repoPaths = paths.map((p) => workspaceToRepoPath(p));
    const entries = await invokeGit<Array<[string, RawGitFileStatus]>>('git_get_file_statuses', {
      paths: repoPaths,
    });
    return entries.map(([path, status]) => {
      const repoPath = path.replace(/\\/g, '/');
      return {
        repoPath,
        workspacePath: repoToWorkspacePath(repoPath),
        status: normalizeStatus(status),
      };
    });
  },

  async stageFile(path: string): Promise<void> {
    const repoPath = workspaceToRepoPath(path);
    await invokeGit<void>('git_stage_file', { path: repoPath });
  },

  async unstageFile(path: string): Promise<void> {
    const repoPath = workspaceToRepoPath(path);
    await invokeGit<void>('git_unstage_file', { path: repoPath });
  },

  async stageAll(): Promise<number> {
    return invokeGit<number>('git_stage_all');
  },

  async unstageAll(): Promise<number> {
    return invokeGit<number>('git_unstage_all');
  },

  async discardChanges(paths: string[]): Promise<void> {
    const repoPaths = paths.map((p) => workspaceToRepoPath(p));
    await invokeGit<void>('git_discard_changes', { paths: repoPaths });
  },

  async commit(message: string): Promise<string> {
    return invokeGit<string>('git_commit', { message });
  },

  async getHistory(offset = 0, limit = 50): Promise<CommitInfo[]> {
    return invokeGit<CommitInfo[]>('git_get_history', { offset, limit });
  },

  async getFileDiff(path: string): Promise<GitDiff & { workspacePath?: string }> {
    const repoPath = workspaceToRepoPath(path);
    const diff = await invokeGit<GitDiff>('git_get_file_diff', { path: repoPath });
    return { ...diff, workspacePath: repoToWorkspacePath(diff.path) };
  },

  async getStagedDiff(path: string): Promise<GitDiff & { workspacePath?: string }> {
    const repoPath = workspaceToRepoPath(path);
    const diff = await invokeGit<GitDiff>('git_get_staged_diff', { path: repoPath });
    return { ...diff, workspacePath: repoToWorkspacePath(diff.path) };
  },
};

export type GitService = typeof gitService;
