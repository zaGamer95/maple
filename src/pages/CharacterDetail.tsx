import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import illustrationData from '../data/illustrations.json';
import lookData from '../data/looks.json';
import milestoneData from '../data/milestones.json';
import targetSetups from '../data/targetSetups.json';
import CharacterSprite from '../components/CharacterSprite';
import EquipWindow from '../components/EquipWindow';
import { EQUIP_SLOTS } from '../lib/equip';
import { formatCheck, formatMeso, formatNumber, todayKst } from '../lib/format';
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
      {character.isMain && api && <Hero name={character.name} id={id} api={api} />}
      <div className="detail-head">
        {!character.isMain && api?.image && <CharacterSprite className="avatar" src={api.image} scale={2} />}
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

type Illustration = { file: string; label: string };
/** public/illustrations 에 저장한 일러스트 (캐릭터 id → 목록). 한 번 만들어 두고 그대로 쓴다 */
const ILLUSTRATIONS = illustrationData as Record<string, Illustration[]>;
/** 외형이 두 가지인 직업의 모드별 이미지 (scripts/fetch_nexon.mjs 가 모은다) */
const LOOKS = lookData as Record<string, { modes: Record<string, { image: string; date: string }> }>;
const LOOK_LABEL: Record<string, string[]> = { 엔젤릭버스터: ['일반', '드레스 업'], 제로: ['알파', '베타'] };
const medal = (milestoneData as unknown as { medal: { name: string; icon: string } | null }).medal;

/** 본캐 상단: 일러스트(있으면)와 크게 키운 캐릭터 도트, 핵심 정보 */
function Hero({ name, id, api }: { name: string; id: string; api: NonNullable<(typeof nexon.characters)[string]> }) {
  const list = ILLUSTRATIONS[id] ?? [];
  const [pick, setPick] = useState(0);
  const art = list[pick];
  return (
    <div className={`hero${art ? ' hero-art' : ''}`}>
      {art ? (
        <img className="hero-illust" src={art.file} alt={`${name} 일러스트`} />
      ) : (
        api.image && <CharacterSprite className="hero-sprite" src={api.image} scale={3} />
      )}
      <div className="hero-info">
        <div className="hero-name">{name}</div>
        <div className="hero-sub">
          {api.job} · Lv.{api.level}
          {api.expRate != null && ` (${api.expRate}%)`} · {api.world}
        </div>
        <dl className="hero-stats">
          <div>
            <dt>전투력</dt>
            <dd>{formatPower(api.combatPower)}</dd>
          </div>
          <div>
            <dt>생일</dt>
            <dd>{birthday(api.createdAt) ?? '-'}</dd>
          </div>
          {medal && (
            <div>
              <dt>훈장</dt>
              <dd className="item">
                <img src={medal.icon} alt="" width={20} height={20} /> {medal.name}
              </dd>
            </div>
          )}
        </dl>
        {art && <HeroSprites id={id} job={api.job} image={api.image} />}
        {list.length > 1 && (
          <div className="hero-picks">
            {list.map((l, i) => (
              <button key={l.file} className={i === pick ? 'small' : 'ghost small'} onClick={() => setPick(i)}>
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 모드별 이미지가 둘 다 있으면 나란히, 아니면 지금 모습만 */
function HeroSprites({ id, job, image }: { id: string; job: string; image: string | null }) {
  const modes = LOOKS[id]?.modes ?? {};
  const labels = LOOK_LABEL[job];
  if (labels && modes['0'] && modes['1']) {
    return (
      <div className="hero-looks">
        {['0', '1'].map((m) => (
          <figure key={m}>
            <CharacterSprite className="hero-mini" src={modes[m].image} scale={2} />
            <figcaption>{labels[Number(m)]}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return image ? <CharacterSprite className="hero-mini" src={image} scale={2} /> : null;
}

/** "2019-07-18" → "2019-07-18 (2654일째)" — 생성일을 1일째로 센다 */
function birthday(date: string | null | undefined): string | null {
  if (!date) return null;
  const days = Math.round((Date.parse(todayKst()) - Date.parse(date)) / 86_400_000) + 1;
  return `${date} (${days.toLocaleString()}일째)`;
}

function Overview({ c }: { c: Character }) {
  const rows: [string, ReactNode][] = [
    ['생일', birthday(nexon.characters[c.id]?.createdAt)],
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

type Presets = { preset: number | null; presets: NexonEquipment[][] };

/** scripts/fetch_nexon.mjs 가 저장한 public/equip/<id>.json (장비 프리셋 1~3) */
function usePresets(id: string): Presets | undefined {
  const [data, setData] = useState<Presets>();
  useEffect(() => {
    let alive = true;
    fetch(`equip/${encodeURIComponent(id)}.json`)
      .then((r) => (r.ok ? r.json() : undefined))
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);
  return data;
}

function Equip({ c, api }: { c: Character; api?: NexonCharacter }) {
  const filled = EQUIP_SLOTS.filter((s) => c.equip[s]);
  const presets = usePresets(c.id);
  return (
    <>
      {api ? (
        <>
          <p className="muted">넥슨 API 기준 장착 장비 · {formatFetchedAt(nexon.fetchedAt)} 갱신</p>
          <EquipWindow items={api.equipment} image={api.image} presets={presets} sets={api.sets} />
          <details className="eq-list">
            <summary className="muted">목록으로 보기</summary>
            <ApiEquipment items={api.equipment} />
          </details>
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
