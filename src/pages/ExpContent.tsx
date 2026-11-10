import { useState } from 'react';
import contentData from '../data/expContent.json';
import { formatKoreanNumber } from '../lib/format';
import { nexon } from '../lib/nexon';

interface Dungeon {
  name: string;
  minLevel: number;
  stagePoints: number[];
  levels: { level: number; exp: number[] }[];
}
const data = contentData as unknown as {
  source: string;
  sourceUrl: string;
  epicDungeons: Dungeon[];
  monsterPark: { extraEntryPoints: number; note: string; regions: { region: string; minLevel: number; exp: number }[] };
  vipSauna: { pointsPerHour: number; levels: { level: number; exp: number }[] };
};

/** 메이플포인트는 메소로 산다고 본다 (경험치 BM 표와 같은 기준) */
const WON_PER_POINT = 1450 / 2246;
const perTril = (points: number, exp: number) =>
  exp > 0 ? `${Math.round((points * WON_PER_POINT) / (exp / 1e12)).toLocaleString()}원` : '-';

/** 레벨표에서 해당 레벨 행 (표 범위를 넘으면 가장 가까운 행) */
function atLevel<T extends { level: number }>(rows: T[], level: number): T | undefined {
  return rows.find((r) => r.level === level) ?? (level > rows[rows.length - 1]?.level ? rows[rows.length - 1] : undefined);
}

export default function ExpContent() {
  const mainLevel = Object.values(nexon.characters).find((c) => c.name === '자그3')?.level ?? 291;
  const [level, setLevel] = useState(mainLevel);
  const region = [...data.monsterPark.regions].reverse().find((r) => level >= r.minLevel);
  const sauna = atLevel(data.vipSauna.levels, level);

  return (
    <section>
      <h1>콘텐츠 경험치</h1>
      <p className="muted">
        에픽 던전·몬스터파크·VIP 사우나는 레벨·지역마다 정해진 경험치를 줘요.{' '}
        <label className="check">
          레벨
          <input
            className="cell-input"
            inputMode="numeric"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) || 0)}
          />
        </label>{' '}
        기준으로 보여요. 1조당 비용은 포인트를 메소로 산다고 본 값이에요.
      </p>

      <h2>에픽 던전 (주 1회)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>던전</th>
              <th className="num">입장 레벨</th>
              <th className="num">0단계</th>
              <th className="num">1단계</th>
              <th className="num">2단계</th>
              <th className="num">0→1 1조당</th>
              <th className="num">1→2 1조당</th>
            </tr>
          </thead>
          <tbody>
            {data.epicDungeons.map((d) => {
              const row = level >= d.minLevel ? atLevel(d.levels, level) : undefined;
              const [p0, p1, p2] = d.stagePoints;
              return (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td className="num">{d.minLevel}</td>
                  {row ? (
                    <>
                      <td className="num">{formatKoreanNumber(row.exp[0])}</td>
                      <td className="num">
                        {formatKoreanNumber(row.exp[1])}
                        <div className="muted small">{p1.toLocaleString()} 포인트</div>
                      </td>
                      <td className="num">
                        {formatKoreanNumber(row.exp[2])}
                        <div className="muted small">
                          +{p2.toLocaleString()} (합계 {(p1 + p2).toLocaleString()}) 포인트
                        </div>
                      </td>
                      <td className="num">{perTril(p1 - p0, row.exp[1] - row.exp[0])}</td>
                      <td className="num">{perTril(p2, row.exp[2] - row.exp[1])}</td>
                    </>
                  ) : (
                    <td className="muted" colSpan={5}>
                      입장 불가
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>몬스터파크</h2>
      <p className="muted small">
        {data.monsterPark.note}. 추가 입장 1회 {data.monsterPark.extraEntryPoints} 포인트.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>지역</th>
              <th className="num">입장 레벨</th>
              <th className="num">클리어 경험치</th>
              <th className="num">추가 입장 1조당</th>
            </tr>
          </thead>
          <tbody>
            {data.monsterPark.regions.map((r) => (
              <tr key={r.region} className={r === region ? 'main-row' : undefined}>
                <td>{r.region}</td>
                <td className="num">{r.minLevel}</td>
                <td className="num">{formatKoreanNumber(r.exp)}</td>
                <td className="num">{perTril(data.monsterPark.extraEntryPoints, r.exp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>VIP 사우나</h2>
      <p className="muted">
        Lv.{level} 1시간 {sauna ? formatKoreanNumber(sauna.exp) : '-'} · {data.vipSauna.pointsPerHour.toLocaleString()} 포인트 ·
        1조당 {sauna ? perTril(data.vipSauna.pointsPerHour, sauna.exp) : '-'} (9월 2배속 모드 추가 이전 값)
      </p>
      <p className="muted small">
        출처: <a href={data.sourceUrl}>{data.source}</a>. 이후 패치로 바뀐 값은 실측으로 고쳐요.
      </p>
    </section>
  );
}
