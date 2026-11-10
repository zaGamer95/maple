/**
 * 유니온 캐릭터 효과 (B/A/S/SS/SSS). 출처: 메이플스토리 공식 게임정보 "메이플 유니온" (2026-11 확인).
 * 공격대 배치와 상관없이 B등급 이상이면 적용된다. 같은 직업이 여럿이면 1개만 적용.
 * 키는 넥슨 API 직업명.
 */
const STR = (v: number) => `STR +${v}`;
const DEX = (v: number) => `DEX +${v}`;
const INT = (v: number) => `INT +${v}`;
const LUK = (v: number) => `LUK +${v}`;
const MAIN = [10, 20, 40, 80, 100];
const STEP5 = [1, 2, 3, 4, 5];
const STEP6 = [2, 3, 4, 5, 6];
const HIGH6 = [1, 2, 3, 5, 6];

type Effect = { values: number[]; text: (v: number, i: number) => string };

const EFFECTS: Record<string, Effect> = {
  히어로: { values: MAIN, text: STR },
  팔라딘: { values: MAIN, text: STR },
  다크나이트: { values: STEP6, text: (v) => `최대 HP +${v}%` },
  '아크메이지(불,독)': { values: STEP6, text: (v) => `최대 MP +${v}%` },
  '아크메이지(썬,콜)': { values: MAIN, text: INT },
  비숍: { values: MAIN, text: INT },
  보우마스터: { values: MAIN, text: DEX },
  신궁: { values: STEP5, text: (v) => `크리티컬 확률 +${v}%` },
  패스파인더: { values: MAIN, text: DEX },
  나이트로드: { values: STEP5, text: (v) => `크리티컬 확률 +${v}%` },
  섀도어: { values: MAIN, text: LUK },
  듀얼블레이더: { values: MAIN, text: LUK },
  바이퍼: { values: MAIN, text: STR },
  캡틴: { values: [4, 6, 8, 10, 12], text: (v) => `소환수 지속 시간 +${v}%` },
  캐논마스터: { values: MAIN, text: STR },
  블래스터: { values: HIGH6, text: (v) => `방어율 무시 +${v}%` },
  배틀메이지: { values: MAIN, text: INT },
  와일드헌터: { values: [4, 8, 12, 16, 20], text: (v) => `공격 시 20% 확률로 데미지 +${v}%` },
  메카닉: { values: [5, 10, 15, 20, 25], text: (v) => `버프 지속 시간 +${v}%` },
  제논: { values: [5, 10, 20, 40, 50], text: (v) => `STR·DEX·LUK +${v}` },
  데몬슬레이어: { values: STEP5, text: (v) => `상태이상 저항 +${v}` },
  데몬어벤져: { values: HIGH6, text: (v) => `보스 몬스터 공격 시 데미지 +${v}%` },
  아란: { values: [2, 4, 6, 8, 10], text: (v) => `타격 시 70% 확률로 최대 HP ${v}% 회복` },
  에반: { values: [2, 4, 6, 8, 10], text: (v) => `타격 시 70% 확률로 최대 MP ${v}% 회복` },
  루미너스: { values: MAIN, text: INT },
  메르세데스: { values: STEP6, text: (v) => `스킬 재사용 대기시간 -${v}%` },
  팬텀: { values: STEP5, text: (v) => `메소 획득량 +${v}%` },
  은월: { values: HIGH6, text: (v) => `크리티컬 데미지 +${v}%` },
  소울마스터: { values: [250, 500, 1000, 2000, 2500], text: (v) => `최대 HP +${v}` },
  미하일: { values: [250, 500, 1000, 2000, 2500], text: (v) => `최대 HP +${v}` },
  플레임위자드: { values: MAIN, text: INT },
  윈드브레이커: { values: MAIN, text: DEX },
  나이트워커: { values: MAIN, text: LUK },
  스트라이커: { values: MAIN, text: STR },
  카이저: { values: MAIN, text: STR },
  카인: { values: MAIN, text: DEX },
  엔젤릭버스터: { values: MAIN, text: DEX },
  카데나: { values: MAIN, text: LUK },
  제로: { values: [4, 6, 8, 10, 12], text: (v) => `경험치 획득량 +${v}%` },
  키네시스: { values: MAIN, text: INT },
  아델: { values: MAIN, text: STR },
  일리움: { values: MAIN, text: INT },
  아크: { values: MAIN, text: STR },
  칼리: { values: MAIN, text: LUK },
  호영: { values: MAIN, text: LUK },
  라라: { values: MAIN, text: INT },
  렌: { values: [2, 4, 6, 8, 10], text: (v) => `이동속도·최대 이동속도 +${v}` },
  레테: { values: [10, 20, 30, 40, 50], text: (v, i) => `올스탯 +${v}, 최대 HP +${[500, 1000, 1500, 2000, 2500][i]}` },
};

const GRADES = ['B', 'A', 'S', 'SS', 'SSS'];

/** 레벨 → 등급 칸 (B=0 … SSS=4), B 미만이면 -1. 제로는 130/160/180/200/250 */
function gradeIndex(job: string, level: number): number {
  const cuts = job === '제로' ? [130, 160, 180, 200, 250] : [60, 100, 140, 200, 250];
  let i = -1;
  cuts.forEach((c, k) => {
    if (level >= c) i = k;
  });
  return i;
}

export function unionEffect(job: string | null | undefined, level: number | null | undefined): { grade: string; text: string } | null {
  if (!job || !level) return null;
  const e = EFFECTS[job];
  const i = gradeIndex(job, level);
  if (!e || i < 0) return null;
  return { grade: GRADES[i], text: e.text(e.values[i], i) };
}

/** 캐릭터 목록·상세에서 쓰는 유니온 효과 문구. 넥슨 직업명이 없으면 시트에 적힌 값 */
export function unionEffectLabel(apiJob: string | null | undefined, level: number | null | undefined, sheet: string | null): string | null {
  const e = unionEffect(apiJob, level);
  return e ? `${e.text} (${e.grade})` : sheet;
}

/** 링크 스킬 문구: "이름 Lv.n" 과 효과 (줄바꿈은 " / ") */
export function linkSkillLabel(
  link: { name: string; level: number; effect: string | null } | null | undefined,
  sheet: string | null,
): { title: string; effect: string | null } | null {
  if (!link) return sheet ? { title: sheet, effect: null } : null;
  return { title: `${link.name} Lv.${link.level}`, effect: link.effect ? link.effect.replace(/\s*\n\s*/g, ' / ') : null };
}
