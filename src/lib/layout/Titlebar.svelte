<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Icon from '../common/Icon.svelte';
  import { toggleLeftSidebar, toggleBottomPanel, toggleRightSidebar } from '../stores/layout/layoutStore';
  import { editorStore } from '../stores/editorStore';
  import { openCommandPalette } from '../stores/commandPaletteStore';

  let appWindow = getCurrentWindow();
  let isMaximized = false;

  // Реактивная переменная для отслеживания состояния
  $: maximizeIcon = isMaximized ? "lucide:Minimize" : "lucide:Maximize";
  $: maximizeLabel = isMaximized ? "Restore" : "Maximize";

  // Обновляем ссылку на окно при монтировании (на случай окружения без Tauri при билде)
  onMount(() => {
    appWindow = getCurrentWindow();

    // Функция для обновления состояния окна
    const updateWindowState = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        isMaximized = maximized; // Это вызовет реактивное обновление
      } catch (e) {
        console.error('Failed to check window state', e);
      }
    };

    // Проверяем начальное состояние
    updateWindowState();

    // Слушаем изменения состояния окна
    let unlisten: (() => void) | undefined;
    appWindow.listen('tauri://window-resized', updateWindowState).then((cleanup) => {
      unlisten = cleanup;
    }).catch((e) => {
      console.error('Failed to listen for window resize', e);
    });

    // Очищаем слушатель при размонтировании
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  });

  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
    } catch (e) {
      console.error('Failed to minimize window', e);
    }
  };

  const handleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
      // Обновляем состояние после изменения
      const maximized = await appWindow.isMaximized();
      isMaximized = maximized; // Это вызовет реактивное обновление
    } catch (e) {
      console.error('Failed to toggle maximize', e);
    }
  };

  const handleClose = async () => {
    try {
      await appWindow.close();
    } catch (e) {
      console.error('Failed to close window', e);
    }
  };

  const handleToggleSidebar = () => {
    toggleLeftSidebar();
  };

  const handleToggleRightSidebar = () => {
    toggleRightSidebar();
  };

  const handleToggleBottomPanel = () => {
    toggleBottomPanel();
  };

  const handleLayoutCustomization = () => {
    editorStore.openSettings();
  };
</script>

<div class="titlebar" data-tauri-drag-region on:dblclick={handleMaximize} role="banner" aria-label="Window title bar">
  <div class="titlebar-left">
    <div class="app-icon">
      <img src="/app-icon.png" alt="App Icon" />
    </div>
  </div>

  <div class="titlebar-center">
    <button class="command-palette" on:click={openCommandPalette} aria-label="Command Palette">
      <Icon name="lucide:Search" size={14} />
      <span class="command-palette-text">Новая папка</span>
    </button>
  </div>

  <!-- Блок с контролами окна фиксирован справа -->
  <div class="titlebar-right" data-tauri-drag-region="false">
    <button class="layout-btn" on:click={handleLayoutCustomization} aria-label="Layout Customization">
      <Icon name="lucide:LayoutPanelLeft" size={16} />
    </button>
    <button class="layout-btn" on:click={handleToggleSidebar} aria-label="Toggle Sidebar">
      <Icon name="lucide:Sidebar" size={16} />
    </button>
    <button class="layout-btn" on:click={handleToggleBottomPanel} aria-label="Toggle Bottom Panel">
      <Icon name="lucide:PanelBottom" size={16} />
    </button>
    <button class="layout-btn" on:click={handleToggleRightSidebar} aria-label="Toggle Right Sidebar">
      <Icon name="lucide:PanelRight" size={16} />
    </button>
    <button class="win-btn" on:click={handleMinimize} aria-label="Minimize">
      <Icon name="lucide:Minus" size={16} />
    </button>
    <button class="win-btn" on:click={handleMaximize} aria-label={maximizeLabel}>
      {#key maximizeIcon}
        <Icon name={maximizeIcon} size={14} />
      {/key}
    </button>
    <button class="win-btn win-close" on:click={handleClose} aria-label="Close">
      <Icon name="lucide:X" size={16} />
    </button>
  </div>
</div>

<style>
  /* DRAG REGION (официальный паттерн Tauri; app-region специфичен, поэтому оставляем только working-свойство) */
  :global(*[data-tauri-drag-region]) {
    -webkit-app-region: drag;
  }

  :global([data-tauri-drag-region="false"]),
  .win-btn {
    -webkit-app-region: no-drag;
  }

  .titlebar {
    height: 40px;                /* Reduced by 4px */
    padding: 0;                  /* без горизонтального паддинга — контролы реально у края */
    display: flex;
    align-items: center;
    background-color: var(--nc-bg);
    color: var(--nc-fg-muted);
    -webkit-user-select: none;
    user-select: none;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 8px;                    /* 2 * 4px */
    min-width: 0;
    padding-left: 12px;          /* 3 * 4px — локальный отступ слева */
  }

  .app-icon {
    width: 24px;                 /* Increased size */
    height: 24px;                /* Increased size */
    border-radius: 4px;          /* 1 * 4px */
  }

  .app-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* .app-subtitle удалён по требованиям дизайна */

  .titlebar-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .command-palette {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg-muted);
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    max-width: 800px;
    height: 28px;
    border: 1px solid var(--nc-highlight-subtle);
    font-size: 12px;
    transition: background-color 0.12s ease, border-color 0.12s ease;
  }

  .command-palette:hover {
    background-color: var(--nc-tab-bg-hover);
    border-color: var(--nc-fg-muted);
  }

  .command-palette-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--nc-fg-muted);
  }

  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;           /* выталкиваем вправо */
  }

  /* Каждая win-btn вплотную к правому краю окна:
     последний не имеет паддинга справа, чтобы край кнопки совпадал с краем titlebar. */
  .titlebar-right .win-btn:last-child {
    margin-right: 0;
  }

  .win-btn {
    width: 48px;                 /* 12 * 4px */
    height: 40px;                /* Match titlebar height */
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    background: transparent;
    color: var(--nc-fg-muted);
    padding: 0;
    cursor: pointer;
  }

  .win-btn:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .win-btn.win-close:hover {
    background-color: #ef4444;
    color: #ffffff;
  }

  .layout-btn {
    width: 32px;                 /* Smaller than win-btn */
    height: 32px;                /* Smaller than win-btn */
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    background: transparent;
    color: var(--nc-fg-muted);
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
  }

  .layout-btn:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

</style>
