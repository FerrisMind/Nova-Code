<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  let appWindow = getCurrentWindow();

  // Обновляем ссылку на окно при монтировании (на случай окружения без Tauri при билде)
  onMount(() => {
    appWindow = getCurrentWindow();
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
</script>

<div class="titlebar" data-tauri-drag-region>
  <div class="titlebar-left">
    <div class="app-icon"></div>
    <div class="app-title">Nova Code</div>
  </div>

  <div class="titlebar-center"></div>

  <!-- Блок с контролами окна фиксирован справа -->
  <div class="titlebar-right" data-tauri-drag-region="false">
    <button class="win-btn" on:click={handleMinimize} aria-label="Minimize">
      <span class="line"></span>
    </button>
    <button class="win-btn" on:click={handleMaximize} aria-label="Maximize">
      <span class="square"></span>
    </button>
    <button class="win-btn win-close" on:click={handleClose} aria-label="Close">
      <span class="cross"></span>
    </button>
  </div>
</div>

<style>
  /* DRAG REGION (официальный паттерн Tauri; app-region специфичен, поэтому оставляем только working-свойство) */
  :global(*[data-tauri-drag-region]) {
    -webkit-app-region: drag;
  }

  :global([data-tauri-drag-region="false"]),
  .win-btn,
  .win-btn * {
    -webkit-app-region: no-drag;
  }

  .titlebar {
    height: 32px;                /* 8 * 4px */
    padding: 0;                  /* без горизонтального паддинга — контролы реально у края */
    display: flex;
    align-items: center;
    background-color: var(--nc-bg);
    color: var(--nc-fg-muted);
    border-bottom: 1px solid var(--nc-border-subtle);
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
    width: 16px;                 /* 4 * 4px */
    height: 16px;                /* 4 * 4px */
    border-radius: 4px;          /* 1 * 4px */
    background: radial-gradient(circle at 30% 0%, var(--nc-accent), transparent),
      radial-gradient(circle at 80% 80%, #22c55e, transparent),
      radial-gradient(circle at 0% 100%, #a855f7, transparent);
  }

  .app-title {
    font-size: 12px;             /* 3 * 4px */
    font-weight: 500;
    color: var(--nc-fg);
  }

  /* .app-subtitle удалён по требованиям дизайна */

  .titlebar-center {
    flex: 1;
  }

  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 0;
    margin-left: auto;           /* выталкиваем вправо */
  }

  /* Каждая win-btn вплотную к правому краю окна:
     последний не имеет паддинга справа, чтобы край кнопки совпадал с краем titlebar. */
  .titlebar-right .win-btn:last-child {
    margin-right: 0;
  }

  .win-btn {
    width: 48px;                 /* 12 * 4px */
    height: 32px;                /* 8 * 4px */
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

  .line {
    width: 8px;
    height: 2px;
    background-color: currentColor;
  }

  .square {
    width: 8px;
    height: 8px;
    border: 1px solid currentColor;
    box-sizing: border-box;
  }

  .cross {
    position: relative;
    width: 8px;
    height: 8px;
  }

  .cross::before,
  .cross::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    width: 2px;
    height: 8px;
    background-color: currentColor;
  }

  .cross::before {
    transform: rotate(45deg);
  }

  .cross::after {
    transform: rotate(-45deg);
  }
</style>
