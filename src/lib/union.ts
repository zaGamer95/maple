import type { Character } from '../types';

export const UNION_SLOTS = 42;

/** 유니온 레벨 = 유니온에 포함되는 캐릭터 중 상위 42캐릭 레벨 합 */
export function unionLevel(characters: Character[]): number {
  return characters
    .filter((c) => !c.excludeFromUnion)
    .map((c) => c.level ?? 0)
    .sort((a, b) => b - a)
    .slice(0, UNION_SLOTS)
    .reduce((sum, lv) => sum + lv, 0);
}

export function levelTotal(characters: Character[]): number {
  return characters
    .filter((c) => !c.excludeFromUnion)
    .reduce((sum, c) => sum + (c.level ?? 0), 0);
}
