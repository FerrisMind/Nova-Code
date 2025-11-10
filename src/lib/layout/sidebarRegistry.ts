import type { ComponentType } from 'svelte';
import type { Component } from 'svelte';
import ExplorerView from '../sidebar/ExplorerView.svelte';
import SearchView from '../sidebar/SearchView.svelte';
import GitView from '../sidebar/GitView.svelte';
import ExtensionsView from '../sidebar/ExtensionsView.svelte';

/**
 * Реестр конфигураций боковых представлений.
 *
 * Назначение:
 * - единый источник правды для sidebar/ActivityBar/SideBar;
 * - декларативное описание id/icon/title/position -> component;
 * - повторяет VS Code-подход с view containers без захардкоженных switch/case.
 *
 * Компоненты берутся из стандартных default-экспортов .svelte-файлов,
 * типобезопасность обеспечивается через ComponentType.
 */
export interface SidebarViewConfig {
  id: string;
  icon: string;
  title: string;
  component: Component;
  position: 'left' | 'right';
}

/**
 * Текущие вьюшки:
 * - только реальные левые панели (Explorer/Search/SCM/Extensions/Settings);
 * - правые панели будут добавлены позже только при наличии конкретных компонентов.
 *
 */
export const sidebarViews: SidebarViewConfig[] = [
  {
    id: 'explorer',
    icon: 'lucide:Folders',
    title: 'Explorer',
    component: ExplorerView,
    position: 'left'
  },
  {
    id: 'search',
    icon: 'lucide:Search',
    title: 'Search',
    component: SearchView,
    position: 'left'
  },
  {
    id: 'scm',
    // Git: lucide GitFork как запрошено
    icon: 'lucide:GitFork',
    title: 'Source Control',
    component: GitView,
    position: 'left'
  },
  {
    id: 'extensions',
    // Extensions: lucide Blocks как запрошено
    icon: 'lucide:Blocks',
    title: 'Extensions',
    component: ExtensionsView,
    position: 'left'
  }
];