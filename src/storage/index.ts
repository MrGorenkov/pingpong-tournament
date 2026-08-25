import { LocalStorageRepository } from './localStorageRepository';
import type { TournamentRepository } from './repository';

export * from './repository';

/**
 * The single repository instance the app uses. To move to a real backend,
 * implement TournamentRepository (async HTTP calls) and swap it in here.
 */
export const repository: TournamentRepository = new LocalStorageRepository();
