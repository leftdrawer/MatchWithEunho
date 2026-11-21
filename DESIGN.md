# 매칭 설문 디자인 시스템

## 현재 기준 — 2026-11-13

- 시각 기반은 Astryx Chocolate(`@astryxdesign/theme-chocolate` 0.7.16, MIT)이다. `vendor/astryx/theme-chocolate.css`를 로컬에 두고 `<html data-astryx-theme="chocolate">`로 켠다. 색·글자 크기·모서리·간격은 그 토큰을 쓴다.
- Chocolate를 고른 이유: 설문은 먹색·한지·놋빛에 가까운 따뜻한 편지다. Stone의 악센트는 차가운 잉크(`#25252a` / `#f0f0f9`)라서, 기존 화면은 로즈 베이지를 다시 하드코딩해야 했다. Chocolate 팔레트(`#8C5927`, `#B88859`, `#EDE4D4`, `#FFFCF7`, 어두운 면 `#141010`)가 그 온기를 테마 안에서 가진다.
- 제품에서 의미가 있는 색만 토큰에 대응한다. 경고·빠진 문항·탈락 뱃지는 `--color-text-error`. 맞음 안내는 `--color-text-success`. 본문 보조 글자는 라이트 카드 위에서 `--color-text-secondary`가 WCAG AA에 못 미쳐, 라이트에서는 본문색과 섞은 `--text-quiet`를 쓴다.
- Apple HIG는 토큰이 정하지 않는 것만 보조한다. 터치 44px(`--target-min`), `:focus-visible` 링, `color-scheme: light dark`, `prefers-reduced-motion`, 안전 영역.
- 한국어는 Astryx 글꼴(Albert Sans, Fraunces) 뒤에 Apple SD Gothic Neo, Pretendard, 맑은 고딕을 둔다. 글꼴 파일은 로컬이다. 문항 문구와 단일 열 흐름은 바꾸지 않는다.
- stageshow 일러스트는 넣지 않는다. 표지는 제품 홍보 히어로가 아니라 은호의 편지다.
