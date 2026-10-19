import { useState } from 'react';
import { ACTIVITY_DAYS } from '../config';
import { EVENT_LABEL, RELATION_LABEL, type ActivityEvent } from '../jira/normalize';
import { formatDateTime, formatRelative } from '../lib/format';

const READ_PREVIEW = 5;

interface ActivityFeedProps {
  events: ActivityEvent[];
  now: number;
  isRead: (id: string) => boolean;
  onMarkRead: (ids: string[]) => void;
}

export function ActivityFeed({ events, now, isRead, onMarkRead }: ActivityFeedProps) {
  const [showAllRead, setShowAllRead] = useState(false);
  const unread = events.filter(event => !isRead(event.id));
  const read = events.filter(event => isRead(event.id));
  const visibleRead = showAllRead ? read : read.slice(0, READ_PREVIEW);

  return (
    <section className="panel" aria-labelledby="feed-title">
      <div className="panel-head">
        <h2 id="feed-title" className="panel-title">
          새 소식
          {unread.length > 0 && <span className="unread-count">{unread.length}</span>}
        </h2>
        <p className="panel-note">최근 {ACTIVITY_DAYS}일, 내가 담당·보고·지켜보는 티켓에서 다른 사람이 한 일</p>
        {unread.length > 0 && (
          <button type="button" className="btn btn-small panel-action" onClick={() => onMarkRead(unread.map(event => event.id))}>
            모두 확인
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <p className="empty">새 소식이 없습니다</p>
      ) : (
        <ul className="feed">
          {unread.length === 0 && <li className="feed-clear">확인하지 않은 소식이 없습니다</li>}
          {unread.map(event => (
            <FeedItem key={event.id} event={event} now={now} unread onMarkRead={onMarkRead} />
          ))}
          {visibleRead.map(event => (
            <FeedItem key={event.id} event={event} now={now} unread={false} onMarkRead={onMarkRead} />
          ))}
        </ul>
      )}

      {read.length > READ_PREVIEW && (
        <button type="button" className="link-btn" onClick={() => setShowAllRead(value => !value)}>
          {showAllRead ? '확인한 소식 접기' : `확인한 소식 ${read.length - READ_PREVIEW}건 더 보기`}
        </button>
      )}
    </section>
  );
}

interface FeedItemProps {
  event: ActivityEvent;
  now: number;
  unread: boolean;
  onMarkRead: (ids: string[]) => void;
}

function FeedItem({ event, now, unread, onMarkRead }: FeedItemProps) {
  const { ticket } = event;
  return (
    <li className={unread ? 'feed-item is-unread' : 'feed-item'}>
      <span className={`kind kind--${event.kind}`}>{EVENT_LABEL[event.kind]}</span>
      <div className="feed-body">
        <div className="feed-title">
          <a
            className="ticket-key"
            href={ticket.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => onMarkRead([event.id])}
          >
            {ticket.key}
          </a>
          <span className="feed-summary">{ticket.summary}</span>
        </div>
        <p className="feed-detail">{event.detail}</p>
        <p className="feed-meta">
          {event.actor} ·{' '}
          <time dateTime={event.at} title={formatDateTime(event.at)}>
            {formatRelative(event.at, now)}
          </time>{' '}
          · {RELATION_LABEL[ticket.relation]} · {ticket.status}
        </p>
      </div>
      {unread && (
        <button
          type="button"
          className="btn btn-small"
          aria-label={`${ticket.key} 소식 확인`}
          onClick={() => onMarkRead([event.id])}
        >
          확인
        </button>
      )}
    </li>
  );
}
