import type { SetScore } from '../types';
import { SET_POINT_TARGET } from '../data/rules';

/**
 * Winner of a *completed, valid* set, or null. A set is won at `target` points
 * (default 11) with a margin of 2; past the target only a 2-point margin ends
 * it (deuce at 10:10 plays on).
 */
export function setWinner(s: SetScore, target = SET_POINT_TARGET): 'a' | 'b' | null {
  const { a, b } = s;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < target) return null; // nobody reached the target
  if (hi - lo < 2) return null; // must win by 2
  if (lo >= target - 1 && hi - lo !== 2) return null; // deuce: exactly +2 ends it
  return a > b ? 'a' : 'b';
}

export function isValidCompletedSet(s: SetScore, target = SET_POINT_TARGET): boolean {
  return setWinner(s, target) !== null;
}

export interface MatchTally {
  setsA: number;
  setsB: number;
  decided: boolean;
  winnerSide: 'a' | 'b' | null;
}

/** Count set wins, stopping once a side reaches `setsToWin`. */
export function tallyMatch(
  sets: SetScore[],
  setsToWin: number,
  target = SET_POINT_TARGET,
): MatchTally {
  let setsA = 0;
  let setsB = 0;
  for (const s of sets) {
    if (setsA === setsToWin || setsB === setsToWin) break;
    const w = setWinner(s, target);
    if (w === 'a') setsA++;
    else if (w === 'b') setsB++;
  }
  const decided = setsA === setsToWin || setsB === setsToWin;
  const winnerSide = !decided ? null : setsA > setsB ? 'a' : 'b';
  return { setsA, setsB, decided, winnerSide };
}

/** Points scored by each side across the valid completed sets of a match. */
export function pointTotals(sets: SetScore[], target = SET_POINT_TARGET): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const s of sets) {
    if (setWinner(s, target) === null) continue;
    a += s.a;
    b += s.b;
  }
  return { a, b };
}
