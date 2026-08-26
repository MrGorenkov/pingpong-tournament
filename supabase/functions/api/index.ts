// Supabase Edge Function `api` — the whole backend for the ping-pong tournament.
// Auth = Telegram Mini App initData (HMAC-verified with the bot token). Each
// person can only write bets for their own mapped player; admin-only ops guard
// results and the line. State is shared and polled by all clients.

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? '';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Telegram @username (lowercase) -> playerId
const USERNAME_TO_PLAYER: Record<string, string> = {
  pvnchenkkko: 'tolyan',
  islsei: 'islam',
  e_m_v_4: 'misha',
  pbppbpb: 'timur',
  wallflower2: 'galim',
  vaaancho: 'vanek',
  alex_gorenkov: 'sanek',
};
const ADMINS = new Set(['alex_gorenkov']);
const PLAYERS = new Set(['tolyan', 'islam', 'misha', 'timur', 'galim', 'vanek', 'sanek']);
const SPECIALS = new Set([
  'final-tolyan-islam', 'tolyan-group-sweep', 'tolyan-no-set-lost', 'bottom4-in-top4',
  'vanek-or-sanek-wins', 'upset-3plus', 'sanek-not-last', 'final-3-0', 'final-3-1', 'final-3-2',
]);

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}

async function verifyInitData(initData: string): Promise<{ ok: boolean; user?: any }> {
  if (!initData) return { ok: false };
  const p = new URLSearchParams(initData);
  const hash = p.get('hash') ?? '';
  p.delete('hash');
  const dcs = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac(new TextEncoder().encode('WebAppData'), BOT_TOKEN);
  const sig = await hmac(secret, dcs);
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex !== hash) return { ok: false };
  let user: any = null;
  try {
    user = JSON.parse(p.get('user') ?? 'null');
  } catch {
    /* ignore */
  }
  return { ok: true, user };
}

function identify(user: any) {
  const uname = String(user?.username ?? '').toLowerCase();
  return {
    playerId: USERNAME_TO_PLAYER[uname] ?? null,
    isAdmin: ADMINS.has(uname),
    username: user?.username ?? null,
  };
}

const dbH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

async function getStateRow(): Promise<any> {
  const r = await fetch(`${SB_URL}/rest/v1/state?id=eq.1&select=line,revealed,results`, { headers: dbH });
  const rows = await r.json();
  return rows[0] ?? { line: 'open', revealed: false, results: {} };
}
async function getBets(): Promise<{ player_id: string; bets: any[] }[]> {
  const r = await fetch(`${SB_URL}/rest/v1/bets?select=player_id,bets`, { headers: dbH });
  return await r.json();
}
async function upsertBets(pid: string, bets: any[]): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/bets`, {
    method: 'POST',
    headers: { ...dbH, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{ player_id: pid, bets, updated_at: new Date().toISOString() }]),
  });
}
async function patchState(patch: Record<string, unknown>): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/state?id=eq.1`, {
    method: 'PATCH',
    headers: { ...dbH, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}
async function clearBets(): Promise<void> {
  await fetch(`${SB_URL}/rest/v1/bets?player_id=neq.__none__`, {
    method: 'DELETE',
    headers: { ...dbH, Prefer: 'return=minimal' },
  });
}

function outcomeLoser(id: string): string | null {
  const m = id.match(/^m:g[AB]-([a-z]+)-([a-z]+):([a-z]+)$/);
  if (!m) return null;
  const [, p1, p2, w] = m;
  if (w !== p1 && w !== p2) return null;
  return w === p1 ? p2 : p1;
}
function validOutcomeId(id: string): boolean {
  if (id.startsWith('m:')) return outcomeLoser(id) !== null;
  const mm = id.match(/^(exit|final|champ):([a-z]+)$/);
  if (mm) return PLAYERS.has(mm[2]);
  const sp = id.match(/^sp:(.+)$/);
  if (sp) return SPECIALS.has(sp[1]);
  return false;
}
function validateBets(pid: string, bets: any): { ok: boolean; error?: string } {
  if (!Array.isArray(bets)) return { ok: false, error: 'bad-bets' };
  const seen = new Set<string>();
  let total = 0;
  for (const b of bets) {
    if (typeof b?.outcomeId !== 'string' || !Number.isInteger(b?.points)) return { ok: false, error: 'bad-bet' };
    if (!validOutcomeId(b.outcomeId)) return { ok: false, error: 'unknown-outcome' };
    if (seen.has(b.outcomeId)) return { ok: false, error: 'dup-outcome' };
    seen.add(b.outcomeId);
    if (b.points < 10 || b.points > 50) return { ok: false, error: 'stake-10-50' };
    if (outcomeLoser(b.outcomeId) === pid) return { ok: false, error: 'self-loss' };
    total += b.points;
  }
  if (total > 100) return { ok: false, error: 'over-100' };
  return { ok: true };
}

function publicState(row: any, allBets: { player_id: string; bets: any[] }[], me: { playerId: string | null }) {
  const line = row.line ?? 'open';
  const betsMap: Record<string, any[]> = {};
  const placed: string[] = [];
  for (const b of allBets) if (b.bets?.length) placed.push(b.player_id);
  if (line === 'closed') {
    for (const b of allBets) betsMap[b.player_id] = b.bets;
  } else if (me.playerId) {
    const mine = allBets.find((b) => b.player_id === me.playerId);
    if (mine) betsMap[me.playerId] = mine.bets;
  }
  return { line, revealed: row.revealed ?? false, results: row.results ?? {}, bets: betsMap, placed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad-json' }, 400);
  }
  const { action, initData, payload } = body ?? {};
  const auth = await verifyInitData(initData ?? '');
  const me = auth.ok ? identify(auth.user) : { playerId: null, isAdmin: false, username: null };

  try {
    if (action === 'getState' || action === 'ping') {
      const [row, allBets] = await Promise.all([getStateRow(), getBets()]);
      return json({ ok: true, me, ...publicState(row, allBets, me) });
    }
    if (action === 'saveBets') {
      if (!auth.ok) return json({ ok: false, error: 'no-auth' }, 401);
      if (!me.playerId) return json({ ok: false, error: 'not-a-player' }, 403);
      const row = await getStateRow();
      if ((row.line ?? 'open') !== 'open') return json({ ok: false, error: 'line-closed' }, 409);
      const v = validateBets(me.playerId, payload?.bets ?? []);
      if (!v.ok) return json({ ok: false, error: v.error }, 400);
      await upsertBets(me.playerId, payload.bets);
      return json({ ok: true });
    }
    if (action === 'admin') {
      if (!auth.ok || !me.isAdmin) return json({ ok: false, error: 'not-admin' }, 403);
      const op = payload?.op;
      const row = await getStateRow();
      const results = { ...(row.results ?? {}) };
      if (op === 'setResult') {
        results[payload.matchId] = { sets: payload.sets };
        await patchState({ results });
      } else if (op === 'voidMatch') {
        results[payload.matchId] = { sets: [], voided: true };
        await patchState({ results });
      } else if (op === 'clearMatch') {
        delete results[payload.matchId];
        await patchState({ results });
      } else if (op === 'openLine') {
        await patchState({ line: 'open' });
      } else if (op === 'closeLine') {
        await patchState({ line: 'closed' });
      } else if (op === 'markRevealed') {
        await patchState({ revealed: true });
      } else if (op === 'reset') {
        await patchState({ results: {}, line: 'open', revealed: false });
        await clearBets();
      } else {
        return json({ ok: false, error: 'bad-op' }, 400);
      }
      return json({ ok: true });
    }
    return json({ error: 'unknown-action' }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
