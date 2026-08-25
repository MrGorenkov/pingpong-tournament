import type { TournamentState } from '../types';

/** localStorage key required by the brief. */
export const STORAGE_KEY = 'pingpong-tournament-v1';

export function createInitialState(): TournamentState {
  // Line starts OPEN so everyone can place bets; the admin closes it before the
  // first match (that moment triggers the reveal).
  return { version: 1, results: {}, bets: {}, line: 'open', revealed: false };
}

/**
 * Persistence boundary. The whole UI talks to this interface and NEVER to
 * localStorage directly, so swapping in an HTTP/WebSocket backend later means
 * writing one new class — no screen changes. All methods are async on purpose,
 * so a network implementation drops straight in.
 */
export interface TournamentRepository {
  load(): Promise<TournamentState | null>;
  save(state: TournamentState): Promise<void>;
  clear(): Promise<void>;
  /** Optional: observe external mutations (other tab / another device via API). */
  subscribe?(listener: (state: TournamentState | null) => void): () => void;
}
