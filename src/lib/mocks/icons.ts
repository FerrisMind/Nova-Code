/**
 * Простые SVG-иконки для ActivityBar и UI.
 * Используются компонентом Icon.svelte по имени.
 */

export const icons: Record<string, string> = {
  explorer: `
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" stroke="currentColor" stroke-width="1.4"/>
      <rect x="7" y="8" width="10" height="2" fill="currentColor"/>
      <rect x="7" y="12" width="6" height="2" fill="currentColor"/>
    </svg>
  `,
  search: `
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="5" stroke="currentColor" stroke-width="1.6"/>
      <line x1="14.5" y1="14.5" x2="19" y2="19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  git: `
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 4a2 2 0 1 1 2 2v5.1a2 2 0 1 1-1.5 0V9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M15 6.9V11a2 2 0 1 1-1.5 0V6a2 2 0 1 1 2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  `,
  extensions: `
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.4"/>
      <rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.4"/>
      <rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.4"/>
      <rect x="13" y="13" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.4"/>
    </svg>
  `,
  settings: `
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.3" fill="currentColor"/>
      <path d="M4 12.5l2.2-.4a5.9 5.9 0 0 1 .7-1.7L6 8.6 8.6 6l1.8.9a5.9 5.9 0 0 1 1.7-.7L12.5 4h3l.4 2.2a5.9 5.9 0 0 1 1.7.7L18.6 6 21 8.6l-.9 1.8c.3.5.5 1.1.7 1.7L22 12.5v3l-2.2.4a5.9 5.9 0 0 1-.7 1.7l.9 1.8L18.6 21 16.8 20.1a5.9 5.9 0 0 1-1.7.7L14.5 22h-3l-.4-2.2a5.9 5.9 0 0 1-1.7-.7L7.4 21 5 18.6l.9-1.8a5.9 5.9 0 0 1-.7-1.7L4 15.5v-3z"
        stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" opacity="0.9"/>
    </svg>
  `,
  terminal: `
    <svg viewBox="0 0 24 24" fill="none">
      <polyline points="5 6 9 10 5 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="11" y1="14" x2="19" y2="14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
    </svg>
  `
};

/**
 * Возвращает SVG по имени или пустую строку.
 */
export function getIcon(name: string): string {
  return icons[name] ?? '';
}