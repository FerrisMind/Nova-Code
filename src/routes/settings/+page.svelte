<script lang="ts">
  // src/routes/settings/+page.svelte
  // ----------------------------------------------------------------------------
  // Полноэкранная страница настроек.
  //
  // Обновлено для использования трехпанельного SettingsShell в качестве
  // основного содержимого, без изменения маршрутизации.
  //
  // Особенности:
  // - Маршрут остается /settings (SvelteKit).
  // - Используется SettingsShell поверх settings/registry.ts.
  // - Полноэкранное отображение с легким glassmorphism.
  // - Правая панель превью включена по умолчанию.
  // ----------------------------------------------------------------------------

  import SettingsShell from '$lib/settings/layout/SettingsShell.svelte';

  const SHELL_ID = 'page-settings-shell';
</script>

<div class="settings-page-root">
  <header class="page-header">
    <div class="title-wrap">
      <h1 class="title">Settings</h1>
      <p class="subtitle">Configure your Nova Code workspace and editor behavior</p>
    </div>
  </header>

  <main class="page-shell-wrap">
    <SettingsShell
      id={SHELL_ID}
      compactMode={false}
      showPreviewPane={true}
    />
  </main>
</div>

<style>
  .settings-page-root {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 16px 18px 14px;
    background:
      radial-gradient(
        circle at top left,
        rgba(129, 140, 248, 0.10),
        transparent
      ),
      radial-gradient(
        circle at bottom right,
        rgba(15, 23, 42, 0.9),
        var(--nc-bg)
      );
    color: var(--nc-fg);
  }

  .page-header {
    padding: 4px 4px 10px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }

  .title-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    margin: 0;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--nc-fg);
  }

  .subtitle {
    margin: 0;
    font-size: 12px;
    color: var(--nc-fg-muted);
  }

  .page-shell-wrap {
    flex: 1;
    margin-top: 4px;
    border-radius: 12px;
    border: 1px solid var(--nc-border-subtle);
    background:
      radial-gradient(
        circle at top left,
        rgba(148, 163, 253, 0.08),
        transparent
      ),
      rgba(6, 9, 16, 0.98);
    backdrop-filter: blur(14px);
    box-shadow:
      0 22px 60px rgba(15, 23, 42, 0.85),
      inset 0 0 0 1px rgba(15, 23, 42, 0.92);
    overflow: hidden;
  }

  main.page-shell-wrap :global(.settings-shell-root) {
    height: 100%;
  }
</style>