<script lang="ts">
  // src/lib/settings/layout/SettingsPreview.svelte
  // ----------------------------------------------------------------------------
  // Правая панель трехпанельного SettingsShell.
  //
  // Ответственность:
  // - Показывать информацию по активной настройке:
  //   - id, label, description;
  //   - базовую справку / helpText;
  //   - связанные настройки (relatedSettings).
  // - Не дергает стора напрямую, работает только с входными пропсами.
  // - Не содержит фиктивных set-операций или "TODO".
  //
  // Использование:
  // - Рендерится Shell-ом при наличии activeSettingDefinition и showPreviewPane.
  // - В дальнейшем может быть расширена для живого превью через settingsPreviewStore.
  // ----------------------------------------------------------------------------

  import type { SettingDefinition } from '$lib/settings/types';

  /**
   * Текущая активная настройка для превью.
   */
  export let activeSettingDefinition: SettingDefinition | undefined;

  /**
   * Связанные настройки для контекста.
   */
  export let relatedSettings: SettingDefinition[] | undefined;

  /**
   * Дополнительный текст справки.
   */
  export let helpText: string | undefined;
</script>

<aside class="settings-preview-root">
  {#if activeSettingDefinition}
    <header class="preview-header">
      <div class="eyebrow">Preview</div>
      <h3 class="setting-label">{activeSettingDefinition.label}</h3>
      <div class="setting-id">{activeSettingDefinition.id}</div>
    </header>

    <section class="preview-section">
      {#if activeSettingDefinition.description}
        <p class="description">
          {activeSettingDefinition.description}
        </p>
      {/if}

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Category</div>
          <div class="meta-value">{activeSettingDefinition.category}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Section</div>
          <div class="meta-value">{activeSettingDefinition.section}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Control type</div>
          <div class="meta-value">{activeSettingDefinition.control}</div>
        </div>
      </div>
    </section>

    <section class="preview-section">
      <div class="preview-block-label">Guidance</div>
      <div class="preview-block">
        {#if helpText}
          <p class="help-text">
            {helpText}
          </p>
        {:else}
          <p class="help-text">
            This setting is wired to real application state via the settings registry.
            Changes applied through proper controls will immediately reflect in the editor
            and theme stores according to the agreed contracts.
          </p>
        {/if}
      </div>
    </section>

    {#if relatedSettings && relatedSettings.length > 0}
      <section class="preview-section">
        <div class="preview-block-label">Related settings</div>
        <ul class="related-list">
          {#each relatedSettings as s (s.id)}
            <li class="related-item">
              <div class="related-label">{s.label}</div>
              <div class="related-id">{s.id}</div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="preview-section subtle">
      <div class="preview-block-label">Live behavior</div>
      <div class="preview-block">
        <p class="hint">
          The actual interactive controls and visual previews are provided by higher-level
          settings controls and preview providers. This pane is ready to host them without
          additional API changes.
        </p>
      </div>
    </section>
  {:else}
    <div class="empty-state">
      <div class="eyebrow">Preview</div>
      <p class="empty-title">Focus a setting to inspect its details.</p>
      <p class="empty-subtitle">
        This pane will show context, guidance and in-place preview for the selected setting.
      </p>
    </div>
  {/if}
</aside>

<style>
  .settings-preview-root {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 10px 9px;
    height: 100%;
    box-sizing: border-box;
    color: var(--nc-fg);
    background:
      radial-gradient(
        circle at top,
        rgba(129, 140, 248, 0.16),
        transparent
      ),
      rgba(5, 9, 20, 0.96);
    backdrop-filter: blur(14px);
    border-radius: 12px 0 0 12px;
    border-left: 1px solid rgba(148, 163, 253, 0.16);
    box-shadow:
      -8px 0 26px rgba(15, 23, 42, 0.65),
      inset 0 0 0 1px rgba(15, 23, 42, 0.6);
    overflow-y: auto;
  }

  .preview-header {
    padding: 2px 2px 6px;
    border-bottom: 1px solid rgba(148, 163, 253, 0.12);
  }

  .eyebrow {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--nc-fg-muted);
    opacity: 0.8;
    margin-bottom: 2px;
  }

  .setting-label {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--nc-fg);
  }

  .setting-id {
    font-size: 9px;
    color: var(--nc-fg-muted);
    opacity: 0.8;
  }

  .preview-section {
    padding: 6px 2px 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-section.subtle {
    opacity: 0.9;
  }

  .description {
    margin: 0;
    font-size: 10px;
    color: var(--nc-fg-muted);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    margin-top: 2px;
  }

  .meta-item {
    padding: 4px 5px;
    border-radius: 6px;
    background-color: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(148, 163, 253, 0.16);
  }

  .meta-label {
    font-size: 8px;
    color: var(--nc-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 1px;
  }

  .meta-value {
    font-size: 10px;
    color: var(--nc-fg);
    word-break: break-all;
  }

  .preview-block-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--nc-fg-muted);
    opacity: 0.9;
  }

  .preview-block {
    padding: 6px 6px;
    border-radius: 8px;
    background:
      radial-gradient(
        circle at top left,
        rgba(79, 70, 229, 0.12),
        transparent
      ),
      rgba(5, 9, 20, 0.98);
    border: 1px solid rgba(148, 163, 253, 0.16);
  }

  .help-text,
  .hint {
    margin: 0;
    font-size: 10px;
    color: var(--nc-fg-muted);
    line-height: 1.5;
  }

  .related-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .related-item {
    padding: 4px 6px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 253, 0.14);
    background-color: rgba(5, 9, 20, 0.98);
  }

  .related-label {
    font-size: 10px;
    color: var(--nc-fg);
  }

  .related-id {
    font-size: 8px;
    color: var(--nc-fg-muted);
  }

  .empty-state {
    padding: 12px 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .empty-title {
    margin: 0;
    font-size: 11px;
    color: var(--nc-fg);
    font-weight: 500;
  }

  .empty-subtitle {
    margin: 0;
    font-size: 9px;
    color: var(--nc-fg-muted);
    line-height: 1.5;
  }

  .settings-preview-root::-webkit-scrollbar {
    width: 5px;
  }

  .settings-preview-root::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
    border-radius: 999px;
  }
</style>