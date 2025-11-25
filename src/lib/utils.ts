import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Utility types for shadcn-svelte components
export type WithoutChildrenOrChild<T> = Omit<T, 'child' | 'children'>;
