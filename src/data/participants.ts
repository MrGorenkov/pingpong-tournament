import type { GroupId, Player, PlayerId } from '../types';

/** Seeded 1..8 by descending strength; split into two groups of four. */
export const PLAYERS: Player[] = [
  { id: 'david', name: 'Давид', seed: 1, group: 'A' },
  { id: 'tolyan', name: 'Толян', seed: 2, group: 'B' },
  { id: 'islam', name: 'Ислам', seed: 3, group: 'B' },
  { id: 'misha', name: 'Миша', seed: 4, group: 'A' },
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
