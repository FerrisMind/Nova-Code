<script lang="ts">
  let { lines = [] }: { lines?: string[] } = $props();
</script>

<div class="minimap">
  {#each lines as line, i}
    <div class="mini-line" style={`opacity:${0.25 + Math.min(line.length / 80, 0.55)}`}>
      &nbsp;
    </div>
  {/each}
</div>

<style>
  .minimap {
    width: 64px;
    background: radial-gradient(circle at top, var(--nc-accent-soft), transparent),
      var(--nc-bg);
    border-left: 1px solid var(--nc-border-subtle);
    box-sizing: border-box;
    padding: 4px 2px;
    overflow: hidden;
  }

  .mini-line {
    height: 2px;
    margin-bottom: 1px;
    border-radius: 999px;
    background-color: var(--nc-highlight);
  }
</style>
