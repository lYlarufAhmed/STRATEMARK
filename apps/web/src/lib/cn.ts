import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge classnames with Tailwind conflict resolution (shadcn standard). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
