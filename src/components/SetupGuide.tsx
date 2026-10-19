export function SetupGuide({ message }: { message?: string }) {
  return (
    <section className="panel setup">
      <h2 className="panel-title">Jira 연결 설정이 필요합니다</h2>
      {message && <p className="setup-error">{message}</p>}
      <ol>
        <li>
          <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer">
            Atlassian API 토큰 페이지
          </a>
          에서 토큰을 만듭니다.
        </li>
        <li>
          프로젝트 폴더의 <code>.env.example</code>을 <code>.env</code>로 복사하고 Jira 주소, 이메일, 토큰을 채웁니다.
        </li>
        <li>
          <code>pnpm dev</code>를 다시 실행합니다.
        </li>
      </ol>
      <pre>
        {'JIRA_BASE_URL=https://your-site.atlassian.net\nJIRA_EMAIL=Atlassian_로그인_이메일\nJIRA_API_TOKEN=발급받은_토큰'}
      </pre>
    </section>
  );
}
