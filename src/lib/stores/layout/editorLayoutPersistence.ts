import type { EditorGroupsState } from './editorGroupsStore';

const STORAGE_KEY = 'nc:editor-layout';
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let storeInstance: { set: (key: string, value: unknown) => Promise<void>; get: <T>(key: string) => Promise<T | null>; save: () => Promise<void> } | null =
  null;

async function getStore() {
  if (!isTauri) return null;
  if (storeInstance) return storeInstance;

  try {
    const moduleId = '@tauri-apps/plugin-store';
    const mod = (await import(/* @vite-ignore */ moduleId).catch(() => null)) as
      | {
          Store: new (path: string) => {
            set: (key: string, value: unknown) => Promise<void>;
            get: <T>(key: string) => Promise<T | null>;
            save: () => Promise<void>;
          };
        }
      | null;
    if (mod?.Store) {
      storeInstance = new mod.Store('editor-layout.bin');
      return storeInstance;
    }
  } catch (error) {
    console.warn('[layout] failed to load Tauri store plugin', error);
  }

  return null;
}

const persistToLocal = async (state: EditorGroupsState): Promise<void> => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[layout] localStorage persist failed', error);
  }
};

const restoreFromLocal = async (): Promise<EditorGroupsState | null> => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EditorGroupsState;
  } catch (error) {
    console.warn('[layout] localStorage restore failed', error);
    return null;
  }
};

export async function persistEditorLayout(state: EditorGroupsState): Promise<void> {
  const store = await getStore();
  if (store) {
    try {
      await store.set(STORAGE_KEY, state);
      await store.save();
      return;
    } catch (error) {
      console.warn('[layout] persist to Tauri store failed, falling back to localStorage', error);
    }
  }

  await persistToLocal(state);
}

export async function loadEditorLayout(): Promise<EditorGroupsState | null> {
  const store = await getStore();
  if (store) {
    try {
      const snapshot = await store.get<EditorGroupsState>(STORAGE_KEY);
      if (snapshot) return snapshot;
    } catch (error) {
      console.warn('[layout] failed to load editor layout from Tauri store', error);
    }
  }

  return restoreFromLocal();
}
