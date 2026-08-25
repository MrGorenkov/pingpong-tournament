import { describe, expect, it } from 'vitest';
import type { MatchView, Player, PlayerId, SetScore } from '../types';
import { GROUP_SETS_TO_WIN } from '../data/rules';
import { GROUPS } from '../data/participants';
import { tallyMatch } from './setScore';
import { computeStandings } from './standings';

const A: Player[] = GROUPS.A; // tolyan(1), timur(4), galim(5), sanek(8)

/** Build a completed MatchView from a scoreline like [[11,9],[11,7]]. */
function mv(a: PlayerId, b: PlayerId, scoreline: [number, number][]): MatchView {
  const sets: SetScore[] = scoreline.map(([x, y]) => ({ a: x, b: y }));
  const t = tallyMatch(sets, GROUP_SETS_TO_WIN);
  const winner = t.winnerSide === 'a' ? a : t.winnerSide === 'b' ? b : null;
  const loser = winner ? (winner === a ? b : a) : null;
  return {
    id: `${a}-${b}`,
    stage: 'group',
    group: 'A',
    a,
    b,
    sets,
    status: t.decided ? 'complete' : 'live',
    setsA: t.setsA,
    setsB: t.setsB,
    winner,
    loser,
    target: GROUP_SETS_TO_WIN,
  };
}

const order = (rows: { playerId: PlayerId }[]) => rows.map((r) => r.playerId);

describe('computeStandings', () => {
  it('ranks by wins with no ties', () => {
    const matches = [
      mv('tolyan', 'timur', [[11, 5], [11, 5]]),
      mv('tolyan', 'galim', [[11, 5], [11, 5]]),
      mv('tolyan', 'sanek', [[11, 5], [11, 5]]),
      mv('timur', 'galim', [[11, 5], [11, 5]]),
      mv('timur', 'sanek', [[11, 5], [11, 5]]),
      mv('galim', 'sanek', [[11, 5], [11, 5]]),
    ];
    const rows = computeStandings(A, matches);
    expect(order(rows)).toEqual(['tolyan', 'timur', 'galim', 'sanek']);
    expect(rows.filter((r) => r.qualified).map((r) => r.playerId)).toEqual(['tolyan', 'timur']);
    expect(rows[0].wins).toBe(3);
    expect(rows[3].wins).toBe(0);
  });

  it('empty group falls back to seed order deterministically', () => {
    const rows = computeStandings(A, []);
    expect(order(rows)).toEqual(['tolyan', 'timur', 'galim', 'sanek']);
  });

  it('breaks a two-way tie by head-to-head even against a better set/point diff', () => {
    const matches = [
      mv('tolyan', 'timur', [[11, 9], [11, 9]]), // tolyan beats timur (H2H)
      mv('tolyan', 'galim', [[11, 9], [11, 9]]),
      mv('sanek', 'tolyan', [[11, 2], [11, 2]]), // tolyan loses badly
      mv('timur', 'galim', [[11, 1], [11, 1]]), // timur crushes
      mv('timur', 'sanek', [[11, 1], [11, 1]]), // timur crushes
      mv('galim', 'sanek', [[11, 9], [11, 9]]),
    ];
    const rows = computeStandings(A, matches);
    // tolyan 2 (timur, galim), timur 2 (galim, sanek), galim 1 (sanek), sanek 1 (tolyan)
    expect(rows.find((r) => r.playerId === 'tolyan')!.wins).toBe(2);
    expect(rows.find((r) => r.playerId === 'timur')!.wins).toBe(2);
    expect(order(rows).slice(0, 2)).toEqual(['tolyan', 'timur']); // H2H wins over diff
    expect(order(rows).slice(2)).toEqual(['galim', 'sanek']); // galim beat sanek
  });

  it('breaks a three-way cycle by mini-table set difference', () => {
    const matches = [
      mv('tolyan', 'sanek', [[11, 5], [11, 5]]),
      mv('timur', 'sanek', [[11, 5], [11, 5]]),
      mv('galim', 'sanek', [[11, 5], [11, 5]]),
      mv('tolyan', 'timur', [[11, 5], [11, 5]]), // tolyan +2 sets in mini
      mv('timur', 'galim', [[11, 9], [9, 11], [11, 9]]), // timur +1 set in mini
      mv('galim', 'tolyan', [[11, 9], [9, 11], [11, 9]]), // galim +1 set in mini
    ];
    const rows = computeStandings(A, matches);
    // mini set diff: tolyan +1, galim 0, timur -1
    expect(order(rows)).toEqual(['tolyan', 'galim', 'timur', 'sanek']);
    expect(rows.filter((r) => r.qualified).map((r) => r.playerId)).toEqual(['tolyan', 'galim']);
  });

  it('breaks a three-way cycle by mini-table point difference when set diffs tie', () => {
    const matches = [
      mv('tolyan', 'sanek', [[11, 5], [11, 5]]),
      mv('timur', 'sanek', [[11, 5], [11, 5]]),
      mv('galim', 'sanek', [[11, 5], [11, 5]]),
      mv('tolyan', 'timur', [[11, 9], [9, 11], [11, 5]]), // tolyan +6 pts vs timur
      mv('timur', 'galim', [[11, 9], [9, 11], [11, 9]]), // timur +2 pts vs galim
      mv('galim', 'tolyan', [[11, 9], [9, 11], [11, 9]]), // galim +2 pts vs tolyan
    ];
    const rows = computeStandings(A, matches);
    // mini point diff: tolyan +4, galim 0, timur -4
    expect(order(rows)).toEqual(['tolyan', 'galim', 'timur', 'sanek']);
  });
});
