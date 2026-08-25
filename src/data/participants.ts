import type { GroupId, Player, PlayerId } from '../types';

/**
 * Seeded 1..8 by descending strength; split into two balanced groups (snake
 * seeding: A = 1,4,5,8 · B = 2,3,6,7). Давид снялся — вместо него Тимур (посев 4),
 * топ-4 сдвинулись вверх, места 5–8 без изменений.
 */
export const PLAYERS: Player[] = [
  { id: 'tolyan', name: 'Толян', seed: 1, group: 'A' },
  { id: 'islam', name: 'Ислам', seed: 2, group: 'B' },
  { id: 'misha', name: 'Миша', seed: 3, group: 'B' },
  { id: 'timur', name: 'Тимур', seed: 4, group: 'A' },
  { id: 'galim', name: 'Галим', seed: 5, group: 'A' },
  { id: 'isa', name: 'Иса', seed: 6, group: 'B' },
  { id: 'vanek', name: 'Ванёк', seed: 7, group: 'B' },
  { id: 'sanek', name: 'Санёк', seed: 8, group: 'A' },
];

export const PLAYERS_BY_ID: Record<PlayerId, Player> = PLAYERS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PlayerId, Player>,
);

export const GROUPS: Record<GroupId, Player[]> = {
  A: PLAYERS.filter((p) => p.group === 'A').sort((x, y) => x.seed - y.seed),
  B: PLAYERS.filter((p) => p.group === 'B').sort((x, y) => x.seed - y.seed),
};

export function playerName(id: PlayerId): string {
  return PLAYERS_BY_ID[id].name;
}

export function playerSeed(id: PlayerId): number {
  return PLAYERS_BY_ID[id].seed;
}
