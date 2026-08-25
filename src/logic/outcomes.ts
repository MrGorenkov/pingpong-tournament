import type { GroupId, MatchView, Outcome, OutcomeStatus, PlayerId, SpecialKind, TournamentView } from '../types';

// --- small helpers -------------------------------------------------------

function finalistsOf(view: TournamentView): PlayerId[] | null {
  const [sf1, sf2] = view.bracket.semifinals;
  if (sf1.status === 'complete' && sf2.status === 'complete' && sf1.winner && sf2.winner) {
    return [sf1.winner, sf2.winner];
  }
  return null;
}

function semifinalOf(view: TournamentView, player: PlayerId): MatchView | undefined {
  return view.bracket.semifinals.find((m) => m.a === player || m.b === player);
}

/** True once `player` can no longer reach the final. */
function outOfFinal(view: TournamentView, player: PlayerId): boolean {
  const g: GroupId = view.players[player].group;
  if (!view.groupComplete[g]) return false;
  const q = view.qualifiers[g];
  if (q && !q.includes(player)) return true; // did not qualify
  const semi = semifinalOf(view, player);
  if (semi && semi.status === 'complete' && semi.winner !== player) return true; // lost the semi
  return false;
}

function tolyanSetsLost(view: TournamentView): number {
  let lost = 0;
  for (const m of view.allMatches) {
    if (m.status !== 'complete') continue;
    if (m.a === 'tolyan') lost += m.setsB;
    else if (m.b === 'tolyan') lost += m.setsA;
  }
  return lost;
}

function finalScore(view: TournamentView, loserSets: number): OutcomeStatus {
  const f = view.bracket.final;
  if (f.status !== 'complete') return 'pending';
  const hi = Math.max(f.setsA, f.setsB);
  const lo = Math.min(f.setsA, f.setsB);
  return hi === 3 && lo === loserSets ? 'won' : 'lost';
}

const BOTTOM_FOUR: PlayerId[] = ['galim', 'isa', 'vanek', 'sanek'];

function resolveSpecial(kind: SpecialKind, view: TournamentView): OutcomeStatus {
  switch (kind) {
    case 'final-tolyan-islam': {
      const finalists = finalistsOf(view);
      if (finalists) {
        const set = new Set(finalists);
        return set.has('tolyan') && set.has('islam') ? 'won' : 'lost';
      }
      if (outOfFinal(view, 'tolyan') || outOfFinal(view, 'islam')) return 'lost';
      return 'pending';
    }
    case 'tolyan-group-sweep': {
      const gm = view.groupMatches.filter((m) => m.a === 'tolyan' || m.b === 'tolyan');
      if (gm.some((m) => m.status === 'complete' && m.winner !== 'tolyan')) return 'lost';
      if (!view.groupComplete.A) return 'pending';
      const wonAllPlayed = gm
        .filter((m) => m.status === 'complete')
        .every((m) => m.winner === 'tolyan');
      const q = view.qualifiers.A;
      return wonAllPlayed && !!q && q.includes('tolyan') ? 'won' : 'lost';
    }
    case 'tolyan-no-set-lost': {
      if (tolyanSetsLost(view) > 0) return 'lost';
      if (view.bracket.final.status === 'complete') return 'won';
      return 'pending';
    }
    case 'bottom4-in-top4': {
      if (!view.groupComplete.A || !view.groupComplete.B) return 'pending';
      const quals = [...(view.qualifiers.A ?? []), ...(view.qualifiers.B ?? [])];
      return quals.some((p) => BOTTOM_FOUR.includes(p)) ? 'won' : 'lost';
    }
    case 'vanek-or-sanek-wins': {
      const involved = view.allMatches.filter(
        (m) => m.a === 'vanek' || m.b === 'vanek' || m.a === 'sanek' || m.b === 'sanek',
      );
      if (involved.some((m) => m.status === 'complete' && (m.winner === 'vanek' || m.winner === 'sanek'))) {
        return 'won';
      }
      if (involved.some((m) => m.status === 'pending' || m.status === 'live')) return 'pending';
      if (!view.groupComplete.A || !view.groupComplete.B) return 'pending';
      return 'lost';
    }
    case 'upset-3plus': {
      const any = view.allMatches.some(
        (m) =>
          m.status === 'complete' &&
          m.winner &&
          m.loser &&
          view.players[m.winner].seed - view.players[m.loser].seed >= 3,
      );
      if (any) return 'won';
      return view.tournamentComplete ? 'lost' : 'pending';
    }
    case 'sanek-not-last': {
      if (!view.groupComplete.A || !view.groupComplete.B) return 'pending';
      const last = view.finalStandings[7];
      if (!last) return 'pending';
      return last === 'sanek' ? 'lost' : 'won';
    }
    case 'final-3-0':
      return finalScore(view, 0);
    case 'final-3-1':
      return finalScore(view, 1);
    case 'final-3-2':
      return finalScore(view, 2);
  }
}

/**
 * Resolve a single betting outcome against the current tournament view.
 * 'void' is only ever returned for a group match an admin marked as not played
 * (it then settles at odds 1.0 in the payout).
 */
export function resolveOutcome(o: Outcome, view: TournamentView): OutcomeStatus {
  switch (o.category) {
    case 'group-match': {
      const m = view.matchById[o.matchId];
      if (!m) return 'pending';
      if (m.status === 'void') return 'void';
      if (m.status !== 'complete') return 'pending';
      return m.winner === o.winner ? 'won' : 'lost';
    }
    case 'group-exit': {
      const g = view.players[o.player].group;
      if (!view.groupComplete[g]) return 'pending';
      const q = view.qualifiers[g];
      return q && q.includes(o.player) ? 'won' : 'lost';
    }
    case 'reach-final': {
      const finalists = finalistsOf(view);
      if (finalists) return finalists.includes(o.player) ? 'won' : 'lost';
      if (outOfFinal(view, o.player)) return 'lost';
      return 'pending';
    }
    case 'champion': {
      const f = view.bracket.final;
      if (f.status === 'complete') return f.winner === o.player ? 'won' : 'lost';
      const finalists = finalistsOf(view);
      if (finalists && !finalists.includes(o.player)) return 'lost';
      if (!finalists && outOfFinal(view, o.player)) return 'lost';
      return 'pending';
    }
    case 'special':
      return resolveSpecial(o.special, view);
  }
}
