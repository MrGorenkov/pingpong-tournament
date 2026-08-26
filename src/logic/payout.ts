import type { Bet, PlayerId, TournamentView } from '../types';
import { BANK_RUB, PLAYER_COUNT, REFUND_EACH_RUB, VOID_ODDS } from '../data/rules';
import { PLAYERS, playerSeed } from '../data/participants';
import { OUTCOME_BY_ID } from '../data/odds';
import { resolveOutcome } from './outcomes';
import { computeBonuses, type BonusItem } from './bonus';

export interface LeaderboardEntry {
  playerId: PlayerId;
  bettingPoints: number;
  bonusPoints: number;
  bonusItems: BonusItem[];
  totalPoints: number;
  share: number; // fraction of the bank
  rub: number; // whole rubles, guaranteed to sum to BANK_RUB
}

export interface PayoutResult {
  entries: LeaderboardEntry[];
  totalPoints: number;
  bank: number;
  refundMode: boolean;
  lastPlace: PlayerId | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Split `total` across `weights` as whole integers that sum EXACTLY to `total`
 * (largest-remainder method). Zero-weight entries always receive 0.
 */
export function distribute(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / sum) * total);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const result = floors.slice();
  for (let k = 0; k < byFrac.length && remainder > 0; k++) {
    result[byFrac[k].i] += 1;
    remainder -= 1;
  }
  return result;
}

/**
 * The whole totalizator. `points = winning bets (stake x odds) + result bonuses`,
 * and each player's cut of the fixed 800-rub bank is proportional to their points.
 * Edge A (nobody has points) refunds 100 rub each; edge B (only one has points)
 * falls out of the proportional formula automatically. Always sums to 800.
 */
export function computePayout(view: TournamentView, bets: Partial<Record<PlayerId, Bet[]>>): PayoutResult {
  const bonuses = computeBonuses(view);

  const betting = {} as Record<PlayerId, number>;
  const total = {} as Record<PlayerId, number>;
  for (const p of PLAYERS) {
    let pts = 0;
    for (const b of bets[p.id] ?? []) {
      const o = OUTCOME_BY_ID[b.outcomeId];
      if (!o) continue;
      const status = resolveOutcome(o, view);
      if (status === 'won') pts += b.points * o.odds;
      else if (status === 'void') pts += b.points * VOID_ODDS;
    }
    betting[p.id] = pts;
    total[p.id] = pts + bonuses.points[p.id];
  }

  const totalPoints = PLAYERS.reduce((s, p) => s + total[p.id], 0);
  const refundMode = totalPoints <= 1e-9;

  const rub = {} as Record<PlayerId, number>;
  if (refundMode) {
    for (const p of PLAYERS) rub[p.id] = REFUND_EACH_RUB;
  } else {
    const split = distribute(
      PLAYERS.map((p) => total[p.id]),
      BANK_RUB,
    );
    PLAYERS.forEach((p, i) => {
      rub[p.id] = split[i];
    });
  }

  const entries: LeaderboardEntry[] = PLAYERS.map((p) => ({
    playerId: p.id,
    bettingPoints: round2(betting[p.id]),
    bonusPoints: bonuses.points[p.id],
    bonusItems: bonuses.items[p.id],
    totalPoints: round2(total[p.id]),
    share: refundMode ? 1 / PLAYER_COUNT : total[p.id] / totalPoints,
    rub: rub[p.id],
  }));

  entries.sort(
    (x, y) =>
      y.rub - x.rub ||
      y.totalPoints - x.totalPoints ||
      playerSeed(x.playerId) - playerSeed(y.playerId),
  );

  return {
    entries,
    totalPoints: round2(totalPoints),
    bank: BANK_RUB,
    refundMode,
    lastPlace: view.finalStandings[PLAYER_COUNT - 1] ?? null,
  };
}
