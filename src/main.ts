import { mount } from 'svelte';
import App from './App.svelte';
import { load } from './lib/store.svelte';
import './lib/theme';
import './style.css';

declare global {
  const __APP_VERSION__: string;
}

load()
  .catch((err) => alert('Could not open saved lists: ' + err))
  .finally(() => mount(App, { target: document.getElementById('app')! }));
