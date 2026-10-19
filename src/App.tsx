import { useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AREA_LABEL, JIRA_CONFIGURED, type Area } from './config';
import { dashboardQueryOptions, JiraRequestError } from './jira/api';
import { useDesktopNotifications } from './hooks/useDesktopNotifications';
import { useHashArea } from './hooks/useHashArea';
import { useNow } from './hooks/useNow';
import { useReadEvents } from './hooks/useReadEvents';
import { formatRelative } from './lib/format';
import { SetupGuide } from './components/SetupGuide';
import { Workspace } from './components/Workspace';

const AREAS: Area[] = ['qa', 'dev'];

export function App() {
  if (!JIRA_CONFIGURED) {
    return (
      <main className="page">
        <SetupGuide />
      </main>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } = useQuery(dashboardQueryOptions());
  const [area, setArea] = useHashArea();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { isRead, markRead } = useReadEvents();
  const notifications = useDesktopNotifications(data?.events, isRead);
  const now = useNow(30_000);

  const unread: Record<Area, number> = { qa: 0, dev: 0 };
  const ticketCount: Record<Area, number> = { qa: 0, dev: 0 };
  for (const event of data?.events ?? []) if (!isRead(event.id)) unread[event.ticket.area] += 1;
  for (const ticket of data?.tickets ?? []) ticketCount[ticket.area] += 1;
  const totalUnread = unread.qa + unread.dev;

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) herdr-dispatch` : 'herdr-dispatch';
  }, [totalUnread]);

  const authFailed = error instanceof JiraRequestError && error.status === 401;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <h1 className="brand">herdr-dispatch</h1>
          <nav className="tabs" role="tablist" aria-label="보기">
            {AREAS.map(option => (
              <button
                key={option}
                type="button"
                role="tab"
                data-area={option}
                aria-selected={area === option}
                onClick={() => setArea(option)}
              >
                {AREA_LABEL[option]}
                <span className="tab-count" title="미완료 티켓">
                  {data ? ticketCount[option] : '–'}
                </span>
                {unread[option] > 0 && (
                  <span className="tab-unread" title="확인하지 않은 새 소식">
                    새 소식 {unread[option]}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="topbar-tools">
            <input
              type="search"
              className="search"
              placeholder="키나 제목으로 찾기"
              aria-label="티켓 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            {notifications.supported && notifications.permission !== 'granted' && (
              <button
                type="button"
                className="btn"
                disabled={notifications.permission === 'denied'}
                title={notifications.permission === 'denied' ? '브라우저 설정에서 이 사이트의 알림을 허용하세요' : undefined}
                onClick={notifications.requestPermission}
              >
                {notifications.permission === 'denied' ? '알림 차단됨' : '데스크톱 알림 켜기'}
              </button>
            )}
            <button type="button" className="btn" disabled={isFetching} onClick={() => refetch()}>
              {isFetching ? '불러오는 중' : '새로고침'}
            </button>
            {dataUpdatedAt > 0 && (
              <span className="fetched">{formatRelative(new Date(dataUpdatedAt).toISOString(), now)} 갱신</span>
            )}
          </div>
        </div>
      </header>

      <main className="page" data-area={area}>
        {authFailed && <SetupGuide message={error.message} />}
        {error && !authFailed && <div className="error">{error.message}</div>}
        {data?.truncated && <p className="notice">티켓이 많아 최근 것 일부만 불러왔습니다.</p>}
        {isPending && !error && <p className="loading">Jira에서 불러오는 중…</p>}
        {data && (
          <Workspace
            area={area}
            data={data}
            search={deferredSearch}
            now={now}
            isRead={isRead}
            onMarkRead={markRead}
          />
        )}
      </main>
    </>
  );
}
