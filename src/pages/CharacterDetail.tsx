import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import targetSetups from '../data/targetSetups.json';
import { EQUIP_SLOTS } from '../lib/equip';
import { formatCheck, formatNumber } from '../lib/format';
import { useStore } from '../store';
import type { Character, Check, TargetSetup } from '../types';

type Tab = 'overview' | 'equip' | 'target';

export default function CharacterDetail() {
  const { id = '' } = useParams();
  const { characters, updateCharacter } = useStore();
  const character = characters.find((c) => c.id === id);
  const setup = (targetSetups as TargetSetup[]).find((t) => t.characterId === id);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);

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
        <div>
          <h1>
            {character.name} {character.isMain && <span className="badge">본캐</span>}
          </h1>
          <p className="muted">
            {character.jobGroup} · {character.job} · Lv.{character.level || '-'}
            {character.guild && ` · ${character.guild}`}
          </p>
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
      </div>

      {tab === 'overview' && <Overview c={character} />}
      {tab === 'equip' && <Equip c={character} />}
      {tab === 'target' && <Target setup={setup} />}
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

function Equip({ c }: { c: Character }) {
  const filled = EQUIP_SLOTS.filter((s) => c.equip[s]);
  if (filled.length === 0) return <p className="muted">기록된 장비가 없어요. 편집에서 부위별 메모를 추가할 수 있어요.</p>;
  return (
    <>
      <p className="muted">시트에서 옮긴 메모예요. 넥슨 Open API 연동(2단계) 후에는 실제 장비 정보가 함께 표시돼요.</p>
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
