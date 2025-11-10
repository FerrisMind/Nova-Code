<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeEditor } from '../stores/editorStore';
  import { bottomPanelStore } from '../stores/bottomPanelStore';
  import Icon from '../common/Icon.svelte';
  import { cursorPosition } from '../stores/editorCursorStore';
  import { diagnosticsCount } from '../stores/diagnosticsStore';
  import { activeEditorMeta } from '../stores/editorMetaStore';

  // Текущее состояние из editorStore (имя/путь файла).
  let current = null as import('../stores/editorStore').EditorTab | null;

  // Состояние нижней панели.
  let bottomVisible = true;

  // Состояние курсора.
  let cursorLn = 1;
  let cursorCol = 1;

  // Мета-информация активного файла.
  let languageId: string | null = null;
  let eol: 'LF' | 'CRLF' | null = null;
  let tabSize: number | null = null;
  let insertSpaces: boolean | null = null;

  // Диагностика по активному файлу.
  let diagErrors = 0;
  let diagWarnings = 0;

  // Подписки на сторы. Используем ручное управление без onMount,
  // чтобы сохранить минималистичный и предсказуемый подход.
  const unsubEditor = activeEditor.subscribe(($active) => {
    current = $active;
  });

  const unsubBottom = bottomPanelStore.subscribe(($s) => {
    bottomVisible = $s.visible;
  });

  const unsubCursor = cursorPosition.subscribe(($cursor) => {
    cursorLn = $cursor.line;
    cursorCol = $cursor.column;
  });

  const unsubMeta = activeEditorMeta.subscribe(($meta) => {
    languageId = $meta.languageId;
    eol = $meta.eol;
    tabSize = $meta.tabSize;
    insertSpaces = $meta.insertSpaces;
  });

  const unsubDiag = diagnosticsCount.subscribe(($d) => {
    diagErrors = $d.errors;
    diagWarnings = $d.warnings;
  });

  onDestroy(() => {
    unsubEditor();
    unsubBottom();
    unsubCursor();
    unsubMeta();
    unsubDiag();
  });

  const toggleBottom = () => bottomPanelStore.toggle();

  const projectLabel = 'SvelteKit + Tauri v2';
  const branch = 'main';

  // Отображаемое имя языка для статус-бара (минимальный mapping).
  const mapLanguageIdToLabel = (id: string | null): string => {
    if (!id) return '';
    const normalized = id.toLowerCase();
    if (normalized === 'typescript' || normalized === 'ts') return 'TS';
    if (normalized === 'javascript' || normalized === 'js') return 'JS';
    if (normalized === 'json') return 'JSON';
    if (normalized === 'html') return 'HTML';
    if (normalized === 'css') return 'CSS';
    if (normalized === 'svelte') return 'Svelte';
    if (normalized === 'markdown' || normalized === 'md') return 'MD';
    if (normalized === 'rust' || normalized === 'rs') return 'Rust';
    return id;
  };

  $: languageLabel = mapLanguageIdToLabel(languageId);
  $: eolLabel = eol ?? '';
  $: indentLabel =
    tabSize == null
      ? ''
      : insertSpaces
      ? `Spaces: ${tabSize}`
      : `Tab Size: ${tabSize}`;
</script>

<div class="status-bar">
  <div class="left">
    <div class="item">
      <Icon name="lucide:GitBranch" size={14} />
      <span>{branch}</span>
    </div>
    <div class="item file">
      {#if current}
        {current.path}
      {:else}
        No file selected
      {/if}
    </div>
  </div>

  <div class="center">
    <!-- Зарезервировано под будущие интеграции (например, статус Git, задачи). -->
  </div>

  <div class="right">
    <button class="item icon-btn" on:click={toggleBottom} title="Toggle Panel">
      <Icon name="terminal" size={14} />
      <span>{bottomVisible ? 'Panel: On' : 'Panel: Off'}</span>
    </button>

    <!-- Диагностика: реальные значения из diagnosticsStore -->
    <div class="item diagnostics">
      <span class:muted={diagErrors === 0}>
        <Icon name="lucide:CircleX" size={12} />
        {diagErrors}
      </span>
      <span class:muted={diagWarnings === 0}>
        <Icon name="lucide:AlertTriangle" size={12} />
        {diagWarnings}
      </span>
    </div>

    <!-- Позиция курсора: реальные данные из editorCursorStore -->
    <div class="item">
      Ln {cursorLn}, Col {cursorCol}
    </div>

    <!-- Язык: из activeEditorMeta; элемент кликабелен "на будущее" -->
    <button class="item meta-btn" type="button" title="Change Language (planned)">
      {#if languageLabel}
        {languageLabel}
      {:else}
        Plain Text
      {/if}
    </button>

    <!-- EOL: из activeEditorMeta -->
    <div class="item">
      {#if eolLabel}
        {eolLabel}
      {:else}
        LF
      {/if}
    </div>

    <!-- Индентация: Spaces/Tab Size -->
    <div class="item">
      {#if indentLabel}
        {indentLabel}
      {:else}
        Spaces: 2
      {/if}
    </div>

    <!-- Кодировка: пока константа, но как отдельный блок для расширяемости -->
    <div class="item">UTF-8</div>
  </div>
</div>

<style>
  .status-bar {
    height: 24px;                         /* 6 * 4px */
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;                      /* 3 * 4px */
    background-color: var(--nc-bg);
    color: var(--nc-fg-muted);
    font-size: 12px;                      /* 3 * 4px */
    border-top: 1px solid var(--nc-border-subtle);
    box-sizing: border-box;
  }

  .left,
  .center,
  .right {
    display: flex;
    align-items: center;
    gap: 12px;                            /* 3 * 4px */
  }

  .center {
    justify-content: center;
    flex: 1;
  }

  .right {
    margin-left: auto;
  }

  .item {
    padding: 0 8px;                       /* 2 * 4px */
    display: inline-flex;
    align-items: center;
    gap: 4px;                             /* 1 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
    white-space: nowrap;
  }

  .file {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .icon-btn,
  .meta-btn {
    cursor: pointer;
    border: none;
    background: transparent;
    color: inherit;
    padding: 0 8px;                       /* 2 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
  }

  .diagnostics {
    display: inline-flex;
    gap: 6px;
  }

  .diagnostics span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .diagnostics span.muted {
    opacity: 0.6;
  }

  .icon-btn:hover,
  .meta-btn:hover,
  .item:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }
</style>
