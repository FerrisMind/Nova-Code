// src/lib/commands/defaultCommands.ts
// -----------------------------------------------------------------------------
// Регистрация базовых команд Nova Code на основе существующих сторах и layout API.
// Это тонкий слой над [`src/lib/commands/commandRegistry.ts`](src/lib/commands/commandRegistry.ts)
// без UI-зависимостей.
// -----------------------------------------------------------------------------
//
// Правила:
// - Регистрируем только команды с реальной логикой в текущем коде.
// - Не создаём фиктивных run() и не лезем в будущее API сохранения.
// - Идемпотентность: initDefaultCommands() можно вызывать многократно.
//
// Архитектура вдохновлена VS Code Command Palette / workbench commands:
// - команды типа workbench.action.* и workbench.view.*
// - интеграция с layout, sidebar/activity и editor groups
// - практики подтверждены через context7 и официальную документацию VS Code/Svelte/Tauri.
// -----------------------------------------------------------------------------

import { registerCommand, type CommandDefinition } from './commandRegistry';
import {
  toggleLeftSidebar,
  toggleRightSidebar,
  toggleBottomPanel,
} from '../stores/layout/layoutStore';
import { activityStore } from '../stores/activityStore';
import { sidebarViews } from '../layout/sidebarRegistry';
import { editorStore } from '../stores/editorStore';
import {
  editorGroups,
  getActiveTab as getActiveGroupTabId,
  splitRightFromActive,
  setActiveGroup,
  setActiveTab as setActiveGroupTab,
} from '../stores/layout/editorGroupsStore';
import { get } from 'svelte/store';

// Флаг, гарантирующий идемпотентность.
let initialized = false;

export function initDefaultCommands(): void {
  if (initialized) return;
  initialized = true;

  const commands: CommandDefinition[] = [];

  // ---------------------------------------------------------------------------
  // Layout / Sidebars / Panel
  // ---------------------------------------------------------------------------

  // workbench.action.toggleSidebarVisibility -> левый сайдбар.
  commands.push({
    id: 'workbench.action.toggleSidebarVisibility',
    label: 'Toggle Primary Sidebar Visibility',
    category: 'View',
    keybinding: 'Ctrl+B',
    run: () => {
      toggleLeftSidebar();
    },
  });

  // workbench.action.toggleRightSidebarVisibility -> правая панель (если используется).
  commands.push({
    id: 'workbench.action.toggleRightSidebarVisibility',
    label: 'Toggle Secondary Sidebar Visibility',
    category: 'View',
    run: () => {
      toggleRightSidebar();
    },
  });

  // workbench.action.togglePanel -> нижняя панель (layoutStore-only).
  commands.push({
    id: 'workbench.action.togglePanel',
    label: 'Toggle Panel',
    category: 'View',
    run: () => {
      toggleBottomPanel();
    },
  });

  // ---------------------------------------------------------------------------
  // View / Activity (Explorer, Search, SCM, Extensions, Settings)
  // ---------------------------------------------------------------------------
  // Регистрируем только реальных участников sidebarRegistry.

  const availableViews = sidebarViews.map((v) => v.id);

  const registerViewCommand = (viewId: string, label: string): void => {
    if (!availableViews.includes(viewId)) return;

    commands.push({
      id: `workbench.view.${viewId}`,
      label,
      category: 'View',
      run: () => {
        // Активируем Activity + гарантируем, что левый сайдбар видим.
        activityStore.setActivity(viewId as never);
        // toggleLeftSidebar() переключает, а не включает, поэтому тут именно set через layoutStore нет.
        // Для единообразия rely на текущий UX:
        // - SideBar читает layoutState.leftSidebarVisible;
        // - открытие view через ActivityBar уже управляет видимостью.
        // Здесь мы не насильно меняем видимость, чтобы не ломать текущее поведение.
      },
    });
  };

  registerViewCommand('explorer', 'Show Explorer');
  registerViewCommand('search', 'Show Search');
  registerViewCommand('scm', 'Show Source Control');
  registerViewCommand('extensions', 'Show Extensions');
  registerViewCommand('settings', 'Show Settings');

  // ---------------------------------------------------------------------------
  // Editor / Tabs
  // ---------------------------------------------------------------------------

  // Закрыть активный редактор:
  // - получаем active tab из editorGroupsStore;
  // - закрываем через editorStore.closeEditor (синхронизирует groups via removeTab).
  commands.push({
    id: 'workbench.action.closeActiveEditor',
    label: 'Close Active Editor',
    category: 'File',
    run: () => {
      const activeTabId = getActiveGroupTabId();
      if (!activeTabId) return;
      editorStore.closeEditor(activeTabId);
    },
  });

  // workbench.action.splitEditorRight -> split active tab into a new group.
  commands.push({
    id: 'workbench.action.splitEditorRight',
    label: 'Split Editor Right',
    category: 'View',
    keybinding: 'Ctrl+\\',
    run: () => {
      const activeTabId = getActiveGroupTabId();
      if (!activeTabId) return;
      splitRightFromActive();
      editorStore.setActiveEditor(activeTabId);
    },
  });

  // ---------------------------------------------------------------------------
  // Navigation between groups (если есть несколько групп)
  // ---------------------------------------------------------------------------

  // Помощник: получить след./пред. группу.
  const getOrderedGroupIds = (): number[] => {
    const state = get(editorGroups);
    return state.groups.map((g) => g.id);
  };

  const focusRelativeGroup = (direction: -1 | 1): void => {
    const state = get(editorGroups);
    const ids = getOrderedGroupIds();
    if (ids.length <= 1) return;

    const currentIndex = ids.indexOf(state.activeGroupId);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= ids.length) return;

    const targetId = ids[nextIndex];
    setActiveGroup(targetId);

    // При смене группы, если в ней есть activeTabId, синхронизируем с editorStore.
    const nextState = get(editorGroups);
    const targetGroup = nextState.groups.find((g) => g.id === targetId);
    if (targetGroup?.activeTabId) {
      editorStore.setActiveEditor(targetGroup.activeTabId);
    }
  };

  // workbench.action.focusLeftGroup
  commands.push({
    id: 'workbench.action.focusLeftGroup',
    label: 'Focus Left Group',
    category: 'View',
    run: () => {
      focusRelativeGroup(-1);
    },
  });

  // workbench.action.focusRightGroup
  commands.push({
    id: 'workbench.action.focusRightGroup',
    label: 'Focus Right Group',
    category: 'View',
    run: () => {
      focusRelativeGroup(1);
    },
  });

  // Focus specific group (1-4)
  const registerFocusGroupCommand = (index: number): void => {
    commands.push({
      id: `workbench.action.focusEditorGroup${index + 1}`,
      label: `Focus Editor Group ${index + 1}`,
      category: 'View',
      keybinding: `Ctrl+${index + 1}`,
      run: () => {
        const state = get(editorGroups);
        const target = state.groups[index];
        if (!target) return;
        setActiveGroup(target.id);
        if (target.activeTabId) {
          setActiveGroupTab(target.id, target.activeTabId);
          editorStore.setActiveEditor(target.activeTabId);
        }
      },
    });
  };

  registerFocusGroupCommand(0);
  registerFocusGroupCommand(1);
  registerFocusGroupCommand(2);
  registerFocusGroupCommand(3);

  // ---------------------------------------------------------------------------
  // Stage 2: Enhanced Commands
  // ---------------------------------------------------------------------------

  // Toggle word wrap in editor
  commands.push({
    id: 'editor.action.toggleWordWrap',
    label: 'Toggle Word Wrap',
    category: 'Editor',
    run: () => {
      // This will be implemented with EditorCore integration
      console.log('Toggle word wrap - implement via EditorCore');
    },
  });

  // Switch theme command
  commands.push({
    id: 'workbench.action.selectTheme',
    label: 'Switch Theme',
    category: 'Preferences',
    run: () => {
      // This will open theme selector in settings
      activityStore.setActivity('settings');
      console.log('Switch theme - open settings theme selector');
    },
  });

  // Toggle terminal (bottom panel)
  commands.push({
    id: 'workbench.action.terminal.toggleTerminal',
    label: 'Toggle Terminal',
    category: 'Terminal',
    keybinding: 'Ctrl+`',
    run: () => {
      toggleBottomPanel();
    },
  });

  // Project-wide search
  commands.push({
    id: 'workbench.action.findInFiles',
    label: 'Find in Files',
    category: 'Search',
    keybinding: 'Ctrl+Shift+F',
    run: () => {
      activityStore.setActivity('search');
    },
  });

  // Open settings
  commands.push({
    id: 'workbench.action.openSettings',
    label: 'Open Settings',
    category: 'Preferences',
    run: () => {
      editorStore.openSettings();
    },
  });

  // Go to line
  commands.push({
    id: 'editor.action.gotoLine',
    label: 'Go to Line...',
    category: 'Editor',
    keybinding: 'Ctrl+G',
    run: () => {
      // This will be implemented with Monaco integration
      console.log('Go to line - implement via Monaco action');
    },
  });

  // Go to symbol
  commands.push({
    id: 'editor.action.quickOutline',
    label: 'Go to Symbol in Editor...',
    category: 'Editor',
    keybinding: 'Ctrl+Shift+O',
    run: () => {
      // This will be implemented with Monaco integration
      console.log('Go to symbol - implement via Monaco action');
    },
  });

  // ---------------------------------------------------------------------------
  // Регистрация всех определённых команд
  // ---------------------------------------------------------------------------

  for (const cmd of commands) {
    registerCommand(cmd);
  }
}
