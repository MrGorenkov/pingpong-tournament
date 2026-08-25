import type { BracketView, GroupId, MatchResult, PlayerId } from '../types';
import { PLAYOFF_SETS_TO_WIN } from '../data/rules';
import { FINAL_ID, SF1_ID, SF2_ID, THIRD_ID } from '../data/schedule';
import { buildMatchView } from './match';

/**
 * Crosswise bracket:
 *   SF1 = A1 vs B2, SF2 = B1 vs A2
 *   Final = winner(SF1) vs winner(SF2)
 *   3rd   = loser(SF1)  vs loser(SF2)
 * Slots stay empty (null) until their feeders are decided.
 */
export function buildBracket(
  qualifiers: Record<GroupId, [PlayerId, PlayerId] | null>,
  results: Record<string, MatchResult>,
): BracketView {
  const a1 = qualifiers.A?.[0] ?? null;
  const a2 = qualifiers.A?.[1] ?? null;
  const b1 = qualifiers.B?.[0] ?? null;
  const b2 = qualifiers.B?.[1] ?? null;

  const sf1 = buildMatchView({
    id: SF1_ID,
    stage: 'semifinal',
    a: a1,
    b: b2,
    result: results[SF1_ID],
    target: PLAYOFF_SETS_TO_WIN,
    aLabel: '1-е место A',
    bLabel: '2-е место B',
  });
  const sf2 = buildMatchView({
    id: SF2_ID,
    stage: 'semifinal',
    a: b1,
    b: a2,
    result: results[SF2_ID],
    target: PLAYOFF_SETS_TO_WIN,
    aLabel: '1-е место B',
    bLabel: '2-е место A',
  });

  const final = buildMatchView({
    id: FINAL_ID,
    stage: 'final',
    a: sf1.winner,
    b: sf2.winner,
    result: results[FINAL_ID],
    target: PLAYOFF_SETS_TO_WIN,
    aLabel: 'Победитель 1/2 (A1–B2)',
    bLabel: 'Победитель 1/2 (B1–A2)',
  });
  const third = buildMatchView({
    id: THIRD_ID,
    stage: 'third',
    a: sf1.loser,
    b: sf2.loser,
    result: results[THIRD_ID],
    target: PLAYOFF_SETS_TO_WIN,
    aLabel: 'Проигравший 1/2 (A1–B2)',
    bLabel: 'Проигравший 1/2 (B1–A2)',
  });

  return { semifinals: [sf1, sf2], final, third };
}
