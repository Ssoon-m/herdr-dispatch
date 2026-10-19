import type { Ticket } from '../jira/normalize';
import { formatDateTime, formatRelative } from '../lib/format';
import { categoryRank, isBacklog, statusRank } from '../lib/status';

export type Column = 'key' | 'summary' | 'status' | 'priority' | 'reporter' | 'version' | 'created' | 'updated';
export type Grouping = 'status' | 'version';

const COLUMN_LABEL: Record<Column, string> = {
  key: '키',
  summary: '제목',
  status: '상태',
  priority: '우선순위',
  reporter: '보고자',
  version: '버전',
  created: '등록',
  updated: '업데이트',
};

/** 좁은 화면에서 숨기는 컬럼 */
const OPTIONAL_COLUMNS = new Set<Column>(['reporter', 'version', 'created']);

/** 이보다 많은 묶음은 접힌 채로 시작한다 */
const COLLAPSE_OVER = 25;

interface Group {
  name: string;
  items: Ticket[];
}

function byStatusThenUpdated(a: Ticket, b: Ticket) {
  return (
    categoryRank(a.category) - categoryRank(b.category) ||
    statusRank(a.status) - statusRank(b.status) ||
    (b.updated ?? '').localeCompare(a.updated ?? '')
  );
}

function groupTickets(tickets: Ticket[], grouping: Grouping): Group[] {
  const map = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const name = grouping === 'status' ? ticket.status : ticket.versions || '버전 없음';
    const items = map.get(name);
    if (items) items.push(ticket);
    else map.set(name, [ticket]);
  }
  const groups = [...map].map(([name, items]) => ({
    name,
    items: grouping === 'version' ? [...items].sort(byStatusThenUpdated) : items,
  }));

  if (grouping === 'status') {
    return groups.sort(
      (a, b) =>
        statusRank(a.name) - statusRank(b.name) ||
        categoryRank(a.items[0].category) - categoryRank(b.items[0].category) ||
        a.name.localeCompare(b.name)
    );
  }
  const firstRelease = (items: Ticket[]) =>
    items
      .map(ticket => ticket.firstRelease)
      .filter((date): date is string => Boolean(date))
      .sort()[0] ?? '9999';
  return groups.sort((a, b) => firstRelease(a.items).localeCompare(firstRelease(b.items)) || a.name.localeCompare(b.name));
}

interface TicketGroupsProps {
  tickets: Ticket[];
  columns: Column[];
  grouping: Grouping;
  /** 검색 중에는 결과가 보이도록 모든 묶음을 펼친다 */
  expandAll: boolean;
  unreadKeys: Set<string>;
  now: number;
}

export function TicketGroups({ tickets, columns, grouping, expandAll, unreadKeys, now }: TicketGroupsProps) {
  if (tickets.length === 0) return <p className="empty">해당하는 티켓이 없습니다</p>;

  return (
    <div className="groups">
      {groupTickets(tickets, grouping).map(group => {
        const defaultOpen = !(grouping === 'status' && isBacklog(group.name)) && group.items.length <= COLLAPSE_OVER;
        return (
          <details key={`${grouping}:${group.name}:${expandAll}`} className="group" open={expandAll || defaultOpen}>
            <summary>
              <span className="chev" aria-hidden="true" />
              <span className="group-name">{group.name}</span>
              <span className="count">{group.items.length}</span>
            </summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {columns.map(column => (
                      <th key={column} className={OPTIONAL_COLUMNS.has(column) ? 'col-optional' : undefined}>
                        {COLUMN_LABEL[column]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(ticket => (
                    <tr key={ticket.key}>
                      {columns.map(column => (
                        <TicketCell
                          key={column}
                          column={column}
                          ticket={ticket}
                          unread={unreadKeys.has(ticket.key)}
                          now={now}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}

interface TicketCellProps {
  column: Column;
  ticket: Ticket;
  unread: boolean;
  now: number;
}

function TicketCell({ column, ticket, unread, now }: TicketCellProps) {
  const optional = OPTIONAL_COLUMNS.has(column) ? ' col-optional' : '';
  switch (column) {
    case 'key':
      return (
        <td className="c-key">
          <a className="ticket-key" href={ticket.url} target="_blank" rel="noreferrer">
            {ticket.key}
          </a>
          {unread && <span className="unread-dot" title="확인하지 않은 새 소식" />}
        </td>
      );
    case 'summary':
      return <td className="c-summary">{ticket.summary}</td>;
    case 'status':
      return (
        <td>
          <span className={`pill ${statusPillClass(ticket)}`}>{ticket.status}</span>
        </td>
      );
    case 'priority':
      return (
        <td className="c-meta">
          <span className={`prio ${priorityClass(ticket.priority)}`}>{ticket.priority || '-'}</span>
        </td>
      );
    case 'reporter':
      return <td className={`c-meta${optional}`}>{ticket.reporter || '-'}</td>;
    case 'version':
      return <td className={`c-meta${optional}`}>{ticket.versions || '-'}</td>;
    case 'created':
    case 'updated': {
      const iso = ticket[column];
      return (
        <td className={`c-meta${optional}`} title={iso ? formatDateTime(iso) : undefined}>
          {iso ? formatRelative(iso, now) : '-'}
        </td>
      );
    }
  }
}

function statusPillClass(ticket: Ticket) {
  if (ticket.category === 'indeterminate') return 'pill--doing';
  return isBacklog(ticket.status) ? 'pill--backlog' : 'pill--todo';
}

function priorityClass(priority: string) {
  if (priority === 'Highest' || priority === 'High') return 'prio--high';
  if (priority === 'Medium') return 'prio--medium';
  return '';
}
