<script lang="ts">
  // src/routes/settings/+page.svelte
  // ----------------------------------------------------------------------------
  // Страница настроек Nova Code.
  // Использует новый SettingsShell с двухпанельным layout.
  // ----------------------------------------------------------------------------

  import SettingsShell from '$lib/settings/layout/SettingsShell.svelte';

  const SHELL_ID = 'page-settings-shell';
</script>

<div class="settings-page-root">
  <SettingsShell
    id={SHELL_ID}
    initialSectionId="appearance"
  />
</div>

<style>
  .settings-page-root {
    width: 100%;
    height: 100%;
    background: var(--nc-level-1, hsl(var(--background)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
    overflow: hidden;
  }
</style>
