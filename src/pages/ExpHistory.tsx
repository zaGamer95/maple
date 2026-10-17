import { useMemo, useState } from 'react';
import expData from '../data/expHistory.json';
import { formatKoreanNumber, todayKst } from '../lib/format';
import { useStore } from '../store';

interface Point {
  date: string;
  level: number;
  exp: number;
  rate: number;
}

const data = expData as unknown as {
  character: string | null;
  latest: (Omit<Point, 'date'> & { fetchedAt: string }) | null;
  required: Record<string, number>;
  points: Point[];
};

interface DayRow extends Point {
  /** 그날 획득 경험치 (레벨 필요 경험치를 몰라 계산 못하면 null) */
  gain: number | null;
  /** 레벨 진행도 증가 (1 = 1레벨) */
  progress: number;
  partial?: boolean;
}

/** prev → cur 사이 획득 경험치. 레벨이 올랐으면 중간 레벨의 필요 경험치를 더한다 */
function gainBetween(prev: Point, cur: Point): number | null {
  if (cur.level === prev.level) return cur.exp - prev.exp;
  const req = (lv: number) => data.required[lv];
  if (!req(prev.level)) return null;
  let sum = req(prev.level) - prev.exp + cur.exp;
  for (let lv = prev.level + 1; lv < cur.level; lv++) {
    if (!req(lv)) return null;
    sum += req(lv);
  }
  return sum;
}

function buildRows(): DayRow[] {
  const pts: (Point & { partial?: boolean })[] = [...data.points];
  const today = todayKst();
  if (data.latest && (!pts.length || pts[pts.length - 1].date < today)) pts.push({ date: today, ...data.latest, partial: true });
  return pts.slice(1).map((cur, i) => {
    const prev = pts[i];
    return {
      ...cur,
      gain: gainBetween(prev, cur),
      progress: cur.level + cur.rate / 100 - (prev.level + prev.rate / 100),
    };
  });
}

const RANGES = [
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
  { days: 365, label: '1년' },
];

export default function ExpHistory() {
  const { expNotes, hunts, setExpNote } = useStore();
  const all = useMemo(buildRows, []);
  const [range, setRange] = useState(30);
  const [onlyGain, setOnlyGain] = useState(true);
  const notes = useMemo(() => new Map(expNotes.map((n) => [n.date, n.note])), [expNotes]);
  const huntsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hunts) if (h.characterId === data.character) m.set(h.date, (m.get(h.date) ?? 0) + 1);
    return m;
  }, [hunts]);

  if (all.length === 0) {
    return (
      <div className="card">
        <h2>경험치 히스토리</h2>
        <p className="muted">아직 받은 일별 기록이 없어요. 다음 넥슨 데이터 갱신 때 채워져요.</p>
      </div>
    );
  }

  const shown = all.slice(-range);
  const sumGain = (rows: DayRow[]) => rows.reduce((s, r) => s + (r.gain ?? 0), 0);
  const last7 = all.slice(-7);
  const avg7 = sumGain(last7) / last7.length;
  const latest = all[all.length - 1];
  const req = data.required[latest.level];
  const remain = req ? req - latest.exp : null;
  const etaDays = remain && avg7 > 0 ? remain / avg7 : null;
  const tableRows = [...shown].reverse().filter((r) => !onlyGain || (r.gain ?? r.progress) > 0 || notes.has(r.date));

  return (
    <div className="card">
      <div className="detail-head">
        <h2>경험치 히스토리 · {data.character}</h2>
        <div className="filters" style={{ margin: 0 }}>
          {RANGES.map((r) => (
            <button key={r.days} className={range === r.days ? '' : 'ghost'} onClick={() => setRange(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">현재</div>
          <div className="stat-value">Lv.{latest.level}</div>
          <div className="stat-sub">{latest.rate.toFixed(3)}%</div>
        </div>
        <div className="stat">
          <div className="stat-label">최근 7일</div>
          <div className="stat-value">{formatKoreanNumber(sumGain(last7))}</div>
          <div className="stat-sub">하루 평균 {formatKoreanNumber(avg7)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">최근 {range}일</div>
          <div className="stat-value">{formatKoreanNumber(sumGain(shown))}</div>
          <div className="stat-sub">레벨 {shown.reduce((s, r) => s + r.progress, 0).toFixed(2)} 상승</div>
        </div>
        <div className="stat">
          <div className="stat-label">다음 레벨까지</div>
          <div className="stat-value">{remain != null ? formatKoreanNumber(remain) : '-'}</div>
          <div className="stat-sub">{etaDays != null ? `최근 7일 페이스로 약 ${Math.ceil(etaDays)}일` : ''}</div>
        </div>
      </div>

      <GainChart rows={shown} notes={notes} />

      <label className="check small">
        <input type="checkbox" checked={onlyGain} onChange={(e) => setOnlyGain(e.target.checked)} />
        경험치를 얻은 날·메모 있는 날만
      </label>
      <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th className="num">레벨</th>
              <th className="num">획득 경험치</th>
              <th className="num">레벨 진행</th>
              <th className="num">사냥 기록</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.date}>
                <td className="mono">
                  {r.date}
                  {r.partial ? <span className="muted small"> (오늘, 진행 중)</span> : ''}
                </td>
                <td className="num">
                  {r.level} <span className="muted small">{r.rate.toFixed(2)}%</span>
                </td>
                <td className="num">{r.gain != null ? formatKoreanNumber(r.gain) : '-'}</td>
                <td className="num">{r.progress > 0 ? `+${(r.progress * 100).toFixed(2)}%` : ''}</td>
                <td className="num">{huntsByDate.get(r.date) ? `${huntsByDate.get(r.date)}건` : ''}</td>
                <td className="note-cell">
                  {notes.get(r.date)}{' '}
                  <button
                    className="ghost small"
                    onClick={() => {
                      const next = prompt(`${r.date} 메모 (비우면 삭제)`, notes.get(r.date) ?? '');
                      if (next != null) setExpNote(r.date, next);
                    }}
                  >
                    {notes.has(r.date) ? '수정' : '메모'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        넥슨 일별 데이터(그날 끝 기준)의 차이로 계산해요. 오늘 값은 최근 갱신 시점까지예요. 레벨업한 날은 레벨별 필요 경험치를 기록에서
        역산해 더해요.
      </p>
    </div>
  );
}

/** 일별 획득 경험치 막대 (단일 계열, 제목이 이름 역할) */
function GainChart({ rows, notes }: { rows: DayRow[]; notes: Map<string, string> }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 200;
  const pad = { l: 44, r: 8, t: 12, b: 22 };
  const max = Math.max(1, ...rows.map((r) => r.gain ?? 0));
  const step = (W - pad.l - pad.r) / rows.length;
  const barW = Math.max(2, step - 2);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0.5, 1].map((f) => f * max);
  const h = hover != null ? rows[hover] : null;

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="일별 획득 경험치"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.floor((px - pad.l) / step);
          setHover(i >= 0 && i < rows.length ? i : null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="tick" x={pad.l - 4} y={y(t) + 4} textAnchor="end">
              {formatKoreanNumber(t).split(' ')[0]}
            </text>
          </g>
        ))}
        <line className="axis" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
        {rows.map((r, i) => {
          const v = r.gain ?? 0;
          const top = y(v);
          return (
            <rect
              key={r.date}
              className={`bar${hover === i ? ' hover' : ''}${r.partial ? ' partial' : ''}`}
              x={pad.l + i * step + 1}
              y={top}
              width={barW}
              height={Math.max(0, H - pad.b - top)}
              rx={Math.min(4, barW / 2)}
            />
          );
        })}
        <text className="tick" x={pad.l} y={H - 6}>
          {rows[0]?.date}
        </text>
        <text className="tick" x={W - pad.r} y={H - 6} textAnchor="end">
          {rows[rows.length - 1]?.date}
        </text>
      </svg>
      {h && (
        <div className="tooltip" style={{ left: `${((pad.l + (hover! + 0.5) * step) / W) * 100}%` }}>
          <div className="muted small">
            {h.date} · Lv.{h.level} {h.rate.toFixed(2)}%
          </div>
          <b>{h.gain != null ? formatKoreanNumber(h.gain) : '-'}</b>
          {notes.get(h.date) && <div className="small">{notes.get(h.date)}</div>}
        </div>
      )}
    </div>
  );
}
