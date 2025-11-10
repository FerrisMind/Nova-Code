export type FileNodeType = 'file' | 'dir';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileNodeType;
  children?: FileNode[];
}

/**
 * Статическое дерево mock-файлов, имитирующее SvelteKit + Tauri v2 проект.
 * Используется ExplorerView и editorStore.
 */
export const workspaceFiles: FileNode[] = [
  {
    id: 'root',
    name: 'nova-code',
    path: '',
    type: 'dir',
    children: [
      {
        id: 'src',
        name: 'src',
        path: 'src',
        type: 'dir',
        children: [
          {
            id: 'src-routes',
            name: 'routes',
            path: 'src/routes',
            type: 'dir',
            children: [
              {
                id: 'layout-svelte',
                name: '+layout.svelte',
                path: 'src/routes/+layout.svelte',
                type: 'file'
              },
              {
                id: 'layout-ts',
                name: '+layout.ts',
                path: 'src/routes/+layout.ts',
                type: 'file'
              }
            ]
          },
          {
            id: 'src-lib',
            name: 'lib',
            path: 'src/lib',
            type: 'dir',
            children: [
              {
                id: 'lib-layout',
                name: 'layout',
                path: 'src/lib/layout',
                type: 'dir',
                children: [
                  {
                    id: 'titlebar',
                    name: 'Titlebar.svelte',
                    path: 'src/lib/layout/Titlebar.svelte',
                    type: 'file'
                  },
                  {
                    id: 'activitybar',
                    name: 'ActivityBar.svelte',
                    path: 'src/lib/layout/ActivityBar.svelte',
                    type: 'file'
                  },
                  {
                    id: 'sidebar',
                    name: 'SideBar.svelte',
                    path: 'src/lib/layout/SideBar.svelte',
                    type: 'file'
                  },
                  {
                    id: 'editortabs',
                    name: 'EditorTabs.svelte',
                    path: 'src/lib/layout/EditorTabs.svelte',
                    type: 'file'
                  },
                  {
                    id: 'editorarea',
                    name: 'EditorArea.svelte',
                    path: 'src/lib/layout/EditorArea.svelte',
                    type: 'file'
                  },
                  {
                    id: 'editorminimap',
                    name: 'EditorMinimap.svelte',
                    path: 'src/lib/layout/EditorMinimap.svelte',
                    type: 'file'
                  },
                  {
                    id: 'statusbar',
                    name: 'StatusBar.svelte',
                    path: 'src/lib/layout/StatusBar.svelte',
                    type: 'file'
                  },
                  {
                    id: 'bottompanel',
                    name: 'BottomPanel.svelte',
                    path: 'src/lib/layout/BottomPanel.svelte',
                    type: 'file'
                  }
                ]
              },
              {
                id: 'lib-sidebar',
                name: 'sidebar',
                path: 'src/lib/sidebar',
                type: 'dir',
                children: [
                  {
                    id: 'explorer-view',
                    name: 'ExplorerView.svelte',
                    path: 'src/lib/sidebar/ExplorerView.svelte',
                    type: 'file'
                  },
                  {
                    id: 'search-view',
                    name: 'SearchView.svelte',
                    path: 'src/lib/sidebar/SearchView.svelte',
                    type: 'file'
                  },
                  {
                    id: 'git-view',
                    name: 'GitView.svelte',
                    path: 'src/lib/sidebar/GitView.svelte',
                    type: 'file'
                  },
                  {
                    id: 'extensions-view',
                    name: 'ExtensionsView.svelte',
                    path: 'src/lib/sidebar/ExtensionsView.svelte',
                    type: 'file'
                  },
                  {
                    id: 'settings-view',
                    name: 'SettingsView.svelte',
                    path: 'src/lib/sidebar/SettingsView.svelte',
                    type: 'file'
                  }
                ]
              },
              {
                id: 'lib-editor',
                name: 'editor',
                path: 'src/lib/editor',
                type: 'dir',
                children: [
                  {
                    id: 'codeeditor',
                    name: 'CodeEditor.svelte',
                    path: 'src/lib/editor/CodeEditor.svelte',
                    type: 'file'
                  },
                  {
                    id: 'codeline',
                    name: 'CodeLine.svelte',
                    path: 'src/lib/editor/CodeLine.svelte',
                    type: 'file'
                  }
                ]
              },
              {
                id: 'lib-common',
                name: 'common',
                path: 'src/lib/common',
                type: 'dir',
                children: [
                  {
                    id: 'icon',
                    name: 'Icon.svelte',
                    path: 'src/lib/common/Icon.svelte',
                    type: 'file'
                  }
                ]
              },
              {
                id: 'lib-stores',
                name: 'stores',
                path: 'src/lib/stores',
                type: 'dir',
                children: [
                  {
                    id: 'theme-store',
                    name: 'themeStore.ts',
                    path: 'src/lib/stores/themeStore.ts',
                    type: 'file'
                  },
                  {
                    id: 'activity-store',
                    name: 'activityStore.ts',
                    path: 'src/lib/stores/activityStore.ts',
                    type: 'file'
                  },
                  {
                    id: 'editor-store',
                    name: 'editorStore.ts',
                    path: 'src/lib/stores/editorStore.ts',
                    type: 'file'
                  },
                  {
                    id: 'bottom-panel-store',
                    name: 'bottomPanelStore.ts',
                    path: 'src/lib/stores/bottomPanelStore.ts',
                    type: 'file'
                  },
                  {
                    id: 'workspace-store',
                    name: 'workspaceStore.ts',
                    path: 'src/lib/stores/workspaceStore.ts',
                    type: 'file'
                  }
                ]
              },
              {
                id: 'lib-mocks',
                name: 'mocks',
                path: 'src/lib/mocks',
                type: 'dir',
                children: [
                  {
                    id: 'files-mock',
                    name: 'files.mock.ts',
                    path: 'src/lib/mocks/files.mock.ts',
                    type: 'file'
                  },
                  {
                    id: 'content-mock',
                    name: 'content.mock.ts',
                    path: 'src/lib/mocks/content.mock.ts',
                    type: 'file'
                  },
                  {
                    id: 'logs-mock',
                    name: 'logs.mock.ts',
                    path: 'src/lib/mocks/logs.mock.ts',
                    type: 'file'
                  },
                  {
                    id: 'icons-mock',
                    name: 'icons.ts',
                    path: 'src/lib/mocks/icons.ts',
                    type: 'file'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'src-tauri',
        name: 'src-tauri',
        path: 'src-tauri',
        type: 'dir',
        children: [
          {
            id: 'tauri-src',
            name: 'src',
            path: 'src-tauri/src',
            type: 'dir',
            children: [
              {
                id: 'tauri-main-rs',
                name: 'main.rs',
                path: 'src-tauri/src/main.rs',
                type: 'file'
              }
            ]
          },
          {
            id: 'tauri-cargo-toml',
            name: 'Cargo.toml',
            path: 'src-tauri/Cargo.toml',
            type: 'file'
          }
        ]
      },
      {
        id: 'pkg-json',
        name: 'package.json',
        path: 'package.json',
        type: 'file'
      },
      {
        id: 'readme-md',
        name: 'README.md',
        path: 'README.md',
        type: 'file'
      }
    ]
  }
];