# AGENTS.md

장효제 포트폴리오. 정적 1페이지, 빌드 없음. 구조와 실행은 `README.md`.

## 배포에서 조용히 빠지는 함정

`.github/workflows/pages.yml`은 `index.html`, `style.css`, `assets`만 복사해 올린다.
저장소 루트를 통째로 올리지 않는 이유는 `창고_AI/`를 공개하지 않기 위해서다.
**새 최상위 경로를 만들면 그 목록에 넣어야 한다.** 넣지 않으면 로컬에서는 보이고
배포에서는 사라진다.

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
