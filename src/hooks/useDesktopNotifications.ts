import { useCallback, useEffect, useState } from 'react';
import { EVENT_LABEL, type ActivityEvent } from '../jira/normalize';
import { readJson, writeJson } from '../lib/storage';

const STORAGE_KEY = 'herdr-dispatch:notified-events';
const MAX_INDIVIDUAL = 3;

const supported = typeof Notification !== 'undefined';

function notify(title: string, body: string, url?: string) {
  const notification = new Notification(title, { body });
  notification.onclick = () => {
    window.focus();
    if (url) window.open(url, '_blank', 'noreferrer');
    notification.close();
  };
}

export function useDesktopNotifications(events: ActivityEvent[] | undefined, isRead: (id: string) => boolean) {
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');

  useEffect(() => {
    if (!events) return;
    const notified = readJson<string[] | null>(STORAGE_KEY, null);
    writeJson(
      STORAGE_KEY,
      events.map(event => event.id)
    );
    // 처음 실행했을 때 이미 쌓여 있던 소식은 한꺼번에 띄우지 않는다
    if (!notified || permission !== 'granted') return;

    const seen = new Set(notified);
    const fresh = events.filter(event => !seen.has(event.id) && !isRead(event.id));
    if (fresh.length > MAX_INDIVIDUAL) {
      notify(
        `Jira 새 소식 ${fresh.length}건`,
        fresh
          .slice(0, MAX_INDIVIDUAL)
          .map(event => `${event.ticket.key} ${EVENT_LABEL[event.kind]}`)
          .join('\n')
      );
      return;
    }
    for (const event of fresh) {
      notify(`${event.ticket.key} · ${EVENT_LABEL[event.kind]}`, `${event.actor}: ${event.detail}`, event.ticket.url);
    }
  }, [events, isRead, permission]);

  const requestPermission = useCallback(async () => {
    if (supported) setPermission(await Notification.requestPermission());
  }, []);

  return { supported, permission, requestPermission };
}
