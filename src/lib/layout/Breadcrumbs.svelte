<script lang="ts">
    import { activeEditor, type EditorTab } from "../stores/editorStore";
    import { workspaceStore } from "../stores/workspaceStore";
    import Icon from "../common/Icon.svelte";
    import { getLanguageIcon } from "../mocks/languageIcons";
    import { onDestroy } from "svelte";

    export let tab: EditorTab | null = null;

    let currentPath: string | null = null;
    let pathParts: string[] = [];
    let fileName: string = "";
    let workspaceRoot: string | null = null;
    let activeFromStore: EditorTab | null = null;

    // Derived icon based on the current filename
    $: fileIcon = fileName ? getLanguageIcon(fileName) : "lucide:File";

    const unsubscribeWorkspace = workspaceStore.subscribe((state) => {
        workspaceRoot = state.root;
    });

    const unsubscribeEditor = activeEditor.subscribe(($active) => {
        activeFromStore = $active;
    });

    const applyTab = (target: EditorTab | null) => {
        if (target) {
            currentPath = target.path || target.id;

            let displayPath = currentPath.replace(/\\/g, "/");

            if (workspaceRoot) {
                const normalizedRoot = workspaceRoot.replace(/\\/g, "/");
                if (
                    displayPath
                        .toLowerCase()
                        .startsWith(normalizedRoot.toLowerCase())
                ) {
                    displayPath = displayPath.slice(normalizedRoot.length);
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
    };

    $: applyTab(tab ?? activeFromStore);

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
        {#key fileName}
            <div class="crumb active">
                <Icon
                    name={fileIcon}
                    size={14}
                    className="file-icon"
                    useAdaptiveColor={true}
                />
                <span class="text">{fileName}</span>
            </div>
        {/key}
    </div>
{/if}

<style>
    .breadcrumbs {
        display: flex;
        align-items: center;
        height: 24px;
        padding: 0 16px;
        background-color: var(--nc-tab-bg-active);
        border-bottom: 1px solid var(--nc-bg-elevated);
        font-size: 12px;
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
        display: flex;
        align-items: center;
    }

    .breadcrumbs :global(.separator) {
        color: var(--nc-fg-muted);
        opacity: 0.6;
        margin: 0 2px;
    }

    .crumb.active :global(.file-icon) {
        margin-right: 4px;
        flex-shrink: 0;
    }
</style>
