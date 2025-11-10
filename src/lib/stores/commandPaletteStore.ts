// src/lib/stores/commandPaletteStore.ts
// -----------------------------------------------------------------------------
// Store видимости Command Palette.
//
// Принципы:
// - Не знает о конкретных командах или UI-деталях.
// - Отвечает только за флаг "палитра открыта" для layout-уровня.
// - Используется +layout.svelte и CommandPalette.svelte.
// -----------------------------------------------------------------------------

import { writable } from 'svelte/store';

const open = writable(false);

export const commandPaletteOpen = {
  subscribe: open.subscribe
};

export function openCommandPalette(): void {
  open.set(true);
}

export function closeCommandPalette(): void {
  open.set(false);
}

export function toggleCommandPalette(): void {
  open.update((v) => !v);
}