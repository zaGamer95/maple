import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import todos from '../data/todos.json';
import { formatMeso, formatNumber } from '../lib/format';
import { formatFetchedAt, formatPower, nexon } from '../lib/nexon';
import { levelTotal, unionLevel, UNION_SLOTS } from '../lib/union';
import { useStore } from '../store';
import type { Todo } from '../types';

export default function Dashboard() {
  const { characters, purchases } = useStore();
  const main = characters.find((c) => c.isMain);
  const recent = [...purchases]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5);
  const openTodos = (todos as Todo[]).filter((t) => !t.done);

  return (
    <section>
      <h1>대시보드</h1>
      <p className="muted">넥슨 API 갱신: {formatFetchedAt(nexon.fetchedAt)}</p>
      <div className="stats">
        {nexon.union ? (
          <Stat
            label={`유니온 · ${nexon.union.grade}`}
            value={formatNumber(nexon.union.level)}
            sub={`게임 기준 · 계산값 ${formatNumber(unionLevel(characters))}`}
          />
        ) : (
          <Stat label="유니온 레벨" value={formatNumber(unionLevel(characters))} sub={`레벨 상위 ${UNION_SLOTS}캐릭 합`} />
        )}
        <Stat label="전체 레벨 합" value={formatNumber(levelTotal(characters))} sub="참고용 · 유니온 레벨과 다름" />
        <Stat label="캐릭터" value={`${characters.length}개`} />
        {main && (
          <Stat
            label={`본캐 · ${main.job}`}
            value={<Link to={`/characters/${encodeURIComponent(main.id)}`}>{main.name}</Link>}
            sub={`Lv.${main.level} · 전투력 ${formatPower(nexon.characters[main.id]?.combatPower ?? main.unionPower)}`}
          />
        )}
      </div>

      <div className="columns">
        <div className="card">
          <h2>
            <Link to="/purchases">최근 거래</Link>
          </h2>
          <ul className="list">
            {recent.map((p) => (
              <li key={p.id}>
                <span className="muted mono">{p.dateText}</span> {p.itemName}
                <span className="right">{p.price ? formatMeso(p.price) : p.priceText}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>할 일</h2>
          <ul className="list">
            {openTodos.map((t) => (
              <li key={t.id}>
                {t.text}
                {t.note && <span className="muted"> — {t.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
