import { useMemo, useState } from 'react';
import type { Bet, Outcome, PlayerId } from '../types';
import { useTournament } from '../state/TournamentContext';
import { CATEGORY_TITLES, OUTCOMES } from '../data/odds';
import { PLAYERS, PLAYERS_BY_ID } from '../data/participants';
import { MAX_STAKE, MIN_STAKE, POINTS_BUDGET } from '../data/rules';
import { isSelfLoss } from '../logic/bets';
import { hapticImpact, hapticNotify, hapticSelection } from '../telegram';
import { useMainButton } from '../telegram/useMainButton';
import { cx, fmtOdds, fmtPts } from '../lib/ui';
import type { Screen } from '../lib/nav';
import { Callout, Meter, Monogram, OddsPill, SectionTitle } from '../components/primitives';

type Draft = Record<string, number>;

const toDraft = (bets: Bet[]): Draft => Object.fromEntries(bets.map((b) => [b.outcomeId, b.points]));
const sameDraft = (a: Draft, b: Draft) => {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

function IdentityPicker({ onPick }: { onPick: (p: PlayerId) => void }) {
  return (
    <div className="card p-4">
      <div className="label-caps">Кто ставит?</div>
      <p className="mb-3 mt-1 text-sm text-muted">Телефон ходит по кругу — выбери себя, поставь, передай дальше.</p>
      <div className="grid grid-cols-4 gap-2">
        {PLAYERS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              hapticSelection();
              onPick(p.id);
            }}
            className="flex flex-col items-center gap-1 rounded-xl border border-hair bg-surface2 py-2 active:scale-95"
          >
            <Monogram id={p.id} size={34} />
            <span className="text-xs font-semibold">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper({
  stake,
  canAdd,
  disabled,
  onStep,
}: {
  stake: number;
  canAdd: boolean;
  disabled: boolean;
  onStep: (delta: number) => void;
}) {
  const btn = 'grid h-8 w-8 place-items-center rounded-lg border border-hair bg-surface2 font-bold disabled:opacity-30';
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button className={btn} disabled={stake === 0} onClick={() => onStep(-5)}>
        −
      </button>
      <span className={cx('tnum w-8 text-center font-mono text-sm', stake > 0 ? 'text-accent' : 'text-faint')}>
        {stake || 0}
      </span>
      <button className={btn} disabled={disabled || !canAdd} onClick={() => onStep(5)}>
        +
      </button>
    </div>
  );
}

function OutcomeRow({
  o,
  stake,
  remaining,
  me,
  onStep,
}: {
  o: Outcome;
  stake: number;
  remaining: number;
  me: PlayerId;
  onStep: (id: string, delta: number) => void;
}) {
  const selfLoss = isSelfLoss(me, o);
  const canAdd = !selfLoss && stake < MAX_STAKE && (stake === 0 ? remaining >= MIN_STAKE : remaining >= 5);
  return (
    <div className={cx('flex items-center gap-2 py-2', selfLoss && 'opacity-45')}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">{o.label}</div>
        {selfLoss ? (
          <div className="text-xs text-lose">против себя ставить нельзя</div>
        ) : o.sub ? (
          <div className="text-xs text-muted">{o.sub}</div>
        ) : stake > 0 ? (
          <div className="tnum text-xs text-win">зайдёт → {fmtPts(stake * o.odds)} очков</div>
        ) : null}
      </div>
      <OddsPill odds={o.odds} tone={stake > 0 ? 'accent' : 'default'} />
      <Stepper
        stake={stake}
        disabled={selfLoss}
        canAdd={canAdd}
        onStep={(d) => onStep(o.id, d)}
      />
    </div>
  );
}

export function BetsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { state, me, setMe, betsFor, saveBets } = useTournament();
  const lineOpen = state.line === 'open';
  const saved = useMemo(() => (me ? toDraft(betsFor(me)) : {}), [me, betsFor]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [syncKey, setSyncKey] = useState(me);
  const [error, setError] = useState<string | null>(null);

  // re-seed the draft when the identity changes
  if (syncKey !== me) {
    setSyncKey(me);
    setDraft(saved);
    setError(null);
  }

  const used = Object.values(draft).reduce((a, b) => a + b, 0);
  const remaining = POINTS_BUDGET - used;
  const dirty = !sameDraft(draft, saved);
  const potential = OUTCOMES.reduce((s, o) => s + (draft[o.id] ?? 0) * o.odds, 0);

  const step = (id: string, delta: number) => {
    setError(null);
    hapticSelection();
    setDraft((prev) => {
      const cur = prev[id] ?? 0;
      const otherUsed = used - cur;
      let next: number;
      if (delta > 0) {
        next = cur === 0 ? MIN_STAKE : cur + 5;
        next = Math.min(MAX_STAKE, next, POINTS_BUDGET - otherUsed);
        if (next < MIN_STAKE) return prev;
      } else {
        next = cur <= MIN_STAKE ? 0 : cur - 5;
      }
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  const save = () => {
    if (!me) return;
    const bets: Bet[] = Object.entries(draft).map(([outcomeId, points]) => ({ outcomeId, points }));
    const res = saveBets(me, bets);
    if (!res.ok) {
      setError(res.error ?? 'Ошибка');
      hapticNotify('error');
      return;
    }
    hapticImpact('medium');
    hapticNotify('success');
  };

  useMainButton(Boolean(lineOpen && me && dirty), 'Сохранить ставки', save);

  if (!lineOpen) {
    return (
      <div className="space-y-4">
        <div className="card p-5 text-center">
          <div className="text-4xl">🔒</div>
          <h2 className="mt-2 font-display text-xl font-bold">Линия закрыта</h2>
          <p className="mt-1 text-sm text-muted">Приём ставок завершён. Смотри, что кто наставил, и следи за табло.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => onNavigate('reveal')}>
              Раскрытие ставок
            </button>
            <button className="btn-accent flex-1" onClick={() => onNavigate('board')}>
              Табло
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!me) return <IdentityPicker onPick={setMe} />;

  const grouped = OUTCOMES.filter((o) => o.category === 'group-match');
  const matchIds = [...new Set(grouped.map((o) => (o.category === 'group-match' ? o.matchId : '')))];

  return (
    <div className="space-y-4 pb-4">
      <Callout tone="accent">
        <b>Кэфы — множители очков, а не рублей.</b> Банк всегда ровно 800 ₽. Минимум {MIN_STAKE}, максимум{' '}
        {MAX_STAKE} очков на исход. Неиспользованные очки сгорают.
      </Callout>

      {/* budget header */}
      <div className="card sticky top-[64px] z-10 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => setMe(null)}
            className="flex items-center gap-2"
          >
            <Monogram id={me} size={30} />
            <span className="text-sm">
              Ставит <b>{PLAYERS_BY_ID[me].name}</b> · <span className="text-accent underline">сменить</span>
            </span>
          </button>
          <span className="tnum font-mono text-sm">
            <b className={cx(remaining < 0 ? 'text-lose' : 'text-accent')}>{used}</b>
            <span className="text-faint">/{POINTS_BUDGET}</span>
          </span>
        </div>
        <Meter value={used} max={POINTS_BUDGET} />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>осталось {remaining} очков</span>
          <span className="tnum">возможный возврат: {fmtPts(potential)}</span>
        </div>
      </div>

      {error && <Callout tone="warn">{error}</Callout>}

      {/* group matches */}
      <section>
        <SectionTitle>{CATEGORY_TITLES['group-match']}</SectionTitle>
        <div className="space-y-2">
          {matchIds.map((mid) => {
            const outs = grouped.filter((o) => o.category === 'group-match' && o.matchId === mid);
            const first = outs[0];
            if (first.category !== 'group-match') return null;
            const names = `${PLAYERS_BY_ID[first.winner].name} – ${PLAYERS_BY_ID[first.loser].name}`;
            return (
              <div key={mid} className="card px-3 py-1">
                <div className="label-caps py-1">
                  {names} · группа {first.group}
                </div>
                <div className="divide-y divide-hair/60">
                  {outs.map((o) => (
                    <OutcomeRow key={o.id} o={o} stake={draft[o.id] ?? 0} remaining={remaining} me={me} onStep={step} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(['group-exit', 'reach-final', 'champion', 'special'] as const).map((cat) => (
        <section key={cat}>
          <SectionTitle>{CATEGORY_TITLES[cat]}</SectionTitle>
          <div className="card divide-y divide-hair/60 px-3">
            {OUTCOMES.filter((o) => o.category === cat).map((o) => (
              <OutcomeRow key={o.id} o={o} stake={draft[o.id] ?? 0} remaining={remaining} me={me} onStep={step} />
            ))}
          </div>
        </section>
      ))}

      {/* save bar */}
      <div className="sticky bottom-2 z-10">
        <button className="btn-accent w-full shadow-glow" disabled={!dirty} onClick={save}>
          {dirty ? `Сохранить ставки (${used}/${POINTS_BUDGET})` : 'Ставки сохранены'}
        </button>
        {dirty && (
          <button className="mt-1 w-full py-1 text-xs text-muted" onClick={() => setDraft(saved)}>
            отменить изменения
          </button>
        )}
      </div>

      <p className="px-1 text-center text-xs text-faint">Пока линия открыта, чужие ставки скрыты.</p>

      <div className="tnum mt-2 text-center text-xs text-faint">
        линия: {OUTCOMES.length} исходов · кэф {fmtOdds(1.08)}–{fmtOdds(8)}
      </div>
    </div>
  );
}
