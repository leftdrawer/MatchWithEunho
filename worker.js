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

// labeled 데이터가 없는 옛 응답을 자연어로 보여주기 위한 문항 사전.
// 값이 문자열이면 질문 텍스트(답은 그대로), 배열이면 [질문, choice5 라벨들] 이다.
// likert 문항은 LIKERT_Q 집합에 넣어 1~5를 라벨로 바꾼다.
const LIKERT = ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'];
const QDICT = {
  P01: '어떻게 부르면 될까요?', P02: '생년월일 (양력)', P03: '태어난 시각',
  G_dog: '강아지 알레르기가 있습니까?', G_bottom: '성생활에서 바텀 포지션이 가능합니까?',
  G_circum: '포경수술을 하였습니까?', G_phimosis: '포피가 끝까지 젖혀지지 않습니까?',
  G_drunk: '술을 마시고 본인의 주사, 특히 주폭으로 곤란했던 경험이 있습니까?',
  G_shaman: '영적인 세계는 존재하지 않는다고 생각하십니까?',
  G_religion: '당신의 종교 때문에 무속인과 가까워지는 것이 곤란합니까?',
  G_tattoo: '상대의 몸에 문신이 있는 것이 싫습니까?',
  G_contact: '연락이 잘 안 되는 편이라는 말을 듣는 편이고, 그걸 고칠 생각이 없습니까?',
  G_money: '학생이 아닌데 경제적으로 자립하지 못한 상태입니까?',
  A01_1: '말수가 적은 편이다.', A01_2: '남을 잘 믿고 너그럽다.', A01_3: '게으른 편이다.',
  A01_4: '느긋하고 스트레스를 잘 다룬다.', A01_5: '예술에는 별 관심이 없다.', A01_6: '사교적이고 외향적이다.',
  A01_7: '남의 흠을 잘 잡는 편이다.', A01_8: '일을 철저하게 한다.', A01_9: '쉽게 불안해진다.',
  A01_10: '상상력이 풍부하다.', A04: '나는 자존감이 높은 편이다.',
  A02_1: '사랑받고 있다는 확인을 자주 받아야 안심된다.', A02_2: '내가 아끼는 만큼 상대가 나를 아끼지 않을까 봐 걱정한다.',
  A02_3: '버림받을까 봐 걱정하는 일은 별로 없다.', A02_4: '필요할 때 상대가 곁에 없으면 짜증이 난다.',
  A02_5: '너무 가까워지고 싶어 하는 마음이 사람들을 밀어낼 때가 있다.', A02_6: '상대가 내가 바라는 만큼 가까워지려 하지 않는다고 느낀다.',
  A02_7: '가까워지고 싶으면서도 자꾸 물러선다.', A02_8: '상대가 너무 가까이 오면 불편하다.',
  A02_9: '상대와 너무 가까워지는 것을 피하려 한다.', A02_10: '고민이나 걱정을 상대와 자주 이야기한다.',
  A02_11: '힘들 때 상대에게 기대면 도움이 된다.', A02_12: '위로가 필요할 때 상대를 찾는다.',
  A03_1: '대체로 내 삶은 내가 바라던 모습에 가깝다.', A03_2: '내 삶의 조건은 좋은 편이다.',
  A03_3: '나는 내 삶에 만족한다.', A03_4: '지금까지 살면서 바라던 중요한 것들을 얻었다.',
  A03_5: '다시 산다 해도 거의 아무것도 바꾸지 않을 것이다.',
  V1: '전국장애인차별철폐연대의 지하철 시위는 불법이며, 그 자체로 문제가 된다.',
  V2: '한국의 페미니즘 운동은 대체로 변질되었고 부패했다.',
  V3: '최근 영화나 드라마의 정치적 올바름(PC) 경향에는 문제가 있다.',
  V4: '성소수자의 권리는 이미 충분히 보장되어 있다.',
  V5: '차별은 대부분 개인이 예민하게 받아들여서 생기는 문제다.',
  V6: '이주노동자가 늘어나는 것은 우리 사회에 손해다.',
  B03: ['무속과 신령에 대한 내 태도', ['전혀 믿지 않는다', '잘 모르겠다', '타인의 종교이므로 존중한다', '비교적 이해하는 편이다', '직접 겪어 보았고 믿는다']],
  B02: '나의 의견과 다른 의견을 들었을 때, 상대의 입장을 들어볼 준비가 되어 있다.',
  B07: '내가 졸업한 대학교, 또는 학력에 대해서 말해야 할 때 마음이 다소 불편해진다.',
  J1: '처음 만난 사람의 직업을 듣고 나서, 그 사람을 대하는 내 태도가 달라진 적이 있다.',
  J2: '한국에서 어떤 직업들은 직업이라기보다 신분처럼 쓰인다고 생각한다.',
  P06: '본인의 근무 형태는 어디에 속하나요?', B09: '일요일과 월요일에 시간을 맞출 수 있습니까?',
  B10: '술', B11: '연인과 있을 때 술 없이도 잘 논다.', B12: '담배',
  B13: '담배를 피운 뒤에는 반드시 손을 씻고 양치를 한다.',
  B15: '당분간 여행이 어려운 연애를 받아들일 수 있다.', B16: '집에서 밥 먹고, 영화 보고, 강아지랑 뒹구는 휴일이 아깝지 않다.',
  C01: '자기 전과 일어나서 한마디, 낮에는 일상을 적당히 나눈다. 이 정도는 자연스럽게 할 수 있다.',
  C02: '끝내고 싶어지면 잠수 대신 말로 한다.', C03: '핑계보다 솔직하게 말하는 쪽이다.',
  C04: '상대가 쓴 시간과 돈과 마음을 당연하게 여기지 않고 고맙다고 말한다.',
  C05: '잘못했을 때 미안함과 부끄러움을 안다.', C06: '상대가 예민해질 때 그렇게까지 안 해도 된다고 안심시켜 줄 수 있다.',
  C07: '친구들과 술자리 계획은 허락이 아니라 공유로 말한다.', C08: '다툴 때 나는',
  D_h: '키 (cm)', D_w: '몸무게 (kg)',
  D01: '평소 머리', D02: '탈모', D03: '눈썹', D04: '쌍꺼풀', D05: '얼굴 피부', D06: '수염', D07: '치열',
  D08: '감자상이라는 말을 들어본 적이 있다.', D09: '웃는 얼굴',
  D11: '전체 인상', D12: '목', D13: '전완', D13b: '손', D14: '종아리와 허벅지', D15: '발목', D15b: '발',
  D16: '엉덩이', D17: '몸 피부', D18: '유두', D19: '상체와 하체',
  D20: '포지션', D21: '성기 크기에 비교적 자신이 있다.', D22: '발기 시 길이 (cm)', D23: '발기 시 둘레 (cm)',
  D24: '성기 모양', D25: '고환', D27: '위생과 냄새', E04: '사정할 때',
  E01: '잘하는 것', E01x: '여기 없는 것이 있다면', E02: '사용할 수 있는 외국어가 있습니까?',
  E02L: '어떤 언어인가요?', E02x: '그 밖의 언어가 있다면'
};
// likert 문항 id 집합 (숫자 1~5를 라벨로 바꿈)
const LIKERT_Q = new Set([
  'A01_1','A01_2','A01_3','A01_4','A01_5','A01_6','A01_7','A01_8','A01_9','A01_10','A04',
  'A02_1','A02_2','A02_3','A02_4','A02_5','A02_6','A02_7','A02_8','A02_9','A02_10','A02_11','A02_12',
  'A03_1','A03_2','A03_3','A03_4','A03_5','V1','V2','V3','V4','V5','V6',
  'B02','B07','J1','J2','B11','B15','B16','C01','C02','C03','C04','C05','C06','C07'
]);

// answers(원본)를 사전으로 [{q,ans}] 자연어 목록으로 변환
function labelFromDict(a) {
  const out = [];
  for (const k of Object.keys(a)) {
    if (/(raw|na)$/.test(k) && !QDICT[k]) continue; // 보조 필드 제외
    const v = a[k];
    if (v == null || v === '') continue;
    const def = QDICT[k];
    let q = Array.isArray(def) ? def[0] : (def || k);
    let ans;
    if (Array.isArray(def) && def[1]) { // choice5
      const n = Number(v);
      ans = def[1][n - 1] ? `${def[1][n - 1]} (${n})` : String(v);
    } else if (LIKERT_Q.has(k)) {
      const n = Number(v);
      ans = LIKERT[n - 1] ? `${LIKERT[n - 1]} (${n})` : String(v);
    } else if (Array.isArray(v)) {
      ans = v.length ? v.join(', ') : '(없음)';
    } else {
      ans = String(v);
    }
    out.push({ q, ans });
  }
  return out;
}

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
    // 옛 데이터: 워커 내 문항 사전으로 자연어 변환
    const fromDict = labelFromDict(a);
    if (fromDict.length) {
      const rows = fromDict.map(x => `<dt>${esc(x.q)}</dt><dd>${esc(x.ans)}</dd>`).join('');
      answerBlock = `<h2>응답 (${fromDict.length}문항 · 사전 변환)</h2><dl>${rows}</dl>`;
    } else {
      const dd = Object.keys(a).map(k => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(a[k]) ? a[k].join(', ') : a[k])}</dd>`).join('');
      answerBlock = `<h2>응답 원본</h2><dl>${dd}</dl>`;
    }
  }
  return `<h1>${esc(r.name) || '(무명)'} · ${r.total ?? '—'}점 ${r.grade ? '· ' + esc(r.grade) : ''}</h1>
    <p>${r.done ? '완료' : `${r.step}/${r.of} 진행 (미완료)`}</p>
    <p>${esc(kst(r.first))} → ${esc(kst(r.last))} (KST)</p>
    ${flags}
    ${scoreBars(r.breakdown)}
    ${sajuBlock(r.saju)}
    ${answerBlock}`;
}
