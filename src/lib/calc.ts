/**
 * 장비 교체 효율 계산.
 *
 * 보스 데미지 (방어율 380%) ∝ (4×주스탯 + 부스탯) × 공격력 × (1 + 데미지 + 보공) × (1.35 + 크뎀) × (1 + 최종뎀) × (1 − 3.8 × (1 − 방무))
 * 전투력 변화는 넥슨 전투력에 들어가는 항목(스탯·공격력·데미지+보공·크뎀)의 비율로 추정한다 (방무 미포함).
 * 환산 주스탯 = 보스 데미지 증가율을 "최종 주스탯 몇 증가와 같은가"로 바꾼 값.
 *
 * 주스탯은 최종 = B × (1 + %) + (% 미적용) 으로 나눈다. % 미적용(심볼·하이퍼·헥사)은 API 값으로,
 * B 는 실제 최종 스탯에서 거꾸로 구해서 API 로 잡히지 않는 출처를 흡수한다.
 */
import calcData from '../data/calc.json';

export const BOSS_DEFENSE = 3.8;

export interface Contribution {
  mainFlat: number;
  subFlat: number;
  attFlat: number;
  /** 올스탯% (추옵 + 잠재) */
  allPct: number;
  mainPct: number;
  subPct: number;
  attPct: number;
  boss: number;
  dmg: number;
  critDmg: number;
  /** 방어율 무시 % 값 목록 (곱연산) */
  ied: number[];
}

export interface CalcItem extends Contribution {
  slot: string;
  name: string;
  icon: string;
  starforce: number;
  sets: string[];
  lines: string[];
}

type SetTier = Omit<Contribution, 'allPct' | 'mainPct' | 'subPct' | 'attPct'>;

export interface CalcCharacter {
  character: string;
  job: string;
  fetchedAt: string;
  mainStat: string;
  subStat: string;
  stat: {
    main: number;
    sub: number;
    att: number;
    dmg: number;
    boss: number;
    finalDmg: number;
    critDmg: number;
    ied: number;
    combatPower: number;
  };
  model: { mainPct: number; subPct: number; attPct: number; mainUnapplied: number; subUnapplied: number };
  items: CalcItem[];
  sets: Record<string, { name: string; count: number; tiers: Record<string, SetTier> }>;
}

export const calcCharacters = (calcData as unknown as { characters: Record<string, CalcCharacter> }).characters;

export const EMPTY: Contribution = {
  mainFlat: 0,
  subFlat: 0,
  attFlat: 0,
  allPct: 0,
  mainPct: 0,
  subPct: 0,
  attPct: 0,
  boss: 0,
  dmg: 0,
  critDmg: 0,
  ied: [],
};

/** 세트 count 개 효과의 합 */
function setBonus(tiers: Record<string, SetTier>, count: number): SetTier {
  const sum: SetTier = { mainFlat: 0, subFlat: 0, attFlat: 0, boss: 0, dmg: 0, critDmg: 0, ied: [] };
  for (const [n, t] of Object.entries(tiers)) {
    if (Number(n) > count) continue;
    sum.mainFlat += t.mainFlat;
    sum.subFlat += t.subFlat;
    sum.attFlat += t.attFlat;
    sum.boss += t.boss;
    sum.dmg += t.dmg;
    sum.critDmg += t.critDmg;
    sum.ied.push(...t.ied);
  }
  return sum;
}

export interface SetChange {
  set: string;
  from: number;
  to: number;
  /** 세트 효과 정보가 없어 반영하지 못함 */
  unknown?: boolean;
}

interface Snapshot {
  main: number;
  sub: number;
  att: number;
  dmg: number;
  boss: number;
  critDmg: number;
  finalDmg: number;
  ied: number;
}

const iedRemain = (list: number[]) => list.reduce((r, x) => r * (1 - x / 100), 1);

function bossDamage(s: Snapshot): number {
  const def = Math.max(0, 1 - BOSS_DEFENSE * (1 - s.ied / 100));
  return (4 * s.main + s.sub) * s.att * (1 + (s.dmg + s.boss) / 100) * (1.35 + s.critDmg / 100) * (1 + s.finalDmg / 100) * def;
}

function combatFactor(s: Snapshot): number {
  return (4 * s.main + s.sub) * s.att * (1 + (s.dmg + s.boss) / 100) * (1.35 + s.critDmg / 100);
}

export interface SwapResult {
  before: Snapshot;
  after: Snapshot;
  /** 보스(방어율 380%) 데미지 증가율 */
  bossPct: number;
  /** 환산 주스탯 변화 */
  statEquivalent: number;
  combatPower: number;
  combatPowerDelta: number;
  setChanges: SetChange[];
}

/**
 * removed 장비를 빼고 added 를 넣었을 때의 변화.
 * removedSets / addedSets 는 세트 판정용 (예: ['아케인셰이드']).
 */
export function swap(
  ch: CalcCharacter,
  removed: Contribution,
  removedSets: string[],
  added: Contribution,
  addedSets: string[],
): SwapResult {
  const { stat, model } = ch;
  const before: Snapshot = { ...stat };

  // 세트 효과 변화
  const setChanges: SetChange[] = [];
  const setDelta: SetTier = { mainFlat: 0, subFlat: 0, attFlat: 0, boss: 0, dmg: 0, critDmg: 0, ied: [] };
  const setRemovedIed: number[] = [];
  for (const set of new Set([...removedSets, ...addedSets])) {
    const diff = (addedSets.includes(set) ? 1 : 0) - (removedSets.includes(set) ? 1 : 0);
    if (diff === 0) continue;
    const info = ch.sets[set];
    const from = info?.count ?? 0;
    const to = from + diff;
    if (!info) {
      setChanges.push({ set, from, to, unknown: true });
      continue;
    }
    setChanges.push({ set, from, to });
    const a = setBonus(info.tiers, from);
    const b = setBonus(info.tiers, to);
    setDelta.mainFlat += b.mainFlat - a.mainFlat;
    setDelta.subFlat += b.subFlat - a.subFlat;
    setDelta.attFlat += b.attFlat - a.attFlat;
    setDelta.boss += b.boss - a.boss;
    setDelta.dmg += b.dmg - a.dmg;
    setDelta.critDmg += b.critDmg - a.critDmg;
    // 방무는 잃는 단계/얻는 단계를 따로 곱한다
    if (to > from) setDelta.ied.push(...b.ied.slice(a.ied.length));
    else setRemovedIed.push(...a.ied.slice(b.ied.length));
  }

  const pMain = model.mainPct / 100;
  const pSub = model.subPct / 100;
  const pAtt = model.attPct / 100;
  const bMain = (stat.main - model.mainUnapplied) / (1 + pMain);
  const bSub = (stat.sub - model.subUnapplied) / (1 + pSub);
  const bAtt = stat.att / (1 + pAtt);

  const d = (k: 'mainFlat' | 'subFlat' | 'attFlat' | 'boss' | 'dmg' | 'critDmg') => added[k] - removed[k] + setDelta[k];
  const dMainPct = (added.mainPct + added.allPct - removed.mainPct - removed.allPct) / 100;
  const dSubPct = (added.subPct + added.allPct - removed.subPct - removed.allPct) / 100;
  const dAttPct = (added.attPct - removed.attPct) / 100;

  const remain = (1 - stat.ied / 100) / iedRemain([...removed.ied, ...setRemovedIed]) * iedRemain([...added.ied, ...setDelta.ied]);

  const after: Snapshot = {
    main: (bMain + d('mainFlat')) * (1 + pMain + dMainPct) + model.mainUnapplied,
    sub: (bSub + d('subFlat')) * (1 + pSub + dSubPct) + model.subUnapplied,
    att: (bAtt + d('attFlat')) * (1 + pAtt + dAttPct),
    dmg: stat.dmg + d('dmg'),
    boss: stat.boss + d('boss'),
    critDmg: stat.critDmg + d('critDmg'),
    finalDmg: stat.finalDmg,
    ied: (1 - remain) * 100,
  };

  const ratio = bossDamage(after) / bossDamage(before);
  const cp = stat.combatPower * (combatFactor(after) / combatFactor(before));
  return {
    before,
    after,
    bossPct: (ratio - 1) * 100,
    statEquivalent: (ratio - 1) * (4 * stat.main + stat.sub) / 4,
    combatPower: Math.round(cp),
    combatPowerDelta: Math.round(cp - stat.combatPower),
    setChanges,
  };
}

/** 지금 장비를 빼기만 했을 때 (그 장비의 기여도) */
export function removalOf(ch: CalcCharacter, item: CalcItem): SwapResult {
  return swap(ch, item, item.sets, EMPTY, []);
}
