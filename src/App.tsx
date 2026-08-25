import { useState } from 'react';
import { TournamentProvider, useTournament } from './state/TournamentContext';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { ScoreEntry } from './components/ScoreEntry';
import { HomeScreen } from './screens/HomeScreen';
import { GroupsScreen } from './screens/GroupsScreen';
import { BracketScreen } from './screens/BracketScreen';
import { BetsScreen } from './screens/BetsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { AdminScreen } from './screens/AdminScreen';
import { RevealScreen } from './screens/RevealScreen';
import type { Screen } from './lib/nav';

function Shell() {
  const { loading, state } = useTournament();
  const [screen, setScreen] = useState<Screen>('home');
  const [scoreMatchId, setScoreMatchId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center text-muted">
        <div className="animate-pop text-center">
          <div className="text-5xl">🏓</div>
          <div className="label-caps mt-2">загрузка…</div>
        </div>
      </div>
    );
  }

  if (screen === 'reveal') {
    return <RevealScreen onDone={() => setScreen('board')} />;
  }

  const enterScore = (id: string) => setScoreMatchId(id);

  return (
    <div className="min-h-full">
      <Header onOpenAdmin={() => setScreen('admin')} onHome={() => setScreen('home')} />
      <main className="mx-auto max-w-[480px] px-4 pb-28 pt-4">
        {screen === 'home' && <HomeScreen onNavigate={setScreen} onEnterScore={enterScore} />}
        {screen === 'groups' && <GroupsScreen />}
        {screen === 'bracket' && <BracketScreen />}
        {screen === 'bets' && <BetsScreen onNavigate={setScreen} />}
        {screen === 'board' && <LeaderboardScreen />}
        {screen === 'admin' && (
          <AdminScreen onBack={() => setScreen('home')} onEnterScore={enterScore} onNavigate={setScreen} />
        )}
      </main>
      {screen !== 'admin' && (
        <TabBar current={screen} onNavigate={setScreen} betsDot={state.line === 'open'} />
      )}
      {scoreMatchId && <ScoreEntry matchId={scoreMatchId} onClose={() => setScoreMatchId(null)} />}
    </div>
  );
}

export function App() {
  return (
    <TournamentProvider>
      <Shell />
    </TournamentProvider>
  );
}
