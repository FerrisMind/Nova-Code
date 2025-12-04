// src/lib/stores/searchStore.ts
// -----------------------------------------------------------------------------
// Search state management for Nova Code: inline search and project-wide search.
// Manages search queries, results, and UI state for Ctrl+F/Ctrl+H inline search
// and Cmd/Ctrl+Shift+F project search functionality.
// -----------------------------------------------------------------------------

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { writable, get, type Readable } from 'svelte/store';

export interface SearchHit {
  file: string;
  line: number;
  column: number;
  match_text: string;
  line_text: string;
}

export interface InlineSearchState {
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  isReplaceMode: boolean;
  visible: boolean;
}

export interface ProjectSearchState {
  query: string;
  caseSensitive: boolean;
  useRegex: boolean;
  isSearching: boolean;
  results: SearchHit[];
  error: string | null;
}

type InlineSearchStore = Readable<InlineSearchState> & {
  showFind(): void;
  showReplace(): void;
  hide(): void;
  toggle(): void;
  setQuery(query: string): void;
  setReplaceText(text: string): void;
  toggleCaseSensitive(): void;
  toggleWholeWord(): void;
  toggleRegex(): void;
  setReplaceMode(isReplace: boolean): void;
};

type ProjectSearchStore = Readable<ProjectSearchState> & {
  search(
    root: string,
    query: string,
    options?: { caseSensitive?: boolean; useRegex?: boolean }
  ): Promise<void>;
  cancel(): Promise<void>;
  clear(): void;
  dispose(): void;
  toggleCaseSensitive(): void;
  toggleRegex(): void;
};

const inlineInitialState: InlineSearchState = {
  query: '',
  replaceText: '',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  isReplaceMode: false,
  visible: false,
};

const projectInitialState: ProjectSearchState = {
  query: '',
  caseSensitive: false,
  useRegex: false,
  isSearching: false,
  results: [],
  error: null,
};

function createInlineSearchStore(): InlineSearchStore {
  const { subscribe, update } = writable<InlineSearchState>(inlineInitialState);

  return {
    subscribe,
    showFind() {
      update((state) => ({ ...state, visible: true, isReplaceMode: false }));
    },
    showReplace() {
      update((state) => ({ ...state, visible: true, isReplaceMode: true }));
    },
    hide() {
      update((state) => ({ ...state, visible: false }));
    },
    toggle() {
      update((state) => ({ ...state, visible: !state.visible }));
    },
    setQuery(query: string) {
      update((state) => ({ ...state, query }));
    },
    setReplaceText(text: string) {
      update((state) => ({ ...state, replaceText: text }));
    },
    toggleCaseSensitive() {
      update((state) => ({ ...state, caseSensitive: !state.caseSensitive }));
    },
    toggleWholeWord() {
      update((state) => ({ ...state, wholeWord: !state.wholeWord }));
    },
    toggleRegex() {
      update((state) => ({ ...state, useRegex: !state.useRegex }));
    },
    setReplaceMode(isReplace: boolean) {
      update((state) => ({ ...state, isReplaceMode: isReplace }));
    },
  };
}

function createProjectSearchStore(): ProjectSearchStore {
  const { subscribe, update, set } = writable<ProjectSearchState>(projectInitialState);
  let listeners: UnlistenFn[] = [];

  async function setupListeners(): Promise<void> {
    const hitListener = await listen<SearchHit>('search-hit', (event) => {
      update((state) => ({ ...state, results: [...state.results, event.payload] }));
    });
    listeners.push(hitListener);

    const completeListener = await listen<number>('search-complete', () => {
      update((state) => ({ ...state, isSearching: false }));
    });
    listeners.push(completeListener);

    const cancelListener = await listen('search-cancelled', () => {
      update((state) => ({ ...state, isSearching: false }));
    });
    listeners.push(cancelListener);

    const errorListener = await listen<string>('search-error', (event) => {
      update((state) => ({ ...state, error: event.payload, isSearching: false }));
    });
    listeners.push(errorListener);
  }

  void setupListeners();

  return {
    subscribe,
    async search(
      root: string,
      query: string,
      options?: { caseSensitive?: boolean; useRegex?: boolean }
    ) {
      if (!query.trim()) {
        update((state) => ({ ...state, error: 'Search query cannot be empty' }));
        return;
      }

      set({
        query,
        caseSensitive: options?.caseSensitive ?? false,
        useRegex: options?.useRegex ?? false,
        isSearching: true,
        results: [],
        error: null,
      });

      try {
        await invoke('search_files', {
          request: {
            root,
            query,
            use_regex: options?.useRegex ?? false,
            case_sensitive: options?.caseSensitive ?? false,
          },
        });
      } catch (error) {
        update((state) => ({
          ...state,
          error: error instanceof Error ? error.message : String(error),
          isSearching: false,
        }));
      }
    },
    async cancel() {
      const current = get({ subscribe });
      if (!current.isSearching) return;
      try {
        await invoke('cancel_search');
        update((state) => ({ ...state, isSearching: false }));
      } catch (error) {
        console.error('Failed to cancel search:', error);
      }
    },
    clear() {
      set(projectInitialState);
    },
    dispose() {
      for (const unlisten of listeners) {
        unlisten();
      }
      listeners = [];
      set(projectInitialState);
    },
    toggleCaseSensitive() {
      update((state) => ({ ...state, caseSensitive: !state.caseSensitive }));
    },
    toggleRegex() {
      update((state) => ({ ...state, useRegex: !state.useRegex }));
    },
  };
}

export const inlineSearchStore = createInlineSearchStore();
export const projectSearchStore = createProjectSearchStore();
