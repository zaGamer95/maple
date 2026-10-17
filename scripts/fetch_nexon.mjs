// 넥슨 Open API 에서 캐릭터 정보를 받아 src/data/nexon.json 으로 저장한다.
//
// 사용법: NEXON_API_KEY=... node scripts/fetch_nexon.mjs
//
// 키가 없거나 API 가 실패해도 빌드가 멈추지 않도록 항상 0 으로 끝난다.
// (실패하면 기존 nexon.json 을 그대로 두고 경고만 남긴다.)

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const API = 'https://open.api.nexon.com/maplestory/v1';
const DATA_DIR = new URL('../src/data/', import.meta.url);
// 본캐 효율 계산용 원본 응답 (사이트 번들에는 넣지 않음)
const DETAIL_DIR = new URL('../data/nexon/', import.meta.url);
const DETAIL_ENDPOINTS = [
  'character/stat',
  'character/item-equipment',
  'character/set-effect',
  'character/symbol-equipment',
  'character/hyper-stat',
  'character/ability',
  'character/hexamatrix-stat',
  'character/link-skill',
  'user/union-raider',
];
// 개발 단계 키는 초당 5건 제한 (서비스 키는 500건이지만 여유 있게 유지)
const REQUEST_INTERVAL_MS = 250;

const key = process.env.NEXON_API_KEY;
if (!key) {
  console.warn('[nexon] NEXON_API_KEY 가 없어 건너뜀');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

async function call(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = lastRequest + REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const res = await fetch(url, { headers: { 'x-nxopen-api-key': key } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`${path}: ${res.status} ${body?.error?.name ?? ''} ${body?.error?.message ?? ''}`.trim());
      err.code = body?.error?.name;
      throw err;
    }
    return body;
  }
  throw new Error(`${path}: 재시도 초과`);
}

const potentials = (item, prefix) =>
  [1, 2, 3].map((i) => item[`${prefix}_${i}`]).filter(Boolean);

function toEquipment(item) {
  return {
    slot: item.item_equipment_slot ?? item.equipment_slot ?? item.item_equipment_part,
    part: item.item_equipment_part,
    name: item.item_name,
    icon: item.item_icon,
    starforce: Number(item.starforce) || 0,
    scrollUpgrade: Number(item.scroll_upgrade) || 0,
    potentialGrade: item.potential_option_grade ?? null,
    potential: potentials(item, 'potential_option'),
    additionalGrade: item.additional_potential_option_grade ?? null,
    additional: [
      ...potentials(item, 'additional_potential_option'),
      ...potentials(item, 'addtional_potential_option'),
    ],
  };
}

async function fetchCharacter(name) {
  const { ocid } = await call('id', { character_name: name });
  const basic = await call('character/basic', { ocid });
  const stat = await call('character/stat', { ocid });
  const equip = await call('character/item-equipment', { ocid });
  const combatPower = stat.final_stat?.find((s) => s.stat_name === '전투력')?.stat_value;
  return {
    ocid,
    name: basic.character_name,
    world: basic.world_name,
    job: basic.character_class,
    level: basic.character_level,
    expRate: basic.character_exp_rate != null ? Number(basic.character_exp_rate) : null,
    // 현재 레벨에서 쌓은 경험치 (경험치 % 와 함께 레벨업 필요 경험치를 역산)
    exp: basic.character_exp != null ? Number(basic.character_exp) : null,
    guild: basic.character_guild_name ?? null,
    image: basic.character_image ?? null,
    combatPower: combatPower != null ? Number(combatPower) : null,
    // 종합 능력치 전체 (전투력 공식 검증용)
    stat: Object.fromEntries((stat.final_stat ?? []).map((s) => [s.stat_name, s.stat_value])),
    equipment: (equip.item_equipment ?? []).map(toEquipment),
  };
}

async function main() {
  const characters = JSON.parse(await readFile(new URL('characters.json', DATA_DIR), 'utf8'));
  const targets = characters.filter((c) => !c.excludeFromUnion);
  const result = { fetchedAt: new Date().toISOString(), union: null, characters: {}, errors: {} };

  let failedInRow = 0;
  for (const c of targets) {
    try {
      result.characters[c.id] = await fetchCharacter(c.name);
      failedInRow = 0;
      console.log(`[nexon] ${c.name}: Lv.${result.characters[c.id].level}`);
    } catch (e) {
      // 키가 잘못됐거나 네트워크가 안 되면 더 호출해도 소용없다
      if (e.code === 'OPENAPI00005' || e.code === 'OPENAPI00006' || ++failedInRow >= 5) throw e;
      result.errors[c.id] = e.message;
      console.warn(`[nexon] ${c.name}: ${e.message}`);
    }
  }

  const mainChar = targets.find((c) => c.isMain && result.characters[c.id]);
  if (mainChar) {
    await mkdir(DETAIL_DIR, { recursive: true });
    const ocid = result.characters[mainChar.id].ocid;
    const detail = { fetchedAt: result.fetchedAt, character: mainChar.id };
    for (const path of DETAIL_ENDPOINTS) {
      try {
        detail[path] = await call(path, { ocid });
      } catch (e) {
        detail[path] = { error: e.message };
        console.warn(`[nexon] ${mainChar.name} ${path}: ${e.message}`);
      }
    }
    await writeFile(new URL(`${encodeURIComponent(mainChar.id)}.json`, DETAIL_DIR), JSON.stringify(detail, null, 2) + '\n');

    try {
      const u = await call('user/union', { ocid: result.characters[mainChar.id].ocid });
      result.union = { level: u.union_level, grade: u.union_grade };
    } catch (e) {
      console.warn(`[nexon] 유니온: ${e.message}`);
    }
  }

  const ok = Object.keys(result.characters).length;
  if (ok === 0) throw new Error('받아온 캐릭터가 없음');
  await writeFile(new URL('nexon.json', DATA_DIR), JSON.stringify(result, null, 2) + '\n');
  console.log(`[nexon] 완료: ${ok}명 성공, ${Object.keys(result.errors).length}명 실패`);
}

main().catch((e) => {
  console.warn(`::warning::넥슨 API 갱신 실패, 기존 데이터로 빌드: ${e.message}`);
  process.exit(0);
});
