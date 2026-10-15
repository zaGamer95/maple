import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_FEE_RATE, formatMeso, parseMeso, todayKst } from '../lib/format';
import { useStore } from '../store';
import type { Character, Purchase } from '../types';

const UNLINKED = '__unlinked__';

const isSell = (p: Purchase) => p.type === 'sell';
/** 판매는 수수료를 뺀 실수령액 */
const netOf = (p: Purchase) => (p.price ?? 0) * (isSell(p) ? 1 - (p.feeRate ?? DEFAULT_FEE_RATE) : 1);

export default function Purchases() {
  const { purchases, characters } = useStore();
  const [filter, setFilter] = useState('');
  const [type, setType] = useState<'' | 'buy' | 'sell'>('');
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const filtered = purchases.filter(
      (p) =>
        (!filter || (filter === UNLINKED ? !p.characterId : p.characterId === filter)) &&
        (!type || (type === 'sell') === isSell(p)),
    );
    return [...filtered].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [purchases, filter, type]);

  const bought = rows.filter((p) => !isSell(p)).reduce((s, p) => s + netOf(p), 0);
  const sold = rows.filter(isSell).reduce((s, p) => s + netOf(p), 0);
  const unlinked = purchases.filter((p) => !p.characterId).length;

  return (
    <section>
      <div className="detail-head">
        <h1>거래 내역</h1>
        <button onClick={() => setAdding((a) => !a)}>{adding ? '닫기' : '거래 추가'}</button>
      </div>
      {adding && <AddTradeForm onDone={() => setAdding(false)} />}
      <p className="muted">
        {rows.length}건 · 구매 {formatMeso(bought)} · 판매 실수령 {formatMeso(sold)} · 순지출 <b>{formatMeso(bought - sold)}</b>
        {unlinked > 0 && ` · 캐릭터 미연결 ${unlinked}건`}
      </p>
      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="구분">
          <option value="">구매 + 판매</option>
          <option value="buy">구매만</option>
          <option value="sell">판매만</option>
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="캐릭터">
          <option value="">전체 캐릭터</option>
          <option value={UNLINKED}>미연결만</option>
          {linkedCharacters(purchases, characters).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.job})
            </option>
          ))}
        </select>
      </div>
      <PurchaseTable rows={rows} editable />
    </section>
  );
}

function AddTradeForm({ onDone }: { onDone: () => void }) {
  const { characters, addPurchase } = useStore();
  const main = characters.find((c) => c.isMain);
  const [form, setForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    date: todayKst(),
    itemName: '',
    detail: '',
    price: '',
    feeRate: String(DEFAULT_FEE_RATE * 100),
    comment: '',
    characterId: main?.id ?? '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const price = parseMeso(form.price);
  const fee = Number(form.feeRate) / 100;
  const valid = form.itemName.trim() && price && form.date;

  return (
    <form
      className="card edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        addPurchase({
          id: `p${Date.now()}`,
          date: form.date,
          dateText: form.date.replace(/-/g, '.'),
          itemName: form.itemName.trim(),
          detail: form.detail.trim() || null,
          price,
          priceText: formatMeso(price),
          comment: form.comment.trim() || null,
          characterId: form.characterId || null,
          type: form.type,
          ...(form.type === 'sell' && fee !== DEFAULT_FEE_RATE ? { feeRate: fee } : {}),
        });
        onDone();
      }}
    >
      <div className="form-grid">
        <label>
          구분
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="buy">구매</option>
            <option value="sell">판매</option>
          </select>
        </label>
        <label>
          날짜
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label>
          상품명
          <input value={form.itemName} onChange={(e) => set('itemName', e.target.value)} placeholder="예: 마이스터링" />
        </label>
        <label>
          가격 {price ? `= ${formatMeso(price)}` : ''}
          <input value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="예: 155억, 4억 3000만" />
        </label>
        {form.type === 'sell' && (
          <label>
            수수료 (%) {price ? `· 실수령 ${formatMeso(price * (1 - fee))}` : ''}
            <input type="number" min={0} max={100} step={0.5} value={form.feeRate} onChange={(e) => set('feeRate', e.target.value)} />
          </label>
        )}
        <label>
          캐릭터
          <select value={form.characterId} onChange={(e) => set('characterId', e.target.value)}>
            <option value="">- 미연결 -</option>
            {characterOptions(characters).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.job})
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        옵션·비고
        <input value={form.detail} onChange={(e) => set('detail', e.target.value)} placeholder="예: 22성 30% 2줄" />
      </label>
      <label>
        한줄평
        <input value={form.comment} onChange={(e) => set('comment', e.target.value)} />
      </label>
      <button type="submit" disabled={!valid}>
        추가
      </button>
    </form>
  );
}

/** 거래가 한 건 이상 연결된 캐릭터 */
function linkedCharacters(purchases: Purchase[], characters: Character[]): Character[] {
  const ids = new Set(purchases.map((p) => p.characterId));
  return characters.filter((c) => ids.has(c.id));
}

/** 캐릭터 선택 목록: 본캐 먼저, 나머지는 레벨 높은 순 */
function characterOptions(characters: Character[]): Character[] {
  return [...characters].sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || (b.level ?? 0) - (a.level ?? 0),
  );
}

export function PurchaseTable({
  rows,
  showCharacter = true,
  editable = false,
}: {
  rows: Purchase[];
  showCharacter?: boolean;
  editable?: boolean;
}) {
  const { characters, updatePurchase, removePurchase } = useStore();
  const options = useMemo(() => characterOptions(characters), [characters]);
  if (rows.length === 0) return <p className="muted">거래 내역이 없어요.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>구분</th>
            <th>상품명</th>
            <th>비고</th>
            <th className="num">가격</th>
            <th>한줄평</th>
            {showCharacter && <th>캐릭터</th>}
            {editable && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="mono">{p.dateText}</td>
              <td>{isSell(p) ? <span className="badge sell">판매</span> : <span className="badge">구매</span>}</td>
              <td>{p.itemName}</td>
              <td className="note-cell">{p.detail}</td>
              <td className="num" title={p.priceText ?? undefined}>
                {p.price ? formatMeso(p.price) : p.priceText}
                {isSell(p) && p.price ? <div className="muted small">실수령 {formatMeso(netOf(p))}</div> : null}
              </td>
              <td className="note-cell">{p.comment}</td>
              {showCharacter && (
                <td>
                  <select
                    value={p.characterId ?? ''}
                    onChange={(e) => updatePurchase(p.id, { characterId: e.target.value || null })}
                    aria-label={`${p.itemName} 캐릭터`}
                  >
                    <option value="">- 미연결 -</option>
                    {options.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.job})
                      </option>
                    ))}
                  </select>
                  {p.characterId && (
                    <>
                      {' '}
                      <Link to={`/characters/${encodeURIComponent(p.characterId)}`}>보기</Link>
                    </>
                  )}
                </td>
              )}
              {editable && (
                <td>
                  <button
                    className="ghost small"
                    onClick={() => {
                      if (confirm(`"${p.itemName}" 거래를 지울까요?`)) removePurchase(p.id);
                    }}
                  >
                    삭제
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
