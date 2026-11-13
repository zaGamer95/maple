/**
 * 주문의 흔적(주흔) 강화 효율 계산.
 * 실패하면 업그레이드 횟수가 1 줄고, 순백으로 복구한 뒤 같은 슬롯을 다시 시도한다고 본다.
 * 근거: 2026-11-13 인게임 확인 (순백 100% 주흔 20,000개, 아크 이노센트 24,000개, 순백 5% 확률 고정)
 */

export interface TraceSettings {
  /** 경매장 주흔 개당 시세 */
  tracePrice: number;
  /** 경매장 수수료 (0.03) */
  fee: number;
  /** 가진 주흔을 쓰면 팔았을 때 받는 돈(수수료 뺀 값)으로 계산 */
  ownedTraces: boolean;
  /** 썬데이 주흔 강화 비용 반값 */
  sundayHalf: boolean;
  /** 피버 타임 (금~일) +10%p */
  fever: boolean;
  /** 피버 말고 늘 붙는 확률 보너스 (%p): 손재주 10 + 주문서 강화의 달인 4 */
  bonus: number;
  /** 주흔 순백 100% 필요 주흔 */
  whiteTraces: number;
  /** 경매장 순백 5% 개당 가격 (메소, 비우면 제외) */
  white5: number | null;
  /** 경매장 순백 10% 개당 가격 */
  white10: number | null;
  /** 놀긍 1장 가격 */
  nolgeung: number;
  /** 공격력 1 = 주스탯 몇 */
  attToStat: number;
  /** 이번에 성공시킬 작 수 */
  targetSuccess: number;
}

export interface TraceScroll {
  id: string;
  /** 주문서 이름 (예: 15%) */
  name: string;
  /** 기본 성공 확률 (%) */
  base: number;
  /** 1회 주흔 (정가) */
  traces: number | null;
  /** 성공 시 주스탯 */
  stat: number | null;
  /** 성공 시 공격력 */
  att: number | null;
}

export const DEFAULT_TRACE_SETTINGS: TraceSettings = {
  tracePrice: 3300,
  fee: 0.03,
  ownedTraces: true,
  sundayHalf: true,
  fever: true,
  bonus: 14,
  whiteTraces: 20000,
  white5: 1300000,
  white10: 3400000,
  nolgeung: 45000000,
  attToStat: 4,
  targetSuccess: 20,
};

export const DEFAULT_TRACE_SCROLLS: TraceScroll[] = [
  { id: 's15', name: '15%', base: 15, traces: 1560, stat: 10, att: 0 },
  { id: 's30', name: '30%', base: 30, traces: null, stat: null, att: 0 },
  { id: 's70', name: '70%', base: 70, traces: null, stat: null, att: 0 },
  { id: 's100', name: '100%', base: 100, traces: null, stat: null, att: 0 },
];

/** 주흔 1개 값 (메소) */
export function traceValue(s: TraceSettings): number {
  return s.ownedTraces ? s.tracePrice * (1 - s.fee) : s.tracePrice;
}

/** 썬데이 반값 적용한 주흔 개수 */
export function traceCount(n: number, s: TraceSettings): number {
  return s.sundayHalf ? n / 2 : n;
}

export type RestoreId = 'white5' | 'white10' | 'whiteTrace';

export interface Restore {
  id: RestoreId;
  label: string;
  /** 1회 복구 기대 비용 (메소) */
  cost: number;
  /** 1회 복구에 드는 평균 장수 또는 주흔 */
  detail: string;
}

/** 업그레이드 횟수 1회 복구 방법별 기대 비용 (싼 순) */
export function restores(s: TraceSettings): Restore[] {
  const list: Restore[] = [];
  const wt = traceCount(s.whiteTraces, s);
  list.push({ id: 'whiteTrace', label: '주흔 순백 100%', cost: wt * traceValue(s), detail: `주흔 ${wt.toLocaleString()}개` });
  if (s.white5) list.push({ id: 'white5', label: '경매장 순백 5%', cost: s.white5 / 0.05, detail: '평균 20장' });
  if (s.white10) list.push({ id: 'white10', label: '경매장 순백 10%', cost: s.white10 / 0.1, detail: '평균 10장' });
  return list.sort((a, b) => a.cost - b.cost);
}

/** 경매장 순백이 주흔 순백과 같아지는 개당 가격 */
export function breakEven(rate: number, s: TraceSettings): number {
  return traceCount(s.whiteTraces, s) * traceValue(s) * rate;
}

export function successRate(sc: TraceScroll, s: TraceSettings): number {
  return Math.min(1, (sc.base + (s.fever ? 10 : 0) + s.bonus) / 100);
}

export interface ScrollResult {
  rate: number;
  /** 성공 1작에 평균 시도 수 */
  tries: number;
  /** 성공 1작에 평균 실패(복구) 수 */
  fails: number;
  /** 성공 1작에 드는 주흔 (시도분) */
  traces: number;
  /** 성공 1작 기대 비용 (가장 싼 복구 사용) */
  cost: number;
  /** 성공 1작이 주는 주스탯 환산 */
  statEq: number | null;
  /** 주스탯 1당 비용 */
  perStat: number | null;
}

export function scrollResult(sc: TraceScroll, s: TraceSettings, restoreCost: number): ScrollResult | null {
  if (sc.traces == null) return null;
  const rate = successRate(sc, s);
  const tries = 1 / rate;
  const fails = tries - 1;
  const traces = tries * traceCount(sc.traces, s);
  const cost = traces * traceValue(s) + fails * restoreCost;
  const statEq = sc.stat == null ? null : sc.stat + (sc.att ?? 0) * s.attToStat;
  return { rate, tries, fails, traces, cost, statEq, perStat: statEq ? cost / statEq : null };
}

/** 놀긍 1작: 공·주스탯·부스탯이 각각 평균 +1.777 (공식 확률표) */
export const NOLGEUNG_MEAN = 6 * 0.0593 + 4 * 0.0494 + 3 * 0.1387 + 2 * 0.2387 + 1 * 0.3301;

export function nolgeungStatEq(s: TraceSettings): number {
  return NOLGEUNG_MEAN * (1 + s.attToStat);
}

/**
 * 성공 n작을 낼 때 필요한 시도·복구·순백 장수 분포를 몬테카를로로 구한다.
 * 결과는 평균과 90% 지점.
 */
export function simulate(
  rate: number,
  n: number,
  whiteRate: number | null,
  runs = 4000,
): { fails: [number, number]; scrolls: [number, number] | null } {
  if (n <= 0 || rate <= 0) return { fails: [0, 0], scrolls: whiteRate ? [0, 0] : null };
  const failList: number[] = [];
  const scrollList: number[] = [];
  for (let r = 0; r < runs; r++) {
    let fails = 0;
    let scrolls = 0;
    for (let ok = 0; ok < n; ) {
      if (Math.random() < rate) ok++;
      else {
        fails++;
        if (whiteRate) {
          scrolls++;
          while (Math.random() >= whiteRate) scrolls++;
        }
      }
    }
    failList.push(fails);
    scrollList.push(scrolls);
  }
  const stat = (xs: number[]): [number, number] => {
    const sorted = [...xs].sort((a, b) => a - b);
    return [xs.reduce((a, b) => a + b, 0) / xs.length, sorted[Math.floor(xs.length * 0.9)]];
  };
  return { fails: stat(failList), scrolls: whiteRate ? stat(scrollList) : null };
}
