import { queryOptions } from '@tanstack/react-query';
import { ACTIVITY_DAYS, JIRA_CONFIGURED, REFRESH_INTERVAL_MS } from '../config';
import { toEvents, toTicket, type ActivityEvent, type Ticket } from './normalize';
import type { JiraIssue, JiraSearchPage, JiraUser } from './types';

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

const ASSIGNED_JQL = 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC';
const ASSIGNED_FIELDS = ['summary', 'status', 'issuetype', 'priority', 'project', 'fixVersions', 'reporter', 'created', 'updated'];

// Jira가 알림을 보내는 대상(담당자·보고자·지켜보는 사람)과 같은 범위
const ACTIVITY_JQL = `(assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser()) AND updated >= -${ACTIVITY_DAYS}d ORDER BY updated DESC`;
const ACTIVITY_FIELDS = ['summary', 'status', 'project', 'assignee', 'reporter', 'comment', 'created'];

export class JiraRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function jiraGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  // vite.config.ts의 /jira 프록시가 인증 헤더를 붙인다
  const res = await fetch(`/jira${path}${query ? `?${query}` : ''}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const message =
      res.status === 401
        ? 'Jira 인증에 실패했습니다. .env의 JIRA_EMAIL과 JIRA_API_TOKEN을 확인한 뒤 pnpm dev를 다시 실행하세요.'
        : `Jira 요청이 실패했습니다 (${res.status}): ${(await res.text()).slice(0, 200)}`;
    throw new JiraRequestError(res.status, message);
  }
  return res.json() as Promise<T>;
}

async function searchAll(jql: string, fields: string[], expand?: string) {
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await jiraGet<JiraSearchPage>('/rest/api/3/search/jql', {
      jql,
      fields: fields.join(','),
      expand,
      maxResults: PAGE_SIZE,
      nextPageToken,
    });
    issues.push(...data.issues);
    nextPageToken = data.nextPageToken;
    if (!nextPageToken || data.isLast) return { issues, truncated: false };
  }
  return { issues, truncated: true };
}

export interface DashboardData {
  me: JiraUser;
  tickets: Ticket[];
  events: ActivityEvent[];
  truncated: boolean;
}

async function fetchDashboard(): Promise<DashboardData> {
  const [me, assigned, activity] = await Promise.all([
    jiraGet<JiraUser>('/rest/api/3/myself'),
    searchAll(ASSIGNED_JQL, ASSIGNED_FIELDS),
    searchAll(ACTIVITY_JQL, ACTIVITY_FIELDS, 'changelog'),
  ]);
  const since = Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const events = activity.issues
    .flatMap(issue => toEvents(issue, me, since))
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    me,
    tickets: assigned.issues.map(toTicket),
    events,
    truncated: assigned.truncated || activity.truncated,
  };
}

export const dashboardQueryOptions = () =>
  queryOptions({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    enabled: JIRA_CONFIGURED,
    refetchInterval: REFRESH_INTERVAL_MS,
    // 다른 탭을 보고 있어도 새 소식 알림을 놓치지 않도록 계속 갱신한다
    refetchIntervalInBackground: true,
    retry: (failureCount, error) =>
      !(error instanceof JiraRequestError && error.status === 401) && failureCount < 2,
  });
