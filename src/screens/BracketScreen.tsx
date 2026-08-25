import { useTournament } from '../state/TournamentContext';
import { PLAYERS_BY_ID } from '../data/participants';
import { Monogram, SectionTitle } from '../components/primitives';
import { MatchCard } from '../components/MatchCard';

export function BracketScreen() {
  const { view } = useTournament();
  const { semifinals, final, third } = view.bracket;

  return (
    <div className="space-y-5">
      {view.champion && (
        <div className="card flex items-center gap-3 border-accent p-4">
          <Monogram id={view.champion} size={48} ring="gold" />
          <div>
            <div className="label-caps">Чемпион</div>
            <div className="font-display text-xl font-extrabold">{PLAYERS_BY_ID[view.champion].name}</div>
          </div>
          <span className="ml-auto text-3xl">🏆</span>
        </div>
      )}

      <section className="space-y-2">
        <SectionTitle>Полуфиналы · крест-накрест</SectionTitle>
        <MatchCard match={semifinals[0]} showStage={false} />
        <div className="text-center text-xs text-faint">и</div>
        <MatchCard match={semifinals[1]} showStage={false} />
      </section>

      <section className="space-y-2">
        <SectionTitle right={<span className="text-2xl">🏆</span>}>Финал</SectionTitle>
        <div className="rounded-2xl bg-[color:var(--accent-flash)] p-0.5">
          <MatchCard match={final} showStage={false} />
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>Матч за 3-е место</SectionTitle>
        <MatchCard match={third} showStage={false} />
      </section>

      <p className="px-1 text-xs leading-relaxed text-muted">
        Сетка заполняется автоматически: полуфиналы A1–B2 и B1–A2, затем финал и матч за 3-е место.
        Плей-офф — до 3 побед в партиях.
      </p>
    </div>
  );
}
