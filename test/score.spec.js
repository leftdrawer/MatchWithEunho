import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import vm from "node:vm";

function loadScore() {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const lunar = scripts.find((s) => s.includes("Solar.fromYmd"));
  const scoring = scripts.find((s) => s.includes("function score("));
  const context = vm.createContext({ console, Date, Math, Number, String, Array, Object, JSON, isNaN });
  context.globalThis = context;
  context.window = context;
  vm.runInContext(lunar, context, { filename: "lunar.js" });
  vm.runInContext(scoring, context, { filename: "score.js" });
  return context;
}

const { score } = loadScore();
const GRADES = ["만나보죠", "대화부터", "인연은 신령님께", "다음 생에"];

describe("설문 채점", () => {
  it("답이 비어도 0에서 100 사이의 등급을 낸다", () => {
    const result = score({});
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(GRADES).toContain(result.grade);
    expect(result.gates).not.toContain("만 19세 미만");
  });

  it("강아지 알레르기 예와 만 19세 미만은 탈락 사유가 된다", () => {
    const result = score({ G_dog: "예", P02: "2015-01-01" });
    expect(result.gates).toContain("강아지 알레르기. 감자가 먼저입니다");
    expect(result.gates).toContain("만 19세 미만");
  });

  it("생년월일이 있으면 사주 점수를 계산한다", () => {
    const result = score({ P02: "1996-09-29", P03: "14:26", P04: "서울" });
    expect(result.detail.F.chart.year).toMatch(/\S/);
    expect(result.detail.F.chart.hasTime).toBe(true);
    expect(result.F).toBeGreaterThan(0);
  });
});
