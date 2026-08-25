import type { GroupId, StandingRow } from '../types';
import { useTournament } from '../state/TournamentContext';
import { GROUPS, PLAYERS_BY_ID } from '../data/participants';
import { useFlashClass } from '../lib/hooks';
import { cx } from '../lib/ui';
import { Monogram, SectionTitle } from '../components/primitives';

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const COLS = 'grid grid-cols-[18px_1fr_22px_22px_38px_42px] items-center gap-1';

function GroupTable({ group }: { group: GroupId }) {
  const { view } = useTournament();
  const rows = view.standings[group];
  const complete = view.groupComplete[group];
  const flash = useFlashClass(
    rows.map((r) => `${r.playerId}:${r.wins}:${r.setDiff}:${r.pointDiff}`).join('|'),
  );

  return (
    <div className={cx('card overflow-hidden', flash)}>
      <div className="flex items-center justify-between border-b border-hair px-3 py-2">
        <span className="font-display text-base font-bold">Группа {group}</span>
        <span className="label-caps">{complete ? 'группа сыграна' : 'идёт'}</span>
      </div>

      <div className={cx(COLS, 'px-3 py-1.5 text-faint')}>
        <span />
        <span className="label-caps">игрок</span>
        <span className="label-caps text-center">В</span>
        <span className="label-caps text-center">П</span>
        <span className="label-caps text-center">парт.</span>
        <span className="label-caps text-right">очки</span>
      </div>

      {rows.map((r: StandingRow, i) => (
        <div
          key={r.playerId}
          className={cx(
            COLS,
            'border-t border-hair/60 px-3 py-2',
            r.qualified && 'bg-[color:var(--accent-flash)]',
          )}
        >
          <span
            className={cx(
              'tnum text-center font-mono text-sm',
              r.qualified ? 'font-bold text-accent' : 'text-faint',
            )}
          >
            {i + 1}
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <Monogram id={r.playerId} size={28} ring={r.qualified ? 'accent' : null} />
            <span className="truncate text-sm font-semibold">{PLAYERS_BY_ID[r.playerId].name}</span>
          </div>
          <span className="tnum text-center font-mono text-sm font-bold">{r.wins}</span>
          <span className="tnum text-center font-mono text-sm text-muted">{r.losses}</span>
          <span className="tnum text-center font-mono text-sm">{sign(r.setDiff)}</span>
          <span className="tnum text-right font-mono text-sm">{sign(r.pointDiff)}</span>
        </div>
      ))}

      {complete && (
        <div className="border-t border-hair px-3 py-2 text-xs text-muted">
          Выходят: <b className="text-ink">{PLAYERS_BY_ID[rows[0].playerId].name}</b> и{' '}
          <b className="text-ink">{PLAYERS_BY_ID[rows[1].playerId].name}</b>
        </div>
      )}
    </div>
  );
}

export function GroupsScreen() {
  return (
    <div className="space-y-4">
      <SectionTitle>Групповой этап · круговая</SectionTitle>
      <GroupTable group="A" />
      <GroupTable group="B" />
      <p className="px-1 text-xs leading-relaxed text-muted">
        Подсвечены — выходят в плей-офф (топ-2). Тайбрейки: 1) личная встреча, 2) разница партий, 3)
        разница очков; при равенстве троих — мини-таблица между ними. «парт.» и «очки» — разница
        выигранных и проигранных. Группы: A — {GROUPS.A.map((p) => p.name).join(', ')}; B —{' '}
        {GROUPS.B.map((p) => p.name).join(', ')}.
      </p>
    </div>
  );
}
