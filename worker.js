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
        timing: body.timing || prev?.timing || null,
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
.dim{color:#5E5A53;font-size:.85em}
/* 보고서 머리띠 */
.band{border:1px solid #39352F;border-left:3px solid #2C3D5D;background:rgba(44,61,93,.10);padding:1rem 1.1rem;margin:0 0 1.2rem;border-radius:2px}
.band .who{font-size:1.35rem;font-weight:600}
.band .meta{color:#BEB7AB;font-size:.85rem;margin:.2rem 0 .8rem}
.ovbox{display:flex;align-items:baseline;gap:.9rem;flex-wrap:wrap}
.ovband{border-radius:2px;padding:.3rem .9rem;font-weight:600;font-size:1rem}
.ovband.ok{background:#3F6B4C;color:#F3EFE7}.ovband.lime{background:#8DA66F;color:#0A0A0A}
.ovband.warn{background:#C09A5B;color:#0A0A0A}.ovband.bad{background:#873B32;color:#F3EFE7}
.ovband.hold{background:#39352F;color:#BEB7AB}
.ovscore{font-size:1.5rem;font-weight:700}.ovscore small{font-size:.8rem;color:#BEB7AB;font-weight:300}
.gates{border:1px solid #873B32;border-radius:2px;padding:.6rem .8rem;margin:0 0 1.2rem;font-size:.9rem}
.gates b{color:#C0392B;margin-right:.4rem}
.verdict{font-size:.85rem;padding:.15rem .6rem;border-radius:2px;margin-left:.5rem;vertical-align:middle}
.verdict.ok{background:#3F6B4C}.verdict.warn{background:#C09A5B;color:#0A0A0A}.verdict.bad{background:#873B32}
.reltab{width:100%;border-collapse:collapse;margin:.3rem 0 0}
.reltab td{border:1px solid #39352F;text-align:center;padding:.4rem .2rem;vertical-align:top}
.reltab b{display:block;color:#A58D5C;font-size:.8rem}
.reltab span{display:block;font-size:.9rem;margin:.15rem 0}
.reltab em{display:block;font-size:.68rem;font-style:normal}
.reltab em.warn{color:#C09A5B}.reltab em.bad{color:#C0392B}
section{margin:1.6rem 0;break-inside:avoid}
.chart{margin:.4rem 0 1rem}
.chart-t{color:#A58D5C;font-size:.85rem;letter-spacing:.06em;margin:0 0 .3rem}
.srow{display:grid;grid-template-columns:8.5rem 2.2rem 5.5rem 1fr;align-items:center;gap:.6rem;padding:.4rem 0;border-top:1px solid #241F1A;font-size:.88rem}
.srow .scode{font-weight:600}.srow .sname{color:#BEB7AB;font-weight:400;font-size:.82rem}
.srow .sval{text-align:right;font-variant-numeric:tabular-nums;color:#F3EFE7}
.srow .stext{color:#BEB7AB;font-size:.85rem;line-height:1.5}
.lights{display:inline-flex;align-items:center;gap:2px}
.lights i{width:.7rem;height:.7rem;border-radius:1px;display:inline-block}
.lights .lg{color:#5E5A53;font-size:.7rem;margin-left:.3rem}
.appt{width:100%;border-collapse:collapse;font-size:.9rem}
.appt td{border-bottom:1px solid #39352F;padding:.5rem .3rem}
.appt .an{text-align:right;font-variant-numeric:tabular-nums}
.raw{margin:1.6rem 0 0}.raw summary{cursor:pointer;color:#A58D5C;font-size:.9rem}
@media print{
  body{background:#fff;color:#0A0A0A;padding:10mm}
  h1,h2{color:#111}.dim{color:#666}
  .band{background:#f2f2f2;border-color:#ccc}
  section,.reltab,.appt,.chart{break-inside:avoid}
  .srow{border-top:1px solid #ddd}.srow .stext,.srow .sname{color:#333}
  .reltab td{border-color:#ccc}.appt td{border-color:#ddd}
  @page{size:A4;margin:15mm}
}
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
    const subs = multi ? sessions.filter(s => s.id !== rep.id).map(s => {
      const t = kst(s.last).slice(5); // "MM-DD HH:MM"
      const label = s.done ? (s.gates?.length ? '탈락' : '완료') : `${s.step}/${s.of}`;
      return `<tr class="sub">
      <td>└ <a href="/admin/${esc(s.id)}?key=${encodeURIComponent(key)}">${esc(label)} · ${esc(t)}</a></td>
      <td>${stateCell(s)}</td>
      <td>${s.total ?? '—'}</td>
      <td>${esc(kst(s.last))}</td>
    </tr>`;
    }).join('') : '';
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
  G_dog: '강아지 알레르기가 있습니까?', G_bottom: '성생활에서 바텀 포지션이 절대로 불가능합니까?',
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

/* ============================================================
   척도 계산 엔진 (은호당 제작지침 3장)
   원본 answers 로부터 24개 척도 + 외모 4표를 0~100으로 환산.
   ============================================================ */

// 은호(host) 기준 — 지침의 이상값. 관계·정합/기질 방향 척도는 은호가 원하는 방향으로 평가.
const HOST_NAME = '은호';

// 외모 문항 배점표 (index.html 의 opts 와 동일)
const PTS = {
  D01: { '이마가 드러난다': 1, '이마를 가린다': 0 },
  D02: { '없다': 1, '진행 중': 0 },
  D03: { '진하다': 1.5, '보통': 0.5, '옅다': 0 },
  D04: { '없거나 속쌍': 1, '겉쌍': 0 },
  D05: { '비교적 깨끗하다': 1.5, '보통': 0.75, '트러블이 심하다': 0 },
  D06: { '있든 없든 관리한다': 1, '그냥 둔다': 0 },
  D07: { '고르다': 1, '덧니가 한두 개 있다': 1.5, '많이 삐뚤다': 0 },
  D08: { '있다': 1.5, '없다': 0.5 },
  D09: { '자신 있다': 1, '보통': 0.5 },
  D11: { '근육에 살집도 있다': 3, '근육질이지만 지방은 적은 편': 2, '통통하고 단단하다': 2.5, '통통하고 물렁하다': 1, '표준 체형에 가깝다': 0 },
  D12: { '두껍다': 1, '보통': 0.5, '가늘다': 0 },
  D13: { '두껍다': 0.75, '가늘다': 0 },
  D13b: { '두껍고 크다': 0.75, '가늘고 크다': 0.5, '두껍고 작다': 0.4, '가늘고 작다': 0 },
  D14: { '두껍다': 2, '보통': 1, '가늘다': 0 },
  D15: { '두껍다': 0.5, '보통': 0.25, '가늘다': 0 },
  D15b: { '두껍고 크다': 0.5, '두껍고 작다': 0.35, '가늘고 길다': 0.15, '가늘고 작다': 0 },
  D16: { '크고 탄력 있다': 1.5, '작고 역삼각형이다': 1.5, '보통': 0.75, '처졌다': 0 },
  D17: { '비교적 깨끗하다': 1, '보통': 0.5, '트러블이 있다': 0 },
  D18: { '검고 작다': 0.5, '보통': 0.25, '유륜이 크거나 털이 있다': 0 },
  D19: { '균형이 맞는다': 0.5, '하체만 발달했다': 0.25, '상체만 발달했다': 0 },
  D20: { '바텀': 3, '올바텀': 3, '올': 2.5, '올탑': 1.5, '탑': 0, '비선호': 1 },
  D24: { '예쁘다': 1, '보통': 0.5, '못생겼다': 0 },
  D25: { '크다': 1, '보통': 0.5, '작다': 0.25 },
  D27: { '신경 쓴다': 1, '보통': 0.5, '안 쓴다': 0 },
  E04: { '많이, 그리고 멀리 튄다': 8, '많이 나오거나 멀리 튀거나 둘 중 하나': 4, '보통': 0 }
};
const NA = '응답하지 않음';
const ptMax = id => Math.max(...Object.values(PTS[id]));
// 배점 문항 점수. 응답하지않음/무응답이면 최고점의 절반.
const pt = (a, id) => {
  const v = a[id];
  if (v == null || v === NA) return ptMax(id) / 2;
  return PTS[id][v] != null ? PTS[id][v] : ptMax(id) / 2;
};

const num = v => (v == null || v === '') ? null : Number(v);
const rev = v => v == null ? null : 6 - v;                 // 리커트 역채점
const lk = (a, id) => num(a[id]);                          // 리커트 원값 1~5
const conv = m => m == null ? null : (m - 1) / 4 * 100;    // 리커트→0~100
const avg = arr => { const v = arr.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
// 리커트 문항들의 평균을 0~100으로. 절반 넘게 비면 null(산출불가).
function likertScore(a, ids) {
  const vals = ids.map(id => {
    const r = id.endsWith('r') ? rev(lk(a, id.slice(0, -1))) : lk(a, id);
    return r;
  });
  const got = vals.filter(x => x != null);
  if (got.length < Math.ceil(ids.length / 2)) return null;
  return conv(avg(got));
}

// 기질 척도 9개. {code,name,dir,val}
function temperamentScales(a) {
  const S = [
    ['Es', '정서 안정', 'up',   likertScore(a, ['A01_4', 'A01_9r'])],
    ['Wm', '너그러움', 'up',   likertScore(a, ['A01_2', 'A01_7r'])],
    ['DI', '성실',     'up',   likertScore(a, ['A01_8', 'A01_3r'])],
    ['Ex', '외향',     'flat', likertScore(a, ['A01_6', 'A01_1r'])],
    ['Op', '개방',     'flat', likertScore(a, ['A01_10', 'A01_5r'])],
    ['Se', '자기확신', 'up',   conv(lk(a, 'A04'))],
    ['Ax', '애착불안', 'down', likertScore(a, ['A02_1', 'A02_2', 'A02_4', 'A02_5', 'A02_6', 'A02_3r'])],
    ['Av', '애착회피', 'down', likertScore(a, ['A02_7', 'A02_8', 'A02_9', 'A02_10r', 'A02_11r', 'A02_12r'])],
    ['Sw', '삶의 만족', 'up',  likertScore(a, ['A03_1', 'A03_2', 'A03_3', 'A03_4', 'A03_5'])]
  ];
  return S.map(([code, name, dir, val]) => ({ code, name, dir, val: val == null ? null : Math.round(val) }));
}

// 관계·정합 척도 15개
function fitScales(a) {
  const P06MAP = { '직장인(9 to 6)': 100, '스케줄 근무(사전에 근무 일정이 확정됨)': 100, '스케줄 근무(근무 일정에 변동이 큼)': 20, '자영업': 90, '프리랜서': 80, '학생': 90, '무직': 50 };
  const B09MAP = { '둘 다 가능': 100, '하나만 가능': 60, '어렵다': 20 };
  const CFMAP = { '대화로 푼다': 100, '피한다': 30, '터뜨린다': 0 };
  const SPMAP = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100 };

  // Ct: 연락. G_contact=예 이면 0 고정.
  const ct = a['G_contact'] === '예' ? 0 : conv(lk(a, 'C01'));
  // Va: 가치 정합. V1~V6 평균이 낮을수록(=진보적일수록 은호와 정합) 높음.
  const vm = avg(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].map(k => lk(a, k)));
  const va = vm == null ? null : 100 - conv(vm);
  // St: 신분의식 낮음. J1 역가중2 + J2 가중1. 값이 낮을수록 좋음(dir down).
  const j1 = lk(a, 'J1'), j2 = lk(a, 'J2');
  let st = null;
  if (j1 != null || j2 != null) {
    const parts = [], ws = [];
    if (j1 != null) { parts.push(conv(j1) * 2); ws.push(2); }
    if (j2 != null) { parts.push(conv(j2) * 1); ws.push(1); }
    st = parts.reduce((s, x) => s + x, 0) / ws.reduce((s, x) => s + x, 0);
  }
  // Tm: 시간 맞춤. P06/B09 매핑 + B15 환산 평균.
  const tmParts = [];
  if (a['P06'] != null && P06MAP[a['P06']] != null) tmParts.push(P06MAP[a['P06']]);
  if (a['B09'] != null && B09MAP[a['B09']] != null) tmParts.push(B09MAP[a['B09']]);
  if (lk(a, 'B15') != null) tmParts.push(conv(lk(a, 'B15')));
  const tm = tmParts.length ? avg(tmParts) : null;
  // Hb: 생활 습관. B11 환산 + B13 매핑 평균.
  const hbParts = [];
  if (lk(a, 'B11') != null) hbParts.push(conv(lk(a, 'B11')));
  if (a['B13'] != null) hbParts.push(a['B13'] === '아니다' ? 0 : 100);
  const hb = hbParts.length ? avg(hbParts) : null;

  const S = [
    ['Ct', '연락',      'up',   ct],
    ['Hn', '정직',      'up',   likertScore(a, ['C02', 'C03'])],
    ['Gr', '감사·염치', 'up',   likertScore(a, ['C04', 'C05'])],
    ['Rs', '안심 주기', 'up',   conv(lk(a, 'C06'))],
    ['Sh', '공유',      'up',   conv(lk(a, 'C07'))],
    ['Cf', '갈등 대처', 'up',   a['C08'] != null ? (CFMAP[a['C08']] ?? null) : null],
    ['Va', '가치 정합', 'up',   va],
    ['Ls', '경청',      'up',   conv(lk(a, 'B02'))],
    ['Sp', '영성 수용', 'up',   a['B03'] != null ? (SPMAP[Number(a['B03'])] ?? null) : null],
    ['Ac', '학력 편안', 'up',   conv(rev(lk(a, 'B07')))],
    ['St', '신분의식 낮음', 'down', st],
    ['Tm', '시간 맞춤', 'up',   tm],
    ['Hb', '생활 습관', 'up',   hb],
    ['Hm', '집에서의 휴일', 'up', conv(lk(a, 'B16'))]
  ];
  return S.map(([code, name, dir, val]) => ({ code, name, dir, val: val == null ? null : Math.round(val) }));
}

// 외모·그 아래 4표. 배점 합 / 최대 합 * 100.
function appearanceScales(a) {
  const FACE = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09'];
  const BODY = ['D11', 'D12', 'D13', 'D13b', 'D14', 'D15', 'D15b', 'D16', 'D17', 'D18', 'D19'];
  const LW = ['D20', 'D24', 'D25', 'D27'];
  const sumPts = ids => ids.reduce((s, id) => s + pt(a, id), 0);
  const sumMax = ids => ids.reduce((s, id) => s + ptMax(id), 0);

  const H = num(a['D_h']), W = num(a['D_w']);
  const kbm = (H && W) ? H - W : null;
  const kbmPt = kbm == null ? 2 : kbm <= 80 ? 4 : kbm <= 90 ? 3.5 : kbm <= 95 ? 2.5 : kbm <= 99 ? 1 : 0;

  const fc = Math.round(sumPts(FACE) / sumMax(FACE) * 100);
  const bd = Math.round((sumPts(BODY) + kbmPt) / (sumMax(BODY) + 4) * 100);

  // Lw: 포지션·모양·고환·위생 + 길이 + 둘레
  let lwPt = sumPts(LW), lwMax = sumMax(LW);
  const len = num(a['D22']), gir = num(a['D23']);
  lwPt += len == null ? 1 : (len >= 12.7 ? 2 : len >= 11.7 ? 1 : 0); lwMax += 2;
  lwPt += gir == null ? 0.5 : (gir >= 11.5 ? 1 : 0.5); lwMax += 1;
  const lw = Math.round(lwPt / lwMax * 100);

  // Bn: 덤. 잘하는것 개수 + 외국어 + E04. 최대는 대략치로 정규화.
  const skills = Array.isArray(a['E01']) ? a['E01'].length : 0;
  const skillPt = Math.min(5, skills * 1.5) + (a['E01x'] ? 1.5 : 0);
  const langs = a['E02'] === '있다' ? (Array.isArray(a['E02L']) ? a['E02L'].slice() : []).concat(a['E02x'] ? ['기타'] : []) : [];
  const major = langs.some(l => l === '영어' || l === '일본어');
  const other = langs.some(l => l !== '영어' && l !== '일본어');
  const langPt = major && other ? 5 : other ? 3 : major ? 2 : 0;
  const e04 = a['E04'] != null && a['E04'] !== NA ? (PTS.E04[a['E04']] ?? 0) : 0;
  const bnRaw = skillPt + langPt + e04;
  const bn = Math.round(Math.min(100, bnRaw / 18 * 100));

  return {
    Fc: { code: 'Fc', name: '얼굴', val: fc },
    Bd: { code: 'Bd', name: '체격', val: bd, kbm },
    Lw: { code: 'Lw', name: '그 아래', val: lw },
    Bn: { code: 'Bn', name: '덤', val: bn }
  };
}

// 모든 척도를 한번에
function computeScales(a) {
  return {
    temperament: temperamentScales(a),
    fit: fitScales(a),
    appearance: appearanceScales(a)
  };
}

/* ============================================================
   응답 신뢰도 6지표 (지침 4장). 표준화 검사가 아니므로 보수적으로 판정.
   각 지표: {code, name, value, level:'ok'|'주의'|'믿기 어려움'}
   ============================================================ */
const LIKERT_ALL = [
  'A01_1','A01_2','A01_3','A01_4','A01_5','A01_6','A01_7','A01_8','A01_9','A01_10','A04',
  'A02_1','A02_2','A02_3','A02_4','A02_5','A02_6','A02_7','A02_8','A02_9','A02_10','A02_11','A02_12',
  'A03_1','A03_2','A03_3','A03_4','A03_5','V1','V2','V3','V4','V5','V6',
  'B02','B07','B11','B15','B16','C01','C02','C03','C04','C05','C06','C07','J1','J2'
];
// INC 역문항 짝
const INC_PAIRS = [['A01_4','A01_9'],['A01_2','A01_7'],['A01_8','A01_3'],['A01_6','A01_1'],['A01_10','A01_5'],['A02_2','A02_3']];
// 외모·그 아래 문항 (NR 계산용)
const APPEAR_ITEMS = ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D11','D12','D13','D13b','D14','D15','D15b','D16','D17','D18','D19','D20','D24','D25','D27','E04'];

function reliability(a, timing) {
  const out = [];
  const push = (code, name, value, level) => out.push({ code, name, value, level });

  // NR: 외모·그 아래에서 '응답하지 않음' 비율
  const appeared = APPEAR_ITEMS.filter(id => a[id] != null);
  const naCount = APPEAR_ITEMS.filter(id => a[id] === NA).length;
  const nr = appeared.length ? Math.round(naCount / appeared.length * 100) : 0;
  push('NR', '응답 유보', nr + '%', nr >= 60 ? '믿기 어려움' : nr >= 30 ? '주의' : 'ok');

  // INC: 역문항 짝 차이 평균. 차이 = |a - (6 - b)|
  const diffs = INC_PAIRS.map(([x, y]) => {
    const va = lk(a, x), vb = lk(a, y);
    if (va == null || vb == null) return null;
    return Math.abs(va - (6 - vb));
  }).filter(x => x != null);
  const inc = diffs.length ? diffs.reduce((s, x) => s + x, 0) / diffs.length : null;
  push('INC', '비일관', inc == null ? '—' : inc.toFixed(1), inc == null ? 'ok' : inc >= 2.5 ? '믿기 어려움' : inc >= 1.8 ? '주의' : 'ok');

  // FLT: 리커트 전체에서 가장 많이 고른 숫자의 비율
  const lkVals = LIKERT_ALL.map(id => lk(a, id)).filter(x => x != null);
  let flt = 0;
  if (lkVals.length) {
    const cnt = {};
    lkVals.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    flt = Math.round(Math.max(...Object.values(cnt)) / lkVals.length * 100);
  }
  push('FLT', '일률 응답', flt + '%', flt >= 80 ? '믿기 어려움' : flt >= 60 ? '주의' : 'ok');

  // VIR: C01~C07 전부 5 이면서 Ax 환산 ≤10, Es ≥90
  const cAll5 = ['C01','C02','C03','C04','C05','C06','C07'].every(id => lk(a, id) === 5);
  const axVal = likertScore(a, ['A02_1','A02_2','A02_4','A02_5','A02_6','A02_3r']);
  const esVal = likertScore(a, ['A01_4','A01_9r']);
  const vir = cAll5 && axVal != null && axVal <= 10 && esVal != null && esVal >= 90;
  push('VIR', '좋게 보이기', vir ? '해당' : '—', vir ? '주의' : 'ok');

  // CRS: 교차 모순 개수
  let crs = 0;
  if (a['G_bottom'] === '예' && a['D20'] === '탑') crs++;
  if (a['G_contact'] === '아니오' && lk(a, 'C01') != null && lk(a, 'C01') <= 2) crs++;
  if (a['G_shaman'] === '아니오' && lk(a, 'B03') === 1) crs++;
  if (a['B12'] === '안 피움' && (a['B13'] === '그렇다' || a['B13'] === '아니다')) crs++;
  if (a['B10'] === '안 마심' && a['G_drunk'] === '예') crs++;
  if (a['G_circum'] === '예' && a['G_phimosis'] != null) crs++;
  push('CRS', '교차 모순', crs + '건', crs >= 3 ? '믿기 어려움' : crs >= 1 ? '주의' : 'ok');

  // SPD: 페이지당 평균 체류 시간(초). timing 없으면 수집 안 됨.
  if (timing && typeof timing === 'object' && Object.keys(timing).length) {
    const secs = Object.values(timing).map(ms => Number(ms) / 1000).filter(x => x > 0);
    const avgSec = secs.length ? secs.reduce((s, x) => s + x, 0) / secs.length : 0;
    push('SPD', '속도', Math.round(avgSec) + '초', avgSec < 10 ? '믿기 어려움' : avgSec < 20 ? '주의' : 'ok');
  } else {
    push('SPD', '속도', '수집 안 됨', 'ok');
  }

  // 전체 판정: 하나라도 '믿기 어려움' → 믿기 어려움. '주의' 2개 이상 → 주의해서 볼 것. 나머지 믿을 만함.
  const hard = out.filter(x => x.level === '믿기 어려움').length;
  const warn = out.filter(x => x.level === '주의').length;
  const verdict = hard >= 1 ? '믿기 어려움' : warn >= 2 ? '주의해서 볼 것' : '믿을 만함';
  return { items: out, verdict };
}

/* ============================================================
   종합 판정 (지침 8장). 코드가 정한다.
   ============================================================ */
// 게이트 판정 (index.html 과 동일 규칙)
const GATE_DEFS = [
  { key: 'G_dog', fail: '예', reason: '강아지 알레르기' },
  { key: 'G_bottom', fail: '예', reason: '바텀이 어려운 경우' },
  { key: 'G_phimosis', fail: '예', showIf: ['G_circum', '아니오'], reason: '포피가 끝까지 젖혀지지 않음' },
  { key: 'G_drunk', fail: '예', reason: '주사·주폭' },
  { key: 'G_shaman', fail: '예', reason: '무속을 기만으로 봄' },
  { key: 'G_religion', fail: '예', reason: '종교와 충돌' },
  { key: 'G_tattoo', fail: '예', reason: '문신을 싫어함' },
  { key: 'G_contact', fail: '예', reason: '연락을 고칠 생각이 없음' },
  { key: 'G_money', fail: '예', reason: '경제적 자립 전' }
];
function gatesFailed(a) {
  const out = [];
  for (const g of GATE_DEFS) {
    if (g.showIf && a[g.showIf[0]] !== g.showIf[1]) continue;
    if (a[g.key] === g.fail) out.push(g.reason);
  }
  // 체격·나이 게이트
  const H = num(a['D_h']), W = num(a['D_w']);
  const kbm = (H && W) ? H - W : null;
  if (kbm != null && kbm >= 100) out.push('체격이 맞지 않습니다');
  if (H && H < 150) out.push('키 150cm 미만');
  const age = a['P02'] ? Math.floor((Date.now() - new Date(a['P02'])) / (365.25 * 864e5)) : null;
  if (age != null && age < 19) out.push('만 19세 미만');
  return out;
}

// 종합 점수: 관계·정합 + 기질 방향척도를 은호 방향으로 정렬해 가중평균.
const OVERALL_WEIGHTS = { Va: 3, Ls: 3, Ct: 3, Av: 2, Es: 2 }; // 나머지 1
function overallVerdict(scales, reliabilityVerdict, gates) {
  // 신뢰도가 믿기 어려움이면 해석 보류
  if (reliabilityVerdict === '믿기 어려움') return { score: null, band: '해석 보류' };
  // 게이트 미충족이 하나라도 있으면 어려움
  if (gates && gates.length) return { score: null, band: '어려움' };

  // 방향 정렬: down 척도는 100-val, flat 척도(Ex,Op)는 종합에서 제외
  const contrib = [];
  const add = (code, val, dir) => {
    if (val == null || dir === 'flat') return;
    const aligned = dir === 'down' ? 100 - val : val;
    const w = OVERALL_WEIGHTS[code] || 1;
    contrib.push([aligned, w]);
  };
  scales.fit.forEach(s => add(s.code, s.val, s.dir));
  scales.temperament.forEach(s => add(s.code, s.val, s.dir));

  if (!contrib.length) return { score: null, band: '해석 보류' };
  const wsum = contrib.reduce((s, [, w]) => s + w, 0);
  const score = Math.round(contrib.reduce((s, [v, w]) => s + v * w, 0) / wsum);
  const band = score >= 75 ? '잘 맞음' : score >= 60 ? '맞춰 볼 만함' : score >= 45 ? '주의' : '어려움';
  return { score, band };
}

/* ============================================================
   규칙 기반 해설 문장 (지침 7-1). 척도별 5구간.
   구간: 0(0-29) 1(30-44) 2(45-55) 3(56-70) 4(71-100)
   ============================================================ */
function bandIndex(v) {
  if (v == null) return null;
  return v <= 29 ? 0 : v <= 44 ? 1 : v <= 55 ? 2 : v <= 70 ? 3 : 4;
}
// 신호등 색: 방향 반영. up척도는 높을수록 초록, down척도는 낮을수록 초록, flat은 회색.
function lightColor(v, dir) {
  if (v == null || dir === 'flat') return 'flat';
  const eff = dir === 'down' ? 100 - v : v;
  return eff >= 71 ? 'green' : eff >= 56 ? 'lime' : eff >= 45 ? 'yellow' : eff >= 30 ? 'amber' : 'red';
}

// 각 척도의 5구간 문장. 방향척도는 "낮을수록 은호에게 좋음"을 문장에 반영.
const BAND_TEXT = {
  // 기질 (up)
  Es: ['걱정이 많고 긴장이 쉽게 올라오는 편임. 은호 역시 예민한 쪽이라, 둘이 같은 순간에 날이 서는 장면을 미리 생각해 둘 필요가 있겠음.',
       '스트레스가 쌓이면 마음이 쉽게 흔들리는 편임. 편안한 리듬을 함께 만들어 가는 것이 도움이 되겠음.',
       '기분의 오르내림이 보통 수준임. 상황에 따라 흔들릴 때도, 담담할 때도 있겠음.',
       '대체로 안정된 편으로, 웬만한 일에는 크게 흔들리지 않겠음.',
       '쉽게 흔들리지 않고 스트레스를 비교적 잘 다루는 편임. 은호가 예민해질 때 함께 휩쓸리기보다 가라앉혀 줄 여지가 있겠음.'],
  Wm: ['사람을 대할 때 경계가 앞서고 날을 세우는 편임.',
       '너그럽기보다 판단이 앞설 때가 있겠음.',
       '상황에 따라 너그럽기도, 깐깐하기도 한 보통 수준임.',
       '대체로 남을 잘 믿고 너그러운 편임.',
       '남을 깊이 믿고 넉넉하게 품는 편임. 갈등이 나도 오래 끌지 않겠음.'],
  DI: ['일을 미루거나 느슨하게 두는 편임.',
       '꼼꼼함보다 편한 쪽을 택할 때가 있겠음.',
       '성실함이 보통 수준으로, 할 때는 하고 느슨할 때는 느슨하겠음.',
       '맡은 일을 대체로 철저히 하는 편임.',
       '일을 빈틈없이 챙기고 약속을 잘 지키는 편임.'],
  Ex: ['혼자 있는 시간을 편히 여기고 말수가 적은 편임.',
       '조용한 자리를 더 편하게 느끼는 편임.',
       '상황에 따라 나서기도, 물러서기도 하는 보통 수준임.',
       '사람들과 어울리기를 즐기는 편임.',
       '사교적이고 앞에 나서는 것을 즐기는 편임. (성향 묘사이며 은호와의 맞음과는 무관함)'],
  Op: ['익숙한 것을 선호하고 새로운 시도에는 관심이 적은 편임.',
       '변화보다 안정을 택하는 편임.',
       '호기심이 보통 수준임.',
       '새로운 경험과 표현에 열려 있는 편임.',
       '상상력이 풍부하고 예술적 자극을 즐기는 편임. (성향 묘사이며 은호와의 맞음과는 무관함)'],
  Se: ['자신에 대한 확신이 낮아 스스로를 자주 낮추는 편임. 은호가 자존감이 지나치게 낮은 쪽은 관계에 부적합하다고 밝힌 대목과 함께 볼 필요가 있겠음.',
       '자기 확신이 다소 부족한 편임.',
       '자존감이 보통 수준임.',
       '자신에 대한 믿음이 대체로 안정된 편임.',
       '자기 확신이 뚜렷하고 스스로를 존중하는 편임.'],
  // 애착불안 (down: 낮을수록 좋음)
  Ax: ['버림받을까 봐 하는 걱정이 거의 없이 안정적인 편임. 은호가 편하게 여길 지점임.',
       '관계에서 불안이 낮은 편임.',
       '애착 불안이 보통 수준으로, 상황에 따라 확인받고 싶을 때가 있겠음.',
       '사랑받고 있다는 확인을 자주 필요로 하는 편임. 잦은 안심이 필요할 수 있겠음.',
       '버림받음에 대한 불안이 큰 편임. 관계 초기에 확인과 안심이 많이 필요하겠음.'],
  // 애착회피 (down)
  Av: ['가까워지는 것을 편히 받아들이고 기대는 데 어려움이 없는 편임. 은호가 바라는 밀착에 잘 맞겠음.',
       '친밀함을 대체로 편하게 여기는 편임.',
       '가까워지는 것에 대한 거리감이 보통 수준임.',
       '가까워질수록 한 걸음 물러서려는 경향이 있는 편임.',
       '가까워질수록 한 걸음 물러서는 경향이 두드러짐. 연락이 끊기거나 말없이 멀어지는 방식으로 나타날 수 있어, 은호가 가장 꺼리는 모습과 겹칠 소지가 큼.'],
  Sw: ['지금의 삶에 대한 만족이 낮은 편임.',
       '삶의 만족이 다소 낮은 편임.',
       '삶에 대한 만족이 보통 수준임.',
       '지금의 삶에 대체로 만족하는 편임.',
       '자기 삶에 깊이 만족하는 편임. 안정된 토대에서 관계를 시작하겠음.'],
  // 관계·정합 (up)
  Ct: ['연락을 자주 하기 어려운 편임. 은호가 가장 중요하게 여기는 지점이라 부딪힐 소지가 큼.',
       '연락의 빈도가 은호 기준에는 다소 부족할 수 있겠음.',
       '연락이 보통 수준임.',
       '연락을 성실히 이어 가는 편임.',
       '아침저녁 인사와 빠른 답을 자연스럽게 하는 편임. 은호의 가장 강한 기준을 잘 충족하겠음.'],
  Hn: ['갈등이나 이별을 말 대신 회피로 처리할 소지가 있음.',
       '솔직함보다 에두르는 쪽을 택할 때가 있겠음.',
       '정직함이 보통 수준임.',
       '대체로 솔직하게 말하는 편임.',
       '잠수 대신 말로, 핑계 대신 솔직함으로 대하는 편임. 은호가 바라는 방식과 잘 맞겠음.'],
  Gr: ['상대가 쓴 마음을 당연하게 여길 소지가 있음.',
       '고마움 표현이 다소 적은 편임.',
       '감사와 염치가 보통 수준임.',
       '고마움을 잘 표현하는 편임.',
       '상대의 시간과 마음을 당연히 여기지 않고 고맙다고 말하는 편임.'],
  Rs: ['상대가 예민해질 때 안심시켜 주기 어려운 편임.',
       '안심을 주는 표현이 다소 적은 편임.',
       '안심 주기가 보통 수준임.',
       '상대가 불안해할 때 다독여 주는 편임.',
       '은호가 예민해질 때 곁에서 가라앉혀 줄 사람임.'],
  Sh: ['일정이나 계획을 공유하기보다 각자 두는 편임.',
       '공유가 다소 적은 편임.',
       '공유가 보통 수준임.',
       '계획을 대체로 공유하는 편임.',
       '허락이 아니라 공유로 말하고 숨기지 않는 편임.'],
  Cf: ['갈등이 생기면 터뜨리거나 피하는 방식으로 흐를 소지가 큼.',
       '갈등 대처가 다소 서툰 편임.',
       '갈등 대처가 보통 수준임.',
       '다툼을 대화로 풀려는 편임.',
       '갈등을 대화로 풀어 가는 편임. 관계가 오래갈 토대가 되겠음.'],
  Va: ['사회 쟁점에서 은호와 반대편에 서는 응답이 많음. 서로 설명하고 들을 준비(Ls)가 높다면 대화의 여지는 남지만, 일상 대화에서 자주 부딪힐 가능성이 높겠음.',
       '가치관이 은호와 다소 어긋나는 편임.',
       '가치관 정합이 보통 수준임.',
       '가치관이 은호와 대체로 통하는 편임.',
       '사회를 보는 눈이 은호와 잘 통하는 편임.'],
  Ls: ['다른 의견을 들을 준비가 부족한 편임. 은호가 매우 중요하게 여기는 지점임.',
       '경청이 다소 부족한 편임.',
       '경청이 보통 수준임.',
       '다른 의견을 들으려는 편임.',
       '나와 다른 의견도 열고 들을 준비가 된 편임. 은호가 가장 중요하게 꼽은 자질임.'],
  Sp: ['무속과 영적 세계를 받아들이기 어려운 편임. 은호의 일과 충돌할 소지가 큼.',
       '영성 수용이 다소 낮은 편임.',
       '영성에 대한 태도가 보통 수준임.',
       '무속을 이해하고 존중하는 편임.',
       '영적 세계를 이해하거나 직접 믿는 편임. 은호의 일과 잘 맞겠음.'],
  Ac: ['학력이나 배경을 말할 때 불편해하는 편임.',
       '학력 관련 편안함이 다소 낮은 편임.',
       '보통 수준임.',
       '학력을 대체로 편안하게 여기는 편임.',
       '학력이나 배경에 대한 콤플렉스가 없는 편임.'],
  // 신분의식 (down: 낮을수록 좋음)
  St: ['직업을 사람의 무게로 읽지 않는 편임. 은호가 바라는 태도와 가까움.',
       '신분 의식이 낮은 편임.',
       '신분 의식이 보통 수준임.',
       '직업으로 사람을 가늠하는 태도가 다소 보이는 편임.',
       '직업을 사람의 무게로 읽는 경향이 강하게 보임. 은호가 명시적으로 꺼린 태도와 가까움.'],
  Tm: ['은호의 일요일·월요일 휴무에 시간을 맞추기 어려운 편임.',
       '시간 맞춤이 다소 어려운 편임.',
       '시간 맞춤이 보통 수준임.',
       '은호의 쉬는 날에 대체로 맞출 수 있는 편임.',
       '은호의 휴무와 리듬에 잘 맞출 수 있는 편임.'],
  Hb: ['술자리 위주의 생활이거나 위생 습관이 은호와 맞지 않을 소지가 있음.',
       '생활 습관이 다소 어긋나는 편임.',
       '생활 습관이 보통 수준임.',
       '생활 습관이 은호와 대체로 맞는 편임.',
       '술 없이도 잘 지내고 위생을 챙기는 편임. 은호와 잘 맞겠음.'],
  Hm: ['집에서 보내는 조용한 휴일을 아깝게 여기는 편임.',
       '집에서의 휴일 선호가 다소 낮은 편임.',
       '보통 수준임.',
       '집에서 보내는 휴일을 대체로 즐기는 편임.',
       '집에서 밥 먹고 쉬는 소소한 휴일을 아끼는 편임. 은호와 잘 맞겠음.']
};
function scaleText(code, val) {
  const bi = bandIndex(val);
  if (bi == null || !BAND_TEXT[code]) return '산출되지 않음.';
  return BAND_TEXT[code][bi];
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

// 나이 계산 (P02 양력 생년월일)
function ageOf(a) {
  if (!a || !a['P02']) return null;
  const d = new Date(a['P02']); if (isNaN(d)) return null;
  return Math.floor((Date.now() - d) / (365.25 * 864e5));
}

// 신호등 5칸. 방향 반영된 색으로 해당 칸만 켜진다.
const LIGHT_HEX = { red: '#C0392B', amber: '#CB7B6E', yellow: '#C09A5B', lime: '#8DA66F', green: '#3F6B4C', flat: '#5E5A53' };
function lightBar(v, dir) {
  const color = lightColor(v, dir);
  const order = ['red', 'amber', 'yellow', 'lime', 'green'];
  if (color === 'flat') {
    return `<span class="lights">${order.map(() => `<i style="background:#39352F"></i>`).join('')}<b class="lg">방향 없음</b></span>`;
  }
  const on = order.indexOf(color);
  const cells = order.map((c, i) => `<i style="background:${i === on ? LIGHT_HEX[c] : '#39352F'}"></i>`).join('');
  return `<span class="lights">${cells}</span>`;
}

// SVG 꺾은선 그래프 한 판. scales: [{code,name,dir,val}]
function svgChart(scales, title) {
  const W = 640, H = 240, padL = 34, padR = 14, padT = 18, padB = 46;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = scales.length;
  const x = i => padL + (n === 1 ? plotW / 2 : plotW * i / (n - 1));
  const y = v => padT + plotH * (1 - v / 100);
  // 기준선
  const grid = [
    `<line x1="${padL}" y1="${y(50)}" x2="${W - padR}" y2="${y(50)}" stroke="#5E5A53" stroke-width="1"/>`,
    `<line x1="${padL}" y1="${y(30)}" x2="${W - padR}" y2="${y(30)}" stroke="#39352F" stroke-dasharray="3 3"/>`,
    `<line x1="${padL}" y1="${y(70)}" x2="${W - padR}" y2="${y(70)}" stroke="#39352F" stroke-dasharray="3 3"/>`
  ].join('');
  const yl = [0, 30, 50, 70, 100].map(v => `<text x="${padL - 6}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#BEB7AB">${v}</text>`).join('');
  // 값 꺾은선 (null은 건너뜀)
  const pts = scales.map((s, i) => s.val == null ? null : [x(i), y(s.val), s]);
  const line = pts.filter(Boolean).map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const dots = pts.filter(Boolean).map(p => {
    const filled = p[2].dir === 'flat' ? `fill="#0A0A0A" stroke="#A58D5C"` : `fill="#A58D5C" stroke="#A58D5C"`;
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" ${filled} stroke-width="1.5"/>` +
      `<text x="${p[0].toFixed(1)}" y="${(p[1] - 8).toFixed(1)}" text-anchor="middle" font-size="9" fill="#F3EFE7">${p[2].val}</text>`;
  }).join('');
  // 축 약호 (방향 down이면 ↓)
  const labels = scales.map((s, i) => {
    const mark = s.dir === 'down' ? '↓' : s.dir === 'flat' ? '○' : '';
    return `<text x="${x(i)}" y="${H - padB + 16}" text-anchor="middle" font-size="10" fill="#BEB7AB">${esc(s.code)}${mark}</text>`;
  }).join('');
  return `<div class="chart"><div class="chart-t">${esc(title)}</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
      ${grid}${yl}
      ${line ? `<path d="${line}" fill="none" stroke="#A58D5C" stroke-width="1.5"/>` : ''}
      ${dots}${labels}
    </svg></div>`;
}

// 척도표(약호·이름·환산) + 해설 + 신호등
function scaleRows(scales) {
  return scales.map(s => {
    const val = s.val == null ? '—' : s.val;
    return `<div class="srow">
      <div class="scode">${esc(s.code)} <span class="sname">${esc(s.name)}</span></div>
      <div class="sval">${val}</div>
      ${lightBar(s.val, s.dir)}
      <div class="stext">${esc(scaleText(s.code, s.val))}</div>
    </div>`;
  }).join('');
}

function reliabilityRow(rel) {
  const cls = { 'ok': 'ok', '주의': 'warn', '믿기 어려움': 'bad' };
  const cells = rel.items.map(x => `<td><b>${esc(x.code)}</b><span>${esc(x.value)}</span><em class="${cls[x.level]}">${x.level === 'ok' ? '' : esc(x.level)}</em></td>`).join('');
  const vcls = rel.verdict === '믿을 만함' ? 'ok' : rel.verdict === '주의해서 볼 것' ? 'warn' : 'bad';
  return `<h2>응답 신뢰도 <span class="verdict ${vcls}">${esc(rel.verdict)}</span></h2>
    <table class="reltab"><tr>${cells}</tr></table>`;
}

function appearanceTable(app) {
  const rows = [
    ['Fc', '얼굴', app.Fc.val],
    ['Bd', '체격', app.Bd.val + (app.Bd.kbm != null ? ` <span class="dim">(키−몸 ${app.Bd.kbm})</span>` : '')],
    ['Lw', '그 아래', app.Lw.val],
    ['Bn', '덤', app.Bn.val]
  ].map(([c, n, v]) => `<tr><td><b>${c}</b> ${n}</td><td class="an">${v}</td></tr>`).join('');
  return `<h2>외모·그 아래</h2><table class="appt">${rows}</table>`;
}

function detail(r) {
  const a = r.answers || {};
  const scales = computeScales(a);
  const rel = reliability(a, r.timing);
  const gates = gatesFailed(a);
  let ov = overallVerdict(scales, rel.verdict, gates);
  // 미완료 응답은 종합판정을 단정하지 않는다 (답이 일부만 있어 왜곡될 수 있음)
  if (!r.done && !(gates && gates.length) && rel.verdict !== '믿기 어려움') {
    ov = { score: null, band: '미완료 · 판단 보류' };
  }
  const age = ageOf(a);

  // 머리띠
  const who = `${esc(r.name) || '(무명)'}${age != null ? ` <span class="dim">(만 ${age}세)</span>` : ''}`;
  const status = r.done ? '완료' : `${r.step}/${r.of}에서 중단`;
  const ovCls = ov.band === '잘 맞음' ? 'ok' : ov.band === '맞춰 볼 만함' ? 'lime'
    : ov.band === '주의' ? 'warn' : /보류/.test(ov.band) ? 'hold' : 'bad';

  // 게이트
  const gateBlock = gates.length
    ? `<div class="gates"><b>필수 조건 미충족 · ${gates.length}건</b> ${gates.map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div>`
    : '';

  // 원자료 (labeled 우선 → 사전 변환)
  let answerRows;
  if (Array.isArray(r.labeled) && r.labeled.length) answerRows = r.labeled;
  else answerRows = labelFromDict(a);
  const answerDl = answerRows.length
    ? `<dl>${answerRows.map(x => `<dt>${esc(x.q)}</dt><dd>${esc(x.ans)}</dd>`).join('')}</dl>`
    : `<dl>${Object.keys(a).map(k => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(a[k]) ? a[k].join(', ') : a[k])}</dd>`).join('')}</dl>`;

  return `<div class="band">
      <div class="who">${who}</div>
      <div class="meta">${status} · ${esc(kst(r.last))} KST</div>
      <div class="ovbox">
        <div class="ovband ${ovCls}">${esc(ov.band)}</div>
        ${ov.score != null ? `<div class="ovscore">종합 ${ov.score}<small>/100</small></div>` : ''}
        ${r.total != null ? `<div class="dim">설문 점수 ${r.total} (별도 산식)</div>` : ''}
      </div>
    </div>
    ${gateBlock}
    ${reliabilityRow(rel)}
    <section>${svgChart(scales.temperament, '기질 — 그 사람 자체')}
      ${scaleRows(scales.temperament)}</section>
    <section>${svgChart(scales.fit, '관계·정합 — 은호와 맞는 정도')}
      ${scaleRows(scales.fit)}</section>
    ${appearanceTable(scales.appearance)}
    ${sajuBlock(r.saju)}
    <details class="raw"><summary>응답 원자료 (${answerRows.length}문항)</summary>${answerDl}</details>`;
}
