import { areaOf, JIRA_BASE_URL, type Area } from '../config';
import type { AdfNode, JiraHistory, JiraIssue, JiraUser } from './types';

export interface Ticket {
  key: string;
  url: string;
  summary: string;
  type: string;
  status: string;
  category: string;
  priority: string;
  projectKey: string;
  area: Area;
  reporter: string;
  versions: string;
  firstRelease: string | null;
  created: string | null;
  updated: string | null;
}

export type EventKind = 'assigned' | 'created' | 'status' | 'comment' | 'mention' | 'field';
export type Relation = 'assignee' | 'reporter' | 'watcher';

export const EVENT_LABEL: Record<EventKind, string> = {
  assigned: '할당',
  created: '새 티켓',
  status: '상태',
  comment: '댓글',
  mention: '멘션',
  field: '변경',
};

export const RELATION_LABEL: Record<Relation, string> = {
  assignee: '담당',
  reporter: '보고',
  watcher: '지켜봄',
};

export interface ActivityEvent {
  id: string;
  kind: EventKind;
  at: string;
  actor: string;
  detail: string;
  ticket: {
    key: string;
    url: string;
    summary: string;
    status: string;
    area: Area;
    relation: Relation;
  };
}

const FIELD_LABELS: Record<string, string> = {
  summary: '제목',
  description: '설명',
  priority: '우선순위',
  'Fix Version': '수정 버전',
  Attachment: '첨부',
  labels: '레이블',
  duedate: '기한',
  resolution: '해결',
  Link: '연결된 티켓',
  issuetype: '유형',
  Component: '컴포넌트',
  reporter: '보고자',
  Sprint: '스프린트',
};

/** 알림으로 볼 가치가 없는 내부 변경 */
const IGNORED_FIELDS = new Set([
  'Rank',
  'WorklogId',
  'timespent',
  'timeestimate',
  'timeoriginalestimate',
  'RemoteIssueLink',
  'Workflow',
]);

const browseUrl = (key: string) => `${JIRA_BASE_URL}/browse/${key}`;

export function toTicket(issue: JiraIssue): Ticket {
  const f = issue.fields;
  const versions = f.fixVersions ?? [];
  const projectKey = f.project?.key ?? '';
  return {
    key: issue.key,
    url: browseUrl(issue.key),
    summary: f.summary ?? '',
    type: f.issuetype?.name ?? '',
    status: f.status?.name ?? '',
    category: f.status?.statusCategory?.key ?? '',
    priority: f.priority?.name ?? '',
    projectKey,
    area: areaOf(projectKey),
    reporter: f.reporter?.displayName ?? '',
    versions: versions.map(v => v.name).join(', '),
    firstRelease:
      versions
        .map(v => v.releaseDate)
        .filter((date): date is string => Boolean(date))
        .sort()[0] ?? null,
    created: f.created ?? null,
    updated: f.updated ?? null,
  };
}

function adfToText(node: AdfNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'mention') return String(node.attrs?.text ?? '@');
  if (node.type === 'hardBreak') return ' ';
  const inner = (node.content ?? []).map(adfToText).join('');
  return node.type === 'paragraph' ? `${inner} ` : inner;
}

function mentions(node: AdfNode | undefined, accountId: string): boolean {
  if (!node) return false;
  if (node.type === 'mention' && node.attrs?.id === accountId) return true;
  return (node.content ?? []).some(child => mentions(child, accountId));
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function describeHistory(history: JiraHistory, myId: string): Pick<ActivityEvent, 'kind' | 'detail'> | null {
  const items = history.items.filter(item => !IGNORED_FIELDS.has(item.field));
  if (items.length === 0) return null;

  const assignee = items.find(item => item.field === 'assignee');
  if (assignee?.to === myId) return { kind: 'assigned', detail: '나에게 할당했습니다' };

  const status = items.find(item => item.field === 'status');
  if (status) return { kind: 'status', detail: `${status.fromString ?? '-'} → ${status.toString ?? '-'}` };

  if (assignee) {
    return { kind: 'field', detail: `담당자 ${assignee.fromString ?? '없음'} → ${assignee.toString ?? '없음'}` };
  }
  const labels = [...new Set(items.map(item => FIELD_LABELS[item.field] ?? item.field))];
  return { kind: 'field', detail: `${labels.join(', ')} 변경` };
}

export function toEvents(issue: JiraIssue, me: JiraUser, since: number): ActivityEvent[] {
  const f = issue.fields;
  const isMe = (user?: JiraUser | null) => user?.accountId === me.accountId;
  const isRecent = (iso: string) => new Date(iso).getTime() >= since;
  const relation: Relation = isMe(f.assignee) ? 'assignee' : isMe(f.reporter) ? 'reporter' : 'watcher';
  const ticket: ActivityEvent['ticket'] = {
    key: issue.key,
    url: browseUrl(issue.key),
    summary: f.summary ?? '',
    status: f.status?.name ?? '',
    area: areaOf(f.project?.key ?? ''),
    relation,
  };
  const events: ActivityEvent[] = [];

  // 생성과 동시에 담당자가 지정되면 변경 이력이 남지 않아 따로 잡는다
  if (f.created && isRecent(f.created) && isMe(f.assignee) && !isMe(f.reporter)) {
    events.push({
      id: `${issue.key}:created`,
      kind: 'created',
      at: f.created,
      actor: f.reporter?.displayName ?? '',
      detail: '새 티켓을 나에게 할당했습니다',
      ticket,
    });
  }

  for (const history of issue.changelog?.histories ?? []) {
    if (!isRecent(history.created) || isMe(history.author)) continue;
    const described = describeHistory(history, me.accountId);
    if (!described) continue;
    events.push({
      id: `${issue.key}:h:${history.id}`,
      at: history.created,
      actor: history.author?.displayName ?? '',
      ticket,
      ...described,
    });
  }

  for (const comment of f.comment?.comments ?? []) {
    if (!isRecent(comment.created) || isMe(comment.author)) continue;
    events.push({
      id: `${issue.key}:c:${comment.id}`,
      kind: mentions(comment.body, me.accountId) ? 'mention' : 'comment',
      at: comment.created,
      actor: comment.author?.displayName ?? '',
      detail: truncate(adfToText(comment.body), 160) || '(내용 없음)',
      ticket,
    });
  }

  return events;
}
