import type { MatchView, TournamentView } from '../types';

export function tournamentStage(view: TournamentView): string {
  if (view.tournamentComplete) return 'Турнир завершён';
  if (!view.groupComplete.A || !view.groupComplete.B) return 'Групповой этап';
  if (!view.bracket.semifinals.every((m) => m.status === 'complete')) return 'Полуфиналы';
  return 'Финальная стадия';
}

export function matchStageLabel(m: MatchView): string {
  switch (m.stage) {
    case 'group':
      return `Группа ${m.group}`;
    case 'semifinal':
      return '1/2 финала';
    case 'final':
      return 'Финал';
    case 'third':
      return 'За 3-е место';
  }
}

export function matchStatusLabel(m: MatchView): string {
  switch (m.status) {
    case 'complete':
      return 'Сыгран';
    case 'live':
      return 'Идёт';
    case 'void':
      return 'Не состоялся';
    case 'pending':
      return 'Ожидается';
  }
}
