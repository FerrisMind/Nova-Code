<script lang="ts">
    import { activeEditor } from "../stores/editorStore";
    import { workspaceStore } from "../stores/workspaceStore";
    import Icon from "../common/Icon.svelte";
    import { getLanguageIcon } from "../mocks/languageIcons";
    import { onDestroy } from "svelte";

    let currentPath: string | null = null;
    let pathParts: string[] = [];
    let fileName: string = "";
    let workspaceRoot: string | null = null;

    const unsubscribeWorkspace = workspaceStore.subscribe((state) => {
        workspaceRoot = state.root;
    });

    const unsubscribeEditor = activeEditor.subscribe(($active) => {
        if ($active) {
            currentPath = $active.path || $active.id;

            let displayPath = currentPath.replace(/\\/g, "/");

            // Make relative to workspace root if possible
            if (workspaceRoot) {
                const normalizedRoot = workspaceRoot.replace(/\\/g, "/");
                // Case-insensitive check for Windows paths
                if (
                    displayPath
                        .toLowerCase()
                        .startsWith(normalizedRoot.toLowerCase())
                ) {
                    displayPath = displayPath.slice(normalizedRoot.length);
                    // Remove leading slash if present
                    if (displayPath.startsWith("/")) {
                        displayPath = displayPath.slice(1);
                    }
                }
            }

            pathParts = displayPath.split("/").filter((p) => p.length > 0);
            fileName = pathParts.pop() || "";
        } else {
            currentPath = null;
            pathParts = [];
            fileName = "";
        }
    });

    onDestroy(() => {
        unsubscribeEditor();
        unsubscribeWorkspace();
    });
</script>

{#if currentPath}
    <div class="breadcrumbs">
        {#each pathParts as part}
            <div class="crumb">
                <span class="text">{part}</span>
                <Icon
                    name="lucide:chevron-right"
                    size={12}
                    className="separator"
                />
            </div>
        {/each}
        <div class="crumb active">
            <Icon
                name={getLanguageIcon(fileName)}
                size={14}
                className="file-icon"
            />
            <span class="text">{fileName}</span>
        </div>
    </div>
{/if}

<style>
    .breadcrumbs {
        display: flex;
        align-items: center;
        height: 22px;
        padding: 0 16px;
        background-color: var(--nc-tab-bg-active);
        border-bottom: 1px solid var(--nc-bg-elevated);
        font-size: 11px;
        color: var(--nc-fg-muted);
        overflow: hidden;
        white-space: nowrap;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
    }

    .crumb {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .crumb .text {
        cursor: pointer;
    }

    .crumb .text:hover {
        color: var(--nc-fg);
    }

    .crumb.active {
        color: var(--nc-fg);
        font-weight: 500;
    }

    .breadcrumbs :global(.separator) {
        color: var(--nc-fg-muted);
        opacity: 0.6;
        margin: 0 2px;
    }

    :global(.file-icon) {
        margin-right: 4px;
    }
</style>
