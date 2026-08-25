import type { GroupId, MatchResult, MatchView, PlayerId, Stage } from '../types';
import { tallyMatch } from './setScore';

/** Build a derived MatchView from a scheduled slot + its (optional) result. */
export function buildMatchView(params: {
  id: string;
  stage: Stage;
  group?: GroupId;
  a: PlayerId | null;
  b: PlayerId | null;
  result?: MatchResult;
  target: number;
  aLabel?: string;
  bLabel?: string;
}): MatchView {
  const { id, stage, group, a, b, result, target, aLabel, bLabel } = params;
  const base = { id, stage, group, a, b, target, aLabel, bLabel };

  if (result?.voided) {
    return { ...base, sets: [], status: 'void', setsA: 0, setsB: 0, winner: null, loser: null };
  }
  if (!a || !b) {
    return { ...base, sets: [], status: 'pending', setsA: 0, setsB: 0, winner: null, loser: null };
  }

  const sets = result?.sets ?? [];
  const t = tallyMatch(sets, target);
  const status: MatchView['status'] = t.decided ? 'complete' : sets.length > 0 ? 'live' : 'pending';
  const winner = t.winnerSide === 'a' ? a : t.winnerSide === 'b' ? b : null;
  const loser = winner ? (winner === a ? b : a) : null;
  return { ...base, sets, status, setsA: t.setsA, setsB: t.setsB, winner, loser };
}
