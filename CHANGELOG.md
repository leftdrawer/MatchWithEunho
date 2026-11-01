# 변경 이력 (CHANGELOG) — match_with_eunho

> 규칙: 상위 `C:\AI Projects\AGENTS.md`. 최신 항목이 위. 이 폴더는 git이 없어 동기화 대상이 아님.

## 2026-11-02 — 이 폴더를 GitHub 저장소(leftdrawer/MatchWithEunho)와 git으로 연결

- 무엇: 이 폴더에 git을 만들고 `origin`(leftdrawer/MatchWithEunho, 공개)의 main을 받아 비교했다. 파일은 덮어쓰지 않았다(`git reset --mixed`로 기록만 맞춤). 코드·화면 파일(`index.html`·`worker.js`·`wrangler.toml`·`manifest.webmanifest`·`.gitignore`·fonts·icons)은 원격 main과 같다.
- 다른 점: 이 `CHANGELOG.md`는 원격 것과 내용이 다르다(이 폴더 기록 항목들, 원격의 10-06·10-07 항목은 없음). 원격에 있는 `README.md`·`설치안내.md`는 이 폴더에 없다(지우지 않았고 삭제로 커밋하지도 않음).
- 처리: 이 폴더의 `CHANGELOG.md`만 새 브랜치 `local-folder-changelog`에 커밋해 푸시했다. main은 건드리지 않았다. 이 폴더는 그 브랜치에 체크아웃되어 있다(main으로 바꾸면 이 파일이 원격 판으로 바뀌므로 바꾸지 않음).
- 왜: 은호당님이 점검 보고서의 저장소 정리 항목을 승인.
- 관련 파일: `CHANGELOG.md`, `.git/`
- 작업자: Grok Bot
- 남은 일: 두 CHANGELOG를 main에서 합칠지, `README.md`·`설치안내.md`를 이 폴더로 받을지(`git checkout origin/main -- README.md 설치안내.md`) 은호당님 결정.

## 2026-10-31 — 배포·푸시는 이미 되어 있음을 확인 (기록 빠진 10-30 작업)

- 사용자 지시: "나머지는 네 추천대로 일단 해봐"(남은 결정 가운데 match_with_eunho 배포). 추천은 이 폴더·GitHub 저장소·배포된 워커를 같은 판으로 맞추는 것이었는데, 확인해 보니 이미 맞춰져 있어 새로 배포하거나 푸시하지 않음.
- 확인한 것:
  - 이 폴더의 `index.html`·`worker.js`·`wrangler.toml`·`manifest.webmanifest`·`.gitignore`가 저장소 `leftdrawer/MatchWithEunho`(main)와 줄바꿈까지 맞춰 비교해 모두 같음. GitHub Pages의 `index.html`도 같음.
  - 워커 `eunho-form` 배포 기록: 2026-10-30 03:02~03:50(한국 시각)에 배포 여러 번과 비밀값 변경 6번. 마지막 배포는 03:50:40로, 이 폴더 `worker.js`가 마지막으로 바뀐 03:49:49의 51초 뒤다.
  - 데이터를 건드리지 않는 요청으로 본 배포본 동작이 이 폴더 `worker.js`와 같음: `/admin`은 인증 없이 로그인 폼(구글 로그인 버튼 포함), `/admin/export`는 인증 없이 401, `/admin/google`은 구글 동의 화면으로 303.
- 이 CHANGELOG에 기록이 없던 10-30 작업(파일로 확인한 것만): `worker.js`에 쿠키 로그인(로그인 폼에서 ADMIN_KEY를 한 번 넣으면 HMAC 서명 세션 쿠키 30일)·로그아웃, 구글 OAuth 로그인(`GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`·`ALLOWED_EMAIL` 비밀값), 응답 삭제 `/admin/delete`, 전체 내보내기 `/admin/export`가 생겼고, `index.html`이 바뀌었다(03:08). 누가 했는지는 기록이 없다.
- 그래서 10-28 항목의 남은 일(저장소에 올릴지, 배포할지)은 끝난 상태.
- 작업자: Kiro / Claude Opus 5.5
- 확인 못 한 것: 배포본 코드 자체를 내려받아 비교하지는 않음(배포 시각과 동작으로 판단). 결과 화면(점수 막대·사주 카드) 확인은 10-27부터 남아 있음.

## 2026-10-28 — worker.js 합치기 (이 폴더에만 저장, 푸시·배포 안 함)

- 사용자 지시: 이 폴더의 메모 기능을 유지하고, 저장소의 Bearer 인증과 제출 횟수 제한을 추가해 이 폴더에만 저장할 것. 푸시·배포는 하지 말 것
- 한 일: `worker.js`에 ① 헤더 설명 갱신 ② `/submit` IP당 1분 60회 제한(초과 시 429 + `Retry-After: 60`, KV `rl:` 키·2분 TTL) ③ 관리자 인증을 `Authorization: Bearer` 우선·`?key=` 폴백으로 변경(`/admin/note`도 같은 인증). 메모 기능(`/admin/note`, KV `m:` 키, 목록·상세의 메모 입력칸)은 그대로
- 검증: `node --check` 문법 통과. 가짜 KV로 시험해 제출 60회 통과·61번째 429, 다른 IP 통과, `rl:` 키가 응답 목록에 안 섞임, 인증 없음/틀림 401·Bearer(대소문자·공백 허용)·`?key=` 200, 메모 저장·목록과 상세 표시·삭제, manifest·루트 응답 확인
- 확인 못 함: 실제 Cloudflare KV·`CF-Connecting-IP`에서의 동작. 저장소(`leftdrawer/MatchWithEunho`)의 `worker.js`와는 아직 다름(저장소에는 메모 기능 없음)
- 주의: Bearer로 접속하면 화면 안 링크·메모 저장에 쓰는 `?key=`가 비어 브라우저 화면 조작에는 `?key=` 방식이 필요함(저장소 버전과 같은 동작)
- 안 한 것: GitHub 푸시, wrangler 배포. 배포된 워커는 그대로
- 작업자: Claude Code / Sonnet 5.5
- 남은 일: 저장소에 올릴지, Cloudflare에 배포할지는 사용자 결정(배포는 `wrangler login` 필요)

## 2026-10-28 — 저장소와 이 폴더의 파일 비교 (덮어쓰기 보류)

- 사용자 지시: `worker.js`, `wrangler.toml`, `manifest.webmanifest`, `.gitignore`를 저장소 최신 버전으로 맞출 것. 덮기 전에 차이를 보여줄 것
- 결과: `wrangler.toml`·`manifest.webmanifest`·`.gitignore`는 줄바꿈(CRLF/LF)만 다르고 내용은 같음 → 바꿀 것 없음
- `worker.js`는 **서로 갈라져 있음.** 저장소에는 있고 이 폴더에는 없는 것: 관리자 `Authorization: Bearer` 인증, `/submit` IP당 1분 60회 제한. 이 폴더에는 있고 저장소에는 없는 것: 관리자 화면의 사람별 실명·메모 기능(`/admin/note`, KV `m:` 키, 메모 입력칸). 저장소로 덮으면 메모 기능이 사라지므로 **덮어쓰지 않음.** 이전 안내(“저장소가 더 최신”)는 반쪽짜리였음
- 배포된 Cloudflare 워커가 어느 쪽인지는 로그인 만료로 확인하지 못함
- 작업자: Claude Code / Sonnet 5.5
- 남은 일: 합칠지 / 저장소 것으로 덮을지 사용자 결정

## 2026-10-27 — 설문 화면 GitHub Pages 배포 완료

- 사용자 지시: `leftdrawer/MatchWithEunho` 저장소의 `index.html`을 새 버전으로 교체해 푸시할 것
- 한 일: 저장소를 임시 폴더에 받아 `index.html`만 교체(바뀐 곳은 `<style>` 블록뿐임을 확인)하고, 저장소 `CHANGELOG.md`에 항목을 더해 푸시(커밋 `4aa3776`). 저장소의 다른 파일(`worker.js` 등)은 건드리지 않음. 저장소의 `worker.js`는 이 폴더 것보다 새 버전(10월 6일 보안 수정 포함)이라 **이 폴더의 `worker.js`·`wrangler.toml`·`.gitignore`·`manifest.webmanifest`는 저장소와 다름** — 나중에 이 폴더에서 wrangler로 배포하면 옛 워커가 덮어쓸 수 있으니 먼저 저장소 것을 받아 올 것
- 확인: GitHub Pages 빌드 `built`, 라이브 페이지(`leftdrawer.github.io/MatchWithEunho`)에 새 스타일 반영 확인. 폰에서 직접 본 것은 아님
- 작업자: Claude Code / Sonnet 5.5

## 2026-10-27 — 배포 경로 확인 (wrangler로는 설문 화면이 안 올라감)

- 사용자 지시: wrangler로 배포. 실행 전 확인한 결과 **배포하지 않음**
- 이유 1: `wrangler.toml`은 `worker.js`(응답 수집 API, `eunho-form.phlogos1.workers.dev`)만 배포하고 `index.html`은 포함하지 않음. 설문 화면은 공개 GitHub 저장소 `leftdrawer/MatchWithEunho`의 GitHub Pages(`leftdrawer.github.io/MatchWithEunho`)에서 서비스되며, 현재 라이브 파일은 이번 변경 전 `index.html`과 바이트 단위로 같음
- 이유 2: wrangler 로그인 만료(`Not logged in`). 어차피 `wrangler login`이 필요함
- 화면을 올리려면 위 GitHub 저장소의 `index.html`을 교체해 푸시해야 함. 사용자 확인 대기
- 작업자: Claude Code / Sonnet 5.5

## 2026-10-27 — 화면을 Apple HIG 기준으로 다듬음 (기존 색 유지)

- 사용자 지시: `match_with_eunho`도 Apple 디자인 가이드라인(HIG)으로 바꾸되, **HIG 시스템 색으로 대체하지 말고 기존 색을 살리면서** 적용할 것
- 색: `:root`의 먹색·한지색·놋빛·주사홍·쪽빛 등 팔레트 변수 값은 한 글자도 바꾸지 않음. 다크 전용 화면이라는 정체성도 그대로(`color-scheme: dark`만 명시). 예외: 어두운 배경에서 `#873B32`(주사홍) 글자가 읽히지 않아, 글자로 쓰는 경고·뱃지·미응답 문항 제목에만 주사홍을 밝게 한 톤 `#D98A80`을 새로 썼음
- 적용한 HIG(타이포그래피·색상·레이아웃 페이지 기준): 시스템 글꼴 우선(`-apple-system`, `Apple SD Gothic Neo`, 없으면 로컬 Pretendard), 본문 17px·제목 28px·표지 34px, 얇은 굵기(300) 제거와 12px 미만 글자 제거, 문항을 묶음 카드(반경 22)로, 입력·선택지를 채운 둥근 면(반경 14)으로, 알약 버튼과 칩, 척도 원을 44px 높이로 키우고 좁은 화면에서 줄어들게 함, 아래 막대에만 유리 재질, 누를 때 눌리는 반응, 포커스 링 3px, 안전 영역 여백, 움직임 줄이기 설정 시 전환 끔
- 바꾸지 않은 것: 문항·채점·동의 문구·JS·`worker.js`·저장 방식. `index.html`의 `<style>` 블록만 교체
- 확인: 390px·320px에서 표지·동의·기본 정보·예/아니오·척도·선택지 화면을 직접 보고 가로 넘침과 JS 오류 없음을 확인. **결과 화면(점수 막대·사주 카드)은 끝까지 답을 채우지 않아 확인하지 못함**
- 배포: 이 폴더는 Cloudflare Workers(`wrangler.toml`)로 올리는 방식이며 **아직 배포하지 않음**. 지금 변경은 이 컴퓨터에만 있음
- 되돌리기: 변경 전 `index.html`은 이 세션 임시 폴더에 복사본이 있으나 영구 보관은 아님
- 관련 파일: `index.html`
- 작업자: Claude Code / Sonnet 5.5
- 남은 일: 결과 화면 확인, 배포 여부 결정
