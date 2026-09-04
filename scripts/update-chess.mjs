#!/usr/bin/env node
/* Chess.com Published Data API -> 정적 JSON + 원본 PGN.
   공개 PubAPI만 쓴다. 로그인·스크래핑·Premium endpoint는 쓰지 않는다.
   사용법: node scripts/update-chess.mjs [--user NAME] [--refresh]
   --refresh 는 캐시된 과거 월까지 전부 다시 받는다. 기본은 마지막 월만 갱신. */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const USER = args.includes('--user') ? args[args.indexOf('--user') + 1] : 'MogwaMaster';
const REFRESH = args.includes('--refresh');

const CACHE_DIR = path.join(ROOT, 'data/chess/cache');
const PGN_OUT = path.join(ROOT, `data/chess/${USER}-rapid-all.pgn`);
const JSON_OUT = path.join(ROOT, 'chess/data/rapid-summary.json');

// Chess.com은 정체를 밝히지 않는 요청을 막는다. 연락 가능한 URL을 넣는 게 공식 안내.
const HEADERS = {
  'User-Agent': 'hyojeb1.github.io chess-insights (+https://10hyojeb1.github.io/chess/)',
  Accept: 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * (i + 1);
      console.warn(`  ${res.status} ${url} -> ${wait}ms 뒤 재시도`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} ${url}`);
  }
  throw new Error(`재시도 초과: ${url}`);
}

/* ---------- PGN 헤더 / 수순 파싱 ---------- */

function pgnHeaders(pgn) {
  const h = {};
  const re = /^\[(\w+)\s+"([^"]*)"\]$/gm;
  let m;
  while ((m = re.exec(pgn))) h[m[1]] = m[2];
  return h;
}

// 주석·시계·수 번호·평가기호를 걷어내고 SAN 배열만 남긴다.
function pgnMoves(pgn) {
  const body = pgn.replace(/^\[[^\]]*\]\s*$/gm, '');
  const clean = body
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;[^\n]*/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\s*\.(\.\.)?/g, ' ')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ');
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => /^O-O(-O)?[+#]?$/.test(t) || /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$/.test(t));
}

// ECOUrl 슬러그에서 오프닝 이름(line)과 계열(family)을 뽑는다.
// 예: ".../openings/Sicilian-Defense-Najdorf-Variation-6.Be2-e5"
//  -> line "Sicilian Defense Najdorf Variation", family "Sicilian Defense"
function openingFromEcoUrl(url) {
  if (!url) return { line: null, family: null };
  const slug = decodeURIComponent(url.split('/openings/')[1] || '').split(/[?#]/)[0];
  if (!slug) return { line: null, family: null };
  // 슬러그는 "이름 + 변화수 표기"다. 변화수는 항상 "...", "3.Nf3", "-6.Be2" 꼴로 시작한다.
  // 예: Queens-Pawn-Opening-1...d5-2.c3 / Sicilian-Defense-Najdorf-Variation-6.Be2-e5
  const namePart = slug.split(/\.\.\.|\d+\./)[0].replace(/-\d+$/, '').replace(/-+$/, '');
  const line = (namePart.replace(/-/g, ' ').trim() || slug.replace(/-/g, ' ')).trim();
  // 계열: Defense/Opening/Gambit 같은 앵커 단어까지만 남겨 상위 이름으로 묶는다.
  const words = line.split(' ');
  const anchors = ['Defense', 'Opening', 'Game', 'Gambit', 'System', 'Attack', 'Variation', 'Countergambit'];
  let famEnd = words.length;
  for (let i = 0; i < words.length; i++) {
    if (anchors.includes(words[i])) {
      famEnd = i + 1;
      break;
    }
  }
  return { line, family: words.slice(0, famEnd).join(' ') };
}

const TERMINATION = {
  checkmated: 'checkmate',
  resigned: 'resigned',
  timeout: 'timeout',
  abandoned: 'abandoned',
  agreed: 'agreed',
  stalemate: 'stalemate',
  repetition: 'repetition',
  insufficient: 'insufficient',
  timevsinsufficient: 'timeout vs insufficient',
  '50move': '50-move',
  lose: 'lose',
  bughousepartnerlose: 'partner lost',
  kingofthehill: 'king of the hill',
  threecheck: 'three check',
};
const LOSS_CODES = new Set([
  'checkmated', 'timeout', 'resigned', 'lose', 'abandoned',
  'kingofthehill', 'threecheck', 'bughousepartnerlose',
]);
const DRAW_CODES = new Set([
  'agreed', 'repetition', 'stalemate', 'insufficient', 'timevsinsufficient', '50move',
]);

/* ---------- 수집 ---------- */

async function main() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(JSON_OUT), { recursive: true });

  console.log(`플레이어: ${USER}`);
  const { archives } = await getJSON(
    `https://api.chess.com/pub/player/${USER.toLowerCase()}/games/archives`
  );
  console.log(`월 아카이브 ${archives.length}개`);

  const months = [];
  for (let i = 0; i < archives.length; i++) {
    const url = archives[i];
    const [, y, mo] = url.match(/(\d{4})\/(\d{2})$/);
    const key = `${y}-${mo}`;
    const file = path.join(CACHE_DIR, `${key}.json`);
    const isLast = i >= archives.length - 1;
    let cached = null;
    if (!REFRESH) {
      try {
        cached = JSON.parse(await fs.readFile(file, 'utf8'));
      } catch {
        /* 캐시 없음 */
      }
    }
    if (cached && !isLast) {
      console.log(`  ${key} 캐시 (${cached.games.length}판)`);
      months.push({ key, games: cached.games });
      continue;
    }
    const data = await getJSON(url);
    await fs.writeFile(file, JSON.stringify({ fetchedAt: new Date().toISOString(), games: data.games }));
    console.log(`  ${key} 내려받음 (${data.games.length}판)${isLast ? ' [최신 월]' : ''}`);
    months.push({ key, games: data.games });
    await sleep(700); // 순차 + 간격. 429 방지.
  }

  const all = months.flatMap((m) => m.games);
  console.log(`\n전체 게임 ${all.length}판`);

  const byClass = {};
  for (const g of all) {
    const k = `${g.rules}/${g.time_class}`;
    byClass[k] = (byClass[k] || 0) + 1;
  }
  console.log('종류별:', byClass);

  /* ---------- 정규화 (내 관점으로) ---------- */
  const meLower = USER.toLowerCase();
  const games = [];
  const skipped = [];
  const pgns = [];
  let accuracyCount = 0;

  const target = all.filter((g) => g.rules === 'chess' && g.time_class === 'rapid');
  console.log(`분석 대상 (chess/rapid) ${target.length}판`);

  for (const g of target) {
    const whiteIsMe = g.white?.username?.toLowerCase() === meLower;
    const blackIsMe = g.black?.username?.toLowerCase() === meLower;
    const reasons = [];
    if (!g.pgn) reasons.push('pgn 없음');
    if (whiteIsMe === blackIsMe) reasons.push('플레이어 색 판정 실패');
    if (!g.end_time) reasons.push('end_time 없음');
    if (reasons.length) {
      skipped.push({ url: g.url, reasons });
      continue;
    }

    const h = pgnHeaders(g.pgn);
    const moves = pgnMoves(g.pgn);
    if (!moves.length) {
      skipped.push({ url: g.url, reasons: ['수순 파싱 실패'] });
      continue;
    }

    const color = whiteIsMe ? 'w' : 'b';
    const mine = whiteIsMe ? g.white : g.black;
    const opp = whiteIsMe ? g.black : g.white;

    let result;
    if (mine.result === 'win') result = 'win';
    else if (DRAW_CODES.has(mine.result)) result = 'draw';
    else if (LOSS_CODES.has(mine.result)) result = 'loss';
    else {
      skipped.push({ url: g.url, reasons: [`알 수 없는 result "${mine.result}"`] });
      continue;
    }

    // 종료 사유는 무승부면 무승부 사유, 아니면 패한 쪽의 코드가 사유다.
    const code = result === 'draw' ? mine.result : mine.result === 'win' ? opp.result : mine.result;
    const term = TERMINATION[code] || code || 'unknown';

    const { line, family } = openingFromEcoUrl(g.eco || h.ECOUrl);
    const acc = g.accuracies && typeof g.accuracies.white === 'number' ? g.accuracies : null;
    if (acc) accuracyCount++;

    games.push({
      id: g.uuid,
      url: g.url,
      end: g.end_time,
      tc: g.time_class,
      tcSec: Number(String(g.time_control).split('+')[0]) || null,
      rated: !!g.rated,
      color,
      me: mine.rating ?? null,
      opp: opp.rating ?? null,
      oppName: opp.username || '?',
      result,
      term,
      eco: h.ECO || null,
      line,
      family,
      ecoUrl: g.eco || h.ECOUrl || null,
      plies: moves.slice(0, 16),
      len: Math.ceil(moves.length / 2),
      acc: acc ? { me: whiteIsMe ? acc.white : acc.black, opp: whiteIsMe ? acc.black : acc.white } : null,
    });
    pgns.push(g.pgn.trim());
  }

  const order = games.map((g, i) => i).sort((a, b) => games[a].end - games[b].end);
  const sorted = order.map((i) => games[i]);
  const sortedPgns = order.map((i) => pgns[i]);

  /* ---------- 검증 ---------- */
  const c = (f) => sorted.filter(f).length;
  const white = c((g) => g.color === 'w');
  const black = c((g) => g.color === 'b');
  const w = c((g) => g.result === 'win');
  const d = c((g) => g.result === 'draw');
  const l = c((g) => g.result === 'loss');
  const famSum = Object.values(
    sorted.reduce((a, g) => ((a[g.family] = (a[g.family] || 0) + 1), a), {})
  ).reduce((x, y) => x + y, 0);
  const checks = [
    ['White + Black == Rapid', white + black === sorted.length, `${white}+${black} vs ${sorted.length}`],
    ['W + D + L == Rapid', w + d + l === sorted.length, `${w}+${d}+${l} vs ${sorted.length}`],
    ['모든 게임에 종료 시각', sorted.every((g) => g.end > 0), `누락 ${c((g) => !g.end)}`],
    ['모든 게임에 내 rating', sorted.every((g) => g.me != null), `누락 ${c((g) => g.me == null)}`],
    ['모든 게임에 상대 rating', sorted.every((g) => g.opp != null), `누락 ${c((g) => g.opp == null)}`],
    ['오프닝 이름 식별', sorted.every((g) => g.family), `누락 ${c((g) => !g.family)}`],
    ['오프닝별 합 == 전체', famSum === sorted.length, `${famSum} vs ${sorted.length}`],
    ['종료 사유 식별', sorted.every((g) => g.term !== 'unknown'), `unknown ${c((g) => g.term === 'unknown')}`],
    ['시간 정렬', sorted.every((g, i) => i === 0 || sorted[i - 1].end <= g.end), ''],
  ];
  console.log('\n검증');
  for (const [name, ok, note] of checks) {
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}${note ? ` — ${note}` : ''}`);
  }

  if (skipped.length) {
    console.log(`\n파싱/정규화 실패 ${skipped.length}판:`);
    for (const s of skipped.slice(0, 20)) console.log(`  ${s.url} — ${s.reasons.join(', ')}`);
    if (skipped.length > 20) console.log(`  ... 외 ${skipped.length - 20}판`);
  } else {
    console.log('\n파싱 실패 0판');
  }

  const ratings = sorted.map((g) => g.me);
  const summary = {
    generatedAt: new Date().toISOString(),
    user: USER,
    profile: `https://www.chess.com/member/${USER}`,
    source: 'Chess.com Published Data API (https://api.chess.com/pub)',
    archives: archives.length,
    totals: {
      allGames: all.length,
      byClass,
      analyzed: sorted.length,
      skipped: skipped.length,
      accuracyAvailable: accuracyCount,
      white,
      black,
      win: w,
      draw: d,
      loss: l,
      firstEnd: sorted.at(0)?.end ?? null,
      lastEnd: sorted.at(-1)?.end ?? null,
      lastRating: sorted.at(-1)?.me ?? null,
      peakRating: ratings.length ? Math.max(...ratings) : null,
      lowRating: ratings.length ? Math.min(...ratings) : null,
    },
    skippedGames: skipped,
    games: sorted,
  };

  const json = JSON.stringify(summary);
  await fs.writeFile(JSON_OUT, json);
  await fs.writeFile(PGN_OUT, sortedPgns.join('\n\n') + '\n');
  console.log(`\n${path.relative(ROOT, JSON_OUT)}  ${(json.length / 1024).toFixed(0)} KB`);
  console.log(`${path.relative(ROOT, PGN_OUT)}  ${sortedPgns.length}판`);
  console.log(`Accuracy 보유 ${accuracyCount} / ${sorted.length}판`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
