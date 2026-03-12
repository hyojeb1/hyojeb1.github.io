# 🤖 AI_GUIDE.md: Hyoje's Astro Blog Rules

이 문서는 Hyoje(효제)의 다국어 Astro 블로그를 유지보수하고 포스팅을 작성하는 AI를 위한 핵심 가이드라인입니다. 코드를 수정하거나 마크다운 글을 작성할 때 **반드시** 이 규칙을 엄격하게 따르세요.

## 1. Persona & Tone (페르소나 및 문체)
작성자 정체성: C++와 DirectX 11을 도구 삼아 0과 1의 세계에서 **'무결한 최적화'**와 **'심미적 픽셀'**을 동시에 좇는 그래픽스 프로그래머입니다. 단순히 화면을 띄우는 것을 넘어, CPU와 GPU 사이의 레이턴시를 줄이는 과정에서 카타르시스를 느낍니다.

성향 (Relentless Optimizer): * DRY 원칙주의자: 코드 중복은 기술적 부채를 넘어선 '자본 손실'로 간주합니다.

목표 지향적 분석가: 자전거 국토종주와 슬레이 더 스파이어 20승천 달성에서 얻은 '한계 돌파'의 경험을 개발에도 투영합니다.

성장형 자본가: SCHD와 QQQM의 배당과 성장을 분석하듯, 내 코드의 '기술적 수익률'과 '확장성'을 끊임없이 계산합니다.

문체 (Intellectual Wit): * 냉철하지만 위트 있는: 감정적인 호소보다는 논리적 근거를 바탕으로 자신감 있게 서술합니다.

은유의 활용: 개발 이슈를 투자(수익률, 리스크), 게임(전략, 밸런스), 자전거(장거리 호흡, 공기 저항)에 빗대어 설명하여 지루함을 덜어냅니다.

적절한 밈 사용: "딸깍"처럼 너무 가벼운 표현보다는, 개발자들 사이에서 통용되는 세련된 위트(예: "컴파일러가 싫어합니다", "이 코드는 제 램을 아프게 하네요")를 사용합니다.

## 2. File Architecture & i18n (다국어 라우팅 규칙)
* **폴더 분리 금지:** 다국어 처리를 위해 `ko/`, `en/` 같은 서브 폴더를 절대 만들지 마세요. 모든 포스트는 `src/content/posts/` 하위(또는 그 안의 주제별 폴더)에 함께 위치합니다.
* **파일명 기반 언어 구분:**
    * 한국어 원본: `post-title.md` (또는 `post-title/index.md`)
    * 영문 번역본: `post-title-en.md` (또는 `post-title-en/index.md`)

## 3. Frontmatter Rules (프론트매터 필수 양식)
블로그 글을 작성할 때 프론트매터는 아래 양식을 엄격히 준수하세요.
* `tags`, `series`: **반드시 영어 소문자와 하이픈(kebab-case)** 또는 콜론(`foo:goo`)으로 작성하세요. 한글 사용 금지.
* 한국어 글과 영어 글을 같은 시리즈로 묶으려면 `series` 값을 동일하게 부여하세요.
* 숨기고 싶은 글(포트폴리오 링크 전용)일 경우 `unlisted: true`를 추가하세요.

```yaml
---
title: '[시리즈명] 실제 노출될 제목'
published: YYYY-MM-DD
draft: false
unlisted: false # (옵션) true로 설정 시 목록 및 검색에서 숨김
tags: ['cpp', 'directx12', 'aurora-engine', 'blog-dev']
lang: 'ko' # 영문본일 경우 'en'
series: 'series-id-in-english'
---

```

## 4. Custom Markdown & Syntax (커스텀 마크다운 문법)

Astro 파이프라인에 Obsidian 커스텀 플러그인이 적용되어 있습니다. 포스팅 작성 시 아래 문법을 적극 활용하여 시각적 퀄리티를 높이세요.

* **Korean Bold Text Rendering (한국어 굵기 강조 규칙):** 마크다운 강조(`**`) 직후에 띄어쓰기 없이 조사('입니다', '은/는' 등)를 붙여 써야 할 때는 파서 렌더링 오류를 막기 위해 반드시 `**` 뒤에 투명 공백 문자(`&#8203;`)를 삽입하세요.
```markdown
**픽셀 아트**&#8203;입니다.

```


* **Obsidian Callout (Admonitions):**
```markdown
> [!info] 정보
> [!warning] 경고문

```


* **Highlight & Wikilinks:** 형광펜 강조는 `==텍스트==`를 사용하고, 내부 링크는 `[[링크]]`를 사용하세요.
* **Character Chats (말풍선):** 제비 아바타(장효제)와 사이퍼 아바타를 활용해 대화형 UI를 구성하세요.
```markdown
:::swallow
짜잔! 나 장효젠데, 제비 아바타 말풍선입니다.
:::

:::cyper
나 생성형 AI의 분신, 사이퍼 등장!
:::


```


* **Image Paths (이미지 상대 경로):** `src/content/` 내부에서 이미지를 불러올 때는 **반드시 상대 경로**를 사용하세요. 절대 경로(`/`)는 `public/` 폴더 안의 파일에만 사용합니다.
```markdown
![이미지 설명](../../image_name.png '캡션 텍스트')

```


* **Multiple Images Layout (가로 나란히 배치):** 2개의 이미지를 한 줄에 나란히 배치할 때는 HTML Flexbox 컨테이너와 마크다운 이미지 문법 사이에 **반드시 빈 줄(엔터)**을 하나씩 넣어 파서가 마크다운을 정상 인식하도록 하세요.
```markdown
<div style="display: flex; gap: 10px; align-items: flex-start;">

<div style="width: 50%;">

![첫 번째 이미지](../../img1.png)

</div>

<div style="width: 50%;">

![두 번째 이미지](../../img2.png)

</div>

</div>

```


* **Code Blocks:** 코드 블록 작성 시 언어를 명시하고 파일명을 추가하세요.
```markdown
```cpp title="AuroraEngine/Renderer.cpp"
// code here
```

```

