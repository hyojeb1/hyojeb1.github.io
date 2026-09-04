# hyojeb1.github.io

장효제 포트폴리오. 바닐라 HTML + CSS, 빌드 없음.

```
index.html
style.css
assets/        profile.jpg, *.mp4, *-poster.jpg, resume.pdf
works/         프로젝트 상세 페이지
chess/         Chess Insights (아래)
scripts/       Chess.com 데이터 갱신 스크립트
data/chess/    원본 PGN과 월별 캐시 (배포되지 않는다)
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
