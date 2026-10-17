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

/** "1530조 3369억", "1만 9020", "9939억 8020만", "19020" → 숫자. 해석할 수 없으면 null */
export function parseKoreanNumber(text: string): number | null {
  const s = text.replace(/[,\s]/g, '');
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = s.match(/^(?:([\d.]+)조)?(?:([\d.]+)억)?(?:([\d.]+)만)?(\d+)?$/);
  if (!m || !(m[1] || m[2] || m[3])) return null;
  const n = (v?: string) => (v ? Number(v) : 0);
  return Math.round(n(m[1]) * 1e12 + n(m[2]) * 1e8 + n(m[3]) * 1e4 + n(m[4]));
}

/** 큰 수 → "1530조 3369억", "2억 7610만", "1만 9020" (위 두 단위까지) */
export function formatKoreanNumber(n: number | null | undefined): string {
  if (n == null) return '-';
  const units: [number, string][] = [
    [1e12, '조'],
    [1e8, '억'],
    [1e4, '만'],
    [1, ''],
  ];
  let rest = Math.round(n);
  const parts: string[] = [];
  for (const [u, label] of units) {
    const q = Math.floor(rest / u);
    if (q > 0) parts.push(`${q.toLocaleString()}${label}`);
    rest -= q * u;
    if (parts.length === 2) break;
  }
  return parts.join(' ') || '0';
}

export const DEFAULT_FEE_RATE = 0.05;

/** 오늘 (KST) YYYY-MM-DD */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}
