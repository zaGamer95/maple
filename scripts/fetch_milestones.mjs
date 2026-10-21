// 본캐의 지역 입성일(심볼을 처음 얻은 날)과 착용 훈장을 정리해 src/data/milestones.json 으로 저장한다.
//
// 사용법: NEXON_API_KEY=... node scripts/fetch_milestones.mjs
//
// - 입성일: character/symbol-equipment?date= 로 심볼이 처음 보이는 날을 이분 탐색한다.
//   한 번 찾은 날짜는 data/history/milestones.json 에 남겨 다시 찾지 않는다.
// - 넥슨 일별 데이터는 2023-12-21 부터라 그 전에 얻은 심볼은 "그 이전"으로만 표시된다.
// - 훈장: 보유 훈장 목록 API 는 없어서, 착용 훈장과 훈장 외형만 data/nexon/<본캐>.json 에서 가져온다.
// - 키가 없으면 저장된 기록으로만 만든다. 어떤 경우에도 0 으로 끝난다.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const API = 'https://open.api.nexon.com/maplestory/v1';
const RAW = new URL('../data/history/milestones.json', import.meta.url);
const OUT = new URL('../src/data/milestones.json', import.meta.url);
const NEXON = new URL('../src/data/nexon.json', import.meta.url);
const CHARACTERS = new URL('../src/data/characters.json', import.meta.url);
const API_START = '2023-12-21';

const key = process.env.NEXON_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch {
    return fallback;
  }
}

async function call(path, params) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(250);
    const res = await fetch(url, { headers: { 'x-nxopen-api-key': key } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${path} ${params.date ?? ''}: ${res.status} ${body?.error?.name ?? ''}`);
    return body;
  }
  throw new Error(`${path}: 재시도 초과`);
}

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const kstYesterday = () => addDays(new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10), -1);

/** "아케인심볼 : 소멸의 여로" → "소멸의 여로" */
const regionOf = (symbolName) => symbolName.split(':').pop().trim();

async function main() {
  const characters = await readJson(CHARACTERS, []);
  const nexon = await readJson(NEXON, {});
  const mainChar = characters.find((c) => c.isMain);
  const ocid = mainChar && nexon.characters?.[mainChar.id]?.ocid;
  const detail = mainChar ? await readJson(new URL(`../data/nexon/${mainChar.id}.json`, import.meta.url), {}) : {};
  const raw = await readJson(RAW, { character: mainChar?.id ?? null, regions: {} });

  const symbols = (detail['character/symbol-equipment']?.symbol ?? []).map((s) => ({
    region: regionOf(s.symbol_name),
    name: s.symbol_name,
    icon: s.symbol_icon,
    level: s.symbol_level,
  }));

  if (key && ocid) {
    const regionsAt = new Map();
    const has = async (date, region) => {
      if (!regionsAt.has(date)) {
        const body = await call('character/symbol-equipment', { ocid, date });
        regionsAt.set(date, new Set((body.symbol ?? []).map((s) => regionOf(s.symbol_name))));
      }
      return regionsAt.get(date).has(region);
    };
    let found = 0;
    try {
      for (const s of symbols) {
        if (raw.regions[s.region]) continue;
        if (await has(API_START, s.region)) {
          raw.regions[s.region] = { firstDate: null, before: API_START };
        } else {
          // lo: 없음, hi: 있음
          let lo = API_START;
          let hi = kstYesterday();
          if (!(await has(hi, s.region))) continue; // 오늘 처음 얻은 심볼은 내일 다시 찾는다
          while (daysBetween(lo, hi) > 1) {
            const mid = addDays(lo, Math.floor(daysBetween(lo, hi) / 2));
            if (await has(mid, s.region)) hi = mid;
            else lo = mid;
          }
          raw.regions[s.region] = { firstDate: hi };
        }
        found++;
      }
    } catch (e) {
      console.warn(`::warning::[milestones] ${e.message}`);
    }
    raw.character = mainChar.id;
    await mkdir(new URL('.', RAW), { recursive: true });
    await writeFile(RAW, JSON.stringify(raw, null, 1) + '\n');
    console.log(`[milestones] ${mainChar.id}: 지역 ${found}곳 입성일 새로 찾음`);
  } else {
    console.warn('[milestones] 키 또는 본캐 ocid 가 없어 저장된 기록으로만 만듦');
  }

  const equip = detail['character/item-equipment'] ?? {};
  const medalItem = (equip.item_equipment ?? []).find((i) => i.item_equipment_slot === '훈장');
  const shape = equip.medal_shape;
  await writeFile(
    OUT,
    JSON.stringify(
      {
        character: raw.character ?? mainChar?.id ?? null,
        symbols: symbols.map((s) => ({ ...s, ...(raw.regions[s.region] ?? { firstDate: null }) })),
        medal: medalItem
          ? {
              name: medalItem.item_name,
              icon: medalItem.item_icon,
              description: medalItem.item_description ?? null,
              shapeName: shape?.medal_shape_changed_name ?? shape?.medal_shape_name ?? null,
              shapeIcon: shape?.medal_shape_changed_icon ?? shape?.medal_shape_icon ?? null,
            }
          : null,
      },
      null,
      1,
    ) + '\n',
  );
}

main().catch((e) => console.warn(`::warning::[milestones] 실패: ${e.message}`));
