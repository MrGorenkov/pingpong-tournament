import type { PlayerId, TournamentView } from '../types';
import { BONUS } from '../data/rules';
import { playerName } from '../data/participants';

export interface BonusItem {
  reason: string;
  points: number;
}

export interface BonusResult {
  points: Record<PlayerId, number>;
  items: Record<PlayerId, BonusItem[]>;
}

/**
 * Result bonuses, credited into the same points pool as bets (there is no
 * separate cash prize). Placement bonuses appear once places are decided;
 * upset bonuses accrue as matches finish.
 */
export function computeBonuses(view: TournamentView): BonusResult {
  const points = {} as Record<PlayerId, number>;
  const items = {} as Record<PlayerId, BonusItem[]>;
  for (const p of view.playerList) {
    points[p.id] = 0;
    items[p.id] = [];
  }

  const add = (id: PlayerId, pts: number, reason: string) => {
    points[id] += pts;
    items[id].push({ points: pts, reason });
  };

  const [first, second, third] = view.finalStandings;
  if (first) add(first, BONUS.champion, 'Чемпион турнира');
  if (second) add(second, BONUS.runnerUp, '2-е место (финалист)');
  if (third) add(third, BONUS.third, '3-е место');

  for (const m of view.allMatches) {
    if (m.status !== 'complete' || !m.winner || !m.loser) continue;
    const winnerSeed = view.players[m.winner].seed;
    const loserSeed = view.players[m.loser].seed;
    const diff = winnerSeed - loserSeed; // > 0 means a lower seed beat a higher one
    if (diff >= 1) {
      add(
        m.winner,
        BONUS.upsetPerPosition * diff,
        `Апсет: обыграл ${playerName(m.loser)} (№${loserSeed} посева), +${diff} поз.`,
      );
    }
  }

  return { points, items };
}
