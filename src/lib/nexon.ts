import data from '../data/nexon.json';
import type { NexonData } from '../types';

export const nexon = data as unknown as NexonData;

/** "2026. 10. 16. 오전 6:01" */
export function formatFetchedAt(iso: string | null): string {
  if (!iso) return '아직 받아온 적 없음';
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
}

/** 전투력 → "5억 5,588만" */
export function formatPower(n: number | null | undefined): string {
  if (n == null) return '-';
  const eok = Math.floor(n / 100_000_000);
  const man = Math.floor((n % 100_000_000) / 10_000);
  if (eok === 0) return `${man.toLocaleString()}만`;
  return man ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
}
