<script lang="ts">
  // src/lib/components/status/Breadcrumbs.svelte
  // -----------------------------------------------------------------------------
  // Breadcrumbs navigation component - displays file path segments.
  // Shows relative path from workspace root with ChevronRight separators.
  // Hidden when no file is open.
  // -----------------------------------------------------------------------------

  import { activeEditor } from '$lib/stores/editorStore';
  import { workspaceStore } from '$lib/stores/workspaceStore';
  import Icon from '$lib/common/Icon.svelte';

  const activePath = $derived($activeEditor?.path || '');
  const workspaceFiles = $derived($workspaceStore?.files || []);

  // Get the actual workspace root by looking at the file tree
  const workspaceRoot = $derived(
    (() => {
      if (!workspaceFiles || workspaceFiles.length === 0) return null;

      // Get the path from the first file and extract the root
      // Files have absolute paths, we need to find the common root
      if (!activePath) return null;

      // For each file in workspace, find common ancestor
      // Simple approach: take first file's path and work backwards
      const firstFile = workspaceFiles[0];
      if (!firstFile || !firstFile.path) return null;

      const normalized = firstFile.path.replace(/\\/g, '/');
      const parts = normalized.split('/');

      // Find the folder that contains all workspace files
      // Usually it's the parent of the first part
      return parts.slice(0, -1).join('/');
    })()
  );

  // Calculate relative path from workspace root
  const relativePath = $derived(
    (() => {
      if (!activePath) return '';

      // Normalize path
      let normalized = activePath.replace(/\\/g, '/');

      // Remove any /. or /./ patterns
      normalized = normalized.replace(/\/\.\//g, '/').replace(/\/\.$/g, '');

      if (workspaceRoot) {
        const normalizedRoot = workspaceRoot.replace(/\\/g, '/');

        // Case-insensitive comparison for Windows
        if (normalized.toLowerCase().startsWith(normalizedRoot.toLowerCase() + '/')) {
          return normalized.slice(normalizedRoot.length + 1);
        } else if (normalized.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
          return normalized.slice(normalizedRoot.length).replace(/^\/+/, '');
        }
      }

      // Fallback: just return the normalized path
      return normalized;
    })()
  );

  // Split into segments - show full path from workspace root
  const pathSegments = $derived(
    relativePath ? relativePath.split('/').filter((s) => s && s !== '.' && s !== '..') : []
  );
</script>

{#if pathSegments.length > 0}
  <nav class="breadcrumbs" aria-label="File path">
    <div class="path-segments">
      {#each pathSegments as segment, index (pathSegments.slice(0, index + 1).join('/'))}
        <span class="segment">
          <button class="segment-btn" title={pathSegments.slice(0, index + 1).join('/')}>
            {segment}
          </button>
          {#if index < pathSegments.length - 1}
            <span class="separator">
              <Icon name="lucide:chevron-right" size={14} />
            </span>
          {/if}
        </span>
      {/each}
    </div>
  </nav>
{/if}

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--nc-tab-bg-active);
    border: none;
    font-size: 12px;
    color: var(--nc-fg-muted);
    overflow-x: auto;
    white-space: nowrap;
    height: 24px; /* 6 * 4px grid */
  }

  .path-segments {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .segment {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .segment-btn {
    background: transparent;
    border: none;
    color: var(--nc-fg-muted);
    padding: 0 4px;
    cursor: pointer;
    font-size: 12px;
    transition: color 0.1s;
  }

  .segment-btn:hover {
    color: var(--nc-fg);
  }

  .separator {
    display: flex;
    align-items: center;
    color: var(--nc-fg-muted);
    opacity: 0.6;
  }

  /* Scrollbar styling */
  .breadcrumbs::-webkit-scrollbar {
    height: 4px;
  }

  .breadcrumbs::-webkit-scrollbar-thumb {
    background: var(--nc-highlight-subtle);
    border-radius: 2px;
  }

  .breadcrumbs::-webkit-scrollbar-track {
    background: transparent;
  }
</style>
