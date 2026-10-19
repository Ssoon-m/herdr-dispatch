export const JIRA_BASE_URL = __JIRA_BASE_URL__;
export const JIRA_CONFIGURED = __JIRA_CONFIGURED__;
export const QA_PROJECTS = __QA_PROJECTS__;

/** 새 소식으로 모아 볼 기간 */
export const ACTIVITY_DAYS = 7;
export const REFRESH_INTERVAL_MS = 2 * 60_000;

export type Area = 'qa' | 'dev';

export const AREA_LABEL: Record<Area, string> = { qa: 'QA', dev: '개발' };

export function areaOf(projectKey: string): Area {
  return QA_PROJECTS.includes(projectKey) ? 'qa' : 'dev';
}
