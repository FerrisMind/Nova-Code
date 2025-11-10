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
  import { activeEditor } from '../stores/editorStore';
  import { getFileContentLines } from '../mocks/content.mock';
  import MonacoHost from '../editor/MonacoHost.svelte';
  import { editorSettings } from '../stores/editorSettingsStore';
  import SettingsShell from '$lib/settings/layout/SettingsShell.svelte';
  import WelcomeScreen from './WelcomeScreen.svelte';

  let current = $state(null as import('../stores/editorStore').EditorTab | null);
  let editorOptions = $state(editorSettings.getSettings());
  let backgroundColor = $state('var(--nc-level-1)');

  const unsub = activeEditor.subscribe(($active) => {
    current = $active;
    backgroundColor = $active ? 'var(--nc-tab-bg-active)' : 'var(--nc-level-1)';
  });

  // Подписка на изменения настроек редактора
  const settingsUnsub = editorSettings.subscribe((settings) => {
    editorOptions = settings;
  });

  onDestroy(() => {
    unsub();
    settingsUnsub();
  });

  /**
   * Получение строк и значения для активного файла.
   * Сейчас используем mocks; далее здесь будет интеграция с workspace/Tauri.
   */
  const getContent = (fileId: string) => {
    const lines = getFileContentLines(fileId);
    return {
      lines,
      value: lines.join('\n')
    };
  };
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
            on:change={(e) => {
              // Точка интеграции с editorStore/workspace/Tauri:
              // пример:
              // editorStore.updateContent(e.detail.fileId, e.detail.value);
            }}
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
  }

  .settings-wrapper {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: var(--nc-tab-bg-active);
  }
</style>
