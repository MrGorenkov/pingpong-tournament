import { useMemo } from 'react';

const COLORS = ['#ff6a2b', '#ffcf3f', '#35d07f', '#c7d0da', '#ff5c68', '#ffffff'];

/** Lightweight CSS confetti overlay (see `confetti-fall` keyframe in index.css). */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        dur: 2.6 + Math.random() * 2.6,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-6vh',
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 0.55,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
