import { useMemo, useState } from 'react';
import type { PlayerId, SetScore } from '../types';
import { useTournament } from '../state/TournamentContext';
import { PLAYERS_BY_ID } from '../data/participants';
import { setWinner, tallyMatch } from '../logic/setScore';
import { hapticImpact, hapticNotify } from '../telegram';
import { useMainButton } from '../telegram/useMainButton';
import { cx } from '../lib/ui';
import { Callout, PlayerTag, Sheet } from './primitives';

function SetRow({
  index,
  a,
  b,
  aId,
  bId,
  onChange,
}: {
  index: number;
  a: number;
  b: number;
  aId: PlayerId;
  bId: PlayerId;
  onChange: (a: number, b: number) => void;
}) {
  const w = setWinner({ a, b });
  const clamp = (v: string) => Math.max(0, Math.min(40, Math.floor(Number(v) || 0)));
  const cell = 'tnum w-16 rounded-lg border border-hair bg-surface2 px-2 py-2 text-center font-mono text-lg outline-none focus:border-accent';
  return (
    <div className="flex items-center gap-2">
      <span className="tnum w-6 text-center text-xs text-faint">{index + 1}</span>
      <input
        aria-label={`${PLAYERS_BY_ID[aId].name}, партия ${index + 1}`}
        className={cx(cell, w === 'a' && 'border-win text-win')}
        inputMode="numeric"
        value={a || ''}
        placeholder="0"
        onChange={(e) => onChange(clamp(e.target.value), b)}
      />
      <span className="text-faint">:</span>
      <input
        aria-label={`${PLAYERS_BY_ID[bId].name}, партия ${index + 1}`}
        className={cx(cell, w === 'b' && 'border-win text-win')}
        inputMode="numeric"
        value={b || ''}
        placeholder="0"
        onChange={(e) => onChange(a, clamp(e.target.value))}
      />
    </div>
  );
}

export function ScoreEntry({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const { view, setMatchResult, voidMatch, clearMatch } = useTournament();
  const match = view.matchById[matchId];
  const maxSets = match ? match.target * 2 - 1 : 3;

  const [rows, setRows] = useState<SetScore[]>(() => {
    const init: SetScore[] = match?.sets.map((s) => ({ ...s })) ?? [];
    while (init.length < maxSets) init.push({ a: 0, b: 0 });
    return init.slice(0, maxSets);
  });
  const [error, setError] = useState<string | null>(null);

  const tally = useMemo(() => (match ? tallyMatch(rows, match.target) : null), [rows, match]);

  const submit = () => {
    const res = setMatchResult(matchId, rows);
    if (!res.ok) {
      setError(res.error ?? 'Ошибка');
      hapticNotify('error');
      return;
    }
    hapticImpact('heavy');
    hapticNotify('success');
    onClose();
  };

  useMainButton(Boolean(match && match.a && match.b), 'Подтвердить счёт', submit, Boolean(tally?.decided));

  if (!match || !match.a || !match.b) return null;
  const aId = match.a;
  const bId = match.b;
  const winnerId = tally?.decided ? (tally.winnerSide === 'a' ? aId : bId) : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ввод счёта"
      footer={
        <div className="space-y-2">
          {error && <Callout tone="warn">{error}</Callout>}
          <button className="btn-accent w-full" onClick={submit}>
            Подтвердить счёт
          </button>
          <div className="flex gap-2">
            <button
              className="btn-ghost flex-1 text-sm"
              onClick={() => {
                voidMatch(matchId);
                hapticImpact('soft');
                onClose();
              }}
            >
              Матч не состоялся
            </button>
            <button
              className="btn-ghost flex-1 text-sm"
              onClick={() => {
                clearMatch(matchId);
                onClose();
              }}
            >
              Очистить
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-center justify-between rounded-xl bg-surface2 p-3">
        <PlayerTag id={aId} bold />
        <div className="tnum px-2 font-mono text-2xl font-bold">
          <span className={cx(tally?.winnerSide === 'a' && 'text-win')}>{tally?.setsA ?? 0}</span>
          <span className="text-faint">:</span>
          <span className={cx(tally?.winnerSide === 'b' && 'text-win')}>{tally?.setsB ?? 0}</span>
        </div>
        <PlayerTag id={bId} bold />
      </div>

      <div className="label-caps mb-2">
        Партии до 11 · при 10:10 разница в 2 · до {match.target} побед
      </div>
      <div className="space-y-2">
        {rows.map((s, i) => (
          <SetRow
            key={i}
            index={i}
            a={s.a}
            b={s.b}
            aId={aId}
            bId={bId}
            onChange={(na, nb) => {
              setError(null);
              setRows((prev) => prev.map((r, j) => (j === i ? { a: na, b: nb } : r)));
            }}
          />
        ))}
      </div>

      <div className="mt-3 text-center text-sm">
        {winnerId ? (
          <span className="text-win">
            Победитель: <b>{PLAYERS_BY_ID[winnerId].name}</b>
          </span>
        ) : (
          <span className="text-muted">Матч ещё не завершён</span>
        )}
      </div>
    </Sheet>
  );
}
