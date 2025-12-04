<svelte:options runes={true} />
<script lang="ts">
  // src/lib/editor/MonacoHost.svelte
  // -------------------------------------------------------------------------
  // Низкоуровневый host-компонент для Monaco Editor.
  // Обязанности:
  // - монтирование/демонтаж IStandaloneCodeEditor в контейнер;
  // - передача props в EditorCore (модели, опции, команды);
  // - реакция на смену активной модели;
  // - проброс реальных change-событий наружу.
  //
  // Без:
  // - знания о Tauri / файловой системе;
  // - лишних абстракций поверх уже существующей архитектуры.
  //
  // Готов к расширению: diff-режим, IntelliSense, кастомные языки.

  import { onMount, onDestroy } from "svelte";
  import {
    createEditorCore,
    type EditorCoreOptions,
    type EditorCoreApi,
  } from "./EditorCore";
  import {
    setupBasicLanguageSupport,
    setupDefaultProviders,
  } from "./intellisense";
  import "./monacoEnvironment";
  import { getMonacoThemeId, themeManager } from "./themeManager";
  import { theme, type ThemeState } from "../stores/themeStore";
  import { initCursorTracking } from "../stores/editorCursorStore";
  import { initEditorMeta } from "../stores/editorMetaStore";
  import { attachDiagnosticsTracking, detachDiagnosticsTracking } from "./diagnosticsAdapter";
  import { ensureLanguageRegistered } from "./languageSupport";
  import { silenceMonacoCancellationErrors } from "./monacoUnhandledRejection";
  import InlineSearch from "$lib/components/search/InlineSearch.svelte";

  // Входные параметры.
  let {
    fileId,
    uri,
    value,
    language,
    options,
    onchange,
  }: {
    fileId: string;
    uri: string;
    value: string;
    language: string;
    options?: EditorCoreOptions;
    onchange?: (detail: { fileId: string; value: string }) => void;
  } = $props();

  let containerElement: HTMLDivElement;
  let core: EditorCoreApi | null = null;
  let monacoEditor = $state<any>(null); // Monaco editor instance for InlineSearch
  let monacoInstance: typeof import("monaco-editor") | null = null;

  // Текущая тема
  let currentTheme: ThemeState = { mode: "dark", palette: "dark-default" };

  /**
   * Инициализация Monaco + EditorCore.
   * Используем динамический импорт ESM API Monaco.
   */
  onMount(() => {
    let isDisposed = false;
    let unsubscribe: (() => void) | null = null;
    let themeUnsubscribe: (() => void) | null = null;

    (async () => {
      // Runtime import Monaco ESM API on demand.
      const monaco = await import("monaco-editor");
      monacoInstance = monaco as any;
      if (isDisposed) return;

      // Match VS Code: ignore cancellation rejections fired during dispose.
      silenceMonacoCancellationErrors();

      // Boot basic languages/providers before creating the editor core.
      setupBasicLanguageSupport(monaco as any);
      setupDefaultProviders(monaco as any);

      if (!themeManager.isInitialized()) {
        themeManager.initialize(monaco as any);

        // ����㦠�� ������� ⥬� � 䮭� (�� ������㥬 ���樠������)
        themeManager
          .loadPopularThemes()
          .catch((err) => console.error("Failed to load themes:", err));

        // ������� � ॣ�����㥬 ⥬� ��� ��� ������
        const palettes = [
          "light-default",
          "light-alt-1",
          "light-alt-2",
          "light-alt-3",
          "dark-default",
          "dark-alt-1",
          "dark-alt-2",
          "dark-alt-3",
        ] as const;
        palettes.forEach((paletteId) => {
          const themeData = themeManager.createThemeFromPalette(paletteId);
          const themeId = `nova-${paletteId}`;
          monaco.editor.defineTheme(themeId, {
            base: themeData.base,
            inherit: themeData.inherit,
            rules: themeData.rules,
            colors: themeData.colors,
          });
        });
      }

core = createEditorCore(monaco as any);
      core.attachTo(containerElement, options);

      // Get the Monaco editor instance for InlineSearch
      monacoEditor = (core as any).editor || (core as any).state?.editor;

      const monacoLanguage = await ensureLanguageRegistered(
        monaco as any,
        language,
      );

      core.setModel({
        fileId,
        uri,
        value,
        language: monacoLanguage,
      });

      initCursorTracking(core);
      initEditorMeta(core);
      attachDiagnosticsTracking(monaco as any, core);

      // Применяем начальную тему
      const initialTheme = theme.getState();
      currentTheme = initialTheme;
      const initialThemeId = getMonacoThemeId(initialTheme, options?.theme);
      themeManager.applyTheme(initialThemeId);

      // Подписка на изменения активной модели и проброс наружу как Svelte-события.
      unsubscribe = core.onDidChangeContent((changedFileId, changedValue) => {
        // Хост отвечает за один fileId; фильтруем для надёжности.
        if (changedFileId === fileId) {
          onchange?.({ fileId: changedFileId, value: changedValue });
        }
      });

      // Подписка на изменения темы
      themeUnsubscribe = theme.subscribe((newTheme) => {
        currentTheme = newTheme;
        const targetThemeId = getMonacoThemeId(newTheme, options?.theme);
        themeManager.applyTheme(targetThemeId);
      });

      // Гарантируем снятие подписки при размонтировании.
    })();

    return () => {
      isDisposed = true;
      if (unsubscribe) {
        unsubscribe();
      }
      if (themeUnsubscribe) {
        themeUnsubscribe();
      }
    };
  });

  onDestroy(() => {
    if (core) {
      core.dispose();
      core = null;
    }
    detachDiagnosticsTracking();
  });

  /**
   * Реакция на смену активного файла/контента.
   * В Svelte 5 runes-режиме используем $effect.
   */
  $effect(() => {
    if (!core) return;
    if (!fileId || !uri || typeof value !== "string") return;

    void (async () => {
      if (!monacoInstance) return;
      const monacoLanguage = await ensureLanguageRegistered(
        monacoInstance as any,
        language,
      );

      core?.setModel({
        fileId,
        uri,
        value,
        language: monacoLanguage,
      });
    })();
  });

  $effect(() => {
    if (!core || !options) return;
    core.configure(options);
  });

  $effect(() => {
    if (!core || !themeManager.isInitialized()) return;
    const monacoThemeId = getMonacoThemeId(currentTheme, options?.theme);
    themeManager.applyTheme(monacoThemeId);
  });

  /**
   * Публичный метод для выполнения команд (undo, redo, format и т.п.).
   * Может вызываться через bind:this снаружи.
   */
  export function triggerCommand(
    source: string,
    commandId: string,
    payload?: unknown,
  ) {
    core?.triggerCommand(source, commandId, payload);
  }
</script>

<!--
  Контейнер под Monaco Editor.
  Layout управляет размерами/скроллом; здесь только 100% растяжение.
-->
<div class="monaco-host-wrapper">
  <div bind:this={containerElement} class="monaco-host"></div>
  <InlineSearch editor={monacoEditor} />
</div>

<style>
  .monaco-host-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .monaco-host {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }
</style>

