<script lang="ts">
  import { get } from "svelte/store";
  import { onDestroy } from "svelte";
  // Tauri v2: dialog API lives in plugin package
  import { open } from "@tauri-apps/plugin-dialog";
  import FileTree from "./FileTree.svelte";
  import { activeEditor, editorStore } from "../stores/editorStore";
  import { syncWithActiveTab } from "../stores/fileTreeStore";
  import { workspaceStore } from "../stores/workspaceStore";
  import { fileService } from "../services/fileService";

  const unsubscribeActive = activeEditor.subscribe((editor) => {
    syncWithActiveTab(editor?.id ?? null);
  });

  const unsubscribeWorkspace = workspaceStore.subscribe((ws) => {
    if (!ws.loading && ws.files.length > 0) {
      const editor = get(activeEditor);
      if (editor) {
        syncWithActiveTab(editor.id);
      }
    }
  });

  onDestroy(() => {
    unsubscribeActive();
    unsubscribeWorkspace();
  });

  const joinWorkspacePath = (root: string, fileName: string): string => {
    const cleaned = root.replace(/\\/g, "/").replace(/\/+$/, "");
    if (!cleaned || cleaned === ".") {
      return fileName;
    }
    return `${cleaned}/${fileName}`;
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    const dataFiles = event.dataTransfer?.files;
    if (!dataFiles?.length) return;

    const workspaceState = get(workspaceStore);
    if (!workspaceState.root) {
      alert("Open a folder before dropping files.");
      return;
    }

    const savedPaths: string[] = [];

    for (const file of Array.from(dataFiles)) {
      if (!file || !file.name) continue;
      try {
        const contents = await file.text();
        const targetPath = joinWorkspacePath(workspaceState.root, file.name);
        await fileService.writeFile(targetPath, contents);
        savedPaths.push(targetPath);
      } catch (error) {
        console.error("Drop import failed", error);
      }
    }

    if (savedPaths.length === 0) return;

    await workspaceStore.refresh();
    for (const path of savedPaths) {
      editorStore.ensureTabForFile(path, { activate: true, groupId: 1 });
    }
  };

  const handleOpenFolder = async () => {
    const selection = await open({
      directory: true,
      multiple: false,
    });

    const path =
      typeof selection === "string"
        ? selection
        : Array.isArray(selection)
          ? selection[0]
          : null;

    if (path) {
      workspaceStore.openFolder(path);
    }
  };
</script>

<div
  class="explorer-root"
  on:drop={handleDrop}
  on:dragover={handleDragOver}
  role="region"
  aria-label="Explorer workspace"
>
  <header class="explorer-header">
    <div>
      <div class="label">EXPLORER</div>
      {#if $workspaceStore.root}
        <div class="workspace-name">{$workspaceStore.name}</div>
      {/if}
    </div>
    <button class="open-btn" type="button" on:click={handleOpenFolder}>
      Open Folder
    </button>
  </header>

  {#if $workspaceStore.loading}
    <div class="status">Loading workspace…</div>
  {:else if $workspaceStore.error}
    <div class="status error">{$workspaceStore.error}</div>
  {:else if !$workspaceStore.root}
    <div class="status empty">
      <p>No folder opened</p>
      <button class="primary" type="button" on:click={handleOpenFolder}>
        Open Folder
      </button>
    </div>
  {:else if $workspaceStore.files.length === 0}
    <div class="status empty">
      <p>Folder is empty</p>
    </div>
  {:else}
    <FileTree nodes={$workspaceStore.files} />
  {/if}
</div>

<style>
  .explorer-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px 12px;
    gap: 8px;
    box-sizing: border-box;
  }

  .explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--nc-border-subtle);
    font-size: 12px;
  }

  .label {
    letter-spacing: 0.14em;
    font-size: 10px;
    color: var(--nc-fg-muted);
  }

  .workspace-name {
    font-size: 12px;
    color: var(--nc-fg);
    margin-top: 2px;
  }

  .open-btn,
  .primary {
    border: none;
    background: none;
    color: var(--nc-accent);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .primary {
    background-color: var(--nc-tab-bg-active);
    border: 1px solid var(--nc-border-subtle);
  }

  .status {
    padding: 12px;
    border-radius: 6px;
    background: var(--nc-level-1);
    color: var(--nc-fg-muted);
    font-size: 12px;
  }

  .status.error {
    color: #f87171;
  }

  .status.empty {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }

  .explorer-root :global(.file-tree) {
    flex: 1;
    overflow: auto;
  }
</style>
