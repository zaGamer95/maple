import { useEffect, useMemo, useState } from 'react';
import { calcCharacters, removalOf, swap, type CalcCharacter, type CalcItem, type SwapResult } from '../lib/calc';
import { formatMeso, formatNumber, parseMeso } from '../lib/format';
import { nexon } from '../lib/nexon';
import { parseItemText, type ParsedItem } from '../lib/parseItem';
import { useStore } from '../store';

/** 후보 매물은 이 브라우저에만 저장한다 */
const CANDIDATE_KEY = 'maple:upgrade:candidates:v1';

interface Candidate {
  id: string;
  slot: string;
  text: string;
  price: number | null;
}

function loadCandidates(): Candidate[] {
  try {
    return JSON.parse(localStorage.getItem(CANDIDATE_KEY) ?? '[]') as Candidate[];
  } catch {
    return [];
  }
}

const FOCUS_SLOTS = ['신발', '상의', '하의'];

const signed = (n: number, digits = 0) => `${n >= 0 ? '+' : ''}${n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;

export default function Upgrade() {
  const { characters } = useStore();
  const main = characters.find((c) => c.isMain);
  const ch = main ? calcCharacters[main.id] : undefined;
  const [slot, setSlot] = useState('신발');
  const [candidates, setCandidates] = useState<Candidate[]>(loadCandidates);

  useEffect(() => {
    try {
      localStorage.setItem(CANDIDATE_KEY, JSON.stringify(candidates));
    } catch {
      // 저장소를 못 쓰면 이번 세션 동안만 유지
    }
  }, [candidates]);

  if (!ch) return <p className="muted">본캐의 넥슨 상세 데이터가 아직 없어요.</p>;
  const item = ch.items.find((i) => i.slot === slot);
  const level = (main && nexon.characters[main.id]?.level) || 0;
  const slots = [...FOCUS_SLOTS, ...ch.items.map((i) => i.slot).filter((s) => !FOCUS_SLOTS.includes(s))];

  return (
    <section>
      <h1>장비 교체 효율</h1>
      <p className="muted">
        {ch.character} · {ch.job} · 기준: 보스 방어율 380% · 넥슨 데이터 {ch.fetchedAt.slice(0, 10)}
      </p>
      <div className="tabs">
        {slots.map((s) => (
          <button key={s} className={s === slot ? 'tab active' : 'tab'} onClick={() => setSlot(s)}>
            {s}
          </button>
        ))}
      </div>
      {item && <CurrentItem ch={ch} item={item} />}
      {item && (
        <Candidates
          ch={ch}
          item={item}
          level={level}
          list={candidates.filter((c) => c.slot === slot)}
          onAdd={(c) => setCandidates((cs) => [...cs, c])}
          onRemove={(id) => setCandidates((cs) => cs.filter((c) => c.id !== id))}
        />
      )}
      <Assumptions ch={ch} />
    </section>
  );
}

function CurrentItem({ ch, item }: { ch: CalcCharacter; item: CalcItem }) {
  const r = removalOf(ch, item);
  return (
    <div className="card">
      <h2>
        현재: {item.name} {item.starforce ? `★${item.starforce}` : ''}
      </h2>
      <p className="muted">
        {ch.mainStat} {item.mainFlat} · {ch.subStat} {item.subFlat} · 공격력 {item.attFlat} · 올스탯 {item.allPct}% · {ch.mainStat}{' '}
        {item.mainPct}% {item.ied.length ? `· 방무 ${item.ied.join('/')}%` : ''} {item.sets.length ? `· 세트: ${item.sets.join(', ')}` : ''}
      </p>
      <p className="muted small">{item.lines.join(' / ')}</p>
      <p>
        이 장비의 기여도 (빼면): 보스 데미지 <b>{signed(r.bossPct, 2)}%</b> · 환산 {signed(r.statEquivalent)} · 전투력{' '}
        {signed(r.combatPowerDelta)}
        <SetNotes result={r} />
      </p>
    </div>
  );
}

function SetNotes({ result }: { result: SwapResult }) {
  if (!result.setChanges.length) return null;
  return (
    <span className="muted small">
      {' '}
      (세트{' '}
      {result.setChanges.map((s) => `${s.set} ${s.from}→${s.to}${s.unknown ? ' 효과 미반영' : ''}`).join(', ')})
    </span>
  );
}

function Candidates({
  ch,
  item,
  level,
  list,
  onAdd,
  onRemove,
}: {
  ch: CalcCharacter;
  item: CalcItem;
  level: number;
  list: Candidate[];
  onAdd: (c: Candidate) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const parsed = useMemo(() => (text.trim() ? parseItemText(text, ch.mainStat, ch.subStat, level) : null), [text, ch, level]);

  const rows = list
    .map((c) => {
      const p = parseItemText(c.text, ch.mainStat, ch.subStat, level);
      const r = swap(ch, item, item.sets, p, p.sets);
      const perEok = c.price ? r.statEquivalent / (c.price / 1e8) : null;
      return { c, p, r, perEok };
    })
    .sort((a, b) => (b.perEok ?? -Infinity) - (a.perEok ?? -Infinity) || b.r.bossPct - a.r.bossPct);

  return (
    <div className="card">
      <h2>후보 매물</h2>
      <p className="muted small">
        웹 메이플 옥션에서 아이템 정보를 복사해 붙여넣으세요. "DEX : +331 (40 +43 +248)", "DEX +12%" 같은 줄을 읽어요.
      </p>
      <div className="edit-form">
        <label>
          아이템 정보
          <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'예)\n트릭스터 원더러팬츠\n22성\nDEX : +291\nSTR : +147\n공격력 : +93\n올스탯 : +6%\n몬스터 방어율 무시 : +5%\n잠재옵션\nDEX +12%\n올스탯 +9%\nDEX +9%'} />
        </label>
        {parsed && <ParsedPreview p={parsed} ch={ch} />}
        <div className="filters">
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="가격 (예: 150억)" />
          <button
            disabled={!parsed}
            onClick={() => {
              onAdd({ id: `c${Date.now()}`, slot: item.slot, text, price: parseMeso(price) });
              setText('');
              setPrice('');
            }}
          >
            후보 추가
          </button>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>매물</th>
                <th className="num">보스 데미지</th>
                <th className="num">환산</th>
                <th className="num">전투력</th>
                <th className="num">가격</th>
                <th className="num">억당 환산</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, p, r, perEok }) => (
                <tr key={c.id}>
                  <td>
                    {p.name || '(이름 없음)'} {p.starforce ? `★${p.starforce}` : ''}
                    <SetNotes result={r} />
                  </td>
                  <td className="num">{signed(r.bossPct, 2)}%</td>
                  <td className="num">{signed(r.statEquivalent)}</td>
                  <td className="num">{signed(r.combatPowerDelta)}</td>
                  <td className="num">{c.price ? formatMeso(c.price) : '-'}</td>
                  <td className="num">{perEok != null ? signed(perEok, 1) : '-'}</td>
                  <td>
                    <button className="ghost small" onClick={() => onRemove(c.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ParsedPreview({ p, ch }: { p: ParsedItem; ch: CalcCharacter }) {
  return (
    <div className="muted small">
      읽은 값: {p.name || '이름 없음'} {p.starforce ? `★${p.starforce}` : ''} · {ch.mainStat} {p.mainFlat} · {ch.subStat} {p.subFlat} · 공격력{' '}
      {p.attFlat} · 올스탯 {p.allPct}% · {ch.mainStat} {p.mainPct}% · 공격력 {p.attPct}%
      {p.boss ? ` · 보공 ${p.boss}%` : ''}
      {p.ied.length ? ` · 방무 ${p.ied.join('/')}%` : ''}
      {p.sets.length ? ` · 세트 ${p.sets.join(', ')}` : ''}
      {p.unknownLines.length > 0 && <div>⚠ 읽지 못한 줄: {p.unknownLines.join(' / ')}</div>}
    </div>
  );
}

function Assumptions({ ch }: { ch: CalcCharacter }) {
  const { stat, model } = ch;
  return (
    <details className="card">
      <summary>계산 기준과 가정</summary>
      <ul className="small">
        <li>
          보스 데미지 ∝ (4×{ch.mainStat} + {ch.subStat}) × 공격력 × (1 + 데미지 + 보공) × (1.35 + 크뎀) × (1 + 최종뎀) × (1 − 3.8 × (1 − 방무))
        </li>
        <li>환산 = 보스 데미지 증가율을 "최종 {ch.mainStat} 몇 증가와 같은가"로 바꾼 값</li>
        <li>전투력 = 현재 전투력 {formatNumber(stat.combatPower)} × (스탯·공격력·데미지+보공·크뎀 변화 비율) — 추정치, 방무 미포함</li>
        <li>
          {ch.mainStat} {formatNumber(stat.main)} = 기본 × (1 + {model.mainPct}%) + % 미적용 {formatNumber(model.mainUnapplied)} (심볼·하이퍼·헥사 추정)
        </li>
        <li>공격력 {formatNumber(stat.att)} = 기본 × (1 + {model.attPct}%)</li>
        <li>세트 효과는 장비 이름으로 판별 (아케인셰이드·에테르넬·루타비스·앱솔랩스, 제네시스 무기는 아케인·에테르넬 둘 다)</li>
      </ul>
    </details>
  );
}
