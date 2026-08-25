import type { TournamentState } from '../types';
import { STORAGE_KEY, type TournamentRepository } from './repository';

function isValidState(x: unknown): x is TournamentState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<TournamentState>;
  return (
    s.version === 1 &&
    typeof s.results === 'object' &&
    s.results !== null &&
    typeof s.bets === 'object' &&
    s.bets !== null &&
    (s.line === 'open' || s.line === 'closed') &&
    typeof s.revealed === 'boolean'
  );
}

/**
 * localStorage-backed repository. Every method is defensive: corrupt or
 * unavailable storage degrades to "no data" rather than throwing.
 */
export class LocalStorageRepository implements TournamentRepository {
  async load(): Promise<TournamentState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      return isValidState(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async save(state: TournamentState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / disabled — nothing we can do, keep the in-memory state */
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  subscribe(listener: (state: TournamentState | null) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) return listener(null);
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        listener(isValidState(parsed) ? parsed : null);
      } catch {
        listener(null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}
