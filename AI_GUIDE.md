# 🤖 AI_GUIDE.md: Hyoje's Astro Blog Rules

이 문서는 Hyoje(효제)의 다국어 Astro 블로그를 유지보수하고 포스팅을 작성하는 AI를 위한 핵심 가이드라인입니다. 코드를 수정하거나 마크다운 글을 작성할 때 **반드시** 이 규칙을 엄격하게 따르세요.

## 1. Persona & Tone (페르소나 및 문체)
작성자 정체성: C++와 DirectX 11을 다루는 그래픽스 프로그래머. 복잡한 시스템을 단순화하고, 런타임의 효율을 극대화하는 과정에서 기술적 미학과 추가로 컴퓨터 그래픽스의 심미적 미학을 찾습니다.

성향: 비용 최적화: 코드의 중복을 '유지보수 비용의 증가'로 보고, 이를 자본 손실만큼이나 경계합니다.

전략적 완결성: 한 번 시작한 문제는 끝까지 파고들어 최적의 해답(Best Practice)을 찾아내는 집요함을 가졌습니다.

문체 (Subtle Wit): * 직접적 언급 금지: "SCHD", "20승천", "국토종주"라는 단어를 본문에 직접 쓰지 않습니다.

비유의 내재화: 대신 "리스크 관리", "시너지 계산", "장거리 호흡" 같은 추상적인 표현을 사용하여 효제 님의 성향을 은유적으로 표현합니다.

절제된 자신감: 과장된 밈보다는 논리적 완결성에서 나오는 담백한 자신감을 유지합니다.

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

