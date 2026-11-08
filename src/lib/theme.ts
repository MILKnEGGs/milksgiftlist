// Fonts (bundled for offline use) and light/dark mode.

import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/figtree/latin-800.css';

import type { ThemeMode } from './types';

const media = matchMedia('(prefers-color-scheme: dark)');
let mode: ThemeMode = 'auto';

function apply(): void {
  const dark = mode === 'dark' || (mode === 'auto' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#2a1a20' : '#8e2340');
}

media.addEventListener('change', apply);

export function setThemeMode(m: ThemeMode): void {
  mode = m;
  apply();
}
