<svelte:options runes={true} />
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
    let { editor = null }: { editor: monaco.editor.IStandaloneCodeEditor | null } = $props();

    // Local state
    let searchInput: HTMLInputElement | null = $state(null);
    let replaceInput: HTMLInputElement | null = $state(null);

    // Reactive state from store
    const searchState = $derived(inlineSearchStore.current);

    /**
     * Handle search input change - trigger find in Monaco.
     */
    function handleSearch(): void {
        if (!editor || !searchState.query) return;

        // Use Monaco's built-in find controller
        const controller = editor.getContribution(
            "editor.contrib.findController",
        );
        if (controller) {
            // Trigger find with current settings
            editor.trigger("inlineSearch", "actions.find", {
                searchString: searchState.query,
                isRegex: searchState.useRegex,
                matchCase: searchState.caseSensitive,
                wholeWord: searchState.wholeWord,
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
        if (!editor || !searchState.replaceText) return;
        editor.trigger("inlineSearch", "editor.action.replaceOne", {
            replaceString: searchState.replaceText,
        });
    }

    /**
     * Replace all matches.
     */
    function replaceAll(): void {
        if (!editor || !searchState.replaceText) return;
        editor.trigger("inlineSearch", "editor.action.replaceAll", {
            replaceString: searchState.replaceText,
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
    $effect(() => {
        if (searchState.visible && searchInput) {
            setTimeout(() => searchInput?.focus(), 50);
        }
    });

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

{#if searchState.visible}
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
                    value={searchState.query}
                    oninput={(e) => {
                        inlineSearchStore.setQuery(e.currentTarget.value);
                        handleSearch();
                    }}
                    onkeydown={handleKeydown}
                    aria-label="Search query"
                />

                <!-- Search toggles -->
                <div class="toggle-group">
                    <button
                        class="toggle-btn"
                        class:active={searchState.caseSensitive}
                    onclick={() => {
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
                        class:active={searchState.wholeWord}
                    onclick={() => {
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
                        class:active={searchState.useRegex}
                    onclick={() => {
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
                    onclick={findPrevious}
                    title="Previous Match (Shift+Enter)"
                    aria-label="Previous Match"
                >
                    ↑
                </button>
                <button
                    class="nav-btn"
                    onclick={findNext}
                    title="Next Match (Enter)"
                    aria-label="Next Match"
                >
                    ↓
                </button>
                <button
                    class="close-btn"
                    onclick={close}
                    title="Close (Esc)"
                    aria-label="Close search"
                >
                    ✕
                </button>
            </div>
        </div>

        {#if searchState.isReplaceMode}
            <div class="replace-row">
                <!-- Replace input -->
                <div class="input-group">
                    <input
                        bind:this={replaceInput}
                        type="text"
                        class="search-input"
                        placeholder="Replace"
                        value={searchState.replaceText}
                        oninput={(e) =>
                            inlineSearchStore.setReplaceText(
                                e.currentTarget.value,
                            )}
                        onkeydown={handleKeydown}
                        aria-label="Replace text"
                    />
                </div>

                <!-- Replace buttons -->
                <div class="replace-buttons">
                    <button
                        class="action-btn"
                        onclick={replace}
                        title="Replace"
                    >
                        Replace
                    </button>
                    <button
                        class="action-btn"
                        onclick={replaceAll}
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
