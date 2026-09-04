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
