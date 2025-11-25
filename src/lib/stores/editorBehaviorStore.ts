// src/lib/stores/editorBehaviorStore.ts
// ---------------------------------------------------------------------------
// Стор, управляющий поведением редактора (автосохранение и таймауты).
// ---------------------------------------------------------------------------
import { writable, type Writable } from 'svelte/store';

export interface EditorBehaviorState {
  autoSave: boolean;
  autoSaveDelay: number;
}

const DEFAULT_STATE: EditorBehaviorState = {
  autoSave: false,
  autoSaveDelay: 600
};

const store: Writable<EditorBehaviorState> = writable(DEFAULT_STATE);
let currentState: EditorBehaviorState = DEFAULT_STATE;
store.subscribe((state) => {
  currentState = state;
});

export const editorBehaviorStore = {
  subscribe: store.subscribe,
  setAutoSave(next: boolean) {
    store.update((state) => ({
      ...state,
      autoSave: next
    }));
  },
  toggleAutoSave() {
    store.update((state) => ({
      ...state,
      autoSave: !state.autoSave
    }));
  },
  setAutoSaveDelay(delay: number) {
    store.update((state) => ({
      ...state,
      autoSaveDelay: delay
    }));
  },
  getAutoSave() {
    return currentState.autoSave;
  },
  getAutoSaveDelay() {
    return currentState.autoSaveDelay;
  }
};
