const STATUS_ORDER = ['진행 중', '개발완료', '해야 할일', '대기', 'backlog'];

const CATEGORY_RANK: Record<string, number> = { indeterminate: 0, new: 1, done: 2 };

export const isBacklog = (status: string) => status.toLowerCase() === 'backlog';

export function statusRank(status: string) {
  const index = STATUS_ORDER.findIndex(name => name.toLowerCase() === status.toLowerCase());
  return index === -1 ? STATUS_ORDER.length : index;
}

export const categoryRank = (category: string) => CATEGORY_RANK[category] ?? 9;
