import type { PlayerId, SetScore } from '../types';

/**
 * Display-only extra matches (не влияют на таблицы/сетку/бонусы). Нужны, когда
 * вживую сыграли доп. игру, которой нет в круговой (одна встреча на пару).
 */
export interface ExtraMatch {
  a: PlayerId;
  b: PlayerId;
  sets: SetScore[];
  label: string;
}

export const EXTRA_MATCHES: ExtraMatch[] = [
  // Ислам и Ванёк сыграли ещё раз — доп. игра за 2-е место группы B (Ислам победил).
  {
    a: 'islam',
    b: 'vanek',
    sets: [
      { a: 14, b: 12 },
      { a: 11, b: 9 },
    ],
    label: 'Ислам – Ванёк · за 2-е место группы B',
  },
];
