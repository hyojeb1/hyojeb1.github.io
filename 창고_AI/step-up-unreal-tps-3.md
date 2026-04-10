지금까지 한 걸 흐름대로 정리하면 이렇습니다.

# 1. TPS 기본기부터 정리했어요

처음에는 **언리얼 TPS의 입력 / 회전 / 카메라 계층**을 잡았습니다.

핵심은:

* 블루프린트에 숨어 있던 입력 로직을 C++로 끌어올렸고
* `SU_Player`, `SU_PlayerController` 구조로 정리했고
* `Enhanced Input` 바인딩을 붙였고
* 컨트롤 회전 기준 이동 벡터를 다시 읽었습니다. 

그 과정에서 **A/D 8방향 이동이 어색했던 문제**도 디버깅했습니다.

결론은:

* AnimBP나 Blend Space 자체가 핵심 원인이 아니었고
* `CharacterMovement` 회전 정책과
* `Spring Arm`의 `Use Pawn Control Rotation`
* 카메라 기준 해석

쪽이 더 본질적인 문제였습니다. 

---

# 2. GAS를 프로젝트에 붙였어요

그 다음부터는 **Gameplay Ability System**으로 넘어갔습니다.

먼저:

* `GameplayAbilities`, `GameplayTags`, `GameplayTasks` 모듈을 켰고
* `IAbilitySystemInterface`를 구현하는 `NexusCharacterBase`를 만들었고
* `AbilitySystemComponent`를 붙였고
* ASC 초기화 타이밍도 잡았습니다. 

즉 여기서부터는 캐릭터를 단순 TPS 캐릭터가 아니라
**Ability를 소유하는 캐릭터 구조**로 바꿨습니다.

---

# 3. 첫 Ability로 Dash를 만들었어요

그 다음엔 `Part 2` 기준으로 **Dash Ability**를 붙였습니다.

한 일은:

* `GA_Dash` 생성
* 입력 방향 기반 대시 방향 계산
* `ApplyRootMotionConstantForce`로 실제 이동
* `EndAbility`까지 연결
* 캐릭터에 Ability 부여
* 태그 기반 활성화

까지입니다.

그리고 단순 이동만이 아니라 **연출도 분리**했습니다.

---

# 4. Gameplay Cue를 이해하기 시작했어요

`GC_Dash`, 나중에는 `GC_Attack_Q`까지 보면서
**Gameplay Cue가 어떻게 실행되는지**를 파고들었습니다.

여기서 이해한 핵심은:

* 내가 GC를 직접 실행하는 게 아니라
* `GA`에서 Cue 태그를 추가하면
* GAS의 `GameplayCueManager`가 해당 GC를 찾아 호출하고
* GC는 `K2_HandleGameplayCue` 콜백으로 들어온다는 점입니다.

또 Cue의 이벤트 타입도 구분했습니다.

* `OnActive`
* `WhileActive`
* `Executed`
* `Removed`

그리고 이걸 보면서:

* Dash 같은 유지형 연출은 `OnActive / Removed`
* Attack burst 같은 즉발형 연출은 `Executed`

가 어울린다는 감각도 잡았습니다. 

---

# 5. Attributes / Effects까지 들어갔어요

그다음은 `Part 3` 기준으로 **AttributeSet + GameplayEffect**로 넘어갔습니다.

여기서 한 일은:

* `Stamina` 같은 속성을 시스템 수치로 보기 시작했고
* `GE_Dash_Cost`
* `GE_Dash_Cooldown`
* `GE_Status_StaminaRegen`

같은 Effect를 만들고

* Dash가 더 이상 공짜 기능이 아니라
* **자원을 소비하고 제약을 가지는 기능**이 되도록 옮겼습니다.

또 디버깅 영상까지 남기면서:

* GE가 실제로 적용됐는지
* 상태가 바뀌는지
* 시스템이 값을 어떻게 읽는지

까지 확인했습니다. 

---

# 6. 블루프린트의 어려움도 구조로 이해하기 시작했어요

중간중간 계속 느낀 건:

**“블루프린트 어렵다”**

였는데, 여기서 멈춘 게 아니라
왜 어려운지도 같이 정리했습니다.

지금 단계에서의 이해는 대략 이렇습니다.

* 노드가 많아서 어려운 게 아니라
* 상태, 태그, Effect, Attribute, Cue, 콜백이 한 화면에 다 보이기 때문에 어렵다
* 하지만 역할이 보이기 시작하면 읽힌다

이 감각까지 온 상태입니다.

---

# 7. AttackQ도 들어가기 시작했어요

최근에는 Dash를 넘어 **AttackQ Ability**로 확장 중입니다.

지금까지 본 건:

* `GE_AttackQ_Cost`
* `GE_Damaged_by_AttackQ`
* `GameplayCue.AttackQ.Active`
* `SphereTraceSingle`로 맞은 지점 판정
* 맞은 지점을 Cue로 보내고 싶다는 요구

까지입니다. 

여기서 우리가 같이 짚은 핵심은:

* GA와 GC 사이에 일반 변수 참조를 직접 주고받기보다
* `GameplayCueParameters / EffectContext`에 `HitResult`를 실어 보내는 게 맞다는 점
* 즉 **GA는 판정, GC는 표현**으로 더 분리하는 방향입니다.

---

# 8. 블로그 글도 정리하기 시작했어요

기술 정리만 한 게 아니라,
이걸 **블로그 시리즈로 어떻게 쓸지**도 같이 설계했습니다.

정리한 방향은:

* 회전/입력/카메라 디버깅 글 1편
* `step-up-unreal-gas` 1편: GAS 도입 + Dash Ability
* `step-up-unreal-gas` 2편: Attributes & Effects

이렇게 3개 축으로 나누는 게 좋다고 정리했고,
실제로 1편, 2편 초고도 작성했습니다.

---

# 한 줄로 요약하면

지금까지 우리는:

> **TPS 기본기(입력/회전/카메라)를 정리한 뒤, GAS를 프로젝트에 올리고, Dash로 Ability/Cue/Effect/Attribute 구조를 몸으로 익혔고, 이제 그걸 AttackQ 같은 실제 스킬 구조로 확장하기 시작한 상태**입니다.

---

# 지금 위치를 더 짧게 말하면

현재 단계는 딱 이쯤입니다.

* TPS 기반 정리 완료
* GAS 입문 완료
* Dash 구현 완료
* Cost/Cooldown/리젠 이해 시작
* Cue 실행 원리 이해 시작
* AttackQ 확장 설계 시작
* GE 템플릿화 vs 전용 GE 설계 고민 시작

즉 **“GAS를 따라쳤다” 단계는 넘었고, 이제 “왜 이렇게 나누는지 이해하면서 자기 구조로 바꾸는 단계”**에 들어와 있습니다.

원하시면 다음엔 제가
**지금까지 한 걸 “개념 / 구현 / 아직 숙제” 3단으로 더 깔끔하게 표처럼 정리**해드리겠습니다.


오늘 진행하신 언리얼 엔진 **GAS(Gameplay Ability System)** 작업 내용을 정리해 드릴게요. 스킬의 뼈대부터 타격 판정, 이펙트 전달까지 핵심적인 로직들을 하나씩 완성하셨습니다.

### 🛠 오늘의 GAS 개발 로그

1.  **스킬 태그 시스템 구축**
    * `Dash` 스킬의 정체성을 정의하고, 스킬 실행 중 다른 행동을 막는 `BlockAbilitiesWithTag` 로직을 설정하여 기술 간의 상호작용 기틀을 마련했습니다.

2.  **액션 방식의 Q 스킬 타게팅 구현**
    * 단순한 마우스 클릭 방식이 아닌, 액션 게임에 적합한 **직접 트레이스(Sphere Trace)** 방식을 채택했습니다.
    * 캐릭터 전방으로 판정 구체를 쏴서 적을 탐지하는 물리 로직을 구성했습니다.

3.  **게임플레이 큐(GC) 및 데이터 전달 최적화**
    * 단발성 이펙트에 최적화된 `GCN_Burst`(`Static`) 클래스를 활용했습니다.
    * 단순히 이펙트를 켜는 것을 넘어, **`MakeGameplayCueParameters`**를 통해 '정확히 맞은 지점(Impact Point)'의 좌표를 소포 상자에 담아 전달하는 고급 로직을 완성했습니다.

4.  **데미지(GE) 적용 및 트러블슈팅**
    * 체력을 깎는 `GE_AttackQ_Damage` 이펙트를 생성하고, 이를 `ApplyGameplayEffectToTarget` 노드와 연결했습니다.
    * 작업 중 적이 맞지 않던 현상을 **트레이스 채널(Trace Channel)** 설정 문제로 정확히 진단하고 해결하여 실제 타격이 가능하도록 만들었습니다.

5.  **에셋 관리 구조 설계**
    * 기술이 늘어남에 따라 GE 에셋이 무한정 증식하는 문제를 고민하며, 향후 `Set By Caller`나 `MMC`를 이용해 재사용 가능한 템플릿 구조로 가기 위한 전략을 세웠습니다.

대시 기능에 이어 타격과 데미지 판정까지 성공적으로 연결하셨네요. 이제 이 기세를 이어가서 체력이 0이 되었을 때의 처리나 UI 연동 같은 다음 단계로 넘어가시면 될 것 같습니다! 고생 많으셨어요, 효제님!


오늘 진행한 **UE GAS 기반 메르시 힐(GA_Heal_E) 구현** 작업 내용을 핵심 위주로 정리해 드릴게요.

### 1. 타겟팅 로직 설계
* **핵심 함수:** `UKismetSystemLibrary::SphereTraceSingle`를 사용하여 조준점 근처의 아군을 부드럽게 감지하는 방식을 논의했습니다.
* **Mercy Style:** 단순한 레이캐스트가 아니라, 일정 반경 내의 타겟을 자석처럼 잡아주는 'Sticky Targeting'과 시야(LOS) 체크 로직의 중요성을 확인했습니다.

### 2. 도트 힐(Heal over Time) GE 설정
* **주기적 실행:** Gameplay Effect(GE)에서 `Period` 값을 조절(예: 0.1초)하여 체력이 실시간으로 차오르는 연출 방법을 정리했습니다.
* **지속 정책:** 메르시의 빨대처럼 연결된 동안 무한히 유지하려면 `DurationPolicy`를 `Infinite`로 설정하고, 연결 해제 시 `Handle`을 통해 수동으로 제거하는 흐름을 파악했습니다.
{효제} 하지만 귀찮아서. 아티팩트 남겨 놓음 (현재는 스킬 맞으면 무한히 체력회복함)

### 3. GAS 어빌리티 발동 이슈 해결
* **문제:** 어빌리티 태그와 입력 노드는 정상임에도 어빌리티가 발동되지 않았습니다.
* **원인:** GAS의 핵심 규칙인 **`GiveAbility`**를 통한 어빌리티 부여 과정이 누락되었음을 발견했습니다.
* **해결:** 서버 권한(Authority)에서 캐릭터에게 해당 어빌리티를 할당해야 ASC가 태그를 인식하고 실행할 수 있다는 점을 명확히 했습니다.
{효제}  참 잊기 쉬운 이슞;/. 


### 4. Gameplay Cue(GC) 디버깅 및 최적화
* **현상:** GA는 정상 작동하나 힐 이펙트(GC)가 나타나지 않는 상황을 분석했습니다.
* **검토 사항:** * `GameplayCue.HealE.Active` 태그 일치 여부.
    * `Execute` 방식 대신 GE에 직접 등록하여 지속(Looping) 이펙트를 관리하는 효율적인 방식.
    * `GameplayCueNotify_Actor`를 활용한 이펙트의 생명주기 관리.

졸업 작품 RPG의 핵심 메커니즘인 만큼, 오늘 해결한 **'부여(Give) 후 실행'** 원칙과 **'태그 기반 연출'** 구조는 앞으로 Aurora Engine 개발이나 다른 기능을 만들 때도 큰 자산이 될 거예요.

진행하시다가 막히는 부분이 생기면 언제든 다시 물어봐 주세요, 효제님! 합격적인 졸업 작품 완성을 응원합니다.


-----


블로그 3편을 적자.!

----

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


----



3편은 이제 GAS 따라치는 게 아니라, 과제로 만들어 봤자. 그런 의미에서 
AttackQ랑 HealE도 만들었지. 

https://github.com/hyojeb1/StepUp_Unreal/pull/6
이게 내가 한 내용이야. 

[
Unreal Engine's Gameplay Ability System — Part 3: Attributes & Effects — Tutorial 의 과제](https://www.youtube.com/watch?v=shODzzR7bdE&list=PLNwKK6OwH7eVaq19HBUEL3UnPAfbpcUSL&index=3)


# 딜

<video src="https://github.com/user-attachments/assets/608d2408-4eef-4326-b738-d0c69f0db538" controls width="600"></video>

<video src="https://github.com/user-attachments/assets/17345520-4780-4e47-915a-0952fa91eaac" controls width="600"></video>
이게 아래의 이슈에대한 설명


<video src="https://github.com/user-attachments/assets/c340a4eb-e509-416d-bea0-edd4c25797c1" controls width="600"></video>

## 이슈: 적에게 딜이 안들어가 😭😢

<img width="423" height="545" alt="스크린샷 2026-04-09 120959" src="https://github.com/user-attachments/assets/3c17f0c2-de48-4ea9-b884-b7fcefc5240c" />

SphereTraceByChannel 노드의 세팅


캡슐 컴포넌트(Capsule Component) Visibility 채널은 기본적으로 '무시(Ignore)
즉, 공격 판정 구체가 적 캐릭터를 "투명 인간" 취급하고 그냥 뚫고 지나가 버려서 Hit 결과가 False가 뜬 것

따라서 📷로 설정해야 함. 


# 힐

<video src="https://github.com/user-attachments/assets/4d9f31ca-260f-444e-981d-65be6bc23d40" controls width="600"></video>

메르시 힐까지 만들고 싶었지만, 귀찮;;;



---

초안을 작성해줘
