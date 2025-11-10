// src/lib/stores/layout/editorGroupsStore.ts
// -----------------------------------------------------------------------------
// Хранилище групп редакторов и вкладок (editor groups), вдохновлённое моделью
// VS Code Editor Groups и совместимое с текущей архитектурой Nova Code.
//
// Ключевые принципы:
// - Не знает о Monaco, Tauri или конкретном UI. Только чистое состояние.
// - editorStore остаётся единственным источником правды по самим табам/моделям.
// - Этот store управляет:
//   - наборами групп,
//   - порядком вкладок внутри групп,
//   - активной группой и активной вкладкой.
// - Начальное состояние полностью совместимо с "одним редактором":
//   - одна группа, один активный редактор (через activeGroupId / activeTabId).
//
// Дизайн и API опираются на актуальные практики VS Code / Monaco / Svelte 5,
// проверенные через context7 и веб-скрапинг официальной документации.
// -----------------------------------------------------------------------------

import { get, writable, derived, type Readable } from 'svelte/store';

// Идентификатор группы редактора.
// Используем number для простоты инкремента и предсказуемости.
export type EditorGroupId = number;

// Состояние одной группы редактора.
export interface EditorGroupState {
  id: EditorGroupId;
  tabIds: string[]; // идентификаторы вкладок (fileId / editorId из editorStore)
  activeTabId: string | null;
}

// Полное состояние всех групп.
export interface EditorGroupsState {
  groups: EditorGroupState[];
  activeGroupId: EditorGroupId;
}

// Начальное состояние: одна группа без вкладок.
const INITIAL_STATE: EditorGroupsState = {
  groups: [
    {
      id: 1,
      tabIds: [],
      activeTabId: null
    }
  ],
  activeGroupId: 1
};

// Внутренний writable-store. Внешнему коду отдаём только управляемое API.
const internal = writable<EditorGroupsState>(INITIAL_STATE);

// Локальный счётчик для генерации новых ID групп.
// Гарантирует монотонный рост, даже если группы удаляются.
let lastGroupId = 1;

// -----------------------------------------------------------------------------
// Вспомогательные функции
// -----------------------------------------------------------------------------

function findGroup(state: EditorGroupsState, groupId: EditorGroupId): EditorGroupState | undefined {
  return state.groups.find((g) => g.id === groupId);
}

function ensureActiveGroup(state: EditorGroupsState): EditorGroupsState {
  const exists = state.groups.some((g) => g.id === state.activeGroupId);
  if (exists) return state;

  const fallback = state.groups[0];
  return fallback
    ? { ...state, activeGroupId: fallback.id }
    : {
        groups: [
          {
            id: 1,
            tabIds: [],
            activeTabId: null
          }
        ],
        activeGroupId: 1
      };
}

function ensureActiveTabForGroup(group: EditorGroupState): EditorGroupState {
  if (group.tabIds.length === 0) {
    return {
      ...group,
      activeTabId: null
    };
  }

  if (group.activeTabId && group.tabIds.includes(group.activeTabId)) {
    return group;
  }

  // Если активная вкладка отсутствует, берём последнюю (поведение близко к VS Code).
  const nextActive = group.tabIds[group.tabIds.length - 1] ?? null;
  return {
    ...group,
    activeTabId: nextActive
  };
}

// -----------------------------------------------------------------------------
// Публичный store и API
// -----------------------------------------------------------------------------

/**
 * Readable-обёртка над состоянием групп редакторов.
 * Управление осуществляется через экспортируемые функции ниже.
 */
export const editorGroups: Readable<EditorGroupsState> = {
  subscribe: internal.subscribe
};

/**
 * Сброс в режим одной группы.
 * - Полностью очищает состояние групп.
 * - Подходит для обратной совместимости и reset-сценариев.
 * - Не трогает editorStore: внешний код обязан синхронизировать вкладки.
 */
export function initSingleGroup(): void {
  lastGroupId = 1;
  internal.set({
    groups: [
      {
        id: 1,
        tabIds: [],
        activeTabId: null
      }
    ],
    activeGroupId: 1
  });
}

/**
 * Установить активную группу.
 * Если группы не существует, состояние не меняется.
 */
export function setActiveGroup(groupId: EditorGroupId): void {
  internal.update((state) => {
    if (!state.groups.some((g) => g.id === groupId)) return state;
    return {
      ...state,
      activeGroupId: groupId
    };
  });
}

/**
 * Установить активную вкладку в конкретной группе.
 * Не создаёт вкладку, только помечает существующую как активную.
 */
export function setActiveTab(groupId: EditorGroupId, tabId: string): void {
  internal.update((state) => {
    const groups = state.groups.map((g) => {
      if (g.id !== groupId) return g;
      if (!g.tabIds.includes(tabId)) return g;
      return {
        ...g,
        activeTabId: tabId
      };
    });

    return ensureActiveGroup({
      ...state,
      groups
    });
  });
}

/**
 * Добавить вкладку в указанную группу, если её там ещё нет.
 * Не меняет активную вкладку: выбор за вызывающим кодом.
 */
export function addTabToGroup(groupId: EditorGroupId, tabId: string): void {
  internal.update((state) => {
    const groups = state.groups.map((g) => {
      if (g.id !== groupId) return g;
      if (g.tabIds.includes(tabId)) return g;
      return {
        ...g,
        tabIds: [...g.tabIds, tabId],
        activeTabId: g.activeTabId ?? tabId // если не было активной – делаем эту активной
      };
    });

    return ensureActiveGroup({
      ...state,
      groups
    });
  });
}

/**
 * Удалить вкладку из всех групп.
 * - Если вкладка была активной в группе, пересчитывает activeTabId.
 * - Если после удаления группа остаётся пустой, она сохраняется (на этом этапе
 *   мы не реализуем автоудаление групп для упрощения split view API).
 */
export function removeTab(tabId: string): void {
  internal.update((state) => {
    const groups = state.groups.map((g) => {
      if (!g.tabIds.includes(tabId)) return g;

      const nextTabIds = g.tabIds.filter((id) => id !== tabId);
      const nextGroup: EditorGroupState = {
        ...g,
        tabIds: nextTabIds,
        activeTabId: g.activeTabId === tabId ? null : g.activeTabId
      };

      return ensureActiveTabForGroup(nextGroup);
    });

    return ensureActiveGroup({
      ...state,
      groups
    });
  });
}

/**
 * Переупорядочить вкладки внутри одной группы.
 * Безопасен при некорректных индексах.
 */
export function reorderTabsWithinGroup(
  groupId: EditorGroupId,
  fromIndex: number,
  toIndex: number
): void {
  internal.update((state) => {
    const group = findGroup(state, groupId);
    if (!group) return state;

    const length = group.tabIds.length;
    if (
      fromIndex < 0 ||
      fromIndex >= length ||
      toIndex < 0 ||
      toIndex >= length ||
      fromIndex === toIndex
    ) {
      return state;
    }

    const tabIds = [...group.tabIds];
    const [moved] = tabIds.splice(fromIndex, 1);
    tabIds.splice(toIndex, 0, moved);

    const updatedGroup: EditorGroupState = ensureActiveTabForGroup({
      ...group,
      tabIds
    });

    const groups = state.groups.map((g) => (g.id === groupId ? updatedGroup : g));

    return ensureActiveGroup({
      ...state,
      groups
    });
  });
}

/**
 * Переместить вкладку между группами.
 * - Удаляет tabId из sourceGroupId.
 * - Вставляет в targetGroupId в позицию targetIndex (или в конец).
 * - Корректно обновляет activeTabId для обеих групп.
 * - Не создаёт вкладку, если targetGroupId не существует.
 */
export function moveTabToGroup(
  tabId: string,
  sourceGroupId: EditorGroupId,
  targetGroupId: EditorGroupId,
  targetIndex?: number
): void {
  internal.update((state) => {
    const source = findGroup(state, sourceGroupId);
    const target = findGroup(state, targetGroupId);
    if (!source || !target) return state;
    if (!source.tabIds.includes(tabId)) return state;

    // Удаляем из source
    const nextSourceTabIds = source.tabIds.filter((id) => id !== tabId);
    const updatedSource = ensureActiveTabForGroup({
      ...source,
      tabIds: nextSourceTabIds,
      activeTabId: source.activeTabId === tabId ? null : source.activeTabId
    });

    // Добавляем в target
    const existsInTarget = target.tabIds.includes(tabId);
    const baseTargetTabIds = existsInTarget
      ? target.tabIds.filter((id) => id !== tabId)
      : [...target.tabIds];

    let insertIndex =
      typeof targetIndex === 'number'
        ? Math.max(0, Math.min(targetIndex, baseTargetTabIds.length))
        : baseTargetTabIds.length;

    baseTargetTabIds.splice(insertIndex, 0, tabId);

    const updatedTarget: EditorGroupState = {
      ...target,
      tabIds: baseTargetTabIds,
      // При перемещении делаем вкладку активной в целевой группе —
      // это соответствует ожиданиям split/move UX.
      activeTabId: tabId
    };

    const groups = state.groups.map((g) => {
      if (g.id === updatedSource.id) return updatedSource;
      if (g.id === updatedTarget.id) return updatedTarget;
      return g;
    });

    return ensureActiveGroup({
      ...state,
      groups,
      activeGroupId: updatedTarget.id
    });
  });
}

/**
 * splitRightFromActive:
 * - Если есть активная группа и активная вкладка:
 *   - Создаёт новую группу справа (новый id).
 *   - Перемещает активную вкладку из активной группы в новую.
 *   - Делает новую группу активной.
 * - Если нет активной вкладки — ничего не делает.
 *
 * В текущем шаге layout остаётся одноколоночным; это API-готовность:
 * UI позже сможет отрисовать несколько MonacoHost по описанию групп.
 */
export function splitRightFromActive(): void {
  internal.update((state) => {
    const activeGroup = findGroup(state, state.activeGroupId);
    if (!activeGroup || !activeGroup.activeTabId) {
      return state;
    }

    const activeTabId = activeGroup.activeTabId;

    // Создаём новую группу с уникальным id.
    const newGroupId = ++lastGroupId;
    const newGroup: EditorGroupState = {
      id: newGroupId,
      tabIds: [activeTabId],
      activeTabId: activeTabId
    };

    // Удаляем вкладку из старой группы.
    const updatedOldGroup = ensureActiveTabForGroup({
      ...activeGroup,
      tabIds: activeGroup.tabIds.filter((id) => id !== activeTabId),
      activeTabId: null
    });

    const groups = state.groups.map((g) =>
      g.id === updatedOldGroup.id ? updatedOldGroup : g
    );

    return ensureActiveGroup({
      ...state,
      groups: [...groups, newGroup],
      activeGroupId: newGroupId
    });
  });
}

/**
 * Получить текущее активное состояние группы (helper для вне-Svelte-кода).
 * Не reactive; использовать для императивных сценариев (команды и т.п.).
 */
export function getActiveGroup(): EditorGroupState | null {
  const state = get(internal);
  const group = findGroup(state, state.activeGroupId);
  return group ?? null;
}

/**
 * Получить идентификатор активной вкладки (по активной группе).
 * Возвращает string или null.
 */
export function getActiveTab(): string | null {
  const state = get(internal);
  const group = findGroup(state, state.activeGroupId);
  return group?.activeTabId ?? null;
}

/**
 * Derived helper: плоский список всех tabIds по группам.
 * Может быть полезен для проверки консистентности или команд.
 */
export const allGroupTabIds: Readable<string[]> = derived(
  internal,
  ($state) => Array.from(new Set($state.groups.flatMap((g) => g.tabIds)))
);

// -----------------------------------------------------------------------------
// Примечание по архитектуре
// -----------------------------------------------------------------------------
// - editorStore управляет самим набором вкладок (EditorTab: id, title, path, язык, isDirty).
// - editorGroupsStore управляет только тем, КАК эти вкладки распределены по группам.
// - Такая декомпозиция повторяет разделение ответственностей в VS Code:
//   - один источник правды по ресурсам (модели/табовые сущности),
//   - независимый контроллер layout для editor groups.
// - Реализация учитывает актуальные подходы VS Code / Monaco / Svelte 5 / Tauri v2,
//   проверенные через context7 и анализ официальной документации.