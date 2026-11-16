# 매칭 설문 디자인 시스템

## 현재 기준 — 2026-11-16

- 시각 기반: Astryx Stone `@astryxdesign/theme-stone` 0.7.16 (MIT). `astryx-stone-0.7.16.css`를 로컬에서 사용하고 `fonts.css`는 제외합니다. 한국어는 기존 로컬 Pretendard 폰트를 우선해 표시합니다.
- 제품 고유 의미: 따뜻한 짙은 화면, 로즈 베이지 강조, 문항 상태·경고색과 설문 언어는 그대로 유지합니다. 면·글자·입력·테두리 토큰은 Astryx Stone을 사용하고, 폼과 결과 카드에는 테두리 중심 구분을 씁니다.
- 사용 원칙: 한 화면에서 질문을 차분히 읽고 답하도록 단일 열 흐름을 유지합니다. 좁은 화면에서 입력과 선택지가 잘리지 않게 하고, 키보드 포커스와 충분한 대비, reduced-motion을 지원합니다. 제출·동의·점수·Worker 요청 동작은 바꾸지 않습니다.
- 참고한 인터페이스: hairlineui.com, 21st.dev, designeer.xyz, reactbits.dev, magicui.design, uiverse.io의 구분·선택·상태 표현만 참고하며 설문 동작은 새로 만들지 않습니다.
