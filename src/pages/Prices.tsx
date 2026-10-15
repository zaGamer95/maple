import { useMemo, useState } from 'react';
import { formatMeso, parseMeso, todayKst } from '../lib/format';
import { useStore } from '../store';
import type { PriceQuote } from '../types';

/** 품목 + 세트 수량 = 하나의 시세 줄 */
const keyOf = (q: Pick<PriceQuote, 'item' | 'bundleSize'>) => `${q.item}|${q.bundleSize}`;
const labelOf = (q: Pick<PriceQuote, 'item' | 'bundleSize'>) => (q.bundleSize > 1 ? `${q.item} ×${q.bundleSize}` : q.item);

function formatPrice(q: PriceQuote): string {
  return q.unit === 'won_per_eok' ? `${q.price.toLocaleString()}원/억` : formatMeso(q.price);
}

export default function Prices() {
  const { prices } = useStore();
  const series = useMemo(() => {
    const map = new Map<string, PriceQuote[]>();
    for (const q of prices) {
      const k = keyOf(q);
      map.set(k, [...(map.get(k) ?? []), q]);
    }
    return [...map.values()]
      .map((qs) => [...qs].sort((a, b) => a.date.localeCompare(b.date)))
      .sort((a, b) => b[b.length - 1].date.localeCompare(a[a.length - 1].date));
  }, [prices]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = series.find((s) => keyOf(s[0]) === selected) ?? series[0];

  return (
    <section>
      <h1>시세</h1>
      <p className="muted">
        넥슨 Open API 에는 경매장 시세가 없어서, 경매장에서 본 가격을 직접 기록해요. 같은 품목을 날짜별로 쌓으면 추이를 볼 수 있어요.
      </p>
      <AddPriceForm names={series.map((s) => s[0])} defaultItem={current?.[0]} />
      <div className="columns">
        <div className="card">
          <h2>품목</h2>
          <ul className="list">
            {series.map((qs) => {
              const last = qs[qs.length - 1];
              const prev = qs[qs.length - 2];
              const diff = prev && prev.unit === last.unit ? (last.price - prev.price) / prev.price : null;
              const k = keyOf(last);
              return (
                <li key={k}>
                  <button className={`link ${current && keyOf(current[0]) === k ? 'active' : ''}`} onClick={() => setSelected(k)}>
                    {labelOf(last)}
                  </button>
                  <span className="right">
                    {formatPrice(last)}
                    {diff != null && (
                      <span className="muted small"> {diff >= 0 ? '▲' : '▼'} {Math.abs(diff * 100).toFixed(1)}%</span>
                    )}
                    <span className="muted small"> · {last.date}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {current && <PriceDetail quotes={current} />}
      </div>
    </section>
  );
}

function PriceDetail({ quotes }: { quotes: PriceQuote[] }) {
  const { removePrice } = useStore();
  const first = quotes[0];
  return (
    <div className="card">
      <h2>{labelOf(first)}</h2>
      {quotes.length >= 2 ? <PriceChart quotes={quotes} /> : <p className="muted">기록이 2개 이상이면 추이 그래프가 나와요.</p>}
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th className="num">가격</th>
            {first.bundleSize > 1 && first.unit === 'meso' && <th className="num">개당</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {[...quotes].reverse().map((q) => (
            <tr key={`${q.date}-${q.price}`}>
              <td className="mono">{q.date}</td>
              <td className="num">{formatPrice(q)}</td>
              {first.bundleSize > 1 && first.unit === 'meso' && <td className="num">{formatMeso(q.price / q.bundleSize)}</td>}
              <td>
                <button
                  className="ghost small"
                  onClick={() => {
                    if (confirm(`${q.date} 시세 기록을 지울까요?`)) removePrice(q);
                  }}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 한 품목의 시세 추이 (단일 계열이라 범례 없이 제목이 이름 역할) */
function PriceChart({ quotes }: { quotes: PriceQuote[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 200;
  const pad = { l: 8, r: 8, t: 16, b: 24 };
  const times = quotes.map((q) => Date.parse(q.date));
  const values = quotes.map((q) => q.price);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const vMax = Math.max(...values) * 1.1;
  const vMin = Math.min(0, Math.min(...values));
  const x = (t: number) => pad.l + ((t - tMin) / Math.max(1, tMax - tMin)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vMin) / (vMax - vMin)) * (H - pad.t - pad.b);
  const points = quotes.map((q, i) => [x(times[i]), y(q.price)] as const);
  const h = hover != null ? quotes[hover] : null;

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="시세 추이"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          points.forEach(([pxi], i) => {
            if (Math.abs(pxi - px) < Math.abs(points[best][0] - px)) best = i;
          });
          setHover(best);
        }}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="grid" x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} />
        ))}
        <line className="axis" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
        <polyline className="series" points={points.map((p) => p.join(',')).join(' ')} />
        {hover != null && <line className="crosshair" x1={points[hover][0]} x2={points[hover][0]} y1={pad.t} y2={H - pad.b} />}
        {points.map(([px, py], i) => (
          <circle key={i} className="dot" cx={px} cy={py} r={hover === i ? 5 : 4} />
        ))}
        <text className="tick" x={pad.l} y={H - 6}>
          {quotes[0].date}
        </text>
        <text className="tick" x={W - pad.r} y={H - 6} textAnchor="end">
          {quotes[quotes.length - 1].date}
        </text>
      </svg>
      {h && (
        <div className="tooltip" style={{ left: `${(points[hover!][0] / W) * 100}%` }}>
          <div className="muted small">{h.date}</div>
          <b>{formatPrice(h)}</b>
        </div>
      )}
    </div>
  );
}

function AddPriceForm({ names, defaultItem }: { names: PriceQuote[]; defaultItem?: PriceQuote }) {
  const { addPrice } = useStore();
  const [item, setItem] = useState(defaultItem?.item ?? '');
  const [bundle, setBundle] = useState(String(defaultItem?.bundleSize ?? 1));
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayKst());
  const known = names.find((n) => n.item === item.trim() && n.bundleSize === Number(bundle));
  const unit = known?.unit ?? 'meso';
  const value = unit === 'won_per_eok' ? Number(price) || null : parseMeso(price);
  const valid = item.trim() && Number(bundle) >= 1 && value && date;

  return (
    <form
      className="card filters"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        addPrice({ item: item.trim(), bundleSize: Number(bundle), date, price: value!, unit });
        setPrice('');
      }}
    >
      <input list="price-items" value={item} onChange={(e) => setItem(e.target.value)} placeholder="품목 (예: 블랙 큐브)" />
      <datalist id="price-items">
        {[...new Set(names.map((n) => n.item))].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <label className="check">
        세트
        <input type="number" min={1} value={bundle} onChange={(e) => setBundle(e.target.value)} style={{ width: 72 }} />개
      </label>
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder={unit === 'won_per_eok' ? '1억당 원 (예: 2500)' : '세트 가격 (예: 6.8억, 3500만)'}
      />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <button type="submit" disabled={!valid}>
        기록 {value ? `(${unit === 'won_per_eok' ? `${value.toLocaleString()}원/억` : formatMeso(value)})` : ''}
      </button>
    </form>
  );
}
