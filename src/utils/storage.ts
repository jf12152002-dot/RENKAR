import { demoState } from '../data/demo';
import { AppState } from '../types';

const key = 'renkar-state-v1';

export function loadState(): AppState {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(demoState));
    return demoState;
  }
  return JSON.parse(raw) as AppState;
}

export function saveState(state: AppState) {
  localStorage.setItem(key, JSON.stringify(state));
}

export function resetState() {
  localStorage.setItem(key, JSON.stringify(demoState));
  return demoState;
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
