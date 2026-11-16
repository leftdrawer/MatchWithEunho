# AGENTS.md — match_with_eunho

> 상위 규칙 `C:\AI Projects\AGENTS.md`를 함께 따른다. 작업 전 이 폴더 `CHANGELOG.md` 맨 위 항목부터 읽는다.

## 목적
- Cloudflare Worker(`worker.js`, `wrangler.toml`)와 정적 화면 `index.html`로 된 신청·궁합 폼 앱. 원격 저장소 leftdrawer/MatchWithEunho.

## 주의
- 이 UI 업데이트는 사용자 승인에 따라 `main`에 반영한다. `local-folder-changelog` side branch는 업데이트하거나 푸시하지 않는다.
- 비밀값(ADMIN_KEY, GOOGLE_CLIENT_SECRET 등)은 wrangler secret에만 둔다. 파일에 적지 않는다.
- 배포(`wrangler deploy`)는 사용자 승인 후에만.
