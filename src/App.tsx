import { NavLink, Route, Routes } from 'react-router-dom';
import { useStore } from './store';
import Dashboard from './pages/Dashboard';
import CharacterList from './pages/CharacterList';
import CharacterDetail from './pages/CharacterDetail';
import ComingSoon from './pages/ComingSoon';

const NAV = [
  { to: '/', label: '대시보드', end: true },
  { to: '/characters', label: '캐릭터' },
  { to: '/purchases', label: '구매 내역' },
  { to: '/guides', label: '공략' },
  { to: '/tools', label: '계산기' },
  { to: '/prices', label: '시세' },
  { to: '/todo', label: '할 일' },
];

function DraftBanner() {
  const { hasDraft, exportCharacters, discardDraft } = useStore();
  if (!hasDraft) return null;
  return (
    <div className="draft-banner">
      <span>이 브라우저에만 저장된 수정 사항이 있어요. 공유 링크에도 반영하려면 JSON을 내보내 저장소에 커밋하세요.</span>
      <span className="draft-actions">
        <button onClick={exportCharacters}>JSON 내보내기</button>
        <button
          className="ghost"
          onClick={() => {
            if (confirm('이 브라우저의 수정 사항을 지우고 저장소 데이터로 되돌릴까요?')) discardDraft();
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
        <span className="brand">메이플 관리</span>
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
          <Route path="/purchases" element={<ComingSoon title="구매 내역" phase={3} />} />
          <Route path="/guides" element={<ComingSoon title="공략 노트" phase={5} />} />
          <Route path="/tools" element={<ComingSoon title="계산기" phase={5} />} />
          <Route path="/prices" element={<ComingSoon title="시세" phase={5} />} />
          <Route path="/todo" element={<ComingSoon title="할 일" phase={5} />} />
          <Route path="*" element={<ComingSoon title="페이지를 찾을 수 없어요" />} />
        </Routes>
      </main>
    </div>
  );
}
