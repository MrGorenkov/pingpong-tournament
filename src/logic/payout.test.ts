import { describe, expect, it } from 'vitest';
import type { Bet, MatchResult, PlayerId, SetScore, TournamentState } from '../types';
import { BANK_RUB, GROUP_SETS_TO_WIN, PLAYOFF_SETS_TO_WIN } from '../data/rules';
import { FINAL_ID, GROUP_MATCHES, SF1_ID, SF2_ID, THIRD_ID } from '../data/schedule';
import { OUTCOMES } from '../data/odds';
import { PLAYERS } from '../data/participants';
import { buildView } from './tournament';
import { computePayout, distribute } from './payout';

function emptyState(): TournamentState {
  return { version: 1, results: {}, bets: {}, line: 'closed', revealed: false };
}

// Deterministic PRNG so the invariant sweep is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randint = (rng: () => number, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

function randomResult(rng: () => number, setsToWin: number): MatchResult {
  const winnerIsA = rng() < 0.5;
  const loserSets = randint(rng, 0, setsToWin - 1);
  const seq: ('w' | 'l')[] = [];
  for (let i = 0; i < loserSets; i++) seq.push('l');
  for (let i = 0; i < setsToWin - 1; i++) seq.push('w');
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  seq.push('w'); // decisive set last
  const sets: SetScore[] = seq.map((s) => {
    const lose = randint(rng, 0, 9);
    const winSide = s === 'w' ? winnerIsA : !winnerIsA;
    return winSide ? { a: 11, b: lose } : { a: lose, b: 11 };
  });
  return { sets };
}

function randomBets(rng: () => number): Partial<Record<PlayerId, Bet[]>> {
  const bets: Partial<Record<PlayerId, Bet[]>> = {};
  for (const p of PLAYERS) {
    if (rng() < 0.3) continue;
    const list: Bet[] = [];
    const chosen = new Set<string>();
    let budget = 100;
    const n = randint(rng, 1, 4);
    for (let i = 0; i < n && budget >= 10; i++) {
      const o = OUTCOMES[randint(rng, 0, OUTCOMES.length - 1)];
      if (chosen.has(o.id)) continue;
      chosen.add(o.id);
      const maxHere = Math.min(50, budget);
      if (maxHere < 10) break;
      const pts = randint(rng, 10, maxHere);
      list.push({ outcomeId: o.id, points: pts });
      budget -= pts;
    }
    if (list.length) bets[p.id] = list;
  }
  return bets;
}

function randomState(rng: () => number): TournamentState {
  const results: Record<string, MatchResult> = {};
  for (const m of GROUP_MATCHES) {
    const r = rng();
    if (r < 0.15) continue; // pending
    if (r < 0.2) {
      results[m.id] = { sets: [], voided: true };
      continue;
    }
    results[m.id] = randomResult(rng, GROUP_SETS_TO_WIN);
  }
  let st: TournamentState = { version: 1, results, bets: {}, line: 'closed', revealed: false };
  const view = buildView(st);
  if (view.groupComplete.A && view.groupComplete.B) {
    for (const id of [SF1_ID, SF2_ID]) if (rng() < 0.85) results[id] = randomResult(rng, PLAYOFF_SETS_TO_WIN);
    const v2 = buildView({ ...st, results });
    if (v2.bracket.semifinals.every((m) => m.status === 'complete')) {
      if (rng() < 0.85) results[FINAL_ID] = randomResult(rng, PLAYOFF_SETS_TO_WIN);
      if (rng() < 0.85) results[THIRD_ID] = randomResult(rng, PLAYOFF_SETS_TO_WIN);
    }
  }
  st = { ...st, results, bets: randomBets(rng) };
  return st;
}

describe('distribute', () => {
  it('sums exactly to the target and gives zero-weights zero', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 500; i++) {
      const n = randint(rng, 1, 8);
      const weights = Array.from({ length: n }, () => (rng() < 0.2 ? 0 : rng() * 1000));
      const total = randint(rng, 0, 2000);
      const split = distribute(weights, total);
      const sum = split.reduce((a, b) => a + b, 0);
      if (weights.reduce((a, b) => a + b, 0) > 0) expect(sum).toBe(total);
      else expect(sum).toBe(0);
      weights.forEach((w, idx) => {
        if (w === 0) expect(split[idx]).toBe(0);
      });
      split.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    }
  });
});

describe('computePayout', () => {
  it('pays out exactly the 800 bank on any data (300 random tournaments)', () => {
    const rng = mulberry32(0x1234);
    for (let iter = 0; iter < 300; iter++) {
      const st = randomState(rng);
      const payout = computePayout(buildView(st), st.bets);
      const sum = payout.entries.reduce((s, e) => s + e.rub, 0);
      expect(sum).toBe(BANK_RUB);
      payout.entries.forEach((e) => {
        expect(e.rub).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(e.rub)).toBe(true);
      });
    }
  });

  it('edge A: nobody has points -> refund 100 each, sums to 800', () => {
    const payout = computePayout(buildView(emptyState()), {});
    expect(payout.refundMode).toBe(true);
    expect(payout.entries.every((e) => e.rub === 100)).toBe(true);
    expect(payout.entries.reduce((s, e) => s + e.rub, 0)).toBe(800);
  });

  it('edge B: only one player has points -> takes all 800', () => {
    const st = emptyState();
    // david (1) beats sanek (8): no upset, so no bonus muddies the pool.
    st.results['gA-david-sanek'] = { sets: [{ a: 11, b: 2 }, { a: 11, b: 2 }] };
    st.bets = { misha: [{ outcomeId: 'm:gA-david-sanek:david', points: 10 }] };
    const payout = computePayout(buildView(st), st.bets);
    expect(payout.refundMode).toBe(false);
    expect(payout.entries.find((e) => e.playerId === 'misha')!.rub).toBe(800);
    expect(payout.entries.reduce((s, e) => s + e.rub, 0)).toBe(800);
  });
});
