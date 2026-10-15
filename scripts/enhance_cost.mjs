// 스타포스·메소 재설정에 쓴 메소 계산.
// 넥슨 API 기록에는 비용이 없어서 공개된 비용 공식으로 계산한다.

// 2025-03 스타포스 개편(30성 확장, 등급 하락 삭제). 기록상 예전 규칙 마지막 시도 2025-03-02, 새 규칙 첫 시도 2025-03-23.
export const STARFORCE_NEW_RULES_FROM = '2025-03-20';

// 비용 = 100 × round(10 + L³ × (S+1)^2.7 / k)   (0~9성은 L³ × (S+1) / 2500)
// 새 규칙: devcomma 스타포스 계산기 공개 스크립트 기준
const NEW_DIVISOR = { 10: 40000, 11: 22000, 12: 15000, 13: 11000, 14: 7500, 15: 20000, 16: 20000, 17: 15000, 18: 7000, 19: 4500, 20: 20000, 21: 12500 };
// 예전 규칙: 10~14성 /400, 15성 이상 /200 (×100 환산하면 40000 / 20000)
const OLD_DIVISOR = (s) => (s <= 14 ? 40000 : 20000);

export function starforceBaseCost(level, star, newRules) {
  const L = Math.floor(level / 10) * 10;
  if (star <= 9) return 100 * Math.round(10 + (L ** 3 * (star + 1)) / 2500);
  const k = newRules ? (NEW_DIVISOR[star] ?? 20000) : OLD_DIVISOR(star);
  return 100 * Math.round(10 + (L ** 3 * (star + 1) ** 2.7) / k);
}

/**
 * 시도 1회 비용. MVP·PC방 할인(17성 미만)은 계정마다 달라 반영하지 않는다.
 * 파괴 방지: 새 규칙 15~17성 기본 비용의 200% 추가, 예전 규칙 12~16성 100% 추가.
 */
export function starforceAttemptCost(r, level) {
  if (!level) return null;
  if (r.upgradeItem) return 0; // 주문서·특수 재화로 강화
  const newRules = r.date.slice(0, 10) >= STARFORCE_NEW_RULES_FROM;
  const base = starforceBaseCost(level, r.before, newRules);
  let cost = base * (1 - (r.costDiscount ?? 0) / 100);
  if (r.destroyDefence === '파괴 방지 적용') {
    if (newRules && r.before >= 15 && r.before <= 17) cost += 2 * base;
    if (!newRules && r.before >= 12 && r.before <= 16) cost += base;
  }
  return 100 * Math.round(cost / 100);
}

// 메소 재설정 1회 비용 (만 메소). chuchu.gg 큐브 시뮬레이터의 메소 재설정 비용 기준.
const GRADES = ['레어', '에픽', '유니크', '레전드리'];
const RESET_COST = {
  잠재능력: [
    [400, 1600, 3400, 4000],
    [425, 1700, 3612, 4250],
    [450, 1800, 3825, 4500],
    [500, 2000, 4250, 5000],
  ],
  에디셔널: [
    [975, 2730, 6630, 7800],
    [1037, 2905, 7055, 8300],
    [1100, 3080, 7480, 8800],
    [1225, 3430, 8330, 9800],
  ],
};
const levelBand = (level) => (level >= 250 ? 3 : level >= 200 ? 2 : level >= 160 ? 1 : 0);

/** 메소 재설정 1회 비용. 비용은 재설정 전 등급 기준이라, 등급이 오른 시도는 한 단계 아래 등급으로 본다. */
export function potentialResetCost(r, level) {
  if (!level) return null;
  const additional = r.kind?.includes('에디셔널');
  const after = additional ? r.additionalGrade : r.grade;
  let g = GRADES.indexOf(after);
  if (g < 0) return null;
  if (r.result?.includes('상승')) g = Math.max(0, g - 1);
  return RESET_COST[additional ? '에디셔널' : '잠재능력'][levelBand(level)][g] * 10_000;
}

// 기록에 장비 레벨이 없을 때 쓰는 이름 → 레벨 (스타포스 기록에는 레벨이 없다)
const LEVEL_BY_PREFIX = [
  [/^에테르넬/, 250],
  [/^(아케인셰이드|제네시스)/, 200],
  [/^앱솔랩스/, 160],
  [/^(하이네스|이글아이|트릭스터|파프니르)/, 150],
  [/^(여명의 가디언 엔젤 링|에스텔라 이어링)/, 160],
  [/^(트와일라이트 마크|데이브레이크 펜던트)/, 140],
  [/^(커맨더 포스 이어링|거대한 공포)/, 200],
  [/^(루즈 컨트롤 머신 마크|마력이 깃든 안대|고통의 근원)/, 160],
  [/^(골든 클로버 벨트|마이스터)/, 140],
];

/** 아이템 이름 → 레벨. known 은 기록·장착 장비에서 얻은 실제 레벨. */
export function levelResolver(known) {
  return (name) => known.get(name) ?? LEVEL_BY_PREFIX.find(([re]) => re.test(name))?.[1] ?? null;
}
