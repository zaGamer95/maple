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
}

export interface Todo {
  id: string;
  text: string;
  note: string | null;
  done: boolean;
}
