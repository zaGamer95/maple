import { useState } from 'react';
import type { NexonEquipment } from '../types';
import CharacterSprite from './CharacterSprite';

/** 인게임 장비창과 비슷한 배치 (6칸 × 6줄). CHAR 는 가운데 캐릭터 자리 */
const CHAR = 'CHAR';
const LAYOUT: (string | null)[][] = [
  ['반지4', '얼굴장식', CHAR, CHAR, '모자', '망토'],
  ['반지3', '눈장식', CHAR, CHAR, '상의', '장갑'],
  ['반지2', '귀고리', CHAR, CHAR, '하의', '신발'],
  ['반지1', '펜던트2', CHAR, CHAR, '어깨장식', '훈장'],
  ['벨트', '펜던트', '무기', '보조무기', '뱃지', '기계 심장'],
  ['포켓 아이템', null, null, null, '엠블렘', null],
];

const GRADE_CLASS: Record<string, string> = {
  레어: 'rare',
  에픽: 'epic',
  유니크: 'unique',
  레전드리: 'legendary',
};

/** API 옵션 키 → 표시 이름, % 여부 */
const OPTION_LABEL: [string, string, boolean][] = [
  ['str', 'STR', false],
  ['dex', 'DEX', false],
  ['int', 'INT', false],
  ['luk', 'LUK', false],
  ['max_hp', '최대 HP', false],
  ['max_mp', '최대 MP', false],
  ['attack_power', '공격력', false],
  ['magic_power', '마력', false],
  ['boss_damage', '보스 몬스터 데미지', true],
  ['ignore_monster_armor', '몬스터 방어율 무시', true],
  ['damage', '데미지', true],
  ['all_stat', '올스탯', true],
  ['max_hp_rate', '최대 HP', true],
  ['equipment_level_decrease', '착용 레벨 감소', false],
];

function Options({ title, opt }: { title: string; opt?: Record<string, number> }) {
  const rows = OPTION_LABEL.filter(([k]) => opt?.[k]);
  if (rows.length === 0) return null;
  return (
    <div className="eq-tip-sec">
      <div className="eq-tip-head">{title}</div>
      {rows.map(([k, label, pct]) => (
        <div key={k}>
          {label} : +{opt![k]}
          {pct ? '%' : ''}
        </div>
      ))}
    </div>
  );
}

function Potential({ title, grade, lines }: { title: string; grade: string | null; lines: string[] }) {
  if (!grade) return null;
  return (
    <div className="eq-tip-sec">
      <div className={`eq-tip-head grade-text ${GRADE_CLASS[grade] ?? ''}`}>
        {title} · {grade}
      </div>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

function Tooltip({ it, row }: { it: NexonEquipment; row: number }) {
  return (
    <div className="eq-tip" role="tooltip" style={{ ['--row' as string]: row }}>
      {it.starforce > 0 && <div className="eq-tip-stars">★ {it.starforce}</div>}
      <div className="eq-tip-name">
        {it.name}
        {it.scrollUpgrade > 0 && ` (+${it.scrollUpgrade})`}
      </div>
      <div className="eq-tip-slot">{it.slot}</div>
      {it.shapeName && <div className="eq-tip-slot">외형: {it.shapeName}</div>}
      <Options title="최종 옵션" opt={it.total} />
      <Options title="추가 옵션" opt={it.flame} />
      <Potential title="잠재능력" grade={it.potentialGrade} lines={it.potential} />
      <Potential title="에디셔널" grade={it.additionalGrade} lines={it.additional} />
    </div>
  );
}

export default function EquipWindow({
  items,
  image,
  presets,
}: {
  items: NexonEquipment[];
  image: string | null;
  /** 프리셋 1~3 과 지금 쓰는 번호 (불러오기 전이면 없음) */
  presets?: { preset: number | null; presets: NexonEquipment[][] };
}) {
  const [pick, setPick] = useState<number | null>(null);
  const current = presets?.preset ?? null;
  const shown = pick ?? current;
  if (presets && shown && presets.presets[shown - 1]?.length) items = presets.presets[shown - 1];
  const bySlot = new Map(items.map((it) => [it.slot, it]));
  const [active, setActive] = useState<string | null>(null);
  const activeItem = active ? bySlot.get(active) : undefined;
  const activeRow = active ? LAYOUT.findIndex((row) => row.includes(active)) : 0;
  let charPlaced = false;

  return (
    <div className="eq-wrap" onMouseLeave={() => setActive(null)}>
      <div className="eq-window">
        {LAYOUT.flatMap((row, r) =>
          row.map((slot, c) => {
            if (slot === CHAR) {
              if (charPlaced) return null;
              charPlaced = true;
              return (
                <div
                  key="char"
                  className="eq-char"
                  style={{
                    gridRow: `${r + 1} / span 4`,
                    gridColumn: `${c + 1} / span 2`,
                  }}
                >
                  {image && <CharacterSprite src={image} scale={1} />}
                </div>
              );
            }
            const it = slot ? bySlot.get(slot) : undefined;
            const pos = { gridRow: r + 1, gridColumn: c + 1 };
            if (!slot) return <div key={`${r}-${c}`} className="eq-cell eq-empty" style={pos} />;
            const grade = it?.potentialGrade ? GRADE_CLASS[it.potentialGrade] : '';
            return (
              <div key={slot} className="eq-slot" style={pos}>
                <button
                  type="button"
                  className={`eq-cell ${it ? '' : 'eq-none'} ${grade ? `eq-${grade}` : ''}`}
                  title={it ? undefined : slot}
                  aria-label={it ? `${slot} ${it.name}` : `${slot} 비어 있음`}
                  onMouseEnter={() => setActive(slot)}
                  onFocus={() => setActive(slot)}
                  onBlur={() => setActive((a) => (a === slot ? null : a))}
                  onClick={() => setActive((a) => (a === slot ? null : slot))}
                >
                  {it && <img src={it.shapeIcon ?? it.icon} alt="" loading="lazy" />}
                  {it && it.starforce > 0 && <span className="eq-star">{it.starforce}</span>}
                </button>
              </div>
            );
          }),
        )}
      </div>
      {presets && (
        <div className="eq-presets">
          <span>PRESETS</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={n === shown ? 'small' : 'ghost small'}
              disabled={!presets.presets[n - 1]?.length}
              title={n === current ? '지금 쓰는 프리셋' : undefined}
              onClick={() => setPick(n)}
            >
              {n}
              {n === current ? ' ✓' : ''}
            </button>
          ))}
        </div>
      )}
      {activeItem && <Tooltip it={activeItem} row={activeRow} />}
    </div>
  );
}
