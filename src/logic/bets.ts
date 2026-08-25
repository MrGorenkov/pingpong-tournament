import type { Bet, Outcome, PlayerId } from '../types';
import { MAX_STAKE, MIN_STAKE, POINTS_BUDGET } from '../data/rules';
import { OUTCOME_BY_ID } from '../data/odds';

/** A player betting on their own defeat (opponent to win their group match). */
export function isSelfLoss(bettor: PlayerId, outcome: Outcome): boolean {
  return outcome.category === 'group-match' && outcome.loser === bettor;
}

export function betTotal(bets: Bet[]): number {
  return bets.reduce((s, b) => s + b.points, 0);
}

export interface BetValidation {
  ok: boolean;
  error?: string;
}

export function validateStake(points: number): BetValidation {
  if (!Number.isInteger(points)) return { ok: false, error: 'Ставка — целое число очков' };
  if (points < MIN_STAKE) return { ok: false, error: `Минимум ${MIN_STAKE} очков на исход` };
  if (points > MAX_STAKE) return { ok: false, error: `Максимум ${MAX_STAKE} очков на исход` };
  return { ok: true };
}

/** Validate a bettor's whole proposed slip. */
export function validateBets(bettor: PlayerId, bets: Bet[]): BetValidation {
  let total = 0;
  for (const b of bets) {
    const o = OUTCOME_BY_ID[b.outcomeId];
    if (!o) return { ok: false, error: 'Неизвестный исход' };
    if (isSelfLoss(bettor, o)) return { ok: false, error: 'Нельзя ставить на собственное поражение' };
    const v = validateStake(b.points);
    if (!v.ok) return v;
    total += b.points;
  }
  if (total > POINTS_BUDGET) {
    return { ok: false, error: `Всего не больше ${POINTS_BUDGET} очков (сейчас ${total})` };
  }
  return { ok: true };
}
