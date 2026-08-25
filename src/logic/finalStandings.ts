import type { BracketView, GroupId, PlayerId, StandingRow } from '../types';
import { playerSeed } from '../data/participants';

/**
 * Final places 1..8 (index 0 = champion). Nulls where not yet decided.
 *   1: final winner   2: final loser
 *   3: 3rd-place winner   4: 3rd-place loser
 *   5..8: the four group non-qualifiers, ranked by group place (3rd before
 *         4th), then set diff, point diff, wins, seed.
 */
export function computeFinalStandings(input: {
  standings: Record<GroupId, StandingRow[]>;
  groupComplete: Record<GroupId, boolean>;
  bracket: BracketView;
}): (PlayerId | null)[] {
  const { standings, groupComplete, bracket } = input;
  const places: (PlayerId | null)[] = new Array(8).fill(null);

  if (bracket.final.status === 'complete') {
    places[0] = bracket.final.winner;
    places[1] = bracket.final.loser;
  }
  if (bracket.third.status === 'complete') {
    places[2] = bracket.third.winner;
    places[3] = bracket.third.loser;
  }

  if (groupComplete.A && groupComplete.B) {
    const nonQualifiers = [standings.A[2], standings.A[3], standings.B[2], standings.B[3]].filter(
      (r): r is StandingRow => Boolean(r),
    );
    nonQualifiers.sort((x, y) => {
      if (x.rank !== y.rank) return x.rank - y.rank; // group-3rd ranks above group-4th
      if (y.setDiff !== x.setDiff) return y.setDiff - x.setDiff;
      if (y.pointDiff !== x.pointDiff) return y.pointDiff - x.pointDiff;
      if (y.wins !== x.wins) return y.wins - x.wins;
      return playerSeed(x.playerId) - playerSeed(y.playerId);
    });
    nonQualifiers.forEach((r, i) => {
      places[4 + i] = r.playerId;
    });
  }

  return places;
}
