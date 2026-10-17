import { NavLink, Route, Routes } from 'react-router-dom';
import { useStore, type Dataset } from './store';
import Dashboard from './pages/Dashboard';
import CharacterList from './pages/CharacterList';
import CharacterDetail from './pages/CharacterDetail';
import ComingSoon from './pages/ComingSoon';
import Purchases from './pages/Purchases';
import Prices from './pages/Prices';
import Upgrade from './pages/Upgrade';
import Hunts from './pages/Hunts';

const NAV = [
  { to: '/', label: '대시보드', end: true },
  { to: '/characters', label: '캐릭터' },
  { to: '/purchases', label: '거래 내역' },
  { to: '/hunts', label: '사냥·경험치' },
  { to: '/guides', label: '공략' },
  { to: '/upgrade', label: '장비 교체' },
  { to: '/tools', label: '계산기' },
  { to: '/prices', label: '시세' },
  { to: '/todo', label: '할 일' },
];

const DATASET_LABEL: Record<Dataset, string> = {
  characters: 'characters.json',
  purchases: 'purchases.json',
  prices: 'prices.json',
  hunts: 'hunts.json',
  expNotes: 'expNotes.json',
};

function DraftBanner() {
  const { changed, exportDataset, discardDrafts } = useStore();
  if (changed.length === 0) return null;
  return (
    <div className="draft-banner">
      <span>이 브라우저에만 저장된 수정 사항이 있어요. 공유 링크에도 반영하려면 JSON을 내보내 src/data 에 덮어쓰고 커밋하세요.</span>
      <span className="draft-actions">
        {changed.map((name) => (
          <button key={name} onClick={() => exportDataset(name)}>
            {DATASET_LABEL[name]} 내보내기
          </button>
        ))}
        <button
          className="ghost"
          onClick={() => {
            if (confirm('이 브라우저의 수정 사항을 지우고 저장소 데이터로 되돌릴까요?')) discardDrafts();
          }}
        >
          되돌리기
        </button>
      </span>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">자그노트</span>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <DraftBanner />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/characters" element={<CharacterList />} />
          <Route path="/characters/:id" element={<CharacterDetail />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/guides" element={<ComingSoon title="공략 노트" phase={5} />} />
          <Route path="/tools" element={<ComingSoon title="계산기" phase={5} />} />
          <Route path="/prices" element={<Prices />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/hunts" element={<Hunts />} />
          <Route path="/todo" element={<ComingSoon title="할 일" phase={5} />} />
          <Route path="*" element={<ComingSoon title="페이지를 찾을 수 없어요" />} />
        </Routes>
      </main>
      <footer className="footer">
        Data based on NEXON Open API · 넥슨코리아와 관련 없는 개인 페이지입니다.
      </footer>
    </div>
  );
}
