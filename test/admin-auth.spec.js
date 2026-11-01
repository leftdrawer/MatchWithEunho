import { describe, expect, it } from "vitest";
import { call, env, formBody } from "./call.js";

const KEY = () => env.ADMIN_KEY;

function login(pw) {
  return call("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({ pw }),
  });
}

async function sessionCookie(pw = KEY()) {
  const res = await login(pw);
  const setCookie = res.headers.get("Set-Cookie") || "";
  const match = setCookie.match(/eh_sess=([^;]+)/);
  return { res, setCookie, cookie: match ? `eh_sess=${match[1]}` : "" };
}

// worker.js의 세션 쿠키와 같은 형식("<만료시각>.<HMAC>")을 만든다.
// 서명 함수는 내보내지 않으므로, 만료·위조 거절만 응답으로 확인한다.
async function signedSession(exp, secret = KEY()) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(exp)));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eh_sess=${exp}.${b64}`;
}

describe("관리자 인증", () => {
  it("인증 없이 /admin 은 로그인 화면이고, 그 외 관리자 경로는 401이다", async () => {
    const page = await call("/admin");
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("비밀번호로 로그인");

    for (const path of ["/admin/export", "/admin/abc123", "/admin/login"]) {
      const res = await call(path);
      expect(res.status, path).toBe(401);
      expect(await res.text()).toBe("no");
    }

    const note = await call("/admin/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person: "이름:테스트", note: "메모" }),
    });
    expect(note.status).toBe(401);

    const del = await call("/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "abc123" }),
    });
    expect(del.status).toBe(401);
  });

  it("Bearer 키가 맞으면 통과하고, 틀리거나 비어 있으면 거절한다", async () => {
    const ok = await call("/admin/export", {
      headers: { Authorization: `Bearer ${KEY()}` },
    });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toContain("application/json");
    expect(Array.isArray(await ok.json())).toBe(true);

    const spaced = await call("/admin/export", {
      headers: { Authorization: `bearer   ${KEY()}  ` },
    });
    expect(spaced.status).toBe(200);

    const wrong = await call("/admin/export", {
      headers: { Authorization: "Bearer not-the-key" },
    });
    expect(wrong.status).toBe(401);

    const empty = await call("/admin/export", {
      headers: { Authorization: "Bearer    " },
    });
    expect(empty.status).toBe(401);
  });

  it("?key= 는 Bearer가 없을 때만 쓰고, Bearer가 있으면 쿼리보다 우선한다", async () => {
    const query = await call(`/admin/export?key=${encodeURIComponent(KEY())}`);
    expect(query.status).toBe(200);

    const wrongQuery = await call("/admin/export?key=wrong");
    expect(wrongQuery.status).toBe(401);

    const bearerWins = await call(`/admin/export?key=wrong`, {
      headers: { Authorization: `Bearer ${KEY()}` },
    });
    expect(bearerWins.status).toBe(200);

    const badBearerIgnoresQuery = await call(`/admin/export?key=${encodeURIComponent(KEY())}`, {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(badBearerIgnoresQuery.status).toBe(401);

    const basicFallsThrough = await call(`/admin/export?key=${encodeURIComponent(KEY())}`, {
      headers: { Authorization: `Basic ${KEY()}` },
    });
    expect(basicFallsThrough.status).toBe(200);
  });

  it("비밀번호가 맞으면 세션 쿠키를 주고, 그 쿠키로 관리자 화면이 열린다", async () => {
    const { res, setCookie, cookie } = await sessionCookie();
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe("/admin");
    expect(setCookie).toMatch(/eh_sess=[^;]+/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/admin");
    expect(setCookie).toContain("Max-Age=2592000");

    const page = await call("/admin", { headers: { Cookie: cookie } });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("로그아웃");
    expect(html).not.toContain("비밀번호로 로그인");

    const exported = await call("/admin/export", { headers: { Cookie: cookie } });
    expect(exported.status).toBe(200);
  });

  it("비밀번호가 틀리면 쿠키를 주지 않고 오류를 보여 준다", async () => {
    const wrong = await login("wrong-password");
    expect(wrong.status).toBe(200);
    expect(wrong.headers.get("Set-Cookie")).toBeNull();
    expect(await wrong.text()).toContain("비밀번호가 맞지 않습니다.");

    const sameLength = await login("x".repeat(KEY().length));
    expect(sameLength.status).toBe(200);
    expect(sameLength.headers.get("Set-Cookie")).toBeNull();

    const notAForm = await call("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pw: KEY() }),
    });
    expect(notAForm.status).toBe(200);
    expect(notAForm.headers.get("Set-Cookie")).toBeNull();
    expect(await notAForm.text()).toContain("비밀번호가 맞지 않습니다.");
  });

  it("서명이 틀리거나 만료된 세션 쿠키는 거절한다", async () => {
    const future = Date.now() + 60_000;
    const valid = await call("/admin/export", { headers: { Cookie: await signedSession(future) } });
    expect(valid.status).toBe(200);

    const forged = await call("/admin/export", {
      headers: { Cookie: `${await signedSession(future)}x` },
    });
    expect(forged.status).toBe(401);

    const otherSecret = await call("/admin/export", {
      headers: { Cookie: await signedSession(future, "different-secret") },
    });
    expect(otherSecret.status).toBe(401);

    const expired = await call("/admin/export", {
      headers: { Cookie: await signedSession(Date.now() - 1000) },
    });
    expect(expired.status).toBe(401);

    const malformed = await call("/admin/export", { headers: { Cookie: "eh_sess=not-a-token" } });
    expect(malformed.status).toBe(401);
  });

  it("로그아웃은 세션 쿠키를 지운다", async () => {
    const { cookie } = await sessionCookie();
    const out = await call("/admin/logout", { headers: { Cookie: cookie } });
    expect(out.status).toBe(303);
    expect(out.headers.get("Location")).toBe("/admin");
    const cleared = out.headers.get("Set-Cookie") || "";
    expect(cleared).toContain("eh_sess=");
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("Path=/admin");

    const again = await call("/admin/export");
    expect(again.status).toBe(401);
  });

  it("구글 로그인이 없으면 503이고, 콜백의 잘못된 state는 로그인 화면으로 돌려보낸다", async () => {
    const start = await call("/admin/google");
    expect(start.status).toBe(503);
    expect(await start.text()).toContain("구글 로그인이 설정되지 않았습니다.");

    const cancelled = await call("/admin/callback?error=access_denied");
    expect(cancelled.status).toBe(200);
    expect(await cancelled.text()).toContain("구글 로그인이 취소되었습니다");

    const missing = await call("/admin/callback");
    expect(missing.status).toBe(200);
    expect(await missing.text()).toContain("로그인 세션이 만료되었습니다.");

    const badState = await call("/admin/callback?code=not-a-real-code&state=nope");
    expect(badState.status).toBe(200);
    expect(await badState.text()).toContain("로그인 세션이 만료되었습니다.");
  });
});
