import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import MvpCalc from './MvpCalc';
import SpellTraceCalc from './SpellTraceCalc';
import ExpBmTable from './ExpBm';
import ExpContent from './ExpContent';

/** 계산기 페이지: 하위 탭마다 계산기 하나씩 */
const TABS = [
  { to: 'mvp', label: 'MVP작', element: <MvpCalc /> },
  { to: 'spell-trace', label: '주흔 15%작', element: <SpellTraceCalc /> },
  { to: 'exp-bm', label: '경험치 BM', element: <ExpBmTable /> },
  { to: 'exp-content', label: '경험치 콘텐츠', element: <ExpContent /> },
];

export default function Tools() {
  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Routes>
        <Route index element={<Navigate to={TABS[0].to} replace />} />
        {TABS.map((t) => (
          <Route key={t.to} path={t.to} element={t.element} />
        ))}
        <Route path="*" element={<Navigate to={TABS[0].to} replace />} />
      </Routes>
    </>
  );
}
