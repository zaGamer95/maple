import expData from '../data/expHistory.json';
import milestoneData from '../data/milestones.json';
import { todayKst } from '../lib/format';

interface Symbol {
  region: string;
  name: string;
  icon: string;
  level: number;
  firstDate: string | null;
  /** 이 날짜 이전에 이미 있었음 (넥슨 일별 데이터 시작 전) */
  before?: string;
}

const data = milestoneData as unknown as {
  character: string | null;
  symbols: Symbol[];
  medal: { name: string; icon: string; description: string | null; shapeName: string | null; shapeIcon: string | null } | null;
};
const exp = expData as unknown as {
  latest: { level: number } | null;
  points: { date: string; level: number }[];
};

/** 입장 레벨 순. medal 은 받은 지역 훈장 이름 (알려 주면 채운다) */
const REGIONS: { name: string; group: '아케인리버' | '그란디스'; level: number; medal?: string }[] = [
  { name: '소멸의 여로', group: '아케인리버', level: 200 },
  { name: '츄츄 아일랜드', group: '아케인리버', level: 210 },
  { name: '레헬른', group: '아케인리버', level: 220 },
  { name: '아르카나', group: '아케인리버', level: 225 },
  { name: '모라스', group: '아케인리버', level: 230 },
  { name: '에스페라', group: '아케인리버', level: 235 },
  { name: '셀라스', group: '아케인리버', level: 240 },
  { name: '문브릿지', group: '아케인리버', level: 245 },
  { name: '고통의 미궁', group: '아케인리버', level: 250 },
  { name: '리멘', group: '아케인리버', level: 255 },
  { name: '세르니움', group: '그란디스', level: 260 },
  { name: '아르크스', group: '그란디스', level: 265 },
  { name: '오디움', group: '그란디스', level: 270 },
  { name: '도원경', group: '그란디스', level: 275 },
  { name: '아르테리아', group: '그란디스', level: 280 },
  { name: '카르시온', group: '그란디스', level: 285 },
  { name: '탈라하트', group: '그란디스', level: 290 },
];

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** 일별 레벨 기록에서 레벨이 오른 날. 넥슨 일별 데이터는 그날 끝 기준이라 그날 레벨업한 것 */
function levelUps(): { level: number; date: string }[] {
  const pts = exp.points;
  const out: { level: number; date: string }[] = [];
  for (let i = 1; i < pts.length; i++) {
    for (let lv = pts[i - 1].level + 1; lv <= pts[i].level; lv++) out.push({ level: lv, date: pts[i].date });
  }
  const last = pts[pts.length - 1];
  if (exp.latest && last && exp.latest.level > last.level) {
    for (let lv = last.level + 1; lv <= exp.latest.level; lv++) out.push({ level: lv, date: todayKst() });
  }
  return out;
}

export default function Milestones() {
  const ups = levelUps();
  const reachedAt = new Map(ups.map((u) => [u.level, u.date]));
  const symbols = new Map(data.symbols.map((s) => [s.region, s]));
  const firstDataDate = exp.points[0]?.date;

  return (
    <div className="card">
      <div className="detail-head">
        <h2>성장 기록 · {data.character}</h2>
        {data.medal && (
          <span className="item small" title={data.medal.description ?? undefined}>
            <img src={data.medal.icon} alt="" width={24} height={24} loading="lazy" />
            착용 훈장 {data.medal.name}
            {data.medal.shapeName && data.medal.shapeName !== data.medal.name && (
              <>
                <span className="muted">· 외형</span>
                {data.medal.shapeIcon && <img src={data.medal.shapeIcon} alt="" width={24} height={24} loading="lazy" />}
                {data.medal.shapeName}
              </>
            )}
          </span>
        )}
      </div>

      <h3>지역 입성</h3>
      <div className="region-grid">
        {REGIONS.map((r) => {
          const s = symbols.get(r.name);
          const entered = s?.firstDate ?? null;
          const byLevel = reachedAt.get(r.level);
          return (
            <div key={r.name} className={`region${s ? '' : ' region-none'}`}>
              {s ? <img src={s.icon} alt="" width={32} height={32} loading="lazy" /> : <span className="region-blank" />}
              <div className="grow">
                <div>
                  <b>{r.name}</b> <span className="muted small">Lv.{r.level}</span>
                </div>
                <div className="small mono">
                  {entered ?? (s?.before ? `${s.before} 이전` : byLevel ? `${byLevel} (레벨 기준)` : s ? '확인 중' : '-')}
                </div>
                <div className="muted small">
                  {s ? `심볼 Lv.${s.level}` : '심볼 없음'}
                  {r.medal ? ` · 훈장 ${r.medal}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h3>레벨업</h3>
      {ups.length === 0 ? (
        <p className="muted">일별 기록에 레벨업이 없어요.</p>
      ) : (
        <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th className="num">레벨</th>
                <th>날짜</th>
                <th className="num">걸린 기간</th>
              </tr>
            </thead>
            <tbody>
              {[...ups].reverse().map((u, i, arr) => {
                const prev = arr[i + 1];
                return (
                  <tr key={u.level}>
                    <td className="num">Lv.{u.level}</td>
                    <td className="mono">{u.date}</td>
                    <td className="num">{prev ? `${daysBetween(prev.date, u.date)}일` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        입성일은 지역 심볼을 처음 얻은 날이에요. 넥슨 일별 데이터가 2023-12-21부터라 그 전에 얻은 심볼은 "이전"으로 나와요. 레벨업
        기록은 {firstDataDate ?? '-'}부터 있어요. 보유 훈장 목록은 넥슨 API 가 제공하지 않아 착용 훈장만 보여요.
      </p>
    </div>
  );
}
