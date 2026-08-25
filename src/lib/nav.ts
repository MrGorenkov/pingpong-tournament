export type Screen = 'home' | 'groups' | 'bracket' | 'bets' | 'board' | 'admin' | 'reveal';

export const MAIN_TABS: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Главная', icon: '🏓' },
  { id: 'groups', label: 'Группы', icon: '📊' },
  { id: 'bracket', label: 'Сетка', icon: '🏆' },
  { id: 'bets', label: 'Ставки', icon: '🎯' },
  { id: 'board', label: 'Итоги', icon: '💰' },
];
