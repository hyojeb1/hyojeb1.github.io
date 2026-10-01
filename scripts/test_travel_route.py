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

for day in trip["days"]:
    day_key = str(day["date"])
    for i, event in enumerate(day["events"], 1):
        event_id = f'd{day["n"]}e{i}'
        event_pin = next(
            item for item in pins[day_key]
            if item[3] == event_id and len(item) > 5 and item[5] == "event"
        )
        assert event_pin[0] == i
        assert f'id="{event_id}"' in page
        for stop in event.get("stops", []):
            stop_id = f'{event_id}s{stop["number"]}'
            stop_pin = next(
                item for item in pins[day_key]
                if item[3] == stop_id and len(item) > 5 and item[5] == "stop"
            )
            assert stop_pin[0] == stop["number"]
            assert f'id="{stop_id}"' in page

assert pins["2026-09-19"][0][4] == "숙소에서 출발"
assert next(item for item in pins["2026-09-17"] if item[3] == "d1e1")[1:3] == [37.5665, 126.978]  # 자택 좌표는 공개하지 않는다

# 2일차는 아니메이트가 먼저고, 그 다음 14:32 피규어 매장 순회가 4개 매장을 품는다.
assert page.index('id="d2e2"') < page.index('아ニメイト秋葉原2号館') < page.index('id="d2e3"')
assert page.index('id="d2e3"') < page.index('id="d2e3s1"') < page.index('id="d2e3s4"') < page.index('id="d2e4"')
assert '14:25경' in page
assert '아키하바라 피규어 매장 순회' in page
assert '코토부키야 아키하바라관' not in page

# 세부 방문지는 보조 연결선으로 지도 경로에 이어진다.
visit_paths = json.loads(re.search(r'<script type="application/json" id="visit-paths">(.*?)</script>', page).group(1))
day2_paths = visit_paths["2026-09-18"]
assert len(day2_paths) == 1
day2_pins = {item[3]: [item[2], item[1]] for item in pins["2026-09-18"]}
assert day2_pins["d2e4"] == [139.7709552, 35.6992456]  # GiGO 아키하바라 3호관의 장소 핀
assert day2_pins["d2e7"] == [139.7706076, 35.6984409]  # 로스트비프가 7번 메인 이벤트
assert page.index('id="d2e7"') < page.index('저녁으로 로스트비프를 먹었다') < page.index('id="d2e8"')
assert '<span class="ev-n">7</span>21:14 이후' in page
assert '<span class="ev-n">8</span>23:55' in page
assert 'id="d2e9"' not in page  # 밤샘은 숙소 복귀 본문이지 별도 이벤트가 아니다
figure_tour = next(segment for segment in day2_paths if [139.77155, 35.69793] in segment)
assert figure_tour == [
    [139.77167, 35.69975],  # 아니메이트
    day2_pins["d2e3"],  # 순회 메인 핀과 첫 매장은 같은 위치
    [139.77035, 35.69958],  # 라신반
    [139.77043, 35.70058],  # 스루가야
    [139.77053, 35.70035],  # 만다라케
    day2_pins["d2e4"],  # GIGO 합류
]
assert day2_pins["d2e3"] == [139.77155, 35.69793]
assert day2_pins["d2e1"] not in figure_tour  # 숙소에서 아키하바라까지는 GPS 경로를 사용
assert all([139.7706076, 35.6984409] not in segment for segment in day2_paths)  # 시각 미상 식당은 핀만

# CI에서는 원본 Google 타임라인 대신 저장소의 공개 경로 스냅샷을 사용한다.
public_route = json.loads(Path("data/travel/2026-tokyo-route.json").read_text(encoding="utf-8"))
assert route == public_route
assert (Path("travel/2026-tokyo/day5.mp4").is_file()
        and Path("travel/2026-tokyo/day5.jpg").is_file())
assert '<img class="trip-cover-image" src="day5.jpg" alt="">' in page
assert 'src="day5.mp4"' in page and 'poster="day5.jpg"' in page
index = Path("travel/index.html").read_text(encoding="utf-8")
assert 'src="2026-tokyo/day5.mp4"' in index
assert 'poster="2026-tokyo/day5.jpg"' in index
assert "prefers-reduced-motion: reduce" in index


# 일차별 날씨 카드는 공식 관측 데이터와 원고의 체감 메모를 합쳐 지도 위에 표시한다.
weather_data = json.loads(Path("data/travel/2026-tokyo-weather.json").read_text(encoding="utf-8"))
assert len(weather_data["days"]) == 6
assert next(day for day in weather_data["days"] if day["date"] == "2026-09-21")["observed_daily"]["precipitation_total_mm"] == 156.0
assert page.index('class="weather-panels"') < page.index('<section class="route"')
assert 'data-day="2026-09-21"' in page
assert '총강수</dt><dd>156.0 mm' in page
assert '최대 1시간</dt><dd>33.0 mm/h · 16:03' in page
assert '비가 엄청 많이 내렸다.' in page
assert 'TGS에서 돌아온 뒤 밤을 넘긴 새벽' in page
assert '@weather-note' not in page
