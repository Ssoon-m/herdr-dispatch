import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // VITE_ 접두사 없이 읽으므로 토큰은 브라우저 번들에 포함되지 않고 프록시에서만 쓰인다
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = (env.JIRA_BASE_URL ?? '').replace(/\/$/, '');
  const configured = Boolean(baseUrl && env.JIRA_EMAIL && env.JIRA_API_TOKEN);
  const auth = Buffer.from(`${env.JIRA_EMAIL ?? ''}:${env.JIRA_API_TOKEN ?? ''}`).toString('base64');
  const qaProjects = (env.QA_PROJECTS ?? '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);

  return {
    plugins: [react()],
    define: {
      __JIRA_BASE_URL__: JSON.stringify(baseUrl),
      __JIRA_CONFIGURED__: JSON.stringify(configured),
      __QA_PROJECTS__: JSON.stringify(qaProjects),
    },
    server: {
      port: Number(env.PORT || 4321),
      open: true,
      proxy: {
        '/jira': {
          // 설정 전에는 프록시를 쓰지 않으므로(설정 안내 화면) 임시 주소를 둔다
          target: baseUrl || 'http://127.0.0.1',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/jira/, ''),
          headers: { Authorization: `Basic ${auth}` },
        },
      },
    },
  };
});
