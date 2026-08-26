import { useEffect, useState } from 'react';
import { useTournament } from '../state/TournamentContext';
import { PLAYERS_BY_ID } from '../data/participants';
import type { Screen } from '../lib/nav';
import { matchStageLabel } from '../lib/labels';
import { Callout, Monogram, SectionTitle } from '../components/primitives';
import { MatchCard } from '../components/MatchCard';
import { Confetti } from '../components/Confetti';

export function HomeScreen({
  onNavigate,
  onEnterScore,
}: {
  onNavigate: (s: Screen) => void;
  onEnterScore: (matchId: string) => void;
}) {
  const { view, state, me } = useTournament();
  const lineOpen = state.line === 'open';
  const next = view.nextMatch;
  const champ = view.champion;
  const iAmChamp = Boolean(champ && me && me === champ);

  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    if (!iAmChamp) return;
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 9000);
    return () => clearTimeout(t);
  }, [iAmChamp]);

  return (
    <div className="space-y-4">
      {confetti && <Confetti />}

      {/* hero */}
      {champ ? (
        iAmChamp ? (
          <div className="animate-pop card relative overflow-hidden border-[color:var(--gold)] p-5 text-center">
            <div className="text-5xl">👑</div>
            <div className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[color:var(--gold)]">
              ТЫ — ЧЕМПИОН!
            </div>
            <div className="mt-1 text-sm text-muted">Красава, {PLAYERS_BY_ID[champ].name} 🏓🔥</div>
            <button className="btn-accent mt-4 w-full" onClick={() => onNavigate('board')}>
              Смотреть итоги
            </button>
          </div>
        ) : (
          <div className="card p-4">
            <div className="label-caps">Чемпион турнира</div>
            <div className="mt-2 flex items-center gap-3">
              <Monogram id={champ} size={52} ring="gold" />
              <div>
                <div className="font-display text-2xl font-extrabold">{PLAYERS_BY_ID[champ].name}</div>
                <div className="text-sm text-muted">🥇 первое место</div>
              </div>
            </div>
            <button className="btn-accent mt-4 w-full" onClick={() => onNavigate('board')}>
              Смотреть итоги
            </button>
          </div>
        )
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
          <button className="btn-accent mt-4 w-full" onClick={() => onNavigate(lineOpen ? 'bets' : 'groups')}>
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
              <span className="text-sm">Счёт можно вводить после закрытия линии — сначала все ставят.</span>
            </Callout>
          ) : (
            <button className="btn-accent mt-2 w-full" onClick={() => onEnterScore(next.id)}>
              Ввести счёт · {matchStageLabel(next)}
            </button>
          )}
        </section>
      )}

      {/* quick link to results */}
      {champ && (
        <button className="btn-ghost w-full" onClick={() => onNavigate('board')}>
          Итоги и результаты матчей
        </button>
      )}
    </div>
  );
}
