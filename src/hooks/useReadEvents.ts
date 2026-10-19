import { useCallback, useEffect, useState } from 'react';
import { readJson, writeJson } from '../lib/storage';

const STORAGE_KEY = 'herdr-dispatch:read-events';
// 새 소식은 7일치만 보이므로 그보다 넉넉히 보관하고 지운다
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

export function useReadEvents() {
  const [readAt, setReadAt] = useState<Record<string, number>>(() => readJson(STORAGE_KEY, {}));

  useEffect(() => writeJson(STORAGE_KEY, readAt), [readAt]);

  const markRead = useCallback((ids: string[]) => {
    setReadAt(prev => {
      const now = Date.now();
      const next = Object.fromEntries(Object.entries(prev).filter(([, at]) => now - at < KEEP_MS));
      for (const id of ids) next[id] = now;
      return next;
    });
  }, []);

  const isRead = useCallback((id: string) => id in readAt, [readAt]);

  return { isRead, markRead };
}
