// data/nexon/<본캐>.json (넥슨 API 원본) 에서 장비 교체 효율 계산에 필요한 값만 뽑아
// src/data/calc.json 으로 저장한다. npm run build 전에 자동으로 실행된다.
//
// 원본이 없으면 빈 파일을 만든다 (계산 화면은 "데이터 없음" 표시).

import { readdir, readFile, writeFile } from 'node:fs/promises';

const DETAIL_DIR = new URL('../data/nexon/', import.meta.url);
const OUT = new URL('../src/data/calc.json', import.meta.url);

// 직업별 주스탯/부스탯. 효율 계산은 우선 본캐(엔젤릭버스터)만 지원한다.
const CLASS_STATS = {
  엔젤릭버스터: { main: 'DEX', sub: 'STR' },
};

const num = (v) => Number(v ?? 0) || 0;

/** "DEX +12%", "공격력 +10", "캐릭터 기준 9레벨 당 DEX +1" → { key, value, pct } */
export function parseLine(line, level) {
  const s = line.replace(/\s*:\s*/g, ' ').replace(/\s+/g, ' ').trim();
  let m = s.match(/^캐릭터 기준 (\d+)레벨 당 (\S+) \+(\d+)$/);
  if (m) return { key: m[2], value: Math.floor(level / Number(m[1])) * Number(m[3]), pct: false };
  m = s.match(/^(.+?) \+(\d+(?:\.\d+)?)(%?)$/);
  if (!m) return null;
  return { key: m[1].replace('몬스터 방어율 무시', '방어율 무시').replace('보스 몬스터 공격 시 데미지', '보스 몬스터 데미지'), value: Number(m[2]), pct: m[3] === '%' };
}

/** 장비 한 개가 주는 효율 관련 수치 */
function contribution(item, cls, level) {
  const t = item.item_total_option ?? {};
  const c = {
    mainFlat: num(t[cls.main.toLowerCase()]),
    subFlat: num(t[cls.sub.toLowerCase()]),
    attFlat: num(t.attack_power),
    allPct: num(t.all_stat), // 추옵 올스탯%
    mainPct: 0,
    subPct: 0,
    attPct: 0,
    boss: num(t.boss_damage),
    dmg: num(t.damage),
    critDmg: 0,
    ied: [], // 방무는 곱연산이라 개별 값으로 보관
  };
  if (num(t.ignore_monster_armor)) c.ied.push(num(t.ignore_monster_armor));
  const lines = [1, 2, 3].flatMap((i) => [item[`potential_option_${i}`], item[`additional_potential_option_${i}`]]).filter(Boolean);
  for (const line of lines) {
    const p = parseLine(line, level);
    if (!p) continue;
    if (p.key === cls.main) p.pct ? (c.mainPct += p.value) : (c.mainFlat += p.value);
    else if (p.key === cls.sub) p.pct ? (c.subPct += p.value) : (c.subFlat += p.value);
    else if (p.key === '올스탯') p.pct ? (c.allPct += p.value) : ((c.mainFlat += p.value), (c.subFlat += p.value));
    else if (p.key === '공격력') p.pct ? (c.attPct += p.value) : (c.attFlat += p.value);
    else if (p.key === '보스 몬스터 데미지' && p.pct) c.boss += p.value;
    else if (p.key === '데미지' && p.pct) c.dmg += p.value;
    else if (p.key === '크리티컬 데미지' && p.pct) c.critDmg += p.value;
    else if (p.key === '방어율 무시' && p.pct) c.ied.push(p.value);
  }
  return { ...c, lines };
}

/** 세트 이름 (장비 이름으로 판별). 제네시스 무기는 아케인·에테르넬 세트에 함께 들어간다. */
export function setsOf(name) {
  if (name.startsWith('제네시스')) return ['아케인셰이드', '에테르넬'];
  if (name.startsWith('아케인셰이드')) return ['아케인셰이드'];
  if (name.startsWith('에테르넬')) return ['에테르넬'];
  if (name.startsWith('앱솔랩스')) return ['앱솔랩스'];
  if (/^(하이네스|이글아이|트릭스터|파프니르)/.test(name)) return ['루타비스'];
  return [];
}

/** "공격력  +40, 보스 몬스터 데미지 +10%" → 수치 */
function parseSetOption(text, cls) {
  const o = { mainFlat: 0, subFlat: 0, attFlat: 0, boss: 0, dmg: 0, critDmg: 0, ied: [] };
  for (const part of text.split(',')) {
    const p = parseLine(part, 0);
    if (!p) continue;
    if (p.key === '올스탯' && !p.pct) (o.mainFlat += p.value), (o.subFlat += p.value);
    else if (p.key === cls.main && !p.pct) o.mainFlat += p.value;
    else if (p.key === cls.sub && !p.pct) o.subFlat += p.value;
    else if (p.key === '공격력' && !p.pct) o.attFlat += p.value;
    else if (p.key === '보스 몬스터 데미지') o.boss += p.value;
    else if (p.key === '데미지') o.dmg += p.value;
    else if (p.key === '크리티컬 데미지') o.critDmg += p.value;
    else if (p.key === '방어율 무시') o.ied.push(p.value);
  }
  return o;
}

async function build(file) {
  const d = JSON.parse(await readFile(new URL(file, DETAIL_DIR), 'utf8'));
  const stat = Object.fromEntries(d['character/stat'].final_stat.map((s) => [s.stat_name, num(s.stat_value)]));
  const job = d['character/stat'].character_class;
  const cls = CLASS_STATS[job];
  if (!cls) return { character: d.character, job, unsupported: true };
  const nexon = JSON.parse(await readFile(new URL('../src/data/nexon.json', import.meta.url), 'utf8'));
  const level = nexon.characters?.[d.character]?.level ?? 0;

  const items = d['character/item-equipment'].item_equipment.map((it) => ({
    slot: it.item_equipment_slot,
    name: it.item_name,
    icon: it.item_icon,
    starforce: num(it.starforce),
    sets: setsOf(it.item_name),
    ...contribution(it, cls, level),
  }));

  // % 가 적용되는 기본 스탯 B 와 % 미적용 스탯 U 로 나눈다: 최종 = B × (1 + p) + U
  const linkPct = d['character/link-skill'].character_link_skill.some((l) => l.skill_name === '하이브리드 로직') ? 10 : 0;
  const mainPct = items.reduce((s, i) => s + i.mainPct + i.allPct, 0) + linkPct;
  const subPct = items.reduce((s, i) => s + i.subPct + i.allPct, 0) + linkPct;
  const attPct = items.reduce((s, i) => s + i.attPct, 0);
  const symbol = d['character/symbol-equipment'].symbol.reduce((s, x) => s + num(x[`symbol_${cls.main.toLowerCase()}`]), 0);
  const hyperPreset = d['character/hyper-stat'][`hyper_stat_preset_${d['character/hyper-stat'].use_preset_no}`] ?? [];
  const hyperMain = hyperPreset
    .filter((h) => h.stat_type === cls.main)
    .reduce((s, h) => s + num(h.stat_increase.match(/(\d+)/)?.[1]), 0);
  // 헥사 스탯 "주력 스탯 증가" 는 레벨당 100 으로 추정 (% 미적용)
  const hexa = (d['character/hexamatrix-stat'].character_hexa_stat_core ?? []).reduce(
    (s, c) =>
      s +
      (c.main_stat_name === '주력 스탯 증가' ? c.main_stat_level * 100 : 0) +
      (c.sub_stat_name_1 === '주력 스탯 증가' ? c.sub_stat_level_1 * 100 : 0) +
      (c.sub_stat_name_2 === '주력 스탯 증가' ? c.sub_stat_level_2 * 100 : 0),
    0,
  );
  const mainUnapplied = symbol + hyperMain + hexa;

  const sets = Object.fromEntries(
    d['character/set-effect'].set_effect
      .map((s) => {
        const key = setsOf(s.set_name.replace(/ 세트.*/, ''))[0] ?? s.set_name.replace(/ 세트.*/, '');
        return [
          key,
          {
            name: s.set_name,
            count: s.total_set_count,
            tiers: Object.fromEntries((s.set_option_full ?? []).map((o) => [o.set_count, parseSetOption(o.set_option, cls)])),
          },
        ];
      })
      .filter(([k]) => ['아케인셰이드', '에테르넬', '루타비스', '앱솔랩스'].includes(k)),
  );

  return {
    character: d.character,
    job,
    fetchedAt: d.fetchedAt,
    mainStat: cls.main,
    subStat: cls.sub,
    stat: {
      main: stat[cls.main],
      sub: stat[cls.sub],
      att: stat['공격력'],
      dmg: stat['데미지'],
      boss: stat['보스 몬스터 데미지'],
      finalDmg: stat['최종 데미지'],
      critDmg: stat['크리티컬 데미지'],
      ied: stat['방어율 무시'],
      combatPower: stat['전투력'],
    },
    model: { mainPct, subPct, attPct, mainUnapplied, subUnapplied: 0, symbol, hyperMain, hexa },
    items,
    sets,
  };
}

const out = { characters: {} };
try {
  for (const f of await readdir(DETAIL_DIR)) {
    if (!f.endsWith('.json')) continue;
    const r = await build(f);
    out.characters[r.character] = r;
  }
} catch (e) {
  console.warn(`[calc] ${e.message}`);
}
await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`[calc] ${Object.keys(out.characters).join(', ') || '없음'}`);
