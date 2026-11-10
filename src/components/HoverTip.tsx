import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * 마우스를 올리면(또는 눌러서 포커스하면) 바로 뜨는 툴팁. 표의 스크롤 영역에 잘리지 않도록 body 에 그린다.
 * 브라우저 기본 title 툴팁은 늦게 뜨거나 아예 안 뜨는 환경이 있어서 직접 그린다.
 */
export default function HoverTip({ tip, children }: { tip: string | null | undefined; children: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  if (!tip) return <>{children}</>;
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setPos({ x: Math.min(r.left, window.innerWidth - 340), y: r.bottom + 6 });
  };
  return (
    <span
      className="has-tip"
      tabIndex={0}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos &&
        createPortal(
          <div className="hover-tip" role="tooltip" style={{ left: Math.max(8, pos.x), top: pos.y }}>
            {tip}
          </div>,
          document.body,
        )}
    </span>
  );
}
