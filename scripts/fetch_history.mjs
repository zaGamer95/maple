// 넥슨 Open API 의 스타포스·큐브·잠재 재설정 기록을 하루치씩 받아 쌓는다.
//
// 사용법: NEXON_API_KEY=... node scripts/fetch_history.mjs
//   HISTORY_BUDGET     이번 실행에서 쓸 최대 호출 수 (기본 600, 개발 키 하루 한도 1000)
//   HISTORY_CHARACTERS 기록을 남길 캐릭터, 쉼표 구분 (기본 "자그3")
//
// - API 키를 발급한 계정의 기록만 조회된다.
// - 오늘 기록은 아직 쌓이는 중이라 어제까지만 받는다. 이미 받은 날짜는 다시 받지 않는다.
// - 원본은 data/history/*.json (사이트에 넣지 않음), 장비별 요약은 src/data/historySummary.json.
// - 어떤 경우에도 0 으로 끝나 배포를 막지 않는다.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const API = 'https://open.api.nexon.com/maplestory/v1/history';
const RAW_DIR = new URL('../data/history/', import.meta.url);
const SUMMARY_FILE = new URL('../src/data/historySummary.json', import.meta.url);
const REQUEST_INTERVAL_MS = 250;

// 넥슨이 기록을 제공하기 시작한 날
const TYPES = {
  starforce: { start: '2023-12-27', list: 'starforce_history' },
  cube: { start: '2023-12-27', list: 'cube_history' },
  potential: { start: '2024-01-25', list: 'potential_history' },
};

const key = process.env.NEXON_API_KEY;
let budget = Number(process.env.HISTORY_BUDGET ?? 600);
const characters = new Set((process.env.HISTORY_CHARACTERS ?? '자그3').split(',').map((s) => s.trim()));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

class ApiError extends Error {
  constructor(status, body) {
    super(`${status} ${body?.error?.name ?? ''} ${body?.error?.message ?? ''}`.trim());
    this.code = body?.error?.name;
  }
}

async function call(type, params) {
  const url = new URL(`${API}/${type}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (budget <= 0) throw new Error('budget');
    const wait = lastRequest + REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    budget--;
    const res = await fetch(url, { headers: { 'x-nxopen-api-key': key } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body);
    return body;
  }
  throw new Error(`${type}: 재시도 초과`);
}

/** KST 기준 어제 날짜 */
function yesterdayKst() {
  const kst = new Date(Date.now() + 9 * 3600_000);
  kst.setUTCDate(kst.getUTCDate() - 1);
  return kst.toISOString().slice(0, 10);
}

function nextDay(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch {
    return fallback;
  }
}

const options = (list) => (list ?? []).map((o) => o.value);

function compact(type, r) {
  const base = { id: r.id, date: r.date_create, character: r.character_name, item: r.target_item };
  if (type === 'starforce') {
    return {
      ...base,
      before: r.before_starforce_count,
      after: r.after_starforce_count,
      result: r.item_upgrade_result,
      starcatch: r.starcatch_result,
      destroyDefence: r.destroy_defence,
      chanceTime: r.chance_time,
    };
  }
  return {
    ...base,
    kind: r.cube_type ?? r.potential_type ?? null,
    result: r.item_upgrade_result,
    grade: r.potential_option_grade,
    additionalGrade: r.additional_potential_option_grade,
    guarantee: r.upgrade_guarantee ?? null,
    after: options(r.after_potential_option),
    afterAdditional: options(r.after_additional_potential_option),
  };
}

/** 하루치 기록 (cursor 로 다음 페이지까지) */
async function fetchDay(type, date) {
  const rows = [];
  let body = await call(type, { count: 1000, date });
  for (;;) {
    rows.push(...(body[TYPES[type].list] ?? []));
    if (!body.next_cursor) return rows;
    body = await call(type, { count: 1000, cursor: body.next_cursor });
  }
}

function summarize(raw) {
  // "캐릭터|아이템" 별 집계
  const items = {};
  const entry = (r) =>
    (items[`${r.character}|${r.item}`] ??= {
      character: r.character,
      item: r.item,
      starforce: { attempts: 0, success: 0, fail: 0, destroy: 0, maxStar: 0, last: null },
      cube: { uses: 0, gradeUps: 0, byKind: {}, last: null },
      potential: { uses: 0, gradeUps: 0, last: null },
    });
  for (const r of raw.starforce) {
    const s = entry(r).starforce;
    s.attempts++;
    if (r.result?.includes('파괴')) s.destroy++;
    else if (r.result?.includes('성공')) s.success++;
    else s.fail++;
    s.maxStar = Math.max(s.maxStar, r.after ?? 0);
    if (!s.last || r.date > s.last) s.last = r.date;
  }
  for (const type of ['cube', 'potential']) {
    for (const r of raw[type]) {
      const s = entry(r)[type];
      s.uses++;
      if (r.result?.includes('상승')) s.gradeUps++;
      if (type === 'cube' && r.kind) s.byKind[r.kind] = (s.byKind[r.kind] ?? 0) + 1;
      if (!s.last || r.date > s.last) s.last = r.date;
    }
  }
  return Object.values(items).sort((a, b) => a.character.localeCompare(b.character) || a.item.localeCompare(b.item));
}

async function main() {
  if (!key) {
    console.warn('[history] NEXON_API_KEY 가 없어 건너뜀');
    return;
  }
  await mkdir(RAW_DIR, { recursive: true });
  const state = await readJson(new URL('state.json', RAW_DIR), {});
  const raw = {};
  const until = yesterdayKst();

  // 남은 호출 수를 기록 종류마다 고르게 나눈다 (앞 종류가 다 쓰지 않으면 다음으로 넘어감)
  const entries = Object.entries(TYPES);
  let pool = budget;
  for (const [i, [type, def]] of entries.entries()) {
    const share = Math.floor(pool / (entries.length - i));
    budget = share;
    raw[type] = await readJson(new URL(`${type}.json`, RAW_DIR), []);
    const st = (state[type] ??= { lastDate: null, error: null });
    const seen = new Set(raw[type].map((r) => r.id));
    let date = st.lastDate ? nextDay(st.lastDate) : def.start;
    let days = 0;
    let added = 0;
    try {
      while (date <= until) {
        const rows = await fetchDay(type, date);
        for (const r of rows) {
          if (!characters.has(r.character_name) || seen.has(r.id)) continue;
          seen.add(r.id);
          raw[type].push(compact(type, r));
          added++;
        }
        st.lastDate = date;
        st.error = null;
        days++;
        date = nextDay(date);
      }
    } catch (e) {
      if (e.message !== 'budget') {
        st.error = e.message;
        console.warn(`::warning::[history] ${type} ${date}: ${e.message}`);
      }
    }
    raw[type].sort((a, b) => a.date.localeCompare(b.date));
    pool -= share - budget;
    console.log(`[history] ${type}: ${days}일치 조회, ${added}건 추가, ${st.lastDate ?? '-'} 까지 받음 (${share - budget}회 호출)`);
    await writeFile(new URL(`${type}.json`, RAW_DIR), JSON.stringify(raw[type]) + '\n');
  }

  await writeFile(new URL('state.json', RAW_DIR), JSON.stringify(state, null, 2) + '\n');
  const summary = { updatedAt: new Date().toISOString(), characters: [...characters], state, items: summarize(raw) };
  await writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2) + '\n');
}

main().catch((e) => console.warn(`::warning::[history] 실패: ${e.message}`));
