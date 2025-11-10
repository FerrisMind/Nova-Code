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

import { derived, writable, type Readable } from 'svelte/store';
import type { FileNode } from '../mocks/files.mock';
import {
  addTabToGroup,
  removeTab as removeTabFromGroups,
  setActiveTab as setActiveGroupTab
} from './layout/editorGroupsStore';

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
      groupId?: number;
    }
  ): EditorTab | null => {
    const activate = opts?.activate ?? true;

    // Локальная переменная-результат; тип задан явно.
    let result: EditorTab | null = null;

    update((state) => {
      // 1) Попытка найти уже существующий таб по id или path.
      const existing =
        state.openTabs.find(
          (t) => t.id === pathOrId || t.path === pathOrId
        ) ?? findTab(state, pathOrId);

      if (existing) {
        result = existing;
        return activate
          ? { ...state, activeEditorId: existing.id }
          : state;
      }

      // 2) Ищем файл в дереве workspace.
      const tree = filesTreeProvider();
      const byId = findFileById(tree, pathOrId);
      let fileNode: FileNode | null = byId;

      if (!fileNode) {
        const collectAll = (nodes: FileNode[]): FileNode[] =>
          nodes.flatMap((n) =>
            n.type === 'dir' && n.children
              ? [n, ...collectAll(n.children)]
              : [n]
          );

        const allNodes = collectAll(tree);
        fileNode =
          (allNodes.find(
            (n) => n.type === 'file' && n.path === pathOrId
          ) as FileNode | undefined) ?? null;
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

      return {
        openTabs: [...state.openTabs, newTab],
        activeEditorId: activate ? newTab.id : state.activeEditorId
      };
    });

    // 3) Интеграция с editorGroupsStore:
    // Используем локальную переменную result: EditorTab | null.
    if (result !== null) {
      const targetGroupId = opts?.groupId ?? 1;
      const tabId = (result as EditorTab).id;
      addTabToGroup(targetGroupId, tabId);
      if (activate) {
        setActiveGroupTab(targetGroupId, tabId);
      }
    }

    return result;
  };

  /**
   * Открыть файл по fileId (легаси-API для существующего UI).
   * - Гарантирует регистрацию вкладки и активного редактора.
   * - Синхронизируется с editorGroupsStore для базовой группы 1.
   */
  const openFile = (fileId: string) => {
    let created: EditorTab | null = null;

    update((state) => {
      const already = state.openTabs.find((t) => t.id === fileId);
      if (already) {
        created = already;
        return { ...state, activeEditorId: fileId };
      }

      const fileNode = findFileById(filesTreeProvider(), fileId);
      if (!fileNode || fileNode.type !== 'file') {
        created = null;
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

      created = newTab;

      return {
        openTabs: [...state.openTabs, newTab],
        activeEditorId: fileId
      };
    });

    if (created !== null) {
      const tabId = (created as EditorTab).id;
      addTabToGroup(1, tabId);
      setActiveGroupTab(1, tabId);
    }
  };

  /**
   * Установить активный редактор по id вкладки.
   * Обратная совместимость с существующим API.
   */
  const setActiveEditor = (fileId: string) => {
    update((state) => {
      if (!state.openTabs.find((t) => t.id === fileId)) return state;
      return { ...state, activeEditorId: fileId };
    });
    // layout-слой (EditorTabs) синхронизирует activeTab в editorGroupsStore.
  };

  /**
   * Закрыть вкладку/редактор по id.
   * - Обновляет openTabs и activeEditorId.
   * - Удаляет вкладку из всех групп через editorGroupsStore.removeTab.
   */
  const closeEditor = (fileId: string) => {
    update((state) => {
      const idx = state.openTabs.findIndex((t) => t.id === fileId);
      if (idx === -1) return state;

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

      return {
        openTabs: newTabs,
        activeEditorId: nextActive
      };
    });

    removeTabFromGroups(fileId);
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
   * Открыть настройки как специальную вкладку редактора.
   * Settings не является файлом, поэтому используем специальный id.
   */
  const openSettings = () => {
    const settingsId = 'settings';

    update((state) => {
      const already = state.openTabs.find((t) => t.id === settingsId);
      if (already) {
        return { ...state, activeEditorId: settingsId };
      }

      const newTab: EditorTab = {
        id: settingsId,
        title: 'Settings',
        path: '/settings',
        language: 'txt', // или специальный тип для settings
        isDirty: false
      };

      return {
        openTabs: [...state.openTabs, newTab],
        activeEditorId: settingsId
      };
    });

    // Добавляем вкладку в группу после обновления состояния
    addTabToGroup(1, settingsId); // Добавляем в первую группу
    setActiveGroupTab(1, settingsId);
  };

  return {
    subscribe,
    openFile,
    openSettings,
    setActiveEditor,
    closeEditor,
    markDirty,
    ensureTabForFile
  };
};

// -----------------------------------------------------------------------------
// Инициализация store для текущего окружения
// -----------------------------------------------------------------------------

import { workspaceFiles } from '../mocks/files.mock';

export const editorStore = createEditorStore(() => workspaceFiles);

/**
 * Derived store: активный таб по activeEditorId.
 * Обратная совместимость для компонентов, не знающих о группах.
 */
export const activeEditor: Readable<EditorTab | null> = derived(
  editorStore,
  ($state) =>
    $state.openTabs.find((t) => t.id === $state.activeEditorId) ?? null
);

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