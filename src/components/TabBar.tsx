import { MAIN_TABS, type Screen } from '../lib/nav';
import { hapticSelection } from '../telegram';
import { cx } from '../lib/ui';

export function TabBar({
  current,
  onNavigate,
  betsDot,
}: {
  current: Screen;
  onNavigate: (s: Screen) => void;
  betsDot?: boolean;
}) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-between px-1">
        {MAIN_TABS.map((t) => {
          const active = current === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                hapticSelection();
                onNavigate(t.id);
              }}
              className={cx(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
                active ? 'text-accent' : 'text-faint',
              )}
            >
              <span className={cx('text-lg leading-none transition-transform', active && 'scale-110')}>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === 'bets' && betsDot && (
                <span className="absolute right-[22%] top-1 h-2 w-2 animate-pulseGlow rounded-full bg-accent" />
              )}
              {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
