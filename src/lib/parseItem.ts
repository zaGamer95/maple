/**
 * 메이플 옥션(웹)·장비 툴팁에서 복사한 텍스트를 장비 수치로 바꾼다.
 *
 * 받는 형식 (둘 다 섞여 있어도 됨):
 *   "DEX : +331 (40 +43 +248)"   → 장비 최종 옵션 (괄호 안 세부값은 무시)
 *   "DEX +12%", "공격력 : +10"    → 잠재·에디셔널 줄
 * "잠재옵션"/"에디셔널" 같은 머리글 이후는 잠재 줄로 본다.
 */
import { EMPTY, type Contribution } from './calc';

export interface ParsedItem extends Contribution {
  name: string;
  starforce: number;
  sets: string[];
  /** 해석하지 못한 줄 (사용자 확인용) */
  unknownLines: string[];
  potentialLines: string[];
}

/** 세트 이름 (scripts/build_calc_data.mjs 의 setsOf 와 같아야 한다) */
export function setsOf(name: string): string[] {
  if (name.startsWith('제네시스')) return ['아케인셰이드', '에테르넬'];
  if (name.startsWith('아케인셰이드')) return ['아케인셰이드'];
  if (name.startsWith('에테르넬')) return ['에테르넬'];
  if (name.startsWith('앱솔랩스')) return ['앱솔랩스'];
  if (/^(하이네스|이글아이|트릭스터|파프니르)/.test(name)) return ['루타비스'];
  return [];
}

const ALIASES: Record<string, string> = {
  '몬스터 방어율 무시': '방어율 무시',
  '보스 몬스터 공격 시 데미지': '보스 몬스터 데미지',
  '모든 능력치': '올스탯',
  올스텟: '올스탯',
};

/** "DEX : +12%" / "DEX +331 (40 +43)" → { key, value, pct } */
function parseStatLine(raw: string, level: number) {
  const s = raw.replace(/\(.*?\)/g, '').replace(/\s*:\s*/g, ' ').replace(/\s+/g, ' ').trim();
  let m = s.match(/^캐릭터 기준 (\d+)레벨 당 (\S+) \+(\d+)$/);
  if (m) return { key: m[2], value: Math.floor(level / Number(m[1])) * Number(m[3]), pct: false };
  m = s.match(/^(.+?) \+(\d+(?:\.\d+)?)(%?)$/);
  if (!m) return null;
  const key = ALIASES[m[1]] ?? m[1];
  return { key, value: Number(m[2]), pct: m[3] === '%' };
}

export function parseItemText(text: string, mainStat: string, subStat: string, level: number): ParsedItem {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const item: ParsedItem = { ...EMPTY, ied: [], name: '', starforce: 0, sets: [], unknownLines: [], potentialLines: [] };
  let inPotential = false;

  for (const line of lines) {
    if (/잠재|에디셔널/.test(line) && !/[+]\d/.test(line)) {
      inPotential = true;
      continue;
    }
    if (!item.name && !/[:+★]/.test(line.replace(/\(\+\d+\)/, '')) && /[가-힣]/.test(line)) {
      // 첫 한글 줄을 아이템 이름으로 ("하이네스 원더러햇 (+11)")
      item.name = line.replace(/\s*\(\+\d+\)\s*$/, '');
      continue;
    }
    const stars = line.match(/★/g)?.length;
    if (stars && !/[가-힣]/.test(line.replace(/[★☆\s]/g, ''))) {
      item.starforce = Math.max(item.starforce, stars);
      continue;
    }
    const sf = line.match(/(\d+)\s*성/);
    if (sf && !/[+]/.test(line)) {
      item.starforce = Number(sf[1]);
      continue;
    }
    const p = parseStatLine(line, level);
    if (!p) {
      if (/[+]\d/.test(line)) item.unknownLines.push(line);
      continue;
    }
    // % 가 붙은 주·부스탯, 공격력% 는 잠재 줄로 본다
    const potential = inPotential || (p.pct && [mainStat, subStat, '공격력', '올스탯'].includes(p.key));
    if (potential) item.potentialLines.push(line);
    if (p.key === mainStat) p.pct ? (item.mainPct += p.value) : (item.mainFlat += p.value);
    else if (p.key === subStat) p.pct ? (item.subPct += p.value) : (item.subFlat += p.value);
    else if (p.key === '올스탯') p.pct ? (item.allPct += p.value) : ((item.mainFlat += p.value), (item.subFlat += p.value));
    else if (p.key === '공격력') p.pct ? (item.attPct += p.value) : (item.attFlat += p.value);
    else if (p.key === '보스 몬스터 데미지' && p.pct) item.boss += p.value;
    else if (p.key === '데미지' && p.pct) item.dmg += p.value;
    else if (p.key === '크리티컬 데미지' && p.pct) item.critDmg += p.value;
    else if (p.key === '방어율 무시' && p.pct) item.ied.push(p.value);
  }
  item.sets = setsOf(item.name);
  return item;
}
