import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMeso } from '../lib/format';
import { useStore } from '../store';
import type { Character, Purchase } from '../types';

const UNLINKED = '__unlinked__';

export default function Purchases() {
  const { purchases, characters } = useStore();
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    const filtered = purchases.filter((p) =>
      !filter ? true : filter === UNLINKED ? !p.characterId : p.characterId === filter,
    );
    return [...filtered].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [purchases, filter]);

  const total = rows.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const unlinked = purchases.filter((p) => !p.characterId).length;

  return (
    <section>
      <h1>구매 내역</h1>
      <p className="muted">
        {rows.length}건 · 합계 {formatMeso(total)}
        {unlinked > 0 && ` · 캐릭터 미연결 ${unlinked}건`}
      </p>
      <div className="filters">
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
      <PurchaseTable rows={rows} />
    </section>
  );
}

/** 구매가 한 건 이상 연결된 캐릭터 */
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

export function PurchaseTable({ rows, showCharacter = true }: { rows: Purchase[]; showCharacter?: boolean }) {
  const { characters, updatePurchase } = useStore();
  const options = useMemo(() => characterOptions(characters), [characters]);
  if (rows.length === 0) return <p className="muted">구매 내역이 없어요.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>상품명</th>
            <th>비고</th>
            <th className="num">가격</th>
            <th>한줄평</th>
            {showCharacter && <th>캐릭터</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="mono">{p.dateText}</td>
              <td>{p.itemName}</td>
              <td className="note-cell">{p.detail}</td>
              <td className="num" title={p.priceText ?? undefined}>
                {p.price ? formatMeso(p.price) : p.priceText}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
