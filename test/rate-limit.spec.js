import { describe, expect, it } from "vitest";
import { call, env } from "./call.js";

const ORIGIN = "https://leftdrawer.github.io";

function ip() {
  return `test-${crypto.randomUUID()}`;
}

function submit(ip, id = "abc123") {
  return call("/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ip ? { "CF-Connecting-IP": ip } : {}),
    },
    body: JSON.stringify({ id, name: "테스터", step: 1, of: 10 }),
  });
}

async function seed(ip, count, start = Date.now()) {
  await env.DB.put(
    "rl:" + ip,
    JSON.stringify({ start, count }),
    { expirationTtl: 120 }
  );
}

describe("/submit 레이트 리밋", () => {
  it("같은 IP는 1분에 60회까지 허용하고 61회째는 429이다", async () => {
    const who = ip();
    for (let n = 1; n <= 60; n++) {
      const res = await submit(who, `ok${n}`);
      expect(res.status, `request ${n}`).toBe(200);
      expect(await res.text()).toBe("ok");
    }
    const blocked = await submit(who, "over");
    expect(blocked.status).toBe(429);
    expect(await blocked.text()).toBe("too many requests");
    expect(blocked.headers.get("Retry-After")).toBe("60");
    expect(blocked.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(await env.DB.get("r:over")).toBeNull();

    const rec = await env.DB.get("rl:" + who, "json");
    expect(rec.count).toBe(61);
  });

  it("한도에 걸린 뒤에는 거절하고, 한도 직전과 1분이 지난 창은 다시 허용한다", async () => {
    const full = ip();
    await seed(full, 60);
    const blocked = await submit(full, "full");
    expect(blocked.status).toBe(429);
    expect((await env.DB.get("rl:" + full, "json")).count).toBe(61);
    expect(await env.DB.get("r:full")).toBeNull();

    const almost = ip();
    await seed(almost, 59);
    const allowed = await submit(almost, "almost");
    expect(allowed.status).toBe(200);
    expect((await env.DB.get("rl:" + almost, "json")).count).toBe(60);
    expect((await env.DB.get("r:almost", "json")).id).toBe("almost");

    const stale = ip();
    await seed(stale, 60, Date.now() - 120_000);
    const reset = await submit(stale, "reset");
    expect(reset.status).toBe(200);
    const rec = await env.DB.get("rl:" + stale, "json");
    expect(rec.count).toBe(1);
    expect(rec.start).toBeGreaterThan(Date.now() - 5_000);
  });

  it("IP마다 따로 세고, IP가 없으면 unknown 통을 함께 쓴다", async () => {
    const a = ip();
    const b = ip();
    await seed(a, 60);
    expect((await submit(a, "a")).status).toBe(429);
    expect((await submit(b, "b")).status).toBe(200);

    await seed("unknown", 60);
    const shared = await submit(undefined, "shared");
    expect(shared.status).toBe(429);
    expect((await env.DB.get("rl:unknown", "json")).count).toBe(61);
  });

  it("OPTIONS와 /submit 이 아닌 경로는 한도에 포함되지 않는다", async () => {
    const who = ip();
    for (let n = 0; n < 61; n++) {
      const opt = await call("/submit", {
        method: "OPTIONS",
        headers: { "CF-Connecting-IP": who },
      });
      expect(opt.status).toBe(200);
      expect(opt.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    }
    expect((await submit(who, "after-options")).status).toBe(200);
    expect(await env.DB.get("rl:" + who, "json")).toMatchObject({ count: 1 });

    for (let n = 0; n < 61; n++) {
      const home = await call("/", { headers: { "CF-Connecting-IP": who } });
      expect(home.status).toBe(200);
    }
    expect((await env.DB.get("rl:" + who, "json")).count).toBe(1);
  });
});
