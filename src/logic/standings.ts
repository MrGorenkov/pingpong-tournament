import type { MatchView, Player, PlayerId, StandingRow } from '../types';
import { playerSeed } from '../data/participants';
import { pointTotals } from './setScore';

// ============================================================================
// Group standings + tiebreaks. This is a PURE function of (players, matches)
// and is the single most bug-prone spot in the app, so it is small, explicit,
// and heavily unit-tested (standings.test.ts).
//
// Ranking order:
//   0. overall matches WON (primary)
//   -- tiebreak among players equal on wins, per the spec:
//   1. head-to-head / mini-table wins among the tied players
//   2. set difference within the mini-table (matches among the tied players)
//   3. point difference within the mini-table
//   4. overall set difference          (safety net if the mini-table is a wash)
//   5. overall point difference
//   6. seed (deterministic final fallback)
//
// A 3-way tie on wins can only be (2,1,0) -> resolved by mini-wins, or a
// (1,1,1) cycle -> resolved by mini set/point difference. A 2-way tie is
// resolved by their single head-to-head unless that match was never played.
// ============================================================================

interface Agg {
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
}

function emptyAgg(): Agg {
  return { played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 };
}

function aggregate(players: Player[], matches: MatchView[]): Record<PlayerId, Agg> {
  const agg = {} as Record<PlayerId, Agg>;
  for (const p of players) agg[p.id] = emptyAgg();
  for (const m of matches) {
    if (m.status !== 'complete' || !m.a || !m.b || !m.winner || !m.loser) continue;
    if (!(m.a in agg) || !(m.b in agg)) continue; // only matches within this group
    agg[m.a].played++;
    agg[m.b].played++;
    agg[m.winner].wins++;
    agg[m.loser].losses++;
    agg[m.a].setsWon += m.setsA;
    agg[m.a].setsLost += m.setsB;
    agg[m.b].setsWon += m.setsB;
    agg[m.b].setsLost += m.setsA;
    const pts = pointTotals(m.sets);
    agg[m.a].pointsWon += pts.a;
    agg[m.a].pointsLost += pts.b;
    agg[m.b].pointsWon += pts.b;
    agg[m.b].pointsLost += pts.a;
  }
  return agg;
}

interface MiniStat {
  wins: number;
  setDiff: number;
  pointDiff: number;
}

function miniTable(tied: PlayerId[], matches: MatchView[]): Record<PlayerId, MiniStat> {
  const inTie = new Set<PlayerId>(tied);
  const mini = {} as Record<PlayerId, MiniStat>;
  for (const id of tied) mini[id] = { wins: 0, setDiff: 0, pointDiff: 0 };
  for (const m of matches) {
    if (m.status !== 'complete' || !m.a || !m.b || !m.winner) continue;
    if (!inTie.has(m.a) || !inTie.has(m.b)) continue; // only matches among the tied set
    mini[m.winner].wins++;
    const setDiff = m.setsA - m.setsB;
    mini[m.a].setDiff += setDiff;
    mini[m.b].setDiff -= setDiff;
    const pts = pointTotals(m.sets);
    const pointDiff = pts.a - pts.b;
    mini[m.a].pointDiff += pointDiff;
    mini[m.b].pointDiff -= pointDiff;
  }
  return mini;
}

function orderTied(
  cluster: Player[],
  matches: MatchView[],
  agg: Record<PlayerId, Agg>,
): Player[] {
  if (cluster.length <= 1) return cluster;
  const mini = miniTable(
    cluster.map((p) => p.id),
    matches,
  );
  return [...cluster].sort((x, y) => {
    const mx = mini[x.id];
    const my = mini[y.id];
    if (my.wins !== mx.wins) return my.wins - mx.wins; // (1) head-to-head
    if (my.setDiff !== mx.setDiff) return my.setDiff - mx.setDiff; // (2) mini set diff
    if (my.pointDiff !== mx.pointDiff) return my.pointDiff - mx.pointDiff; // (3) mini point diff
    const ax = agg[x.id];
    const ay = agg[y.id];
    const sdx = ax.setsWon - ax.setsLost;
    const sdy = ay.setsWon - ay.setsLost;
    if (sdy !== sdx) return sdy - sdx; // (4) overall set diff
    const pdx = ax.pointsWon - ax.pointsLost;
    const pdy = ay.pointsWon - ay.pointsLost;
    if (pdy !== pdx) return pdy - pdx; // (5) overall point diff
    return playerSeed(x.id) - playerSeed(y.id); // (6) deterministic
  });
}

export function computeStandings(players: Player[], matches: MatchView[]): StandingRow[] {
  const agg = aggregate(players, matches);

  // cluster by overall wins, descending
  const clusters = new Map<number, Player[]>();
  for (const p of players) {
    const w = agg[p.id].wins;
    const bucket = clusters.get(w);
    if (bucket) bucket.push(p);
    else clusters.set(w, [p]);
  }
  const winLevels = [...clusters.keys()].sort((a, b) => b - a);

  const ordered: Player[] = [];
  for (const w of winLevels) {
    ordered.push(...orderTied(clusters.get(w)!, matches, agg));
  }

  return ordered.map((p, idx) => {
    const a = agg[p.id];
    return {
      playerId: p.id,
      rank: idx + 1,
      played: a.played,
      wins: a.wins,
      losses: a.losses,
      setsWon: a.setsWon,
      setsLost: a.setsLost,
      setDiff: a.setsWon - a.setsLost,
      pointsWon: a.pointsWon,
      pointsLost: a.pointsLost,
      pointDiff: a.pointsWon - a.pointsLost,
      qualified: idx < 2,
    };
  });
}
