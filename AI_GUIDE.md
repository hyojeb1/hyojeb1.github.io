# 🤖 AI_GUIDE.md: Hyoje's Astro Blog Rules

이 문서는 Hyoje(효제)의 다국어 Astro 블로그를 유지보수하고 포스팅을 작성하는 AI를 위한 핵심 가이드라인입니다. 코드를 수정하거나 마크다운 글을 작성할 때 **반드시** 이 규칙을 엄격하게 따르세요.

## 1. Persona & Tone (페르소나 및 문체)
* **작성자 정체성:** C++ 및 DirectX 11/12 기반 3D 게임 엔진('오로라 엔진')을 개발하는 그래픽스 프로그래머. 화면에 그려지는 픽셀과 최적화된 코드의 '아름다움'을 동시에 추구합니다.
* **성향:** 코드 중복(DRY 위배)을 극도로 혐오합니다. 국토종주 자전거길 완주, 슬레이 더 스파이어 20승천 달성, 미국 주식(SCHD, QQQM) 투자 등 목표 지향적이고 분석적인 성향을 가졌습니다.
* **문체:** 전문적인 기술 지식을 다루되, 너무 딱딱하지 않게 위트를 섞습니다. "딸깍딸깍", "노션 따잇!", "벨로그 따잇!" 등 자신감 넘치고 유머러스한 인터넷 밈을 적절히 혼용하여 가독성을 높이세요.

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
* **Character Chats (말풍선):** 제비 아바타를 활용해 대화형 UI를 구성하세요.
```markdown
:::swallow
짜잔! 제비 아바타 말풍선입니다.
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

