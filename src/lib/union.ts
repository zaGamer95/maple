import type { Character } from '../types';

/**
 * 공식 가이드(메이플 유니온) 기준
 * - 보유 캐릭터가 42개 이상이면 레벨이 높은 순으로 42개만 누적 레벨에 포함
 * - 제로가 여러 개면 최고 레벨 1개만 합산
 * - 유니온 캐릭터는 60레벨 이상 (제로는 130레벨 이상)
 * - 메이플스토리M 캐릭터는 공격대에 따로 편성되며 누적 레벨에는 들어가지 않는다
 */
export const UNION_SLOTS = 42;

function isEligible(c: Character): boolean {
  if (c.excludeFromUnion) return false;
  return (c.level ?? 0) >= (c.job === '제로' ? 130 : 60);
}

/** 누적 레벨에 들어가는 캐릭터 (레벨 높은 순) */
export function unionMembers(characters: Character[]): Character[] {
  const byLevel = characters.filter(isEligible).sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
  let zeroSeen = false;
  const members = byLevel.filter((c) => {
    if (c.job !== '제로') return true;
    if (zeroSeen) return false;
    zeroSeen = true;
    return true;
  });
  return members.slice(0, UNION_SLOTS);
}

export function unionLevel(characters: Character[]): number {
  return unionMembers(characters).reduce((sum, c) => sum + (c.level ?? 0), 0);
}

/** 참고용: 유니온 포함 여부와 상관없이 모든 캐릭터 레벨 합 */
export function levelTotal(characters: Character[]): number {
  return characters
    .filter((c) => !c.excludeFromUnion)
    .reduce((sum, c) => sum + (c.level ?? 0), 0);
}
