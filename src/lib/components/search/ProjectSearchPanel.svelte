<script lang="ts">
    // src/lib/components/search/ProjectSearchPanel.svelte
    // -----------------------------------------------------------------------------
    // Project-wide search panel (Cmd/Ctrl+Shift+F) for Nova Code.
    // Displays search results across all files in the workspace with streaming updates.
    //
    // Features:
    // - Real-time streaming search results
    // - Cancel button for long-running searches
    // - Click to navigate to match location
    // - Regex and case-sensitive toggles
    // - Debounced search input (300ms)
    //
    // Architecture:
    // - Integrated with projectSearchStore for state management
    // - Uses Tauri events for streaming results
    // - Opens files in editor onclick
    // -----------------------------------------------------------------------------

    import { onMount } from "svelte";
    import { projectSearchStore } from "$lib/stores/searchStore.svelte";
    import { editorStore } from "$lib/stores/editorStore";
    import { workspaceStore } from "$lib/stores/workspaceStore";

    // Reactive state
    $: state = projectSearchStore.current;
    $: resultCount = projectSearchStore.resultCount;
    $: isSearching = projectSearchStore.isActive;

    // Local state
    let queryInput: HTMLInputElement;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Start search with debounce (300ms).
     */
    function handleSearchInput(value: string): void {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            performSearch(value);
        }, 300);
    }

    /**
     * Perform search operation.
     */
    async function performSearch(query: string): Promise<void> {
        if (!query.trim()) return;

        const workspaceRoot = workspaceStore.getWorkspaceRoot();
        if (!workspaceRoot) {
            console.error("No workspace root set");
            return;
        }

        await projectSearchStore.search(workspaceRoot, query, {
            caseSensitive: state.caseSensitive,
            useRegex: state.useRegex,
        });
    }

    /**
     * Handle search result click - open file at position.
     */
    function handleResultClick(result: (typeof state.results)[0]): void {
        const fullPath = workspaceStore.resolvePath(result.file);
        if (!fullPath) return;

        // Open file in editor
        editorStore.ensureTabForFile(fullPath, { activate: true });

        // TODO: Set cursor position to result.line, result.column
        // This requires extending EditorCore API to support cursor positioning
    }

    /**
     * Cancel active search.
     */
    async function handleCancel(): Promise<void> {
        await projectSearchStore.cancel();
    }

    /**
     * Clear search results.
     */
    function handleClear(): void {
        projectSearchStore.clear();
        if (queryInput) {
            queryInput.value = "";
        }
    }

    onMount(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    });
</script>

<div class="project-search-panel">
    <!-- Search header -->
    <div class="search-header">
        <h3 class="panel-title">Search</h3>
    </div>

    <!-- Search controls -->
    <div class="search-controls">
        <div class="input-row">
            <input
                bind:this={queryInput}
                type="text"
                class="search-input"
                placeholder="Search in project..."
                value={state.query}
                on:input={(e) => handleSearchInput(e.currentTarget.value)}
                aria-label="Search query"
            />

            {#if isSearching}
                <button
                    class="action-btn cancel-btn"
                    on:click={handleCancel}
                    title="Cancel search"
                >
                    Cancel
                </button>
            {:else if resultCount > 0}
                <button
                    class="action-btn clear-btn"
                    on:click={handleClear}
                    title="Clear results"
                >
                    Clear
                </button>
            {/if}
        </div>

        <!-- Search options -->
        <div class="options-row">
            <label class="option-label">
                <input
                    type="checkbox"
                    checked={state.caseSensitive}
                    on:change={() => projectSearchStore.toggleCaseSensitive()}
                />
                <span>Match Case</span>
            </label>
            <label class="option-label">
                <input
                    type="checkbox"
                    checked={state.useRegex}
                    on:change={() => projectSearchStore.toggleRegex()}
                />
                <span>Use Regex</span>
            </label>
        </div>
    </div>

    <!-- Search status -->
    {#if isSearching}
        <div class="search-status">
            <span class="status-text">Searching... ({resultCount} results)</span
            >
        </div>
    {:else if state.error}
        <div class="search-error">
            <span class="error-text">Error: {state.error}</span>
        </div>
    {:else if resultCount > 0}
        <div class="search-status">
            <span class="status-text"
                >{resultCount} result{resultCount === 1 ? "" : "s"}</span
            >
        </div>
    {/if}

    <!-- Search results -->
    <div class="results-container">
        {#if resultCount === 0 && !isSearching && state.query}
            <div class="no-results">
                <p>No results found</p>
            </div>
        {:else}
            <div class="results-list">
                {#each state.results as result, index (index)}
                    <button
                        class="result-item"
                        on:click={() => handleResultClick(result)}
                        title="Open file at line {result.line}"
                    >
                        <div class="result-header">
                            <span class="file-path">{result.file}</span>
                            <span class="line-number"
                                >:{result.line}:{result.column}</span
                            >
                        </div>
                        <div class="result-line">
                            {result.line_text}
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .project-search-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--nc-bg, #1e1e1e);
        color: var(--nc-fg, #cccccc);
        font-size: 13px;
    }

    .search-header {
        padding: 12px 16px 8px;
        border-bottom: 1px solid var(--nc-border, #3e3e42);
    }

    .panel-title {
        margin: 0;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--nc-fg-muted, #858585);
        letter-spacing: 0.5px;
    }

    .search-controls {
        padding: 12px 16px;
        border-bottom: 1px solid var(--nc-border, #3e3e42);
    }

    .input-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
    }

    .search-input {
        flex: 1;
        background: var(--nc-input-bg, #3c3c3c);
        border: 1px solid var(--nc-border, #3e3e42);
        border-radius: 3px;
        color: var(--nc-fg, #cccccc);
        padding: 6px 8px;
        font-size: 13px;
        outline: none;
    }

    .search-input:focus {
        border-color: var(--nc-accent, #007acc);
    }

    .search-input::placeholder {
        color: var(--nc-fg-muted, #858585);
    }

    .action-btn {
        background: var(--nc-button-bg, #0e639c);
        border: none;
        border-radius: 3px;
        color: white;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
    }

    .action-btn:hover {
        background: var(--nc-button-hover, #1177bb);
    }

    .cancel-btn {
        background: var(--nc-warning, #d16969);
    }

    .cancel-btn:hover {
        background: #e07979;
    }

    .clear-btn {
        background: var(--nc-button-secondary, #505050);
    }

    .clear-btn:hover {
        background: #606060;
    }

    .options-row {
        display: flex;
        gap: 16px;
    }

    .option-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--nc-fg-muted, #858585);
        cursor: pointer;
    }

    .option-label input[type="checkbox"] {
        cursor: pointer;
    }

    .search-status,
    .search-error {
        padding: 8px 16px;
        border-bottom: 1px solid var(--nc-border, #3e3e42);
    }

    .status-text {
        font-size: 11px;
        color: var(--nc-fg-muted, #858585);
    }

    .error-text {
        font-size: 12px;
        color: var(--nc-error, #f48771);
    }

    .results-container {
        flex: 1;
        overflow-y: auto;
    }

    .no-results {
        padding: 32px 16px;
        text-align: center;
        color: var(--nc-fg-muted, #858585);
    }

    .results-list {
        padding: 4px;
    }

    .result-item {
        width: 100%;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--nc-border-subtle, #2d2d30);
        padding: 8px 12px;
        cursor: pointer;
        text-align: left;
        color: var(--nc-fg, #cccccc);
        transition: background 0.1s;
    }

    .result-item:hover {
        background: var(--nc-hover-bg, #2a2d2e);
    }

    .result-item:focus {
        outline: 1px solid var(--nc-accent, #007acc);
        outline-offset: -1px;
    }

    .result-header {
        display: flex;
        align-items: baseline;
        gap: 4px;
        margin-bottom: 4px;
    }

    .file-path {
        font-size: 12px;
        color: var(--nc-fg, #cccccc);
        font-weight: 500;
    }

    .line-number {
        font-size: 11px;
        color: var(--nc-fg-muted, #858585);
        font-family: monospace;
    }

    .result-line {
        font-size: 12px;
        font-family: "Consolas", "Monaco", "Courier New", monospace;
        color: var(--nc-fg-muted, #cccccc);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-left: 12px;
    }
</style>
