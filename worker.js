/* 은호 데이트 궁합 — 응답 수집 워커
   Cloudflare Workers에 그대로 붙여 넣으면 됩니다.
   필요한 것: KV 네임스페이스 하나(변수명 DB), 비밀값 하나(ADMIN_KEY).

   POST /submit   설문 페이지가 페이지를 넘길 때마다 호출합니다.
   GET  /admin?key=...   응답 목록을 봅니다.
   GET  /admin/1a2b3c?key=...   한 사람의 답을 전부 봅니다.
*/

const ORIGIN = 'https://leftdrawer.github.io';   // 배포한 페이지 주소로 좁혀 두었습니다.

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
        warns: body.warns || prev?.warns || [],
        breakdown: body.breakdown || prev?.breakdown || null,
        saju: body.saju || prev?.saju || null,
        labeled: body.labeled || prev?.labeled || null,
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
// UTC ISO 문자열을 한국시간(KST, UTC+9) "YYYY-MM-DD HH:MM" 으로 변환
const kst = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 16).replace('T', ' ');
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
};
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
h2{font-size:1rem;font-weight:600;color:#A58D5C;letter-spacing:.08em;margin:1.8rem 0 .8rem;border-bottom:1px solid #3A332B;padding-bottom:.4rem}
.score{display:grid;grid-template-columns:6rem 1fr 4rem;align-items:center;gap:.7rem;margin:.5rem 0;font-size:.9rem}
.score .lab{color:#BEB7AB}
.score .track{height:6px;background:#241F1A;border-radius:3px;overflow:hidden}
.score .fill{height:100%;background:#A58D5C}
.score .num{text-align:right;color:#F3EFE7;font-variant-numeric:tabular-nums}
.pill{display:grid;grid-template-columns:repeat(4,1fr);text-align:center;gap:.5rem;margin:.6rem 0 1rem}
.pill div{border:1px solid #3A332B;border-radius:2px;padding:.6rem .3rem}
.pill b{display:block;font-size:1.5rem;font-weight:400;color:#F3EFE7}
.pill span{color:#BEB7AB;font-size:.72rem}
.rel{margin:.4rem 0;padding-left:1.1rem;color:#F3EFE7}.rel li{margin:.2rem 0}
.wx{color:#BEB7AB;font-size:.85rem;margin:.6rem 0 0}
.tag{display:inline-block;border:1px solid #873B32;color:#873B32;border-radius:2px;padding:.15rem .5rem;font-size:.8rem;margin:.15rem .3rem .15rem 0}
.tag.w{border-color:#A58D5C;color:#A58D5C}
</style></head><body>${b}</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

function stateCell(r) {
  const pct = r.of ? Math.round(r.step / r.of * 100) : 0;
  const state = r.done ? (r.gates?.length ? `<span class="gate">탈락</span>` : `<span class="done">완료</span>`) : `${r.step}/${r.of}`;
  return `${state}<div class="bar" style="width:${pct}%"></div>`;
}

function table(rows, key) {
  // 같은 닉네임끼리 묶는다. 이름이 없으면 세션 id로 각각 취급.
  const groups = new Map();
  for (const r of rows) {
    const gkey = (r.name && r.name.trim()) ? '이름:' + r.name.trim() : '무명:' + r.id;
    if (!groups.has(gkey)) groups.set(gkey, []);
    groups.get(gkey).push(r);
  }
  // 그룹 안 세션은 최신순, 그룹은 그룹 내 최신 시각순
  const arr = [...groups.values()].map(sessions => {
    sessions.sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    return sessions;
  }).sort((a, b) => (b[0].last || '').localeCompare(a[0].last || ''));

  const blocks = arr.map(sessions => {
    // 대표: 완료본 우선, 그중 점수 높은 것
    const done = sessions.filter(s => s.done);
    const rep = (done.length ? done : sessions).slice().sort((a, b) => (b.total ?? -1) - (a.total ?? -1))[0];
    const name = esc(rep.name) || '(무명)';
    const multi = sessions.length > 1;
    // 그룹 헤더 행
    const head = `<tr class="grp">
      <td><a href="/admin/${esc(rep.id)}?key=${encodeURIComponent(key)}">${name}</a>${multi ? ` <span class="cnt">${sessions.length}회</span>` : ''}</td>
      <td>${stateCell(rep)}</td>
      <td>${rep.total ?? '—'}</td>
      <td>${esc(kst(rep.last))}</td>
    </tr>`;
    // 세션이 여럿이면 나머지도 들여쓰기해 표시
    const subs = multi ? sessions.filter(s => s.id !== rep.id).map(s => `<tr class="sub">
      <td>└ <a href="/admin/${esc(s.id)}?key=${encodeURIComponent(key)}">세션 ${esc(s.id).slice(0, 6)}</a></td>
      <td>${stateCell(s)}</td>
      <td>${s.total ?? '—'}</td>
      <td>${esc(kst(s.last))}</td>
    </tr>`).join('') : '';
    return head + subs;
  }).join('');

  return `<style>
    .grp td{border-top:2px solid #3A332B}
    .sub td{color:#8a8378;font-size:.82rem;padding-top:.3rem;padding-bottom:.3rem}
    .sub a{color:#8a8378}
    .cnt{color:#A58D5C;font-size:.75rem;border:1px solid #A58D5C;border-radius:2px;padding:.05rem .35rem;margin-left:.4rem}
  </style>
  <h1>응답 ${rows.length}건 · ${arr.length}명</h1><table>
    <tr><th>닉네임</th><th>진행</th><th>점수</th><th>마지막(KST)</th></tr>${blocks}</table>`;
}

const CAT = { A: '성격·애착·삶만족', B: '가치관·생활', C: '관계·소통', D: '외모·신체·성', F: '사주 궁합', E: '가점(재능·언어)' };

function scoreBars(b) {
  if (!b) return '';
  const order = ['A', 'B', 'C', 'D', 'F', 'E'];
  const rows = order.filter(k => b[k]).map(k => {
    const [got, max] = b[k];
    const pct = max ? Math.round(got / max * 100) : 0;
    return `<div class="score"><span class="lab">${esc(CAT[k])}</span>
      <span class="track"><span class="fill" style="width:${pct}%"></span></span>
      <span class="num">${got}/${max}</span></div>`;
  }).join('');
  return `<h2>항목별 점수</h2>${rows}`;
}

function sajuBlock(s) {
  if (!s || !s.pillars) return '';
  const p = s.pillars;
  const cell = (gz, lab) => `<div><b>${esc(gz || '—')}</b><span>${esc(lab)}</span></div>`;
  const pillars = cell(p.year, '연주') + cell(p.month, '월주') + cell(p.day, '일주') + (s.hasTime ? cell(p.time, '시주') : cell(null, '시주(모름)'));
  const rels = (s.relations && s.relations.length)
    ? `<ul class="rel">${s.relations.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : `<p class="wx">은호와 뚜렷한 합·충 관계는 없습니다.</p>`;
  const order = ['木', '火', '土', '金', '水'];
  const wx = s.wx ? order.map(k => `${k} ${s.wx[k] || 0}`).join(' · ') : '';
  const verdict = s.raw > 0 ? '길(吉) 관계 우세' : s.raw < 0 ? '충·형 관계 우세' : '중립';
  return `<h2>사주 궁합 (${verdict}, 원점수 ${s.raw ?? '—'})</h2>
    <div class="pill">${pillars}</div>${rels}
    <p class="wx">오행 분포: ${esc(wx)}</p>`;
}

function detail(r) {
  const a = r.answers || {};
  const gates = (r.gates || []).map(g => `<span class="tag">${esc(g)}</span>`).join('');
  const warns = (r.warns || []).map(w => `<span class="tag w">${esc(w)}</span>`).join('');
  const flags = (gates || warns) ? `<p>${gates}${warns}</p>` : '';
  let answerBlock;
  if (Array.isArray(r.labeled) && r.labeled.length) {
    // 질문·답을 자연어로 표시
    const rows = r.labeled.map(x => `<dt>${esc(x.q)}</dt><dd>${esc(x.ans)}</dd>`).join('');
    answerBlock = `<h2>응답 (${r.labeled.length}문항)</h2><dl>${rows}</dl>`;
  } else {
    // 옛 데이터: 원본 키·값 fallback
    const dd = Object.keys(a).map(k => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(a[k]) ? a[k].join(', ') : a[k])}</dd>`).join('');
    answerBlock = `<h2>응답 원본</h2><dl>${dd}</dl>`;
  }
  return `<h1>${esc(r.name) || '(무명)'} · ${r.total ?? '—'}점 ${r.grade ? '· ' + esc(r.grade) : ''}</h1>
    <p>${r.done ? '완료' : `${r.step}/${r.of} 진행 (미완료)`}</p>
    <p>${esc(kst(r.first))} → ${esc(kst(r.last))} (KST)</p>
    ${flags}
    ${scoreBars(r.breakdown)}
    ${sajuBlock(r.saju)}
    ${answerBlock}`;
}
