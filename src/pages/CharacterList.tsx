import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCheck, formatNumber } from '../lib/format';
import { EQUIP_SLOTS } from '../lib/equip';
import { formatPower, nexon } from '../lib/nexon';
import { levelTotal, unionLevel, unionMembers, UNION_SLOTS } from '../lib/union';
import { useStore } from '../store';
import type { Character } from '../types';

type SortKey = 'default' | 'level' | 'unionPower' | 'combatPower';

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
  const [sort, setSort] = useState<SortKey>('default');
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
    if (sort === 'default') return filtered;
    const value = (c: Character) => (sort === 'combatPower' ? nexon.characters[c.id]?.combatPower : c[sort]) ?? 0;
    return [...filtered].sort((a, b) => value(b) - value(a));
  }, [characters, query, jobGroup, guild, plan, bossOnly, sort]);

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
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="default">시트 순서</option>
          <option value="level">레벨 높은 순</option>
          <option value="combatPower">전투력 높은 순</option>
          <option value="unionPower">유니온 전투력 높은 순</option>
        </select>
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
              <th>직업군</th>
              <th>직업</th>
              <th>닉네임</th>
              <th className="num">레벨</th>
              <th>유니온</th>
              <th>링크</th>
              <th>육성 계획</th>
              <th>길드</th>
              <th title="카루타">카룻</th>
              <th title="스우·데미안">스데</th>
              <th title="루시드·윌·슬라임">루윌슬</th>
              <th className="num">전투력</th>
              <th className="num">유니온 전투력</th>
              <th>비고</th>
              {showEquip && EQUIP_SLOTS.map((s) => <th key={s}>{s}</th>)}
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
