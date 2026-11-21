# 변경 이력 (CHANGELOG)

## 2026-11-21 — 저장소 점검

- 무엇: 머지 뒤 저장소를 점검했다. 쓰이지 않는 Pretendard Light를 뺐다. 입력칸이 없는 문항의 잘못된 `for`를 뺐다. 관리자 화면의 포커스 링과 44px 높이를 보강했다. 채점 함수에 최소 테스트를 더했다. README에서 없는 `sw.js` 설명을 고쳤다.
- 왜: 동작·주소·저장 형식은 유지한 채, 확인된 접근성·용량·문서 어긋남만 고치기 위해.
- 관련 파일: `index.html`, `worker.js`, `test/score.spec.js`, `vitest.config.js`, `README.md`, `fonts/Pretendard-Light.subset.woff2`(삭제), `CHANGELOG.md`
- 작업자: Cursor Cloud Agent (Grok Bot 구록이 경유)
- 남은 일·확인 필요: 워커 화면 수정은 저장소에만 있다. Cloudflare에 반영하려면 사람이 `설치안내.md`대로 워커를 다시 넣어야 한다. 이번 점검에서는 배포하지 않음.

## 2026-11-13 — astryx 테마 이식으로 UX/UI 정비

- 무엇을 바꿨는지 / 사용자 지시: "astryx와 stageshow를 활용해 웹에 배포된 사이트 UXUI 손보기", 테마만 이식하고 HIG는 보조 기준. React로 다시 쓰지 않고 `index.html`의 스타일만 Astryx Chocolate 0.7.16 토큰(색, 글꼴, 크기, 모서리, 간격)으로 바꿨다. 라이트·다크는 `color-scheme`과 테마의 `light-dark()`를 따른다. 한국어 폴백은 Apple SD Gothic Neo / Pretendard. stageshow 일러스트는 마케팅 히어로가 없어 넣지 않았다. 문항·채점·URL·Worker·KV 설정은 그대로다.
- 왜: 설문 분위기가 따뜻한 먹색·한지·놋빛이라 Chocolate가 Stone보다 맞다. Stone 0.7.16 악센트는 차가운 잉크색이라 기존 화면이 로즈 베이지를 다시 박아 두고 다크만 강제했다. 테마 토큰으로 바꾸면 라이트(한지)와 다크(먹)가 한 팔레트에서 나오고, 포커스·44px·reduced-motion은 토큰이 비운 자리만 HIG로 메운다.
- 관련 파일: `index.html`, `vendor/astryx/theme-chocolate.css`, `vendor/astryx/fonts.css`, `vendor/astryx/LICENSE`, `fonts/albert-sans-latin-wght-normal.woff2`, `fonts/fraunces-latin-full-normal.woff2`, `fonts/jetbrains-mono-latin-400-normal.woff2`, `fonts/LICENSE-*.txt`, `manifest.webmanifest`, `DESIGN.md`, `CHANGELOG.md`. 제거: `astryx-stone-0.7.16.css`, `ASTRYX-LICENSE-0.7.16.txt`
- 작업자: Cursor Cloud Agent (Grok Bot 구록이 경유)
- 남은 일·확인 필요: 배포는 하지 않음. GitHub Pages는 이 PR을 머지해야 바뀐다. `@scope`가 없는 2024년 이전 브라우저는 `astryx-base` 폴백 토큰만 쓴다. 실기기 360px·VoiceOver는 헤드리스 스크린샷으로만 확인했다. 라이트 보조 글자는 테마 `--color-text-secondary`가 카드 위에서 AA 미달이라 `--text-quiet`로 보정했다.

## 2026-11-16 — Astryx Stone 설문 화면 정돈

- 무엇: Astryx Stone 0.7.16(MIT)을 로컬 CSS로 연결하고 입력·문항·결과 면, 본문 대비, 포커스와 좁은 화면 여백을 보강했다. 기존 로즈 베이지 정체성·설문·점수·Worker 흐름은 유지했다.
- 왜: 설문 동작을 바꾸지 않고 시각 토큰과 포커스 상태를 일관되게 하기 위해.
- 관련 파일: `index.html`, `astryx-stone-0.7.16.css`, `ASTRYX-LICENSE-0.7.16.txt`, `DESIGN.md`
- 작업자: Cue AI assistant
- 남은 일·확인 필요: 합성 입력으로 렌더링·포커스·좁은 화면 확인 후 로컬 커밋. 푸시·배포는 하지 않음.

## 2026-11-02 — AGENTS.md 새로 만듦

- 무엇: 에이전트가 먼저 읽을 짧은 `AGENTS.md`(목적·구성·주의)를 만듦. 내용은 README·CHANGELOG에서 확인한 것만.
- 관련 파일: `AGENTS.md`(새로)
- 작업자: Grok Bot (은호당님 승인 'A와 C부터', 점검 Page 자동 적용 항목)

## 2026-11-02

- **워커 개발 도구·테스트·CI 추가.** `package.json`과 lockfile로 wrangler·vitest를 고정. `worker.js`의 관리자 인증(Bearer·`?key=`·세션 쿠키)과 `/submit` 레이트 리밋(IP당 1분 60회)을 로컬에서 검사. GitHub Actions가 push·pull request에서 `npm test`를 실행하며 시크릿은 필요 없음. 설문·워커 동작은 변경 없음.

## 2026-10-27

- **설문 화면을 Apple 디자인 가이드라인(HIG) 기준으로 다듬음.** `index.html`의 스타일만 교체. 먹색·한지색·놋빛·주사홍·쪽빛 팔레트 값은 그대로 두고, 묶음 카드·알약 버튼·44px 터치 영역·유리 재질 아래 막대·시스템 글꼴 우선으로 바꿈. 문항·채점·JS·워커는 변경 없음. 경고·뱃지 글자에만 주사홍을 밝게 한 톤(`#D98A80`)을 추가.

## 2026-10-07

- **설치안내.md 중복 구간 제거** (75fc9f9). 문서 앞부분(제목·도입·1~2단계)과 뒷부분(3~7단계·Supabase)이 각각 두 번씩 들어가 191줄로 부풀려져 있었음. 헤더 인증 설명이 포함된 완전한 복사본 하나만 남기고 99줄로 정리.

## 2026-10-06

- **관리자 인증에 `Authorization: Bearer` 헤더 지원** (5314d43). 기존에는 `?key=` 쿼리 파라미터로만 인증해서 관리자 키가 브라우저 히스토리·프록시 로그에 남을 수 있었음. 이제 `Authorization: Bearer <ADMIN_KEY>` 헤더를 우선 확인하고, `?key=`는 하위 호환용으로 유지. 기존 북마크·PWA 매니페스트는 그대로 동작.
- **`/submit` 레이트 리밋 추가** (5314d43). 제한이 없어 스팸·봇이 아무 데이터나 밀어넣을 수 있었음. IP당 1분 60회 초과 시 `429 + Retry-After: 60` 반환. KV(`DB`)에 2분 TTL 카운터 사용. 정상 설문 속도에는 영향 없음.
- **설치안내.md에 헤더 인증 사용법 추가** (aa4aa54). 6단계에 curl 예시와 함께 문서화.
- **루트 README.md 추가** (9516d66). 저장소 첫 화면용 프로젝트 설명.
