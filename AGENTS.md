# AGENTS.md

장효제 포트폴리오. 정적 1페이지, 빌드 없음. 구조와 실행은 `README.md`.

## 배포에서 조용히 빠지는 함정

`.github/workflows/pages.yml`은 `index.html`, `style.css`, `assets`, `works`, `chess`만
복사해 올린다.
저장소 루트를 통째로 올리지 않는 이유는 `창고_AI/`를 공개하지 않기 위해서다.
**새 최상위 경로를 만들면 그 목록에 넣어야 한다.** 넣지 않으면 로컬에서는 보이고
배포에서는 사라진다.

## Chess Insights

`chess/`는 포트폴리오 카드가 아니다. Chess.com 공식 PubAPI로 모은 내 Rapid 전적을
집계해 보여주는 단독 페이지다. 상세는 `README.md`.

- 사이트에는 여전히 빌드가 없다. `package.json`은 데이터 갱신 스크립트만 담는다.
  의존성은 0개고, `chess/vendor/chess.js`는 npm이 아니라 저장소에 넣어 둔 원본이다. 수정하지 않는다.
- 새 수치를 문장으로 쓸 때는 추정하지 말고 `npm run update-chess`를 다시 돌려
  검증 출력을 근거로 삼는다. 숫자를 하드코딩하지 않는다.
- Chess.com의 Accuracy / Game Review / Brilliant를 재현했다고 쓰지 않는다. 공개 API가
  준 것만 쓰고, 없는 게임엔 값을 만들지 않는다.

## Travel

`travel/`은 여행 사진첩이다. 상세는 `README.md`.

- `travel/` 아래 HTML·WebP는 `scripts/build-travel.py`의 생성물이다. 손으로 고치지 않는다.
  손으로 쓰는 건 `travel.css`, `lightbox.js`, `route.js`, 원고 `data/travel/*.md`뿐이다.
  `main` push 시 Pages workflow가 빌더와 회귀 검사를 실행하고 생성 HTML을 자동 동기화한다.
- 선택한 일차 영상·포스터 `travel/<slug>/dayN.mp4`, `dayN.jpg`는 저장소에서 직접 관리한다.
  빌드 스크립트는 이 파일들을 보존하고, 실제 파일이 있는 일차에만 영상을 표시한다.
- Google Takeout 원본 `타임라인.json`과 원본 사진은 로컬에만 둔다. 공개 저장소에는
  필터링된 `data/travel/<slug>-route.json`과 선택 사진 매니페스트
  `data/travel/<slug>-media.json`만 둔다. CI는 이 공개 스냅샷만으로 HTML을 재생성한다.
  로컬 빌드에서 원본 타임라인이 있으면 공개 경로 스냅샷을 갱신한다.
- 도쿄 페이지의 지도는 `semanticSegments.timelinePath`에서 추린 경로만 사용한다.
  위치로 추론한 이벤트 제목은 `지도 추정` 초안으로 표시하고, 사진 EXIF 시각·GPS로 동선을 단정하지 않는다.
- 메모는 원고에 적힌 문장만 쓴다. 여행기·사진 설명을 지어내지 않는다.
- 사진 고르기는 사람이 한다. 일행이 나온 사진의 공개 여부도 사람이 정한다.
- 이벤트 초안의 근거로 여행 단톡방 내보내기(`Downloads`에 있음)를 쓸 수 있다. 저장소에는
  넣지 않고, 인용하지 않는다. 전화번호·계좌·정산 금액이 들어 있다.

## 프로젝트 카드 문구

**창작 금지.** 근거는 두 곳뿐이다.

- D.O.G: SVN `https://svna.gameinjae.kr/svn/GA7thFinal_RageOfPharaoh`, author `7P_JangHyoje`
- Aurora Engine: `C:\Dev\24AuroraEngine` git log, author `JANG HYO JE`

로그에 없는 판단·동기·대안은 자리표시자로 남기고 사람에게 묻는다. 추론으로 채운
문장은 어디를 추론했는지 밝힌다.

## 디자인 규칙

전체 명세는 `DESIGN.md`. 시각적 결정이 필요해지면 거기서 확인하고, 명세에 없으면
임의로 채우지 말고 묻는다.

## 폰트

`assets/*.woff2`는 서브셋 산출물이고 원본 OTF는 저장소에 없다. 재생성은:

```
python -m fontTools.subset "<원본>.otf" \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2000-206F,U+20A0-20BF,U+2190-21FF,U+3000-303F,U+1100-11FF,U+3130-318F,U+AC00-D7A3" \
  --flavor=woff2 --output-file="assets/<이름>.woff2"
```
