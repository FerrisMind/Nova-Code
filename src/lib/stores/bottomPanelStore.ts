import { writable } from 'svelte/store';

interface BottomPanelState {
  visible: boolean;
}

const createBottomPanelStore = () => {
  const { subscribe, update, set } = writable<BottomPanelState>({
    visible: false,
  });

  const toggle = () => update((s) => ({ ...s, visible: !s.visible }));
  const open = () => set({ visible: true });
  const close = () => set({ visible: false });

  return {
    subscribe,
    toggle,
    open,
    close,
  };
};

export const bottomPanelStore = createBottomPanelStore();
