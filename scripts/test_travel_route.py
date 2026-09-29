"""경로의 단일 GPS 오차만 제거하는 최소 회귀 검사."""
from runpy import run_path
from pathlib import Path
import json
import re

builder = run_path("scripts/build-travel.py")
filter_spikes = builder["remove_route_spikes"]
path = [
    ("2026-09-19T06:30:00+09:00", 35.66882, 139.79093),
    ("2026-09-19T06:31:00+09:00", 35.73255, 139.71887),
    ("2026-09-19T06:36:00+09:00", 35.64618, 139.82662),
]
assert filter_spikes([path]) == [[path[0], path[2]]]
assert filter_spikes([[path[0], path[2]]]) == [[path[0], path[2]]]

page = Path("travel/2026-tokyo/index.html").read_text(encoding="utf-8")
route = json.loads(re.search(r'<script type="application/json" id="route-data">(.*?)</script>', page).group(1))
incheon = lambda p: 37.43 <= p[1] <= 37.47 and 126.43 <= p[2] <= 126.47
narita = lambda p: 35.74 <= p[1] <= 35.81 and 140.34 <= p[2] <= 140.42
tokyo = lambda p: 35.5 <= p[1] <= 35.9 and 139.5 <= p[2] <= 140.5
assert any(incheon(p) for path in route["2026-09-17"] for p in path)
assert any(incheon(p) for path in route["2026-09-22"] for p in path)
assert any(narita(p) for path in route["2026-09-22"] for p in path)
assert all(all(incheon(p) for p in path) or all(not incheon(p) for p in path)
           for paths in route.values() for path in paths)
assert all(incheon(p) or tokyo(p) for paths in route.values() for path in paths for p in path)
assert '<script type="module"' not in page
assert '<section class="day" data-day="2026-09-17" aria-label="1일차 · 9월 17일">' in page
pins = json.loads(re.search(r'<script type="application/json" id="event-pins">(.*?)</script>', page).group(1))
trip = builder["parse_trip"](Path("data/travel/2026-tokyo.md"))
assert {day: len(items) for day, items in pins.items()} == {
    str(day["date"]): len(day["events"]) for day in trip["days"]
}
assert pins["2026-09-19"][0][4] == "숙소에서 출발"
assert all(item[0] == n and f'id="{item[3]}"' in page
           for items in pins.values() for n, item in enumerate(items, 1))
assert pins["2026-09-17"][0][1:3] == [37.5665, 126.978]  # 자택 좌표는 공개하지 않는다
assert (Path("travel/2026-tokyo/day5.mp4").is_file()
        and Path("travel/2026-tokyo/day5.jpg").is_file())
assert '<img class="trip-cover-image" src="day5.jpg" alt="">' in page
assert 'src="day5.mp4"' in page and 'poster="day5.jpg"' in page
index = Path("travel/index.html").read_text(encoding="utf-8")
assert 'src="2026-tokyo/day5.mp4"' in index
assert 'poster="2026-tokyo/day5.jpg"' in index
assert "prefers-reduced-motion: reduce" in index
