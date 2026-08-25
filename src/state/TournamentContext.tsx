import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Bet, PlayerId, SetScore, TournamentState, TournamentView } from '../types';
import { computePayout, type PayoutResult } from '../logic/payout';
import { buildView } from '../logic/tournament';
import { validateBets } from '../logic/bets';
import { setWinner, tallyMatch } from '../logic/setScore';
import { GROUP_SETS_TO_WIN, PLAYOFF_SETS_TO_WIN } from '../data/rules';
import { FINAL_ID, SF1_ID, SF2_ID, THIRD_ID } from '../data/schedule';
import { PLAYERS } from '../data/participants';
import { createInitialState, repository } from '../storage';
import { REMOTE, POLL_MS } from '../config';
import { api } from '../api/client';
import { useLocalStorage } from './useLocalStorage';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface TournamentContextValue {
  loading: boolean;
  remote: boolean;
  state: TournamentState;
  view: TournamentView;
  payout: PayoutResult;
  me: PlayerId | null;
  isAdmin: boolean;
  canPickIdentity: boolean;
  placed: PlayerId[];
  username: string | null;
  setMe: (p: PlayerId | null) => void;
  betsFor: (p: PlayerId) => Bet[];
  refresh: () => void;
  setMatchResult: (matchId: string, sets: SetScore[]) => Promise<ActionResult>;
  voidMatch: (matchId: string) => Promise<ActionResult>;
  clearMatch: (matchId: string) => Promise<ActionResult>;
  openLine: () => Promise<ActionResult>;
  closeLine: () => Promise<ActionResult>;
  resetTournament: () => Promise<ActionResult>;
  markRevealed: () => Promise<ActionResult>;
  saveBets: (bettor: PlayerId, bets: Bet[]) => Promise<ActionResult>;
}

const PLAYOFF_IDS = new Set<string>([SF1_ID, SF2_ID, FINAL_ID, THIRD_ID]);
const matchSetsToWin = (matchId: string) =>
  PLAYOFF_IDS.has(matchId) ? PLAYOFF_SETS_TO_WIN : GROUP_SETS_TO_WIN;

/** Shared client-side validation of an entered scoreline. */
function prepareResult(matchId: string, sets: SetScore[]): ActionResult & { filled?: SetScore[] } {
  const filled = sets.filter((s) => !(s.a === 0 && s.b === 0));
  if (filled.length === 0) return { ok: false, error: 'Введите счёт хотя бы одной партии' };
  if (filled.some((s) => setWinner(s) === null)) {
    return { ok: false, error: 'Есть незавершённая партия (до 11, при 10:10 — разница в 2)' };
  }
  const toWin = matchSetsToWin(matchId);
  if (!tallyMatch(filled, toWin).decided) {
    return { ok: false, error: `Матч не завершён: нужно ${toWin} победы в партиях` };
  }
  return { ok: true, filled };
}

const ERR: Record<string, string> = {
  'no-auth': 'Нет входа через Telegram',
  'not-a-player': 'Тебя нет в списке игроков — можно только смотреть',
  'line-closed': 'Линия закрыта — ставки больше не редактируются',
  'self-loss': 'Нельзя ставить на собственное поражение',
  'stake-10-50': 'Ставка 10–50 очков на исход',
  'over-100': 'Всего не больше 100 очков',
  'dup-outcome': 'Дубликат исхода',
  'unknown-outcome': 'Неизвестный исход',
  'not-admin': 'Только для админа',
  'bad-op': 'Неизвестная операция',
};
const msg = (code?: string) => (code && ERR[code]) || code || 'Ошибка сети';

const TournamentContext = createContext<TournamentContextValue | null>(null);

function useDerived(state: TournamentState) {
  const view = useMemo(() => buildView(state), [state]);
  const payout = useMemo(() => computePayout(view, state.bets), [view, state.bets]);
  return { view, payout };
}

// ---------------------------------------------------------------------------
// LOCAL mode (single shared device, localStorage) — the offline fallback.
// ---------------------------------------------------------------------------
function LocalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TournamentState>(() => createInitialState());
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useLocalStorage<PlayerId | null>('pingpong-me-v1', null);
  const lastPersisted = useRef<string | null>(null);
  const { view, payout } = useDerived(state);

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

  useEffect(() => {
    if (loading) return;
    const json = JSON.stringify(state);
    if (json === lastPersisted.current) return;
    lastPersisted.current = json;
    repository.save(state);
  }, [state, loading]);

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

  const value = useMemo<TournamentContextValue>(() => {
    const setMatchResult = async (matchId: string, sets: SetScore[]): Promise<ActionResult> => {
      if (state.line === 'open') return { ok: false, error: 'Сначала закройте линию ставок — до первого матча' };
      const prep = prepareResult(matchId, sets);
      if (!prep.ok) return prep;
      setState((prev) => ({ ...prev, results: { ...prev.results, [matchId]: { sets: prep.filled! } } }));
      return { ok: true };
    };
    const voidMatch = async (matchId: string): Promise<ActionResult> => {
      setState((prev) => ({ ...prev, results: { ...prev.results, [matchId]: { sets: [], voided: true } } }));
      return { ok: true };
    };
    const clearMatch = async (matchId: string): Promise<ActionResult> => {
      setState((prev) => {
        const results = { ...prev.results };
        delete results[matchId];
        return { ...prev, results };
      });
      return { ok: true };
    };
    const openLine = async (): Promise<ActionResult> => {
      setState((prev) => ({ ...prev, line: 'open' }));
      return { ok: true };
    };
    const closeLine = async (): Promise<ActionResult> => {
      setState((prev) => ({ ...prev, line: 'closed' }));
      return { ok: true };
    };
    const resetTournament = async (): Promise<ActionResult> => {
      setState(createInitialState());
      return { ok: true };
    };
    const markRevealed = async (): Promise<ActionResult> => {
      setState((prev) => (prev.revealed ? prev : { ...prev, revealed: true }));
      return { ok: true };
    };
    const saveBets = async (bettor: PlayerId, bets: Bet[]): Promise<ActionResult> => {
      if (state.line !== 'open') return { ok: false, error: 'Линия закрыта — ставки больше не редактируются' };
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
      remote: false,
      state,
      view,
      payout,
      me,
      isAdmin: true,
      canPickIdentity: true,
      placed: PLAYERS.filter((p) => (state.bets[p.id] ?? []).length > 0).map((p) => p.id),
      username: null,
      setMe,
      betsFor: (p) => state.bets[p] ?? [],
      refresh: () => {},
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

// ---------------------------------------------------------------------------
// REMOTE mode (Supabase + Telegram login, synced across devices).
// ---------------------------------------------------------------------------
function RemoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TournamentState>(() => createInitialState());
  const [loading, setLoading] = useState(true);
  const [me, setMeState] = useState<PlayerId | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlayerId[]>([]);
  const { view, payout } = useDerived(state);

  const apply = (body: import('../api/client').ServerState) => {
    setState({
      version: 1,
      results: body.results ?? {},
      bets: body.bets ?? {},
      line: body.line ?? 'open',
      revealed: body.revealed ?? false,
    });
    setMeState(body.me?.playerId ?? null);
    setIsAdmin(Boolean(body.me?.isAdmin));
    setUsername(body.me?.username ?? null);
    setPlaced(body.placed ?? []);
  };

  const refresh = async () => {
    try {
      const { body } = await api.getState();
      if (body?.ok) apply(body);
    } catch {
      /* keep last known state on transient network errors */
    }
  };

  useEffect(() => {
    let alive = true;
    api
      .getState()
      .then(({ body }) => {
        if (alive && body?.ok) apply(body);
      })
      .finally(() => alive && setLoading(false));
    const id = window.setInterval(() => {
      api.getState().then(({ body }) => {
        if (alive && body?.ok) apply(body);
      }).catch(() => {});
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<TournamentContextValue>(() => {
    const adminOp = async (op: string, extra?: Record<string, unknown>): Promise<ActionResult> => {
      try {
        const { body } = await api.admin(op, extra);
        if (!body?.ok) return { ok: false, error: msg(body?.error) };
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, error: 'Ошибка сети' };
      }
    };

    const setMatchResult = async (matchId: string, sets: SetScore[]): Promise<ActionResult> => {
      if (state.line === 'open') return { ok: false, error: 'Сначала закройте линию ставок — до первого матча' };
      const prep = prepareResult(matchId, sets);
      if (!prep.ok) return prep;
      return adminOp('setResult', { matchId, sets: prep.filled });
    };

    const saveBets = async (_bettor: PlayerId, bets: Bet[]): Promise<ActionResult> => {
      try {
        const { body } = await api.saveBets(bets);
        if (!body?.ok) return { ok: false, error: msg(body?.error) };
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, error: 'Ошибка сети' };
      }
    };

    return {
      loading,
      remote: true,
      state,
      view,
      payout,
      me,
      isAdmin,
      canPickIdentity: false,
      placed,
      username,
      setMe: () => {},
      betsFor: (p) => state.bets[p] ?? [],
      refresh,
      setMatchResult,
      voidMatch: (matchId) => adminOp('voidMatch', { matchId }),
      clearMatch: (matchId) => adminOp('clearMatch', { matchId }),
      openLine: () => adminOp('openLine'),
      closeLine: () => adminOp('closeLine'),
      resetTournament: () => adminOp('reset'),
      markRevealed: async () => (isAdmin ? adminOp('markRevealed') : { ok: true }),
      saveBets,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state, view, payout, me, isAdmin, username, placed]);

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function TournamentProvider({ children }: { children: ReactNode }) {
  return REMOTE ? <RemoteProvider>{children}</RemoteProvider> : <LocalProvider>{children}</LocalProvider>;
}

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
