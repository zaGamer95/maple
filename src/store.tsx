import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import baseCharacters from './data/characters.json';
import type { Character } from './types';

/**
 * 데이터의 원본은 저장소의 src/data/*.json 이다.
 * 웹에서 수정한 내용은 이 브라우저의 localStorage 에만 임시로 저장되고,
 * "JSON 내보내기"로 받은 파일을 src/data 에 덮어써 커밋해야 다른 사람(공유 링크)에게도 반영된다.
 */
const DRAFT_KEY = 'maple:characters:draft:v1';

function loadDraft(): Character[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Character[]) : null;
  } catch {
    return null;
  }
}

function saveDraft(characters: Character[] | null) {
  try {
    if (characters) localStorage.setItem(DRAFT_KEY, JSON.stringify(characters));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 저장소 사용 불가(시크릿 모드 등) — 이번 세션 동안만 유지된다
  }
}

interface Store {
  characters: Character[];
  hasDraft: boolean;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  exportCharacters: () => void;
  discardDraft: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Character[] | null>(loadDraft);
  const characters = draft ?? (baseCharacters as Character[]);

  const updateCharacter = useCallback(
    (id: string, patch: Partial<Character>) => {
      const next = characters.map((c) => (c.id === id ? { ...c, ...patch } : c));
      setDraft(next);
      saveDraft(next);
    },
    [characters],
  );

  const exportCharacters = useCallback(() => {
    const blob = new Blob([JSON.stringify(characters, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'characters.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [characters]);

  const discardDraft = useCallback(() => {
    setDraft(null);
    saveDraft(null);
  }, []);

  const value = useMemo(
    () => ({ characters, hasDraft: draft !== null, updateCharacter, exportCharacters, discardDraft }),
    [characters, draft, updateCharacter, exportCharacters, discardDraft],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider 밖에서 useStore 사용');
  return store;
}
