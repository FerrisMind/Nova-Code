<script lang="ts">
  import Icon from '../common/Icon.svelte';

  let query = '';
  const mockResults = [
    {
      file: 'src/routes/+layout.svelte',
      line: 5,
      preview: 'export const ssr = false;'
    },
    {
      file: 'src/lib/layout/Titlebar.svelte',
      line: 10,
      preview: 'const handleMinimize = async () => {'
    }
  ];
</script>

<div class="search-root">
  <div class="header">
    <div class="title">SEARCH</div>
  </div>
  <div class="controls">
    <div class="input-wrap">
      <Icon name="search" size={14} />
      <input
        placeholder="Search (mock, static)"
        bind:value={query}
      />
    </div>
  </div>

  <div class="results">
    {#if !query}
      <div class="hint">Type to filter mock results.</div>
    {:else}
      {#each mockResults.filter((r) => r.file.toLowerCase().includes(query.toLowerCase())) as r}
        <div class="result-row">
          <div class="file">{r.file}:{r.line}</div>
          <div class="preview">{r.preview}</div>
        </div>
      {:else}
        <div class="hint">No mock matches.</div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .search-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--nc-fg-muted);
    font-size: 12px;                      /* 3 * 4px */
  }

  .header {
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    border-bottom: 1px solid var(--nc-border-subtle);
  }

  .title {
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
    letter-spacing: 0.12em;
    color: var(--nc-fg-muted);
    font-weight: 600;
  }

  .controls {
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    border-bottom: 1px solid var(--nc-border-subtle);
  }

  .input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;                             /* 2 * 4px */
    padding: 6px 8px;                     /* 1.5 * 4px, 2 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
    background-color: var(--nc-tab-bg-active);
    border: 1px solid var(--nc-border-subtle);
  }

  .input-wrap input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--nc-fg);
    font-size: 12px;                      /* 3 * 4px */
  }

  .results {
    flex: 1;
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    overflow-y: auto;
  }

  .hint {
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg-muted);
  }

  .result-row {
    padding: 6px 8px;                     /* 1.5 * 4px, 2 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
    margin-bottom: 4px;                   /* 1 * 4px */
    cursor: default;
  }

  .result-row:hover {
    background-color: var(--nc-tab-bg-active);
  }

  .file {
    color: var(--nc-accent);
    font-size: 11px;                      /* 2.75 * 4px ~ округлено */
    margin-bottom: 4px;                   /* 1 * 4px */
  }

  .preview {
    font-size: 11px;                      /* 2.75 * 4px ~ округлено */
    color: var(--nc-fg-muted);
    font-family: ui-monospace, 'Courier New', monospace;
  }

  .results::-webkit-scrollbar {
    width: 8px;                           /* 2 * 4px */
  }

  .results::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
    border-radius: 4px;                   /* 1 * 4px */
  }
</style>
