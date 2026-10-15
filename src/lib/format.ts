import type { Check } from '../types';

const EOK = 100_000_000;
const MAN = 10_000;

/** 메소 → "155억", "4억 3000만" */
export function formatMeso(meso: number | null | undefined): string {
  if (meso == null) return '-';
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
