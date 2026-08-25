import { useEffect, useState } from 'react';
import type { MatchView } from '../types';
import { useTournament } from '../state/TournamentContext';
import { PLAYERS_BY_ID } from '../data/participants';
import type { Screen } from '../lib/nav';
import { matchStageLabel, matchStatusLabel } from '../lib/labels';
import { hapticImpact } from '../telegram';
import { cx } from '../lib/ui';
import { Callout, SectionTitle } from '../components/primitives';

function name(id: MatchView['a']) {
  return id ? PLAYERS_BY_ID[id].name : null;
}

function AdminMatchRow({
  match,
  lineOpen,
  onEdit,
}: {
  match: MatchView;
  lineOpen: boolean;
  onEdit: () => void;
}) {
  const ready = Boolean(match.a && match.b);
  const scoreText =
    match.status === 'complete' || match.status === 'live'
      ? `${match.setsA}:${match.setsB}`
      : match.status === 'void'
        ? '—'
        : '·';
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {ready ? `${name(match.a)} – ${name(match.b)}` : `${match.aLabel} – ${match.bLabel}`}
        </div>
        <div className="tnum text-xs text-muted">
          {matchStageLabel(match)} · {matchStatusLabel(match)}
        </div>
      </div>
      <span className="tnum w-10 text-center font-mono text-sm font-bold">{scoreText}</span>
      <button
        className={cx('btn-ghost px-3 py-1.5 text-xs', (!ready || lineOpen) && 'opacity-40')}
        disabled={!ready || lineOpen}
        onClick={onEdit}
      >
        счёт
      </button>
    </div>
  );
}

export function AdminScreen({
  onBack,
  onEnterScore,
  onNavigate,
}: {
  onBack: () => void;
  onEnterScore: (id: string) => void;
  onNavigate: (s: Screen) => void;
}) {
  const { state, view, openLine, closeLine, resetTournament, remote, isAdmin, username } = useTournament();
  const lineOpen = state.line === 'open';
  const hasResults = Object.keys(state.results).length > 0;

  const [confirmReset, setConfirmReset] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  if (remote && !isAdmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-extrabold">⚙️ Админка</h1>
          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={onBack}>
            Назад
          </button>
        </div>
        <Callout tone="warn">
          Панель только для админа{username ? ` (сейчас ты @${username})` : ''}. Ввод счёта, линия и сброс — у
          организатора.
        </Callout>
      </div>
    );
  }

  const groupA = view.groupMatches.filter((m) => m.group === 'A');
  const groupB = view.groupMatches.filter((m) => m.group === 'B');
  const playoff = [...view.bracket.semifinals, view.bracket.final, view.bracket.third];

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setErr(null);
    const r = await fn();
    if (!r.ok) setErr(r.error ?? 'Ошибка');
    else after?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold">⚙️ Админка</h1>
        <button className="btn-ghost px-3 py-1.5 text-sm" onClick={onBack}>
          Готово
        </button>
      </div>

      {err && <Callout tone="warn">{err}</Callout>}

      <section>
        <SectionTitle>Линия ставок</SectionTitle>
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Статус</span>
            <span className={cx('chip', lineOpen ? 'bg-accent text-accent-ink' : 'border border-hair bg-surface2 text-muted')}>
              {lineOpen ? 'открыта' : 'закрыта'}
            </span>
          </div>
          {lineOpen ? (
            <>
              <Callout>Линия закрывается до первого матча. После закрытия ставки не редактируются, и все ставки раскрываются разом.</Callout>
              <button
                className="btn-accent w-full"
                onClick={() =>
                  run(closeLine, () => {
                    hapticImpact('heavy');
                    onNavigate('reveal');
                  })
                }
              >
                Закрыть линию и раскрыть ставки
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 text-sm" onClick={() => onNavigate('reveal')}>
                Показать раскрытие
              </button>
              <button
                className="btn-ghost flex-1 text-sm"
                disabled={hasResults}
                onClick={() => run(openLine)}
              >
                {hasResults ? 'Открыть нельзя' : 'Открыть заново'}
              </button>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle>Ввод счетов</SectionTitle>
        {lineOpen && <Callout tone="warn">Чтобы вводить счёт, сначала закройте линию ставок.</Callout>}
        <div className="mt-2 space-y-2">
          <div className="card px-3">
            <div className="label-caps py-2">Группа A</div>
            <div className="divide-y divide-hair/60">
              {groupA.map((m) => (
                <AdminMatchRow key={m.id} match={m} lineOpen={lineOpen} onEdit={() => onEnterScore(m.id)} />
              ))}
            </div>
          </div>
          <div className="card px-3">
            <div className="label-caps py-2">Группа B</div>
            <div className="divide-y divide-hair/60">
              {groupB.map((m) => (
                <AdminMatchRow key={m.id} match={m} lineOpen={lineOpen} onEdit={() => onEnterScore(m.id)} />
              ))}
            </div>
          </div>
          <div className="card px-3">
            <div className="label-caps py-2">Плей-офф</div>
            <div className="divide-y divide-hair/60">
              {playoff.map((m) => (
                <AdminMatchRow key={m.id} match={m} lineOpen={lineOpen} onEdit={() => onEnterScore(m.id)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Опасная зона</SectionTitle>
        <button
          className={cx('btn w-full', confirmReset ? 'bg-lose text-white' : 'btn-ghost')}
          onClick={() => {
            if (confirmReset) {
              setConfirmReset(false);
              run(resetTournament, () => {
                hapticImpact('heavy');
                onBack();
              });
            } else {
              setConfirmReset(true);
            }
          }}
        >
          {confirmReset ? 'Точно сбросить? Нажми ещё раз' : 'Сбросить турнир'}
        </button>
        <p className="mt-1 px-1 text-xs text-faint">Сотрёт все счета и ставки, линия снова откроется.</p>
      </section>
    </div>
  );
}
