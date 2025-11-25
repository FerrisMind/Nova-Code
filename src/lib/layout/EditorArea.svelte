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

  import { onDestroy } from "svelte";
  import { activeEditor, editorStore } from "../stores/editorStore";
  import { fileService } from "../services/fileService";
  import MonacoHost from "../editor/MonacoHost.svelte";
  import { editorSettings } from "../stores/editorSettingsStore";
  import SettingsShell from "$lib/settings/layout/SettingsShell.svelte";
  import WelcomeScreen from "./WelcomeScreen.svelte";
  import { editorBehaviorStore } from "../stores/editorBehaviorStore";
  import Breadcrumbs from "./Breadcrumbs.svelte";

  let current = $state(
    null as import("../stores/editorStore").EditorTab | null,
  );
  let editorOptions = $state(editorSettings.getSettings());
  let backgroundColor = $state("var(--nc-level-1)");

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
      pendingSave = null;
      clearAutoSaveTimer();
    } catch (error) {
      console.error("[auto-save] failed to persist", error);

      // Check if this is a recoverable error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRecoverable = !errorMessage.includes('not found') &&
                           !errorMessage.includes('permission denied') &&
                           !errorMessage.includes('disk full');

      if (isRecoverable) {
        // Retry after a short delay for transient errors
        console.warn("[auto-save] retrying save in 2 seconds");
        window.setTimeout(() => {
          if (pendingSave) {
            void flushAutoSave();
          }
        }, 2000);
      } else {
        // For permanent errors, clear the pending save and mark as not dirty
        console.error("[auto-save] permanent error, clearing pending save");
        if (pendingSave) {
          editorStore.markDirty(pendingSave.fileId, false);
          pendingSave = null;
        }
        clearAutoSaveTimer();
      }
    }
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
    backgroundColor = $active ? "var(--nc-tab-bg-active)" : "var(--nc-level-1)";
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
  const getContent = async (fileId: string, filePath?: string) => {
    if (!filePath) {
      throw new Error("missing file path for editor");
    }

    try {
      const value = await fileService.readFile(filePath);
      return {
        lines: value.split(/\r?\n/),
        value,
        error: null,
      };
    } catch (err) {
      console.warn("[editor] failed to load file", filePath, err);
      return {
        lines: [],
        value: "",
        error:
          (err instanceof Error ? err.message : String(err)) ||
          "Failed to load file",
      };
    }
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
  {:else if current.id === "settings"}
    <div class="settings-wrapper">
      <SettingsShell id="editor-settings-shell" compactMode={false} />
    </div>
  {:else}
    <Breadcrumbs />
    <!-- Локально вычисляем контент для активного файла. -->
    {#await Promise.resolve(getContent(current.id, current.path)) then content}
      {#if content?.error}
        <div class="editor-error">
          <h2>Cannot open file</h2>
          <p class="path">{current.path || current.id}</p>
          <p class="message">{content.error}</p>
          <p class="hint">
            The file may have been removed or renamed. Close this tab or
            re-open from Explorer.
          </p>
        </div>
      {:else}
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
              enabled: editorOptions.minimap,
            },
            folding: editorOptions.folding,
            bracketPairColorization: {
              enabled: editorOptions.bracketPairColorization,
            },
            fontSize: editorOptions.fontSize,
            fontFamily: editorOptions.fontFamily,
            fontLigatures: editorOptions.fontLigatures,
            renderWhitespace: editorOptions.renderWhitespace,
            lineNumbers: editorOptions.lineNumbers,
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingOvertype: "always",
          }}
          on:change={(e) =>
            handleEditorContentChange(e.detail.fileId, e.detail.value)}
        />
      {/if}
    {/await}
  {/if}
</div>

<style>
  .editor-area {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    color: var(--nc-fg);
    overflow: hidden;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .editor-error {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: var(--nc-fg-muted);
  }

  .editor-error h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--nc-fg);
  }

  .editor-error .path {
    font-family: monospace;
    opacity: 0.85;
  }

  .editor-error .message {
    color: var(--nc-accent);
    font-size: 13px;
  }

  .editor-error .hint {
    font-size: 12px;
    opacity: 0.7;
  }

  .settings-wrapper {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: var(--nc-tab-bg-active);
  }
</style>
