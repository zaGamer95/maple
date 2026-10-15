export type Check = 'yes' | 'partial' | 'no' | null;

export interface Character {
  id: string;
  name: string;
  jobGroup: string | null;
  job: string | null;
  unionEffect: string | null;
  linkEffect: string | null;
  /** 육성 계획 (제로백, 버닝, 유챔 후보 …) */
  plan: string | null;
  level: number | null;
  note: string | null;
  guild: string | null;
  boss: { karut: Check; stoneDesire: Check; lucidWillSlime: Check };
  unionPower: number | null;
  isMain: boolean;
  excludeFromUnion: boolean;
  /** 부위 → 자유 텍스트 (예: "10성 9/0") */
  equip: Record<string, string>;
}

export interface TargetSlot {
  group: string | null;
  slot: string;
  starforce: string | null;
  mainPot: string | null;
  addPot: string | null;
  flame: string | null;
  scroll: string | null;
  budget: string | null;
  note: string | null;
}

export interface TargetSetup {
  characterId: string;
  title: string;
  slots: TargetSlot[];
  note: string;
}

export interface Purchase {
  id: string;
  /** YYYY-MM-DD, 일자를 모르면 YYYY-MM */
  date: string | null;
  dateText: string;
  itemName: string;
  detail: string | null;
  /** 메소 */
  price: number | null;
  priceText: string | null;
  comment: string | null;
  characterId: string | null;
  /** 없으면 구매 */
  type?: 'buy' | 'sell';
  /** 판매 수수료율 (기본 5%) */
  feeRate?: number;
}

export interface PriceQuote {
  item: string;
  bundleSize: number;
  /** YYYY-MM-DD */
  date: string;
  price: number;
  /** meso: 세트 전체 메소 가격, won_per_eok: 1억 메소당 원화 */
  unit: 'meso' | 'won_per_eok';
}

export interface Todo {
  id: string;
  text: string;
  note: string | null;
  done: boolean;
}

/** scripts/fetch_nexon.mjs 가 만드는 넥슨 Open API 데이터 */
export interface NexonEquipment {
  slot: string;
  part: string;
  name: string;
  icon: string;
  starforce: number;
  scrollUpgrade: number;
  potentialGrade: string | null;
  potential: string[];
  additionalGrade: string | null;
  additional: string[];
}

export interface NexonCharacter {
  ocid: string;
  name: string;
  world: string;
  job: string;
  level: number;
  expRate: number | null;
  guild: string | null;
  image: string | null;
  combatPower: number | null;
  /** 종합 능력치 (스탯 이름 → 값) */
  stat?: Record<string, string>;
  equipment: NexonEquipment[];
}

export interface NexonData {
  fetchedAt: string | null;
  union: { level: number; grade: string } | null;
  characters: Record<string, NexonCharacter>;
  errors: Record<string, string>;
}

/** scripts/fetch_history.mjs 가 만드는 장비별 강화 기록 요약 */
export interface HistoryItem {
  character: string;
  item: string;
  level?: number | null;
  starforce: {
    attempts: number;
    success: number;
    fail: number;
    destroy: number;
    maxStar: number;
    last: string | null;
    /** 계산한 소비 메소 */
    meso?: number;
    /** 장비 레벨을 몰라 비용을 계산하지 못한 시도 수 */
    mesoUnknown?: number;
  };
  cube: { uses: number; gradeUps: number; byKind: Record<string, number>; last: string | null };
  potential: { uses: number; gradeUps: number; last: string | null; meso?: number; mesoUnknown?: number };
}

export interface HistorySummary {
  updatedAt: string | null;
  characters: string[];
  state: Record<string, { firstDate?: string | null; lastDate: string | null; error: string | null }>;
  items: HistoryItem[];
}
