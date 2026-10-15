import summaryData from '../data/historySummary.json';
import { formatNumber } from '../lib/format';
import type { HistorySummary } from '../types';

// JSON 에서 추론된 타입은 장비마다 키가 달라 HistorySummary 와 직접 호환되지 않는다
const summary = summaryData as unknown as HistorySummary;

const TYPE_LABEL: Record<string, string> = { starforce: '스타포스', cube: '큐브', potential: '잠재 재설정(메소)' };

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function EnhanceHistory({ characterName }: { characterName: string }) {
  if (!summary.characters.includes(characterName)) {
    return (
      <p className="muted">
        강화 기록은 지금 {summary.characters.join(', ') || '아무 캐릭터도'} 만 받고 있어요. 이 캐릭터도 받으려면 말씀해 주세요.
      </p>
    );
  }
  const firstDate = Object.values(summary.state)
    .map((st) => st.firstDate)
    .filter(Boolean)
    .sort()[0];
  const items = summary.items
    .filter((i) => i.character === characterName)
    .sort((a, b) => b.starforce.attempts + b.cube.uses + b.potential.uses - (a.starforce.attempts + a.cube.uses + a.potential.uses));

  return (
    <>
      <ul className="list card">
        {Object.entries(summary.state).map(([type, st]) => (
          <li key={type}>
            <span>{TYPE_LABEL[type] ?? type}</span>
            <span className="right muted">
              {st.error ? `오류: ${st.error}` : st.lastDate ? `${st.lastDate} 까지 받음` : '아직 받지 않음'}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted">
        넥슨은 최근 2년치 기록만 줘서 {firstDate ?? '-'} 부터 집계했어요. 매일 아침 전날 기록을 더하고, 받아 둔 기록은 2년이 지나도
        남아요. 같은 이름의 장비는 한 줄로 합쳐져요.
      </p>
      {items.length === 0 ? (
        <p className="muted">아직 받은 기록이 없어요.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>장비</th>
                <th className="num">스타포스 시도</th>
                <th className="num">성공</th>
                <th className="num">실패</th>
                <th className="num">파괴</th>
                <th className="num">최고</th>
                <th className="num">큐브</th>
                <th className="num">메소 재설정</th>
                <th>마지막</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const last = [i.starforce.last, i.cube.last, i.potential.last].filter(Boolean).sort().pop() ?? null;
                return (
                  <tr key={i.item}>
                    <td>{i.item}</td>
                    <td className="num">{i.starforce.attempts ? formatNumber(i.starforce.attempts) : ''}</td>
                    <td className="num">{i.starforce.success || ''}</td>
                    <td className="num">{i.starforce.fail || ''}</td>
                    <td className="num">{i.starforce.destroy || ''}</td>
                    <td className="num">{i.starforce.maxStar ? `★${i.starforce.maxStar}` : ''}</td>
                    <td className="num" title={Object.entries(i.cube.byKind).map(([k, v]) => `${k} ${v}`).join(', ')}>
                      {i.cube.uses || ''}
                    </td>
                    <td className="num">{i.potential.uses || ''}</td>
                    <td className="mono">{day(last)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
