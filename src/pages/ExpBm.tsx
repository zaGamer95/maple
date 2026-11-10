import { useMemo } from 'react';
import bmData from '../data/expBm.json';
import { formatKoreanNumber, formatMeso } from '../lib/format';

interface ExpBm {
  id: string;
  name: string;
  category: string;
  /** 시즌 한정 BM 의 판매 시기 메모 */
  season?: string;
  /** 단종되어 지금은 구할 수 없음 (회색으로 맨 아래) */
  discontinued?: boolean;
  /** 사용 횟수·시간 한도 */
  limit: string;
  /** 한 번 쓰는 데 드는 값: 현금(원), 메이플포인트, 메이플크레딧, 메소 중 하나 */
  cost: { won?: number; points?: number; credits?: number; meso?: number };
  /** 한 번에 얻는 경험치 (모르면 null) */
  exp: number | null;
  /** 지속형(반지 등): 사냥 1시간에 더 얻는 경험치. 한 달 사냥 시간을 곱해 exp 로 쓴다 */
  expPerHour?: number;
  /** 같이 얻어서 팔 수 있는 것의 현금 가치 (원) */
  refundWon: number;
  measuredAt: string | null;
  source: string;
  note?: string;
}

const ITEMS = bmData as ExpBm[];

/** 환산 기준 (MVP작 계산기와 같은 값) */
const WON_PER_EOK = 1450; // 메소 1억의 현금 시세
const MESO_MARKET = 2246; // 메이플포인트 / 1억 메소
const CREDIT_WON = 0.83; // 메이플크레딧 1개를 큐브로 팔 때 현금 (2026-11 프라임 에디셔널 큐브 기준)
const CREDIT_RATE = 0.05; // 캐시로 산 것은 5% 가 크레딧으로 돌아온다

/** 메이플포인트는 메소로 사는 값으로 친다 (포인트 1 = 1450/2246 원) */
function costWon(c: ExpBm['cost']): number {
  if (c.won != null) return c.won * (1 - CREDIT_RATE * CREDIT_WON);
  if (c.points != null) return (c.points * WON_PER_EOK) / MESO_MARKET;
  if (c.credits != null) return c.credits * CREDIT_WON;
  if (c.meso != null) return (c.meso / 1e8) * WON_PER_EOK;
  return 0;
}

function costLabel(c: ExpBm['cost']): string {
  if (c.won != null) return `${c.won.toLocaleString()}캐시`;
  if (c.points != null) return `${c.points.toLocaleString()} 포인트`;
  if (c.credits != null) return `${c.credits.toLocaleString()} 크레딧`;
  if (c.meso != null) return `${formatMeso(c.meso)} 메소`;
  return '-';
}

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;

/** 반지·칭호처럼 끼고 사냥하는 것은 한 달 사냥 시간에 따라 효율이 달라진다 (30일 기준) */
const SCENARIOS = [
  { id: 'daily30', label: '소재', sub: '하루 30분', hours: 15 },
  { id: 'daily2h', label: '재획', sub: '하루 2시간', hours: 60 },
  { id: 'daily5h', label: '메제', sub: '하루 5시간', hours: 150 },
];
const SORT_SCENARIO = 1;

export default function ExpBmTable() {
  const rows = useMemo(
    () =>
      ITEMS.map((it) => {
        const net = costWon(it.cost) - it.refundWon;
        const exps = SCENARIOS.map((sc) => (it.expPerHour ? it.expPerHour * sc.hours : it.exp));
        return { it, net, exps, perTril: exps.map((e) => (e ? net / (e / 1e12) : null)) };
      }).sort(
        (a, b) =>
          Number(!!a.it.discontinued) - Number(!!b.it.discontinued) ||
          (a.perTril[SORT_SCENARIO] ?? Infinity) - (b.perTril[SORT_SCENARIO] ?? Infinity),
      ),
    [],
  );

  return (
    <section>
      <h1>경험치 BM 가성비</h1>
      <p className="muted">
        경험치를 사는 수단별로 경험치 1조를 얻는 데 드는 실제 비용을 비교해요 (Lv.291 기준). 콘텐츠 경험치는 고정값이라 공개 시트
        값을, 쿠폰은 밤의 길 3에서 분당 320마리 사냥을 가정한 이론값을, 시간제는 실측을 써요. 시즌마다 새 BM 이 나오면 같은
        기준으로 추가해요.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>수단</th>
              <th>종류 · 한도</th>
              <th className="num">가격</th>
              <th className="num">실제 비용</th>
              <th className="num">경험치</th>
              {SCENARIOS.map((sc) => (
                <th key={sc.id} className="num">
                  1조당 · {sc.label}
                  <div className="small">{sc.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ it, net, exps, perTril }) => (
              <tr
                key={it.id}
                className={it.discontinued ? 'row-disabled' : undefined}
                aria-disabled={it.discontinued || undefined}
              >
                <td className="note-cell bm-name" title={`기준: ${it.source}${it.measuredAt ? ` (${it.measuredAt})` : ''}`}>
                  <b>{it.name}</b> {it.discontinued && <span className="badge">단종</span>}
                  {it.note && <div className="muted small">{it.note}</div>}
                </td>
                <td className="note-cell small">
                  {it.category}
                  <div className="muted">{it.limit}</div>
                  {it.season && <span className="badge">{it.season}</span>}
                </td>
                <td className="num">{costLabel(it.cost)}</td>
                <td className="num">
                  {won(net)}
                  {it.refundWon > 0 && <div className="muted small">회수 {won(it.refundWon)} 반영</div>}
                </td>
                <td className="num">
                  {it.expPerHour ? (
                    <>
                      시간당 {formatKoreanNumber(it.expPerHour)}
                      <div className="muted small">
                        한 달 {SCENARIOS.map((sc, i) => `${sc.label} ${formatKoreanNumber(exps[i])}`).join(' · ')}
                      </div>
                    </>
                  ) : exps[0] ? (
                    formatKoreanNumber(exps[0])
                  ) : (
                    <span className="muted">측정 필요</span>
                  )}
                </td>
                {perTril.map((v, i) => (
                  <td key={SCENARIOS[i].id} className="num">
                    {v != null ? i === SORT_SCENARIO ? <b>{won(v)}</b> : won(v) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        환산: 메소 1억 = {WON_PER_EOK.toLocaleString()}원, 메이플포인트는 메소마켓({MESO_MARKET.toLocaleString()}포인트/억)으로
        산다고 보고, 크레딧 1개 = {CREDIT_WON}원. 캐시로 산 것은 크레딧 5%를 빼고 계산해요. 주간·일일 한도가 있는 것은 1조당
        비용이 싸도 그만큼만 쓸 수 있어요. 각 값의 출처는 이름에 마우스를 올리면 보여요. 반지·칭호처럼 끼고 사냥하는 것만 사냥
        시간에 따라 달라지고, 정렬은 재획(하루 2시간) 기준이에요.
      </p>
    </section>
  );
}
