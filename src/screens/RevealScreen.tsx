import { useEffect } from 'react';
import type { PlayerId } from '../types';
import { useTournament } from '../state/TournamentContext';
import { OUTCOME_BY_ID } from '../data/odds';
import { PLAYERS, PLAYERS_BY_ID } from '../data/participants';
import { betTotal } from '../logic/bets';
import { hapticImpact, hapticNotify } from '../telegram';
import { fmtOdds, fmtPts } from '../lib/ui';
import { Monogram } from '../components/primitives';

export function RevealScreen({ onDone }: { onDone: () => void }) {
  const { state, betsFor, markRevealed } = useTournament();

  useEffect(() => {
    markRevealed();
    hapticImpact('heavy');
    const t = setTimeout(() => hapticNotify('success'), 500);
    return () => clearTimeout(t);
  }, [markRevealed]);

  const bettors = PLAYERS.filter((p) => (state.bets[p.id] ?? []).length > 0);
  const idle = PLAYERS.filter((p) => (state.bets[p.id] ?? []).length === 0).map((p) => p.id);

  return (
    <div className="min-h-full bg-bg px-4 pb-24 pt-10">
      <div className="mx-auto max-w-[480px]">
        <div className="animate-pop text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">СТАВКИ РАСКРЫТЫ</h1>
          <p className="mt-1 text-sm text-muted">Линия закрыта. Вот кто во что верит.</p>
        </div>

        <div className="mt-6 space-y-3">
          {bettors.map((p, idx) => {
            const bets = betsFor(p.id);
            const total = betTotal(bets);
            return (
              <div
                key={p.id}
                className="animate-flip card p-3"
                style={{ animationDelay: `${idx * 160}ms`, transformOrigin: 'top center' }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <PlayerHead id={p.id} />
                  <span className="tnum font-mono text-sm text-muted">{total}/100 очков</span>
                </div>
                <div className="space-y-1">
                  {bets
                    .slice()
                    .sort((a, b) => b.points - a.points)
                    .map((b) => {
                      const o = OUTCOME_BY_ID[b.outcomeId];
                      if (!o) return null;
                      return (
                        <div key={b.outcomeId} className="flex items-center gap-2 text-sm">
                          <span className="tnum w-9 shrink-0 font-mono font-bold text-accent">{b.points}</span>
                          <span className="min-w-0 flex-1 truncate">{o.label}</span>
                          <span className="tnum shrink-0 font-mono text-xs text-muted">
                            ×{fmtOdds(o.odds)} → {fmtPts(b.points * o.odds)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}

          {idle.length > 0 && (
            <div
              className="animate-flip card p-3 text-sm text-muted"
              style={{ animationDelay: `${bettors.length * 160}ms`, transformOrigin: 'top center' }}
            >
              Без ставок: {idle.map((id) => PLAYERS_BY_ID[id].name).join(', ')}
            </div>
          )}

          {bettors.length === 0 && (
            <div className="card p-4 text-center text-muted">Никто не поставил — все очки сгорели.</div>
          )}
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-hair bg-surface/95 p-3 backdrop-blur">
        <button className="btn-accent mx-auto block w-full max-w-[480px]" onClick={onDone}>
          Поехали — к турниру
        </button>
      </div>
    </div>
  );
}

function PlayerHead({ id }: { id: PlayerId }) {
  return (
    <div className="flex items-center gap-2">
      <Monogram id={id} size={32} />
      <span className="font-display font-bold">{PLAYERS_BY_ID[id].name}</span>
    </div>
  );
}
