import type { Area } from '../config';
import type { DashboardData } from '../jira/api';
import { isBacklog } from '../lib/status';
import { usePersistentState } from '../lib/storage';
import { ActivityFeed } from './ActivityFeed';
import { TicketGroups, type Column, type Grouping } from './TicketGroups';

/** QA는 보고자·등록 시점이, 개발은 버전이 중요하다 */
const AREA_COLUMNS: Record<Area, Column[]> = {
  qa: ['key', 'summary', 'status', 'priority', 'reporter', 'version', 'created', 'updated'],
  dev: ['key', 'summary', 'status', 'version', 'updated'],
};

interface WorkspaceProps {
  area: Area;
  data: DashboardData;
  search: string;
  now: number;
  isRead: (id: string) => boolean;
  onMarkRead: (ids: string[]) => void;
}

export function Workspace({ area, data, search, now, isRead, onMarkRead }: WorkspaceProps) {
  const [devGrouping, setDevGrouping] = usePersistentState<Grouping>('herdr-dispatch:dev-grouping', 'status');
  const grouping: Grouping = area === 'qa' ? 'status' : devGrouping;

  const query = search.trim().toLowerCase();
  const matches = (key: string, summary: string) =>
    !query || key.toLowerCase().includes(query) || summary.toLowerCase().includes(query);

  const events = data.events.filter(event => event.ticket.area === area && matches(event.ticket.key, event.ticket.summary));
  const tickets = data.tickets.filter(ticket => ticket.area === area && matches(ticket.key, ticket.summary));
  const unreadKeys = new Set(events.filter(event => !isRead(event.id)).map(event => event.ticket.key));
  const columns = AREA_COLUMNS[area].filter(column => column !== grouping);

  const inProgress = tickets.filter(ticket => ticket.category === 'indeterminate').length;
  const todo = tickets.filter(ticket => ticket.category === 'new' && !isBacklog(ticket.status)).length;

  return (
    <div className="view">
      <ActivityFeed key={area} events={events} now={now} isRead={isRead} onMarkRead={onMarkRead} />

      <section className="tickets" aria-labelledby="tickets-title">
        <div className="list-head">
          <div className="panel-head">
            <h2 id="tickets-title" className="panel-title">
              내 티켓
            </h2>
            <p className="panel-note">
              미완료 {tickets.length} · 진행 중 {inProgress} · 해야 할 일 {todo}
            </p>
          </div>
          {area === 'dev' && (
            <div className="seg" role="group" aria-label="묶는 기준">
              {(['status', 'version'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={devGrouping === option}
                  onClick={() => setDevGrouping(option)}
                >
                  {option === 'status' ? '상태별' : '버전별'}
                </button>
              ))}
            </div>
          )}
        </div>
        <TicketGroups
          tickets={tickets}
          columns={columns}
          grouping={grouping}
          expandAll={Boolean(query)}
          unreadKeys={unreadKeys}
          now={now}
        />
      </section>
    </div>
  );
}
