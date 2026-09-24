/* 은호 데이트 궁합 — 응답 수집 워커
   Cloudflare Workers에 그대로 붙여 넣으면 됩니다.
   필요한 것: KV 네임스페이스 하나(변수명 DB), 비밀값 하나(ADMIN_KEY).

   POST /submit   설문 페이지가 페이지를 넘길 때마다 호출합니다.
   GET  /admin?key=...   응답 목록을 봅니다.
   GET  /admin/1a2b3c?key=...   한 사람의 답을 전부 봅니다.
*/

const ORIGIN = '*';   // 배포한 페이지 주소로 좁히면 더 안전합니다. 예: 'https://leftdrawer.github.io'

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/submit' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return new Response('bad json', { status: 400, headers: cors }); }
      const id = String(body.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 32);
      if (!id) return new Response('no id', { status: 400, headers: cors });
      const prev = await env.DB.get('r:' + id, 'json');
      const rec = {
        id,
        name: String(body.name || '').slice(0, 40),
        at: String(body.at || ''),
        step: Number(body.step) || 0,
        of: Number(body.of) || 0,
        done: !!body.done,
        total: body.total ?? null,
        grade: body.grade ?? null,
        gates: body.gates || [],
        answers: body.answers || {},
        first: prev?.first || new Date().toISOString(),
        last: new Date().toISOString()
      };
      await env.DB.put('r:' + id, JSON.stringify(rec));
      return new Response('ok', { headers: cors });
    }

    if (url.pathname.startsWith('/admin')) {
      if (url.searchParams.get('key') !== env.ADMIN_KEY) return new Response('no', { status: 401 });
      const one = url.pathname.split('/')[2];
      const list = await env.DB.list({ prefix: 'r:' });
      const rows = [];
      for (const k of list.keys) rows.push(await env.DB.get(k.name, 'json'));
      rows.sort((a, b) => (b?.last || '').localeCompare(a?.last || ''));
      if (one) {
        const r = rows.find(x => x && x.id === one);
        if (!r) return new Response('없음', { status: 404 });
        return html(detail(r));
      }
      return html(table(rows.filter(Boolean), url.searchParams.get('key')));
    }

    return new Response('은호당', { status: 200 });
  }
};

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = b => new Response(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>응답</title><style>
body{margin:0;background:#0A0A0A;color:#F3EFE7;font:15px/1.6 'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif;padding:1.5rem}
h1{font-size:1.3rem;font-weight:600;margin:0 0 1.25rem}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid #3A332B}
th{color:#A58D5C;font-weight:600;font-size:.78rem;letter-spacing:.1em}
a{color:#F3EFE7}
.done{color:#A58D5C}.gate{color:#873B32}
.bar{display:inline-block;height:3px;background:#A58D5C;vertical-align:middle}
dl{margin:0}dt{color:#A58D5C;font-size:.8rem;margin-top:.9rem}dd{margin:.15rem 0 0}
</style></head><body>${b}</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

function table(rows, key) {
  const tr = rows.map(r => {
    const pct = r.of ? Math.round(r.step / r.of * 100) : 0;
    const state = r.done ? (r.gates?.length ? `<span class="gate">탈락</span>` : `<span class="done">완료</span>`) : `${r.step}/${r.of}`;
    return `<tr>
      <td><a href="/admin/${esc(r.id)}?key=${encodeURIComponent(key)}">${esc(r.name) || '(무명)'}</a></td>
      <td>${state}<div class="bar" style="width:${pct}%"></div></td>
      <td>${r.total ?? '—'}</td>
      <td>${esc((r.last || '').slice(0, 16).replace('T', ' '))}</td>
    </tr>`;
  }).join('');
  return `<h1>응답 ${rows.length}건</h1><table>
    <tr><th>닉네임</th><th>진행</th><th>점수</th><th>마지막</th></tr>${tr}</table>`;
}

function detail(r) {
  const a = r.answers || {};
  const dd = Object.keys(a).map(k => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(a[k]) ? a[k].join(', ') : a[k])}</dd>`).join('');
  return `<h1>${esc(r.name) || '(무명)'} · ${r.total ?? '—'}점</h1>
    <p>${r.done ? '완료' : `${r.step}/${r.of} 진행`}${r.gates?.length ? ' · 탈락: ' + esc(r.gates.join(', ')) : ''}</p>
    <p>${esc((r.first || '').slice(0, 16).replace('T', ' '))} → ${esc((r.last || '').slice(0, 16).replace('T', ' '))}</p>
    <dl>${dd}</dl>`;
}
