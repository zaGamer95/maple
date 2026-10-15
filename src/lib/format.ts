import type { Check } from '../types';

const EOK = 100_000_000;
const MAN = 10_000;

/** 메소 → "155억", "4억 3000만" */
export function formatMeso(meso: number | null | undefined): string {
  if (meso == null) return '-';
  if (meso === 0) return '0';
  const eok = Math.floor(meso / EOK);
  const man = Math.round((meso % EOK) / MAN);
  if (eok === 0) return `${man.toLocaleString()}만`;
  if (man === 0) return `${eok.toLocaleString()}억`;
  return `${eok.toLocaleString()}억 ${man.toLocaleString()}만`;
}

export function formatNumber(n: number | null | undefined): string {
  return n == null ? '-' : n.toLocaleString();
}

export const CHECK_LABEL: Record<Exclude<Check, null>, string> = {
  yes: 'O',
  partial: '△',
  no: 'X',
};

export function formatCheck(c: Check): string {
  return c ? CHECK_LABEL[c] : '';
}

/**
 * "155억", "4억 3000만", "3500만", "1.5" (억) → 메소. 해석할 수 없으면 null.
 * 단위 없는 숫자는 억으로 본다.
 */
export function parseMeso(text: string): number | null {
  const s = text.replace(/[,\s]/g, '');
  if (!s) return null;
  const m = s.match(/^(?:([\d.]+)억)?(?:([\d.]+)만)?$/);
  if (m && (m[1] || m[2])) {
    const eok = m[1] ? Number(m[1]) : 0;
    const man = m[2] ? Number(m[2]) : 0;
    if (Number.isNaN(eok) || Number.isNaN(man)) return null;
    return Math.round(eok * EOK + man * MAN);
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * EOK) : null;
}

export const DEFAULT_FEE_RATE = 0.05;

/** 오늘 (KST) YYYY-MM-DD */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}
