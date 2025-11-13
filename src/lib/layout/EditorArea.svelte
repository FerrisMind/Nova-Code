<script lang="ts">
  // src/lib/layout/EditorArea.svelte
  // -------------------------------------------------------------------------
  // Интеграция Monaco как движка редактора в существующий layout.
  //
  // Принципы:
  // - EditorArea остаётся ответственным за UX (welcome state, layout, minimap).
  // - MonacoHost инкапсулирует низкоуровневую инициализацию Monaco.
  // - EditorCore даёт чистый многомодельный API (см. src/lib/editor/EditorCore.ts).
  //
  // Текущий шаг:
  // - рендерим MonacoHost для активного файла вместо статического CodeEditor.
  // - используем mock-контент и editorStore API, без реального сохранения.
  // - оставляем Minimap как визуальный mock поверх тех же данных.
  //
  // Будущие шаги:
  // - подписка на change-события MonacoHost для isDirty / синхронизации с Tauri.
  // - подключение diff-режима и IntelliSense-провайдеров на базе EditorCore.

  import { onDestroy } from 'svelte';
  import { activeEditor, editorStore } from '../stores/editorStore';
  import { fileService } from '../services/fileService';
  import MonacoHost from '../editor/MonacoHost.svelte';
  import { editorSettings } from '../stores/editorSettingsStore';
  import SettingsShell from '$lib/settings/layout/SettingsShell.svelte';
  import WelcomeScreen from './WelcomeScreen.svelte';
  import { editorBehaviorStore } from '../stores/editorBehaviorStore';

  let current = $state(null as import('../stores/editorStore').EditorTab | null);
  let editorOptions = $state(editorSettings.getSettings());
  let backgroundColor = $state('var(--nc-level-1)');

  let autoSaveEnabled = editorBehaviorStore.getAutoSave();
  let autoSaveDelay = editorBehaviorStore.getAutoSaveDelay();
  let pendingSave: { fileId: string; value: string } | null = null;
  let pendingAutoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let previousEditorId: string | null = null;

  const clearAutoSaveTimer = () => {
    if (pendingAutoSaveTimer) {
      clearTimeout(pendingAutoSaveTimer);
      pendingAutoSaveTimer = null;
    }
  };

  const flushAutoSave = async () => {
    if (!autoSaveEnabled || !pendingSave) return;
    try {
      await editorStore.updateContent(pendingSave.fileId, pendingSave.value);
    } catch (error) {
      console.error('[auto-save] failed to persist', error);
    }
    pendingSave = null;
    clearAutoSaveTimer();
  };

  const scheduleAutoSave = () => {
    if (!autoSaveEnabled || !pendingSave) return;
    clearAutoSaveTimer();
    pendingAutoSaveTimer = window.setTimeout(() => {
      void flushAutoSave();
    }, autoSaveDelay);
  };

  const unsub = activeEditor.subscribe(($active) => {
    current = $active;
    backgroundColor = $active ? 'var(--nc-tab-bg-active)' : 'var(--nc-level-1)';
  });

  // Подписка на изменения настроек редактора
  const settingsUnsub = editorSettings.subscribe((settings) => {
    editorOptions = settings;
  });

  const behaviorUnsub = editorBehaviorStore.subscribe((state) => {
    autoSaveEnabled = state.autoSave;
    autoSaveDelay = state.autoSaveDelay;
    if (!state.autoSave) {
      clearAutoSaveTimer();
    } else if (pendingSave) {
      scheduleAutoSave();
    }
  });

  onDestroy(() => {
    unsub();
    settingsUnsub();
    behaviorUnsub();
    flushAutoSave();
    clearAutoSaveTimer();
  });

  /**
   * Получение строк и значения для активного файла.
   * Сейчас используем mocks; далее здесь будет интеграция с workspace/Tauri.
   */
  const getContent = async (fileId: string) => {
    const value = await fileService.readFile(fileId);
    return {
      lines: value.split(/\r?\n/),
      value
    };
  };

  function handleEditorContentChange(fileId: string, value: string) {
    editorStore.markDirty(fileId, true);
    pendingSave = { fileId, value };
    if (autoSaveEnabled) {
      scheduleAutoSave();
    } else {
      clearAutoSaveTimer();
    }
  }

  $effect(() => {
    if (current?.id !== previousEditorId) {
      previousEditorId = current?.id ?? null;
      flushAutoSave();
    }
  });
</script>

<div class="editor-area" style:background-color={backgroundColor}>
  {#if !current}
    <WelcomeScreen />
  {:else}
    {#key current.id}
      {#if current.id === 'settings'}
        <div class="settings-wrapper">
          <SettingsShell
            id="editor-settings-shell"
            compactMode={false}
          />
        </div>
      {:else}
        <!-- Локально вычисляем контент для активного файла. -->
        {#await Promise.resolve(getContent(current.id)) then content}
          <MonacoHost
            fileId={current.id}
            uri={`file://${current.path || current.id}`}
            value={content.value}
            language={current.language}
            options={{
              theme: editorOptions.theme,
              tabSize: editorOptions.tabSize,
              insertSpaces: editorOptions.insertSpaces,
              wordWrap: editorOptions.wordWrap,
              wordWrapColumn: editorOptions.wordWrapColumn,
              minimap: {
                enabled: editorOptions.minimap
              },
              folding: editorOptions.folding,
              bracketPairColorization: {
                enabled: editorOptions.bracketPairColorization
              },
              fontSize: editorOptions.fontSize,
              fontFamily: editorOptions.fontFamily,
              fontLigatures: editorOptions.fontLigatures,
              renderWhitespace: editorOptions.renderWhitespace,
              lineNumbers: editorOptions.lineNumbers
            }}
            on:change={(e) =>
              handleEditorContentChange(e.detail.fileId, e.detail.value)
            }
          />
        {/await}
      {/if}
    {/key}
  {/if}
</div>

<style>
  .editor-area {
    position: relative;
    flex: 1;
    display: flex;
    color: var(--nc-fg);
    overflow: hidden;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .settings-wrapper {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: var(--nc-tab-bg-active);
  }
</style>
