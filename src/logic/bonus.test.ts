import { describe, expect, it } from 'vitest';
import type { SetScore, TournamentState } from '../types';
import { FINAL_ID, GROUP_MATCHES, SF1_ID, SF2_ID, THIRD_ID } from '../data/schedule';
import { buildView } from './tournament';
import { computeBonuses } from './bonus';

function emptyState(): TournamentState {
  return { version: 1, results: {}, bets: {}, line: 'closed', revealed: false };
}

const aWin2: SetScore[] = [{ a: 11, b: 0 }, { a: 11, b: 0 }];
const aWin3: SetScore[] = [{ a: 11, b: 0 }, { a: 11, b: 0 }, { a: 11, b: 0 }];

describe('computeBonuses', () => {
  it('awards 30 points per seed position for an upset', () => {
    const st = emptyState();
    // sanek (8) beats tolyan (1): +30 x 7 = 210
    st.results['gA-tolyan-sanek'] = { sets: [{ a: 2, b: 11 }, { a: 2, b: 11 }] };
    const b = computeBonuses(buildView(st));
    expect(b.points.sanek).toBe(210);
    expect(b.points.tolyan).toBe(0);
    expect(b.items.sanek.some((i) => i.points === 210)).toBe(true);
  });

  it('awards placement bonuses 150 / 80 / 40 to champion / runner-up / third', () => {
    const st = emptyState();
    // every higher seed wins -> deterministic bracket, zero upsets
    for (const m of GROUP_MATCHES) st.results[m.id] = { sets: aWin2 };
    for (const id of [SF1_ID, SF2_ID, FINAL_ID, THIRD_ID]) st.results[id] = { sets: aWin3 };
    const view = buildView(st);
    expect(view.champion).toBe('tolyan');
    expect(view.finalStandings.slice(0, 4)).toEqual(['tolyan', 'islam', 'misha', 'timur']);
    const b = computeBonuses(view);
    expect(b.points.tolyan).toBe(150);
    expect(b.points.islam).toBe(80);
    expect(b.points.misha).toBe(40);
    expect(b.points.timur).toBe(0);
  });
});
