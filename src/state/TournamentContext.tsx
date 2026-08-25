import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Bet, PlayerId, SetScore, TournamentState, TournamentView } from '../types';
import { computePayout, type PayoutResult } from '../logic/payout';
import { buildView } from '../logic/tournament';
import { validateBets } from '../logic/bets';
import { setWinner, tallyMatch } from '../logic/setScore';
import { GROUP_SETS_TO_WIN, PLAYOFF_SETS_TO_WIN } from '../data/rules';
import { FINAL_ID, SF1_ID, SF2_ID, THIRD_ID } from '../data/schedule';
import { createInitialState, repository } from '../storage';
import { useLocalStorage } from './useLocalStorage';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface TournamentContextValue {
  loading: boolean;
  state: TournamentState;
  view: TournamentView;
  payout: PayoutResult;
  me: PlayerId | null;
  setMe: (p: PlayerId | null) => void;
  betsFor: (p: PlayerId) => Bet[];
  // admin / result actions
  setMatchResult: (matchId: string, sets: SetScore[]) => ActionResult;
  voidMatch: (matchId: string) => void;
  clearMatch: (matchId: string) => void;
  openLine: () => void;
  closeLine: () => ActionResult;
  resetTournament: () => void;
  markRevealed: () => void;
  // betting
  saveBets: (bettor: PlayerId, bets: Bet[]) => ActionResult;
}

const PLAYOFF_IDS = new Set<string>([SF1_ID, SF2_ID, FINAL_ID, THIRD_ID]);
const matchSetsToWin = (matchId: string) =>
  PLAYOFF_IDS.has(matchId) ? PLAYOFF_SETS_TO_WIN : GROUP_SETS_TO_WIN;

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TournamentState>(() => createInitialState());
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useLocalStorage<PlayerId | null>('pingpong-me-v1', null);
  const lastPersisted = useRef<string | null>(null);

  // initial load
  useEffect(() => {
    let alive = true;
    repository.load().then((loaded) => {
      if (!alive) return;
      const next = loaded ?? createInitialState();
      lastPersisted.current = JSON.stringify(next);
      setState(next);
      if (!loaded) repository.save(next);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // persist on change (skip identical writes to avoid cross-tab loops)
  useEffect(() => {
    if (loading) return;
    const json = JSON.stringify(state);
    if (json === lastPersisted.current) return;
    lastPersisted.current = json;
    repository.save(state);
  }, [state, loading]);

  // react to external changes (another tab, or a future API push)
  useEffect(() => {
    if (!repository.subscribe) return;
    return repository.subscribe((external) => {
      if (!external) return;
      const json = JSON.stringify(external);
      if (json === lastPersisted.current) return;
      lastPersisted.current = json;
      setState(external);
    });
  }, []);

  const view = useMemo(() => buildView(state), [state]);
  const payout = useMemo(() => computePayout(view, state.bets), [view, state.bets]);

  const value = useMemo<TournamentContextValue>(() => {
    const setMatchResult = (matchId: string, sets: SetScore[]): ActionResult => {
      if (state.line === 'open') {
        return { ok: false, error: 'Сначала закройте линию ставок — до первого матча' };
      }
      const filled = sets.filter((s) => !(s.a === 0 && s.b === 0));
      if (filled.length === 0) return { ok: false, error: 'Введите счёт хотя бы одной партии' };
      if (filled.some((s) => setWinner(s) === null)) {
        return { ok: false, error: 'Есть незавершённая партия (до 11, при 10:10 — разница в 2)' };
      }
      const toWin = matchSetsToWin(matchId);
      const tally = tallyMatch(filled, toWin);
      if (!tally.decided) {
        return { ok: false, error: `Матч не завершён: нужно ${toWin} победы в партиях` };
      }
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, [matchId]: { sets: filled } },
      }));
      return { ok: true };
    };

    const voidMatch = (matchId: string) =>
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, [matchId]: { sets: [], voided: true } },
      }));

    const clearMatch = (matchId: string) =>
      setState((prev) => {
        const results = { ...prev.results };
        delete results[matchId];
        return { ...prev, results };
      });

    const openLine = () => setState((prev) => ({ ...prev, line: 'open' }));
    const closeLine = (): ActionResult => {
      setState((prev) => ({ ...prev, line: 'closed' }));
      return { ok: true };
    };
    const resetTournament = () => setState(createInitialState());
    const markRevealed = () =>
      setState((prev) => (prev.revealed ? prev : { ...prev, revealed: true }));

    const saveBets = (bettor: PlayerId, bets: Bet[]): ActionResult => {
      if (state.line !== 'open') {
        return { ok: false, error: 'Линия закрыта — ставки больше не редактируются' };
      }
      const v = validateBets(bettor, bets);
      if (!v.ok) return v;
      setState((prev) => {
        const nextBets = { ...prev.bets };
        if (bets.length) nextBets[bettor] = bets;
        else delete nextBets[bettor];
        return { ...prev, bets: nextBets };
      });
      return { ok: true };
    };

    return {
      loading,
      state,
      view,
      payout,
      me,
      setMe,
      betsFor: (p: PlayerId) => state.bets[p] ?? [],
      setMatchResult,
      voidMatch,
      clearMatch,
      openLine,
      closeLine,
      resetTournament,
      markRevealed,
      saveBets,
    };
  }, [loading, state, view, payout, me, setMe]);

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
