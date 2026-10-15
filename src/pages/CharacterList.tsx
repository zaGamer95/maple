import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCheck, formatNumber } from '../lib/format';
import { EQUIP_SLOTS } from '../lib/equip';
import { formatPower, nexon } from '../lib/nexon';
import { levelTotal, unionLevel, unionMembers, UNION_SLOTS } from '../lib/union';
import { useStore } from '../store';
import type { Character } from '../types';

type Value = string | number | null | undefined;

interface Column {
  id: string;
  label: string;
  title?: string;
  num?: boolean;
  get: (c: Character) => Value;
}

const CHECK_ORDER = { yes: 2, partial: 1, no: 0 } as const;
const checkValue = (v: Character['boss']['karut']) => (v ? CHECK_ORDER[v] : null);

/** 정렬 기준. 칸 순서는 표 순서와 같다 */
const COLUMNS: Column[] = [
  { id: 'jobGroup', label: '직업군', get: (c) => c.jobGroup },
  { id: 'job', label: '직업', get: (c) => c.job },
  { id: 'name', label: '닉네임', get: (c) => c.name },
  { id: 'level', label: '레벨', num: true, get: (c) => c.level || null },
  { id: 'union', label: '유니온', get: (c) => c.unionEffect },
  { id: 'link', label: '링크', get: (c) => c.linkEffect },
  { id: 'plan', label: '육성 계획', get: (c) => c.plan },
  { id: 'guild', label: '길드', get: (c) => c.guild },
  { id: 'karut', label: '카룻', title: '카루타', num: true, get: (c) => checkValue(c.boss.karut) },
  { id: 'stone', label: '스데', title: '스우·데미안', num: true, get: (c) => checkValue(c.boss.stoneDesire) },
  { id: 'lws', label: '루윌슬', title: '루시드·윌·슬라임', num: true, get: (c) => checkValue(c.boss.lucidWillSlime) },
  { id: 'combatPower', label: '전투력', num: true, get: (c) => nexon.characters[c.id]?.combatPower },
  { id: 'unionPower', label: '유니온 전투력', num: true, get: (c) => c.unionPower },
  { id: 'note', label: '비고', get: (c) => c.note },
];
const EQUIP_COLUMNS: Column[] = EQUIP_SLOTS.map((s) => ({ id: `equip:${s}`, label: s, get: (c) => c.equip[s] }));

/** 클릭: 숫자 칸은 큰 순 → 작은 순 → 시트 순서, 글자 칸은 가나다 → 역순 → 시트 순서 */
type Sort = { id: string; dir: 1 | -1 } | null;

function compare(a: Value, b: Value, dir: 1 | -1): number {
  const empty = (v: Value) => v == null || v === '';
  // 빈 값은 방향과 상관없이 맨 뒤
  if (empty(a) || empty(b)) return Number(empty(a)) - Number(empty(b));
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
  return String(a).localeCompare(String(b), 'ko') * dir;
}

function uniq(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

export default function CharacterList() {
  const { characters } = useStore();
  const [query, setQuery] = useState('');
  const [jobGroup, setJobGroup] = useState('');
  const [guild, setGuild] = useState('');
  const [plan, setPlan] = useState('');
  const [bossOnly, setBossOnly] = useState(false);
  const [sort, setSort] = useState<Sort>(null);
  const [showEquip, setShowEquip] = useState(false);
  const members = useMemo(() => new Set(unionMembers(characters).map((c) => c.id)), [characters]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = characters.filter(
      (c) =>
        (!q || [c.name, c.job, c.note].some((v) => v?.toLowerCase().includes(q))) &&
        (!jobGroup || c.jobGroup === jobGroup) &&
        (!guild || c.guild === guild) &&
        (!plan || c.plan === plan) &&
        (!bossOnly || c.boss.karut === 'yes' || c.boss.stoneDesire === 'yes'),
    );
    const col = sort && [...COLUMNS, ...EQUIP_COLUMNS].find((c) => c.id === sort.id);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => compare(col.get(a), col.get(b), sort!.dir));
  }, [characters, query, jobGroup, guild, plan, bossOnly, sort]);

  const toggleSort = (col: Column) => {
    const first: 1 | -1 = col.num ? -1 : 1;
    setSort((s) => (!s || s.id !== col.id ? { id: col.id, dir: first } : s.dir === first ? { id: col.id, dir: -first as 1 | -1 } : null));
  };
  const header = (col: Column) => {
    const active = sort?.id === col.id;
    return (
      <th
        key={col.id}
        className={`sortable${col.num ? ' num' : ''}${active ? ' sorted' : ''}`}
        title={col.title}
        onClick={() => toggleSort(col)}
        aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}
      >
        {col.label}
        <span className="sort-mark">{active ? (sort!.dir === 1 ? '▲' : '▼') : ''}</span>
      </th>
    );
  };

  return (
    <section>
      <h1>캐릭터</h1>
      <p className="muted">
        유니온 레벨 <b>{formatNumber(unionLevel(characters))}</b> (레벨 상위 {UNION_SLOTS}캐릭, 흐린 행은 미포함) · 전체
        레벨 합 {formatNumber(levelTotal(characters))} · {rows.length}/{characters.length}캐릭 표시
      </p>

      <div className="filters">
        <input placeholder="닉네임·직업·비고 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select label="직업군" value={jobGroup} onChange={setJobGroup} options={uniq(characters.map((c) => c.jobGroup))} />
        <Select label="길드" value={guild} onChange={setGuild} options={uniq(characters.map((c) => c.guild))} />
        <Select label="육성 계획" value={plan} onChange={setPlan} options={uniq(characters.map((c) => c.plan))} />
        {sort && (
          <button className="ghost small" onClick={() => setSort(null)}>
            시트 순서로
          </button>
        )}
        <label className="check">
          <input type="checkbox" checked={bossOnly} onChange={(e) => setBossOnly(e.target.checked)} />
          카룻/스데 가능만
        </label>
        <label className="check">
          <input type="checkbox" checked={showEquip} onChange={(e) => setShowEquip(e.target.checked)} />
          장비 칸 보기
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNS.map(header)}
              {showEquip && EQUIP_COLUMNS.map(header)}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <Row key={c.id} c={c} showEquip={showEquip} inUnion={members.has(c.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ c, showEquip, inUnion }: { c: Character; showEquip: boolean; inUnion: boolean }) {
  const className = [c.isMain && 'main-row', !inUnion && 'out-of-union'].filter(Boolean).join(' ');
  return (
    <tr className={className || undefined} title={inUnion ? undefined : '유니온 레벨에 포함되지 않는 캐릭터'}>
      <td>{c.jobGroup}</td>
      <td>{c.job}</td>
      <td>
        <Link to={`/characters/${encodeURIComponent(c.id)}`}>{c.name}</Link>
      </td>
      <td className="num">{c.level || '-'}</td>
      <td>{c.unionEffect}</td>
      <td>{c.linkEffect}</td>
      <td>{c.plan}</td>
      <td>{c.guild}</td>
      <td className="center">{formatCheck(c.boss.karut)}</td>
      <td className="center">{formatCheck(c.boss.stoneDesire)}</td>
      <td className="center">{formatCheck(c.boss.lucidWillSlime)}</td>
      <td className="num">{formatPower(nexon.characters[c.id]?.combatPower ?? null).replace(/^-$/, '')}</td>
      <td className="num">{c.unionPower ? formatNumber(c.unionPower) : ''}</td>
      <td className="note-cell">{c.note}</td>
      {showEquip && EQUIP_SLOTS.map((s) => <td key={s} className="pre">{c.equip[s]}</td>)}
    </tr>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label} 전체</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
