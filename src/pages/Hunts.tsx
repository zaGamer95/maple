import { useMemo, useState } from 'react';
import { formatKoreanNumber, formatMeso, parseKoreanNumber, todayKst } from '../lib/format';
import { nexon } from '../lib/nexon';
import { useStore } from '../store';
import type { HuntLog } from '../types';
import ExpHistory from './ExpHistory';
import Milestones from './Milestones';

const perHour = (v: number | null, h: HuntLog) => (v == null ? null : (v / h.seconds) * 3600);

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

/** "01:00:00", "1:00", "60" (분) → 초 */
function parseDuration(text: string): number | null {
  const parts = text.trim().split(':').map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && parts[0] > 0) return parts[0] * 60;
  return null;
}

/** 현재 레벨 필요 경험치 = 현재 경험치 ÷ 경험치 % (넥슨 API 값으로 역산) */
function levelExp(characterId: string | null): { level: number; required: number } | null {
  const c = characterId ? nexon.characters[characterId] : undefined;
  if (!c?.exp || !c.expRate) return null;
  return { level: c.level, required: c.exp / (c.expRate / 100) };
}

export default function Hunts() {
  const { hunts } = useStore();
  const rows = useMemo(() => [...hunts].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [hunts]);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = rows.find((h) => h.id === selected) ?? rows[0];

  return (
    <section>
      <h1>사냥·경험치</h1>
      <ExpHistory />
      <Milestones />
      <div className="detail-head">
        <h2>사냥 기록</h2>
        <button onClick={() => setAdding((a) => !a)}>{adding ? '닫기' : '기록 추가'}</button>
      </div>
      <p className="muted">전투분석 결과를 기록해요. 시간당 값은 전투 시간으로 환산한 값이에요.</p>
      {adding && <AddHuntForm onDone={() => setAdding(false)} />}
      {current && <HuntSummary h={current} />}
      <HuntTable rows={rows} selected={current?.id} onSelect={setSelected} />
    </section>
  );
}

function HuntSummary({ h }: { h: HuntLog }) {
  const lv = levelExp(h.characterId);
  const expH = perHour(h.exp, h);
  return (
    <>
      <h2>
        {h.date} · {h.map} {h.characterId && <span className="muted">· {h.characterId}</span>}
      </h2>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">시간당 경험치</div>
          <div className="stat-value">{formatKoreanNumber(expH)}</div>
          <div className="stat-sub">
            {lv && expH ? `Lv.${lv.level} 기준 ${((expH / lv.required) * 100).toFixed(2)}% / 시간` : `초당 ${formatKoreanNumber(h.exp && h.exp / h.seconds)}`}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">시간당 메소</div>
          <div className="stat-value">{formatMeso(perHour(h.meso, h))}</div>
        </div>
        <div className="stat">
          <div className="stat-label">시간당 처치</div>
          <div className="stat-value">{formatKoreanNumber(perHour(h.kills, h))}</div>
          <div className="stat-sub">{h.kills && h.exp ? `마리당 경험치 ${formatKoreanNumber(h.exp / h.kills)}` : ''}</div>
        </div>
        <div className="stat">
          <div className="stat-label">초당 데미지</div>
          <div className="stat-value">{formatKoreanNumber(h.totalDamage && h.totalDamage / h.seconds)}</div>
          <div className="stat-sub">총합 {formatKoreanNumber(h.totalDamage)}</div>
        </div>
      </div>
      {h.note && <p className="muted">메모: {h.note}</p>}
      {h.skills.length > 0 && <SkillShare h={h} />}
    </>
  );
}

/** 스킬별 데미지 점유율 (단일 계열 막대, 값은 막대 옆에 직접 표기) */
function SkillShare({ h }: { h: HuntLog }) {
  const max = Math.max(...h.skills.map((s) => s.share));
  return (
    <div className="card">
      <h2>스킬 점유율</h2>
      <ul className="bars">
        {h.skills.map((s) => (
          <li key={s.name} title={`누적 ${formatKoreanNumber(s.damage)}`}>
            <span className="bar-label">{s.name}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(s.share / max) * 100}%` }} />
            </span>
            <span className="bar-value">{s.share.toFixed(2)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HuntTable({ rows, selected, onSelect }: { rows: HuntLog[]; selected?: string; onSelect: (id: string) => void }) {
  const { removeHunt } = useStore();
  if (rows.length === 0) return <p className="muted">사냥 기록이 없어요.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>캐릭터</th>
            <th>사냥터</th>
            <th className="num">시간</th>
            <th className="num">경험치/시간</th>
            <th className="num">메소/시간</th>
            <th className="num">처치/시간</th>
            <th className="num">데미지/초</th>
            <th>메모</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id} className={h.id === selected ? 'main-row' : undefined} onClick={() => onSelect(h.id)} style={{ cursor: 'pointer' }}>
              <td className="mono">{h.date}</td>
              <td>{h.characterId}</td>
              <td>{h.map}</td>
              <td className="num mono">{formatDuration(h.seconds)}</td>
              <td className="num">{formatKoreanNumber(perHour(h.exp, h))}</td>
              <td className="num">{formatMeso(perHour(h.meso, h))}</td>
              <td className="num">{formatKoreanNumber(perHour(h.kills, h))}</td>
              <td className="num">{formatKoreanNumber(h.totalDamage && h.totalDamage / h.seconds)}</td>
              <td className="note-cell">{h.note}</td>
              <td>
                <button
                  className="ghost small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`${h.date} ${h.map} 기록을 지울까요?`)) removeHunt(h.id);
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

/** "솔 야누스 : 새벽 / 1102조 5157억 / 72.04" 한 줄에 한 스킬 */
function parseSkills(text: string): HuntLog['skills'] {
  return text
    .split(/\r?\n/)
    .map((l) => l.split('/').map((s) => s.trim()))
    .filter((p) => p.length >= 3 && p[0])
    .map(([name, damage, share]) => ({ name, damage: parseKoreanNumber(damage) ?? 0, share: Number(share.replace('%', '')) || 0 }));
}

function AddHuntForm({ onDone }: { onDone: () => void }) {
  const { characters, hunts, addHunt } = useStore();
  const main = characters.find((c) => c.isMain);
  const [f, setF] = useState({
    date: todayKst(),
    characterId: main?.id ?? '',
    map: '',
    duration: '01:00:00',
    kills: '',
    meso: '',
    totalDamage: '',
    exp: '',
    note: '',
    skills: '',
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const seconds = parseDuration(f.duration);
  const num = (k: 'kills' | 'meso' | 'totalDamage' | 'exp') => parseKoreanNumber(f[k]);
  const valid = f.map.trim() && seconds;
  const preview = (k: 'kills' | 'meso' | 'totalDamage' | 'exp') => (f[k] && num(k) != null ? `= ${formatKoreanNumber(num(k))}` : '');

  return (
    <form
      className="card edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        addHunt({
          id: `h${Date.now()}`,
          date: f.date,
          characterId: f.characterId || null,
          map: f.map.trim(),
          seconds: seconds!,
          kills: num('kills'),
          meso: num('meso'),
          totalDamage: num('totalDamage'),
          exp: num('exp'),
          note: f.note.trim() || null,
          skills: parseSkills(f.skills),
        });
        onDone();
      }}
    >
      <div className="form-grid">
        <label>
          날짜
          <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label>
          캐릭터
          <select value={f.characterId} onChange={(e) => set('characterId', e.target.value)}>
            <option value="">-</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.job})
              </option>
            ))}
          </select>
        </label>
        <label>
          사냥터
          <input list="hunt-maps" value={f.map} onChange={(e) => set('map', e.target.value)} placeholder="예: 섭리와 운명의 전쟁터 1" />
          <datalist id="hunt-maps">
            {[...new Set(hunts.map((h) => h.map))].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label>
          전투 시간
          <input value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="01:00:00" />
        </label>
        <label>
          몬스터 처치 {preview('kills')}
          <input value={f.kills} onChange={(e) => set('kills', e.target.value)} placeholder="예: 1만 9020" />
        </label>
        <label>
          획득 메소 {preview('meso')}
          <input value={f.meso} onChange={(e) => set('meso', e.target.value)} placeholder="예: 1억 3086만" />
        </label>
        <label>
          총합 데미지 {preview('totalDamage')}
          <input value={f.totalDamage} onChange={(e) => set('totalDamage', e.target.value)} placeholder="예: 1530조 3369억" />
        </label>
        <label>
          획득 경험치 {preview('exp')}
          <input value={f.exp} onChange={(e) => set('exp', e.target.value)} placeholder="예: 9939억 8020만" />
        </label>
      </div>
      <label>
        메모 (트레저 헌터, 룬, 부스터 등)
        <input value={f.note} onChange={(e) => set('note', e.target.value)} />
      </label>
      <label>
        스킬 (선택, 한 줄에 "스킬 / 누적 데미지 / 점유율")
        <textarea rows={3} value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder="솔 야누스 : 새벽 / 1102조 5157억 / 72.04" />
      </label>
      <button type="submit" disabled={!valid}>
        추가
      </button>
    </form>
  );
}
