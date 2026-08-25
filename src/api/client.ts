import type { Bet, LineStatus, MatchResult, PlayerId } from '../types';
import { API_ANON, API_URL } from '../config';

/** Raw Telegram initData string (present only inside Telegram). */
export function rawInitData(): string {
  try {
    return (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData ?? '';
  } catch {
    return '';
  }
}

export interface ServerMe {
  playerId: PlayerId | null;
  isAdmin: boolean;
  username: string | null;
}

export interface ServerState {
  ok: boolean;
  me: ServerMe;
  line: LineStatus;
  revealed: boolean;
  results: Record<string, MatchResult>;
  bets: Partial<Record<PlayerId, Bet[]>>;
  placed: PlayerId[];
}

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

async function call<T = unknown>(action: string, payload?: unknown): Promise<ApiResult<T>> {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_ANON,
      Authorization: `Bearer ${API_ANON}`,
    },
    body: JSON.stringify({ action, initData: rawInitData(), payload }),
  });
  let body: T;
  try {
    body = (await r.json()) as T;
  } catch {
    body = { ok: false, error: 'bad-response' } as unknown as T;
  }
  return { status: r.status, body };
}

export const api = {
  getState: () => call<ServerState>('getState'),
  saveBets: (bets: Bet[]) => call<{ ok: boolean; error?: string }>('saveBets', { bets }),
  admin: (op: string, extra: Record<string, unknown> = {}) =>
    call<{ ok: boolean; error?: string }>('admin', { op, ...extra }),
};
