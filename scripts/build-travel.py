"""data/travel/*.md 를 읽어 travel/ 아래에 정적 HTML과 WebP를 만든다.

    python scripts/build-travel.py

하루는 이벤트 여러 개로 나뉜다. 원고에 `### HH:MM 제목`을 적으면 그 시각부터 다음
이벤트 전까지가 한 이벤트다. 하루에 ### 이 하나도 없으면 촬영 시각의 빈틈으로 구간을
자동으로 나누고 자리표시자로 보여준다(원고에 붙여 넣을 ### 줄을 출력한다).

사진 띠에는 그날 폴더의 사진 전부가 **점(시각)으로만** 들어간다. 이미지로 공개되는 것은
각 일차 폴더의 pick/ 에 넣은 사진뿐이다. 촬영 시각은 EXIF에서만 읽는다. KakaoTalk 파일명의
시각은 받은 시각이라 띠에 쓰지 않는다(시각 미상으로 센다).

원본 사진은 저장소에 들어오지 않는다. 결과물(travel/)만 커밋·배포된다.
travel/travel.css 와 travel/lightbox.js 는 손으로 쓰는 파일이라 이 스크립트가 건드리지 않는다.
"""

import datetime as dt
import html
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "travel"
OUT = ROOT / "travel"

THUMB = 1200   # 긴 변. 이벤트 대표 사진이 크게 들어간다
FULL = 2400
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXT = {".mp4", ".mov"}
WEEKDAY = "월화수목금토일"

BIN_MIN = 10      # 띠 한 칸 = 10분
DAY_START = 6     # 하루는 새벽 6시에 바뀐다. 그 전 사진·이벤트는 전날 밤(24시 이후)이다
GAP_MIN = 60      # 자동 구간: 이만큼 사진이 끊기면 다음 이벤트
MIN_EVENT = 3     # 자동 구간: 이보다 적은 장수는 이벤트로 세우지 않는다(띠에는 남는다)

DAY_HEADING = re.compile(r"^(\d+)일차_(\d{2})(\d{2})$")
EVENT_HEADING = re.compile(r"^(\d{1,2}):(\d{2})\s*(.*)$")
KAKAO_NAME = re.compile(r"(\d{8})_(\d{6})")


# ---------- 원고 ----------

def parse_trip(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        sys.exit(f"{path.name}: 맨 위에 --- 로 감싼 머리말이 없다")
    meta = dict(
        (k.strip(), v.strip())
        for k, v in (line.split(":", 1) for line in m.group(1).splitlines() if ":" in line)
    )
    for key in ("title", "start", "end", "photos"):
        if key not in meta:
            sys.exit(f"{path.name}: 머리말에 {key} 가 없다")

    year = int(meta["start"][:4])
    days = []
    for block in re.split(r"^## ", m.group(2), flags=re.M)[1:]:
        heading, _, body = block.partition("\n")
        heading = heading.strip()
        hm = DAY_HEADING.match(heading)
        if not hm:
            sys.exit(f"{path.name}: '## {heading}' 은 '## N일차_MMDD' 형식이 아니다")
        date = dt.date(year, int(hm.group(2)), int(hm.group(3)))

        parts = re.split(r"^### ", body, flags=re.M)
        memo, captions = split_captions(parts[0])
        events = []
        for part in parts[1:]:
            eh, _, ebody = part.partition("\n")
            em = EVENT_HEADING.match(eh.strip())
            if not em:
                sys.exit(f"{path.name} {heading}: '### {eh.strip()}' 은 '### HH:MM 제목' 형식이 아니다")
            h, mi = int(em.group(1)), int(em.group(2))
            ememo, ecaps = split_captions(ebody)
            captions.update(ecaps)
            events.append(dict(start=h + mi / 60, title=em.group(3).strip(), memo=ememo))
        # 06시 전 이벤트가 그날 첫 기록이면 새벽 출발이고, 낮 기록 뒤라면 그날 밤이다.
        daytime_seen = False
        for ev in events:
            if ev["start"] >= DAY_START:
                daytime_seen = True
            elif daytime_seen:
                ev["start"] += 24
        events.sort(key=lambda ev: ev["start"])
        days.append(dict(folder=heading, n=int(hm.group(1)), date=date,
                         memo=memo, captions=captions, events=events))
    return dict(slug=path.stem, meta=meta, days=days)


def is_draft(title):
    """( )로 감싼 제목은 사람이 아직 확인하지 않은 초안이다."""
    return title.startswith("(") and title.endswith(")")


def split_captions(body):
    captions, lines = {}, []
    for line in body.strip().splitlines():
        cm = re.fullmatch(r"!\[(.*)\]\((.+)\)", line.strip())
        if cm:
            captions[cm.group(2).strip()] = cm.group(1).strip()
        else:
            lines.append(line)
    return "\n".join(lines).strip(), captions


def inline(text):
    """이스케이프 후 링크만 살린다. 적힌 글자는 그대로 둔다."""
    out = html.escape(text)

    def link(url, label):
        return f'<a href="{url}" rel="noreferrer noopener">{label}</a>'

    out = re.sub(r"\[(.+?)\]\((https?://[^)\s]+)\)", lambda m: link(m.group(2), m.group(1)), out)
    out = re.sub(
        r"&lt;(https?://[^\s&]+(?:&amp;[^\s&]+)*)&gt;",
        lambda m: link(m.group(1), re.sub(r"^(?:m|www)\.", "", m.group(1).split("/")[2]) + " ↗"),
        out,
    )
    return out


def paragraphs(body):
    if not body:
        return ""
    parts = [p for p in re.split(r"\n\s*\n", body) if p.strip()]
    return "\n".join(
        "<p>" + "<br>\n".join(inline(l.strip()) for l in p.splitlines()) + "</p>" for p in parts
    )


# ---------- 시각 ----------

def exif_time(path):
    """EXIF 촬영 시각만. 없으면 None."""
    if path.suffix.lower() not in IMAGE_EXT:
        return None
    try:
        with Image.open(path) as im:
            ex = im.getexif()
            raw = ex.get_ifd(0x8769).get(36867) or ex.get(306)
        if raw:
            return dt.datetime.strptime(raw.strip()[:19], "%Y:%m:%d %H:%M:%S")
    except (OSError, ValueError):
        pass
    return None


def order_time(path):
    """pick 사진 정렬용. EXIF가 없으면 파일명 시각이라도 쓴다(띠에는 쓰지 않는다)."""
    t = exif_time(path)
    if t:
        return t
    m = KAKAO_NAME.search(path.name)
    if m:
        return dt.datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S")
    return dt.datetime.fromtimestamp(path.stat().st_mtime)


def hours(t, date):
    """그날 0시부터 몇 시간째인가. 자정을 넘기면 24 이상."""
    return (t - dt.datetime.combine(date, dt.time())).total_seconds() / 3600


def clock(h):
    """분은 내린다. 올리면 다음 이벤트 시작 시각과 겹쳐 보인다."""
    m = math.floor(h * 60 + 1e-6)
    return f"{m // 60 % 24:02d}:{m % 60:02d}"


def trip_day(t):
    """촬영 시각이 속한 여행 날짜. 06시 전이면 전날."""
    return (t - dt.timedelta(hours=DAY_START)).date()


def assign(files_by_day, days):
    """(일차, 파일) 목록을 받아 각 파일을 촬영 시각 기준 일차에 다시 나눈다.
    EXIF가 없으면 사람이 넣어 둔 폴더의 일차에 둔다. 돌려주는 값: {n: [(시각 또는 None, 파일)]}"""
    by_date = {d["date"]: d for d in days}
    out = {d["n"]: [] for d in days}
    for day, f in files_by_day:
        t = exif_time(f)
        if t is None:
            out[day["n"]].append((None, f))
            continue
        target = by_date.get(trip_day(t))
        if target is None and t.date() == days[0]["date"]:
            target = days[0]  # 첫날 06시 전: 전날 밤이 아니라 출발하는 새벽이다
        if target is None:
            print(f"    여행 기간 밖의 EXIF 시각이라 폴더 일차에 시각 미상으로 둔다: {f.name} {t}")
            out[day["n"]].append((None, f))
            continue
        out[target["n"]].append((hours(t, target["date"]), f))
    return out


def media(folder):
    return [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXT | VIDEO_EXT]


def auto_events(timed):
    groups, cur = [], []
    for h in timed:
        if cur and (h - cur[-1]) * 60 > GAP_MIN:
            groups.append(cur)
            cur = []
        cur.append(h)
    if cur:
        groups.append(cur)
    return [dict(start=g[0], title="", memo="", auto=True) for g in groups if len(g) >= MIN_EVENT]


# ---------- 사진 ----------

def export(src, out_dir):
    """방향을 바로잡고, EXIF(GPS 포함)를 버리고, 두 크기로 저장한다. ICC 색 프로필만 남긴다."""
    stem = src.stem
    full, thumb = out_dir / f"{stem}.webp", out_dir / f"{stem}-t.webp"
    fresh = full.exists() and thumb.exists() and full.stat().st_mtime >= src.stat().st_mtime
    if not fresh:
        with Image.open(src) as im:
            icc = im.info.get("icc_profile")
            im = ImageOps.exif_transpose(im)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            for target, edge, q in ((full, FULL, 82), (thumb, THUMB, 78)):
                copy = im.copy()
                copy.thumbnail((edge, edge), Image.LANCZOS)
                kw = {"quality": q, "method": 6}
                if icc:
                    kw["icc_profile"] = icc
                copy.save(target, "WEBP", **kw)
    with Image.open(full) as f, Image.open(thumb) as t:
        if f.getexif() or t.getexif() or f.info.get("xmp") or t.info.get("xmp"):
            sys.exit(f"{stem}: 출력에 메타데이터가 남았다")
        return dict(stem=stem, w=t.width, h=t.height)


def pick_files(folder):
    pick = folder / "pick"
    if not pick.is_dir():
        return []
    out = []
    for f in pick.iterdir():
        if f.suffix.lower() in VIDEO_EXT:
            print(f"    동영상은 아직 넣지 않는다: {f.name}")
        elif f.is_file() and f.suffix.lower() in IMAGE_EXT:
            out.append(f)
    return out


# ---------- HTML ----------

# chess/index.html 과 같은 이유: /travel -> /travel/ 리다이렉트가 없으면 상대 경로가 전부 깨진다.
SLASH_FIX = """<script>
if (!location.pathname.endsWith('/') && !location.pathname.endsWith('.html')) {
  location.replace(location.pathname + '/' + location.search + location.hash);
}
</script>"""


def page(title, body, up, draft=False, map_page=False):
    """up: 저장소 루트까지의 상대 경로 ('../' 또는 '../../')"""
    banner = (
        '<p class="draft">시안: 점선 안의 글은 확인 전 초안이거나 자리표시자다.</p>\n'
        if draft else ""
    )
    map_css = ('<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.css">'
               if map_page else "")
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
{SLASH_FIX}
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>{html.escape(title)}</title>
<link rel="icon" href="{up}assets/profile_icon.svg">
<link rel="stylesheet" href="{up}style.css">
<link rel="stylesheet" href="{up}travel/travel.css">
{map_css}
</head>
<body>
{banner}<header class="site-header">
<a class="wordmark" href="{up}index.html">
<img src="{up}assets/profile_icon.png" alt="" aria-hidden="true">
장효제
</a>
</header>
{body}
</body>
</html>
"""


def fmt_range(start, end):
    # DESIGN.md: ONE Mobile에는 en dash 글리프가 없다. 기간은 ~
    s, e = dt.date.fromisoformat(start), dt.date.fromisoformat(end)
    nights = (e - s).days
    return f"{s.year}. {s.month}. {s.day} ~ {e.month}. {e.day} · {nights}박 {nights + 1}일"


def pct(h, a, b):
    return f"{(h - a) / (b - a) * 100:.3f}%"


def shot_html(s, day_n):
    cap = html.escape(s["caption"])
    cap_attr = f' data-caption="{cap}"' if cap else ""
    alt = cap or f"{day_n}일차 {s['clock']} 사진"
    return (
        f'<a href="img/{s["stem"]}.webp" data-time="{s["clock"]}"{cap_attr}>'
        f'<img src="img/{s["stem"]}-t.webp" width="{s["w"]}" height="{s["h"]}" '
        f'alt="{alt}" loading="lazy" decoding="async"></a>'
    )


def band_html(timed, ranges, a, b, peak):
    bins = {}
    for h in timed:
        k = math.floor(h * 60 / BIN_MIN)
        bins[k] = bins.get(k, 0) + 1
    w = BIN_MIN / 60 / (b - a) * 100
    bars = "".join(
        f'<i style="left:{pct(k * BIN_MIN / 60, a, b)};width:{w:.3f}%;'
        f'height:{max(8, math.sqrt(n / peak) * 100):.1f}%" '
        f'title="{clock(k * BIN_MIN / 60)} · {n}장"></i>'
        for k, n in sorted(bins.items())
    )
    spans = "".join(
        f'<a href="#{eid}" style="left:{pct(s, a, b)};width:{(e - s) / (b - a) * 100:.3f}%">{i}</a>'
        for i, (eid, s, e) in enumerate(ranges, 1)
    )
    ticks = "".join(
        f'<span style="left:{pct(h, a, b)}">{h if h <= 24 else h - 24}</span>'
        for h in range(math.ceil(a / 3) * 3, int(b) + 1, 3)
    )
    midnight = f'<b style="left:{pct(24, a, b)}" aria-hidden="true"></b>' if a < 24 < b else ""
    return f"""<div class="band" aria-hidden="true">
<div class="bars">{midnight}{bars}</div>
<div class="spans">{spans}</div>
<div class="ticks">{ticks}</div>
</div>"""


def build_trip(trip):
    slug, meta = trip["slug"], trip["meta"]
    out = OUT / slug
    img_dir = out / "img"
    img_dir.mkdir(parents=True, exist_ok=True)
    photos_root = Path(meta["photos"])
    route = build_route(meta) if "timeline" in meta else None
    if route:
        return build_map_trip(trip, route, photos_root, out, img_dir)

    # 1) 모든 일차를 먼저 훑는다. 띠의 가로축과 막대 높이를 여행 전체에서 같게 맞추려고.
    #    폴더는 달력 날짜로 나뉘어 있지만 띠는 06시 경계로 다시 나눈다.
    days = trip["days"]
    folders = {}
    for day in days:
        folder = photos_root / day["folder"]
        if not folder.is_dir():
            sys.exit(f"사진 폴더가 없다: {folder}")
        folders[day["n"]] = folder
    shots = assign([(d, f) for d in days for f in media(folders[d["n"]])], days)
    chosen = assign([(d, f) for d in days for f in pick_files(folders[d["n"]])], days)
    scanned = []
    for day in days:
        timed = sorted(h for h, _ in shots[day["n"]] if h is not None)
        untimed = sum(1 for h, _ in shots[day["n"]] if h is None)
        scanned.append((day, folders[day["n"]], timed, untimed, len(shots[day["n"]])))
    all_h = [h for _, _, t, _, _ in scanned for h in t]
    a = min(DAY_START, math.floor(min(all_h))) if all_h else DAY_START
    b = max(DAY_START + 24, math.ceil(max(all_h))) if all_h else DAY_START + 24
    counts = {}
    for day, _, timed, _, _ in scanned:
        for h in timed:
            k = (day["n"], math.floor(h * 60 / BIN_MIN))
            counts[k] = counts.get(k, 0) + 1
    peak = max(counts.values(), default=1)

    used, sections, nav = set(), [], []
    total = timed_total = 0
    hour_counts = {}
    draft = False
    for day, folder, timed, untimed, n in scanned:
        total += n
        timed_total += len(timed)
        for h in timed:
            k = (day["date"], int(h))
            hour_counts[k] = hour_counts.get(k, 0) + 1

        events = day["events"] or auto_events(timed)
        auto = not day["events"]
        draft |= auto
        ends = [e["start"] for e in events[1:]] + [math.inf]
        ranges = []
        for i, (ev, end) in enumerate(zip(events, ends)):
            # 첫 이벤트보다 앞선 사진은 어느 이벤트에도 넣지 않는다(띠에만 남는다)
            inside = [h for h in timed if ev["start"] <= h < end]
            ev["count"] = len(inside)
            ev["first"] = inside[0] if inside else ev["start"]
            ev["last"] = inside[-1] if inside else ev["start"]
            ev["end"] = end
            ev["id"] = f"d{day['n']}e{i + 1}"
            ranges.append((ev["id"], ev["first"], ev["last"]))

        # pick 사진을 시각이 속한 이벤트에 붙인다
        for ev in events:
            ev["shots"] = []
        picked = []
        for h, src in chosen[day["n"]]:
            if h is None:  # EXIF가 없으면 파일명 시각이라도 쓴다
                h = hours(order_time(src), day["date"])
            picked.append((h, src))
        for h, src in sorted(picked, key=lambda t: (t[0], t[1].name)):
            target = next((ev for ev in reversed(events) if h >= ev["start"]), events[0] if events else None)
            if target is None:
                continue
            p = export(src, img_dir)
            used |= {f"{p['stem']}.webp", f"{p['stem']}-t.webp"}
            p["caption"] = day["captions"].get(src.name, "")
            p["clock"] = clock(h)
            target["shots"].append(p)

        print(f"  {day['folder']}: 사진 {n} = 시각 {len(timed)} + 미상 {untimed} · 이벤트 {len(events)}{' (자동)' if auto else ''}")
        if auto and events:
            for ev in events:
                print(f"      ### {clock(ev['start'])}   ({ev['count']}장, ~{clock(ev['last'])})")

        items = []
        for i, ev in enumerate(events, 1):
            photos = (f"{clock(ev['first'])} ~ {clock(ev['last'])}"
                      if clock(ev["first"]) != clock(ev["last"]) else clock(ev["first"]))
            if auto:
                span = f"{photos} · 사진 {ev['count']}장"
            elif ev["count"]:
                span = f"{clock(ev['start'])} · 사진 {ev['count']}장 ({photos})"
            else:
                span = f"{clock(ev['start'])} · 사진 없음"
            t = ev["title"]
            if not t:
                title = '<h3 class="ph">이벤트 제목</h3>'
            elif is_draft(t):
                draft = True
                title = f'<h3 class="ph">{html.escape(t[1:-1])}</h3>'
            else:
                title = f"<h3>{html.escape(t)}</h3>"
            memo = (f'<div class="memo">{paragraphs(ev["memo"])}</div>' if ev["memo"]
                    else ('<p class="ph">메모</p>' if auto else ""))
            shots = "".join(shot_html(s, day["n"]) for s in ev["shots"]) or \
                '<div class="ph ph-img">대표 사진</div>'
            items.append(f"""<li class="event" id="{ev['id']}">
<div class="ev-text">
<p class="ev-time"><span class="ev-n">{i}</span>{span}</p>
{title}
{memo}
</div>
<div class="shots">{shots}</div>
</li>""")

        d = day["date"]
        sid = f"day{day['n']}"
        nav.append(f'<a href="#{sid}">{day["n"]}</a>')
        untimed_note = f" · 시각 미상 {untimed}장" if untimed else ""
        sections.append(f"""<section class="day" id="{sid}">
<header>
<h2>{day['n']}일차</h2>
<p class="date">{d.month}월 {d.day}일 {WEEKDAY[d.weekday()]}</p>
</header>
<div class="memo">{paragraphs(day['memo'])}</div>
<figure class="timeline">
{band_html(timed, ranges, a, b, peak)}
<figcaption>이날 찍은 사진 {n}장의 촬영 시각{untimed_note}</figcaption>
</figure>
<ol class="events">
{chr(10).join(items)}
</ol>
</section>""")

    for f in img_dir.iterdir():
        if f.name not in used:
            f.unlink()

    # 요약 수치는 콘솔에도 남긴다. 문장으로 옮기기 전에 이 출력을 근거로 삼는다.
    (pd, ph), pn = max(hour_counts.items(), key=lambda kv: kv[1])
    pday = pd + dt.timedelta(days=ph // 24)
    print(f"  검증: 폴더 합 {total} · 시각 있음 {timed_total} · 미상 {total - timed_total}")
    print(f"  가장 많이 찍은 한 시간: {pday.month}/{pday.day} {ph % 24}시 {pn}장")

    body = f"""<main class="travel">
<header class="trip-head">
<a class="back" href="../index.html">← travel</a>
<h1>{html.escape(meta['title'])}</h1>
<p class="range">{fmt_range(meta['start'], meta['end'])}</p>
<dl class="stats">
<div><dt>찍은 사진</dt><dd>{total}장</dd></div>
<div><dt>촬영 시각이 남은 사진</dt><dd>{timed_total}장</dd></div>
<div><dt>가장 많이 찍은 한 시간</dt><dd>{pday.month}/{pday.day} {ph % 24}시 · {pn}장</dd></div>
</dl>
<nav aria-label="일차">{''.join(nav)}</nav>
</header>
{chr(10).join(sections)}
</main>
<dialog class="lightbox" aria-label="사진 크게 보기">
<img alt="">
<p class="lb-info"><span class="lb-cap"></span><span class="lb-count"></span></p>
<button class="lb-prev" aria-label="이전 사진">←</button>
<button class="lb-next" aria-label="다음 사진">→</button>
<button class="lb-close" aria-label="닫기">×</button>
</dialog>
<script src="../lightbox.js"></script>"""
    (out / "index.html").write_text(
        page(f"{meta['title']} · 장효제", body, "../../", draft=draft), encoding="utf-8"
    )
    return dict(slug=slug, meta=meta, total=total, draft=draft, used=sorted(used))


def build_route(meta):
    """기기 타임라인의 이동 경로만 공개용으로 추린다. 원본과 원시 신호는 복사하지 않는다."""
    source = Path(meta["timeline"])
    data = json.loads(source.read_text(encoding="utf-8"))
    start = dt.date.fromisoformat(meta["start"])
    end = dt.date.fromisoformat(meta["end"])
    flights = [
        (dt.datetime.fromisoformat(s["startTime"]), dt.datetime.fromisoformat(s["endTime"]))
        for s in data["semanticSegments"]
        if s.get("activity", {}).get("topCandidate", {}).get("type") == "FLYING"
    ]
    days = {str(start + dt.timedelta(days=i)): [] for i in range((end - start).days + 1)}
    for s in data["semanticSegments"]:
        if "timelinePath" not in s:
            continue
        part, part_day, part_region = [], None, None
        for p in s["timelinePath"]:
            t = dt.datetime.fromisoformat(p["time"])
            day = str((t - dt.timedelta(hours=DAY_START)).date())
            if t.date() == start and t.hour < DAY_START:
                day = str(start)
            coords = re.findall(r"-?\d+(?:\.\d+)?", p["point"])
            if len(coords) < 2:
                continue
            lat, lon = map(float, coords[:2])
            tokyo = 35.5 <= lat <= 35.9 and 139.5 <= lon <= 140.5
            incheon = 37.43 <= lat <= 37.47 and 126.43 <= lon <= 126.47
            narita = 35.74 <= lat <= 35.81 and 140.34 <= lon <= 140.42
            flying = any(a <= t < b for a, b in flights)
            region = "japan" if tokyo else "incheon" if incheon else None
            if day not in days or region is None or (flying and not (incheon or narita)):
                if part:
                    days[part_day].append(part)
                    part = []
                continue
            if part and (day != part_day or region != part_region):
                days[part_day].append(part)
                part = []
            part_day, part_region = day, region
            part.append([p["time"], round(lat, 5), round(lon, 5)])
        if part:
            days[part_day].append(part)
    if not any(days.values()):
        sys.exit(f"{source}: 여행 기간의 도쿄 경로가 없다")
    for day, parts in days.items():
        days[day] = remove_route_spikes(parts)
    print("  지도 경로:", ", ".join(f"{day} {sum(map(len, parts))}점" for day, parts in days.items()))
    return days


def route_distance(a, b):
    x = math.radians(b[2] - a[2]) * math.cos(math.radians((a[1] + b[1]) / 2))
    y = math.radians(b[1] - a[1])
    return 6371000 * math.hypot(x, y)


def remove_route_spikes(parts):
    """앞뒤 경로에서 벗어나는 단일 위치 오차만 제거한다."""
    flat = [(i, p) for i, part in enumerate(parts) for p in part]
    while True:
        bad = None
        for j in range(1, len(flat) - 1):
            a, b, c = (flat[k][1] for k in (j - 1, j, j + 1))
            ab = (dt.datetime.fromisoformat(b[0]) - dt.datetime.fromisoformat(a[0])).total_seconds()
            bc = (dt.datetime.fromisoformat(c[0]) - dt.datetime.fromisoformat(b[0])).total_seconds()
            ac = ab + bc
            if min(ab, bc) <= 0:
                continue
            d1, d2, direct = route_distance(a, b), route_distance(b, c), route_distance(a, c)
            if (d1 / ab > 45 or d2 / bc > 45) and direct / ac <= 45 and d1 + d2 > direct * 1.25 + 1000:
                bad = j
                break
        if bad is None:
            break
        flat.pop(bad)
    cleaned = [[] for _ in parts]
    for i, p in flat:
        cleaned[i].append(p)
    return [part for part in cleaned if part]


def build_map_trip(trip, route, photos_root, out, img_dir):
    """위치 기록을 중심으로 보여준다. 카톡 사진의 시각은 여행 동선에 쓰지 않는다."""
    meta = trip["meta"]
    cover_day = meta.get("cover_day")
    cover_image = f"day{cover_day}.jpg"
    cover_video = f"day{cover_day}.mp4"
    if cover_day and not (out / cover_image).is_file():
        sys.exit(f"대문 이미지가 없다: {out / cover_image}")
    cover_html = (f'<img class="trip-cover-image" src="{cover_image}" alt="">' if cover_day else "")
    used, sections = set(), []
    pins = {}
    total = 0
    for day in trip["days"]:
        folder = photos_root / day["folder"]
        if not folder.is_dir():
            sys.exit(f"사진 폴더가 없다: {folder}")
        total += len(media(folder))
        shots = []
        for src in sorted(pick_files(folder)):
            p = export(src, img_dir)
            used.update((f"{p['stem']}.webp", f"{p['stem']}-t.webp"))
            cap = day["captions"].get(src.name, "")
            alt = cap or f"{day['n']}일차 여행 사진"
            shots.append(
                f'<a href="img/{p["stem"]}.webp" data-caption="{html.escape(cap)}">'
                f'<img src="img/{p["stem"]}-t.webp" width="{p["w"]}" height="{p["h"]}" '
                f'alt="{html.escape(alt)}" loading="lazy" decoding="async"></a>'
            )
        d = day["date"]
        gallery = f'<div class="shots">{"".join(shots)}</div>' if shots else ""
        video = f"day{day['n']}.mp4"
        poster = f"day{day['n']}.jpg"
        if (out / video).is_file() and not (out / poster).is_file():
            sys.exit(f"영상 포스터가 없다: {out / poster}")
        caption = html.escape(meta.get(f"day{day['n']}_caption", f"{day['n']}일차 영상"))
        day_video = (f'''<figure class="day-video">
<video controls playsinline preload="none" poster="{poster}" width="720" height="960" aria-label="{caption}">
<source src="{video}" type="video/mp4">
</video>
<figcaption>{caption}</figcaption>
</figure>''' if (out / video).is_file() else "")
        events = []
        day_points = [p for part in route[str(d)] for p in part]
        pins[str(d)] = []
        for i, ev in enumerate(day["events"], 1):
            event_time = dt.datetime.combine(d, dt.time(), dt.timezone(dt.timedelta(hours=9))) + dt.timedelta(hours=ev["start"])
            if day["n"] == 1 and i == 1:
                # 출발지의 사적 위치 대신 서울 시내의 대표 좌표만 공개한다.
                lat, lon = 37.5665, 126.9780
            else:
                nearest = min(day_points, key=lambda p: abs((dt.datetime.fromisoformat(p[0]) - event_time).total_seconds()))
                lat, lon = nearest[1:]
            pins[str(d)].append([i, lat, lon, f"d{day['n']}e{i}", ev["title"]])
            title = ev["title"]
            draft_title = is_draft(title)
            if draft_title:
                title = title[1:-1]
            title_class = ' class="ph"' if draft_title else ""
            heading = f'<h3{title_class}>{html.escape(title)}</h3>'
            memo = f'<div class="memo">{paragraphs(ev["memo"])}</div>' if ev["memo"] else ""
            events.append(f"""<li class="event" id="d{day['n']}e{i}">
<p class="ev-time"><span class="ev-n">{i}</span>{clock(ev['start'])}</p>
{heading}{memo}
</li>""")
        event_list = f'<ol class="events">{chr(10).join(events)}</ol>' if events else ""
        sections.append(f"""<section class="day" data-day="{d}" aria-label="{day['n']}일차 · {d.month}월 {d.day}일"{'' if day['n'] == 1 else ' hidden'}>
<div class="memo">{paragraphs(day['memo'])}</div>
{day_video}
{event_list}
{gallery}
</section>""")
    for f in img_dir.iterdir():
        if f.name not in used:
            f.unlink()
    route_data = json.dumps(route, ensure_ascii=False, separators=(",", ":"))
    pin_data = json.dumps(pins, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    body = f"""<main class="travel map-trip">
<header class="trip-head{' has-cover' if cover_day else ''}">
{cover_html}
<div class="trip-head-copy">
<a class="back" href="../index.html">← travel</a>
<h1>{html.escape(meta['title'])}</h1>
<p class="range">{fmt_range(meta['start'], meta['end'])}</p>
{f'<p class="cover-caption">{html.escape(meta.get(f"day{cover_day}_caption", ""))}</p>' if cover_day else ''}
</div>
</header>
<section class="route" aria-label="여행 동선">
<div class="route-controls">
<div class="route-days" role="group" aria-label="일차 선택">
<button type="button" data-day="all" aria-pressed="false">전체</button>
{''.join(f'<button type="button" data-day="{d["date"]}" aria-pressed="{str(d["n"] == 1).lower()}">{d["n"]}일차</button>' for d in trip['days'])}
</div>
<div class="route-playback">
<button type="button" id="route-play" aria-label="경로 재생">▶</button>
<label for="route-progress">발자국</label>
<input id="route-progress" type="range" min="0" value="0" aria-label="경로 위치">
<output id="route-time" for="route-progress"></output>
<label for="route-speed">속도</label>
<select id="route-speed" aria-label="재생 속도"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select>
</div>
</div>
<div id="route-map" aria-label="도쿄 여행 이동 경로 지도"></div>
</section>
{chr(10).join(sections)}
</main>
<dialog class="lightbox" aria-label="사진 크게 보기">
<img alt=""><p class="lb-info"><span class="lb-cap"></span><span class="lb-count"></span></p>
<button class="lb-prev" aria-label="이전 사진">←</button>
<button class="lb-next" aria-label="다음 사진">→</button>
<button class="lb-close" aria-label="닫기">×</button>
</dialog>
<script type="application/json" id="route-data">{route_data}</script>
<script type="application/json" id="event-pins">{pin_data}</script>
<script src="https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.js"></script>
<script src="../route.js"></script>
<script src="../lightbox.js"></script>"""
    (out / "index.html").write_text(
        page(f"{meta['title']} · 장효제", body, "../../", map_page=True), encoding="utf-8"
    )
    return dict(slug=trip["slug"], meta=meta, total=total, draft=False, used=sorted(used),
                cover_day=cover_day, cover_video=(out / cover_video).is_file())


def build_index(trips):
    cards = []
    for t in sorted(trips, key=lambda t: t["meta"]["start"], reverse=True):
        thumbs = [u for u in t["used"] if u.endswith("-t.webp")]
        cover = f'{t["slug"]}/day{t["cover_day"]}' if t.get("cover_day") else None
        img = (f'<video poster="{cover}.jpg" muted loop playsinline preload="none" aria-label="{html.escape(t["meta"].get(f"day{t["cover_day"]}_caption", "여행 영상"))}"><source src="{cover}.mp4" type="video/mp4"></video>'
               if cover and t["cover_video"] else
               f'<img src="{cover}.jpg" alt="">' if cover else
               f'<img src="{t["slug"]}/img/{thumbs[0]}" alt="">' if thumbs else
               '<span class="ph ph-img">대표 사진</span>')
        cards.append(f"""<a class="trip-card" href="{t['slug']}/index.html">
{img}
<span class="t">{html.escape(t['meta']['title'])}</span>
<span class="r">{fmt_range(t['meta']['start'], t['meta']['end'])} · 사진 {t['total']}장</span>
</a>""")
    body = f"""<main class="travel">
<header class="trip-head">
<a class="back" href="../index.html">← 장효제</a>
<h1>travel</h1>
</header>
<div class="trips">
{chr(10).join(cards)}
</div>
</main>
<script>
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {{
  document.querySelectorAll('.trip-card video').forEach((video) => {{
    const card = video.closest('.trip-card');
    if (matchMedia('(hover: hover)').matches) {{
      card.addEventListener('pointerenter', () => video.play().catch(() => {{}}));
      card.addEventListener('pointerleave', () => video.pause());
    }} else if (video === document.querySelector('.trip-card video')) {{
      video.play().catch(() => {{}});
    }}
  }});
}}
</script>"""
    (OUT / "index.html").write_text(
        page("travel · 장효제", body, "../", draft=any(t["draft"] for t in trips)), encoding="utf-8"
    )


def main():
    built = []
    for md in sorted(SRC.glob("*.md")):
        print(md.name)
        built.append(build_trip(parse_trip(md)))
    build_index(built)
    if any(t["draft"] for t in built):
        print("주의: 초안(괄호 제목)이나 자동 구간이 남아 있다.")


if __name__ == "__main__":
    main()
