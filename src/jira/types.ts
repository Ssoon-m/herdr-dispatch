/** Jira Cloud REST v3 응답 중 이 앱이 읽는 필드만 정의한다 */

export interface JiraUser {
  accountId: string;
  displayName: string;
}

export interface JiraVersion {
  name: string;
  releaseDate?: string;
  released?: boolean;
}

export interface AdfNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
}

export interface JiraComment {
  id: string;
  author?: JiraUser;
  body?: AdfNode;
  created: string;
}

export interface JiraHistoryItem {
  field: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

export interface JiraHistory {
  id: string;
  author?: JiraUser;
  created: string;
  items: JiraHistoryItem[];
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    status?: { name: string; statusCategory?: { key: string } };
    issuetype?: { name: string };
    priority?: { name: string } | null;
    project?: { key: string; name: string };
    fixVersions?: JiraVersion[];
    reporter?: JiraUser | null;
    assignee?: JiraUser | null;
    created?: string;
    updated?: string;
    comment?: { comments: JiraComment[] };
  };
  changelog?: { histories: JiraHistory[] };
}

export interface JiraSearchPage {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}
