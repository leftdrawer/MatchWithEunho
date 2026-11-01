# MatchWithEunho

은호 데이트 궁합 설문 — PWA 프론트엔드 + Cloudflare Workers 응답 수집.

- 설문 배포: https://leftdrawer.github.io/MatchWithEunho/ (GitHub Pages)
- 응답 수집: Cloudflare Workers (`worker.js`) + KV

## 구조

- `index.html` — 설문 PWA 본체
- `worker.js` — 응답 수집 워커. Cloudflare Workers 편집기에 그대로 붙여넣어 배포
- `설치안내.md` — 워커·KV·ADMIN_KEY 설정 가이드
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA 지원 파일

## 관리자

- 응답 목록: `https://<워커주소>/admin` (인증 필요)
- 인증: `Authorization: Bearer <ADMIN_KEY>` 헤더 권장
  (기존 `?key=` 쿼리 방식도 동작하지만 URL에 키가 남으므로 헤더 사용을 권장)
- 제출 API 레이트 리밋: IP당 1분 60회 (`/submit`)

## 개발

워커 동작은 그대로 두고, 관리자 인증과 `/submit` 레이트 리밋만 로컬에서 검사한다.
Node.js 22 이상이 필요하다. 배포 비밀이나 Cloudflare 로그인은 쓰지 않는다.

```bash
npm test
```

## 설정

`설치안내.md`의 1~4단계를 따라 워커·KV(`DB`)·`ADMIN_KEY` 시크릿을 설정하고,
5단계에서 `index.html`의 `submit.url`에 워커 주소를 넣는다.
