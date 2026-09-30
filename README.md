# hyojeb1.github.io

장효제 포트폴리오. 바닐라 HTML + CSS, 빌드 없음.

```
index.html
style.css
assets/        profile.jpg, *.mp4, *-poster.jpg, resume.pdf
works/         프로젝트 상세 페이지
chess/         Chess Insights (아래)
travel/        여행 사진첩 (아래). 생성물이지만 커밋한다
scripts/       Chess.com 데이터 갱신, travel 빌드 스크립트
data/chess/    원본 PGN과 월별 캐시 (배포되지 않는다)
data/travel/   여행 원고 Markdown (배포되지 않는다)
```

로컬 확인은 `index.html`을 브라우저로 열면 된다.
`main`에 푸시하면 `.github/workflows/pages.yml`이 위 목록의 사이트 경로만 Pages에 올린다.
새 최상위 경로를 만들면 그 목록에 넣어야 한다.

---

## Chess Insights (`/chess/`)

Chess.com 계정 [MogwaMaster](https://www.chess.com/member/MogwaMaster)의 Rapid 전적을
오프닝·수순·상대 실력 기준으로 분석해 보여주는 정적 페이지다.

```
chess/index.html               페이지
chess/chess.css                이 페이지 전용 CSS (style.css는 건드리지 않는다)
chess/app.js                   집계·렌더 (ES module, 빌드 없음)
chess/vendor/chess.js          chess.js 1.4.0 ESM 원본 (BSD-2-Clause). 국면 계산 전용
chess/data/rapid-summary.json  페이지가 읽는 유일한 데이터 (약 470KB)
data/chess/MogwaMaster-rapid-all.pgn   분석에 쓴 Rapid 전 게임 원본 PGN
data/chess/cache/YYYY-MM.json          Chess.com 월별 응답 캐시 (.gitignore)
```

페이지는 방문할 때 Chess.com API를 호출하지 않는다. 위 JSON 하나만 읽고 브라우저에서
집계한다.

### 데이터 갱신

```
npm run update-chess                최신 월만 다시 받고 과거 월은 캐시를 쓴다
npm run update-chess:full           캐시를 무시하고 전체 월을 다시 받는다
npm run update-chess -- --user 다른계정
```

스크립트는 월 아카이브를 **순차로** 요청하고 사이에 0.7초를 둔다. 429/5xx는
물러나며 재시도한다. 실행하면 게임 수·검증 결과·파싱 실패 목록을 표준 출력에 남긴다.
갱신으로 바뀌는 파일은 `chess/data/rapid-summary.json`과 `data/chess/*.pgn` 둘뿐이므로
그대로 커밋하면 배포된다. (`npm install`은 필요 없다. 의존성이 없다.)

### 개발 실행

`chess/`는 `fetch`로 JSON을 읽으므로 `file://`로 열면 브라우저가 막는다.
저장소 루트에서 정적 서버를 띄운다.

```
npm run serve      # 또는 python -m http.server 8000
```

그 뒤 `/chess/`를 연다. 나머지 페이지는 여전히 파일을 그대로 열어도 된다.

### 데이터 출처

Chess.com **Published Data API** (`https://api.chess.com/pub`)와 그 응답에 담긴
공개 PGN만 쓴다. 로그인, 스크래핑, Premium/내부 endpoint는 쓰지 않는다.
분석 대상은 `rules === "chess"` 이고 `time_class === "rapid"` 인 게임이다.
데이터 모델이 `time_class`를 보존하므로 Blitz/Bullet 추가는 필터 한 줄이다.

오프닝 이름은 Chess.com이 게임에 붙인 `ECOUrl` 슬러그에서 뽑는다. 슬러그는
`Sicilian-Defense-Najdorf-Variation-6.Be2-e5`처럼 **이름 + 변화수**라서 수순 표기
앞까지를 이름(`line`)으로 쓰고, `Defense`/`Gambit`/`Opening` 같은 앵커 단어까지를
계열(`family`)로 묶는다. 표에서 묶는 단위는 `family`, 상세 패널에서 펼치는 단위는
`line`이다. 승/무/패는 내가 백이든 흑이든 **MogwaMaster 관점**으로 정규화한다.

### 현재 제공 기능

- [x] Overview: 게임 수 / 승 / 무 / 패 / 승률 / 마지막·최고 rating / 분석 기간 / 백·흑 판수
- [x] "핵심 질문" 10개 직답 블록 (필터를 따라 같이 바뀐다)
- [x] Rating History 그래프 (게임별 + 이동평균 + 최고점) 와 월별 표
- [x] Opening 통계: White / Black 분리, 정렬 가능, 최소 게임 수 필터
- [x] Opening drill-down: ECO, 승/무/패, 내 평균 rating, 평균 상대 rating, 최근 사용,
      대표 수순, 세부 라인, 그 오프닝으로 둔 게임 목록 (원본 링크 포함)
- [x] Move Explorer: 실제로 둔 초반 수순 트리 (8수까지) + 체스판 국면 + FEN
- [x] White 첫 수 분포 / Black `상대 첫 수 → 내 응수` 표
- [x] Filters: 전체·30일·90일·1년·사용자 지정 기간, 백/흑/양쪽, 내 rating 구간
      (실제 rating 분포에서 100 단위로 생성), 오프닝 최소 게임 수 1/5/10/20 (기본 10)
- [x] Performance: 결과 분해, 상대 rating 구간별, rating 차이별, 게임 길이, 종료 사유
- [x] Activity: 월별 / 요일별 / 시간대별 (Asia/Seoul)
- [x] Accuracy: 값이 있는 게임만 대상으로 평균·색별·rating 구간별·오프닝별·월별 추세,
      coverage를 항상 함께 표기
- [x] 파싱 실패 게임 수와 목록을 페이지(Games 탭)와 스크립트 로그에 남긴다

승률만으로 오프닝을 비교하지 않는다. 모든 오프닝 행에 Games / W-D-L / Win % /
Score %(무=0.5) / 최근 5판을 함께 놓았고, 표본이 작은 오프닝은 최소 게임 수 필터로
접는다.

`index.html`(첫 화면)은 건드리지 않았다. `DESIGN.md`가 첫 화면을 works와 연락처만
책임지게 두라고 못박아 두었기 때문이다. 첫 화면에서 링크를 걸려면 그 규칙을
어디까지 열지 먼저 정해야 한다.

### 검증

`npm run update-chess`가 매 실행마다 확인하고 결과를 출력한다.

- API 전체 game count 대비 chess/rapid count
- White count + Black count == Rapid count
- W + D + L == Rapid count
- 오프닝별 game count 합 == 전체
- 날짜(`end_time`) · 내 rating · 상대 rating 누락 여부
- 종료 사유 미분류 여부
- 시간 정렬
- PGN 수순 파싱 실패 건수와 URL 목록

2026-09-04 기준 실측: 전체 953판(rapid 890 · blitz 42 · bullet 21), Rapid 890판 =
백 445 + 흑 445 = 승 424 + 무 60 + 패 406, 오프닝 계열 48종 / 라인 206종,
파싱 실패 0판, Accuracy 보유 92판. 890판 전부 chess.js로 초반 16플라이 재생이 통과한다.

### Phase 2 (아직 하지 않았다)

- 로컬 Stockfish로 centipawn loss, 큰 실수 후보, 오프닝에서 처음 크게 손해 본 수,
  승패 시 평가 변화 계산. 원본 PGN이 이미 저장돼 있어 별도 스크립트로 붙일 수 있다.
- Blitz / Bullet 탭 (데이터 모델에 `time_class`가 남아 있다)
- 상대별 전적

Stockfish를 붙이더라도 그것은 **자체 엔진 분석**이다. Chess.com의 Game Review /
Accuracy / Brilliant / Great 같은 자체 지표와 같다고 표시하지 않는다.

---

## Travel (`/travel/`)

여행 사진첩. 한 여행이 한 페이지(`/travel/<slug>/`)이고 일차별로 메모와 사진이 있다.
도쿄 페이지는 날짜를 선택해 지도 동선을 재생하고 해당 날짜의 이벤트 초안을 본다.
`style.css`의 폰트·토큰·헤더를 쓰고, `travel/travel.css`가 색 토큰을 다크로 바꾼다.

```
data/travel/<slug>.md      원고. 파일 이름이 URL
scripts/build-travel.py    원고 + 원본 사진 → travel/
travel/travel.css          손으로 쓴다
travel/lightbox.js         손으로 쓴다
travel/route.js            지도 동선 재생. 손으로 쓴다
travel/index.html          생성 (여행 목록)
travel/<slug>/             생성 (index.html, img/*.webp); 일차 영상·포스터는 직접 보관
```

원본 사진과 기기의 Google 지도 타임라인 내보내기 JSON은 저장소에 넣지 않는다. 원고 머리말의
`photos:`와 `timeline:`은 로컬 파일을 가리킨다. 지도형 여행은 저장소에 공개 가능한
`route:` 스냅샷과 `media:` 선택 사진 매니페스트를 함께 둔다. 로컬 원본이 있으면 이를
갱신하고, GitHub Actions처럼 원본이 없는 환경에서는 공개 스냅샷만으로 HTML을 다시 만든다.

### 원고 형식

```
---
title: 2026 도쿄
start: 2026-09-17
end: 2026-09-22
photos: C:\Users\user\Downloads\2026도쿄_날짜별
timeline: C:\Users\user\Downloads\2026도쿄_날짜별\타임라인.json
route: data/travel/2026-tokyo-route.json
media: data/travel/2026-tokyo-media.json
photo_count: 829
---

## 1일차_0917          ← photos 아래 폴더 이름과 같아야 한다

메모. 줄바꿈은 그대로 줄바꿈, 빈 줄은 문단.
<https://...>           링크 (도메인 ↗ 로 보인다). [글자](https://...) 도 된다
![사진 설명](KakaoTalk_...jpg)   그 사진에만 설명이 붙는다 (선택)
### 13:50 (확인 전 이벤트 제목)

@stop 1 35.69803,139.77188 아미아미 아키하바라 라디오회관점
이 이벤트 안에서 순서대로 방문한 장소의 메모. 지도에는 1번 숫자 핀으로 표시된다.
```

### 빌드

**하루는 새벽 6시에 바뀐다.** `timeline:`이 있는 도쿄 페이지는 기기에서 내보낸 타임라인의
`semanticSegments.timelinePath`만 사용해 날짜별 경로를 만든다. 한국 쪽은 인천공항
기록만 싣고 집 근처 위치는 제외한다. 비행 중 위치와 `rawSignals`도 싣지 않으며,
기록이 끊긴 구간도 시간순 좌표 사이를 직선으로 잇는다. 이는 실제 이동 경로가 아니라
발자취를 되짚기 위한 연결선이다. 재생 중 지도는 현재 위치를 따라가고,
주변 좌표의 이동 폭에 맞춰 장거리에서는 줌아웃, 한 장소 주변에서는 줌인한다.
지도는 MapLibre GL JS와 OpenFreeMap 벡터 지도를 사용하므로 화면 표시에는 인터넷 연결이 필요하다.
괄호로 감싼 이벤트 제목은 확인 전 초안이고, `지도 추정` 표시는 위치 기록에서 추론한 제목이다.
카톡으로 공유받은 사진의 EXIF 시각·GPS는 지도 동선이나 이벤트 분류에 쓰지 않는다.

각 일차 폴더 안에 `pick/`을 만들고 쓸 사진을 복사한다. 도쿄 페이지에서는 폴더의 일차에
붙고 파일명 순서로 나온다. 다른 여행에서 `timeline:`이 없으면 기존의 사진 시각 띠를 쓴다.

```
npm run build-travel                       (= python scripts/build-travel.py)
```

지도 경로는 기기에서 내보낸 Google 지도 타임라인의 위치 기록으로 만들고 명백한 단일 좌표 오차를 제거한다.
지명은 한글 이름이 제공되면 한글로, 없으면 원래 이름으로 표시한다. 방문 장소와 메모는 공개 전 사람이 확인한다.
필요: Python 3 + Pillow.

`main`에 push하면 Pages workflow가 Python/Pillow를 준비하고 `build-travel.py`와
회귀 검사를 실행한 뒤 생성된 여행 HTML을 배포한다. 생성된 HTML이 바뀌면 workflow가
`[skip ci]` 커밋으로 저장소에도 동기화한다.

스크립트가 하는 일: EXIF 방향 적용 → EXIF·XMP 전부 제거(GPS 포함, 출력에서 다시
검사하고 남아 있으면 멈춘다) → 긴 변 1200px 썸네일과 2400px 확대본 WebP. ICC 색
프로필만 남긴다. 원본보다 새 WebP가 있으면 다시 만들지 않고, 쓰이지 않는 WebP는 지운다.

도쿄 여행의 영상과 포스터는 `travel/2026-tokyo/dayN.mp4`, `dayN.jpg`에
저장소 파일로 보관한다. 현재는 5일차만 있다. 원고의 `cover_day: 5`는 여행 목록 카드의
영상과 상세 헤더의 이미지를 고른다. 상세 페이지에서는 해당 일차를 선택했을 때 그날
영상이 보인다. 빌드 스크립트는 이 파일들을 삭제하지 않는다. GitHub는 100MB 넘는 파일을 받지 않는다.
