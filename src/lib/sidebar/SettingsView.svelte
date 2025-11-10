<script lang="ts">
  // src/lib/sidebar/SettingsView.svelte
  // ----------------------------------------------------------------------------
  // Sidebar-вью настроек.
  //
  // Обновлено для использования трехпанельного SettingsShell как основного layout,
  // при этом:
  // - сохраняется внешний каркас sidebar view (заголовок, скролл-поведение, фон);
  // - не ломается регистрация/экспорт компонента (sidebarRegistry использует этот файл);
  // - сам SettingsShell не меняет текущих значений без явных действий controls.
  //
  // SettingsShell:
  // - читает структуру секций/настроек из settings/registry.ts;
  // - отображает реальные настройки (theme/editor) в центральной панели;
  // - показывает превью выбранной настройки (опционально).
  // ----------------------------------------------------------------------------

  import SettingsShell from '$lib/settings/layout/SettingsShell.svelte';

  // В sidebar работаем в компактном режиме:
  // - чуть более плотный layout,
  // - по умолчанию скрыта правая панель превью (может быть включена пропсом при необходимости).
  const SHELL_ID = 'sidebar-settings-shell';
</script>

<div class="settings-sidebar-root">
  <header class="sidebar-header">
    <div class="title">SETTINGS</div>
    <div class="subtitle">Configure Nova Code</div>
  </header>

  <div class="sidebar-shell-wrap">
    <SettingsShell
      id={SHELL_ID}
      compactMode={true}
      showPreviewPane={false}
    />
  </div>
</div>

<style>
  .settings-sidebar-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    background-color: var(--nc-bg);
    color: var(--nc-fg);
    overflow: hidden;
  }

  .sidebar-header {
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--nc-border-subtle);
    background:
      linear-gradient(
        to bottom,
        rgba(15, 23, 42, 0.98),
        rgba(15, 23, 42, 0.94)
      );
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.6);
  }

  .title {
    font-size: 10px;
    letter-spacing: 0.16em;
    font-weight: 600;
    color: var(--nc-fg-muted);
  }

  .subtitle {
    margin-top: 2px;
    font-size: 11px;
    color: var(--nc-fg-muted);
    opacity: 0.9;
  }

  .sidebar-shell-wrap {
    flex: 1;
    overflow: hidden;
  }
</style>
