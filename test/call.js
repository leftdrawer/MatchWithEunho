import worker from "../worker.js";
import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";

export { env };

export async function call(path, init = {}) {
  const request = new Request("https://worker.test" + path, init);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

export function formBody(fields) {
  return new URLSearchParams(fields).toString();
}
