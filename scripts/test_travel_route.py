"""경로의 단일 GPS 오차만 제거하는 최소 회귀 검사."""
from runpy import run_path
from pathlib import Path
import json
import re
from tempfile import TemporaryDirectory

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
        event_start = int(trip["meta"].get(f"day{day['n']}_event_start", "1"))
        assert event_pin[0] == event_start + i - 1
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
departure = page[page.index('id="d2e1"'):page.index('id="d2e2"')]
first_night = page[page.index('id="d1e10"'):page.index('<section class="day" data-day="2026-09-18"')]
first_night_stems = {'KakaoTalk_20260918_010726780', 'KakaoTalk_20260918_010726780_03'}
arrival = page[page.index('id="d2e2"'):page.index('id="d2e3"')]
gigo = page[page.index('id="d2e4"'):page.index('id="d2e5"')]
roast_beef = page[page.index('id="d2e6"'):page.index('id="d2e7"')]
namco_html = page[page.index('id="d2e7"'):page.index('id="d2e8"')]
toast_factory = page[page.index('id="d2e8"'):page.index('id="d2e9"')]
figures = page[page.index('id="d2e9"'):page.index('<section class="day" data-day="2026-09-19"')]
assert '<span class="ev-n">0</span>13:59' in departure
assert '<h3>숙소에 출발</h3>' in departure
assert '<span class="ev-n">1</span>14:25경' in arrival
assert '<h3>아키바 도착</h3>' in arrival
selected = {
    'KakaoTalk_20260918_003421909_01': page[page.index('id="d1e4"'):page.index('id="d1e5"')],
    'KakaoTalk_20260918_002555816_05': page[page.index('id="d1e7"'):page.index('id="d1e8"')],
    'KakaoTalk_20260917_195012235_05': page[page.index('id="d1e7"'):page.index('id="d1e8"')],
    'KakaoTalk_20260917_195012235_07': page[page.index('id="d1e7"'):page.index('id="d1e8"')],
    'KakaoTalk_20260917_195012235_14': page[page.index('id="d1e8"'):page.index('id="d1e9"')],
    'KakaoTalk_20260918_003808764_04': page[page.index('id="d1e8"'):page.index('id="d1e9"')],
    'KakaoTalk_20260918_003808764_02': page[page.index('id="d1e8"'):page.index('id="d1e9"')],
    'KakaoTalk_20260917_160444310_04': page[page.index('id="d1e3"'):page.index('id="d1e4"')],
    'KakaoTalk_20260917_160444310_02': page[page.index('id="d1e3"'):page.index('id="d1e4"')],
    'KakaoTalk_20260917_075310094_01': page[page.index('id="d1e2"'):page.index('id="d1e3"')],
    'KakaoTalk_20260917_075357052': page[page.index('id="d1e2"'):page.index('id="d1e3"')],
    'KakaoTalk_20260918_002555816_04': page[page.index('id="d1e6"'):page.index('id="d1e7"')],
    'KakaoTalk_20260918_010726780': first_night,
    'KakaoTalk_20260918_010726780_03': first_night,
    'KakaoTalk_20260918_143350795': arrival,
    'KakaoTalk_20260918_143350795_01': arrival,
    'KakaoTalk_20260918_151213785': arrival,
    'KakaoTalk_20260918_214433562_02': arrival,
    'KakaoTalk_20260919_035450149_13': arrival,
    'KakaoTalk_20260919_035450149_14': arrival,
    'KakaoTalk_20260918_214433562_03': gigo,
    'KakaoTalk_20260918_214433562_04': gigo,
    'KakaoTalk_20260918_214433562_08': roast_beef,
    'KakaoTalk_20260918_214433562_09': roast_beef,
    'KakaoTalk_20260919_004243866_01': namco_html,
    'KakaoTalk_20260919_004243866': namco_html,
    'KakaoTalk_20260919_035450149_10': toast_factory,
    'KakaoTalk_20260919_035450149_11': toast_factory,
    'KakaoTalk_20260919_035450149_12': toast_factory,
    'KakaoTalk_20260919_004243866_04': figures,
    'KakaoTalk_20260919_035450149_08': figures,
    'KakaoTalk_20260919_035450149': figures,
    'KakaoTalk_20260919_035450149_04': figures,
}
for stem, event_html in selected.items():
    photo_day = 'day1' if stem in first_night_stems or stem in {
        'KakaoTalk_20260917_075310094_01', 'KakaoTalk_20260917_075357052',
        'KakaoTalk_20260918_002555816_04',
        'KakaoTalk_20260917_160444310_04', 'KakaoTalk_20260917_160444310_02',
        'KakaoTalk_20260918_003421909_01', 'KakaoTalk_20260918_002555816_05',
        'KakaoTalk_20260917_195012235_05', 'KakaoTalk_20260917_195012235_07',
        'KakaoTalk_20260917_195012235_14', 'KakaoTalk_20260918_003808764_04',
        'KakaoTalk_20260918_003808764_02',
    } else 'day2'
    assert f'href="./img/{photo_day}/{stem}.webp"' in event_html
    assert f'src="./img/{photo_day}/{stem}-t.webp"' in event_html
    for suffix in ('.webp', '-t.webp'):
        with builder['Image'].open(Path('travel/2026-tokyo/img') / photo_day / (stem + suffix)) as image:
            assert not image.getexif() and not image.info.get('xmp')
        if stem in first_night_stems:
            assert not (Path('travel/2026-tokyo/img/day2') / (stem + suffix)).exists()
    if stem in first_night_stems:
        assert stem not in departure
assert '5일차에 유니클로에서 고죠 사토루의 무라사키 티셔츠로 맞췄다.' in arrival
assert '아키하바라 피규어 매장 순회' in page
assert '코토부키야 아키하바라관' not in page
for image_src in re.findall(r'<img[^>]+src="(\./img/[^\"]+)"', page):
    assert (Path('travel/2026-tokyo') / image_src).is_file(), image_src
assert not list(Path('travel/2026-tokyo/img').glob('*.webp'))

# 사람이 지정한 얼굴만 공개하고, 공개본과 썸네일 모두 나머지를 가린다.
face_configs = json.loads(Path('data/travel/2026-tokyo-faces.json').read_text(encoding='utf-8'))
public_faces = {
    'KakaoTalk_20260917_075310094_01.jpg': [4],
    'KakaoTalk_20260918_002555816_04.jpg': [4],
    'KakaoTalk_20260917_160444310_04.jpg': [5],
    'KakaoTalk_20260917_160444310_02.jpg': [],
    'KakaoTalk_20260918_003808764_02.jpg': [1],
}
for filename, face_config in face_configs.items():
    assert [f['id'] for f in face_config['faces'] if not f['cover']] == public_faces[filename]
    for suffix in ('.webp', '-t.webp'):
        with builder['Image'].open(Path('travel/2026-tokyo/img/day1') / (Path(filename).stem + suffix)) as image:
            factor = image.width / face_config['size'][0]
            for face in face_config['faces']:
                if face['cover']:
                    x, y = (round(v * factor) for v in face['center'])
                    pixel = image.convert('RGB').getpixel((x, y))
                    assert max(abs(a-b) for a, b in zip(pixel, (241, 236, 149))) < 12

# 원본의 mtime이 같아도 공개 선택 변경은 기존 캐시를 갱신한다.
with TemporaryDirectory() as scratch:
    source = Path(scratch) / 'face.png'
    builder['Image'].new('RGB', (100, 100), '#0080ff').save(source)
    original = source.read_bytes()
    config = {'size': [100, 100], 'faces': [{'center': [50, 50], 'radius': 35, 'cover': True}]}
    dest = Path(scratch) / 'public'
    builder['export'](source, dest, config)
    for suffix in ('.webp', '-t.webp'):
        with builder['Image'].open(dest / ('face' + suffix)) as image:
            assert image.getpixel((50, 50))[0] > 200
    config['faces'][0]['cover'] = False
    builder['export'](source, dest, config)
    for suffix in ('.webp', '-t.webp'):
        with builder['Image'].open(dest / ('face' + suffix)) as image:
            assert image.getpixel((50, 50))[0] < 20
    assert source.read_bytes() == original

skytree_walk = page[page.index('id="d1e7"'):page.index('id="d1e8"')]
skytree = page[page.index('id="d1e8"'):page.index('id="d1e9"')]
asahi = page[page.index('id="d1e6"'):page.index('id="d1e7"')]
asahi_rows = re.findall(r'<div class="shots">(.*?)</div>', asahi, re.S)
assert [row.count('<a href=') for row in asahi_rows] == [2, 2, 1]
assert 'KakaoTalk_20260918_002555816_04' in asahi_rows[-1]
assert 'KakaoTalk_20260918_002555816_04' not in skytree
assert '@gallery' not in page
assert '<h3>도쿄 스카이트리로 가는 길</h3>' in skytree_walk
assert '<video' not in skytree_walk
assert '<h3>도쿄 스카이트리 타운</h3>' in skytree
assert '<video controls playsinline preload="none"' in skytree
assert 'src="./video/day1/KakaoTalk_20260918_003643422.mp4"' in skytree
assert 'poster="video/day1/KakaoTalk_20260918_003643422.jpg"' in skytree
assert (Path('travel/2026-tokyo/video/day1/KakaoTalk_20260918_003643422.mp4')).is_file()
assert (Path('travel/2026-tokyo/video/day1/KakaoTalk_20260918_003643422.jpg')).is_file()

# 세부 방문지는 보조 연결선으로 지도 경로에 이어진다.
visit_paths = json.loads(re.search(r'<script type="application/json" id="visit-paths">(.*?)</script>', page).group(1))
day2_paths = visit_paths["2026-09-18"]
assert len(day2_paths) == 1
day2_pins = {item[3]: [item[2], item[1]] for item in pins["2026-09-18"]}
assert day2_pins["d2e4"] == [139.7709552, 35.6992456]  # GiGO 아키하바라 3호관의 장소 핀
assert day2_pins["d2e6"] == [139.7706076, 35.6984409]  # 로스트비프가 5번 메인 이벤트
assert '<h3>저녁으로 로스트비프를 먹었다</h3>' in roast_beef
assert '<span class="ev-n">5</span>시각 미상' in roast_beef
assert '<span class="ev-n">6</span>시각 미상' in namco_html
assert '<span class="ev-n">7</span>21:14' in toast_factory
assert '<h3>The French Toast Factory Yodobashi AKIBA 8F</h3>' in toast_factory
assert '<span class="ev-n">8</span>23:55' in page
assert 'id="d2e10"' not in page  # 밤샘은 숙소 복귀 본문이지 별도 이벤트가 아니다
namco = trip['days'][1]['events'][6]
assert namco['title'] == 'namco Akihabara · 4층 가차퐁' and namco['start'] is None
assert day2_pins['d2e7'] == [139.7724164, 35.6980094]
assert '4층 가차퐁' in namco_html
assert '4층 가차퐁' not in page[page.index('id="d2e5"'):page.index('id="d2e6"')]
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
        and Path("travel/2026-tokyo/covers/day5.jpg").is_file())
assert '<img class="trip-cover-image" src="covers/day5.jpg" alt="">' in page
assert 'src="day5.mp4"' in page and 'poster="covers/day5.jpg"' in page
index = Path("travel/index.html").read_text(encoding="utf-8")
assert 'src="2026-tokyo/day5.mp4"' in index
assert 'poster="2026-tokyo/covers/day5.jpg"' in index
assert "prefers-reduced-motion: reduce" in index


# 일차별 날씨 카드는 공식 관측 데이터와 원고의 체감 메모를 합쳐 지도 위에 표시한다.
weather_data = json.loads(Path("data/travel/2026-tokyo-weather.json").read_text(encoding="utf-8"))
assert len(weather_data["days"]) == 6
assert next(day for day in weather_data["days"] if day["date"] == "2026-09-21")["observed_daily"]["precipitation_total_mm"] == 156.0
route_start = page.index('<section class="route"')
route_days = page.index('class="route-days"', route_start)
weather_panels = page.index('class="weather-panels"', route_days)
route_playback = page.index('class="route-playback"', weather_panels)
assert route_start < route_days < weather_panels < route_playback
assert 'data-day="2026-09-21"' in page
assert '강수</dt><dd>156.0 mm' in page
assert '최대 1시간</dt><dd>33.0 mm/h · 16:03' in page
assert '비가 엄청 많이 내렸다.' in page
assert 'TGS에서 돌아온 뒤 밤을 넘긴 새벽' in page
assert '@weather-note' not in page

# 날짜·지역은 공통 일차 선택기와 지도에 맡기고 날씨 요약에서는 반복하지 않는다.
assert 'weather-kicker' not in page
assert 'DAY 5 · 9월 21일 · 아사쿠사·스미다' not in page
assert '<summary>관측 상세</summary>' in page
