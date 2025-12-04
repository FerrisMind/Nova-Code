<script lang="ts">
  // src/lib/settings/sections/EditorSection.svelte
  // ----------------------------------------------------------------------------
  // Секция Editor — настройки редактора кода.
  //
  // Структура аккордеонов:
  // - Basics (открыт по умолчанию): fontSize, fontFamily, fontLigatures
  // - Layout (открыт по умолчанию): tabSize, wordWrap, insertSpaces
  // - UI Settings (закрыт): minimap, lineNumbers, folding
  // - Behavior (закрыт): autoSave, autoSaveDelay
  // - Advanced (закрыт): bracketPairColorization, renderWhitespace
  //
  // Использует:
  // - Accordion из shadcn-svelte
  // - Toggle, RangeInput, SelectControl для разных типов контролов
  // - Live preview для визуальных настроек
  // ----------------------------------------------------------------------------

  import { Code2, HelpCircle } from '@lucide/svelte';
  import * as Accordion from '$lib/components/ui/accordion';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Toggle from '$lib/settings/controls/Toggle.svelte';
  import RangeInput from '$lib/settings/controls/RangeInput.svelte';
  import SelectControl from '$lib/settings/controls/SelectControl.svelte';
  import SaveIndicator from '$lib/settings/controls/SaveIndicator.svelte';
  import { getSetting } from '$lib/settings/registry';
  import { editorSettings } from '$lib/stores/editorSettingsStore';

  // ---------------------------------------------------------------------------
  // Состояние
  // ---------------------------------------------------------------------------

  // Открытые аккордеоны (по умолчанию Basics и Layout)
  let openItems = $state(['basics', 'layout']);

  // Состояние сохранения для каждой настройки
  let saveStates = $state<Record<string, boolean>>({});

  // Подписка на editorSettings для live preview
  let currentSettings = $state(editorSettings.getSettings());

  const previewText = `function greet(name) {
  const message = 'Hello, world';
  return message;
}`;

  $effect(() => {
    const unsubscribe = editorSettings.subscribe((settings) => {
      currentSettings = settings;
    });
    return unsubscribe;
  });

  // ---------------------------------------------------------------------------
  // Определения настроек
  // ---------------------------------------------------------------------------

  // Basics
  const fontSizeDef = getSetting('editor.fontSize');
  const fontFamilyDef = getSetting('editor.fontFamily');
  const fontLigaturesDef = getSetting('editor.fontLigatures');

  // Layout
  const tabSizeDef = getSetting('editor.tabSize');
  const insertSpacesDef = getSetting('editor.insertSpaces');
  const wordWrapDef = getSetting('editor.wordWrap');

  // UI Settings
  const minimapDef = getSetting('editor.minimap');
  const lineNumbersDef = getSetting('editor.lineNumbers');
  const foldingDef = getSetting('editor.folding');

  // Behavior
  const autoSaveDef = getSetting('editor.autoSave');
  const autoSaveDelayDef = getSetting('editor.autoSaveDelay');

  // Advanced
  const bracketPairDef = getSetting('editor.bracketPairColorization');
  const renderWhitespaceDef = getSetting('editor.renderWhitespace');

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  function handleChange(settingId: string) {
    saveStates[settingId] = true;
    saveStates = { ...saveStates };
  }

  function hideSaveIndicator(settingId: string) {
    saveStates[settingId] = false;
    saveStates = { ...saveStates };
  }

  // ---------------------------------------------------------------------------
  // Опции для Select контролов
  // ---------------------------------------------------------------------------

  const wordWrapOptions = [
    { value: 'off', label: 'Off' },
    { value: 'on', label: 'On' },
    { value: 'wordWrapColumn', label: 'At Column' },
    { value: 'bounded', label: 'Bounded' },
  ];

  const lineNumbersOptions = [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
    { value: 'relative', label: 'Relative' },
    { value: 'interval', label: 'Interval' },
  ];

  const autoSaveOptions = [
    { value: 'off', label: 'Off' },
    { value: 'afterDelay', label: 'After Delay' },
    { value: 'onFocusChange', label: 'On Focus Change' },
    { value: 'onWindowChange', label: 'On Window Change' },
  ];

  const renderWhitespaceOptions = [
    { value: 'none', label: 'None' },
    { value: 'selection', label: 'Selection' },
    { value: 'boundary', label: 'Boundary' },
    { value: 'trailing', label: 'Trailing' },
    { value: 'all', label: 'All' },
  ];
</script>

<div class="editor-section">
  <!-- Section Header -->
  <header class="section-header">
    <div class="header-icon">
      <Code2 size={20} />
    </div>
    <div class="header-content">
      <h2 class="section-title">Editor Settings</h2>
      <p class="section-description">Настройте поведение и внешний вид редактора кода</p>
    </div>
  </header>

  <!-- Live Preview -->
  <div class="live-preview">
    <div class="preview-label">Preview</div>
    <pre
      class="preview-code"
      style="font-family: {currentSettings.fontFamily}; font-size: {currentSettings.fontSize}px;">
      {previewText}
    </pre>
  </div>

  <!-- Accordions -->
  <Accordion.Root type="multiple" bind:value={openItems} class="settings-accordions">
    <!-- =====================================================================
         Basics
         ===================================================================== -->
    <Accordion.Item value="basics">
      <Accordion.Trigger class="accordion-trigger">
        <span class="accordion-title">Basics</span>
        <span class="accordion-hint">Font, size, ligatures</span>
      </Accordion.Trigger>
      <Accordion.Content class="accordion-content">
        <div class="settings-group">
          <!-- Font Size -->
          {#if fontSizeDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Font Size</div>
                <p class="setting-description">Size of the editor font in pixels</p>
              </div>
              <div class="setting-control">
                <RangeInput
                  definition={fontSizeDef}
                  min={8}
                  max={32}
                  step={1}
                  compact
                  onchange={() => handleChange('editor.fontSize')}
                />
                <SaveIndicator
                  visible={saveStates['editor.fontSize'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.fontSize')}
                />
              </div>
            </div>
          {/if}

          <!-- Font Family -->
          {#if fontFamilyDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Font Family</div>
                <p class="setting-description">CSS font-family for the editor</p>
              </div>
              <div class="setting-control setting-control--wide">
                <input
                  type="text"
                  class="text-input"
                  value={currentSettings.fontFamily}
                  onchange={(e) => {
                    fontFamilyDef.set((e.target as HTMLInputElement).value);
                    handleChange('editor.fontFamily');
                  }}
                />
                <SaveIndicator
                  visible={saveStates['editor.fontFamily'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.fontFamily')}
                />
              </div>
            </div>
          {/if}

          <!-- Font Ligatures -->
          {#if fontLigaturesDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Font Ligatures</div>
                <p class="setting-description">Enable font ligatures (e.g., =>, !==)</p>
              </div>
              <div class="setting-control">
                <Toggle
                  definition={fontLigaturesDef}
                  compact
                  onchange={() => handleChange('editor.fontLigatures')}
                />
                <SaveIndicator
                  visible={saveStates['editor.fontLigatures'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.fontLigatures')}
                />
              </div>
            </div>
          {/if}
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <!-- =====================================================================
         Layout
         ===================================================================== -->
    <Accordion.Item value="layout">
      <Accordion.Trigger class="accordion-trigger">
        <span class="accordion-title">Layout</span>
        <span class="accordion-hint">Tabs, wrapping, spacing</span>
      </Accordion.Trigger>
      <Accordion.Content class="accordion-content">
        <div class="settings-group">
          <!-- Tab Size -->
          {#if tabSizeDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Tab Size</div>
                <p class="setting-description">Number of spaces per tab</p>
              </div>
              <div class="setting-control">
                <RangeInput
                  definition={tabSizeDef}
                  min={1}
                  max={8}
                  step={1}
                  compact
                  onchange={() => handleChange('editor.tabSize')}
                />
                <SaveIndicator
                  visible={saveStates['editor.tabSize'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.tabSize')}
                />
              </div>
            </div>
          {/if}

          <!-- Insert Spaces -->
          {#if insertSpacesDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Insert Spaces</div>
                <p class="setting-description">Use spaces instead of tabs</p>
              </div>
              <div class="setting-control">
                <Toggle
                  definition={insertSpacesDef}
                  compact
                  onchange={() => handleChange('editor.insertSpaces')}
                />
                <SaveIndicator
                  visible={saveStates['editor.insertSpaces'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.insertSpaces')}
                />
              </div>
            </div>
          {/if}

          <!-- Word Wrap -->
          {#if wordWrapDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Word Wrap</div>
                <p class="setting-description">How to wrap long lines</p>
              </div>
              <div class="setting-control">
                <SelectControl
                  definition={wordWrapDef}
                  options={wordWrapOptions}
                  onchange={() => handleChange('editor.wordWrap')}
                />
                <SaveIndicator
                  visible={saveStates['editor.wordWrap'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.wordWrap')}
                />
              </div>
            </div>
          {/if}
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <!-- =====================================================================
         UI Settings
         ===================================================================== -->
    <Accordion.Item value="ui">
      <Accordion.Trigger class="accordion-trigger">
        <span class="accordion-title">UI Settings</span>
        <span class="accordion-hint">Minimap, line numbers, folding</span>
      </Accordion.Trigger>
      <Accordion.Content class="accordion-content">
        <div class="settings-group">
          <!-- Minimap -->
          {#if minimapDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Minimap</div>
                <p class="setting-description">Show the code minimap</p>
              </div>
              <div class="setting-control">
                <Toggle
                  definition={minimapDef}
                  compact
                  onchange={() => handleChange('editor.minimap')}
                />
                <SaveIndicator
                  visible={saveStates['editor.minimap'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.minimap')}
                />
              </div>
            </div>
          {/if}

          <!-- Line Numbers -->
          {#if lineNumbersDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Line Numbers</div>
                <p class="setting-description">How to display line numbers</p>
              </div>
              <div class="setting-control">
                <SelectControl
                  definition={lineNumbersDef}
                  options={lineNumbersOptions}
                  onchange={() => handleChange('editor.lineNumbers')}
                />
                <SaveIndicator
                  visible={saveStates['editor.lineNumbers'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.lineNumbers')}
                />
              </div>
            </div>
          {/if}

          <!-- Folding -->
          {#if foldingDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Code Folding</div>
                <p class="setting-description">Enable code folding</p>
              </div>
              <div class="setting-control">
                <Toggle
                  definition={foldingDef}
                  compact
                  onchange={() => handleChange('editor.folding')}
                />
                <SaveIndicator
                  visible={saveStates['editor.folding'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.folding')}
                />
              </div>
            </div>
          {/if}
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <!-- =====================================================================
         Behavior
         ===================================================================== -->
    <Accordion.Item value="behavior">
      <Accordion.Trigger class="accordion-trigger">
        <span class="accordion-title">Behavior</span>
        <span class="accordion-hint">Auto save, formatting</span>
      </Accordion.Trigger>
      <Accordion.Content class="accordion-content">
        <div class="settings-group">
          <!-- Auto Save -->
          {#if autoSaveDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Auto Save</div>
                <p class="setting-description">When to auto-save files</p>
              </div>
              <div class="setting-control">
                <SelectControl
                  definition={autoSaveDef}
                  options={autoSaveOptions}
                  onchange={() => handleChange('editor.autoSave')}
                />
                <SaveIndicator
                  visible={saveStates['editor.autoSave'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.autoSave')}
                />
              </div>
            </div>
          {/if}

          <!-- Auto Save Delay -->
          {#if autoSaveDelayDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Auto Save Delay</div>
                <p class="setting-description">Delay in milliseconds (for "After Delay" mode)</p>
              </div>
              <div class="setting-control">
                <RangeInput
                  definition={autoSaveDelayDef}
                  min={100}
                  max={5000}
                  step={100}
                  compact
                  onchange={() => handleChange('editor.autoSaveDelay')}
                />
                <SaveIndicator
                  visible={saveStates['editor.autoSaveDelay'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.autoSaveDelay')}
                />
              </div>
            </div>
          {/if}
        </div>
      </Accordion.Content>
    </Accordion.Item>

    <!-- =====================================================================
         Advanced
         ===================================================================== -->
    <Accordion.Item value="advanced">
      <Accordion.Trigger class="accordion-trigger">
        <span class="accordion-title">Advanced</span>
        <span class="accordion-hint">Bracket pairs, whitespace</span>
      </Accordion.Trigger>
      <Accordion.Content class="accordion-content">
        <div class="settings-group">
          <!-- Bracket Pair Colorization -->
          {#if bracketPairDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label-row">
                  <div class="setting-label">Bracket Pair Colorization</div>
                  <Tooltip.Root>
                    <Tooltip.Trigger class="help-trigger">
                      <HelpCircle size={14} class="help-icon" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>
                        Colorizes matching brackets with different colors to help you identify
                        nested code blocks more easily.
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
                <p class="setting-description">Colorize matching brackets</p>
              </div>
              <div class="setting-control">
                <Toggle
                  definition={bracketPairDef}
                  compact
                  onchange={() => handleChange('editor.bracketPairColorization')}
                />
                <SaveIndicator
                  visible={saveStates['editor.bracketPairColorization'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.bracketPairColorization')}
                />
              </div>
            </div>
          {/if}

          <!-- Render Whitespace -->
          {#if renderWhitespaceDef}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label-row">
                  <div class="setting-label">Render Whitespace</div>
                  <Tooltip.Root>
                    <Tooltip.Trigger class="help-trigger">
                      <HelpCircle size={14} class="help-icon" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>
                        Shows spaces and tabs as visible dots/arrows. "Selection" shows only in
                        selected text, "Trailing" shows only at end of lines.
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
                <p class="setting-description">How to render whitespace characters</p>
              </div>
              <div class="setting-control">
                <SelectControl
                  definition={renderWhitespaceDef}
                  options={renderWhitespaceOptions}
                  onchange={() => handleChange('editor.renderWhitespace')}
                />
                <SaveIndicator
                  visible={saveStates['editor.renderWhitespace'] ?? false}
                  compact
                  onHide={() => hideSaveIndicator('editor.renderWhitespace')}
                />
              </div>
            </div>
          {/if}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</div>

<style>
  .editor-section {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-xl, 32px);
  }

  /* =========================================================================
   * Section Header
   * ========================================================================= */

  .section-header {
    display: flex;
    align-items: flex-start;
    gap: var(--settings-space-md, 16px);
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--settings-radius-md, 8px);
    background: hsl(var(--settings-primary, 217 91% 60%) / 0.1);
    color: hsl(var(--settings-primary, 217 91% 60%));
    flex-shrink: 0;
  }

  .header-content {
    flex: 1;
  }

  .section-title {
    margin: 0;
    font-size: var(--settings-font-size-xl, 20px);
    font-weight: 600;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    letter-spacing: -0.01em;
  }

  .section-description {
    margin: var(--settings-space-xs, 4px) 0 0;
    font-size: var(--settings-font-size-sm, 13px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    line-height: 1.5;
  }

  /* =========================================================================
   * Live Preview
   * ========================================================================= */

  .live-preview {
    position: relative;
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-lg, 12px);
    overflow: hidden;
  }

  .preview-label {
    position: absolute;
    top: var(--settings-space-sm, 8px);
    right: var(--settings-space-sm, 8px);
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--nc-level-2, hsl(var(--muted)));
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    border-radius: 4px;
  }

  .preview-code {
    margin: 0;
    padding: var(--settings-space-lg, 24px);
    padding-top: var(--settings-space-xl, 32px);
    line-height: 1.6;
    overflow-x: auto;
  }

  /* =========================================================================
   * Accordion Styles
   * ========================================================================= */

  :global(.settings-accordions) {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-sm, 8px);
  }

  :global(.accordion-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--settings-space-md, 16px);
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-lg, 12px);
    font-size: var(--settings-font-size-base, 14px);
    cursor: pointer;
    transition:
      background-color var(--settings-transition-fast, 150ms),
      border-color var(--settings-transition-fast, 150ms);
  }

  :global(.accordion-trigger:hover) {
    background: var(--nc-level-1, hsl(var(--accent)));
    border-color: var(--nc-level-4, hsl(var(--border)));
  }

  :global(.accordion-trigger[data-state='open']) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-color: transparent;
  }

  .accordion-title {
    font-weight: 600;
    color: var(--nc-palette-text, hsl(var(--foreground)));
  }

  .accordion-hint {
    font-size: var(--settings-font-size-xs, 11px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    margin-right: auto;
    margin-left: var(--settings-space-md, 16px);
  }

  :global(.accordion-content) {
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-top: none;
    border-bottom-left-radius: var(--settings-radius-lg, 12px);
    border-bottom-right-radius: var(--settings-radius-lg, 12px);
    padding: var(--settings-space-md, 16px);
  }

  /* =========================================================================
   * Settings Group & Row
   * ========================================================================= */

  .settings-group {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-md, 16px);
  }

  .setting-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--settings-space-lg, 24px);
    padding: var(--settings-space-sm, 8px) 0;
  }

  .setting-row:not(:last-child) {
    border-bottom: 1px solid var(--nc-palette-border, hsl(var(--border) / 0.5));
    padding-bottom: var(--settings-space-md, 16px);
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }

  .setting-label-row {
    display: flex;
    align-items: center;
    gap: var(--settings-space-xs, 4px);
  }

  .setting-label {
    display: block;
    font-size: var(--settings-font-size-base, 14px);
    font-weight: 500;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    margin-bottom: 2px;
  }

  :global(.help-icon) {
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    cursor: help;
    opacity: 0.7;
    transition: opacity var(--settings-transition-fast, 150ms);
  }

  :global(.help-icon:hover) {
    opacity: 1;
  }

  :global(.help-trigger[data-slot='tooltip-trigger']) {
    border: none;
    background: transparent;
    padding: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    cursor: help;
    transition:
      background-color var(--settings-transition-fast, 150ms),
      color var(--settings-transition-fast, 150ms),
      opacity var(--settings-transition-fast, 150ms);
  }

  :global(.help-trigger[data-slot='tooltip-trigger']:hover) {
    background: var(--nc-level-3, rgba(255, 255, 255, 0.08));
    opacity: 1;
  }

  :global(.help-trigger[data-slot='tooltip-trigger']:focus-visible) {
    outline: 2px solid var(--nc-accent, #5bc4ff);
    outline-offset: 2px;
  }

  .setting-description {
    margin: 0;
    font-size: var(--settings-font-size-xs, 11px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    line-height: 1.4;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 8px);
    flex-shrink: 0;
  }

  .setting-control--wide {
    min-width: 200px;
  }

  /* Text Input */
  .text-input {
    width: 100%;
    padding: var(--settings-space-sm, 8px) var(--settings-space-sm, 12px);
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-md, 8px);
    background: var(--nc-level-1, hsl(var(--background)));
    color: var(--nc-palette-text, hsl(var(--foreground)));
    font-size: var(--settings-font-size-sm, 13px);
    font-family: inherit;
    outline: none;
    transition: border-color var(--settings-transition-fast, 150ms);
  }

  .text-input:focus {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
  }
</style>

<svelte:options runes={true} />
