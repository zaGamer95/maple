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
// 캐릭터별 장비 프리셋 (사이트가 장비 탭을 열 때 불러옴)
const EQUIP_DIR = new URL('../public/equip/', import.meta.url);
const DETAIL_ENDPOINTS = [
  'character/stat',
  'character/item-equipment',
  'character/cashitem-equipment',
  'character/beauty-equipment',
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

/** 옵션 객체에서 0 이 아닌 값만 숫자로 남긴다 (툴팁용, 용량 절약) */
const nonZero = (opt) =>
  Object.fromEntries(
    Object.entries(opt ?? {})
      .map(([k, v]) => [k, Number(v)])
      .filter(([, v]) => v),
  );

function toEquipment(item) {
  return {
    slot: item.item_equipment_slot ?? item.equipment_slot ?? item.item_equipment_part,
    part: item.item_equipment_part,
    name: item.item_name,
    icon: item.item_icon,
    // 인게임 장비창은 외형(신비의 모루) 아이콘으로 보인다
    shapeName: item.item_shape_name && item.item_shape_name !== item.item_name ? item.item_shape_name : null,
    shapeIcon: item.item_shape_icon && item.item_shape_icon !== item.item_icon ? item.item_shape_icon : null,
    total: nonZero(item.item_total_option),
    flame: nonZero(item.item_add_option),
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
  const setEffect = await call('character/set-effect', { ocid }).catch(() => null);
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
    // 캐릭터 생성일 ("2019-07-18T00:00+09:00" → "2019-07-18")
    createdAt: basic.character_date_create?.slice(0, 10) ?? null,
    image: basic.character_image ?? null,
    combatPower: combatPower != null ? Number(combatPower) : null,
    // 종합 능력치 전체 (전투력 공식 검증용)
    stat: Object.fromEntries((stat.final_stat ?? []).map((s) => [s.stat_name, s.stat_value])),
    equipment: (equip.item_equipment ?? []).map(toEquipment),
    sets: (setEffect?.set_effect ?? [])
      .filter((st) => st.set_effect_info?.length)
      .map((st) => ({
        name: st.set_name,
        count: st.total_set_count,
        effects: st.set_effect_info.map((e) => `${e.set_count}세트: ${e.set_option.replace(/\s+/g, ' ')}`),
      })),
    // 프리셋 1~3 은 크기가 커서 public/equip/<id>.json 으로 따로 저장한다 (main 에서 꺼냄)
    _presets: {
      preset: equip.preset_no ?? null,
      presets: [1, 2, 3].map((n) => (equip[`item_equipment_preset_${n}`] ?? []).map(toEquipment)),
    },
  };
}

/**
 * 엔젤릭버스터(일반/드레스 업)·제로(알파/베타)처럼 외형이 두 가지인 캐릭터의 이미지를 모드별로 모은다.
 * character_image 는 지금 모드의 모습만 주므로, 본 적 있는 모드의 이미지를 src/data/looks.json 에 쌓아 둔다.
 * 다른 모드 이미지가 없으면 한 번만 과거 날짜를 한 달 간격으로 훑어 그 모드였던 날의 이미지를 찾는다.
 */
async function updateLooks(id, ocid, image, cash) {
  if (cash?.character_look_mode == null) return;
  const file = new URL('looks.json', DATA_DIR);
  const looks = JSON.parse(await readFile(file, 'utf8').catch(() => '{}'));
  const entry = (looks[id] ??= { modes: {} });
  const mode = String(cash.character_look_mode);
  const today = kstToday();
  entry.modes[mode] = { image, date: today };
  const other = mode === '0' ? '1' : '0';
  if (!entry.modes[other] && !entry.searched) {
    for (let d = addDays(today, -1); d >= '2023-12-21'; d = addDays(d, -30)) {
      try {
        const past = await call('character/cashitem-equipment', { ocid, date: d });
        if (String(past.character_look_mode) !== other) continue;
        const basic = await call('character/basic', { ocid, date: d });
        entry.modes[other] = { image: basic.character_image, date: d };
        break;
      } catch (e) {
        console.warn(`[nexon] 외형 기록 ${d}: ${e.message}`);
        break;
      }
    }
    entry.searched = true;
  }
  await writeFile(file, JSON.stringify(looks, null, 2) + '\n');
}

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function main() {
  const characters = JSON.parse(await readFile(new URL('characters.json', DATA_DIR), 'utf8'));
  const targets = characters.filter((c) => !c.excludeFromUnion);
  const result = { fetchedAt: new Date().toISOString(), union: null, characters: {}, errors: {} };

  let failedInRow = 0;
  for (const c of targets) {
    try {
      const { _presets, ...character } = await fetchCharacter(c.name);
      result.characters[c.id] = character;
      await mkdir(EQUIP_DIR, { recursive: true });
      await writeFile(new URL(`${c.id}.json`, EQUIP_DIR), JSON.stringify(_presets) + '\n');
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
    await updateLooks(mainChar.id, ocid, result.characters[mainChar.id].image, detail['character/cashitem-equipment']);

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
