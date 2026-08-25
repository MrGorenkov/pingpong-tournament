import type { MatchView, PlayerId } from '../types';
import { PLAYERS_BY_ID } from '../data/participants';
import { matchStageLabel } from '../lib/labels';
import { cx } from '../lib/ui';
import { Monogram } from './primitives';

function Side({
  id,
  label,
  isWinner,
  align,
}: {
  id: PlayerId | null;
  label?: string;
  isWinner: boolean;
  align: 'left' | 'right';
}) {
  return (
    <div className={cx('flex min-w-0 flex-1 items-center gap-2', align === 'right' && 'flex-row-reverse text-right')}>
      {id ? (
        <Monogram id={id} size={34} ring={isWinner ? 'accent' : null} />
      ) : (
        <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl border border-dashed border-hair text-faint">
          ?
        </div>
      )}
      <div className="min-w-0">
        <div className={cx('truncate', isWinner ? 'font-display font-bold' : 'font-semibold', !id && 'text-faint')}>
          {id ? PLAYERS_BY_ID[id].name : (label ?? 'TBD')}
        </div>
      </div>
    </div>
  );
}

export function MatchCard({
  match,
  onClick,
  showStage = true,
}: {
  match: MatchView;
  onClick?: () => void;
  showStage?: boolean;
}) {
  const decided = match.status === 'complete';
  const wA = decided && match.winner === match.a;
  const wB = decided && match.winner === match.b;

  const inner = (
    <>
      {showStage && (
        <div className="mb-2 flex items-center justify-between">
          <span className="label-caps">{matchStageLabel(match)}</span>
          {match.status === 'void' && <span className="chip bg-surface2 text-muted">не состоялся</span>}
          {match.status === 'live' && <span className="chip bg-accent text-accent-ink">идёт</span>}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Side id={match.a} label={match.aLabel} isWinner={wA} align="left" />
        <div className="tnum shrink-0 px-1 text-center font-mono">
          {match.status === 'pending' || match.status === 'void' ? (
            <span className="text-faint">—</span>
          ) : (
            <span className="text-xl font-bold">
              <span className={cx(wA && 'text-accent')}>{match.setsA}</span>
              <span className="text-faint">:</span>
              <span className={cx(wB && 'text-accent')}>{match.setsB}</span>
            </span>
          )}
        </div>
        <Side id={match.b} label={match.bLabel} isWinner={wB} align="right" />
      </div>
      {decided && match.sets.length > 0 && (
        <div className="tnum mt-2 flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono text-xs text-muted">
          {match.sets.map((s, i) => (
            <span key={i}>
              {s.a}:{s.b}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button className="card w-full p-3 text-left transition active:scale-[0.99]" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="card p-3">{inner}</div>;
}
