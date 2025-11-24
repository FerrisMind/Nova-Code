// src/lib/stores/searchStore.ts
// -----------------------------------------------------------------------------
// Search state management for Nova Code: inline search and project-wide search.
// Manages search queries, results, and UI state for Ctrl+F/Ctrl+H inline search
// and Cmd/Ctrl+Shift+F project search functionality.
//
// Architecture:
// - Svelte 5 runes ($state, $derived) for reactive state
// - Type-safe interfaces for search results and state
// - Integration with Monaco Editor for inline search
// - Event-based communication with Tauri backend for project search
// -----------------------------------------------------------------------------

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Search result from project-wide search.
 * Maps directly to Rust SearchHit structure.
 */
export interface SearchHit {
    file: string;
    line: number;
    column: number;
    match_text: string;
    line_text: string;
}

/**
 * Inline search/replace state (Ctrl+F / Ctrl+H in current file).
 */
export interface InlineSearchState {
    query: string;
    replaceText: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
    isReplaceMode: boolean;
    visible: boolean;
}

/**
 * Project-wide search state (Cmd/Ctrl+Shift+F).
 */
export interface ProjectSearchState {
    query: string;
    caseSensitive: boolean;
    useRegex: boolean;
    isSearching: boolean;
    results: SearchHit[];
    error: string | null;
}

// -----------------------------------------------------------------------------
// Inline Search Store (for current file)
// -----------------------------------------------------------------------------

class InlineSearchStore {
    private state = $state<InlineSearchState>({
        query: '',
        replaceText: '',
        caseSensitive: false,
        wholeWord: false,
        useRegex: false,
        isReplaceMode: false,
        visible: false
    });

    /**
     * Get current inline search state.
     */
    get current(): InlineSearchState {
        return this.state;
    }

    /**
     * Show inline search panel (Ctrl+F).
     */
    showFind(): void {
        this.state.visible = true;
        this.state.isReplaceMode = false;
    }

    /**
     * Show inline find & replace panel (Ctrl+H).
     */
    showReplace(): void {
        this.state.visible = true;
        this.state.isReplaceMode = true;
    }

    /**
     * Hide inline search panel.
     */
    hide(): void {
        this.state.visible = false;
    }

    /**
     * Toggle inline search panel visibility.
     */
    toggle(): void {
        this.state.visible = !this.state.visible;
    }

    /**
     * Update search query.
     */
    setQuery(query: string): void {
        this.state.query = query;
    }

    /**
     * Update replace text.
     */
    setReplaceText(text: string): void {
        this.state.replaceText = text;
    }

    /**
     * Toggle case sensitivity.
     */
    toggleCaseSensitive(): void {
        this.state.caseSensitive = !this.state.caseSensitive;
    }

    /**
     * Toggle whole word matching.
     */
    toggleWholeWord(): void {
        this.state.wholeWord = !this.state.wholeWord;
    }

    /**
     * Toggle regex mode.
     */
    toggleRegex(): void {
        this.state.useRegex = !this.state.useRegex;
    }

    /**
     * Reset inline search state.
     */
    reset(): void {
        this.state.query = '';
        this.state.replaceText = '';
        this.state.caseSensitive = false;
        this.state.wholeWord = false;
        this.state.useRegex = false;
    }
}

// -----------------------------------------------------------------------------
// Project Search Store (workspace-wide)
// -----------------------------------------------------------------------------

class ProjectSearchStore {
    private state = $state<ProjectSearchState>({
        query: '',
        caseSensitive: false,
        useRegex: false,
        isSearching: false,
        results: [],
        error: null
    });

    private listeners: UnlistenFn[] = [];

    constructor() {
        this.setupListeners();
    }

    /**
     * Get current project search state.
     */
    get current(): ProjectSearchState {
        return this.state;
    }

    /**
     * Derived: total result count.
     */
    get resultCount(): number {
        return this.state.results.length;
    }

    /**
     * Derived: is search active.
     */
    get isActive(): boolean {
        return this.state.isSearching;
    }

    /**
     * Setup Tauri event listeners for search results.
     */
    private async setupListeners(): Promise<void> {
        // Listen for search hits
        const hitListener = await listen<SearchHit>('search-hit', (event) => {
            this.state.results.push(event.payload);
        });
        this.listeners.push(hitListener);

        // Listen for search completion
        const completeListener = await listen<number>('search-complete', () => {
            this.state.isSearching = false;
        });
        this.listeners.push(completeListener);

        // Listen for search cancellation
        const cancelListener = await listen('search-cancelled', () => {
            this.state.isSearching = false;
        });
        this.listeners.push(cancelListener);

        // Listen for search errors
        const errorListener = await listen<string>('search-error', (event) => {
            this.state.error = event.payload;
            this.state.isSearching = false;
        });
        this.listeners.push(errorListener);
    }

    /**
     * Start project-wide search.
     */
    async search(root: string, query: string, options?: { caseSensitive?: boolean; useRegex?: boolean }): Promise<void> {
        if (!query.trim()) {
            this.state.error = 'Search query cannot be empty';
            return;
        }

        // Reset state
        this.state.results = [];
        this.state.error = null;
        this.state.isSearching = true;
        this.state.query = query;
        this.state.caseSensitive = options?.caseSensitive ?? false;
        this.state.useRegex = options?.useRegex ?? false;

        try {
            await invoke('search_files', {
                request: {
                    root,
                    query,
                    use_regex: this.state.useRegex,
                    case_sensitive: this.state.caseSensitive
                }
            });
        } catch (error) {
            this.state.error = error instanceof Error ? error.message : String(error);
            this.state.isSearching = false;
        }
    }

    /**
     * Cancel active search operation.
     */
    async cancel(): Promise<void> {
        if (!this.state.isSearching) return;

        try {
            await invoke('cancel_search');
            this.state.isSearching = false;
        } catch (error) {
            console.error('Failed to cancel search:', error);
        }
    }

    /**
     * Clear search results.
     */
    clear(): void {
        this.state.results = [];
        this.state.error = null;
        this.state.query = '';
    }

    /**
     * Toggle case sensitivity.
     */
    toggleCaseSensitive(): void {
        this.state.caseSensitive = !this.state.caseSensitive;
    }

    /**
     * Toggle regex mode.
     */
    toggleRegex(): void {
        this.state.useRegex = !this.state.useRegex;
    }

    /**
     * Cleanup listeners on unmount.
     */
    dispose(): void {
        for (const unlisten of this.listeners) {
            unlisten();
        }
        this.listeners = [];
    }
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export const inlineSearchStore = new InlineSearchStore();
export const projectSearchStore = new ProjectSearchStore();
