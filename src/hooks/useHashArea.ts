import { useCallback, useSyncExternalStore } from 'react';
import type { Area } from '../config';

const readArea = (): Area => (window.location.hash === '#dev' ? 'dev' : 'qa');

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** 선택한 탭을 #qa / #dev 로 남겨 새로고침·북마크해도 유지한다 */
export function useHashArea() {
  const area = useSyncExternalStore(subscribe, readArea);
  const setArea = useCallback((next: Area) => {
    window.location.hash = next;
  }, []);
  return [area, setArea] as const;
}
