// 본캐의 날짜별 레벨·경험치를 넥슨 API(character/basic?date=)로 받아 쌓는다.
//
// 사용법: NEXON_API_KEY=... node scripts/fetch_exp.mjs
//   EXP_DAYS  처음 받을 때 며칠 전부터 받을지 (기본 365)
//
// - 원본: data/history/exp.json, 사이트용: src/data/expHistory.json
// - 이미 받은 날짜는 다시 받지 않는다. 어떤 경우에도 0 으로 끝난다.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const API = 'https://open.api.nexon.com/maplestory/v1';
const RAW = new URL('../data/history/exp.json', import.meta.url);
const OUT = new URL('../src/data/expHistory.json', import.meta.url);
const NEXON = new URL('../src/data/nexon.json', import.meta.url);
const CHARACTERS = new URL('../src/data/characters.json', import.meta.url);
// 넥슨이 캐릭터 일별 데이터를 제공하기 시작한 날
const API_START = '2023-12-21';

const key = process.env.NEXON_API_KEY;
const days = Number(process.env.EXP_DAYS ?? 365);
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

const kstDate = (offsetDays) => {
  const d = new Date(Date.now() + 9 * 3600_000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const point = (b) => ({ level: b.character_level, exp: Number(b.character_exp), rate: Number(b.character_exp_rate) });

/** 레벨별 필요 경험치 = 경험치 ÷ 경험치 % (경험치 % 가 1% 이상인 기록으로 역산, 가장 정밀한 값 사용) */
function requiredByLevel(points) {
  const best = {};
  for (const p of points) {
    if (!(p.rate >= 1)) continue;
    if (!best[p.level] || p.rate > best[p.level].rate) best[p.level] = p;
  }
  return Object.fromEntries(Object.entries(best).map(([lv, p]) => [lv, Math.round(p.exp / (p.rate / 100))]));
}

async function main() {
  const characters = await readJson(CHARACTERS, []);
  const nexon = await readJson(NEXON, {});
  const mainChar = characters.find((c) => c.isMain);
  const ocid = mainChar && nexon.characters?.[mainChar.id]?.ocid;
  const raw = await readJson(RAW, { character: mainChar?.id ?? null, points: {} });

  if (key && ocid) {
    const from = [kstDate(-days), API_START].sort().pop();
    const until = kstDate(-1);
    let fetched = 0;
    try {
      for (let d = from; d <= until; d = new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
        if (raw.points[d]) continue;
        raw.points[d] = point(await call('character/basic', { ocid, date: d }));
        fetched++;
      }
      // 오늘은 아직 쌓이는 중이라 날짜 없이 받은 최신 값으로 둔다
      raw.latest = { fetchedAt: new Date().toISOString(), ...point(await call('character/basic', { ocid })) };
    } catch (e) {
      console.warn(`::warning::[exp] ${e.message}`);
    }
    raw.character = mainChar.id;
    await mkdir(new URL('.', RAW), { recursive: true });
    await writeFile(RAW, JSON.stringify(raw, null, 1) + '\n');
    console.log(`[exp] ${mainChar.id}: ${fetched}일치 새로 받음, 총 ${Object.keys(raw.points).length}일`);
  } else {
    console.warn('[exp] 키 또는 본캐 ocid 가 없어 저장된 기록으로만 만듦');
  }

  const points = Object.entries(raw.points)
    .map(([date, p]) => ({ date, ...p }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const all = raw.latest ? [...points, raw.latest] : points;
  await writeFile(
    OUT,
    JSON.stringify({ character: raw.character, latest: raw.latest ?? null, required: requiredByLevel(all), points }, null, 1) + '\n',
  );
}

main().catch((e) => console.warn(`::warning::[exp] 실패: ${e.message}`));
