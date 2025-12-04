// src/lib/stores/editorBehaviorStore.ts
// ---------------------------------------------------------------------------
// Стор, управляющий поведением редактора (автосохранение и таймауты).
// ---------------------------------------------------------------------------
import { writable, type Writable } from 'svelte/store';

// VS Code parity: files.autoSave supports off | afterDelay | onFocusChange | onWindowChange.
export type AutoSaveMode = 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';

export interface EditorBehaviorState {
  autoSaveMode: AutoSaveMode;
  autoSaveDelay: number;
}

const DEFAULT_STATE: EditorBehaviorState = {
  autoSaveMode: 'off',
  autoSaveDelay: 1000, // VS Code default delay for afterDelay
};

const store: Writable<EditorBehaviorState> = writable(DEFAULT_STATE);
let currentState: EditorBehaviorState = DEFAULT_STATE;
store.subscribe((state) => {
  currentState = state;
});

export const editorBehaviorStore = {
  subscribe: store.subscribe,
  setAutoSaveMode(mode: AutoSaveMode) {
    store.update((state) => ({
      ...state,
      autoSaveMode: mode,
    }));
  },
  toggleAutoSave() {
    store.update((state) => ({
      ...state,
      autoSaveMode: state.autoSaveMode === 'off' ? 'afterDelay' : 'off',
    }));
  },
  setAutoSaveDelay(delay: number) {
    store.update((state) => ({
      ...state,
      autoSaveDelay: delay,
    }));
  },
  getAutoSaveMode() {
    return currentState.autoSaveMode;
  },
  getAutoSaveDelay() {
    return currentState.autoSaveDelay;
  },
  isAutoSaveEnabled() {
    return currentState.autoSaveMode !== 'off';
  },
};
