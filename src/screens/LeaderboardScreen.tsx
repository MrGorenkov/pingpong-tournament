import { useState } from 'react';
import type { MatchView, PlayerId, SetScore } from '../types';
import { useTournament } from '../state/TournamentContext';
import { PLAYERS_BY_ID } from '../data/participants';
import { EXTRA_MATCHES } from '../data/extraMatches';
import { matchStageLabel } from '../lib/labels';
import { cx } from '../lib/ui';
import { Monogram, PlaceBadge, SectionTitle } from '../components/primitives';

function ScoreLine({ a, b, sets }: { a: PlayerId; b: PlayerId; sets: SetScore[] }) {
  const setsA = sets.filter((s) => s.a > s.b).length;
  const setsB = sets.filter((s) => s.b > s.a).length;
  const wa = setsA > setsB;
  const wb = setsB > setsA;
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={cx('flex-1 truncate text-right text-sm', wa ? 'font-bold' : 'text-muted')}>
          {PLAYERS_BY_ID[a].name}
        </span>
        <span className="tnum w-10 text-center font-mono text-sm font-bold">
          {setsA}:{setsB}
        </span>
        <span className={cx('flex-1 truncate text-sm', wb ? 'font-bold' : 'text-muted')}>
          {PLAYERS_BY_ID[b].name}
        </span>
      </div>
      {sets.length > 0 && (
        <div className="tnum mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-faint">
          {sets.map((s, i) => (
            <span key={i}>
              {s.a}:{s.b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchLine({ m }: { m: MatchView }) {
  if (!m.a || !m.b) return null;
  const wa = m.winner === m.a;
  const wb = m.winner === m.b;
  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <span className={cx('flex-1 truncate text-right text-sm', wa ? 'font-bold' : 'text-muted')}>
          {PLAYERS_BY_ID[m.a].name}
        </span>
        <span className="tnum w-10 text-center font-mono text-sm font-bold">
          {m.status === 'void' ? '—' : `${m.setsA}:${m.setsB}`}
        </span>
        <span className={cx('flex-1 truncate text-sm', wb ? 'font-bold' : 'text-muted')}>
          {PLAYERS_BY_ID[m.b].name}
        </span>
      </div>
      {m.sets.length > 0 && (
        <div className="tnum mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-faint">
          {m.sets.map((s, i) => (
            <span key={i}>
              {s.a}:{s.b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaderboardScreen() {
  const { payout, view } = useTournament();
  const [open, setOpen] = useState<string | null>(null);
  const champ = view.champion;
  const bonusEntries = payout.entries.filter((e) => e.bonusPoints > 0);

  const playoff = [
    view.bracket.semifinals[0],
    view.bracket.semifinals[1],
    view.bracket.third,
    view.bracket.final,
  ].filter((m) => m.a && m.b && (m.status === 'complete' || m.status === 'void'));

  return (
    <div className="space-y-4">
      {/* champion */}
      {champ && (
        <div className="card flex items-center gap-3 border-[color:var(--gold)] p-4">
          <Monogram id={champ} size={46} ring="gold" />
          <div>
            <div className="label-caps">Чемпион турнира</div>
            <div className="font-display text-xl font-extrabold">{PLAYERS_BY_ID[champ].name}</div>
          </div>
          <span className="ml-auto text-3xl">👑</span>
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

      {/* result bonus points (upsets + places) — a fun MVP metric, no money */}
      {bonusEntries.length > 0 && (
        <section>
          <SectionTitle right={<span className="label-caps">очки</span>}>Бонусы за результат</SectionTitle>
          <div className="space-y-2">
            {bonusEntries.map((e, i) => {
              const expanded = open === e.playerId;
              return (
                <div key={e.playerId} className="card overflow-hidden">
                  <button
                    className="flex w-full items-center gap-2 p-3 text-left"
                    onClick={() => setOpen(expanded ? null : e.playerId)}
                  >
                    <span className="tnum w-5 text-center font-mono text-sm text-faint">{i + 1}</span>
                    <Monogram id={e.playerId} size={34} ring={i === 0 ? 'gold' : null} />
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold">{PLAYERS_BY_ID[e.playerId].name}</div>
                      <div className="text-xs text-muted">апсеты + места · нажми для деталей</div>
                    </div>
                    <div className="tnum font-mono text-lg font-extrabold text-accent">+{e.bonusPoints}</div>
                  </button>
                  {expanded && (
                    <div className="space-y-1 border-t border-hair px-3 py-2">
                      {e.bonusItems.map((b, k) => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className="text-muted">{b.reason}</span>
                          <span className="tnum font-mono font-bold text-accent">+{b.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* match results with per-set scores */}
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
            {playoff.length > 0 && (
              <div>
                <div className="label-caps py-2">Плей-офф</div>
                {playoff.map((m) => (
                  <div key={m.id} className="border-t border-hair/60 py-1 first:border-t-0">
                    <div className="pt-1 text-[10px] uppercase tracking-wide text-faint">{matchStageLabel(m)}</div>
                    <MatchLine m={m} />
                  </div>
                ))}
              </div>
            )}
            {EXTRA_MATCHES.length > 0 && (
              <div>
                <div className="label-caps py-2">Доп. матчи</div>
                {EXTRA_MATCHES.map((e, i) => (
                  <div key={i} className="border-t border-hair/60 py-2 first:border-t-0">
                    <div className="pb-1 text-[10px] uppercase tracking-wide text-faint">{e.label}</div>
                    <ScoreLine a={e.a} b={e.b} sets={e.sets} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
