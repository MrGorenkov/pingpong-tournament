import { describe, expect, it } from 'vitest';
import type { MatchView, Player, PlayerId, SetScore } from '../types';
import { GROUP_SETS_TO_WIN } from '../data/rules';
import { GROUPS } from '../data/participants';
import { tallyMatch } from './setScore';
import { computeStandings } from './standings';

const A: Player[] = GROUPS.A; // david(1), misha(4), galim(5), sanek(8)

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
      mv('david', 'misha', [[11, 5], [11, 5]]),
      mv('david', 'galim', [[11, 5], [11, 5]]),
      mv('david', 'sanek', [[11, 5], [11, 5]]),
      mv('misha', 'galim', [[11, 5], [11, 5]]),
      mv('misha', 'sanek', [[11, 5], [11, 5]]),
      mv('galim', 'sanek', [[11, 5], [11, 5]]),
    ];
    const rows = computeStandings(A, matches);
    expect(order(rows)).toEqual(['david', 'misha', 'galim', 'sanek']);
    expect(rows.filter((r) => r.qualified).map((r) => r.playerId)).toEqual(['david', 'misha']);
    expect(rows[0].wins).toBe(3);
    expect(rows[3].wins).toBe(0);
  });

  it('empty group falls back to seed order deterministically', () => {
    const rows = computeStandings(A, []);
    expect(order(rows)).toEqual(['david', 'misha', 'galim', 'sanek']);
  });

  it('breaks a two-way tie by head-to-head even against a better set/point diff', () => {
    // david & misha both finish 2-1; galim & sanek both 1-2.
    // misha crushes his wins; david wins his narrowly and loses badly to sanek,
    // so misha has the better overall diff — but david beat misha head-to-head.
    const matches = [
      mv('david', 'misha', [[11, 9], [11, 9]]), // david beats misha (H2H)
      mv('david', 'galim', [[11, 9], [11, 9]]),
      mv('sanek', 'david', [[11, 2], [11, 2]]), // david loses badly
      mv('misha', 'galim', [[11, 1], [11, 1]]), // misha crushes
      mv('misha', 'sanek', [[11, 1], [11, 1]]), // misha crushes
      mv('galim', 'sanek', [[11, 9], [11, 9]]),
    ];
    const rows = computeStandings(A, matches);
    // david 2 (misha, galim), misha 2 (galim, sanek), galim 1 (sanek), sanek 1 (david)
    expect(rows.find((r) => r.playerId === 'david')!.wins).toBe(2);
    expect(rows.find((r) => r.playerId === 'misha')!.wins).toBe(2);
    expect(order(rows).slice(0, 2)).toEqual(['david', 'misha']); // H2H wins over diff
    expect(order(rows).slice(2)).toEqual(['galim', 'sanek']); // galim beat sanek
  });

  it('breaks a three-way cycle by mini-table set difference', () => {
    const matches = [
      // everyone beats sanek -> david/misha/galim all reach 2 wins
      mv('david', 'sanek', [[11, 5], [11, 5]]),
      mv('misha', 'sanek', [[11, 5], [11, 5]]),
      mv('galim', 'sanek', [[11, 5], [11, 5]]),
      // cycle among the three
      mv('david', 'misha', [[11, 5], [11, 5]]), // david +2 sets in mini
      mv('misha', 'galim', [[11, 9], [9, 11], [11, 9]]), // misha +1 set in mini
      mv('galim', 'david', [[11, 9], [9, 11], [11, 9]]), // galim +1 set in mini
    ];
    const rows = computeStandings(A, matches);
    // mini set diff: david +1, galim 0, misha -1
    expect(order(rows)).toEqual(['david', 'galim', 'misha', 'sanek']);
    expect(rows.filter((r) => r.qualified).map((r) => r.playerId)).toEqual(['david', 'galim']);
  });

  it('breaks a three-way cycle by mini-table point difference when set diffs tie', () => {
    const matches = [
      mv('david', 'sanek', [[11, 5], [11, 5]]),
      mv('misha', 'sanek', [[11, 5], [11, 5]]),
      mv('galim', 'sanek', [[11, 5], [11, 5]]),
      // cycle, each 2-1 -> every mini set diff is 0, so points decide
      mv('david', 'misha', [[11, 9], [9, 11], [11, 5]]), // david +6 pts vs misha
      mv('misha', 'galim', [[11, 9], [9, 11], [11, 9]]), // misha +2 pts vs galim
      mv('galim', 'david', [[11, 9], [9, 11], [11, 9]]), // galim +2 pts vs david
    ];
    const rows = computeStandings(A, matches);
    // mini point diff: david +4, galim 0, misha -4
    expect(order(rows)).toEqual(['david', 'galim', 'misha', 'sanek']);
  });
});
