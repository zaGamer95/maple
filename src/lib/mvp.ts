/**
 * MVP작 계산: 현금 → 캐시템 → 경매장(메소) → 메소 현금화 순환에서 손실이 가장 적은 구매 조합을 찾는다.
 *
 * 회수율 = 경매장 판매가(억) × (1 − 경매장 수수료) × 메소 현금 시세(원/억) × (1 − 현금화 수수료) ÷ 캐시 가격
 * 기준선(메포) = 메소 현금 시세 ÷ 메소마켓 가격(포인트/억) × (1 − 현금화 수수료). 바로 끝나지만 손실이 크다.
 */

export interface MvpItem {
  id: string;
  name: string;
  /** 한 번 사서 한 번 올리는 단위의 캐시 가격 (MVP 실적에 들어가는 금액) */
  cash: number;
  /** 경매장 판매가 (억 메소, 한 건 기준). 비우면 계산에서 뺀다 */
  price: number | null;
  /** 살 수 있는 최대 개수 (마일리지 한도 등). 비우면 제한 없음 */
  maxQty: number | null;
  /** 한 건이 팔리는 데 걸리는 대략적인 시간 (시간 단위, 참고용) */
  hours: number | null;
  note?: string;
}

export interface MvpSettings {
  /** 이번에 채울 캐시 금액 */
  target: number;
  /** 메소 현금 시세 (원 / 1억 메소) */
  wonPerEok: number;
  /** 메소마켓 가격 (메이플포인트 / 1억 메소) */
  mesoMarket: number;
  /** 경매장 판매 수수료 (0.03 = 3%) */
  auctionFee: number;
  /** 메소를 현금화할 때 내가 부담하는 수수료 (경매장 약속 거래 등) */
  cashoutFee: number;
  /** 판매 1건당 수고비 (원). 클수록 건수가 적은 조합을 고른다 */
  effortPerListing: number;
}

export const DEFAULT_SETTINGS: MvpSettings = {
  target: 227_610,
  wonPerEok: 1450,
  mesoMarket: 2246,
  auctionFee: 0.03,
  cashoutFee: 0,
  effortPerListing: 300,
};

/** 캐시 가격은 maple-mvp.com 계산기와 커뮤니티 글 기준. 캐시샵에서 한 번 확인하고 쓴다 */
export const DEFAULT_ITEMS: MvpItem[] = [
  { id: 'karma', name: '플래티넘 카르마의 가위', cash: 5900, price: null, maxQty: null, hours: null },
  {
    id: 'karma-mileage',
    name: '플래티넘 카르마의 가위 (마일리지 1770 사용)',
    cash: 4130,
    price: null,
    maxQty: null,
    hours: null,
    note: '마일리지 부분은 MVP 실적에 안 들어가서 캐시 4130만 센다. 최대 개수 = 보유 마일리지 ÷ 1770',
  },
  { id: 'prism', name: '컬러링 프리즘', cash: 5900, price: null, maxQty: null, hours: null },
  { id: 'prismpro', name: '컬러링 프리즘 프로 (컬프프)', cash: 25000, price: null, maxQty: null, hours: null },
  { id: 'wonder1', name: '위습의 원더베리 1개', cash: 5400, price: null, maxQty: null, hours: null },
  { id: 'wonder11', name: '위습의 원더베리 11개 묶음', cash: 54000, price: null, maxQty: null, hours: null },
  { id: 'royal10', name: '로얄스타일 쿠폰 10개', cash: 22000, price: null, maxQty: null, hours: null },
  {
    id: 'royal45',
    name: '메이플 로얄 스타일 45개',
    cash: 99000,
    price: null,
    maxQty: null,
    hours: null,
    note: '캐시 가격은 1개 2,200 × 45 로 가정. 캐시샵 가격과 다르면 고쳐 쓴다',
  },
  { id: 'hair', name: '프리미엄 헤어 쿠폰', cash: 5500, price: null, maxQty: null, hours: null },
  { id: 'face', name: '프리미엄 성형 쿠폰', cash: 3500, price: null, maxQty: null, hours: null },
  { id: 'luna', name: '루나 크리스탈', cash: 3900, price: null, maxQty: null, hours: null },
  { id: 'additional', name: '추가옵션 전승 스크롤', cash: 49000, price: null, maxQty: null, hours: null },
  { id: 'potential', name: '잠재능력 전승 스크롤', cash: 99000, price: null, maxQty: null, hours: null },
  { id: 'balancedye', name: '밸런스 믹스 염색 쿠폰', cash: 24000, price: null, maxQty: null, hours: null },
  { id: 'customlens', name: '커스텀 믹스 컬러렌즈', cash: 24000, price: null, maxQty: null, hours: null },
];

/** 1억 메소가 최종적으로 돌아오는 현금 (원) */
export const wonPerEokNet = (s: MvpSettings) => s.wonPerEok * (1 - s.cashoutFee);

/** 메포로 바로 메소를 사는 기준선 회수율 */
export const baselineRate = (s: MvpSettings) => wonPerEokNet(s) / s.mesoMarket;

/** 아이템 회수율 (판매가가 없으면 null) */
export function itemRate(it: MvpItem, s: MvpSettings): number | null {
  if (!it.price || !it.cash) return null;
  return (it.price * (1 - s.auctionFee) * wonPerEokNet(s)) / it.cash;
}

/** 메소 1억을 얻는 데 드는 현금 (원/억) */
export function wonPerEokCost(it: MvpItem, s: MvpSettings): number | null {
  if (!it.price || !it.cash) return null;
  return it.cash / (it.price * (1 - s.auctionFee));
}

export interface PlanLine {
  item: MvpItem | null; // null = 메포 (메소마켓)
  qty: number;
  cash: number;
  meso: number;
  recovered: number;
  listings: number;
}

export interface Plan {
  lines: PlanLine[];
  cash: number;
  meso: number;
  recovered: number;
  loss: number;
  listings: number;
}

const UNIT = 100; // 캐시 가격은 100 단위
const MEPO_UNIT = 1000; // 메이플포인트는 1,000원 단위로 산다

/**
 * 목표 금액 이상을 쓰면서 (손실 + 수고비 × 판매 건수)가 가장 작은 조합.
 * 개수 제한이 있는 배낭 문제를 이진 분할로 0/1 배낭으로 풀고, 메포를 1,000원 단위로 채워 넣는다.
 */
export function bestPlan(items: MvpItem[], s: MvpSettings): Plan | null {
  if (!(s.target > 0)) return null;
  const usable = items.filter((it) => itemRate(it, s) != null && it.cash % UNIT === 0 && it.cash > 0);
  const mepoRate = baselineRate(s);
  type Piece = { idx: number; qty: number; size: number; cost: number };
  const pieces: Piece[] = [];
  const maxSize = Math.max(MEPO_UNIT, ...usable.map((it) => it.cash)) / UNIT;
  const T = Math.ceil(s.target / UNIT);
  const N = T + maxSize;
  const pushPieces = (idx: number, size: number, unitCost: number, max: number) => {
    let k = 1;
    let left = max;
    while (left > 0) {
      const q = Math.min(k, left);
      pieces.push({ idx, qty: q, size: size * q, cost: unitCost * q });
      left -= q;
      k *= 2;
    }
  };
  usable.forEach((it, idx) => {
    const rate = itemRate(it, s)!;
    const unitCost = it.cash * (1 - rate) + s.effortPerListing;
    const max = Math.min(it.maxQty ?? Infinity, Math.ceil(N / (it.cash / UNIT)));
    pushPieces(idx, it.cash / UNIT, unitCost, max);
  });
  // 메포: 판매 건수 없음
  pushPieces(-1, MEPO_UNIT / UNIT, MEPO_UNIT * (1 - mepoRate), Math.ceil(N / (MEPO_UNIT / UNIT)));

  const INF = Number.POSITIVE_INFINITY;
  const dp = new Float64Array(N + 1).fill(INF);
  dp[0] = 0;
  const taken: Uint8Array[] = [];
  for (const p of pieces) {
    const t = new Uint8Array(N + 1);
    for (let v = N; v >= p.size; v--) {
      const c = dp[v - p.size] + p.cost;
      if (c < dp[v]) {
        dp[v] = c;
        t[v] = 1;
      }
    }
    taken.push(t);
  }
  let best = -1;
  for (let v = T; v <= N; v++) if (dp[v] < INF && (best < 0 || dp[v] < dp[best])) best = v;
  if (best < 0) return null;

  const qty = new Map<number, number>();
  let v = best;
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (taken[i][v]) {
      qty.set(pieces[i].idx, (qty.get(pieces[i].idx) ?? 0) + pieces[i].qty);
      v -= pieces[i].size;
    }
  }
  const lines: PlanLine[] = [];
  for (const [idx, q] of qty) {
    if (idx === -1) {
      const cash = q * MEPO_UNIT;
      const meso = (cash / s.mesoMarket) * 1e8;
      lines.push({ item: null, qty: q, cash, meso, recovered: cash * mepoRate, listings: 0 });
    } else {
      const it = usable[idx];
      const meso = it.price! * (1 - s.auctionFee) * 1e8 * q;
      lines.push({ item: it, qty: q, cash: it.cash * q, meso, recovered: it.cash * q * itemRate(it, s)!, listings: q });
    }
  }
  lines.sort((a, b) => b.cash - a.cash);
  const sum = (f: (l: PlanLine) => number) => lines.reduce((t, l) => t + f(l), 0);
  const cash = sum((l) => l.cash);
  const recovered = sum((l) => l.recovered);
  return { lines, cash, meso: sum((l) => l.meso), recovered, loss: cash - recovered, listings: sum((l) => l.listings) };
}
