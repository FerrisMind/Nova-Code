<script lang="ts">
    // src/lib/components/search/InlineSearch.svelte
    // -----------------------------------------------------------------------------
    // Inline search/replace UI for Monaco Editor (Ctrl+F / Ctrl+H).
    // Provides find and replace functionality within the current file.
    //
    // Features:
    // - Search with regex/case/whole word toggles
    // - Replace single match or all matches
    // - Keyboard navigation (Enter/Shift+Enter for next/previous)
    // - Integration with Monaco Editor's built-in find controller
    //
    // Architecture:
    // - Uses searchStore for state management
    // - Delegates actual search to Monaco Editor API
    // - Minimal, VS Code-inspired UI
    // -----------------------------------------------------------------------------

    import { onMount, onDestroy } from "svelte";
    import { inlineSearchStore } from "$lib/stores/searchStore.svelte";
    import type * as monaco from "monaco-editor";

    // Props
    export let editor: monaco.editor.IStandaloneCodeEditor | null = null;

    // Local state
    let searchInput: HTMLInputElement;
    let replaceInput: HTMLInputElement;

    // Reactive state from store
    $: state = inlineSearchStore.current;

    /**
     * Handle search input change - trigger find in Monaco.
     */
    function handleSearch(): void {
        if (!editor || !state.query) return;

        // Use Monaco's built-in find controller
        const controller = editor.getContribution(
            "editor.contrib.findController",
        );
        if (controller) {
            // Trigger find with current settings
            editor.trigger("inlineSearch", "actions.find", {
                searchString: state.query,
                isRegex: state.useRegex,
                matchCase: state.caseSensitive,
                wholeWord: state.wholeWord,
            });
        }
    }

    /**
     * Find next match.
     */
    function findNext(): void {
        if (!editor) return;
        editor.trigger(
            "inlineSearch",
            "editor.action.nextMatchFindAction",
            null,
        );
    }

    /**
     * Find previous match.
     */
    function findPrevious(): void {
        if (!editor) return;
        editor.trigger(
            "inlineSearch",
            "editor.action.previousMatchFindAction",
            null,
        );
    }

    /**
     * Replace current match.
     */
    function replace(): void {
        if (!editor || !state.replaceText) return;
        editor.trigger("inlineSearch", "editor.action.replaceOne", {
            replaceString: state.replaceText,
        });
    }

    /**
     * Replace all matches.
     */
    function replaceAll(): void {
        if (!editor || !state.replaceText) return;
        editor.trigger("inlineSearch", "editor.action.replaceAll", {
            replaceString: state.replaceText,
        });
    }

    /**
     * Close search panel.
     */
    function close(): void {
        inlineSearchStore.hide();
        // Close Monaco's find widget
        if (editor) {
            editor.trigger("inlineSearch", "closeFindWidget", null);
        }
        editor?.focus();
    }

    /**
     * Handle keyboard shortcuts.
     */
    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        } else if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            findNext();
        } else if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            findPrevious();
        }
    }

    /**
     * Focus search input when panel becomes visible.
     */
    $: if (state.visible && searchInput) {
        setTimeout(() => searchInput?.focus(), 50);
    }

    onMount(() => {
        // Setup global keyboard listeners for Ctrl+F / Ctrl+H
        const handleGlobalKeydown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "f" && !e.shiftKey) {
                e.preventDefault();
                inlineSearchStore.showFind();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "h") {
                e.preventDefault();
                inlineSearchStore.showReplace();
            }
        };

        window.addEventListener("keydown", handleGlobalKeydown);

        return () => {
            window.removeEventListener("keydown", handleGlobalKeydown);
        };
    });
</script>

{#if state.visible}
    <div
        class="inline-search-panel"
        role="dialog"
        aria-label="Find and Replace"
    >
        <div class="search-row">
            <!-- Search input -->
            <div class="input-group">
                <input
                    bind:this={searchInput}
                    type="text"
                    class="search-input"
                    placeholder="Find"
                    value={state.query}
                    on:input={(e) => {
                        inlineSearchStore.setQuery(e.currentTarget.value);
                        handleSearch();
                    }}
                    on:keydown={handleKeydown}
                    aria-label="Search query"
                />

                <!-- Search toggles -->
                <div class="toggle-group">
                    <button
                        class="toggle-btn"
                        class:active={state.caseSensitive}
                        on:click={() => {
                            inlineSearchStore.toggleCaseSensitive();
                            handleSearch();
                        }}
                        title="Match Case"
                        aria-label="Match Case"
                    >
                        Aa
                    </button>
                    <button
                        class="toggle-btn"
                        class:active={state.wholeWord}
                        on:click={() => {
                            inlineSearchStore.toggleWholeWord();
                            handleSearch();
                        }}
                        title="Match Whole Word"
                        aria-label="Match Whole Word"
                    >
                        Ab
                    </button>
                    <button
                        class="toggle-btn"
                        class:active={state.useRegex}
                        on:click={() => {
                            inlineSearchStore.toggleRegex();
                            handleSearch();
                        }}
                        title="Use Regular Expression"
                        aria-label="Use Regular Expression"
                    >
                        .*
                    </button>
                </div>
            </div>

            <!-- Navigation buttons -->
            <div class="nav-buttons">
                <button
                    class="nav-btn"
                    on:click={findPrevious}
                    title="Previous Match (Shift+Enter)"
                    aria-label="Previous Match"
                >
                    ↑
                </button>
                <button
                    class="nav-btn"
                    on:click={findNext}
                    title="Next Match (Enter)"
                    aria-label="Next Match"
                >
                    ↓
                </button>
                <button
                    class="close-btn"
                    on:click={close}
                    title="Close (Esc)"
                    aria-label="Close search"
                >
                    ✕
                </button>
            </div>
        </div>

        {#if state.isReplaceMode}
            <div class="replace-row">
                <!-- Replace input -->
                <div class="input-group">
                    <input
                        bind:this={replaceInput}
                        type="text"
                        class="search-input"
                        placeholder="Replace"
                        value={state.replaceText}
                        on:input={(e) =>
                            inlineSearchStore.setReplaceText(
                                e.currentTarget.value,
                            )}
                        on:keydown={handleKeydown}
                        aria-label="Replace text"
                    />
                </div>

                <!-- Replace buttons -->
                <div class="replace-buttons">
                    <button
                        class="action-btn"
                        on:click={replace}
                        title="Replace"
                    >
                        Replace
                    </button>
                    <button
                        class="action-btn"
                        on:click={replaceAll}
                        title="Replace All"
                    >
                        Replace All
                    </button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    .inline-search-panel {
        position: absolute;
        top: 0;
        right: 20px;
        z-index: 10;
        background: var(--nc-bg-elevated, #252526);
        border: 1px solid var(--nc-border, #3e3e42);
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        min-width: 400px;
        font-size: 13px;
    }

    .search-row,
    .replace-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
    }

    .replace-row {
        margin-bottom: 0;
    }

    .input-group {
        display: flex;
        align-items: center;
        flex: 1;
        background: var(--nc-input-bg, #3c3c3c);
        border: 1px solid var(--nc-border, #3e3e42);
        border-radius: 3px;
        overflow: hidden;
    }

    .search-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--nc-fg, #cccccc);
        padding: 4px 8px;
        font-size: 13px;
        outline: none;
    }

    .search-input::placeholder {
        color: var(--nc-fg-muted, #858585);
    }

    .toggle-group {
        display: flex;
        gap: 2px;
        padding: 2px;
        border-left: 1px solid var(--nc-border, #3e3e42);
    }

    .toggle-btn {
        background: transparent;
        border: none;
        color: var(--nc-fg-muted, #858585);
        padding: 2px 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        border-radius: 2px;
    }

    .toggle-btn:hover {
        background: var(--nc-hover-bg, #2a2d2e);
    }

    .toggle-btn.active {
        background: var(--nc-accent, #007acc);
        color: white;
    }

    .nav-buttons,
    .replace-buttons {
        display: flex;
        gap: 4px;
    }

    .nav-btn,
    .close-btn,
    .action-btn {
        background: transparent;
        border: 1px solid var(--nc-border, #3e3e42);
        color: var(--nc-fg, #cccccc);
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 3px;
        font-size: 12px;
    }

    .nav-btn:hover,
    .close-btn:hover,
    .action-btn:hover {
        background: var(--nc-hover-bg, #2a2d2e);
    }

    .action-btn {
        padding: 4px 12px;
    }

    .close-btn {
        font-size: 14px;
        font-weight: bold;
    }
</style>
