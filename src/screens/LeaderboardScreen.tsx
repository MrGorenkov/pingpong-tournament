import { useState } from 'react';
import type { MatchView } from '../types';
import { useTournament } from '../state/TournamentContext';
import { BANK_RUB, ENTRY_FEE_RUB, POOL_FEE_RUB, TABLE_FEE_RUB } from '../data/rules';
import { PLAYERS_BY_ID } from '../data/participants';
import { matchStageLabel } from '../lib/labels';
import { cx, fmtPct, fmtPts, fmtRub } from '../lib/ui';
import { Callout, Meter, Monogram, PlaceBadge, SectionTitle } from '../components/primitives';

function MatchLine({ m }: { m: MatchView }) {
  if (!m.a || !m.b) return null;
  const wa = m.winner === m.a;
  const wb = m.winner === m.b;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className={cx('flex-1 truncate text-right text-sm', wa ? 'font-bold' : 'text-muted')}>
        {PLAYERS_BY_ID[m.a].name}
      </span>
      <span className="tnum w-12 text-center font-mono text-sm font-bold">
        {m.status === 'void' ? '—' : `${m.setsA}:${m.setsB}`}
      </span>
      <span className={cx('flex-1 truncate text-sm', wb ? 'font-bold' : 'text-muted')}>
        {PLAYERS_BY_ID[m.b].name}
      </span>
    </div>
  );
}

export function LeaderboardScreen() {
  const { payout, view } = useTournament();
  const [open, setOpen] = useState<string | null>(null);
  const distributed = payout.entries.reduce((s, e) => s + e.rub, 0);

  return (
    <div className="space-y-4">
      {/* bank */}
      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <span className="label-caps">Банк тотализатора</span>
          <span className="tnum font-mono text-2xl font-extrabold text-accent">{fmtRub(BANK_RUB)}</span>
        </div>
        <div className="tnum mt-1 flex items-center justify-between text-xs text-muted">
          <span>распределено</span>
          <span className={cx(distributed === BANK_RUB ? 'text-win' : 'text-lose')}>
            {fmtRub(distributed)} {distributed === BANK_RUB ? '✓' : '✗'}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Очки = ставки (кэф × ставка) + бонусы за результат. Доля в банке = очки игрока ÷ сумма всех
          очков × {BANK_RUB} ₽.
        </p>
      </div>

      {payout.refundMode && (
        <Callout tone="accent">
          Пока сумма очков нулевая — по правилам это возврат: каждому по {fmtRub(100)}.
        </Callout>
      )}

      {/* leaderboard */}
      <section>
        <SectionTitle right={<span className="label-caps">рубли</span>}>Лидерборд</SectionTitle>
        <div className="space-y-2">
          {payout.entries.map((e, i) => {
            const expanded = open === e.playerId;
            return (
              <div key={e.playerId} className="card overflow-hidden">
                <button
                  className="flex w-full items-center gap-2 p-3 text-left"
                  onClick={() => setOpen(expanded ? null : e.playerId)}
                >
                  <span className="tnum w-5 text-center font-mono text-sm text-faint">{i + 1}</span>
                  <Monogram id={e.playerId} size={34} ring={i === 0 && !payout.refundMode ? 'gold' : null} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold">{PLAYERS_BY_ID[e.playerId].name}</div>
                    <div className="tnum text-xs text-muted">
                      {fmtPts(e.totalPoints)} очк · ставки {fmtPts(e.bettingPoints)}
                      {e.bonusPoints > 0 && <span className="text-accent"> + бонус {e.bonusPoints}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tnum font-mono text-lg font-extrabold text-accent">{fmtRub(e.rub)}</div>
                    <div className="tnum text-[10px] text-faint">{fmtPct(e.share)}</div>
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-hair px-3 py-2">
                    <Meter value={e.rub} max={BANK_RUB} />
                    <div className="mt-2 space-y-1">
                      {e.bonusItems.length === 0 ? (
                        <div className="text-xs text-faint">Бонусов за результат нет.</div>
                      ) : (
                        e.bonusItems.map((b, k) => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-muted">{b.reason}</span>
                            <span className="tnum font-mono font-bold text-accent">+{b.points}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* last place buys balls */}
      {payout.lastPlace && (
        <div className="card border-[color:var(--bronze)] p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎾</span>
            <div>
              <div className="label-caps">Последнее место</div>
              <div className="font-display font-bold">
                {PLAYERS_BY_ID[payout.lastPlace].name} покупает мячи к следующему турниру
              </div>
            </div>
          </div>
        </div>
      )}

      {/* final places */}
      {view.finalStandings.some(Boolean) && (
        <section>
          <SectionTitle>Итоговые места</SectionTitle>
          <div className="card divide-y divide-hair/60 px-3">
            {view.finalStandings.map((id, i) =>
              id ? (
                <div key={i} className="flex items-center gap-2 py-2">
                  <PlaceBadge place={i + 1} />
                  <Monogram id={id} size={26} />
                  <span className="text-sm font-semibold">{PLAYERS_BY_ID[id].name}</span>
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}

      {/* match results — кто с кем играл */}
      {view.allMatches.some((m) => m.status === 'complete' || m.status === 'void') && (
        <section>
          <SectionTitle>Результаты матчей</SectionTitle>
          <div className="card px-3">
            {(['A', 'B'] as const).map((g) => {
              const ms = view.groupMatches.filter(
                (m) => m.group === g && (m.status === 'complete' || m.status === 'void'),
              );
              if (ms.length === 0) return null;
              return (
                <div key={g}>
                  <div className="label-caps py-2">Группа {g}</div>
                  <div className="divide-y divide-hair/60">
                    {ms.map((m) => (
                      <MatchLine key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              );
            })}
            {(() => {
              const po = [
                view.bracket.semifinals[0],
                view.bracket.semifinals[1],
                view.bracket.third,
                view.bracket.final,
              ].filter((m) => m.a && m.b && (m.status === 'complete' || m.status === 'void'));
              if (po.length === 0) return null;
              return (
                <div>
                  <div className="label-caps py-2">Плей-офф</div>
                  {po.map((m) => (
                    <div key={m.id} className="py-1">
                      <div className="text-[10px] uppercase tracking-wide text-faint">{matchStageLabel(m)}</div>
                      <MatchLine m={m} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      <p className="px-1 text-center text-xs leading-relaxed text-faint">
        Взнос {fmtRub(ENTRY_FEE_RUB)} с человека: {TABLE_FEE_RUB} стол + {POOL_FEE_RUB} ставки.
        Отдельных призовых за места нет — единственные деньги в игре это банк {BANK_RUB} ₽.
      </p>
    </div>
  );
}
