import type {
  GroupId,
  MatchView,
  PlayerId,
  StandingRow,
  TournamentState,
  TournamentView,
} from '../types';
import { GROUPS, PLAYERS, PLAYERS_BY_ID } from '../data/participants';
import { GROUP_MATCHES } from '../data/schedule';
import { GROUP_SETS_TO_WIN } from '../data/rules';
import { buildMatchView } from './match';
import { computeStandings } from './standings';
import { buildBracket } from './bracket';
import { computeFinalStandings } from './finalStandings';

const STAGE_ORDER: Record<MatchView['stage'], number> = {
  group: 0,
  semifinal: 1,
  third: 2,
  final: 3,
};

function pickNextMatch(all: MatchView[]): MatchView | null {
  const playable = all
    .filter((m) => m.a && m.b && (m.status === 'pending' || m.status === 'live'))
    .sort((x, y) => STAGE_ORDER[x.stage] - STAGE_ORDER[y.stage]);
  const live = playable.find((m) => m.status === 'live');
  return live ?? playable[0] ?? null;
}

/**
 * The single derived model everything else reads from. Pure function of the
 * persisted state — recomputed whenever the state changes.
 */
export function buildView(state: TournamentState): TournamentView {
  const groupMatches = GROUP_MATCHES.map((m) =>
    buildMatchView({
      id: m.id,
      stage: 'group',
      group: m.group,
      a: m.a,
      b: m.b,
      result: state.results[m.id],
      target: GROUP_SETS_TO_WIN,
    }),
  );

  const matchById: Record<string, MatchView> = {};
  for (const m of groupMatches) matchById[m.id] = m;

  const groupA = groupMatches.filter((m) => m.group === 'A');
  const groupB = groupMatches.filter((m) => m.group === 'B');

  const standings: Record<GroupId, StandingRow[]> = {
    A: computeStandings(GROUPS.A, groupA),
    B: computeStandings(GROUPS.B, groupB),
  };

  const groupComplete: Record<GroupId, boolean> = {
    A: groupA.every((m) => m.status === 'complete' || m.status === 'void'),
    B: groupB.every((m) => m.status === 'complete' || m.status === 'void'),
  };

  const qualifiers: Record<GroupId, [PlayerId, PlayerId] | null> = {
    A: groupComplete.A ? [standings.A[0].playerId, standings.A[1].playerId] : null,
    B: groupComplete.B ? [standings.B[0].playerId, standings.B[1].playerId] : null,
  };

  const bracket = buildBracket(qualifiers, state.results);
  for (const m of [...bracket.semifinals, bracket.final, bracket.third]) matchById[m.id] = m;

  const allMatches = [...groupMatches, ...bracket.semifinals, bracket.final, bracket.third];

  const finalStandings = computeFinalStandings({ standings, groupComplete, bracket });

  const champion = bracket.final.status === 'complete' ? bracket.final.winner : null;
  const tournamentComplete =
    groupComplete.A &&
    groupComplete.B &&
    bracket.semifinals.every((m) => m.status === 'complete') &&
    bracket.final.status === 'complete' &&
    bracket.third.status === 'complete';

  return {
    players: PLAYERS_BY_ID,
    playerList: PLAYERS,
    groupMatches,
    matchById,
    standings,
    groupComplete,
    qualifiers,
    bracket,
    allMatches,
    finalStandings,
    nextMatch: pickNextMatch(allMatches),
    tournamentComplete,
    champion,
  };
}
