export const cx = (...xs: (string | false | null | undefined)[]): string => xs.filter(Boolean).join(' ');

/** Distinct hue per seed for player monograms. */
export const playerHue = (seed: number): number => Math.round(((seed - 1) / 8) * 360);

export const fmtOdds = (o: number): string => o.toFixed(2);

export const fmtPts = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const fmtRub = (n: number): string => `${Math.round(n)} ₽`;

export const fmtPct = (frac: number): string => `${(frac * 100).toFixed(1)}%`;
