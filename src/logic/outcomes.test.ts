import { describe, expect, it } from 'vitest';
import type { SetScore, TournamentState } from '../types';
import { FINAL_ID, GROUP_MATCHES, SF1_ID, SF2_ID, THIRD_ID } from '../data/schedule';
import { OUTCOME_BY_ID } from '../data/odds';
import { buildView } from './tournament';
import { resolveOutcome } from './outcomes';
import { isSelfLoss } from './bets';

function emptyState(): TournamentState {
  return { version: 1, results: {}, bets: {}, line: 'closed', revealed: false };
}
const aWin2: SetScore[] = [{ a: 11, b: 0 }, { a: 11, b: 0 }];
const aWin3: SetScore[] = [{ a: 11, b: 0 }, { a: 11, b: 0 }, { a: 11, b: 0 }];

function fullFavoriteState(): TournamentState {
  const st = emptyState();
  for (const m of GROUP_MATCHES) st.results[m.id] = { sets: aWin2 };
  for (const id of [SF1_ID, SF2_ID, FINAL_ID, THIRD_ID]) st.results[id] = { sets: aWin3 };
  return st;
}
const R = (id: string, st: TournamentState) => resolveOutcome(OUTCOME_BY_ID[id], buildView(st));

describe('resolveOutcome', () => {
  it('resolves group-match outcomes, including voids', () => {
    const st = emptyState();
    st.results['gA-tolyan-sanek'] = { sets: [{ a: 11, b: 2 }, { a: 11, b: 2 }] };
    st.results['gA-tolyan-galim'] = { sets: [], voided: true };
    expect(R('m:gA-tolyan-sanek:tolyan', st)).toBe('won');
    expect(R('m:gA-tolyan-sanek:sanek', st)).toBe('lost');
    expect(R('m:gA-tolyan-galim:tolyan', st)).toBe('void');
    expect(R('m:gA-tolyan-timur:tolyan', st)).toBe('pending');
  });

  it('resolves group-exit only once the group is complete', () => {
    const partial = emptyState();
    partial.results['gA-tolyan-sanek'] = { sets: aWin2 };
    expect(R('exit:tolyan', partial)).toBe('pending');

    const st = fullFavoriteState();
    expect(R('exit:tolyan', st)).toBe('won'); // A1
    expect(R('exit:timur', st)).toBe('won'); // A2
    expect(R('exit:galim', st)).toBe('lost');
    expect(R('exit:sanek', st)).toBe('lost');
  });

  it('resolves champion, reach-final and the final-score specials', () => {
    const st = fullFavoriteState();
    expect(R('champ:tolyan', st)).toBe('won');
    expect(R('champ:islam', st)).toBe('lost');
    expect(R('final:tolyan', st)).toBe('won');
    expect(R('final:islam', st)).toBe('won');
    expect(R('final:misha', st)).toBe('lost');
    expect(R('sp:final-3-0', st)).toBe('won');
    expect(R('sp:final-3-1', st)).toBe('lost');
    expect(R('sp:final-tolyan-islam', st)).toBe('won');
  });

  it('resolves specials that hinge on upsets and last place', () => {
    const favs = fullFavoriteState();
    expect(R('sp:upset-3plus', favs)).toBe('lost');
    expect(R('sp:bottom4-in-top4', favs)).toBe('lost');
    expect(R('sp:sanek-not-last', favs)).toBe('lost'); // sanek is last

    const upset = emptyState();
    upset.results['gA-tolyan-sanek'] = { sets: [{ a: 2, b: 11 }, { a: 2, b: 11 }] };
    expect(R('sp:upset-3plus', upset)).toBe('won');
    expect(R('sp:vanek-or-sanek-wins', upset)).toBe('won');
  });

  it('blocks betting on your own defeat', () => {
    // "sanek beats tolyan" -> tolyan would be backing his own loss
    expect(isSelfLoss('tolyan', OUTCOME_BY_ID['m:gA-tolyan-sanek:sanek'])).toBe(true);
    expect(isSelfLoss('sanek', OUTCOME_BY_ID['m:gA-tolyan-sanek:sanek'])).toBe(false);
    expect(isSelfLoss('misha', OUTCOME_BY_ID['m:gA-tolyan-sanek:sanek'])).toBe(false);
    expect(isSelfLoss('tolyan', OUTCOME_BY_ID['champ:islam'])).toBe(false);
  });
});
