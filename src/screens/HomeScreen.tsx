import { useTournament } from '../state/TournamentContext';
import { BANK_RUB } from '../data/rules';
import { PLAYERS_BY_ID } from '../data/participants';
import type { Screen } from '../lib/nav';
import { matchStageLabel } from '../lib/labels';
import { Callout, Monogram, SectionTitle } from '../components/primitives';
import { MatchCard } from '../components/MatchCard';
import { fmtRub } from '../lib/ui';

export function HomeScreen({
  onNavigate,
  onEnterScore,
}: {
  onNavigate: (s: Screen) => void;
  onEnterScore: (matchId: string) => void;
}) {
  const { view, state, payout } = useTournament();
  const lineOpen = state.line === 'open';
  const next = view.nextMatch;

  return (
    <div className="space-y-4">
      {/* hero */}
      {view.tournamentComplete && view.champion ? (
        <div className="card relative overflow-hidden p-4">
          <div className="label-caps">Чемпион турнира</div>
          <div className="mt-2 flex items-center gap-3">
            <Monogram id={view.champion} size={52} ring="gold" />
            <div>
              <div className="font-display text-2xl font-extrabold">{PLAYERS_BY_ID[view.champion].name}</div>
              <div className="text-sm text-muted">🥇 первое место</div>
            </div>
          </div>
          <button className="btn-accent mt-4 w-full" onClick={() => onNavigate('board')}>
            Смотреть итоги и выплаты
          </button>
        </div>
      ) : (
        <div className="card p-4">
          <div className="label-caps">Статус</div>
          <div className="mt-1 font-display text-xl font-bold">
            {lineOpen ? 'Приём ставок открыт' : 'Турнир идёт'}
          </div>
          <p className="mt-1 text-sm text-muted">
            {lineOpen
              ? 'Распредели 100 очков по исходам, пока линия открыта. Как закроют — счёт пойдёт на табло.'
              : 'Вводи счёт сыгранных матчей — таблицы и сетка пересчитаются сами.'}
          </p>
          <button
            className="btn-accent mt-4 w-full"
            onClick={() => onNavigate(lineOpen ? 'bets' : 'groups')}
          >
            {lineOpen ? 'Сделать ставку' : 'Открыть группы'}
          </button>
        </div>
      )}

      {/* next match */}
      {next && (
        <section>
          <SectionTitle>Следующий матч</SectionTitle>
          <MatchCard match={next} />
          {lineOpen ? (
            <Callout tone="accent">
              <span className="text-sm">
                Счёт можно вводить после закрытия линии — сначала все ставят.
              </span>
            </Callout>
          ) : (
            <button className="btn-accent mt-2 w-full" onClick={() => onEnterScore(next.id)}>
              Ввести счёт · {matchStageLabel(next)}
            </button>
          )}
        </section>
      )}

      {/* bank */}
      <section>
        <SectionTitle>Тотализатор</SectionTitle>
        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Банк (фиксированный)</span>
            <span className="tnum font-mono text-2xl font-extrabold text-accent">{fmtRub(BANK_RUB)}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Кэфы — множители <b>очков</b>, а не рублей. Банк всегда ровно 800 ₽ (8×100). Результаты на
            столе тоже капают очки в этот же пул.
          </p>
          <button className="btn-ghost mt-3 w-full text-sm" onClick={() => onNavigate('board')}>
            {payout.refundMode ? 'Табло (пока пусто)' : 'Текущее распределение'}
          </button>
        </div>
      </section>
    </div>
  );
}
