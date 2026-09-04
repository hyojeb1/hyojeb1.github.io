/* Chess Insights — chess/data/rapid-summary.json 하나를 읽어 브라우저에서 집계한다.
   빌드 없음. 페이지 방문 때 Chess.com API를 호출하지 않는다.
   JSON 생성은 `npm run update-chess` (scripts/update-chess.mjs). */

import { Chess } from './vendor/chess.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const [k, v] of Object.entries(a)) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k);
  return n;
};

/* ---------- 날짜: 표시는 항상 Asia/Seoul ---------- */

const TZ = 'Asia/Seoul';
const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  weekday: 'short',
});
const seoul = (epoch) => {
  const p = {};
  for (const x of partsFmt.formatToParts(new Date(epoch * 1000))) p[x.type] = x.value;
  return p;
};
const dstr = (epoch) => {
  const p = seoul(epoch);
  return `${p.year}.${p.month}.${p.day}`;
};
const mstr = (epoch) => {
  const p = seoul(epoch);
  return `${p.year}-${p.month}`;
};
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '~');
const n1 = (x) => (x == null ? '~' : (Math.round(x * 10) / 10).toFixed(1));
const sign = (x) => (x > 0 ? '+' + x : String(x));

/* ---------- 집계 ---------- */

function wdl(games) {
  let w = 0, d = 0, l = 0;
  for (const g of games) {
    if (g.result === 'win') w++;
    else if (g.result === 'draw') d++;
    else l++;
  }
  const n = games.length;
  // 무승부 반점. 승률만으로 오프닝을 비교하면 무승부가 사라진다.
  return { n, w, d, l, wr: n ? (w / n) * 100 : 0, score: n ? ((w + d / 2) / n) * 100 : 0 };
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const groupBy = (games, key) => {
  const m = new Map();
  for (const g of games) {
    const k = key(g);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(g);
  }
  return m;
};

function wdlCell(s) {
  if (!s.n) return el('span', { class: 'form', text: '~' });
  const bar = el('span', { class: 'wdl', 'aria-hidden': 'true' });
  bar.append(
    el('i', { class: 'w', style: `width:${(s.w / s.n) * 100}%` }),
    el('i', { class: 'd', style: `width:${(s.d / s.n) * 100}%` })
  );
  return el('span', {}, bar, el('span', { text: ` ${s.w}/${s.d}/${s.l}`, style: 'font-family:var(--num);font-size:11px;margin-left:6px' }));
}

function formCell(games, k = 5) {
  const recent = games.slice().sort((a, b) => b.end - a.end).slice(0, k).reverse();
  const s = el('span', { class: 'form' });
  for (const g of recent) {
    const c = g.result === 'win' ? 'w' : g.result === 'draw' ? 'd' : 'l';
    s.append(el('span', { class: c, text: c === 'w' ? 'W' : c === 'd' ? 'D' : 'L' }));
  }
  return s;
}

/* ---------- 표 (정렬 가능) ---------- */

const sortState = {};

/* cols: [{k, label, cls, get(row), val(row), sortable}] */
function table(id, cols, rows, opts = {}) {
  const st = (sortState[id] ||= { k: opts.sort || null, dir: opts.dir || -1 });
  if (st.k) {
    const col = cols.find((c) => c.k === st.k);
    if (col?.val) {
      rows = rows.slice().sort((a, b) => {
        const x = col.val(a), y = col.val(b);
        if (typeof x === 'string' || typeof y === 'string')
          return String(x).localeCompare(String(y)) * -st.dir;
        return (x - y) * st.dir;
      });
    }
  }
  const thead = el('tr', {}, cols.map((c) =>
    el('th', {
      class: [c.cls, st.k === c.k ? 'sorted' : ''].filter(Boolean).join(' ') || false,
      'data-sort': c.val ? c.k : false,
      text: c.label,
      onclick: c.val
        ? () => {
            if (st.k === c.k) st.dir = -st.dir;
            else { st.k = c.k; st.dir = -1; }
            render();
          }
        : null,
    })
  ));
  const tbody = el('tbody');
  const limit = opts.limit ?? rows.length;
  for (const r of rows.slice(0, limit)) {
    const tr = el('tr', { class: opts.onRow ? 'z' : false });
    for (const c of cols) {
      const v = c.get(r);
      tr.append(el('td', { class: c.cls || false }, typeof v === 'object' && v !== null ? v : el('span', { text: String(v ?? '~') })));
    }
    if (opts.onRow) {
      tr.addEventListener('click', () => opts.onRow(r, tr));
      if (opts.isOpen?.(r)) {
        tr.classList.add('open');
        tbody.append(tr);
        tbody.append(el('tr', { class: 'detail-row' }, el('td', { colspan: cols.length }, opts.detail(r))));
        continue;
      }
    }
    tbody.append(tr);
  }
  const t = el('table', { class: 'd' }, el('thead', {}, thead), tbody);
  if (opts.foot) t.append(el('tfoot', {}, el('tr', {}, el('td', { colspan: cols.length, text: opts.foot }))));
  return el('div', { class: 'tw' }, t);
}

/* 승/무/패 + 승률을 항상 함께 보여주는 표준 열 묶음 */
const wdlCols = (label = 'Opening', nameGet, extra = []) => [
  { k: 'name', label, cls: 'name', get: nameGet, val: (r) => r.key },
  { k: 'games', label: 'Games', cls: 'n', get: (r) => r.s.n, val: (r) => r.s.n },
  { k: 'wdl', label: 'W / D / L', get: (r) => wdlCell(r.s) },
  { k: 'wr', label: 'Win %', cls: 'n', get: (r) => n1(r.s.wr) + '%', val: (r) => r.s.wr },
  { k: 'score', label: 'Score %', cls: 'n', get: (r) => n1(r.s.score) + '%', val: (r) => r.s.score },
  {
    k: 'form',
    label: '최근 5판',
    get: (r) => formCell(r.games),
    val: (r) => wdl(r.games.slice().sort((a, b) => b.end - a.end).slice(0, 5)).score,
  },
  ...extra,
];

/* ---------- 차트 (의존성 없이 SVG 직접) ---------- */

function svg(w, h, kids) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.setAttribute('role', 'img');
  s.innerHTML = kids;
  return s;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function lineChart(series, opts = {}) {
  const W = 900, H = opts.h || 260, P = { t: 10, r: 10, b: 22, l: 38 };
  const pts = series.flatMap((s) => s.pts);
  if (!pts.length) return el('p', { class: 'note', text: '데이터 없음' });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max(10, (y1 - y0) * 0.08);
  y0 = Math.floor((y0 - pad) / 10) * 10;
  y1 = Math.ceil((y1 + pad) / 10) * 10;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (v) => P.l + ((v - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v) => H - P.b - ((v - y0) / (y1 - y0 || 1)) * (H - P.t - P.b);
  let g = '';
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const v = y0 + ((y1 - y0) * i) / steps;
    g += `<line class="grid" x1="${P.l}" y1="${Y(v).toFixed(1)}" x2="${W - P.r}" y2="${Y(v).toFixed(1)}"/>`;
    g += `<text class="axis" x="${P.l - 5}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
  }
  for (const t of opts.xTicks || []) {
    g += `<text class="axis" x="${X(t.v).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(t.label)}</text>`;
  }
  for (const s of series) {
    const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
    g += `<path class="${s.cls}" d="${d}"/>`;
  }
  for (const m of opts.marks || []) {
    g += `<circle class="dot" cx="${X(m[0]).toFixed(1)}" cy="${Y(m[1]).toFixed(1)}" r="3"/>`;
    g += `<text class="axis" x="${X(m[0]).toFixed(1)}" y="${(Y(m[1]) - 7).toFixed(1)}" text-anchor="middle">${esc(m[2])}</text>`;
  }
  return svg(W, H, g);
}

function barChart(rows, opts = {}) {
  const W = 900, H = opts.h || 170, P = { t: 10, r: 8, b: 30, l: 34 };
  if (!rows.length) return el('p', { class: 'note', text: '데이터 없음' });
  const max = Math.max(...rows.map((r) => r.v), 1);
  const bw = (W - P.l - P.r) / rows.length;
  let g = '';
  for (let i = 0; i <= 2; i++) {
    const v = (max * i) / 2;
    const y = H - P.b - ((H - P.t - P.b) * i) / 2;
    g += `<line class="grid" x1="${P.l}" y1="${y}" x2="${W - P.r}" y2="${y}"/>`;
    g += `<text class="axis" x="${P.l - 5}" y="${y + 3}" text-anchor="end">${Math.round(v)}</text>`;
  }
  rows.forEach((r, i) => {
    const h = ((H - P.t - P.b) * r.v) / max;
    const x = P.l + i * bw + bw * 0.16;
    g += `<rect class="bar" x="${x.toFixed(1)}" y="${(H - P.b - h).toFixed(1)}" width="${(bw * 0.68).toFixed(1)}" height="${h.toFixed(1)}"><title>${esc(r.label)}: ${r.v}</title></rect>`;
    if (rows.length <= 32 || i % 2 === 0)
      g += `<text class="axis" x="${(P.l + i * bw + bw / 2).toFixed(1)}" y="${H - 16}" text-anchor="middle">${esc(r.label)}</text>`;
    if (r.sub != null)
      g += `<text class="axis" x="${(P.l + i * bw + bw / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(r.sub)}</text>`;
  });
  return svg(W, H, g);
}

/* ---------- 체스판 ---------- */

// 백은 윤곽 글리프, 흑은 채운 글리프. 색 대비를 섀도우로 만들지 않는다.
const GLYPH = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

function boardFromMoves(moves, flip) {
  const c = new Chess();
  let ok = 0;
  for (const m of moves) {
    try { c.move(m); ok++; } catch { break; }
  }
  const rows = c.board(); // 8행, a8부터
  const cells = [];
  const order = flip ? [...rows].reverse().map((r) => [...r].reverse()) : rows;
  order.forEach((row, ri) => {
    row.forEach((sq, ci) => {
      // 뒤집어도 칸 색은 그대로다. (7-ri)+(7-ci) 의 홀짝은 ri+ci 와 같다.
      const dark = (ri + ci) % 2 === 1;
      cells.push(
        el('div', {
          class: dark ? 'dark' : 'light',
          text: sq ? GLYPH[sq.color][sq.type] : '',
          'aria-hidden': 'true',
        })
      );
    });
  });
  return {
    node: el('div', { class: 'board', role: 'img', 'aria-label': `수순 ${moves.join(' ') || '초기 국면'} 이후 국면` }, cells),
    fen: c.fen(),
    ok,
  };
}

/* ---------- 상태 ---------- */

let DATA = null;
const S = {
  tab: 'overview',
  period: 'all',
  from: null,
  to: null,
  color: 'both',
  band: 'all',
  min: 10,
  openOpening: null, // "w|Italian Game"
  expPath: [],
  expColor: 'w',
  gamesShown: 100,
};

let BANDS = [];

function filtered() {
  let g = DATA.games;
  const last = DATA.totals.lastEnd;
  if (S.period !== 'all' && S.period !== 'custom') {
    const cut = last - Number(S.period) * 86400;
    g = g.filter((x) => x.end >= cut);
  } else if (S.period === 'custom' && (S.from || S.to)) {
    const f = S.from ? Date.parse(S.from + 'T00:00:00+09:00') / 1000 : -Infinity;
    const t = S.to ? Date.parse(S.to + 'T23:59:59+09:00') / 1000 : Infinity;
    g = g.filter((x) => x.end >= f && x.end <= t);
  }
  if (S.color !== 'both') g = g.filter((x) => x.color === S.color);
  if (S.band !== 'all') {
    const [a, b] = S.band.split('-').map(Number);
    g = g.filter((x) => x.me >= a && x.me <= b);
  }
  return g;
}

/* ---------- Overview ---------- */

function statList(items) {
  const d = el('dl', { class: 'stats' });
  for (const [k, v, sub] of items) {
    d.append(el('div', {}, el('dt', { text: k }), el('dd', {}, el('span', { text: String(v) }), sub ? el('small', { text: ' ' + sub }) : null)));
  }
  return d;
}

function familyRows(games, color) {
  const g = color ? games.filter((x) => x.color === color) : games;
  return [...groupBy(g, (x) => x.family)]
    .map(([key, gs]) => ({ key, games: gs, s: wdl(gs) }))
    .sort((a, b) => b.s.n - a.s.n);
}

function bestWorst(games, color, min) {
  const rows = familyRows(games, color).filter((r) => r.s.n >= min);
  const byScore = rows.slice().sort((a, b) => b.s.score - a.s.score);
  return { best: byScore[0], worst: byScore.at(-1), rows };
}

function renderOverview(g) {
  const p = $('#panel-overview');
  p.replaceChildren();
  const s = wdl(g);
  const ratings = g.map((x) => x.me);
  const period = g.length ? `${dstr(g[0].end)} ~ ${dstr(g.at(-1).end)}` : '~';

  p.append(el('h2', { text: '요약' }));
  p.append(
    statList([
      ['게임', s.n],
      ['승', s.w],
      ['무', s.d],
      ['패', s.l],
      ['승률', n1(s.wr) + '%'],
      ['Score', n1(s.score) + '%', '(무=0.5)'],
      ['마지막 rating', g.length ? g.at(-1).me : '~'],
      ['최고 rating', ratings.length ? Math.max(...ratings) : '~'],
      ['백', g.filter((x) => x.color === 'w').length],
      ['흑', g.filter((x) => x.color === 'b').length],
      ['평균 상대', ratings.length ? Math.round(avg(g.map((x) => x.opp))) : '~'],
      ['분석 기간', period],
    ])
  );

  /* 핵심 질문 10개 */
  p.append(el('h2', { text: '핵심 질문' }));
  const qa = el('dl', { class: 'qa' });
  const q = (question, node) => qa.append(el('div', {}, el('dt', { text: question }), el('dd', {}, node)));
  const nameOf = (r) => (r ? el('span', {}, el('b', { text: r.key }), el('span', { class: 'n', text: ` ${r.s.n}판 · ${n1(r.s.wr)}% · ${r.s.w}/${r.s.d}/${r.s.l}` })) : el('span', { class: 'n', text: '해당 없음' }));

  const wRows = familyRows(g, 'w');
  const bRows = familyRows(g, 'b');
  q('1. 백으로 무엇을 가장 많이 두는가', nameOf(wRows[0]));
  q('2. 흑으로 무엇을 가장 많이 두는가', nameOf(bRows[0]));

  const bw = bestWorst(g, null, S.min);
  q(`3. 승률이 좋은 오프닝 (${S.min}판+)`, nameOf(bw.best));
  q(`4. 승률이 나쁜 오프닝 (${S.min}판+)`, nameOf(bw.worst));
  const big = bw.rows.filter((r) => r.s.n >= Math.max(S.min, 20)).sort((a, b) => b.s.score - a.s.score)[0];
  q('5. 충분히 많이 둔 것 중 최고 (20판+)', nameOf(big));

  const vs = (first) => {
    const set = g.filter((x) => x.color === 'b' && x.plies[0] === first);
    const rows = [...groupBy(set, (x) => x.plies[1] || '?')]
      .map(([k, gs]) => ({ k, s: wdl(gs) }))
      .sort((a, b) => b.s.n - a.s.n)
      .slice(0, 4);
    if (!rows.length) return el('span', { class: 'n', text: '해당 없음' });
    const box = el('span');
    rows.forEach((r, i) => {
      if (i) box.append(el('span', { class: 'n', text: ' · ' }));
      box.append(el('b', { text: r.k }), el('span', { class: 'n', text: ` ${r.s.n}판 ${n1(r.s.wr)}%` }));
    });
    return box;
  };
  q('6. 1.e4를 받았을 때 내 선택', vs('e4'));
  q('7. 1.d4를 받았을 때 내 선택', vs('d4'));

  const deep = wRows[0]
    ? (() => {
        const top = wRows[0];
        const seq = [...groupBy(top.games, (x) => x.plies.slice(0, 6).join(' '))].sort((a, b) => b[1].length - a[1].length)[0];
        const san = seq[0].split(' ').map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m)).join(' ');
        return el('span', {}, el('b', { text: san }), el('span', { class: 'n', text: ` ${seq[1].length}판 · ${top.key} ${top.s.n}판 중` }));
      })()
    : el('span', { class: 'n', text: '해당 없음' });
  q('8. 백 최다 오프닝에서 자주 들어가는 수순', deep);

  /* 9. repertoire drift: 최근 90일 vs 그 이전 */
  const cut = DATA.totals.lastEnd - 90 * 86400;
  const share = (set, color) => {
    const c = set.filter((x) => x.color === color);
    const rows = [...groupBy(c, (x) => x.family)].map(([k, gs]) => [k, gs.length]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { n: c.length, rows };
  };
  const drift = el('span');
  for (const color of ['w', 'b']) {
    const recent = share(g.filter((x) => x.end >= cut), color);
    const older = share(g.filter((x) => x.end < cut), color);
    const fmt = (o) => (o.n ? `${o.n}판 · ` + o.rows.map(([k, v]) => `${k} ${Math.round((v / o.n) * 100)}%`).join(', ') : '기록 없음');
    drift.append(
      el('span', {}, el('b', { text: color === 'w' ? '백' : '흑' }), el('span', { class: 'n', text: ` 최근 90일: ${fmt(recent)} / 이전: ${fmt(older)}` })
      ),
      el('br')
    );
  }
  q('9. 최근 repertoire가 과거와 달라졌는가', drift);

  /* 10. rating 추세 */
  let trend = el('span', { class: 'n', text: '데이터 없음' });
  if (g.length >= 4) {
    const k = Math.min(50, Math.floor(g.length / 2));
    const a = avg(g.slice(-k).map((x) => x.me));
    const b = avg(g.slice(-2 * k, -k).map((x) => x.me));
    const net = g.at(-1).me - g[0].me;
    trend = el('span', {}, el('b', { text: `${sign(net)} (${g[0].me} → ${g.at(-1).me})` }), el('span', { class: 'n', text: ` · 최근 ${k}판 평균 ${Math.round(a)} vs 그 전 ${k}판 ${Math.round(b)} (${sign(Math.round(a - b))})` }));
  }
  q('10. Rapid rating은 실제로 오르고 있는가', trend);
  p.append(qa);

  /* 결과 분해 */
  p.append(el('h2', { text: '결과' }));
  const resRows = [
    { key: '전체', games: g, s: wdl(g) },
    { key: '백', games: g.filter((x) => x.color === 'w'), s: wdl(g.filter((x) => x.color === 'w')) },
    { key: '흑', games: g.filter((x) => x.color === 'b'), s: wdl(g.filter((x) => x.color === 'b')) },
  ];
  p.append(
    table('res', [
      { k: 'name', label: '구분', get: (r) => r.key },
      { k: 'games', label: 'Games', cls: 'n', get: (r) => r.s.n },
      { k: 'wdl', label: 'W / D / L', get: (r) => wdlCell(r.s) },
      { k: 'wr', label: 'Win %', cls: 'n', get: (r) => n1(r.s.wr) + '%' },
      { k: 'score', label: 'Score %', cls: 'n', get: (r) => n1(r.s.score) + '%' },
    ], resRows)
  );

  /* 상대 실력 */
  p.append(el('h2', { text: '상대 실력' }));
  p.append(el('h3', { text: '상대 rating 구간별' }));
  const oppBands = BANDS.map((b) => {
    const set = g.filter((x) => x.opp >= b.a && x.opp <= b.b);
    return { key: b.label, games: set, s: wdl(set) };
  }).filter((r) => r.s.n);
  p.append(
    table('oppband', [
      { k: 'name', label: '상대 rating', get: (r) => r.key, val: (r) => r.key },
      { k: 'games', label: 'Games', cls: 'n', get: (r) => r.s.n, val: (r) => r.s.n },
      { k: 'wdl', label: 'W / D / L', get: (r) => wdlCell(r.s) },
      { k: 'wr', label: 'Win %', cls: 'n', get: (r) => n1(r.s.wr) + '%', val: (r) => r.s.wr },
    ], oppBands, { sort: 'name', dir: 1 })
  );

  p.append(el('h3', { text: '나와의 rating 차이별' }));
  const diffDefs = [
    ['나보다 100+ 낮음', (d) => d <= -100],
    ['50~99 낮음', (d) => d > -100 && d <= -50],
    ['비슷함 (±49)', (d) => d > -50 && d < 50],
    ['50~99 높음', (d) => d >= 50 && d < 100],
    ['나보다 100+ 높음', (d) => d >= 100],
  ];
  const diffRows = diffDefs.map(([label, f]) => {
    const set = g.filter((x) => f(x.opp - x.me));
    return { key: label, games: set, s: wdl(set) };
  }).filter((r) => r.s.n);
  p.append(
    table('oppdiff', [
      { k: 'name', label: '상대 rating ~ 내 rating', get: (r) => r.key },
      { k: 'games', label: 'Games', cls: 'n', get: (r) => r.s.n },
      { k: 'wdl', label: 'W / D / L', get: (r) => wdlCell(r.s) },
      { k: 'wr', label: 'Win %', cls: 'n', get: (r) => n1(r.s.wr) + '%' },
    ], diffRows)
  );

  /* 게임 길이 · 종료 사유 */
  const cols2 = el('div', { class: 'cols' });
  const lenBox = el('div', {}, el('h3', { text: '게임 길이 (수)' }));
  const byRes = (r) => g.filter((x) => x.result === r).map((x) => x.len);
  lenBox.append(
    statList([
      ['평균', n1(avg(g.map((x) => x.len)))],
      ['승리', n1(avg(byRes('win')))],
      ['무승부', n1(avg(byRes('draw')))],
      ['패배', n1(avg(byRes('loss')))],
      ['최장', g.length ? Math.max(...g.map((x) => x.len)) : '~'],
      ['최단', g.length ? Math.min(...g.map((x) => x.len)) : '~'],
    ])
  );
  const termBox = el('div', {}, el('h3', { text: '종료 사유' }));
  const termRows = [...groupBy(g, (x) => x.term)].map(([k, gs]) => ({ key: k, games: gs, s: wdl(gs) })).sort((a, b) => b.s.n - a.s.n);
  termBox.append(
    table('term', [
      { k: 'name', label: '사유', get: (r) => r.key, val: (r) => r.key },
      { k: 'games', label: 'Games', cls: 'n', get: (r) => r.s.n, val: (r) => r.s.n },
      { k: 'share', label: '비중', cls: 'n', get: (r) => pct(r.s.n, g.length), val: (r) => r.s.n },
      { k: 'wdl', label: 'W / D / L', get: (r) => wdlCell(r.s) },
    ], termRows)
  );
  cols2.append(lenBox, termBox);
  p.append(cols2);

  /* 활동 */
  p.append(el('h2', { text: '활동 (Asia/Seoul)' }));
  const months = [...groupBy(g, (x) => mstr(x.end))].sort((a, b) => a[0].localeCompare(b[0]));
  p.append(el('h3', { text: '월별' }));
  p.append(el('figure', { class: 'chart' }, barChart(months.map(([k, gs]) => ({ label: k, v: gs.length, sub: n1(wdl(gs).wr) + '%' })), { h: 180 })));
  p.append(el('p', { class: 'note', text: '막대 아래 숫자는 그 달의 승률.' }));

  const wk = groupBy(g, (x) => seoul(x.end).weekday);
  p.append(el('h3', { text: '요일별' }));
  p.append(el('figure', { class: 'chart' }, barChart(WEEK.map((d) => {
    const gs = wk.get(d) || [];
    return { label: d, v: gs.length, sub: gs.length ? n1(wdl(gs).wr) + '%' : '' };
  }), { h: 160 })));

  const hr = groupBy(g, (x) => Number(seoul(x.end).hour) % 24);
  p.append(el('h3', { text: '시간대별' }));
  p.append(el('figure', { class: 'chart' }, barChart(Array.from({ length: 24 }, (_, h) => {
    const gs = hr.get(h) || [];
    return { label: String(h), v: gs.length, sub: gs.length >= 5 ? n1(wdl(gs).wr) + '%' : '' };
  }), { h: 170 })));
  p.append(el('p', { class: 'note', text: '승률은 5판 이상인 시간대만 표기.' }));

  /* Accuracy */
  renderAccuracy(p, g);
}

function renderAccuracy(p, g) {
  p.append(el('h2', { text: 'Accuracy' }));
  const acc = g.filter((x) => x.acc);
  p.append(
    el('p', {
      class: 'note',
      text:
        `Accuracy available: ${acc.length} / ${g.length} games (${pct(acc.length, g.length)}). ` +
        'Chess.com이 Game Review를 계산해 둔 게임에만 값이 있다. 없는 게임에는 값을 만들지 않는다. ' +
        '아래 숫자는 전체 전적이 아니라 이 부분집합의 통계다.',
    })
  );
  if (!acc.length) return;
  p.append(
    statList([
      ['내 평균', n1(avg(acc.map((x) => x.acc.me)))],
      ['상대 평균', n1(avg(acc.map((x) => x.acc.opp)))],
      ['백에서', n1(avg(acc.filter((x) => x.color === 'w').map((x) => x.acc.me)))],
      ['흑에서', n1(avg(acc.filter((x) => x.color === 'b').map((x) => x.acc.me)))],
      ['승리 시', n1(avg(acc.filter((x) => x.result === 'win').map((x) => x.acc.me)))],
      ['패배 시', n1(avg(acc.filter((x) => x.result === 'loss').map((x) => x.acc.me)))],
    ])
  );

  const cols = el('div', { class: 'cols' });
  const bandBox = el('div', {}, el('h3', { text: '내 rating 구간별' }));
  const bandRows = BANDS.map((b) => {
    const set = acc.filter((x) => x.me >= b.a && x.me <= b.b);
    return { key: b.label, n: set.length, me: avg(set.map((x) => x.acc.me)), opp: avg(set.map((x) => x.acc.opp)) };
  }).filter((r) => r.n);
  bandBox.append(
    table('accband', [
      { k: 'name', label: '내 rating', get: (r) => r.key, val: (r) => r.key },
      { k: 'n', label: 'Games', cls: 'n', get: (r) => r.n, val: (r) => r.n },
      { k: 'me', label: '내 Acc', cls: 'n', get: (r) => n1(r.me), val: (r) => r.me },
      { k: 'opp', label: '상대 Acc', cls: 'n', get: (r) => n1(r.opp), val: (r) => r.opp },
    ], bandRows, { sort: 'name', dir: 1 })
  );

  const opBox = el('div', {}, el('h3', { text: '오프닝별 (3판+)' }));
  const opRows = [...groupBy(acc, (x) => x.family)]
    .map(([key, gs]) => ({ key, n: gs.length, me: avg(gs.map((x) => x.acc.me)), s: wdl(gs) }))
    .filter((r) => r.n >= 3);
  opBox.append(
    table('accop', [
      { k: 'name', label: 'Opening', cls: 'name', get: (r) => r.key, val: (r) => r.key },
      { k: 'n', label: 'Games', cls: 'n', get: (r) => r.n, val: (r) => r.n },
      { k: 'me', label: '내 Acc', cls: 'n', get: (r) => n1(r.me), val: (r) => r.me },
      { k: 'wr', label: 'Win %', cls: 'n', get: (r) => n1(r.s.wr) + '%', val: (r) => r.s.wr },
    ], opRows, { sort: 'me' })
  );
  cols.append(bandBox, opBox);
  p.append(cols);

  p.append(el('h3', { text: '시간에 따른 추세 (월 평균)' }));
  const ms = [...groupBy(acc, (x) => mstr(x.end))].sort((a, b) => a[0].localeCompare(b[0]));
  p.append(el('figure', { class: 'chart' }, barChart(ms.map(([k, gs]) => ({ label: k, v: Math.round(avg(gs.map((x) => x.acc.me))), sub: `${gs.length}판` })), { h: 170 })));
}

/* ---------- Rating ---------- */

function renderRating(g) {
  const p = $('#panel-rating');
  p.replaceChildren();
  p.append(el('h2', { text: 'Rating History' }));
  if (!g.length) return p.append(el('p', { class: 'note', text: '해당 조건의 게임이 없다.' }));

  const win = Math.min(10, Math.max(2, Math.round(g.length / 20)));
  const pts = g.map((x) => [x.end, x.me]);
  const ma = [];
  for (let i = 0; i < g.length; i++) {
    const s = Math.max(0, i - win + 1);
    ma.push([g[i].end, avg(g.slice(s, i + 1).map((x) => x.me))]);
  }
  const peak = g.reduce((a, b) => (b.me > a.me ? b : a), g[0]);
  const xTicks = [...groupBy(g, (x) => mstr(x.end))]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, gs]) => ({ v: gs[0].end, label: k }));
  p.append(
    el('figure', { class: 'chart' },
      lineChart([{ pts, cls: 'line' }, { pts: ma, cls: 'avg' }], { h: 280, xTicks, marks: [[peak.end, peak.me, `최고 ${peak.me}`]] }),
      el('div', { class: 'legend' }, el('span', { text: '게임별 rating' }), el('span', { class: 'k1', text: `${win}게임 이동평균` }))
    )
  );

  p.append(
    statList([
      ['시작', g[0].me],
      ['마지막', g.at(-1).me],
      ['변화', sign(g.at(-1).me - g[0].me)],
      ['최고', Math.max(...g.map((x) => x.me))],
      ['최저', Math.min(...g.map((x) => x.me))],
      ['평균', Math.round(avg(g.map((x) => x.me)))],
    ])
  );

  p.append(el('h2', { text: '월별' }));
  const rows = [...groupBy(g, (x) => mstr(x.end))]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, gs]) => ({ key, games: gs, s: wdl(gs), start: gs[0].me, end: gs.at(-1).me, hi: Math.max(...gs.map((x) => x.me)), lo: Math.min(...gs.map((x) => x.me)) }));
  p.append(
    table('ratmonth', [
      { k: 'name', label: '월', get: (r) => r.key, val: (r) => r.key },
      { k: 'games', label: 'Games', cls: 'n', get: (r) => r.s.n, val: (r) => r.s.n },
      { k: 'wdl', label: 'W / D / L', get: (r) => wdlCell(r.s) },
      { k: 'wr', label: 'Win %', cls: 'n', get: (r) => n1(r.s.wr) + '%', val: (r) => r.s.wr },
      { k: 'start', label: '시작', cls: 'n', get: (r) => r.start, val: (r) => r.start },
      { k: 'end', label: '끝', cls: 'n', get: (r) => r.end, val: (r) => r.end },
      { k: 'chg', label: '변화', cls: 'n', get: (r) => sign(r.end - r.start), val: (r) => r.end - r.start },
      { k: 'hi', label: '최고', cls: 'n', get: (r) => r.hi, val: (r) => r.hi },
      { k: 'lo', label: '최저', cls: 'n', get: (r) => r.lo, val: (r) => r.lo },
    ], rows, { sort: 'name', dir: 1 })
  );
}

/* ---------- Openings ---------- */

function openingDetail(row, color) {
  const gs = row.games;
  const s = row.s;
  const box = el('div', { class: 'dpanel' });
  const ecos = [...new Set(gs.map((x) => x.eco).filter(Boolean))].sort();
  box.append(
    el('h3', {}, el('span', { text: row.key }), el('span', { class: 'tag-eco', text: ecos.join(' ') || '~', style: 'margin-left:8px' })),
    statList([
      ['게임', s.n],
      ['승 / 무 / 패', `${s.w} / ${s.d} / ${s.l}`],
      ['승률', n1(s.wr) + '%'],
      ['Score', n1(s.score) + '%'],
      ['내 평균 rating', Math.round(avg(gs.map((x) => x.me)))],
      ['평균 상대 rating', Math.round(avg(gs.map((x) => x.opp)))],
      ['평균 길이', n1(avg(gs.map((x) => x.len))) + '수'],
      ['최근 30일', gs.filter((x) => x.end >= DATA.totals.lastEnd - 30 * 86400).length + '판'],
      ['마지막 사용', dstr(gs.reduce((a, b) => (b.end > a.end ? b : a)).end)],
    ])
  );

  /* 대표 수순: 가장 흔한 8수(16플라이) 앞부분 */
  const lines = [...groupBy(gs, (x) => x.line)].sort((a, b) => b[1].length - a[1].length);
  const repr = [...groupBy(gs, (x) => x.plies.slice(0, 6).join(' '))].sort((a, b) => b[1].length - a[1].length)[0];
  const fmtSan = (arr) => arr.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m)).join(' ');
  box.append(el('p', { class: 'moves', text: `대표 수순 · ${fmtSan(repr[0].split(' '))} (${repr[1].length}판)` }));
  if (lines.length > 1) {
    box.append(
      el('p', { class: 'moves', text: '세부 라인 · ' + lines.slice(0, 6).map(([k, v]) => `${k} (${v.length})`).join(' / ') })
    );
  }

  box.append(el('h3', { text: `게임 ${gs.length}판` }));
  box.append(gamesTable('op-' + row.key, gs, 30));
  return box;
}

function gamesTable(id, gs, limit) {
  const rows = gs.slice().sort((a, b) => b.end - a.end);
  const resTag = (r) => el('span', { class: r === 'win' ? 'res-w' : r === 'draw' ? 'res-d' : 'res-l', text: r === 'win' ? 'W 승' : r === 'draw' ? 'D 무' : 'L 패' });
  return table(id, [
    { k: 'date', label: '날짜', cls: 'n', get: (r) => dstr(r.end), val: (r) => r.end },
    { k: 'color', label: '내 색', get: (r) => (r.color === 'w' ? '백' : '흑'), val: (r) => r.color },
    { k: 'white', label: 'White', get: (r) => (r.color === 'w' ? DATA.user : r.oppName), val: (r) => (r.color === 'w' ? DATA.user : r.oppName) },
    { k: 'black', label: 'Black', get: (r) => (r.color === 'b' ? DATA.user : r.oppName), val: (r) => (r.color === 'b' ? DATA.user : r.oppName) },
    { k: 'me', label: '내 rating', cls: 'n', get: (r) => r.me, val: (r) => r.me },
    { k: 'opp', label: '상대', cls: 'n', get: (r) => r.opp, val: (r) => r.opp },
    { k: 'res', label: '결과', get: (r) => resTag(r.result), val: (r) => r.result },
    { k: 'term', label: '종료 사유', get: (r) => r.term, val: (r) => r.term },
    { k: 'op', label: 'Opening', cls: 'name', get: (r) => r.line || '~', val: (r) => r.line || '' },
    { k: 'len', label: '수', cls: 'n', get: (r) => r.len, val: (r) => r.len },
    { k: 'acc', label: 'Acc', cls: 'n', get: (r) => (r.acc ? n1(r.acc.me) : '~'), val: (r) => (r.acc ? r.acc.me : -1) },
    {
      k: 'link',
      label: '원본',
      get: (r) => el('a', { href: r.url, target: '_blank', rel: 'noopener', text: 'chess.com ↗', onclick: (e) => e.stopPropagation() }),
    },
  ], rows, { sort: 'date', limit, foot: limit && rows.length > limit ? `${limit} / ${rows.length}판 표시 · Games 탭에서 전체를 본다` : null });
}

function openingSection(p, color) {
  const g = filtered().filter((x) => x.color === color);
  const label = color === 'w' ? 'White' : 'Black';
  p.append(el('h2', { text: `${label} · 오프닝 (${g.length}판)` }));
  const all = familyRows(g);
  const rows = all.filter((r) => r.s.n >= S.min);
  const hidden = all.length - rows.length;
  p.append(
    table('op-' + color,
      wdlCols('Opening', (r) => el('span', {}, el('span', { text: r.key }), el('span', { class: 'tag-eco', text: [...new Set(r.games.map((x) => x.eco))].sort()[0] || '~', style: 'margin-left:6px' })),
        [
          { k: 'opp', label: '평균 상대', cls: 'n', get: (r) => Math.round(avg(r.games.map((x) => x.opp))), val: (r) => avg(r.games.map((x) => x.opp)) },
          { k: 'my', label: '내 평균', cls: 'n', get: (r) => Math.round(avg(r.games.map((x) => x.me))), val: (r) => avg(r.games.map((x) => x.me)) },
          { k: 'last', label: '마지막', cls: 'n', get: (r) => dstr(Math.max(...r.games.map((x) => x.end))), val: (r) => Math.max(...r.games.map((x) => x.end)) },
        ]),
      rows,
      {
        sort: 'games',
        onRow: (r) => {
          const key = color + '|' + r.key;
          S.openOpening = S.openOpening === key ? null : key;
          render();
        },
        isOpen: (r) => S.openOpening === color + '|' + r.key,
        detail: (r) => openingDetail(r, color),
        foot: `${rows.length}개 오프닝 표시 · 최소 ${S.min}판 미만 ${hidden}개 숨김 · 행을 누르면 상세`,
      }
    )
  );
}

function renderOpenings() {
  const p = $('#panel-openings');
  p.replaceChildren();
  p.append(el('p', { class: 'note', text: '오프닝은 Chess.com이 게임에 붙인 ECOUrl에서 이름을 뽑아 계열로 묶은 것이다. 승/무/패는 모두 MogwaMaster 관점이다. Score %는 무승부를 0.5로 센 값.' }));

  if (S.color !== 'b') openingSection(p, 'w');
  if (S.color !== 'w') openingSection(p, 'b');

  const g = filtered();

  /* 백 첫 수 분포 */
  if (S.color !== 'b') {
    const w = g.filter((x) => x.color === 'w');
    p.append(el('h2', { text: 'White · 첫 수 분포' }));
    const rows = [...groupBy(w, (x) => x.plies[0])].map(([key, gs]) => ({ key, games: gs, s: wdl(gs) }));
    p.append(table('wfirst', wdlCols('1수', (r) => `1. ${r.key}`, [
      { k: 'share', label: '비중', cls: 'n', get: (r) => pct(r.s.n, w.length), val: (r) => r.s.n },
    ]), rows, { sort: 'games' }));
  }

  /* 흑: 상대 첫 수 -> 내 defense */
  if (S.color !== 'w') {
    const b = g.filter((x) => x.color === 'b');
    p.append(el('h2', { text: 'Black · 상대 첫 수 → 내 응수' }));
    const byFirst = [...groupBy(b, (x) => x.plies[0])].sort((a, b2) => b2[1].length - a[1].length);
    for (const [first, gs] of byFirst) {
      if (gs.length < 3) continue;
      const s = wdl(gs);
      p.append(el('h3', {}, el('span', { text: `Against 1.${first}` }), el('span', { class: 'n', style: 'font-family:var(--num);font-size:11px;color:var(--text-3)', text: `  ${s.n}판 · ${n1(s.wr)}% · ${s.w}/${s.d}/${s.l}` })));
      const rows = [...groupBy(gs, (x) => x.plies[1] || '?')].map(([reply, rg]) => ({
        key: reply,
        games: rg,
        s: wdl(rg),
        names: [...groupBy(rg, (x) => x.family)].sort((a, b3) => b3[1].length - a[1].length).slice(0, 3).map(([k, v]) => `${k} (${v.length})`).join(', '),
      }));
      p.append(table('vs-' + first, wdlCols('내 응수', (r) => `1...${r.key}`, [
        { k: 'names', label: '주요 오프닝 이름', cls: 'name', get: (r) => r.names },
      ]), rows, { sort: 'games' }));
    }
    const rest = byFirst.filter(([, gs]) => gs.length < 3);
    if (rest.length) p.append(el('p', { class: 'note', text: `3판 미만인 상대 첫 수 ${rest.length}종 생략: ${rest.map(([k, v]) => `${k}(${v.length})`).join(', ')}` }));
  }
}

/* ---------- Move Explorer ---------- */

function renderExplorer() {
  const p = $('#panel-explorer');
  p.replaceChildren();
  const color = S.color === 'both' ? S.expColor : S.color;
  const g = filtered().filter((x) => x.color === color);

  p.append(el('h2', { text: `Move Explorer · ${color === 'w' ? 'White' : 'Black'}` }));
  if (S.color === 'both') {
    const seg = el('div', { class: 'seg' });
    for (const c of ['w', 'b']) {
      seg.append(el('button', {
        type: 'button',
        class: S.expColor === c ? 'on' : false,
        text: c === 'w' ? '백' : '흑',
        onclick: () => { S.expColor = c; S.expPath = []; render(); },
      }));
    }
    p.append(el('p', { class: 'note' }, el('span', { text: '색 ' }), seg));
  }

  const path = S.expPath;
  const set = g.filter((x) => path.every((m, i) => x.plies[i] === m));

  const crumbs = el('div', { class: 'crumbs' });
  crumbs.append(el('button', { type: 'button', text: '시작', onclick: () => { S.expPath = []; render(); } }));
  path.forEach((m, i) => {
    const label = i % 2 === 0 ? `${i / 2 + 1}.${m}` : m;
    crumbs.append(el('button', { type: 'button', text: label, onclick: () => { S.expPath = path.slice(0, i + 1); render(); } }));
  });
  p.append(crumbs);

  const wrap = el('div', { class: 'explorer' });
  const left = el('div');
  const s = wdl(set);
  left.append(
    statList([
      ['이 수순 게임', s.n],
      ['승 / 무 / 패', `${s.w} / ${s.d} / ${s.l}`],
      ['승률', n1(s.wr) + '%'],
      ['Score', n1(s.score) + '%'],
      ['전체 대비', pct(s.n, g.length)],
    ])
  );

  const depth = path.length;
  if (depth >= 16) {
    left.append(el('p', { class: 'note', text: 'JSON에는 게임마다 앞 16플라이(8수)만 저장한다. 더 깊이 들어가려면 원본 PGN을 본다.' }));
  } else {
    const kids = [...groupBy(set, (x) => x.plies[depth])]
      .map(([key, gs]) => ({ key, games: gs, s: wdl(gs) }))
      .sort((a, b) => b.s.n - a.s.n);
    const mover = depth % 2 === 0 ? '백' : '흑';
    left.append(el('h3', { text: `${Math.floor(depth / 2) + 1}${depth % 2 === 0 ? '' : '...'} 다음 수 · ${mover}` }));
    left.append(
      table('tree-' + depth + path.join(''),
        wdlCols('수', (r) => (depth % 2 === 0 ? `${depth / 2 + 1}. ${r.key}` : `${Math.floor(depth / 2) + 1}... ${r.key}`), [
          { k: 'share', label: '비중', cls: 'n', get: (r) => pct(r.s.n, set.length), val: (r) => r.s.n },
        ]),
        kids,
        {
          sort: 'games',
          onRow: (r) => { S.expPath = [...path, r.key]; render(); },
          foot: '수를 누르면 그 수순으로 내려간다',
        }
      )
    );
  }

  if (set.length && set.length <= 400) {
    left.append(el('h3', { text: `이 수순의 게임 ${set.length}판` }));
    left.append(gamesTable('exp-' + path.join(''), set, 25));
  } else if (set.length) {
    left.append(el('p', { class: 'note', text: `이 수순에 ${set.length}판이 모여 있다. 수를 한 단계 더 내려가면 게임 목록이 보인다 (400판 이하일 때).` }));
  }

  const b = boardFromMoves(path, color === 'b');
  const right = el('div', {}, b.node, el('p', { class: 'bmeta', text: `${path.length ? path.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m)).join(' ') : '초기 국면'}` }), el('p', { class: 'bmeta', text: 'FEN ' + b.fen }), el('p', { class: 'note', text: color === 'b' ? '흑 시점으로 뒤집어 표시.' : '백 시점.' }));
  wrap.append(left, right);
  p.append(wrap);
  p.append(el('p', { class: 'note', text: '합법 수 판정과 국면 계산은 chess.js 1.4.0을 쓴다. 직접 만든 파서가 아니다.' }));
}

/* ---------- Games ---------- */

function renderGames(g) {
  const p = $('#panel-games');
  p.replaceChildren();
  p.append(el('h2', { text: `Games (${g.length}판)` }));
  p.append(gamesTable('all', g, S.gamesShown));
  if (g.length > S.gamesShown) {
    p.append(el('button', { class: 'more', type: 'button', text: `${Math.min(200, g.length - S.gamesShown)}판 더 보기`, onclick: () => { S.gamesShown += 200; render(); } }));
  }
  if (DATA.skippedGames.length) {
    p.append(el('h2', { text: `파싱 실패 ${DATA.skippedGames.length}판` }));
    p.append(el('p', { class: 'note', text: '조용히 버리지 않는다. 갱신 스크립트가 남긴 목록이다.' }));
    p.append(table('skip', [
      { k: 'url', label: '게임', get: (r) => el('a', { href: r.url, target: '_blank', rel: 'noopener', text: r.url }) },
      { k: 'why', label: '이유', get: (r) => r.reasons.join(', ') },
    ], DATA.skippedGames));
  }
}

/* ---------- 렌더 ---------- */

function render() {
  const g = filtered();
  const t = DATA.totals;
  $('#f-state').textContent =
    `선택 ${g.length}판 / 전체 Rapid ${t.analyzed}판 · ` +
    (g.length ? `${dstr(g[0].end)} ~ ${dstr(g.at(-1).end)} · ` : '') +
    `Accuracy 있는 게임 ${g.filter((x) => x.acc).length}판`;

  for (const b of $('#tabs').children) b.classList.toggle('on', b.value === S.tab);
  for (const id of ['overview', 'rating', 'openings', 'explorer', 'games']) {
    $('#panel-' + id).hidden = id !== S.tab;
  }
  if (S.tab === 'overview') renderOverview(g);
  else if (S.tab === 'rating') renderRating(g);
  else if (S.tab === 'openings') renderOpenings();
  else if (S.tab === 'explorer') renderExplorer();
  else renderGames(g);
}

function segHandler(sel, key, after) {
  $(sel).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of $(sel).children) x.classList.toggle('on', x === b);
    S[key] = key === 'min' ? Number(b.value) : b.value;
    after?.();
    render();
  });
}

function buildBands(games) {
  const all = games.flatMap((g) => [g.me, g.opp]);
  const lo = Math.floor(Math.min(...all) / 100) * 100;
  const hi = Math.floor(Math.max(...all) / 100) * 100;
  const out = [];
  for (let a = lo; a <= hi; a += 100) {
    out.push({ a, b: a + 99, label: `${a}~${a + 99}` });
  }
  return out;
}

async function boot() {
  let res;
  try {
    // 문서 base가 아니라 이 모듈 위치를 기준으로 잡는다.
    res = await fetch(new URL('data/rapid-summary.json', import.meta.url), { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    DATA = await res.json();
  } catch (e) {
    const err = $('#load-error');
    err.hidden = false;
    err.textContent = `데이터를 읽지 못했다 (${e.message}). chess/data/rapid-summary.json이 있는지, file:// 로 열지 않았는지 확인한다. 로컬에서는 저장소 루트에서 정적 서버를 띄운다: npx serve .`;
    return;
  }

  BANDS = buildBands(DATA.games);
  const t = DATA.totals;
  $('#head-meta').innerHTML =
    `<a href="${DATA.profile}" target="_blank" rel="noopener">MogwaMaster</a> · Rapid ${t.analyzed}판 ` +
    `(${dstr(t.firstEnd)} ~ ${dstr(t.lastEnd)}) · 마지막 ${t.lastRating} · 최고 ${t.peakRating} · ` +
    `출처 Chess.com Published Data API · 데이터 생성 ${dstr(Date.parse(DATA.generatedAt) / 1000)}`;

  const band = $('#f-band');
  band.append(el('option', { value: 'all', text: '전체' }));
  for (const b of BANDS) {
    const n = DATA.games.filter((g) => g.me >= b.a && g.me <= b.b).length;
    if (n) band.append(el('option', { value: `${b.a}-${b.b}`, text: `${b.label} (${n}판)` }));
  }
  band.addEventListener('change', () => { S.band = band.value; render(); });

  segHandler('#f-period', 'period', () => {
    $('#f-range').hidden = S.period !== 'custom';
    if (S.period === 'custom') {
      $('#f-from').value ||= dstr(t.firstEnd).replace(/\./g, '-');
      $('#f-to').value ||= dstr(t.lastEnd).replace(/\./g, '-');
      S.from = $('#f-from').value;
      S.to = $('#f-to').value;
    }
  });
  segHandler('#f-color', 'color', () => { S.openOpening = null; S.expPath = []; });
  segHandler('#f-min', 'min');
  for (const id of ['from', 'to']) {
    $('#f-' + id).addEventListener('change', () => { S[id] = $('#f-' + id).value; render(); });
  }

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    S.tab = b.value;
    location.hash = b.value;
    render();
  });
  if (location.hash) {
    const h = location.hash.slice(1);
    if ([...$('#tabs').children].some((b) => b.value === h)) S.tab = h;
  }

  $('#foot').innerHTML =
    `전체 게임 ${t.allGames}판 중 chess/rapid ${t.analyzed}판을 분석했다 ` +
    `(blitz ${t.byClass['chess/blitz'] || 0} · bullet ${t.byClass['chess/bullet'] || 0}은 제외). ` +
    `파싱 실패 ${t.skipped}판 · Accuracy 보유 ${t.accuracyAvailable}판. ` +
    `원본 PGN은 저장소 <code>data/chess/${DATA.user}-rapid-all.pgn</code>. ` +
    `Stockfish 기반 자체 분석은 Phase 2. Chess.com의 Game Review / Brilliant 같은 자체 지표를 재현한 것이 아니다.`;

  $('#filters').hidden = false;
  $('#tabs').hidden = false;
  render();
}

boot();
