import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// 로컬 테스트 전용 가짜 값이다. 배포된 ADMIN_KEY가 아니며 저장소의 비밀이 아니다.
const TEST_ADMIN_KEY = "test-admin-key";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest({
            // wrangler.toml의 KV id는 운영 네임스페이스다. 원격으로 붙지 않게 로컬에서만 돌린다.
            remoteBindings: false,
            wrangler: { configPath: "./wrangler.toml" },
            miniflare: {
              bindings: { ADMIN_KEY: TEST_ADMIN_KEY },
            },
          }),
        ],
        test: {
          name: "worker",
          include: ["test/**/*.spec.js"],
          exclude: ["test/score.spec.js"],
        },
      },
      {
        test: {
          name: "score",
          environment: "node",
          include: ["test/score.spec.js"],
        },
      },
    ],
  },
});
