import type { GroupId, Outcome, PlayerId, SpecialKind } from '../types';
import { playerName } from './participants';
import { groupMatchId } from './schedule';

// ============================================================================
// The betting line, hard-coded as data. Odds are POINT multipliers (not rubles).
// Миха снялся -> играем всемером: группа A = четвёрка, группа B = тройка.
// Матчевые кэфы едут по посеву; кэфы «выхода из группы B» пересчитаны под троих
// (из тройки выходят двое, поэтому шансы выше).
// ============================================================================

/** [favorite, underdog, favOdds, dogOdds] — the favorite (higher seed) wins. */
type MatchOdds = [PlayerId, PlayerId, number, number];

const GROUP_A_MATCH_ODDS: MatchOdds[] = [
  ['tolyan', 'timur', 1.22, 4.2], // 1 vs 4
  ['tolyan', 'galim', 1.16, 5.5], // 1 vs 5
  ['tolyan', 'sanek', 1.12, 8.0], // 1 vs 8
  ['timur', 'galim', 1.55, 2.35], // 4 vs 5
  ['timur', 'sanek', 1.16, 5.5], // 4 vs 8
  ['galim', 'sanek', 1.22, 4.2], // 5 vs 8
];

// Group B is a 3-player round robin (Ислам 2, Миша 3, Ванёк 7).
const GROUP_B_MATCH_ODDS: MatchOdds[] = [
  ['islam', 'misha', 1.55, 2.35], // 2 vs 3
  ['islam', 'vanek', 1.14, 6.5], // 2 vs 7
  ['misha', 'vanek', 1.16, 5.5], // 3 vs 7
];

const GROUP_EXIT_ODDS: [PlayerId, number][] = [
  // group A (4 players, top 2 advance)
  ['tolyan', 1.08],
  ['timur', 1.55],
  ['galim', 2.5],
  ['sanek', 8.0],
  // group B (3 players, top 2 advance -> only one is eliminated)
  ['islam', 1.06],
  ['misha', 1.22],
  ['vanek', 2.2],
];

const REACH_FINAL_ODDS: [PlayerId, number][] = [
  ['tolyan', 1.55],
  ['islam', 2.1],
  ['misha', 2.9],
  ['timur', 3.8],
  ['galim', 7.0],
  ['vanek', 6.5],
  ['sanek', 8.0],
];

const CHAMPION_ODDS: [PlayerId, number][] = [
  ['tolyan', 2.4],
  ['islam', 4.2],
  ['misha', 5.5],
  ['timur', 6.5],
  ['galim', 7.5],
  ['vanek', 8.0],
  ['sanek', 8.0],
];

const SPECIAL_ODDS: { kind: SpecialKind; odds: number; label: string; sub?: string }[] = [
  { kind: 'final-tolyan-islam', odds: 3.5, label: 'Финал: Толян – Ислам', sub: 'оба выходят в финал' },
  { kind: 'tolyan-group-sweep', odds: 1.5, label: 'Толян пройдёт группу без поражений' },
  { kind: 'tolyan-no-set-lost', odds: 4.5, label: 'Толян не отдаст ни одной партии', sub: 'за весь турнир' },
  { kind: 'bottom4-in-top4', odds: 1.65, label: 'Кто-то снизу посева (5, 7, 8) в топ-4' },
  { kind: 'vanek-or-sanek-wins', odds: 1.55, label: 'Ванёк или Санёк возьмёт хотя бы один матч' },
  { kind: 'upset-3plus', odds: 2.2, label: 'Будет апсет с разницей 3+ позиции' },
  { kind: 'sanek-not-last', odds: 3.0, label: 'Санёк не останется последним' },
  { kind: 'final-3-0', odds: 3.5, label: 'Финал завершится 3:0' },
  { kind: 'final-3-1', odds: 2.8, label: 'Финал завершится 3:1' },
  { kind: 'final-3-2', odds: 3.2, label: 'Финал завершится 3:2' },
];

function matchOutcomes(group: GroupId, rows: MatchOdds[]): Outcome[] {
  const out: Outcome[] = [];
  for (const [fav, dog, favOdds, dogOdds] of rows) {
    const matchId = groupMatchId(group, fav, dog);
    out.push({
      id: `m:${matchId}:${fav}`,
      category: 'group-match',
      group,
      matchId,
      winner: fav,
      loser: dog,
      odds: favOdds,
      label: `${playerName(fav)} обыграет ${playerName(dog)}`,
    });
    out.push({
      id: `m:${matchId}:${dog}`,
      category: 'group-match',
      group,
      matchId,
      winner: dog,
      loser: fav,
      odds: dogOdds,
      label: `${playerName(dog)} обыграет ${playerName(fav)}`,
    });
  }
  return out;
}

export const OUTCOMES: Outcome[] = [
  ...matchOutcomes('A', GROUP_A_MATCH_ODDS),
  ...matchOutcomes('B', GROUP_B_MATCH_ODDS),
  ...GROUP_EXIT_ODDS.map(
    ([player, odds]): Outcome => ({
      id: `exit:${player}`,
      category: 'group-exit',
      player,
      odds,
      label: `${playerName(player)} — выход из группы`,
    }),
  ),
  ...REACH_FINAL_ODDS.map(
    ([player, odds]): Outcome => ({
      id: `final:${player}`,
      category: 'reach-final',
      player,
      odds,
      label: `${playerName(player)} — выход в финал`,
    }),
  ),
  ...CHAMPION_ODDS.map(
    ([player, odds]): Outcome => ({
      id: `champ:${player}`,
      category: 'champion',
      player,
      odds,
      label: `${playerName(player)} — чемпион`,
    }),
  ),
  ...SPECIAL_ODDS.map(
    ({ kind, odds, label, sub }): Outcome => ({
      id: `sp:${kind}`,
      category: 'special',
      special: kind,
      odds,
      label,
      sub,
    }),
  ),
];

export const OUTCOME_BY_ID: Record<string, Outcome> = OUTCOMES.reduce(
  (acc, o) => {
    acc[o.id] = o;
    return acc;
  },
  {} as Record<string, Outcome>,
);

export const CATEGORY_TITLES: Record<Outcome['category'], string> = {
  'group-match': 'Матчи в группах',
  'group-exit': 'Выход из группы',
  'reach-final': 'Выход в финал',
  champion: 'Чемпион турнира',
  special: 'Спецставки',
};
