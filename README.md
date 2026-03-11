# 🚀 Hyoje's Tech Blog

개인 포트폴리오 및 기술 블로그 소스 코드입니다.  
👉 **[블로그 바로가기](https://hyojeb1.github.io)**

이 블로그는 C++ 게임 엔진 개발, 3D 그래픽스(DirectX), 그리고 네트워크 비동기 프로그래밍 등 그래픽스 개발자로서의 여정과 트러블슈팅을 기록하기 위해 구축되었습니다.

## 🛠️ Tech Stack & Features
* **Framework:** Astro (Static Site Generation)
* **Deployment:** GitHub Pages & GitHub Actions
* **Styling:** Tailwind CSS & Expressive Code (Shiki)
* **Comments:** Giscus (GitHub Discussions)

## ✨ Custom Enhancements
원활한 글쓰기 환경을 위해 원본 테마를 포크(Fork)한 후 아래와 같은 기능들을 직접 파이프라인에 추가 및 수정했습니다.

### Obsidian Markdown Support
옵시디언(Obsidian) 앱에서 작성한 마크다운 문법을 Astro 환경에서 완벽하게 렌더링하도록 커스텀 Remark/Rehype 플러그인을 적용했습니다.

* `remarkObsidianCallout`: `> [!info]` 형태의 콜아웃(Admonitions)을 예쁜 UI 박스로 변환
* `remarkObsidianWikilinkHighlight`: `[[link]]` 형태의 위키링크를 일반 `<a>` 태그로, `==text==`를 형광펜 `<mark>` 태그로 변환
* **Strict Tag Routing:** 프론트매터의 태그 규칙을 수정하여 `foo:goo` 같은 콜론(:) 기반 태그 라우팅이 정상적으로 동작하도록 보장

**Dependencies added:**
```bash
npm install remark-directive mdast-util-to-string unist-util-visit

```

## 📂 Repository Structure

* `/src/content/posts`: 블로그 마크다운 원본 (한국어/영어)
* `/src/pages`: 웹사이트 라우팅 및 페이지 컴포넌트
* `/src/components`: Astro 기반 UI 컴포넌트 모음
* `/src/plugins`: 옵시디언 문법 등 커스텀 마크다운 렌더링 플러그인 모음

## 👏 Acknowledgments

This blog was built upon the beautiful [MultiTerm Astro](https://github.com/stelcodes/multiterm-astro) theme created by Katy Kookaburra (@stelcodes).

