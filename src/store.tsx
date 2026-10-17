import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import baseCharacters from './data/characters.json';
import basePurchases from './data/purchases.json';
import basePrices from './data/prices.json';
import baseHunts from './data/hunts.json';
import baseExpNotes from './data/expNotes.json';
import { nexon } from './lib/nexon';
import type { Character, ExpNote, HuntLog, PriceQuote, Purchase } from './types';

/**
 * 데이터의 원본은 저장소의 src/data/*.json 이다.
 * 웹에서 수정한 내용은 이 브라우저의 localStorage 에만 임시로 저장되고,
 * "JSON 내보내기"로 받은 파일을 src/data 에 덮어써 커밋해야 다른 사람(공유 링크)에게도 반영된다.
 */
const DATASETS = {
  characters: { key: 'maple:characters:draft:v1', base: baseCharacters as Character[] },
  purchases: { key: 'maple:purchases:draft:v1', base: basePurchases as Purchase[] },
  prices: { key: 'maple:prices:draft:v1', base: basePrices as PriceQuote[] },
  hunts: { key: 'maple:hunts:draft:v1', base: baseHunts as HuntLog[] },
  expNotes: { key: 'maple:expNotes:draft:v1', base: baseExpNotes as ExpNote[] },
};
export type Dataset = keyof typeof DATASETS;
type Data = { characters: Character[]; purchases: Purchase[]; prices: PriceQuote[]; hunts: HuntLog[]; expNotes: ExpNote[] };
type Drafts = { [K in Dataset]: Data[K] | null };

function loadDraft<K extends Dataset>(name: K): Data[K] | null {
  try {
    const raw = localStorage.getItem(DATASETS[name].key);
    if (!raw) return null;
    // 내보낸 JSON 이 저장소에 커밋돼 배포되면 임시본과 같아진다 → 임시본은 지운다
    if (raw === JSON.stringify(DATASETS[name].base)) {
      localStorage.removeItem(DATASETS[name].key);
      return null;
    }
    return JSON.parse(raw) as Data[K];
  } catch {
    return null;
  }
}

function saveDraft(name: Dataset, value: unknown[] | null) {
  try {
    if (value) localStorage.setItem(DATASETS[name].key, JSON.stringify(value));
    else localStorage.removeItem(DATASETS[name].key);
  } catch {
    // 저장소 사용 불가(시크릿 모드 등) — 이번 세션 동안만 유지된다
  }
}

function download(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Store extends Data {
  /** 이 브라우저에만 저장된 수정이 있는 데이터 */
  changed: Dataset[];
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  updatePurchase: (id: string, patch: Partial<Purchase>) => void;
  addPurchase: (p: Purchase) => void;
  removePurchase: (id: string) => void;
  addPrice: (q: PriceQuote) => void;
  removePrice: (q: PriceQuote) => void;
  addHunt: (h: HuntLog) => void;
  removeHunt: (id: string) => void;
  /** 빈 글이면 메모 삭제 */
  setExpNote: (date: string, note: string) => void;
  exportDataset: (name: Dataset) => void;
  discardDrafts: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Drafts>(() => ({
    characters: loadDraft('characters'),
    purchases: loadDraft('purchases'),
    prices: loadDraft('prices'),
    hunts: loadDraft('hunts'),
    expNotes: loadDraft('expNotes'),
  }));
  // 넥슨 API 로 받은 레벨이 있으면 그것을 쓴다 (시트·수동 입력보다 최신)
  const characters = useMemo(
    () =>
      (drafts.characters ?? DATASETS.characters.base).map((c) => {
        const level = nexon.characters[c.id]?.level;
        return level != null && level !== c.level ? { ...c, level } : c;
      }),
    [drafts.characters],
  );
  const purchases = drafts.purchases ?? DATASETS.purchases.base;
  const prices = drafts.prices ?? DATASETS.prices.base;
  const hunts = drafts.hunts ?? DATASETS.hunts.base;
  const expNotes = drafts.expNotes ?? DATASETS.expNotes.base;

  const setDraft = useCallback(<K extends Dataset>(name: K, value: Data[K]) => {
    setDrafts((d) => ({ ...d, [name]: value }));
    saveDraft(name, value);
  }, []);

  const updateCharacter = useCallback(
    (id: string, patch: Partial<Character>) =>
      setDraft('characters', characters.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [characters, setDraft],
  );

  const updatePurchase = useCallback(
    (id: string, patch: Partial<Purchase>) =>
      setDraft('purchases', purchases.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [purchases, setDraft],
  );

  const addPurchase = useCallback((p: Purchase) => setDraft('purchases', [...purchases, p]), [purchases, setDraft]);
  const removePurchase = useCallback(
    (id: string) => setDraft('purchases', purchases.filter((p) => p.id !== id)),
    [purchases, setDraft],
  );
  const addPrice = useCallback((q: PriceQuote) => setDraft('prices', [...prices, q]), [prices, setDraft]);
  const removePrice = useCallback(
    (q: PriceQuote) => setDraft('prices', prices.filter((x) => x !== q)),
    [prices, setDraft],
  );

  const addHunt = useCallback((h: HuntLog) => setDraft('hunts', [...hunts, h]), [hunts, setDraft]);
  const removeHunt = useCallback((id: string) => setDraft('hunts', hunts.filter((h) => h.id !== id)), [hunts, setDraft]);

  const setExpNote = useCallback(
    (date: string, note: string) =>
      setDraft(
        'expNotes',
        [...expNotes.filter((n) => n.date !== date), ...(note.trim() ? [{ date, note: note.trim() }] : [])].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      ),
    [expNotes, setDraft],
  );

  const exportDataset = useCallback(
    (name: Dataset) => download(`${name}.json`, { characters, purchases, prices, hunts, expNotes }[name]),
    [characters, purchases, prices, hunts, expNotes],
  );

  const discardDrafts = useCallback(() => {
    setDrafts({ characters: null, purchases: null, prices: null, hunts: null, expNotes: null });
    (Object.keys(DATASETS) as Dataset[]).forEach((name) => saveDraft(name, null));
  }, []);

  const value = useMemo(
    () => ({
      characters,
      purchases,
      prices,
      hunts,
      expNotes,
      changed: (Object.keys(drafts) as Dataset[]).filter((k) => drafts[k] !== null),
      updateCharacter,
      updatePurchase,
      addPurchase,
      removePurchase,
      addPrice,
      removePrice,
      addHunt,
      removeHunt,
      setExpNote,
      exportDataset,
      discardDrafts,
    }),
    [
      characters,
      purchases,
      prices,
      hunts,
      expNotes,
      drafts,
      updateCharacter,
      updatePurchase,
      addPurchase,
      removePurchase,
      addPrice,
      removePrice,
      addHunt,
      removeHunt,
      setExpNote,
      exportDataset,
      discardDrafts,
    ],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider 밖에서 useStore 사용');
  return store;
}
