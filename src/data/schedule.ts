import type { GroupId, PlayerId, Stage } from '../types';
import { GROUPS, playerSeed } from './participants';

export interface ScheduledMatch {
  id: string;
  stage: Stage;
  group?: GroupId;
  a: PlayerId; // higher seed (stronger) is always side A for display consistency
  b: PlayerId;
}

/** Deterministic id for a group match, independent of argument order. */
export function groupMatchId(group: GroupId, x: PlayerId, y: PlayerId): string {
  const [a, b] = playerSeed(x) <= playerSeed(y) ? [x, y] : [y, x];
  return `g${group}-${a}-${b}`;
}

function roundRobin(group: GroupId): ScheduledMatch[] {
  const players = GROUPS[group]; // already sorted by seed asc
  const matches: ScheduledMatch[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i].id;
      const b = players[j].id;
      matches.push({ id: groupMatchId(group, a, b), stage: 'group', group, a, b });
    }
  }
  return matches;
}

export const GROUP_MATCHES: ScheduledMatch[] = [...roundRobin('A'), ...roundRobin('B')];

// Playoff slots. Participants are filled in by logic/bracket.ts once known.
export const SF1_ID = 'sf1'; // A1 vs B2
export const SF2_ID = 'sf2'; // B1 vs A2
export const FINAL_ID = 'final';
export const THIRD_ID = 'third';
