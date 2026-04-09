---
title: '[step-up-unreal-gas] Part 4 GAS와 UI'
published: 2026-04-10
draft: false
unlisted: false
tags: ['cpp', 'unreal-engine', 'gas', 'gameplay-abilility-system', 'HUD']
lang: 'ko'
series: 'step-up-unreal-gas'
---

# 영상부터 보자. 

리스펙트 투 Ali Elzoheiry
https://www.youtube.com/watch?v=AndwX3yDsgs&list=PLNwKK6OwH7eVaq19HBUEL3UnPAfbpcUSL&index=4


##  AI 영상 요약

요청하신 언리얼 엔진의 **Gameplay Ability System(GAS) UI/Widgets 튜토리얼 영상**에 대한 분석과 이를 바탕으로 한 학습 설계를 정리해 드립니다.

### 📊 영상 분석 (Video Analysis)

* **영상 제목:** Unreal Engine's Gameplay Ability System — Part 4: UI/Widgets — Tutorial
* **유튜버:** Ali Elzoheiry
* **핵심 주제:** 캐릭터(Ability Component)와 UI(Widget)를 완전히 분리(Decoupling)하면서도, 상태 변화 시 서로 원활하게 통신할 수 있는 '모듈식 UI 아키텍처' 구축.

**주요 내용 및 핵심 기술 요약:**

1.  **모듈식 UI 설계의 중요성 [[01:15](http://www.youtube.com/watch?v=AndwX3yDsgs&t=75)]**
    * 보통 튜토리얼에서 보여주는 것처럼 하나의 거대한 HUD 클래스에 체력, 크로스헤어, 스킬창 로직을 모두 몰아넣지 않습니다.
    * 메인 HUD는 단순히 UI들을 띄워주는 빈 컨테이너(Canvas Panel) 역할만 수행하게 하고, 실제 로직은 `Player Vitals`(상태창), `Abilities Container`(스킬 목록), `Ability Slot`(개별 스킬) 등 작은 단위의 위젯으로 쪼개어 재사용성을 극대화합니다.
2.  **Attribute(속성) 변화 감지 및 UI 동기화 [[08:24](http://www.youtube.com/watch?v=AndwX3yDsgs&t=504)]**
    * UI 위젯이 화면에 생성될 때(`Event Construct`), 플레이어의 Ability System Component를 가져와 체력과 스태미나의 초기값을 세팅합니다.
    * 매 프레임 UI를 업데이트하는 비효율적인 방식 대신, **`Wait for Attribute Changed`** 노드를 활용하여 스태미나나 체력 수치에 변동이 생겼을 때만 프로그레스 바가 동기화되도록 최적화합니다 [[11:56](http://www.youtube.com/watch?v=AndwX3yDsgs&t=716)].
3.  **Gameplay Tag를 활용한 쿨다운 타이머 구현 [[25:18](http://www.youtube.com/watch?v=AndwX3yDsgs&t=1518)]**
    * 개별 어빌리티 위젯은 `Ability Spec Handle`을 전달받아 자신이 어떤 스킬인지 식별합니다.
    * 쿨다운 관리를 위해 **`Wait for Tag Count Changed`** 노드를 사용합니다. 플레이어에게 'Cooldown' 관련된 게임플레이 태그가 부여되거나 사라지는 것을 리슨(Listen)합니다.
    * 쿨다운이 시작되면 반투명한 오버레이를 띄우고, 0.1초마다 루프하는 타이머(`Set Timer by Event`)를 작동시켜 남은 쿨다운 시간을 텍스트로 표시합니다 [[27:32](http://www.youtube.com/watch?v=AndwX3yDsgs&t=1652)].
4.  **Gameplay Event를 통한 시스템 간 비동기 통신 [[37:20](http://www.youtube.com/watch?v=AndwX3yDsgs&t=2240)]**
    * 게임 시작 시 로딩 속도 차이로 인해 스킬이 UI에 바로 뜨지 않는 현상을 해결하고자 무작정 `Delay` 노드를 사용하는 것은 매우 좋지 않은 방식입니다 [[36:24](http://www.youtube.com/watch?v=AndwX3yDsgs&t=2184)].
    * 대신, 캐릭터가 새로운 스킬을 획득했을 때 **`Send Gameplay Event to Actor`** 노드로 커스텀 태그(`event.abilities.changed`) 이벤트를 방송(Broadcast)합니다 [[37:42](http://www.youtube.com/watch?v=AndwX3yDsgs&t=2262)].
    * UI 컨테이너는 **`Wait for Gameplay Event`**로 해당 이벤트를 기다리고 있다가, 신호가 오면 즉시 UI를 새로고침하여 스킬 슬롯들을 다시 그립니다 [[38:39](http://www.youtube.com/watch?v=AndwX3yDsgs&t=2319)].

---

### 📝 학습 설계 (Learning Design)

이 영상은 언리얼 엔진 GAS를 사용할 때 맞닥뜨리는 **"로직(서버/데이터)과 뷰(클라이언트/UI)를 어떻게 깔끔하게 연결할 것인가?"**에 대한 훌륭한 해답을 제시합니다. 이를 마스터하기 위한 단계별 실습 계획입니다.

**대상:** 언리얼 엔진 UMG 기초를 알고 있으며, GAS 데이터 연동에 어려움을 겪고 있는 개발자.
**학습 목표:** Delegate(대리자) 및 Event 기반의 노드를 활용하여 틱(Tick) 없이 효율적으로 구동되는 동적 UI 파이프라인 구축.

#### 🛠️ 단계별 실습 커리큘럼 (Step-by-Step Plan)

**Step 1: UI 쪼개기 (컴포넌트화 실습)**
* **목표:** 메인 HUD와 하위 위젯들을 분리하여 화면에 배치하기.
* **행동:** W_PlayerHUD, W_PlayerVitals, W_AbilitiesContainer 총 3개의 위젯 클래스를 생성합니다. 메인 HUD에는 캔버스 패널만 두고 나머지 두 위젯을 드래그 앤 드롭으로 배치한 후 화면 크기에 맞게 앵커(Anchor)를 고정해 봅니다.

**Step 2: Vitals(상태창) 이벤트 바인딩 적용**
* **목표:** 데미지를 입거나 행동을 할 때만 UI가 깎이도록 만들기.
* **행동:** W_PlayerVitals 블루프린트를 열고, `Wait for Attribute Changed` 노드를 사용하여 Health와 Stamina의 변화를 감지합니다. 값이 바뀔 때만 `Set Percent`가 실행되도록 연결하여 이벤트 주도형(Event-Driven) UI 업데이트 구조를 완성합니다.

**Step 3: 쿨다운 타이머 및 태그 감지 시스템 이해**
* **목표:** 서버나 컴포넌트가 UI를 직접 조작하지 않고, UI가 주도적으로 상태를 관찰(Observe)하게 만들기.
* **행동:** 개별 W_Ability 위젯 내부에 오버레이 텍스트(예: 3, 2, 1)를 숨김 처리해 둡니다. `Wait for Tag Count Changed` 로 Cooldown 태그를 추적하다가 1 이상이 되면 오버레이를 표시하고 루핑 타이머를 실행시킵니다. 쿨다운이 0이 되면 타이머를 초기화(`Clear and Invalidate Timer`)하는 로직을 짭니다.

**Step 4: Gameplay Event 파이프라인 구축 (Delay 근절)**
* **목표:** 가장 중요한 핵심 기술인 비동기 이벤트 통신 마스터하기.
* **행동:** 플레이어 캐릭터 블루프린트에서 스킬 부여(Give Ability) 로직 직후에 `event.abilities.changed` 태그를 포함한 이벤트를 나 자신(Self)에게 보냅니다. 이후 W_AbilitiesContainer 위젯에서 이 이벤트를 리슨하고 있다가, 호출되면 기존에 띄워둔 스킬 자식 위젯들을 비운(`Clear Children`) 후 새롭게 받아온 배열로 위젯들을 다시 렌더링하는 로직을 작성합니다.

💡 **다음 단계 (Next Steps):**
이 위젯 통신 방식을 완벽하게 숙지했다면, 유튜버가 다음 파트(Part 5)에서 다루겠다고 예고한 **"Attribute Clamping(속성값 제한)"** [[41:40](http://www.youtube.com/watch?v=AndwX3yDsgs&t=2500)] 파트로 넘어가시면 됩니다. 캐릭터의 체력이 0 이하로 떨어지거나 최대치를 넘지 못하도록 엔진 내부의 C++ 함수인 `PreAttributeChange`나 `PostGameplayEffectExecute`를 어떻게 오버라이드 하는지 선행 학습해 보시길 추천합니다.


http://googleusercontent.com/youtube_content/0


요청하신 07:31 ~ 13:57 구간은 `Player Vitals`(체력/스태미나 바) 위젯이 **GAS(Gameplay Ability System)의 데이터를 어떻게 효율적으로 가져오고 업데이트하는지** 그 핵심 통신 원리를 설명하는 매우 중요한 파트입니다. 

이 구간에서 설명하는 위젯과 GAS 간의 통신 로직을 단계별로 상세히 풀어드리겠습니다.

---

### 🔗 위젯과 GAS의 통신 방식 (07:31 ~ 13:57)

이 구간의 핵심 목표는 **매 프레임(Tick)마다 체력을 확인하는 비효율적인 짓을 피하고, 값이 변할 때만 위젯이 반응하도록(Event-Driven) 만드는 것**입니다.

#### 1. 초기 연결 및 데이터 캐싱 (Event Construct)
위젯이 화면에 처음 생성될 때, 플레이어의 속성(Attribute) 기본값을 한 번 가져와 저장해 둡니다.

* **컴포넌트 가져오기:** 먼저 `Get Owning Player Pawn` 노드를 사용해 현재 이 위젯을 띄운 플레이어 폰을 가져오고, 거기서 **`Ability System Component (ASC)`**를 추출합니다.
* **유효성 검사:** `Is Valid` 노드로 ASC가 정상적으로 존재하는지 반드시 확인합니다. (ASC가 없다면 체력이나 스태미나 데이터 자체도 존재하지 않기 때문입니다.)
* **초기값 저장:** `Get Float Attribute` 노드를 이용해 Health(현재 체력), Max Health(최대 체력), Stamina, Max Stamina의 현재 값을 가져온 뒤, 이를 위젯 내부의 변수로 승격(Promote to Variable)시켜 저장합니다. 매번 함수를 호출해 값을 가져오는 것을 방지하기 위함입니다.

#### 2. UI 업데이트 함수 분리
가져온 데이터를 바탕으로 실제 프로그레스 바(Progress Bar)의 게이지를 채우는 기능을 별도의 함수로 만듭니다.

* **`Update Health Percent` 함수:** (현재 Health / Max Health)를 계산하여 0.0 ~ 1.0 사이의 비율(Percent)을 구하고, 이를 체력바 위젯의 `Set Percent` 노드에 연결합니다.
* **`Update Stamina Percent` 함수:** 스태미나도 위와 동일한 로직으로 구성합니다.
* 위젯이 생성될 때 이 함수들을 한 번씩 호출해주면, 게임 시작 시 체력바와 스태미나바가 꽉 차 있는(또는 현재 값에 맞는) 상태로 보이게 됩니다.

#### 3. 핵심 통신 노드: `Wait for Attribute Changed` 🌟
초기화 이후 캐릭터가 데미지를 입거나 대시를 해서 값이 바뀌었을 때, 위젯이 이를 어떻게 알아채고 업데이트할지가 이 구간의 하이라이트입니다.

* **상태 변화 대기(Listen):** 틱(Tick)을 사용하는 대신, **`Wait for Attribute Changed`**라는 비동기(Async) 태스크 노드를 사용합니다.
* 이 노드에 Target Actor로 'Owning Player Pawn'을 연결하고, 감시할 Attribute(예: Stamina)를 지정해 줍니다.
* **이벤트 발생:** 이제 게임 플레이 중 GAS 내부 시스템에 의해 플레이어의 스태미나 수치가 1이라도 깎이거나 회복되면, 이 노드의 **`On Change`** 실행 핀이 즉각적으로 발동(Fire)됩니다.
* **UI 갱신:** `On Change`가 발동되면 핀에서 '새로운 스태미나 값(New Value)'이 튀어나옵니다. 위젯은 이 새로운 값으로 내부 변수를 덮어씌운 뒤, 앞서 만들어둔 `Update Stamina Percent` 함수를 호출하여 화면의 프로그레스 바를 갱신합니다.

---

### 💡 요약: 이 아키텍처가 강력한 이유

튜토리얼에서 유튜버가 이 방식을 강조하는 이유는 **"완벽한 디커플링(Decoupling)"**과 **"최적화"** 때문입니다. 

캐릭터(서버 쪽 로직)는 데미지를 입거나 스킬을 쓸 때 UI가 어떻게 생겼는지 알 필요 없이 그냥 자신의 체력/스태미나 데이터만 수정합니다. 그러면 UI(위젯)는 뒤에서 조용히 그 데이터의 변화만 감시(`Wait for Attribute Changed`)하고 있다가, 값이 바뀔 때만 스스로 화면을 다시 그립니다. 

이렇게 설계하면 훗날 UI 디자인이 완전히 바뀌거나 위젯이 삭제되더라도 게임의 핵심 플레이 로직에는 아무런 에러가 발생하지 않게 됩니다.

요청하신 **13:57 ~ 21:25 구간 (The Ability Widget)**은 개별 스킬 하나를 화면에 표시하는 **`W_Ability` (어빌리티 위젯)**의 UI 뼈대를 만들고, 이 위젯이 자신이 '어떤 스킬인지' 인식하도록 초기 데이터를 세팅하는 핵심 기초 과정을 다룹니다.

이 구간의 내용을 크게 3단계로 나누어 상세히 설명해 드리겠습니다.

---

### 1. 개별 스킬 UI 레이아웃 디자인 (13:57 ~ 17:25)
스킬 아이콘, 스킬 이름, 그리고 쿨다운 시 화면이 어두워지며 숫자가 뜨는 UI 구조를 잡는 과정입니다.

* **Size Box & Overlay:** 스킬 슬롯의 크기를 일정하게 고정(예: 100x100)하기 위해 Size Box를 쓰고, 그 안에 배경색, 텍스트, 쿨다운 이미지를 겹쳐서 배치하기 위해 Overlay를 사용합니다.
* **UI 요소 변수화 (Is Variable):** 위젯 블루프린트(그래프)에서 수치를 실시간으로 바꿔주어야 하는 요소들을 우측 디테일 패널에서 `Is Variable(변수 여부)` 체크합니다.
  * **`Ability Text`**: 스킬 이름이 들어갈 텍스트 (초기값: Dash)
  * **`Cooldown Overlay`**: 스킬 사용 시 아이콘을 어둡게 덮을 반투명 검은색 배경
  * **`Cooldown Time Text`**: 오버레이 위에 표시될 남은 쿨다운 시간 숫자 (초기값: 3)
* 초기 상태에서 쿨다운 오버레이는 보이지 않아야 하므로 `Visibility`를 **Hidden** 또는 **Collapsed**로 설정해 둡니다.

### 2. 스킬 식별 데이터 받기: Ability Spec Handle 🌟 (17:26 ~ 18:45)
이 부분이 GAS UI 설계에서 가장 중요한 개념 중 하나입니다. 위젯 껍데기는 만들었지만, 이 위젯은 자신이 '대시' 스킬인지 '파이어볼' 스킬인지 모릅니다. 외부에서 알려주어야 합니다.

* **`Ability Spec` 변수 생성:**
  위젯 내부에 `Gameplay Ability Spec Handle` 타입의 변수를 하나 만듭니다. 이 핸들은 GAS 내부에서 특정 스킬의 고유한 인스턴스를 식별하는 '명찰' 또는 '포인터' 같은 역할을 합니다.
* **스폰 시 노출 (Expose on Spawn):**
  이 변수의 디테일 패널에서 **`Instance Editable`(인스턴스 편집 가능)**과 **`Expose on Spawn`(스폰 시 노출)**을 반드시 체크합니다.
  * 이렇게 하면 나중에 메인 UI 컨테이너에서 `Create Widget` 노드로 이 어빌리티 위젯을 생성할 때, 해당 노드에 `Ability Spec` 핀이 밖으로 튀어나오게 됩니다. 위젯을 생성함과 동시에 이 스킬이 무슨 스킬인지 데이터를 "꽂아 넣어줄 수" 있게 되는 것입니다.

### 3. 초기화 및 정보 띄우기 (Event Construct) (18:46 ~ 21:25)
위젯이 화면에 생성될 때(`Event Construct`), 방금 주입받은 명찰(`Ability Spec`)을 바탕으로 실제 스킬 정보를 뽑아와 UI에 글씨를 띄우는 로직을 작성합니다.

* **ASC 확인:** 먼저 플레이어 폰의 Ability System Component가 유효한지 검사합니다.
* **객체 참조 가져오기 (`Get Gameplay Ability from Spec Handle`):**
  외부에서 꽂아준 `Ability Spec` 핸들을 이 노드에 연결하면, 핸들이 가리키는 **실제 스킬 객체(Ability Object)**를 반환해 줍니다. 
* **`Ability Object Ref` 변수 저장:**
  반환받은 스킬 객체를 위젯 내부 변수로 승격시켜 저장해 둡니다. 나중에 이 객체를 통해 쿨다운이 얼마나 남았는지, 스킬 이름이 무엇인지 계속 조회해야 하기 때문입니다.
* **UI 텍스트 업데이트:**
  저장된 객체에서 스킬의 클래스 이름(또는 Display Name)을 가져와, 처음에 만들어둔 UI 요소인 `Ability Text`에 `Set Text` 노드로 글씨를 바꿔줍니다.

---

**💡 요약하자면:**
이 구간은 빈 깡통 같은 UI 위젯(`W_Ability`)을 만들고, 생성될 때 외부에 **"내가 무슨 스킬인지 핸들(Spec)을 넘겨줘!"(`Expose on Spawn`)**라고 요청하도록 세팅한 뒤, 넘겨받은 핸들에서 실제 스킬 이름을 꺼내와 화면에 띄우는 과정입니다. 

(이후 영상에서는 이 세팅을 바탕으로 스킬이 사용되었을 때 쿨다운 타이머가 돌아가는 기능이 추가됩니다.)


요청하신 **25:00 ~ 31:39 구간 (How the Ability Widget Checks Cooldown)**은 스킬이 사용되었을 때 UI가 이를 알아채고, 화면에 남은 쿨다운 숫자(3, 2, 1...)를 띄워주는 핵심 로직을 설명합니다. 

단순히 틱(Tick)을 써서 매 프레임 남은 시간을 검사하는 것이 아니라, **GAS의 태그 시스템과 커스텀 타이머를 조합하여 아주 가볍고 효율적으로 작동하게 만드는 것**이 이 구간의 핵심입니다.

작동 방식을 4단계로 나누어 상세히 정리해 드립니다.

---

### ⏳ 쿨다운 감지 및 UI 업데이트 4단계 작동 원리

#### 1. 쿨다운 시작 감지하기 (`Wait for Tag Count Changed`)
스킬이 쿨다운에 들어가면 GAS는 플레이어에게 'Cooldown' 관련 **게임플레이 태그(Gameplay Tag)**를 부여합니다. 위젯은 이 태그가 생기는 순간을 기다립니다.

* 위젯 초기화 시점(`Event Construct`)의 끝부분에 **`Wait for Tag Count Changed`** 노드를 연결합니다.
* 감시할 태그로 'Cooldown'(또는 쿨다운 최상위 태그)을 지정합니다.
* 이렇게 하면 게임 중 누군가가 스킬을 써서 플레이어에게 Cooldown 태그가 추가되거나 제거되는 딱 그 순간에만 이 노드의 이벤트가 발동합니다. (매 프레임 감시하지 않아 최적화에 좋습니다.)

#### 2. "이게 내 스킬 쿨다운이 맞나?" 검증하기 (Branch)
어떤 스킬이 사용되어 Cooldown 태그가 생기긴 했는데, 그게 대시(Dash) 스킬 때문인지 힐(Heal) 스킬 때문인지 위젯은 모릅니다. 그래서 확인 과정을 거칩니다.

* 아까 저장해둔 내 스킬 객체(`Ability Object Ref`)에서 **`Get Cooldown Time Remaining`** 함수를 호출합니다.
* **조건 1:** 내 스킬의 남은 쿨다운 시간이 0보다 큰가? (크다면 내 스킬이 방금 쿨다운에 들어갔다는 뜻입니다.)
* **조건 2:** UI 업데이트 타이머가 이미 돌아가고 있지는 않은가? (`Is Active` 판별 노드에 Not 연산자 사용)
* 두 조건이 모두 참(True)일 때만 다음 단계로 넘어갑니다.

#### 3. 타이머 가동 및 오버레이 표시 (`Set Timer by Event`)
내 스킬이 쿨다운 상태임이 확인되면, 멈춰있던 위젯을 깨워 쿨다운 연출을 시작합니다.

* 숨겨두었던 반투명 검은색 **`Cooldown Overlay`**를 `Visible`로 바꿔서 화면을 어둡게 덮습니다.
* **`Set Timer by Event`** 노드를 사용해 **0.1초마다 반복(Looping)**되는 타이머를 켭니다. (1초마다 하면 화면 숫자가 늦게 바뀔 수 있어 0.1초로 설정합니다.)
* 나중에 이 타이머를 멈춰야 하므로, 반환되는 타이머 핸들을 **`Cooldown Timer Handle`**이라는 변수에 저장해 둡니다.

#### 4. 숫자 갱신 및 쿨다운 종료 (`Update Cooldown Progress`)
0.1초마다 실행되는 커스텀 이벤트(업데이트 함수)를 만들어 숫자를 계속 바꿔줍니다.

* 0.1초마다 내 스킬의 `Get Cooldown Time Remaining`을 다시 호출해 진짜 남은 시간을 확인합니다.
* **시간이 남았다면 (> 0):** 남은 시간을 소수점 없이 보여주기 위해 **`Ceiling`(올림)** 노드를 통과시켜 정수로 만든 뒤, 화면의 텍스트 요소(`Cooldown Time Text`)를 갱신합니다. (예: 2.8초 남았으면 '3'으로 표시됨)
* **시간이 다 끝났다면 (<= 0):** 텍스트를 빈칸으로 비우고, 어둡게 덮였던 오버레이를 다시 숨깁니다(`Collapsed`).
* **가장 중요한 마무리:** **`Clear and Invalidate Timer`** 노드에 아까 저장해둔 `Cooldown Timer Handle`을 넣어 0.1초마다 돌던 타이머를 완전히 정지시킵니다.

---

### 💡 이 설계의 포인트
Tick 이벤트를 써서 매 프레임 계산하면 위젯이 10개만 있어도 불필요한 연산이 크게 늘어납니다. 하지만 유튜버의 방식대로 만들면 평소에는 위젯이 아무런 연산을 하지 않고 잠들어 있다가, **오직 자기 스킬이 쿨다운 중일 때만 0.1초 타이머를 켜서 UI를 갱신하고 끝나면 다시 완전히 정지**하게 됩니다. 이는 상용 게임에서 주로 사용하는 매우 훌륭한 UI 최적화 패턴입니다.


요청하신 **31:39 ~ 41:35 구간 (Dynamically Adding Abilities to the HUD)**은 이 튜토리얼의 하이라이트로, **"Delay(지연) 노드 같은 꼼수를 쓰지 않고, 게임 중 스킬이 추가되거나 삭제될 때 UI가 즉각적이고 우아하게 반응하도록 만드는 완벽한 파이프라인"**을 구축하는 과정입니다.

이 구간의 핵심 내용을 4단계 프로세스로 깔끔하게 정리해 드립니다.

---

### 🚀 동적 스킬 UI 구축 파이프라인 (The Right Way)

#### 1. 스킬 목록 컨테이너 위젯 만들기 (`W_AbilitiesContainer`)
개별 스킬 위젯을 화면에 직접 하드코딩으로 배치하는 대신, 스킬들을 가로로 나란히 담아줄 **빈 바구니(Container)** 역할을 하는 위젯을 먼저 만듭니다.

* **UI 디자인:** 내부에 `Horizontal Box`(가로 박스)를 하나 배치하고 변수화(`Is Variable` 체크)합니다.
* **스킬 불러오기:** 위젯이 생성될 때(`Event Construct`), 플레이어의 Ability System Component(ASC)를 가져와서 **`Get All Abilities`** 노드를 호출합니다.
* **위젯 자동 생성:** 이 노드는 플레이어가 현재 가진 모든 스킬의 리스트(배열)를 반환합니다. `For Each Loop`를 돌면서, 배열에 있는 스킬 개수만큼 앞서 만든 `W_Ability`(개별 스킬 위젯)를 동적으로 생성(`Create Widget`)하고, 가로 박스에 자식으로 추가(`Add Child to Horizontal Box`)합니다.

#### 2. Delay(지연) 노드의 치명적인 한계
위처럼만 만들고 게임을 실행하면 스킬 UI가 아예 안 뜨는 문제가 발생합니다. 캐릭터가 스킬을 부여받기도 전에 UI 위젯이 먼저 생성되어 빈 리스트를 가져오기 때문입니다.

* **초보자의 실수:** 이 문제를 덮기 위해 위젯 생성 전에 `Delay`(예: 0.2초) 노드를 넣는 경우가 많습니다.
* **왜 나쁜가?** 게임 도중에(예: 시작 2초 뒤에 아이템을 먹어서) 새로운 스킬을 획득하면, 이미 UI 생성 로직은 지나가 버렸기 때문에 화면의 스킬 바에 새 스킬이 추가되지 않습니다. 유튜버는 이를 보여주며 **절대 이 방식을 쓰지 말라**고 강조합니다.

#### 3. 올바른 해결책: Gameplay Event 방송하기 🌟
캐릭터가 스킬을 언제 얻을지 UI는 미리 알 수 없습니다. 따라서 캐릭터가 스킬을 획득하는 순간 **"나 스킬 목록 바뀌었어!" 하고 방송(Broadcast)**을 하고, UI는 그 라디오 주파수를 듣고 있게 만들어야 합니다.

* **이벤트 전송 (보내는 쪽 - 캐릭터 블루프린트):**
  플레이어에게 스킬을 부여하는 함수(`Give Abilities`)의 맨 마지막에 **`Send Gameplay Event to Actor`** 노드를 추가합니다. 대상(Actor)은 자기 자신(Self)으로 하고, 이벤트 태그를 새롭게 만들어 지정합니다. (예: `event.abilities.changed`)

#### 4. 이벤트 수신 및 UI 새로고침
이제 스킬 바 컨테이너(`W_AbilitiesContainer`)가 저 방송을 듣고 화면을 갱신하도록 만듭니다.

* **이벤트 대기 (듣는 쪽 - UI 컨테이너):**
  컨테이너의 `Construct` 이벤트 초반부에 **`Wait for Gameplay Event`** 노드를 배치합니다. 플레이어 액터에서 `event.abilities.changed` 태그가 날아오기를 무한정 기다립니다.
* **새로고침 로직 (`Fill Abilities Bar`):**
  이벤트 신호가 도착하면, 스킬 바를 새로고침하는 커스텀 이벤트를 실행합니다.
* **주의사항 (Clear Children):** 새로고침할 때 무작정 리스트를 다시 생성하면 기존 스킬 옆에 똑같은 스킬이 또 추가(중복 생성)됩니다. 따라서 루프를 돌기 전에 반드시 가로 박스의 **`Clear Children`** 노드를 호출하여 낡은 위젯들을 싹 비워준 뒤에, 새로운 리스트를 바탕으로 위젯들을 다시 채워 넣습니다.

---

### 💡 결론: 이 구조가 상용 게임의 '정석'인 이유

이 파이프라인을 완성하면, 게임 시작 10분 뒤에 보물상자를 열어 새 스킬을 얻든, 몬스터에게 저주를 받아 스킬을 잃어버리든 UI 코드를 단 한 줄도 건드릴 필요가 없습니다. 

서버/캐릭터 쪽에서 스킬 세팅을 바꾼 뒤 `event.abilities.changed` 신호 딱 하나만 쏴주면, 스킬 컨테이너가 알아서 기존 UI를 다 지우고 현재 상태에 맞게 스킬 아이콘들을 완벽하게 다시 정렬해서 그려주기 때문입니다. **결합도를 극도로 낮춘, 매우 유연하고 확장성 높은 구조**입니다.


# 오늘의 학습이 매우 중요한 이유.

졸업 프로젝트가 스킬을 아이템화 해야 하기 때문에 내가 갖고 있던 고민들을 해결할 수 있었다. 

# 실습


