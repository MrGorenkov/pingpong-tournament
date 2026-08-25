import { useEffect, type ReactNode } from 'react';
import type { PlayerId } from '../types';
import { PLAYERS_BY_ID } from '../data/participants';
import { cx, fmtOdds, playerHue } from '../lib/ui';

type Ring = 'accent' | 'gold' | 'silver' | 'bronze' | null;

export function Monogram({ id, size = 36, ring = null }: { id: PlayerId; size?: number; ring?: Ring }) {
  const p = PLAYERS_BY_ID[id];
  const hue = playerHue(p.seed);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-xl font-display font-bold"
        style={{
          background: `hsl(${hue} 42% 22%)`,
          color: `hsl(${hue} 72% 74%)`,
          fontSize: size * 0.42,
          boxShadow: ring ? `0 0 0 2px var(--${ring})` : undefined,
        }}
      >
        {p.name[0]}
      </div>
      <span className="tnum absolute -bottom-1 -right-1 rounded-full border border-hair bg-surface2 px-1 text-[9px] font-bold text-muted">
        {p.seed}
      </span>
    </div>
  );
}

export function PlayerTag({
  id,
  size = 32,
  ring = null,
  bold = false,
  sub,
}: {
  id: PlayerId;
  size?: number;
  ring?: Ring;
  bold?: boolean;
  sub?: string;
}) {
  const p = PLAYERS_BY_ID[id];
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Monogram id={id} size={size} ring={ring} />
      <div className="min-w-0 leading-tight">
        <div className={cx('truncate', bold ? 'font-display font-bold' : 'font-semibold')}>{p.name}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function OddsPill({ odds, tone = 'default' }: { odds: number; tone?: 'default' | 'accent' }) {
  return (
    <span
      className={cx(
        'chip tnum font-mono text-sm',
        tone === 'accent' ? 'bg-accent text-accent-ink' : 'border border-hair bg-surface2 text-ink',
      )}
    >
      ×{fmtOdds(odds)}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="label-caps">{children}</h2>
      {right}
    </div>
  );
}

export function Meter({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'win' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: tone === 'win' ? 'var(--win)' : 'var(--accent)' }}
      />
    </div>
  );
}

export function PlaceBadge({ place }: { place: number }) {
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : null;
  if (medal) return <span className="text-lg leading-none">{medal}</span>;
  return <span className="tnum w-5 text-center font-mono text-sm text-muted">{place}</span>;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-rise safe-bottom relative max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-b-0 border-hair bg-surface p-4 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-hair" />
        {title && <h3 className="mb-3 font-display text-lg font-bold">{title}</h3>}
        {children}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Callout({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'accent' | 'warn';
  children: ReactNode;
}) {
  const toneCls =
    tone === 'accent'
      ? 'border-accent bg-[color:var(--accent-flash)]'
      : tone === 'warn'
        ? 'border-[color:var(--lose)] bg-surface2'
        : 'border-hair bg-surface2';
  return <div className={cx('rounded-xl border px-3 py-2 text-sm', toneCls)}>{children}</div>;
}
