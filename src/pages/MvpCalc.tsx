import { useEffect, useMemo, useState } from 'react';
import { formatMeso } from '../lib/format';
import {
  DEFAULT_ITEMS,
  DEFAULT_SETTINGS,
  baselineRate,
  bestPlan,
  creditBonus,
  creditItemWon,
  itemRate,
  wonPerEokCost,
  type MvpItem,
  type MvpSettings,
} from '../lib/mvp';

const STORAGE_KEY = 'maple:mvp:v1';

type Saved = { settings: MvpSettings; items: MvpItem[] };

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Saved;
      // 기본 아이템의 이름·설명은 최신으로 바꾸고 (입력한 시세·개수는 유지), 새로 추가된 기본 아이템은 끝에 붙인다
      const defaults = new Map(DEFAULT_ITEMS.map((it) => [it.id, it]));
      const known = new Set(saved.items.map((it) => it.id));
      const items = saved.items.map((it) => {
        const d = defaults.get(it.id);
        if (!d) return it;
        // 구 마일리지 플가는 개편 후 한도 없이 두면 안 되므로 비어 있으면 0 으로
        const maxQty = it.id === 'karma-mileage' && it.maxQty == null ? 0 : it.maxQty;
        return { ...it, name: d.name, note: d.note, creditShop: d.creditShop, maxQty };
      });
      return {
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
        items: [...items, ...DEFAULT_ITEMS.filter((it) => !known.has(it.id))],
      };
    }
  } catch {
    // 저장소를 못 쓰면 기본값
  }
  return { settings: DEFAULT_SETTINGS, items: DEFAULT_ITEMS };
}

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/,/g, '')));

export default function MvpCalc() {
  const [{ settings: input, items }, setState] = useState<Saved>(load);
  // 크레딧은 큐브 또는 크레딧샵 아이템 중 가장 비싸게 팔리는 것으로 바꾼다고 본다
  const settings = useMemo(() => ({ ...input, creditItemWon: creditItemWon(items, input) }), [input, items]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: input, items }));
    } catch {
      // 저장 못 해도 이번 화면에서는 동작
    }
  }, [input, items]);

  const setS = (patch: Partial<MvpSettings>) => setState((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
  const setItem = (id: string, patch: Partial<MvpItem>) =>
    setState((x) => ({ ...x, items: x.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

  const base = baselineRate(settings);
  // 입력 중에 줄이 움직이지 않도록 목록 순서는 그대로 두고 순위만 표시한다
  const rank = useMemo(() => {
    const order = items
      .filter((it) => itemRate(it, settings) != null)
      .sort((a, b) => itemRate(b, settings)! - itemRate(a, settings)!);
    return new Map(order.map((it, i) => [it.id, i + 1]));
  }, [items, settings]);
  const plan = useMemo(() => bestPlan(items, settings), [items, settings]);
  const mepoOnlyLoss = settings.target * (1 - base);

  return (
    <section>
      <h1>MVP작 계산기</h1>
      <p className="muted">
        캐시샵에서 산 아이템을 경매장에 팔아 메소로 받고, 그 메소를 현금화하는 순환에서 손실이 가장 적은 조합을 찾아요. 경매장
        시세만 채우면 돼요. 입력값은 이 브라우저에 저장돼요.
      </p>

      <div className="card edit-form">
        <div className="form-grid">
          <label>
            이번에 채울 캐시 (원)
            <input inputMode="numeric" value={settings.target} onChange={(e) => setS({ target: num(e.target.value) ?? 0 })} />
          </label>
          <label>
            메소 현금 시세 (원 / 1억)
            <input
              inputMode="numeric"
              value={settings.wonPerEok}
              onChange={(e) => setS({ wonPerEok: num(e.target.value) ?? 0 })}
            />
          </label>
          <label>
            메소마켓 (포인트 / 1억)
            <input
              inputMode="numeric"
              value={settings.mesoMarket}
              onChange={(e) => setS({ mesoMarket: num(e.target.value) ?? 0 })}
            />
          </label>
          <label>
            경매장 수수료 (%)
            <input
              inputMode="decimal"
              value={settings.auctionFee * 100}
              onChange={(e) => setS({ auctionFee: (num(e.target.value) ?? 0) / 100 })}
            />
          </label>
          <label>
            현금화 때 내가 내는 수수료 (%)
            <input
              inputMode="decimal"
              value={settings.cashoutFee * 100}
              onChange={(e) => setS({ cashoutFee: (num(e.target.value) ?? 0) / 100 })}
            />
          </label>
          <label>
            프라임 큐브 경매장가 (억, 1만 크레딧)
            <input
              inputMode="decimal"
              placeholder="비우면 크레딧 제외"
              value={settings.primeCube ?? ''}
              onChange={(e) => setS({ primeCube: num(e.target.value) })}
            />
          </label>
          <label>
            프라임 에디셔널 큐브 경매장가 (억, 2만 크레딧)
            <input
              inputMode="decimal"
              placeholder="비우면 크레딧 제외"
              value={settings.primeAddCube ?? ''}
              onChange={(e) => setS({ primeAddCube: num(e.target.value) })}
            />
          </label>
          <label>
            판매 1건당 수고비 (원)
            <input
              inputMode="numeric"
              value={settings.effortPerListing}
              onChange={(e) => setS({ effortPerListing: num(e.target.value) ?? 0 })}
            />
          </label>
        </div>
        <p className="muted small">
          기준선(메포로 바로 메소화) 회수율 <b>{pct(base)}</b>
          {creditBonus(settings) > 0 && ` (메이플크레딧 +${pct(creditBonus(settings))} 포함)`} · 수고비가 클수록 판매 건수가 적은
          조합(묶음, 전승 스크롤)을 골라요. 쓴 캐시의 5%가 메이플크레딧으로 쌓이고, 크레딧샵의 큐브나 아이템(성형 쿠폰 등)을 사서 팔면 그만큼 회수율이 올라요. 시세를 넣은 것 중 크레딧당 가장 비싸게 팔리는 것을 기준으로 해요.
        </p>
      </div>

      {plan && (
        <div className="card">
          <h2>추천 조합 · {won(settings.target)} 채우기</h2>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">회수율</div>
              <div className="stat-value">{pct(plan.recovered / plan.cash)}</div>
              <div className="stat-sub">메포로만 하면 {pct(base)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">실제 손실</div>
              <div className="stat-value">{won(plan.loss)}</div>
              <div className="stat-sub">메포로만 하면 {won(mepoOnlyLoss)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">받는 메소</div>
              <div className="stat-value">{formatMeso(plan.meso)}</div>
              <div className="stat-sub">현금화 {won(plan.recovered)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">판매 건수</div>
              <div className="stat-value">{plan.listings}건</div>
              <div className="stat-sub">쓰는 캐시 {won(plan.cash)}</div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>아이템</th>
                  <th className="num">개수</th>
                  <th className="num">캐시</th>
                  <th className="num">받는 메소</th>
                  <th className="num">손실</th>
                </tr>
              </thead>
              <tbody>
                {plan.lines.map((l) => (
                  <tr key={l.item?.id ?? 'mepo'}>
                    <td>{l.item ? l.item.name : '메이플포인트 → 메소마켓 (자투리)'}</td>
                    <td className="num">{l.item ? `${l.qty}개` : `${(l.cash / 1000).toLocaleString()}천 포인트`}</td>
                    <td className="num">{won(l.cash)}</td>
                    <td className="num">{formatMeso(l.meso)}</td>
                    <td className="num">{won(l.cash - l.recovered)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!plan && <p className="muted">경매장 시세를 하나 이상 넣으면 조합을 계산해요.</p>}

      <h2>아이템별 회수율</h2>
      <p className="muted small">
        경매장 판매가는 수수료 떼기 전 금액(억)이에요. 회수율이 기준선({pct(base)})보다 낮은 아이템은 조합에서 빠져요. 캐시 가격은
        캐시샵에서 한 번 확인해 주세요.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>아이템</th>
              <th className="num">캐시</th>
              <th className="num">경매장 판매가 (억)</th>
              <th className="num">회수율</th>
              <th className="num">원 / 1억</th>
              <th className="num">기준선 넘는 판매가</th>
              <th className="num">최대 개수</th>
              <th className="num">판매 시간 (시간)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const r = itemRate(it, settings);
              const breakEven = it.cash / ((1 - settings.auctionFee) * settings.mesoMarket);
              return (
                <tr key={it.id} title={it.note}>
                  <td className="note-cell">
                    {rank.get(it.id) && <span className="badge">{rank.get(it.id)}위</span>} {it.name}
                    {it.note && <div className="muted small">{it.note}</div>}
                  </td>
                  <td className="num">
                    <input
                      className="cell-input"
                      inputMode="numeric"
                      value={it.cash}
                      onChange={(e) => setItem(it.id, { cash: num(e.target.value) ?? 0 })}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="cell-input"
                      inputMode="decimal"
                      placeholder="예: 3.2"
                      value={it.price ?? ''}
                      onChange={(e) => setItem(it.id, { price: num(e.target.value) })}
                    />
                  </td>
                  <td className={`num ${r == null ? '' : r >= base ? 'good' : 'bad'}`}>{r == null ? '-' : pct(r)}</td>
                  <td className="num">{wonPerEokCost(it, settings) ? won(wonPerEokCost(it, settings)!) : '-'}</td>
                  <td className="num muted">{breakEven.toFixed(2)}억</td>
                  <td className="num">
                    <input
                      className="cell-input"
                      inputMode="numeric"
                      placeholder="∞"
                      value={it.maxQty ?? ''}
                      onChange={(e) => setItem(it.id, { maxQty: num(e.target.value) })}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="cell-input"
                      inputMode="decimal"
                      value={it.hours ?? ''}
                      onChange={(e) => setItem(it.id, { hours: num(e.target.value) })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        "원 / 1억"은 메소 1억을 얻는 데 드는 현금이에요. 메소마켓(지금 {settings.mesoMarket.toLocaleString()}원)보다 낮으면 그
        아이템으로 메소를 사는 게 싸요. 판매 시간은 아직 계산에 쓰지 않는 메모예요.
      </p>
      <button
        className="ghost small"
        onClick={() => {
          if (confirm('입력한 시세와 설정을 기본값으로 되돌릴까요?'))
            setState({ settings: DEFAULT_SETTINGS, items: DEFAULT_ITEMS });
        }}
      >
        기본값으로 되돌리기
      </button>
    </section>
  );
}
