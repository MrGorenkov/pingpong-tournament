// ============================================================================
// Core domain types. The persisted state is intentionally minimal (just the
// raw facts a human enters); everything else is derived by pure functions in
// src/logic/*. That keeps the "source of truth" tiny and swap-to-API friendly.
// ============================================================================

export type PlayerId =
  | 'david'
  | 'tolyan'
  | 'islam'
  | 'misha'
  | 'galim'
  | 'isa'
  | 'vanek'
  | 'sanek';

export type GroupId = 'A' | 'B';

export interface Player {
  id: PlayerId;
  name: string;
  seed: number; // 1 = strongest .. 8 = weakest
  group: GroupId;
}

export type Stage = 'group' | 'semifinal' | 'final' | 'third';

/** One game inside a match. `a`/`b` are points won by match side A / side B. */
export interface SetScore {
  a: number;
  b: number;
}

/** Persisted result of a single match, keyed by matchId. */
export interface MatchResult {
  sets: SetScore[];
  /** Admin marked the match as not played. Bets on it settle at odds 1.0. */
  voided?: boolean;
}

// ----- betting -----------------------------------------------------------

export interface Bet {
  outcomeId: string;
  points: number; // MIN_STAKE..MAX_STAKE
}

export type LineStatus = 'open' | 'closed';

/**
 * The whole persisted state. Version-stamped for forward migration.
 * `results` and `bets` are sparse: absence means "not entered yet".
 */
export interface TournamentState {
  version: 1;
  results: Record<string, MatchResult>;
  bets: Partial<Record<PlayerId, Bet[]>>;
  line: LineStatus;
  /** true once the dramatic bet reveal has been shown at least once */
  revealed: boolean;
}

// ----- betting line (data/odds.ts) --------------------------------------

export type OutcomeCategory =
  | 'group-match'
  | 'group-exit'
  | 'reach-final'
  | 'champion'
  | 'special';

export type SpecialKind =
  | 'final-david-tolyan'
  | 'david-group-sweep'
  | 'david-no-set-lost'
  | 'bottom4-in-top4'
  | 'vanek-or-sanek-wins'
  | 'upset-3plus'
  | 'sanek-not-last'
  | 'final-3-0'
  | 'final-3-1'
  | 'final-3-2';

interface OutcomeBase {
  id: string;
  odds: number;
  label: string;
  sub?: string;
}

export type Outcome =
  | (OutcomeBase & {
      category: 'group-match';
      group: GroupId;
      matchId: string;
      winner: PlayerId;
      loser: PlayerId;
    })
  | (OutcomeBase & { category: 'group-exit'; player: PlayerId })
  | (OutcomeBase & { category: 'reach-final'; player: PlayerId })
  | (OutcomeBase & { category: 'champion'; player: PlayerId })
  | (OutcomeBase & { category: 'special'; special: SpecialKind });

export type OutcomeStatus = 'won' | 'lost' | 'pending' | 'void';

// ----- derived views (logic/*) ------------------------------------------

export type MatchStatus = 'pending' | 'live' | 'complete' | 'void';

export interface MatchView {
  id: string;
  stage: Stage;
  group?: GroupId;
  a: PlayerId | null;
  b: PlayerId | null;
  sets: SetScore[];
  status: MatchStatus;
  setsA: number;
  setsB: number;
  winner: PlayerId | null;
  loser: PlayerId | null;
  /** sets required to win the match (2 in group, 3 in playoff) */
  target: number;
  /** short label used in the "not played yet" bracket slots */
  aLabel?: string;
  bLabel?: string;
}

export interface StandingRow {
  playerId: PlayerId;
  rank: number; // 1..4 within the group (once meaningful)
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  pointsWon: number;
  pointsLost: number;
  pointDiff: number;
  qualified: boolean; // top two
}

export interface BracketView {
  semifinals: [MatchView, MatchView]; // [A1 vs B2, B1 vs A2]
  final: MatchView;
  third: MatchView;
}

export interface TournamentView {
  players: Record<PlayerId, Player>;
  playerList: Player[];
  groupMatches: MatchView[];
  matchById: Record<string, MatchView>;
  standings: Record<GroupId, StandingRow[]>;
  groupComplete: Record<GroupId, boolean>;
  qualifiers: Record<GroupId, [PlayerId, PlayerId] | null>;
  bracket: BracketView;
  allMatches: MatchView[];
  /** places 1..8 (index 0 = champion); null where not yet decided */
  finalStandings: (PlayerId | null)[];
  nextMatch: MatchView | null;
  tournamentComplete: boolean;
  champion: PlayerId | null;
}
