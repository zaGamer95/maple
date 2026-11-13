import { useEffect, useMemo, useState } from 'react';
import { formatMeso } from '../lib/format';
import {
  DEFAULT_TRACE_SCROLLS,
  DEFAULT_TRACE_SETTINGS,
  NOLGEUNG_MEAN,
  breakEven,
  nolgeungStatEq,
  restores,
  scrollResult,
  simulate,
  successRate,
  traceValue,
  type TraceScroll,
  type TraceSettings,
} from '../lib/spellTrace';

const STORAGE_KEY = 'maple:spelltrace:v1';

type Saved = { settings: TraceSettings; scrolls: TraceScroll[] };

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Saved;
      const known = new Set(saved.scrolls.map((x) => x.id));
      return {
        settings: { ...DEFAULT_TRACE_SETTINGS, ...saved.settings },
        scrolls: [...saved.scrolls, ...DEFAULT_TRACE_SCROLLS.filter((x) => !known.has(x.id))],
      };
    }
  } catch {
    // 저장소를 못 쓰면 기본값
  }
  return { settings: DEFAULT_TRACE_SETTINGS, scrolls: DEFAULT_TRACE_SCROLLS };
}

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/,/g, '')));
const meso = (n: number) => `${formatMeso(Math.round(n))}`;
const pct = (r: number) => `${(r * 100).toFixed(0)}%`;
const n0 = (n: number) => Math.round(n).toLocaleString();

export default function SpellTraceCalc() {
  const [{ settings: s, scrolls }, setState] = useState<Saved>(load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: s, scrolls }));
    } catch {
      // 저장 못 해도 이번 화면에서는 동작
    }
  }, [s, scrolls]);

  const setS = (patch: Partial<TraceSettings>) => setState((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
  const setSc = (id: string, patch: Partial<TraceScroll>) =>
    setState((x) => ({ ...x, scrolls: x.scrolls.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)) }));

  const rs = useMemo(() => restores(s), [s]);
  const best = rs[0];
  const results = scrolls.map((sc) => ({ sc, r: scrollResult(sc, s, best.cost) }));
  const nolEq = nolgeungStatEq(s);
  const nolPerStat = s.nolgeung / nolEq;

  // 계획: 확률·주흔이 채워진 첫 주문서 (보통 15%)
  const planScroll = results.find((x) => x.r)?.sc;
  const plan = useMemo(() => {
    if (!planScroll) return null;
    const rate = successRate(planScroll, s);
    const whiteRate = best.id === 'white5' ? 0.05 : best.id === 'white10' ? 0.1 : null;
    return { rate, whiteRate, sim: simulate(rate, s.targetSuccess, whiteRate) };
  }, [planScroll, s, best.id]);

  return (
    <section>
      <h1>주흔 효율 계산기</h1>
      <p className="muted">
        주흔작에서 실패한 슬롯을 순백으로 복구하고 같은 슬롯을 다시 시도할 때, 성공 1작에 드는 비용을 비교해요. 순백은 경매장
        5%·10%와 주흔 순백 100% 중 가장 싼 것을 써요. 입력값은 이 브라우저에 저장돼요.
      </p>

      <div className="card edit-form">
        <div className="form-grid">
          <label>
            주흔 개당 시세 (메소)
            <input inputMode="numeric" value={s.tracePrice} onChange={(e) => setS({ tracePrice: num(e.target.value) ?? 0 })} />
          </label>
          <label>
            경매장 순백 5% 개당 (메소)
            <input
              inputMode="numeric"
              placeholder="비우면 제외"
              value={s.white5 ?? ''}
              onChange={(e) => setS({ white5: num(e.target.value) })}
            />
          </label>
          <label>
            경매장 순백 10% 개당 (메소)
            <input
              inputMode="numeric"
              placeholder="비우면 제외"
              value={s.white10 ?? ''}
              onChange={(e) => setS({ white10: num(e.target.value) })}
            />
          </label>
          <label>
            주흔 순백 100% (주흔 개수, 정가)
            <input inputMode="numeric" value={s.whiteTraces} onChange={(e) => setS({ whiteTraces: num(e.target.value) ?? 0 })} />
          </label>
          <label>
            확률 보너스 (%p, 피버 제외)
            <input inputMode="decimal" value={s.bonus} onChange={(e) => setS({ bonus: num(e.target.value) ?? 0 })} />
          </label>
          <label>
            놀긍 1장 (메소)
            <input inputMode="numeric" value={s.nolgeung} onChange={(e) => setS({ nolgeung: num(e.target.value) ?? 0 })} />
          </label>
          <label>
            공격력 1 = 주스탯
            <input inputMode="decimal" value={s.attToStat} onChange={(e) => setS({ attToStat: num(e.target.value) ?? 0 })} />
          </label>
          <label>
            이번에 성공시킬 작 수
            <input
              inputMode="numeric"
              value={s.targetSuccess}
              onChange={(e) => setS({ targetSuccess: num(e.target.value) ?? 0 })}
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="check">
            <input type="checkbox" checked={s.sundayHalf} onChange={(e) => setS({ sundayHalf: e.target.checked })} /> 썬데이 주흔
            반값
          </label>
          <label className="check">
            <input type="checkbox" checked={s.fever} onChange={(e) => setS({ fever: e.target.checked })} /> 피버 타임 (금~일,
            +10%p)
          </label>
          <label className="check">
            <input type="checkbox" checked={s.ownedTraces} onChange={(e) => setS({ ownedTraces: e.target.checked })} /> 가진 주흔
            사용 (판매 수령가 {n0(traceValue({ ...s, ownedTraces: true }))}로 계산)
          </label>
        </div>
        <p className="muted small">
          확률 보너스 기본값 14 = 손재주 10 + 주문서 강화의 달인 4. 순백 5%·10%는 보너스 없이 고정 확률이에요. 썬데이 반값은 주흔
          순백에도 적용된다고 봐요.
        </p>
      </div>

      <h2>업그레이드 횟수 1회 복구</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>방법</th>
              <th className="num">1회 복구 기대 비용</th>
              <th className="num">같아지는 가격</th>
            </tr>
          </thead>
          <tbody>
            {rs.map((r, i) => (
              <tr key={r.id}>
                <td>
                  {i === 0 ? <b>{r.label}</b> : r.label} <span className="muted small">{r.detail}</span>
                  {i === 0 && <span className="badge">가장 쌈</span>}
                </td>
                <td className="num">{meso(r.cost)}</td>
                <td className="num">
                  {r.id === 'white5' && `개당 ${meso(breakEven(0.05, s))} 미만이면 주흔 순백보다 쌈`}
                  {r.id === 'white10' && `개당 ${meso(breakEven(0.1, s))} 미만이면 주흔 순백보다 쌈`}
                  {r.id === 'whiteTrace' && '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>성공 1작 비용</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>주문서</th>
              <th className="num">1회 주흔 (정가)</th>
              <th className="num">성공 시 주스탯 · 공</th>
              <th className="num">성공 확률</th>
              <th className="num">성공 1작 비용</th>
              <th className="num">주스탯 1당</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ sc, r }) => (
              <tr key={sc.id}>
                <td>{sc.name}</td>
                <td className="num">
                  <input
                    className="inline"
                    inputMode="numeric"
                    placeholder="입력"
                    value={sc.traces ?? ''}
                    onChange={(e) => setSc(sc.id, { traces: num(e.target.value) })}
                  />
                </td>
                <td className="num">
                  <input
                    className="inline"
                    inputMode="numeric"
                    placeholder="스탯"
                    value={sc.stat ?? ''}
                    onChange={(e) => setSc(sc.id, { stat: num(e.target.value) })}
                  />{' '}
                  <input
                    className="inline"
                    inputMode="numeric"
                    placeholder="공"
                    value={sc.att ?? ''}
                    onChange={(e) => setSc(sc.id, { att: num(e.target.value) })}
                  />
                </td>
                <td className="num">{pct(successRate(sc, s))}</td>
                <td className="num">
                  {r ? (
                    <>
                      {meso(r.cost)}
                      <div className="muted small">
                        시도 {r.tries.toFixed(1)} · 복구 {r.fails.toFixed(1)} · 주흔 {n0(r.traces)}
                      </div>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="num">{r?.perStat ? meso(r.perStat) : '-'}</td>
              </tr>
            ))}
            <tr>
              <td>놀긍 (참고)</td>
              <td className="num">-</td>
              <td className="num muted small">공·주스탯·부스탯 각 평균 +{NOLGEUNG_MEAN.toFixed(2)}</td>
              <td className="num">100%</td>
              <td className="num">{meso(s.nolgeung)}</td>
              <td className="num">{meso(nolPerStat)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {plan && planScroll && (
        <>
          <h2>
            {planScroll.name} 성공 {s.targetSuccess}작 준비물
          </h2>
          <ul>
            <li>
              성공 확률 {pct(plan.rate)}, 실패(복구) 평균 {n0(plan.sim.fails[0])}번 · 운 나쁘면(90%) {n0(plan.sim.fails[1])}번
            </li>
            <li>
              시도에 쓰는 주흔 평균{' '}
              {n0(((s.targetSuccess + plan.sim.fails[0]) * (planScroll.traces ?? 0)) / (s.sundayHalf ? 2 : 1))}개
            </li>
            {plan.sim.scrolls ? (
              <li>
                {best.label}: 평균 {n0(plan.sim.scrolls[0])}장 · 운 나쁘면(90%) {n0(plan.sim.scrolls[1])}장
              </li>
            ) : (
              <li>주흔 순백: 평균 {n0(plan.sim.fails[0] * (s.sundayHalf ? s.whiteTraces / 2 : s.whiteTraces))}개 더</li>
            )}
          </ul>
        </>
      )}
      <p className="muted small">
        실패하면 업그레이드 횟수가 1 줄고, 그 횟수를 순백으로 되살려 다시 시도한다고 계산해요. 놀긍은 성공 확률 100%, 공식
        확률표의 평균값이에요. 주스탯 환산은 STR 같은 주스탯 + 공격력 × 위에 적은 배수예요.
      </p>
    </section>
  );
}
