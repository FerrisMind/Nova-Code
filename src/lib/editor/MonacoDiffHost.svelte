<script lang="ts">
  // src/lib/editor/MonacoDiffHost.svelte
  // -----------------------------------------------------------------------------
  // Host-компонент для diff editor на базе EditorCore.
  // Обязанности:
  // - создать и смонтировать IStandaloneDiffEditor через EditorCore.createDiffSession;
  // - переиспользовать существующие модели по fileId (никакого дублирования);
  // - не управлять жизненным циклом моделей (только diffEditor);
  // - реагировать на обновление опций.
  //
  // Компонент не знает о Tauri/хранилищах; он опирается только на EditorCore.

  import { onMount, onDestroy } from 'svelte';
  import {
    createEditorCore,
    type EditorCoreOptions,
    type EditorModelDescriptor,
    type EditorCoreApi
  } from './EditorCore';
  import {
    setupBasicLanguageSupport,
    setupDefaultProviders
  } from './intellisense';
  import './monacoEnvironment';
  import { ensureLanguageRegistered } from './languageSupport';
  import { silenceMonacoCancellationErrors } from './monacoUnhandledRejection';

  type DiffOptions = {
    readOnlyLeft?: boolean;
    renderSideBySide?: boolean;
    ignoreTrimWhitespace?: boolean;
  };

  let {
    original,
    modified,
    options
  }: {
    original: EditorModelDescriptor;
    modified: EditorModelDescriptor;
    options?: EditorCoreOptions & DiffOptions;
  } = $props();

  let containerElement: HTMLDivElement;
  let core: EditorCoreApi | null = null;
  let diffSession: ReturnType<EditorCoreApi['createDiffSession']> | null = null;

  onMount(() => {
    let isDisposed = false;

    (async () => {
      const monaco = await import('monaco-editor');
      if (isDisposed) return;

      // Match VS Code: ignore cancellation rejections fired during dispose.
      silenceMonacoCancellationErrors();

      // Boot basic languages/providers before creating the editor core.
      setupBasicLanguageSupport(monaco as any);
      setupDefaultProviders(monaco as any);

      core = createEditorCore(monaco as any);

      // Создаём/реиспользуем модели в рамках core.
      const originalLanguage = await ensureLanguageRegistered(
        monaco as any,
        original.language
      );
      const modifiedLanguage = await ensureLanguageRegistered(
        monaco as any,
        modified.language
      );

      core.setModel({ ...original, language: originalLanguage });
      core.setModel({ ...modified, language: modifiedLanguage });

      diffSession = core.createDiffSession({
        originalFileId: original.fileId,
        modifiedFileId: modified.fileId,
        options: {
          renderSideBySide: options?.renderSideBySide,
          readOnlyLeft: options?.readOnlyLeft,
          ignoreTrimWhitespace: options?.ignoreTrimWhitespace
        }
      });

      diffSession.mount(containerElement);
    })();

    return () => {
      isDisposed = true;
    };
  });

  onDestroy(() => {
    if (diffSession) {
      diffSession.dispose();
      diffSession = null as ReturnType<EditorCoreApi['createDiffSession']> | null;
    }
    if (core) {
      core.dispose();
      core = null;
    }
  });

  // Реакция на обновление опций diff/EditorCore.
  $effect(() => {
    if (!diffSession || !options) return;
    diffSession.updateOptions({
      renderSideBySide: options.renderSideBySide,
      readOnlyLeft: options.readOnlyLeft,
      ignoreTrimWhitespace: options.ignoreTrimWhitespace
    });
  });
</script>

<div bind:this={containerElement} class="monaco-diff-host"></div>

<style>
  .monaco-diff-host {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }
</style>



