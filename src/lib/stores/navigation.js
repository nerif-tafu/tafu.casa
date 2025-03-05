import { writable } from 'svelte/store';

export const navigationState = writable({
  isNavigating: false,
  destination: null,
  message: null
}); 