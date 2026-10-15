import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import targetSetups from '../data/targetSetups.json';
import { EQUIP_SLOTS } from '../lib/equip';
import { formatCheck, formatMeso, formatNumber } from '../lib/format';
import { formatFetchedAt, formatPower, nexon } from '../lib/nexon';
import { unionMembers } from '../lib/union';
import { useStore } from '../store';
import EnhanceHistory from './EnhanceHistory';
import { PurchaseTable } from './Purchases';
import type { Character, Check, NexonCharacter, NexonEquipment, TargetSetup } from '../types';

type Tab = 'overview' | 'equip' | 'target' | 'purchases' | 'history';

export default function CharacterDetail() {
  const { id = '' } = useParams();
  const { characters, purchases, updateCharacter } = useStore();
  const character = characters.find((c) => c.id === id);
  const setup = (targetSetups as TargetSetup[]).find((t) => t.characterId === id);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const bought = purchases
    .filter((p) => p.characterId === id)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const inUnion = unionMembers(characters).some((c) => c.id === id);
  const api = nexon.characters[id];

  if (!character) {
    return (
      <section>
        <h1>캐릭터를 찾을 수 없어요</h1>
        <Link to="/characters">← 캐릭터 목록</Link>
      </section>
    );
  }

  return (
    <section>
      <Link to="/characters" className="muted">
        ← 캐릭터 목록
      </Link>
      <div className="detail-head">
        {api?.image && <img className="avatar" src={api.image} alt="" width={96} height={96} />}
        <div className="grow">
          <h1>
            {character.name} {character.isMain && <span className="badge">본캐</span>}
          </h1>
          <p className="muted">
            {character.jobGroup} · {character.job} · Lv.{character.level || '-'}
            {character.guild && ` · ${character.guild}`}
            {inUnion ? ' · 유니온 레벨 포함' : ' · 유니온 레벨 미포함'}
          </p>
          {api && (
            <p className="muted">
              {api.world} · {api.job}
              {api.expRate != null && ` · 경험치 ${api.expRate}%`} · 전투력 <b>{formatPower(api.combatPower)}</b>
              {api.guild && ` · 길드 ${api.guild}`}
            </p>
          )}
          {!api && nexon.errors[id] && <p className="muted">넥슨 API 조회 실패: {nexon.errors[id]}</p>}
        </div>
        <button onClick={() => setEditing((e) => !e)}>{editing ? '편집 닫기' : '편집'}</button>
      </div>

      {editing && (
        <EditForm
          character={character}
          onSave={(patch) => {
            updateCharacter(character.id, patch);
            setEditing(false);
          }}
        />
      )}

      <div className="tabs">
        <TabButton current={tab} value="overview" onClick={setTab}>
          개요
        </TabButton>
        <TabButton current={tab} value="equip" onClick={setTab}>
          장비
        </TabButton>
        <TabButton current={tab} value="target" onClick={setTab}>
          목표 세팅
        </TabButton>
        <TabButton current={tab} value="purchases" onClick={setTab}>
          거래 내역 {bought.length > 0 && `(${bought.length})`}
        </TabButton>
        <TabButton current={tab} value="history" onClick={setTab}>
          강화 기록
        </TabButton>
      </div>

      {tab === 'overview' && <Overview c={character} />}
      {tab === 'equip' && <Equip c={character} api={api} />}
      {tab === 'target' && <Target setup={setup} />}
      {tab === 'history' && <EnhanceHistory characterName={character.name} />}
      {tab === 'purchases' && (
        <>
          <p className="muted">
            {bought.length}건 · 합계 {formatMeso(bought.reduce((sum, p) => sum + (p.price ?? 0), 0))} · 연결은{' '}
            <Link to="/purchases">거래 내역</Link>에서 바꿀 수 있어요.
          </p>
          <PurchaseTable rows={bought} showCharacter={false} />
        </>
      )}
    </section>
  );
}

function TabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: Tab;
  value: Tab;
  onClick: (t: Tab) => void;
  children: ReactNode;
}) {
  return (
    <button className={current === value ? 'tab active' : 'tab'} onClick={() => onClick(value)}>
      {children}
    </button>
  );
}

function Overview({ c }: { c: Character }) {
  const rows: [string, ReactNode][] = [
    ['유니온 효과', c.unionEffect],
    ['링크 효과', c.linkEffect],
    ['육성 계획', c.plan],
    ['유니온 전투력', c.unionPower ? formatNumber(c.unionPower) : null],
    ['카루타', formatCheck(c.boss.karut)],
    ['스우·데미안', formatCheck(c.boss.stoneDesire)],
    ['루시드·윌·슬라임', formatCheck(c.boss.lucidWillSlime)],
    ['비고', c.note],
  ];
  return (
    <dl className="info">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v || <span className="muted">-</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

const GRADE: Record<string, { cls: string; label: string }> = {
  레어: { cls: 'rare', label: 'R' },
  에픽: { cls: 'epic', label: 'E' },
  유니크: { cls: 'unique', label: 'U' },
  레전드리: { cls: 'legendary', label: 'L' },
};

function Grade({ grade, lines }: { grade: string | null; lines: string[] }) {
  if (!grade) return <span className="muted">-</span>;
  return (
    <span>
      <span className={`grade ${GRADE[grade]?.cls ?? ''}`} title={grade}>
        {GRADE[grade]?.label ?? grade[0]}
      </span>{' '}
      {lines.join(' / ')}
    </span>
  );
}

function ApiEquipment({ items }: { items: NexonEquipment[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>부위</th>
            <th>아이템</th>
            <th className="num">스타포스</th>
            <th>잠재능력</th>
            <th>에디셔널</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.slot}>
              <td>{it.slot}</td>
              <td>
                <span className="item">
                  <img src={it.icon} alt="" width={24} height={24} loading="lazy" />
                  {it.name}
                  {it.scrollUpgrade > 0 && <span className="muted"> (+{it.scrollUpgrade})</span>}
                </span>
              </td>
              <td className="num">{it.starforce ? `★${it.starforce}` : ''}</td>
              <td className="note-cell">
                <Grade grade={it.potentialGrade} lines={it.potential} />
              </td>
              <td className="note-cell">
                <Grade grade={it.additionalGrade} lines={it.additional} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Equip({ c, api }: { c: Character; api?: NexonCharacter }) {
  const filled = EQUIP_SLOTS.filter((s) => c.equip[s]);
  return (
    <>
      {api ? (
        <>
          <p className="muted">넥슨 API 기준 장착 장비 · {formatFetchedAt(nexon.fetchedAt)} 갱신</p>
          <ApiEquipment items={api.equipment} />
        </>
      ) : (
        <p className="muted">넥슨 API 장비 정보가 아직 없어요. 매일 아침 6시 배포 때 갱신돼요.</p>
      )}
      <h3>장비 메모</h3>
      {filled.length === 0 && <p className="muted">메모가 없어요. 편집에서 부위별 메모를 추가할 수 있어요.</p>}
      <dl className="info">
        {filled.map((s) => (
          <div key={s}>
            <dt>{s}</dt>
            <dd className="pre">{c.equip[s]}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Target({ setup }: { setup?: TargetSetup }) {
  if (!setup) return <p className="muted">목표 세팅이 아직 없어요.</p>;
  const fields: [keyof TargetSetup['slots'][number], string][] = [
    ['starforce', '스타포스'],
    ['mainPot', '윗잠'],
    ['addPot', '아랫잠'],
    ['flame', '추옵'],
    ['scroll', '작'],
    ['budget', '예산'],
    ['note', '메모'],
  ];
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>세트</th>
              <th>부위</th>
              {fields.map(([, label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {setup.slots.map((s) => (
              <tr key={`${s.group}-${s.slot}`}>
                <td>{s.group}</td>
                <td>{s.slot}</td>
                {fields.map(([key]) => (
                  <td key={key}>{s[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {setup.note && (
        <div className="card">
          <h2>조언 메모</h2>
          <p className="pre">{setup.note}</p>
        </div>
      )}
    </>
  );
}

const CHECK_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '-' },
  { value: 'yes', label: 'O' },
  { value: 'partial', label: '△' },
  { value: 'no', label: 'X' },
];

function EditForm({ character, onSave }: { character: Character; onSave: (patch: Partial<Character>) => void }) {
  const [form, setForm] = useState(character);
  const set = <K extends keyof Character>(key: K, value: Character[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: 'unionEffect' | 'linkEffect' | 'plan' | 'guild' | 'note', label: string) => (
    <label>
      {label}
      <input value={form[key] ?? ''} onChange={(e) => set(key, e.target.value || null)} />
    </label>
  );
  const boss = (key: keyof Character['boss'], label: string) => (
    <label>
      {label}
      <select
        value={form.boss[key] ?? ''}
        onChange={(e) => set('boss', { ...form.boss, [key]: (e.target.value || null) as Check })}
      >
        {CHECK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form
      className="card edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="form-grid">
        <label>
          레벨
          <input
            type="number"
            min={0}
            max={300}
            value={form.level ?? ''}
            onChange={(e) => set('level', e.target.value === '' ? null : Number(e.target.value))}
          />
        </label>
        <label>
          유니온 전투력
          <input
            type="number"
            min={0}
            value={form.unionPower ?? ''}
            onChange={(e) => set('unionPower', e.target.value === '' ? null : Number(e.target.value))}
          />
        </label>
        {text('plan', '육성 계획')}
        {text('guild', '길드')}
        {text('unionEffect', '유니온 효과')}
        {text('linkEffect', '링크 효과')}
        {boss('karut', '카루타')}
        {boss('stoneDesire', '스우·데미안')}
        {boss('lucidWillSlime', '루시드·윌·슬라임')}
      </div>
      {text('note', '비고')}
      <h3>장비 메모</h3>
      <div className="form-grid">
        {EQUIP_SLOTS.map((slot) => (
          <label key={slot}>
            {slot}
            <textarea
              rows={2}
              value={form.equip[slot] ?? ''}
              onChange={(e) => {
                const equip = { ...form.equip };
                if (e.target.value) equip[slot] = e.target.value;
                else delete equip[slot];
                set('equip', equip);
              }}
            />
          </label>
        ))}
      </div>
      <button type="submit">저장</button>
    </form>
  );
}
