// src/lib/stores/editorStore.ts
// -----------------------------------------------------------------------------
// Единственный источник правды по вкладкам редактора и их моделям в mock/Tauri-
// ready окружении Nova Code.
//
// Ключевые принципы:
// - EditorTab описывает логическую вкладку/файл: id, title, path, language, isDirty.
// - editorStore управляет списком вкладок и activeEditorId (обратная совместимость).
// - editorGroupsStore (см. src/lib/stores/layout/editorGroupsStore.ts) управляет
//   только раскладкой вкладок по группам (layout), не моделями.
// - При открытии файла гарантируем наличие EditorTab; layout может использовать id.
// - При закрытии файла синхронизируемся с editorGroupsStore.removeTab.
// - Логика чистая, без прямых зависимостей от Monaco/Tauri.
//
// Архитектура вдохновлена VS Code (Editor / Editor Groups / Tabs) и актуальными
// практиками Monaco Editor, Svelte 5 и Tauri v2, подтверждёнными через context7
// и анализ официальной документации.
// -----------------------------------------------------------------------------

import { derived, writable, type Readable, get } from 'svelte/store';
import type { FileNode } from '../types/fileNode';
import { fileService } from '../services/fileService';
import {
  addTabToGroup,
  editorGroups,
  getActiveGroupId,
  removeTab as removeTabFromGroups,
  setActiveGroup,
  setActiveTab as setActiveGroupTab,
  reconcileGroupsWithOpenTabs,
  type EditorGroupId
} from './layout/editorGroupsStore';
import { getWorkspaceFiles } from './workspaceStore';

// -----------------------------------------------------------------------------
// Типы
// -----------------------------------------------------------------------------

export type LanguageId =
  | 'svelte'
  | 'ts'
  | 'js'
  | 'json'
  | 'md'
  | 'toml'
  | 'rs'
  | 'txt';

export interface EditorTab {
  id: string; // fileId
  title: string;
  path: string;
  language: LanguageId | string;
  isDirty: boolean;
}

interface EditorState {
  openTabs: EditorTab[];
  activeEditorId: string | null;
}

// -----------------------------------------------------------------------------
// Вспомогательные функции
// -----------------------------------------------------------------------------

const findFileById = (root: FileNode[], id: string): FileNode | null => {
  for (const node of root) {
    if (node.id === id) return node;
    if (node.type === 'dir' && node.children) {
      const found = findFileById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const detectLanguage = (name: string): LanguageId | string => {
  if (name.endsWith('.svelte')) return 'svelte';
  if (name.endsWith('.ts')) return 'ts';
  if (name.endsWith('.js')) return 'js';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.md')) return 'md';
  if (name.endsWith('.toml')) return 'toml';
  if (name.endsWith('.rs')) return 'rs';
  return 'txt';
};

// -----------------------------------------------------------------------------
// Фабрика editorStore
// -----------------------------------------------------------------------------

const createEditorStore = (filesTreeProvider: () => FileNode[]) => {
  const { subscribe, update } = writable<EditorState>({
    openTabs: [],
    activeEditorId: null
  });

  /**
   * Найти таб по id.
   */
  const findTab = (state: EditorState, id: string): EditorTab | undefined =>
    state.openTabs.find((t) => t.id === id);

  /**
   * ensureTabForFile:
   * - Гарантирует существование EditorTab для файла по id или path.
   * - Возвращает существующий или новый EditorTab.
   * - Не ломает существующий API.
   *
   * opts:
   * - activate?: boolean — сделать вкладку активной (по умолчанию true).
   * - groupId?: number — добавить вкладку в указанную группу editorGroupsStore
   *   (по умолчанию 1 — одногрупповой режим).
   *
   * Интеграция с editorGroupsStore строится только на id вкладок.
   */
  const ensureTabForFile = (
    pathOrId: string,
    opts?: {
      activate?: boolean;
      groupId?: EditorGroupId;
    }
  ): EditorTab | null => {
    const activate = opts?.activate ?? true;
    const targetGroupId = opts?.groupId ?? getActiveGroupId();

    // Idempotent helper: safe to call repeatedly for the same file.
    let result: EditorTab | null = null;
    let latestOpenTabIds: string[] | null = null;

    update((state) => {
      // 1) ������� ����� ��� ������������ ��� �� id ��� path.
      const existing =
        state.openTabs.find((t) => t.id === pathOrId || t.path === pathOrId) ??
        findTab(state, pathOrId);

      if (existing) {
        result = existing;
        return activate ? { ...state, activeEditorId: existing.id } : state;
      }

      // 2) ���� ���� � ������ workspace.
      const tree = filesTreeProvider();
      const byId = findFileById(tree, pathOrId);
      let fileNode: FileNode | null = byId;

      if (!fileNode) {
        const collectAll = (nodes: FileNode[]): FileNode[] =>
          nodes.flatMap((n) =>
            n.type === 'dir' && n.children ? [n, ...collectAll(n.children)] : [n]
          );

        const allNodes = collectAll(tree);
        fileNode =
          (allNodes.find((n) => n.type === 'file' && n.path === pathOrId) as FileNode | undefined) ??
          null;
      }

      if (!fileNode || fileNode.type !== 'file') {
        result = null;
        return state;
      }

      const language = detectLanguage(fileNode.name);
      const newTab: EditorTab = {
        id: fileNode.id,
        title: fileNode.name,
        path: fileNode.path,
        language,
        isDirty: false
      };

      result = newTab;
      latestOpenTabIds = [...state.openTabs, newTab].map((t) => t.id);

      return {
        openTabs: [...state.openTabs, newTab],
        activeEditorId: activate ? newTab.id : state.activeEditorId
      };
    });

    // 3) ���������� � editorGroupsStore:
    // ���������� ��������� ���������� result: EditorTab | null.
    if (result !== null) {
      const resolvedGroupId = targetGroupId ?? 1;
      const tabId = (result as EditorTab).id;
      addTabToGroup(resolvedGroupId, tabId);
      if (activate) {
        setActiveGroup(resolvedGroupId);
        setActiveGroupTab(resolvedGroupId, tabId);
      }
      reconcileGroupsWithOpenTabs(
        latestOpenTabIds ?? get(editorStore).openTabs.map((t) => t.id)
      );
    }

    return result;
  };

    /**
   * Open a file by fileId (legacy-friendly UI API).
   * - Ensures the tab becomes active in editorStore.
   * - Syncs with editorGroupsStore for the target (active) group.
   */

  const openFile = (fileId: string, groupId?: EditorGroupId) => {
    ensureTabForFile(fileId, { activate: true, groupId });
  };

    /**
   * Set active editor by tab id and propagate selection to editorGroupsStore.
   */

  const setActiveEditor = (fileId: string) => {
    const groupsState = get(editorGroups);
    const hostGroup = groupsState.groups.find((g) => g.tabIds.includes(fileId));

    if (hostGroup) {
      setActiveGroup(hostGroup.id);
      setActiveGroupTab(hostGroup.id, fileId);
    }

    update((state) => {
      if (!state.openTabs.find((t) => t.id === fileId)) return state;
      return { ...state, activeEditorId: fileId };
    });
  };

    /**
   * Close a tab by id.
   * - Updates openTabs and activeEditorId.
   * - Syncs group state via editorGroupsStore.removeTab.
   */

  const closeEditor = (fileId: string) => {
    let latestState: EditorState | null = null;
    let removed = false;

    update((state) => {
      const idx = state.openTabs.findIndex((t) => t.id === fileId);
      if (idx === -1) return state;
      removed = true;

      const newTabs = [
        ...state.openTabs.slice(0, idx),
        ...state.openTabs.slice(idx + 1)
      ];

      let nextActive = state.activeEditorId;
      if (state.activeEditorId === fileId) {
        if (newTabs.length === 0) {
          nextActive = null;
        } else if (idx < newTabs.length) {
          nextActive = newTabs[idx].id;
        } else {
          nextActive = newTabs[newTabs.length - 1].id;
        }
      }

      latestState = {
        openTabs: newTabs,
        activeEditorId: nextActive
      };

      return latestState;
    });

    if (!removed || !latestState) {
      return;
    }

    const closedState: EditorState = latestState;

    removeTabFromGroups(fileId);
    reconcileGroupsWithOpenTabs(closedState.openTabs.map((t) => t.id));

    const groupsState = get(editorGroups);
    const activeGroupId = groupsState.activeGroupId;
    const activeGroupTabId =
      groupsState.groups.find((g) => g.id === activeGroupId)?.activeTabId ?? null;

    if (
      activeGroupTabId &&
      closedState.openTabs.some((tab: EditorTab) => tab.id === activeGroupTabId)
    ) {
      setActiveGroup(activeGroupId);
      setActiveGroupTab(activeGroupId, activeGroupTabId);
      update((state) => ({ ...state, activeEditorId: activeGroupTabId }));
    }
  };

  /**
   * Пометить вкладку как "грязную" (есть несохранённые изменения) или чистую.
   * Используется EditorCore.onDidChangeModelContent и логикой сохранения.
   */
  const markDirty = (id: string, isDirty: boolean): void => {
    update((state) => ({
      ...state,
      openTabs: state.openTabs.map((tab) =>
        tab.id === id ? { ...tab, isDirty } : tab
      )
    }));
  };

  /**
   * Persist editor content to the mock file registry and reset the dirty flag.
   */
  const updateContent = async (id: string, value: string): Promise<void> => {
    const fileNode = findFileById(filesTreeProvider(), id);
    if (!fileNode || fileNode.type !== 'file') return;

    await fileService.writeFile(fileNode.path, value);
    markDirty(id, false);
  };

  /**
   * Открыть настройки как специальную вкладку редактора.
   * Settings не является файлом, поэтому используем специальный id.
   */
  const openSettings = () => {
    const settingsId = 'settings';
    const targetGroupId = getActiveGroupId();

    update((state) => {
      const already = state.openTabs.find((t) => t.id === settingsId);
      if (already) {
        return { ...state, activeEditorId: settingsId };
      }

      const newTab: EditorTab = {
        id: settingsId,
        title: 'Settings',
        path: '/settings',
        language: 'txt', // ��� ����������� ��� ��� settings
        isDirty: false
      };

      return {
        openTabs: [...state.openTabs, newTab],
        activeEditorId: settingsId
      };
    });

    addTabToGroup(targetGroupId, settingsId);
    setActiveGroup(targetGroupId);
    setActiveGroupTab(targetGroupId, settingsId);
  };


  return {
    subscribe,
    openFile,
    openSettings,
    setActiveEditor,
    closeEditor,
    markDirty,
    updateContent,
    ensureTabForFile
  };
};

// -----------------------------------------------------------------------------
// Store factory
// -----------------------------------------------------------------------------

export const editorStore = createEditorStore(getWorkspaceFiles);

/**
 * Derived store: активный таб по activeEditorId.
 * Обратная совместимость для компонентов, не знающих о группах.
 */
export const activeEditor: Readable<EditorTab | null> = derived(
  editorStore,
  ($state) =>
    $state.openTabs.find((t) => t.id === $state.activeEditorId) ?? null
);

/**
 * Store: per-group flag indicating if the active tab touches the right edge of the tab strip.
 * Используется в EditorArea для скруглений и scroll affordances.
 */
export function tabsForGroup(groupId: EditorGroupId): Readable<EditorTab[]> {
  return derived([editorStore, editorGroups], ([$state, $groups]) => {
    const group = $groups.groups.find((g) => g.id === groupId);
    if (!group) return [];

    const ids = new Set(group.tabIds);
    return $state.openTabs.filter((tab) => ids.has(tab.id));
  });
}

export function activeTabForGroup(groupId: EditorGroupId): Readable<EditorTab | null> {
  return derived([editorStore, editorGroups], ([$state, $groups]) => {
    const group = $groups.groups.find((g) => g.id === groupId);
    if (!group?.activeTabId) return null;
    return $state.openTabs.find((tab) => tab.id === group.activeTabId) ?? null;
  });
}

export const activeTabVisibleAtRight = writable<Record<EditorGroupId, boolean>>({});

export function setTabEdgeVisibility(groupId: EditorGroupId, isVisible: boolean): void {
  activeTabVisibleAtRight.update((state) => {
    if (state[groupId] === isVisible) return state;
    return { ...state, [groupId]: isVisible };
  });
}

export function tabEdgeVisibleForGroup(groupId: EditorGroupId): Readable<boolean> {
  return derived(activeTabVisibleAtRight, ($state) => $state[groupId] ?? false);
}

// Отслеживание видимости активного таба в области просмотра
export const activeTabVisible = writable<Record<EditorGroupId, boolean>>({});

export function setActiveTabVisibility(groupId: EditorGroupId, isVisible: boolean): void {
  activeTabVisible.update((state) => {
    if (state[groupId] === isVisible) return state;
    return { ...state, [groupId]: isVisible };
  });
}

export function activeTabVisibleForGroup(groupId: EditorGroupId): Readable<boolean> {
  return derived(activeTabVisible, ($state) => $state[groupId] ?? false);
}

// -----------------------------------------------------------------------------
// Архитектурное резюме
// -----------------------------------------------------------------------------
// - editorStore: единый источник правды по EditorTab и isDirty.
// - editorGroupsStore: управляет только раскладкой вкладок по группам/сплитам.
// - Связка:
//   - EditorCore -> onDidChangeModelContent -> editorStore.markDirty(...);
//   - editorStore хранит логические сущности вкладок;
//   - editorGroupsStore оперирует только id вкладок.
// -----------------------------------------------------------------------------
