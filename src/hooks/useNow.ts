import { useEffect, useState } from 'react';

/** "N분 전" 같은 상대 시간을 주기적으로 다시 그리기 위한 현재 시각 */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
