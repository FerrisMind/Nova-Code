<script lang="ts">
  const extensions = [
    {
      name: 'Nova Theme',
      desc: 'Cursor-inspired dark theme for Nova Code.',
      enabled: true
    },
    {
      name: 'Svelte Essentials',
      desc: 'Syntax + snippets for Svelte & SvelteKit.',
      enabled: true
    },
    {
      name: 'Tauri Tools',
      desc: 'Tauri v2 commands & snippets (mock).',
      enabled: false
    }
  ];
</script>

<div class="ext-root">
  <div class="header">
    <div class="title">EXTENSIONS</div>
  </div>

  <div class="list">
    {#each extensions as ext}
      <div class="ext-card">
        <div class="name-row">
          <div class="name">{ext.name}</div>
          <div class="pill {ext.enabled ? 'on' : 'off'}">
            {ext.enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <div class="desc">{ext.desc}</div>
        <div class="actions">
          <button class="btn">Details</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .ext-root {
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

  .list {
    flex: 1;
    padding: 8px 12px;                    /* 2 * 4px, 3 * 4px */
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;                             /* 2 * 4px */
  }

  .ext-card {
    padding: 12px;                        /* 3 * 4px */
    border-radius: 8px;                   /* 2 * 4px */
    background-color: var(--nc-bg-elevated);
    border: 1px solid var(--nc-border-subtle);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .name-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;                             /* 2 * 4px */
    margin-bottom: 4px;                   /* 1 * 4px */
  }

  .name {
    font-size: 12px;                      /* 3 * 4px */
    color: var(--nc-fg);
    font-weight: 500;
  }

  .pill {
    padding: 2px 8px;                     /* 0.5 * 4px, 2 * 4px */
    border-radius: 12px;                  /* 3 * 4px */
    font-size: 10px;                      /* 2.5 * 4px ~ округлено */
  }

  .pill.on {
    background-color: rgba(22, 163, 74, 0.18);
    color: #22c55e;
  }

  .pill.off {
    background-color: var(--nc-highlight-subtle);
    color: var(--nc-fg-muted);
  }

  .desc {
    margin-top: 4px;                      /* 1 * 4px */
    font-size: 11px;                      /* 2.75 * 4px ~ округлено */
    color: var(--nc-fg-muted);
    line-height: 1.4;
  }

  .actions {
    margin-top: 8px;                      /* 2 * 4px */
    display: flex;
    gap: 4px;                             /* 1 * 4px */
  }

  .btn {
    padding: 4px 12px;                    /* 1 * 4px, 3 * 4px */
    border-radius: 4px;                   /* 1 * 4px */
    border: none;
    font-size: 11px;                      /* 2.75 * 4px ~ округлено */
    cursor: pointer;
    background-color: var(--nc-highlight-subtle);
    color: var(--nc-fg);
  }

  .btn:hover {
    background-color: var(--nc-tab-bg-active);
  }

  .list::-webkit-scrollbar {
    width: 6px;
  }

  .list::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle);
  }
</style>
