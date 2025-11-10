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

  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import {
    createEditorCore,
    type EditorCoreOptions,
    type EditorCoreApi
  } from './EditorCore';
  import {
    setupBasicLanguageSupport,
    setupDefaultProviders
  } from './intellisense';
  import './monacoEnvironment';
  import { themeManager } from './themeManager';

  // Входные параметры.
  let {
    fileId,
    uri,
    value,
    language,
    options
  }: {
    fileId: string;
    uri: string;
    value: string;
    language: string;
    options?: EditorCoreOptions;
  } = $props();

  const dispatch = createEventDispatcher<{
    change: { fileId: string; value: string };
  }>();

  let containerElement: HTMLDivElement;
  let core: EditorCoreApi | null = null;

  /**
   * Инициализация Monaco + EditorCore.
   * Используем динамический импорт ESM API Monaco.
   */
  onMount(() => {
    let isDisposed = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      // Динамический импорт полного Monaco API.
      // Типы берём из 'monaco-editor', реализация подхватывается bundler'ом.
      const monaco = await import('monaco-editor');
      if (isDisposed) return;

      // Базовая конфигурация языков и легкие IntelliSense-провайдеры.
      setupBasicLanguageSupport(monaco as any);
      setupDefaultProviders(monaco as any);

      // Инициализация менеджера тем
      themeManager.initialize(monaco as any);

      core = createEditorCore(monaco as any);
      core.attachTo(containerElement, options);

      core.setModel({
        fileId,
        uri,
        value,
        language
      });

      // Подписка на изменения активной модели и проброс наружу как Svelte-события.
      unsubscribe = core.onDidChangeContent((changedFileId, changedValue) => {
        // Хост отвечает за один fileId; фильтруем для надёжности.
        if (changedFileId === fileId) {
          dispatch('change', { fileId: changedFileId, value: changedValue });
        }
      });

      // Гарантируем снятие подписки при размонтировании.
    })();

    return () => {
      isDisposed = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  });

  onDestroy(() => {
    if (core) {
      core.dispose();
      core = null;
    }
  });

  /**
   * Реакция на смену активного файла/контента.
   * В Svelte 5 runes-режиме используем $effect.
   */
  $effect(() => {
    if (!core) return;
    if (!fileId || !uri || typeof value !== 'string') return;

    core.setModel({
      fileId,
      uri,
      value,
      language
    });
  });

  $effect(() => {
    if (!core || !options) return;
    core.configure(options);
  });

  /**
   * Публичный метод для выполнения команд (undo, redo, format и т.п.).
   * Может вызываться через bind:this снаружи.
   */
  export function triggerCommand(
    source: string,
    commandId: string,
    payload?: unknown
  ) {
    core?.triggerCommand(source, commandId, payload);
  }
</script>

<!--
  Контейнер под Monaco Editor.
  Layout управляет размерами/скроллом; здесь только 100% растяжение.
-->
<div bind:this={containerElement} class="monaco-host"></div>

<style>
  .monaco-host {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }
</style>