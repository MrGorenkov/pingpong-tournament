import { useRef } from 'react';
import { useTournament } from '../state/TournamentContext';
import { tournamentStage } from '../lib/labels';
import { hapticImpact } from '../telegram';
import { cx } from '../lib/ui';

/** Long-press the title to reveal the admin panel. */
export function Header({ onOpenAdmin, onHome }: { onOpenAdmin: () => void; onHome: () => void }) {
  const { view, state } = useTournament();
  const timer = useRef<number | null>(null);

  const start = () => {
    timer.current = window.setTimeout(() => {
      hapticImpact('heavy');
      onOpenAdmin();
    }, 550);
  };
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const lineOpen = state.line === 'open';

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-hair bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[480px] items-center justify-between px-4 py-3">
        <button
          onClick={onHome}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none text-left"
        >
          <div className="font-display text-lg font-extrabold leading-none tracking-tight">
            🏓 ПИНГ-ПОНГ<span className="text-accent">.</span>
          </div>
          <div className="label-caps mt-0.5">{tournamentStage(view)}</div>
        </button>
        <span
          className={cx(
            'chip',
            lineOpen ? 'bg-accent text-accent-ink' : 'border border-hair bg-surface2 text-muted',
          )}
        >
          {lineOpen ? '● линия открыта' : 'линия закрыта'}
        </span>
      </div>
    </header>
  );
}
