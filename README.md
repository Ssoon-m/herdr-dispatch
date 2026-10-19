# herdr-dispatch

나에게 할당된 Jira 티켓과 알림을 놓치지 않게 보여주고, 앞으로는 티켓을 [herdr](https://herdr.dev) 에이전트에게 배정하고 결과를 확인하는 작업 큐로 키워 갈 개인용 로컬 도구입니다.

## 지금 되는 것

- **QA / 개발 탭 분리**: `QA_PROJECTS`에 적은 프로젝트는 QA 탭, 나머지는 개발 탭에 나옵니다.
- **새 소식**: 최근 7일 동안 내가 담당·보고·지켜보는 티켓에서 다른 사람이 한 일(새로 할당, 상태 변경, 댓글, 나를 멘션한 댓글)을 모아 보여줍니다. 확인하지 않은 항목은 강조되고, 확인 여부는 브라우저에 저장됩니다.
- **내 티켓**: 나에게 할당된 미완료 티켓을 상태별로 묶어 보여줍니다. 개발 탭은 버전별로도 묶을 수 있습니다.
- **자동 갱신과 알림**: 2분마다 다시 불러오고, 새 소식이 생기면 데스크톱 알림을 띄웁니다 (화면에서 알림 켜기 필요).

앞으로 만들 작업 큐(받은 일 → 작업 중 → 입력 대기 → 확인 필요 → PR 초안)는 [설계 문서](docs/design.md)에 정리돼 있습니다.

## 실행

Node 24 이상과 pnpm이 필요합니다.

```bash
pnpm install
cp .env.example .env   # 값 채우기
pnpm dev               # http://localhost:4321
```

### 설정 (`.env`)

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `JIRA_BASE_URL` | ✓ | Jira Cloud 사이트 주소 (예: `https://your-site.atlassian.net`) |
| `JIRA_EMAIL` | ✓ | Atlassian 계정 이메일 |
| `JIRA_API_TOKEN` | ✓ | [API 토큰](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `QA_PROJECTS` |  | QA 탭으로 분리할 프로젝트 키, 쉼표 구분 (예: `QA,QAM`) |
| `PORT` |  | 개발 서버 포트 (기본 4321) |

토큰은 Vite 개발 서버의 `/jira` 프록시에서만 인증 헤더로 붙습니다. 브라우저 코드에는 포함되지 않습니다.

## 구조

```
src/
├─ App.tsx                    # 상단 탭·검색·새로고침, 화면 조립
├─ config.ts                  # 환경 설정, QA/개발 구분
├─ jira/                      # Jira REST 조회와 응답 정리
│  ├─ api.ts                  #   JQL 조회, 페이지 넘김, queryOptions
│  ├─ normalize.ts            #   티켓·새 소식 이벤트로 변환
│  └─ types.ts
├─ components/                # 새 소식, 티켓 목록, 설정 안내
├─ hooks/                     # 읽음 상태, 데스크톱 알림, 탭(#qa/#dev)
└─ lib/                       # 날짜 형식, 상태 정렬, localStorage
```

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 실행 |
| `pnpm type-check` | 타입 검사 |
| `pnpm build` | 타입 검사 후 빌드 |
