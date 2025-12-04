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
  import {
    editorStore,
    activeTabForGroup,
    tabEdgeVisibleForGroup,
    activeTabVisibleForGroup,
    tabsForGroup,
    type EditorTab
  } from "../stores/editorStore";
  import { fileService } from "../services/fileService";
  import MonacoHost from "../editor/MonacoHost.svelte";
  import type { EditorCoreOptions } from "../editor/EditorCore";
  import { editorSettings } from "../stores/editorSettingsStore";
  import SettingsShell from "$lib/settings/layout/SettingsShell.svelte";
  import WelcomeScreen from "./WelcomeScreen.svelte";
  import { editorBehaviorStore } from "../stores/editorBehaviorStore";
  import Breadcrumbs from "./Breadcrumbs.svelte";
  import ImagePreview from "./ImagePreview.svelte";
  import { validateFile } from "../utils/fileValidator";
  import type { EditorGroupId } from "../stores/layout/editorGroupsStore";

  // Расширения файлов изображений
  const IMAGE_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".ico",
    ".svg",
    ".tiff",
    ".tif",
    ".avif",
    ".heic",
    ".heif",
  ]);

  /**
   * Проверяет, является ли файл изображением по расширению
   */
  function isImageFile(path: string | undefined): boolean {
    if (!path) return false;
    const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0];
    return ext ? IMAGE_EXTENSIONS.has(ext) : false;
  }

  const { groupId } = $props<{ groupId: EditorGroupId }>();
  let current = $state<EditorTab | null>(null);
  let editorOptions = $state(editorSettings.getSettings());
  let backgroundColor = $state("var(--nc-level-1)");
  let warningMessage = $state<string | null>(null);
  let firstTabId = $state<string | null>(null);
  let isActiveTabAtRight = $state(false);
  let isActiveTabVisible = $state(false);

  let autoSaveMode = editorBehaviorStore.getAutoSaveMode();
  let autoSaveDelay = editorBehaviorStore.getAutoSaveDelay();
  let pendingSave: { fileId: string; value: string } | null = null;
  let pendingAutoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let previousEditorId: string | null = null;
  let focusOutListener: ((ev: FocusEvent) => void) | null = null;
  let windowBlurListener: ((ev: FocusEvent | FocusEventInit) => void) | null =
    null;

  const clearAutoSaveTimer = () => {
    if (pendingAutoSaveTimer) {
      clearTimeout(pendingAutoSaveTimer);
      pendingAutoSaveTimer = null;
    }
  };

  const flushAutoSave = async () => {
    if (autoSaveMode === "off" || !pendingSave) return;

    try {
      await editorStore.updateContent(pendingSave.fileId, pendingSave.value);
      pendingSave = null;
      clearAutoSaveTimer();
    } catch (error) {
      console.error("[auto-save] failed to persist", error);

      // Check if this is a recoverable error.
      // VS Code auto-save does not keep retrying on invalid arguments (e.g. missing Tauri payload).
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerMessage = errorMessage.toLowerCase();
      const isRecoverable =
        !lowerMessage.includes("permission denied") &&
        !lowerMessage.includes("disk full") &&
        !lowerMessage.includes("missing required key request") &&
        !lowerMessage.includes("invalid args") &&
        !lowerMessage.includes("not found");

      if (isRecoverable) {
        // Retry after a short delay for transient errors.
        console.warn("[auto-save] retrying save in 2 seconds");
        window.setTimeout(() => {
          if (pendingSave) {
            void flushAutoSave();
          }
        }, 2000);
      } else {
        // Permanent error: keep the tab dirty but stop retrying to avoid spammy saves.
        console.error("[auto-save] permanent error, leaving file dirty");
        pendingSave = null;
        clearAutoSaveTimer();
      }
    }
  };

  const scheduleAutoSave = () => {
    if (autoSaveMode !== "afterDelay" || !pendingSave) return;
    clearAutoSaveTimer();
    pendingAutoSaveTimer = window.setTimeout(() => {
      void flushAutoSave();
    }, autoSaveDelay);
  };

  const mergeEditorOptions = (
    base: EditorCoreOptions,
    optimizations?: Partial<EditorCoreOptions>,
  ): EditorCoreOptions => {
    if (!optimizations) return base;

    const merged: EditorCoreOptions = { ...base, ...optimizations };

    const baseMinimap =
      typeof base.minimap === "object"
        ? base.minimap
        : base.minimap !== undefined
          ? { enabled: Boolean(base.minimap) }
          : undefined;

    const optimizationMinimap =
      optimizations.minimap && typeof optimizations.minimap === "object"
        ? optimizations.minimap
        : optimizations.minimap !== undefined
          ? { enabled: Boolean((optimizations as any).minimap) }
          : undefined;

    if (baseMinimap || optimizationMinimap) {
      merged.minimap = {
        enabled: (optimizationMinimap ?? baseMinimap)?.enabled ?? true,
        ...(baseMinimap ?? {}),
        ...(optimizationMinimap ?? {}),
      };
    }

    return merged;
  };

  const activeTabUnsub = activeTabForGroup(groupId).subscribe(($active) => {
    current = $active;
    backgroundColor = $active ? "var(--nc-tab-bg-active)" : "var(--nc-level-1)";
  });

  const tabsUnsub = tabsForGroup(groupId).subscribe(($tabs) => {
    firstTabId = $tabs[0]?.id ?? null;
  });

  // Подписка на изменения настроек редактора
  const settingsUnsub = editorSettings.subscribe((settings) => {
    editorOptions = settings;
  });

  const behaviorUnsub = editorBehaviorStore.subscribe((state) => {
    autoSaveMode = state.autoSaveMode;
    autoSaveDelay = state.autoSaveDelay;
    if (state.autoSaveMode !== "afterDelay") {
      clearAutoSaveTimer();
    } else if (pendingSave) {
      scheduleAutoSave();
    }
  });

  // Подписка на видимость активного таба у правого края
  const rightEdgeUnsub = tabEdgeVisibleForGroup(groupId).subscribe((visible) => {
    isActiveTabAtRight = visible;
  });

  // Подписка на видимость активного таба в области просмотра
  const activeTabVisibleUnsub = activeTabVisibleForGroup(groupId).subscribe((visible) => {
    isActiveTabVisible = visible;
  });

  onDestroy(() => {
    activeTabUnsub();
    tabsUnsub();
    settingsUnsub();
    behaviorUnsub();
    rightEdgeUnsub();
    activeTabVisibleUnsub();
    flushAutoSave();
    clearAutoSaveTimer();
  });

  const isFirstTabActive = $derived(
    current !== null && firstTabId !== null && current.id === firstTabId,
  );

  /** Получение строк и значения для активного файла. */
  const getContent = async (fileId: string, filePath?: string) => {
    if (!filePath) {
      throw new Error("missing file path for editor");
    }

    try {
      const validation = await validateFile(filePath);
      warningMessage = validation.warning ?? null;

      if (!validation.canOpen) {
        return {
          lines: [],
          value: "",
          error: validation.warning ?? "Cannot open file",
        };
      }
      const value = await fileService.readFile(filePath);
      return {
        lines: value.split(/\r?\n/),
        value,
        error: null,
        warning: validation.warning ?? null,
        optimizations: validation.optimizations,
      };
    } catch (err) {
      console.warn("[editor] failed to load file", filePath, err);
      warningMessage = null;
      return {
        lines: [],
        value: "",
        error:
          (err instanceof Error ? err.message : String(err)) ||
          "Failed to load file",
      };
    }
  };

  type ContentResult =
    | {
        lines: string[];
        value: string;
        error: string | null;
        warning: string | null;
        optimizations?: Partial<EditorCoreOptions>;
      }
    | {
        lines: never[];
        value: string;
        error: string;
        warning?: string | null;
        optimizations?: Partial<EditorCoreOptions>;
      };

  let contentPromise = $state<Promise<ContentResult>>(Promise.resolve({
    lines: [],
    value: "",
    error: null,
    warning: null
  }));

  // Ключ последнего загруженного файла (id + path), чтобы не перезагружать
  // контент и не пересоздавать Monaco при каждом обновлении таба/isDirty.
  let lastLoadedContentKey = $state<{ fileId: string; path?: string } | null>(null);

  // Обновляем промис *только* при смене файла (id/path), а не при каждом
  // изменении полей EditorTab (isDirty, title и т.п.).
  $effect(() => {
    if (!current) {
      if (lastLoadedContentKey !== null) {
        lastLoadedContentKey = null;
      }
      return;
    }

    const nextKey = { fileId: current.id, path: current.path };

    if (
      lastLoadedContentKey &&
      lastLoadedContentKey.fileId === nextKey.fileId &&
      lastLoadedContentKey.path === nextKey.path
    ) {
      // Тот же файл (id/path не изменились) — не перечитываем его с диска
      // и не пересоздаём MonacoHost.
      return;
    }

    lastLoadedContentKey = nextKey;

    contentPromise = getContent(current.id, current.path);
  });

  function handleEditorContentChange(fileId: string, value: string) {
    editorStore.markDirty(fileId, true);
    pendingSave = { fileId, value };
    if (autoSaveMode === "afterDelay") {
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

  $effect(() => {
    // VS Code parity: save on focus change or window change depending on mode.
    if (typeof window === "undefined") return;

    if (focusOutListener) {
      window.removeEventListener("focusout", focusOutListener);
      focusOutListener = null;
    }
    if (windowBlurListener) {
      window.removeEventListener("blur", windowBlurListener as any);
      windowBlurListener = null;
    }

    if (autoSaveMode === "onFocusChange") {
      focusOutListener = () => {
        void flushAutoSave();
      };
      window.addEventListener("focusout", focusOutListener);
    } else if (autoSaveMode === "onWindowChange") {
      windowBlurListener = () => {
        void flushAutoSave();
      };
      window.addEventListener("blur", windowBlurListener as any);
    }
  });
</script>

<div
  class={`editor-area ${isActiveTabVisible ? "no-left-radius" : ""}`}
  style:background-color={backgroundColor}
>
  {#if !current}
    <WelcomeScreen />
  {:else if current.id === "settings"}
    <div class="settings-wrapper">
      <SettingsShell id="editor-settings-shell" compactMode={false} />
    </div>
  {:else if isImageFile(current.path)}
    <!-- Превью изображения -->
    <Breadcrumbs tab={current} />
    <ImagePreview path={current.path} title={current.title} />
  {:else}
    <Breadcrumbs tab={current} />
    <!-- Локально вычисляем контент для активного файла. -->
    {#await contentPromise then content}
      {#if content && content.error}
        <div class="editor-error">
          <h2>Cannot open file</h2>
          <p class="path">{current.path || current.id}</p>
          <p class="message">{content.error}</p>
          <p class="hint">
            The file may have been removed or renamed. Close this tab or re-open
            from Explorer.
          </p>
        </div>
      {:else}
        {#if warningMessage}
          <div class="editor-warning">
            <span>{warningMessage}</span>
            <button class="warning-close" onclick={() => (warningMessage = null)} aria-label="Dismiss warning">
              ×
            </button>
          </div>
        {/if}
        <MonacoHost
          fileId={current.id}
          uri={`file://${current.path || current.id}`}
          value={content?.value ?? ""}
          language={current.language}
          options={mergeEditorOptions(
            {
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
            },
            content?.optimizations,
          )}
          onchange={({ fileId, value }: { fileId: string; value: string }) =>
            handleEditorContentChange(fileId, value)}
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
    border-radius: 12px;
    border: 1px solid var(--nc-border);
  }

  .editor-area.no-left-radius {
    border-top-left-radius: 0;
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

  .editor-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    margin: 8px 0;
    border-radius: 8px;
    background: var(--nc-highlight-subtle);
    color: var(--nc-fg);
    border: 1px solid var(--nc-border-subtle);
  }

  .warning-close {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
  }

  .settings-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--nc-tab-bg-active);
  }
</style>
