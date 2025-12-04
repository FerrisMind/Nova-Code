<script lang="ts">
  // Svelte 5 style props via $props (use context7: официальная рекомендация)
  let { fileId, lines = [], language = 'txt' } = $props();

  const classify = (line: string): string => {
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      return 'comment';
    }
    if (/^(['"`]).*\1;?$/.test(trimmed) || trimmed.includes('"use client"')) {
      return 'string';
    }
    if (
      /\b(fn|function|const|let|var|export|import|class|interface|type|struct|impl|async|await|if|else|match|for|while|loop|return)\b/.test(
        trimmed
      )
    ) {
      return 'keyword';
    }
    if (/\b\d+(\.\d+)?\b/.test(trimmed)) {
      return 'number';
    }
    return 'plain';
  };
</script>

<div class={`code-editor lang-${language}`}>
  {#each lines as line, index (`${fileId}-${index}`)}
    <div class="code-line">
      <span class="gutter">{index + 1}</span>
      <span class={`token ${classify(line)}`}>{line}</span>
    </div>
  {/each}
</div>

<style>
  .code-editor {
    min-height: 100%;
  }

  .code-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    white-space: pre;
  }

  .gutter {
    width: 32px;
    text-align: right;
    padding-right: 6px;
    color: var(--nc-fg-muted);
    opacity: 0.5;
    font-size: 10px;
    user-select: none;
  }

  .token {
    font-size: 12px;
    color: var(--nc-fg);
  }

  .token.keyword {
    color: #60a5fa;
  }

  .token.string {
    color: #a7f3d0;
  }

  .token.comment {
    color: #6b7280;
    font-style: italic;
  }

  .token.number {
    color: #f97316;
  }

  .token.plain {
    color: var(--nc-fg);
  }
</style>
