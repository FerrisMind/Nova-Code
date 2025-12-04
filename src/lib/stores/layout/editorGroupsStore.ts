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
  proportions: number[];
}

export const MAX_GROUPS = 4;
const MIN_PROPORTION = 0.12;

// Начальное состояние: одна группа без вкладок.
const INITIAL_STATE: EditorGroupsState = {
  groups: [
    {
      id: 1,
      tabIds: [],
      activeTabId: null
    }
  ],
  activeGroupId: 1,
  proportions: [1]
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
        activeGroupId: 1,
        proportions: [1]
      };
}

function normalizeProportions(groups: EditorGroupState[], proportions: number[]): number[] {
  const count = groups.length;
  if (count === 0) return [];

  const base =
    proportions.length === count && proportions.every((value) => Number.isFinite(value) && value > 0)
      ? proportions
      : Array.from({ length: count }, () => 1 / count);

  const total = base.reduce((sum, value) => sum + value, 0) || 1;
  return base.map((value) => value / total);
}

function ensureStateShape(state: EditorGroupsState): EditorGroupsState {
  const ensured = ensureActiveGroup(state);
  const pruned = pruneEmptyGroups(ensured.groups, ensured.proportions, ensured.activeGroupId);
  const proportions = normalizeProportions(pruned.groups, pruned.proportions);
  return {
    ...pruned,
    proportions
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

function pruneEmptyGroups(
  groups: EditorGroupState[],
  proportions: number[],
  activeGroupId: EditorGroupId
): { groups: EditorGroupState[]; proportions: number[]; activeGroupId: EditorGroupId } {
  // Keep all groups if there is only one; otherwise drop empty ones.
  const normalized = normalizeProportions(groups, proportions);
  const keepAll = groups.length <= 1;

  const prunedGroups: EditorGroupState[] = [];
  const prunedProportions: number[] = [];

  groups.forEach((group, index) => {
    const shouldKeep = keepAll || group.tabIds.length > 0;
    if (shouldKeep) {
      prunedGroups.push(group);
      prunedProportions.push(normalized[index] ?? 0);
    }
  });

  if (prunedGroups.length === 0) {
    // Fallback to a single empty group to keep layout stable.
    return {
      groups: [
        {
          id: 1,
          tabIds: [],
          activeTabId: null
        }
      ],
      proportions: [1],
      activeGroupId: 1
    };
  }

  const nextActiveGroupId = prunedGroups.some((g) => g.id === activeGroupId)
    ? activeGroupId
    : prunedGroups[0].id;

  return {
    groups: prunedGroups,
    proportions: prunedProportions,
    activeGroupId: nextActiveGroupId
  };
}

/**
 * Удаляет табы, которых больше нет среди открытых, и схлопывает пустые группы.
 * Оставляет одну пустую группу, если все табы закрыты.
 */
export function reconcileGroupsWithOpenTabs(openTabIds: string[]): void {
  internal.update((state) => {
    const openSet = new Set(openTabIds);

    const filteredGroups = state.groups.map((group) => {
      const nextTabIds = group.tabIds.filter((id) => openSet.has(id));
      return ensureActiveTabForGroup({
        ...group,
        tabIds: nextTabIds
      });
    });

    const pruned = pruneEmptyGroups(filteredGroups, state.proportions, state.activeGroupId);

    return ensureStateShape({
      ...state,
      ...pruned
    });
  });
}

// -----------------------------------------------------------------------------
// Публичный store и API
// -----------------------------------------------------------------------------

/**
 * Readable-обёртка над состоянием групп редакторов.
 * Управление осуществляется через экспортируемые функции ниже.
 */
export const editorGroups: Readable<EditorGroupsState> = {
  subscribe: (run) => internal.subscribe((state) => run(ensureStateShape(state)))
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
    activeGroupId: 1,
    proportions: [1]
  });
}

/**
 * Установить активную группу.
 * Если группы не существует, состояние не меняется.
 */
export function setActiveGroup(groupId: EditorGroupId): void {
  internal.update((state) => {
    if (!state.groups.some((g) => g.id === groupId)) return state;
    if (state.activeGroupId === groupId) return state;
    return ensureStateShape({
      ...state,
      activeGroupId: groupId
    });
  });
}

/**
 * Установить активную вкладку в конкретной группе.
 * Не создаёт вкладку, только помечает существующую как активную.
 */
export function setActiveTab(groupId: EditorGroupId, tabId: string): void {
  internal.update((state) => {
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return state;
    if (!group.tabIds.includes(tabId)) return state;
    if (group.activeTabId === tabId) return state;

    const groups = state.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            activeTabId: tabId
          }
        : g
    );

    return ensureStateShape({
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

    return ensureStateShape({
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
    const updatedGroups = state.groups.map((g) => {
      if (!g.tabIds.includes(tabId)) return g;

      const nextTabIds = g.tabIds.filter((id) => id !== tabId);
      const nextGroup: EditorGroupState = {
        ...g,
        tabIds: nextTabIds,
        activeTabId: g.activeTabId === tabId ? null : g.activeTabId
      };

      return ensureActiveTabForGroup(nextGroup);
    });

    const pruned = pruneEmptyGroups(updatedGroups, state.proportions, state.activeGroupId);

    return ensureStateShape({
      ...state,
      ...pruned
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

    return ensureStateShape({
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

    const updatedGroups = state.groups.map((g) => {
      if (g.id === updatedSource.id) return updatedSource;
      if (g.id === updatedTarget.id) return updatedTarget;
      return g;
    });

    const pruned = pruneEmptyGroups(updatedGroups, state.proportions, updatedTarget.id);

    return ensureStateShape({
      ...state,
      ...pruned,
      activeGroupId: pruned.activeGroupId
    });
  });
}

/**
 * splitRightFromActive:
 * - Если есть активная группа и активная вкладка:
 *   - Создаёт новую группу справа (новый id).
 *   - Дублирует активную вкладку в новой группе, исходная остаётся на месте.
 *   - Делает новую группу активной.
 * - Если нет активной вкладки — ничего не делает.
 *
 * В текущем шаге layout остаётся одноколоночным; это API-готовность:
 * UI позже сможет отрисовать несколько MonacoHost по описанию групп.
 */
export function splitRightFromActive(): void {
  internal.update((state) => {
    if (state.groups.length >= MAX_GROUPS) return ensureStateShape(state);

    const proportions = normalizeProportions(state.groups, state.proportions);
    const activeGroup = findGroup(state, state.activeGroupId);
    if (!activeGroup || !activeGroup.activeTabId) {
      return ensureStateShape(state);
    }

    const activeTabId = activeGroup.activeTabId;
    const activeIndex = state.groups.findIndex((g) => g.id === activeGroup.id);

    // ������ ����� ��㯯� � 㭨����� id.
    const newGroupId = ++lastGroupId;
    const newGroup: EditorGroupState = {
      id: newGroupId,
      tabIds: [activeTabId],
      activeTabId: activeTabId
    };

    // Дублируем вкладку: исходная группа остаётся с активной вкладкой.
    const groups = [...state.groups];
    groups[activeIndex] = activeGroup;
    groups.splice(activeIndex + 1, 0, newGroup);

    const currentShare = proportions[activeIndex] ?? 0;
    const leftShare = Math.max(currentShare / 2, MIN_PROPORTION);
    const rightShare = Math.max(currentShare - leftShare, MIN_PROPORTION);
    const nextProportions = [...proportions];
    nextProportions[activeIndex] = leftShare;
    nextProportions.splice(activeIndex + 1, 0, rightShare);

    return ensureStateShape({
      ...state,
      groups,
      proportions: nextProportions,
      activeGroupId: newGroupId
    });
  });
}

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
 * Derived helper: ��������� ������ ��� split/resize (normalized 0..1).
 */
export const groupProportions: Readable<number[]> = derived(editorGroups, ($state) =>
  normalizeProportions($state.groups, $state.proportions)
);

/**
 * Derived helper: ������� ������ ���� tabIds �� �������.
 * ����� ���� ������� ��� �������� ��������������� ��� ������.
 */
export const allGroupTabIds: Readable<string[]> = derived(
  editorGroups,
  ($state) => Array.from(new Set($state.groups.flatMap((g) => g.tabIds)))
);

// -----------------------------------------------------------------------------
// Примечание по архитектуре

export function updateProportions(groupIndex: number, delta: number): void {
  internal.update((state) => {
    const proportions = normalizeProportions(state.groups, state.proportions);
    if (groupIndex < 0 || groupIndex >= proportions.length - 1) {
      return ensureStateShape({ ...state, proportions });
    }

    const next = [...proportions];
    const left = next[groupIndex];
    const right = next[groupIndex + 1];
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return ensureStateShape({ ...state, proportions: next });
    }

    const clampedDelta = Math.min(Math.max(delta, MIN_PROPORTION - left), right - MIN_PROPORTION);
    if (clampedDelta === 0) {
      return ensureStateShape({ ...state, proportions: next });
    }

    next[groupIndex] = left + clampedDelta;
    next[groupIndex + 1] = right - clampedDelta;

    return ensureStateShape({
      ...state,
      proportions: next
    });
  });
}

export function closeGroup(groupId: EditorGroupId): void {
  internal.update((state) => {
    if (state.groups.length <= 1) return ensureStateShape(state);

    const index = state.groups.findIndex((g) => g.id === groupId);
    if (index === -1) return ensureStateShape(state);

    const proportions = normalizeProportions(state.groups, state.proportions);
    const targetIndex = index > 0 ? index - 1 : 1;
    const target = state.groups[targetIndex];
    const closing = state.groups[index];

    const mergedTabIds = Array.from(new Set([...(target?.tabIds ?? []), ...(closing?.tabIds ?? [])]));
    const mergedActive = closing.activeTabId ?? target?.activeTabId ?? mergedTabIds.at(-1) ?? null;
    const updatedTarget = target
      ? ensureActiveTabForGroup({
          ...target,
          tabIds: mergedTabIds,
          activeTabId: mergedActive
        })
      : undefined;

    const groups = [...state.groups];
    if (updatedTarget) {
      groups[targetIndex] = updatedTarget;
    }
    groups.splice(index, 1);

    const nextProportions = [...proportions];
    const reclaimed = nextProportions[index] ?? 0;
    nextProportions.splice(index, 1);
    const shareIndex = targetIndex > index ? targetIndex - 1 : targetIndex;
    nextProportions[shareIndex] = (nextProportions[shareIndex] ?? 0) + reclaimed;

    return ensureStateShape({
      ...state,
      groups,
      proportions: nextProportions,
      activeGroupId: state.activeGroupId === groupId ? groups[shareIndex]?.id ?? state.activeGroupId : state.activeGroupId
    });
  });
}

export function hydrateEditorGroups(snapshot: EditorGroupsState): void {
  if (!snapshot || !Array.isArray(snapshot.groups) || snapshot.groups.length === 0) return;

  const sanitizedGroups = snapshot.groups.map((group) =>
    ensureActiveTabForGroup({
      id: group.id,
      tabIds: Array.from(new Set(group.tabIds ?? [])),
      activeTabId: group.activeTabId ?? null
    })
  );

  lastGroupId = Math.max(1, ...sanitizedGroups.map((g) => g.id));

  internal.set(
    ensureStateShape({
      groups: sanitizedGroups,
      activeGroupId: snapshot.activeGroupId,
      proportions: snapshot.proportions ?? []
    })
  );
}

export function getActiveGroupId(): EditorGroupId {
  return get(internal).activeGroupId;
}

// -----------------------------------------------------------------------------
// - editorStore управляет самим набором вкладок (EditorTab: id, title, path, язык, isDirty).
// - editorGroupsStore управляет только тем, КАК эти вкладки распределены по группам.
// - Такая декомпозиция повторяет разделение ответственностей в VS Code:
//   - один источник правды по ресурсам (модели/табовые сущности),
//   - независимый контроллер layout для editor groups.
// - Реализация учитывает актуальные подходы VS Code / Monaco / Svelte 5 / Tauri v2,
//   проверенные через context7 и анализ официальной документации.
