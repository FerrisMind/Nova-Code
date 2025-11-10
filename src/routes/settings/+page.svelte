<script lang="ts">
  import SettingsShell from '$lib/settings/layout/SettingsShell.svelte';

  const SHELL_ID = 'page-settings-shell';
</script>

<div class="settings-page-root">
  <div class="settings-page-container">
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
      />
    </main>
  </div>
</div>

<style>
  .settings-page-root {
    min-height: 100vh;
    background: var(--nc-level-2);
    color: var(--nc-palette-text);
    display: flex !important;
    justify-content: center !important;
    padding: 16px;
  }

  .settings-page-container {
    width: 100%;
    max-width: 1400px !important;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .page-header {
    padding: 4px;
  }

  .title-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--nc-palette-text);
  }

  .subtitle {
    margin: 0;
    font-size: 12px;
    color: var(--nc-palette-text);
    opacity: 0.7;
  }

  .page-shell-wrap {
    flex: 1;
    min-height: 0;
  }

  main.page-shell-wrap :global(.settings-shell-root) {
    height: 100%;
  }
</style>