<script lang="ts">
  const changes = [
    { file: 'src/routes/+layout.svelte', status: 'M' },
    { file: 'src/lib/layout/Titlebar.svelte', status: 'A' },
    { file: 'src/lib/layout/ActivityBar.svelte', status: 'A' }
  ];
</script>

<div class="git-root">
  <div class="header">
    <div class="title">SOURCE CONTROL</div>
    <div class="summary">● 1 | +2</div>
  </div>
  <div class="section-label">CHANGES</div>
  <div class="changes">
    {#each changes as c}
      <div class="row">
        <span class="badge {c.status === 'M' ? 'mod' : 'add'}">{c.status}</span>
        <span class="file">{c.file}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .git-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--nc-fg-muted);
    font-size: 12px;                      /* 3 * 4px */
  }

  .header {
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    border-bottom: 1px solid var(--nc-border-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title {
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
    letter-spacing: 0.12em;
    color: var(--nc-fg-muted);
    font-weight: 600;
  }

  .summary {
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
    color: var(--nc-accent);
  }

  .section-label {
    padding: 8px 12px 4px;                /* 2 * 4px, 3 * 4px, 1 * 4px */
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
    color: var(--nc-fg-muted);
    font-weight: 500;
  }

  .changes {
    flex: 1;
    padding: 4px 8px;                     /* 1 * 4px, 2 * 4px */
    overflow-y: auto;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;                             /* 2 * 4px */
    padding: 6px 8px;                     /* 1.5 * 4px, 2 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
  }

  .row:hover {
    background-color: var(--nc-tab-bg-active);
  }

  .badge {
    width: 16px;                          /* 4 * 4px */
    height: 16px;                         /* 4 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--nc-bg);
    font-weight: 600;
  }

  .badge.mod {
    background-color: #fde047;
  }

  .badge.add {
    background-color: #22c55e;
  }

  .file {
    color: var(--nc-fg);
    font-size: 12px;                      /* 3 * 4px */
  }

  .changes::-webkit-scrollbar {
    width: 6px;
  }

  .changes::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
  }
</style>
