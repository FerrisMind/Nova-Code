import { writable, type Readable } from 'svelte/store';

/**
 * LayoutState централизует состояние рабочего пространства (workbench layout)
 * в духе VS Code:
 * - не знает о конкретных вьюшках/компонентах;
 * - описывает только видимость и размеры основных контейнеров;
 * - служит единым источником правды для боковых панелей и нижней панели.
 *
 * Дизайн основан на актуальных паттернах VS Code workbench layout и рекомендациях
 * Svelte/SvelteKit/Tauri (use context7 / официальная документация).
 */
export interface LayoutState {
  // Видимость контейнеров
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  bottomPanelVisible: boolean;

  // Размеры контейнеров в px
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  bottomPanelHeight: number;
}

// Начальное состояние (VS Code-like, адаптировано под текущий UI Nova Code)
const initialState: LayoutState = {
  leftSidebarVisible: true,
  rightSidebarVisible: false,
  // Для совместимости с текущим поведением BottomPanel:
  // по умолчанию панель скрыта, но конкретная интеграция может синхронизироваться
  // с bottomPanelStore, чтобы не ломать существующий API.
  bottomPanelVisible: false,

  leftSidebarWidth: 280,
  rightSidebarWidth: 280,
  bottomPanelHeight: 180
};

const internal = writable<LayoutState>(initialState);

/**
 * layoutState — read-only стор для подписчиков.
 * Мутации выполняются только через экспортируемые функции ниже.
 */
export const layoutState: Readable<LayoutState> = {
  subscribe: internal.subscribe
};

/**
 * Переключить видимость левой боковой панели.
 * Используется, в том числе, для Ctrl+B и кликов по ActivityBar.
 */
export const toggleLeftSidebar = () => {
  internal.update((state) => ({
    ...state,
    leftSidebarVisible: !state.leftSidebarVisible
  }));
};

/**
 * Установить видимость левой боковой панели.
 */
export const setLeftSidebarVisible = (visible: boolean) => {
  internal.update((state) => ({
    ...state,
    leftSidebarVisible: visible
  }));
};

/**
 * Установить видимость правой боковой панели.
 */
export const setRightSidebarVisible = (visible: boolean) => {
  internal.update((state) => ({
    ...state,
    rightSidebarVisible: visible
  }));
};

/**
 * Переключить видимость правой боковой панели.
 * Правая панель опциональна и готова для Outline/Timeline-подобных вьюшек.
 */
export const toggleRightSidebar = () => {
  internal.update((state) => ({
    ...state,
    rightSidebarVisible: !state.rightSidebarVisible
  }));
};

/**
 * Переключить видимость нижней панели.
 * Должно быть согласовано с legacy bottomPanelStore в месте интеграции.
 */
export const toggleBottomPanel = () => {
  internal.update((state) => ({
    ...state,
    bottomPanelVisible: !state.bottomPanelVisible
  }));
};

/**
 * Установить ширину левой боковой панели (в px).
 * Внешний код обязан делать clamp до допустимых значений (min/max).
 */
export const setLeftSidebarWidth = (width: number) => {
  internal.update((state) => ({
    ...state,
    leftSidebarWidth: width
  }));
};

/**
 * Установить ширину правой боковой панели (в px).
 */
export const setRightSidebarWidth = (width: number) => {
  internal.update((state) => ({
    ...state,
    rightSidebarWidth: width
  }));
};

/**
 * Установить высоту нижней панели (в px).
 */
export const setBottomPanelHeight = (height: number) => {
  internal.update((state) => ({
    ...state,
    bottomPanelHeight: height
  }));
};