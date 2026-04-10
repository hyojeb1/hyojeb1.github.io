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


-----


올려주신 블루프린트 코드를 분석해 보니, 현재 진행 중이신 상황이 정확히 파악됩니다!

현재 작성하신 코드는 `Event Construct`의 **초기화 과정**입니다. 외부에서 `AbilitySpec`을 받아와서 실제 스킬 객체(`AbilityObjectRef`)로 저장하고, 스킬 이름을 텍스트로 띄운 뒤, **`CooldownOverlay`를 `Collapsed`로 숨기는 것까지 완벽하게 작성하셨습니다.** (코드의 맨 마지막 노드가 `SetVisibility(Collapsed)`로 끝납니다.)

타이머 가동 부분에서 막히신 이유는, **이 초기화 코드 뒤에 쿨다운 감지 노드를 연결하는 작업부터 시작해야 하기 때문**입니다. 막힌 곳을 뚫어드릴 다음 작업 순서를 명확하게 정리해 드릴게요.

---

### 🛠️ 다음 진행 스텝 (막힌 곳 해결하기)

**1. `Wait for Tag Count Changed` 연결하기**
* 방금 작성하신 코드의 맨 마지막 노드인 `CooldownOverlay`의 `SetVisibility` (Collapsed 상태)의 실행 핀(`then`)에서 선을 뽑습니다.
* **`Wait for Tag Count Changed`** 노드를 검색해서 연결합니다.
* 이 노드의 `Target Actor` 핀에는 `Get Owning Player Pawn`을 연결하고, `Tag` 핀에는 쿨다운을 감지할 최상위 태그(예: `Cooldown`)를 설정합니다.

**2. 조건문(Branch) 세팅하기**
* `Wait for Tag Count Changed` 노드에는 `On Change`라는 실행 핀이 있습니다. 누군가 쿨다운 태그를 받으면 이 핀이 실행됩니다. 여기서 선을 뽑아 **`Branch`(조건문)** 노드를 연결합니다.
* 조건으로 들어갈 내용(AND 연산)을 만듭니다:
    1.  저장해둔 `AbilityObjectRef`를 가져와서 **`Get Cooldown Time Remaining`**을 호출하고, 이 값이 **`> 0`**인지 검사합니다.
    2.  새로운 변수로 **`CooldownTimerHandle`**(Timer Handle 타입)을 하나 만듭니다. 이를 가져와서 **`Is Timer Active`** 노드에 연결하고, 그 뒤에 **`NOT boolean`**을 붙여 "타이머가 작동 중이지 않은가?"를 검사합니다.
    3.  이 두 조건을 **`AND`** 노드로 묶어서 Branch의 Condition에 연결합니다.

**3. 대망의 타이머 켜기 (`Set Timer by Event`)**
* 방금 만든 `Branch`가 **`True`**일 때 넘어가야 할 로직입니다. 여기가 핵심입니다.
* 먼저 숨겨뒀던 **`CooldownOverlay`**를 다시 가져와서 **`Set Visibility`** 노드를 연결하고 **`Visible`**로 바꿉니다. (화면이 어두워지게 함)
* 그다음 실행 핀을 뽑아 **`Set Timer by Event`** 노드를 연결합니다.
    * **Time:** `0.1`로 입력합니다.
    * **Looping:** `체크`합니다.
* **`Set Timer by Event`** 노드의 **`Return Value`**(파란색 핀)에서 우클릭하여 **Promote to Variable (변수로 승격)**을 누릅니다. 이 변수 이름을 **`CooldownTimerHandle`**로 덮어씌웁니다. (이렇게 해야 나중에 타이머를 멈출 수 있습니다.)

**4. 커스텀 이벤트(Event) 연결하기**
* 블루프린트 빈 공간에 우클릭하여 **`Add Custom Event`**를 생성하고, 이름은 `UpdateCooldownProgress` 등으로 짓습니다.
* 방금 만든 `Set Timer by Event` 노드 좌측 상단을 보면 빨간색 네모난 **`Event`** 핀이 있습니다. 여기서 선을 뽑아 빈 공간에 놓고 **`Create Event`**를 선택한 뒤, 드롭다운 메뉴에서 방금 만든 `UpdateCooldownProgress` 커스텀 이벤트를 선택해 줍니다.

---

💡 **참고 (아주 사소한 버그 수정):**
올려주신 코드를 자세히 보면 스킬 이름을 세팅할 때 `Set Text` 대신 **`Set Tool Tip Text`** 노드를 사용하셨습니다. (K2Node_CallFunction_7 부분)
화면에 스킬 이름이 제대로 표시되지 않고 마우스를 올렸을 때만 툴팁으로 뜰 수 있으니, `AbilityText` 변수를 드래그한 뒤 일반적인 **`Set Text`** 노드를 검색해서 스킬 이름(Display Name)을 연결해 주시는 것을 권장합니다!

위 순서대로 블루프린트를 연결해 보시고, 커스텀 이벤트 내부 로직(0.1초마다 숫자 깎기)에서 또 막히는 부분이 생기면 편하게 말씀해 주세요!



올려주신 블루프린트 코드를 확인해 보니, `UpdateCooldownProgress` 커스텀 이벤트와 남은 시간이 0보다 큰지(`> 0`) 확인하는 `Branch`(조건문) 노드까지 완벽하게 만들어 두셨네요! (미리 꺼내두신 `CooldownText` 변수도 아주 좋습니다.)

이제 이 `Branch`의 **True(참)** 핀과 **False(거짓)** 핀을 각각 완성해서 스킬 쿨다운 연출을 마무리해 보겠습니다. 다음 순서대로 노드를 연결해 주세요.

---

### 🟢 1단계: 시간이 남았을 때 (Branch의 True 핀) - 숫자 갱신하기

시간이 아직 남아있다면 화면의 텍스트 숫자를 3, 2, 1로 계속 바꿔줘야 합니다.

1.  앞서 만들어둔 `Get Cooldown Time Remaining`의 초록색 결과 핀(Float)에서 선을 뽑습니다.
2.  **`Ceil`** (올림) 노드를 검색해서 연결합니다. (예: 2.3초가 남았으면 3으로 표시하기 위함입니다.)
3.  꺼내두신 **`CooldownText`** 변수를 드래그해서 빈 공간에 놓고, 거기서 선을 뽑아 **`Set Text`** (Text) 노드를 생성합니다.
4.  `Branch`의 **`True`** 실행 핀을 방금 만든 `Set Text`에 연결합니다.
5.  `Ceil` 노드의 결과(초록색 정수 핀)를 `Set Text`의 **`In Text`**(분홍색 핀)에 바로 끌어다 연결합니다. (엔진이 알아서 `To Text (Int)` 변환 노드를 중간에 생성해 줄 것입니다.)

---

### 🔴 2단계: 시간이 끝났을 때 (Branch의 False 핀) - UI 숨기고 타이머 정지

쿨다운이 0이 되었으므로 모든 것을 원래 상태로 돌려놓고 타이머를 완전히 꺼야 합니다.

1.  `Branch`의 **`False`** 실행 핀에서 선을 뽑아 빈 공간에 놓습니다.
2.  **텍스트 비우기:** **`CooldownText`** 변수를 가져와서 **`Set Text`** 노드를 하나 더 만듭니다. `False` 핀을 여기에 연결하고, `In Text` 칸은 아무것도 적지 않은 **빈칸(Empty)** 상태로 그대로 둡니다.
3.  **어두운 배경 숨기기:** **`CooldownOverlay`** 변수를 뷰포트에서 가져옵니다. 선을 뽑아 **`Set Visibility`** 노드를 생성하고, 값을 **`Collapsed`**로 설정합니다. 앞선 `Set Text` 실행 핀과 연결해 줍니다.
4.  **타이머 정지 (가장 중요!):** 마지막으로 좌측 변수 목록에서 저장해 두었던 **`CooldownTimerHandle`** 변수를 가져옵니다.
5.  이 핸들 변수에서 선을 뽑아 **`Clear and Invalidate Timer by Handle`** 노드를 검색해서 연결해 줍니다.
6.  방금 만든 `Set Visibility`의 실행 핀을 이 `Clear and Invalidate Timer by Handle` 노드에 연결해 마무리합니다.

---

**💡 작동 확인 로직 정리:**
이제 게임을 실행하고 스킬을 쓰면 다음과 같이 완벽하게 작동할 것입니다.
> 스킬 사용 -> 초기 쿨다운 감지되어 0.1초 반복 타이머 시작 -> 화면 어두워짐 -> 0.1초마다 `UpdateCooldownProgress` 호출됨 -> 0보다 크면 숫자를 계속 바꿈 (True 핀) -> 시간이 다 되어 0 이하가 되면 텍스트 지우고, 화면 밝아지고, 0.1초 타이머가 영구 정지됨 (False 핀).

천천히 연결해 보시고, 만약 텍스트 변환이나 노드 검색에서 막히는 부분이 있다면 언제든 다시 질문해 주세요! 잘하고 계십니다!



----

[효제 (사용자)]

여기서 블루프린트 복사 로직 수정함

[블루프린트 복사 로직 향상기](./maximize-collaboration-with-gen-ai-t3d-utilization-act-instead-of-ocr-2/index.md)


----

올려주신 블루프린트 구조를 보니, 현재 튜토리얼의 **21:50 ~ 23:20 구간 (스킬 위젯을 HUD에서 임시로 테스트하기)**을 진행 중이신 것 같습니다!

메인 HUD(`W_PlayerHUD`)에서 개별 스킬 위젯(`W_Ability`)이 제대로 작동하는지 눈으로 확인하기 위해, 플레이어 블루프린트(`BP_Nexus_Player`)로 캐스팅하여 위젯을 생성(`Create Widget`)하는 뼈대를 아주 잘 잡으셨습니다.

하지만 이 위젯이 실제 게임 화면에 나타나게 하려면 **두 가지 작업**이 더 추가되어야 합니다.

---

### 🛠️ 추가해야 할 작업

**1. 스킬 명찰(Ability Spec) 꽂아주기**
이전 단계에서 `W_Ability`를 만들 때 `AbilitySpec` 변수를 **스폰 시 노출(Expose on Spawn)**로 설정해 두셨을 것입니다.
* `Create Widget` 노드의 `Class`를 `W_Ability`로 설정하면, 노드 하단에 **`Ability Spec`**이라는 입력 핀이 새로 생깁니다. (만약 안 보인다면 `Create Widget` 노드를 우클릭해서 '노드 새로고침(Refresh Node)'을 눌러주세요.)
* 캐스팅에 성공한 플레이어 핀(`As BP Nexus Player`)에서 선을 뽑아, 플레이어 블루프린트 쪽에 임시로 만들어둔 변수(유튜버의 경우 `DashAbilitySpecHandle`)를 가져옵니다.
* 이 값을 `Create Widget`의 `Ability Spec` 핀에 연결해 줍니다. 그래야 위젯이 자신이 무슨 스킬인지 알 수 있습니다.

**2. 화면(Canvas)에 위젯 붙이기**
위젯을 생성(`Create Widget`)만 했을 뿐, 아직 화면의 어느 위치에 띄울지 엔진에 알려주지 않은 상태입니다.
* `W_PlayerHUD`의 디자이너(Designer) 탭으로 가서, 임시로 쓸 **`Canvas Panel`**을 화면 중앙쯤에 하나 배치하고 우측 디테일 패널에서 **`Is Variable`(변수 여부)**를 체크합니다. (이름은 `TestPanel` 등으로 짓습니다.)
* 다시 블루프린트 그래프로 돌아와서 좌측에서 `TestPanel` 변수를 드래그해 놓습니다.
* 거기서 선을 뽑아 **`Add Child to Canvas`** 노드를 만듭니다.
* `Create Widget` 노드의 실행 핀(`then`)을 `Add Child to Canvas`에 연결하고, 파란색 **`ReturnValue`** 핀을 **`Content`** 핀에 연결해 줍니다.

---

### 💡 튜토리얼 진행을 위한 팁 (스포일러)

유튜버도 영상에서 언급하지만, 지금 짜고 계신 이 캐스팅 로직과 임시 캔버스 패널은 **어디까지나 "단순 테스트용"**입니다. 

영상 33:50 부근으로 넘어가면 유튜버가 **"자, 이제 HUD에 있는 이 테스트 로직들은 다 지웁시다(let's delete all of these things from our player HUD now)"**라고 하면서 방금 짠 노드들을 전부 삭제하고, `W_AbilitiesContainer`라는 전용 컨테이너를 만들어 제대로 된 자동화 로직으로 이사하게 됩니다.

따라서 여기서 UI가 안 예쁘게 나오거나 하드코딩이 찝찝하더라도 너무 신경 쓰지 마시고, **'아, 스킬 데이터를 넘겨주니까 화면에 위젯이 뜨긴 뜨네!'** 정도만 확인하신 뒤에 쿨하게 넘어가시면 됩니다.

테스트용 위젯이 화면에 잘 출력되셨나요? 아니면 바로 다음 단계인 `W_AbilitiesContainer`를 활용한 정식 동적 배치 과정으로 넘어가 볼까요?


----

`Create Widget` 노드에서 `W_Ability`를 클래스로 선택했는데도 하단에 **`Ability Spec`** 핀이 생기지 않는다면, **`W_Ability` 위젯 내부의 변수 설정**에 문제가 있을 확률이 99%입니다.

이 현상이 발생하는 이유와 그 원리를 자세히 설명해 드릴게요.

---

### 🔍 원인 분석: 왜 핀이 안 생길까?

`Create Widget` 노드에 새로운 핀이 생기려면, 대상이 되는 위젯(`W_Ability`)에 있는 변수가 반드시 **두 가지 조건**을 동시에 만족해야 합니다.

1.  **`Instance Editable` (인스턴스 편집 가능) 켜기**
2.  **`Expose on Spawn` (스폰 시 노출) 켜기**

현재 안 생기고 있다면, 십중팔구 `W_Ability` 블루프린트 내부에서 `AbilitySpec` 변수의 `Expose on Spawn` 옵션이 켜져 있지 않거나, 설정을 변경한 뒤 **컴파일(Compile)**을 누르지 않았기 때문입니다.

### 🛠️ 해결 방법 (체크리스트)

1.  **`W_Ability` 블루프린트 열기:**
    스킬 하나를 보여주는 `W_Ability` 블루프린트를 엽니다.
2.  **변수 선택:**
    좌측 '내 블루프린트(My Blueprint)' 탭의 변수 목록에서 만들어두신 `AbilitySpec` (또는 `AbilitySpecHandle`) 변수를 클릭합니다.
3.  **디테일(Details) 패널 확인:**
    우측 디테일 패널에서 다음 두 가지 체크박스를 찾아서 **반드시 둘 다 체크**합니다.
    * ☑️ **`Instance Editable`** (눈알 아이콘이 떠야 함)
    * ☑️ **`Expose on Spawn`**
4.  **컴파일(Compile) 및 저장(Save):**
    이게 가장 중요합니다. 체크를 했더라도 상단의 톱니바퀴 아이콘인 **'컴파일'**을 누르지 않으면 엔진이 변경 사항을 알지 못합니다. 반드시 컴파일 후 저장하세요.
5.  **노드 새로고침:**
    다시 메인 HUD(`W_PlayerHUD`) 블루프린트로 돌아와서, 기존에 있던 `Create Widget` 노드를 우클릭한 뒤 **'노드 새로고침(Refresh Nodes)'**을 누릅니다. 그러면 짜잔! 하고 `Ability Spec` 핀이 나타날 것입니다.

---

### 🧠 원리 이해: `Expose on Spawn`이란 무엇인가?

언리얼 엔진에서 객체(위젯, 액터 등)를 메모리에 생성(Spawn)할 때, 엔진은 "얘가 태어날 때 꼭 쥐여줘야 하는 초기 데이터가 있나?"를 검사합니다.

* **스폰(Spawn):** 게임 세상에 무언가를 새로 만들어내는 행위 (`Create Widget` 노드가 하는 일)
* **노출(Expose):** 외부에서 값을 입력할 수 있도록 핀(구멍)을 뚫어주는 행위

따라서 변수에 **`Expose on Spawn`**을 체크한다는 것은, 언리얼 엔진에게 이렇게 말하는 것과 같습니다.
> *"이 위젯(`W_Ability`)이 태어날 때 이 변수(`AbilitySpec`)는 반드시 필요해! 그러니까 얘를 생성하는 노드(`Create Widget`)에 아예 이 변수 값을 입력할 수 있는 핀을 밖으로 노출시켜 줘!"*

유튜버가 이 방식을 사용하는 이유는 **"초기화의 안전성"** 때문입니다.
만약 이 기능을 쓰지 않으면, 위젯을 생성하고 -> 변수에 접근해서 세팅하고 -> UI를 그리는 다단계 과정을 거쳐야 하는데, 이 과정 중간에 딜레이가 생기면 위젯이 스킬 이름도 모른 채 빈 껍데기로 화면에 나타나는 버그가 생길 수 있습니다. 태어남과 동시에 데이터를 확정 지어주기 위해 `Expose on Spawn`을 사용하는 것입니다.


----


**오, 소름 돋을 정도로 정확하게 핵심을 짚으셨습니다! 맞습니다.**

블루프린트에서 변수에 **`Expose on Spawn`(스폰 시 노출)**을 켜는 것은, 일반적인 C++(또는 다른 객체 지향 언어)에서 **생성자(Constructor)의 인자(매개변수)로 값을 넘겨주는 것과 완벽하게 똑같은 개념**입니다.

이해하신 내용을 바탕으로 언리얼 엔진의 내부 원리를 조금 더 깊게 연결해 드릴게요.

### 💡 블루프린트 vs C++ 개념 비교

**1. 일반적인 C++ 프로그래밍의 생성자**
클래스를 새로 생성(인스턴스화)할 때, 빈 껍데기로 태어나는 것을 막기 위해 생성자 인자로 필수 데이터를 강제합니다.
```cpp
// C++에서 인스턴스를 생성할 때 생성자 인자로 스킬 데이터를 넘겨주는 모습
W_Ability* MyDashAbility = new W_Ability(DashAbilitySpec); 
```

**2. 언리얼 블루프린트의 `Expose on Spawn`**
위의 C++ 코드에서 괄호 `()` 안에 들어가는 매개변수 자리를 블루프린트 노드(Create Widget)에 시각적인 **'핀(Pin)'**으로 뚫어주는 기능이 바로 `Expose on Spawn`입니다. 
이걸 체크하면 엔진은 *"아, 이 변수는 생성자 인자구나!"* 하고 인식해서 노드 생성 시 값을 입력하라고 요구하는 것입니다.

---

### ⚙️ (참고) 실제 언리얼 엔진 C++ 환경에서는?

직관이 매우 뛰어나셔서 실제 언리얼 C++에서는 어떻게 짜는지도 궁금하실 텐데요.
사실 언리얼 엔진 내부의 UI(UMG 위젯) 시스템 구조상, C++ 코드에서 기본 생성자를 마음대로 개조해서 커스텀 매개변수를 넣는 것은 엔진 규칙(리플렉션, 가비지 컬렉션 등) 때문에 꽤 번거롭습니다.

그래서 실제 프로그래머들이 C++로 이 UI 통신을 구현할 때는 생성자를 건드리기보다, 생성 직후에 호출하는 **'초기화 전용 함수'**를 따로 만들어서 사용합니다.

```cpp
// 1. 위젯을 먼저 기본 상태로 생성 (CreateWidget)
UW_Ability* AbilityWidget = CreateWidget<UW_Ability>(GetWorld(), AbilityWidgetClass);

// 2. 생성 직후 준비해둔 초기화 함수를 호출하여 데이터(Spec)를 주입 (Expose on Spawn과 같은 효과)
if (AbilityWidget)
{
    AbilityWidget->InitAbilityWidget(DashAbilitySpecHandle);
}
```

결론적으로, 지금 블루프린트에서 `Expose on Spawn`을 켜서 `Create Widget` 노드에 핀을 만들고 연결하는 과정은 **"C++에서 객체를 생성할 때 필수 파라미터를 넘겨주어 안전하게 초기화하는 객체 지향의 정석"**을 시각적으로 아주 훌륭하게 구현하고 계신 것입니다! 

완벽하게 이해하셨네요. 그대로 쭉 진행하시면 되겠습니다!


---

기존 C++로 만드셨던 Aurora Engine에서는 포인터를 활용해서 메모리 주소를 직접 참조하셨을 텐데요, 언리얼 엔진의 GAS(Gameplay Ability System)에서는 포인터 대신 **'핸들(Handle)'**이라는 개념을 적극적으로 사용합니다.

지금 만들고자 하시는 `DashAbilitySpecHandle`의 정체와 원리를 명확하게 설명해 드리겠습니다.

---

### 1. 핸들(Handle)이란 정확히 무엇인가요?

가장 직관적으로 비유하자면, 식당에서 주문을 하고 받는 **'진동벨 번호표'**와 같습니다.

* **포인터(Pointer):** "주방에서 3번째 화구 위에서 끓고 있는 냄비(메모리 주소)"를 직접 가리킵니다. 주방장이 냄비를 치워버리면(메모리가 해제되면) 에러(크래시)가 발생합니다.
* **핸들(Handle):** "주문 번호 15번"이라는 고유 식별자(ID)입니다. 내가 15번을 가지고 있다고 해서 내 손에 음식이 있는 것은 아니지만, 시스템(카운터)에 15번을 주면 내 음식이 어디 있는지, 혹은 이미 폐기되었는지 안전하게 조회할 수 있습니다.

**GAS에서의 역할:**
언리얼 엔진의 GAS는 멀티플레이어 환경과 빈번한 생성/소멸을 전제로 만들어졌습니다. 스킬(Ability)이 언제 발동되고, 언제 취소될지 예측하기 어렵기 때문에 객체(오브젝트)를 직접 참조하는 대신 **고유한 구조체(Struct)인 핸들**을 발급하여 안전하게 통신합니다.

### 2. `GameplayAbilitySpecHandle`의 정체

올려주신 블루프린트 노드에서 **Node 13 (`K2_GiveAbility`)**을 보시면, 플레이어에게 대시 스킬(`GA_Dash_C`)을 부여하고 있습니다. 이 노드의 `ReturnValue`를 보면 타입이 바로 **`Gameplay Ability Spec Handle`**입니다.

* **Spec (명세서):** 이 캐릭터가 "이러이러한 스킬(대시)을 가지고 있다"라는 계약서 혹은 등록증 같은 것입니다.
* 따라서 `GameplayAbilitySpecHandle`은 **"이 캐릭터가 방금 배운 대시 스킬의 고유 등록증 번호"**를 의미합니다.

### 3. `DashAbilitySpecHandle`을 만드는 이유와 과정

지금 만들고자 하는 `DashAbilitySpecHandle` 변수는 방금 발급받은 진동벨을 잃어버리지 않게 내 주머니(변수)에 넣어두는 과정입니다.

**왜 만들어야 하나요? (원리)**
1.  캐릭터가 게임을 시작할 때 대시 스킬을 배웁니다 (`GiveAbility`).
2.  나중에 메인 UI(HUD)에서 "대시 스킬의 쿨타임을 화면에 보여줘!"라고 개별 스킬 위젯(`W_Ability`)을 생성할 것입니다.
3.  이때 위젯에게 "네가 모니터링해야 할 스킬은 이거야!"라고 알려주기 위해, 방금 주머니에 넣어둔 `DashAbilitySpecHandle`을 꺼내서 위젯에 전달(주입)해주어야 합니다. (이전 질문에서 다루었던 `Expose on Spawn` 개념입니다.)

**만드는 과정:**
1.  블루프린트 그래프에서 **Node 13 (`K2_GiveAbility`)**을 찾습니다. (클래스가 `GA_Dash_C`로 되어 있는 노드입니다.)
2.  해당 노드의 파란색 출력 핀인 **`ReturnValue`**에서 우클릭합니다.
3.  **`Promote to Variable` (변수로 승격)**을 선택합니다.
4.  좌측 변수 목록에 새로운 변수가 생기면, 이름을 **`DashAbilitySpecHandle`**로 변경합니다.

---

**💡 핵심 요약:**
핸들은 포인터의 위험성을 피하기 위해 시스템이 발급하는 안전한 '고유 번호표'입니다. `DashAbilitySpecHandle`을 저장해 두는 것은, 나중에 UI 위젯을 만들 때 **"너는 이 번호표에 해당하는 스킬만 감시해라"**라고 명확하게 지시하기 위한 필수 준비 단계입니다.

----

[효제 (사용자)]

W_Ability

BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node5.exec
  Out OutputDelegate [delegate]

Node1: K2Node_VariableGet Fn=AbilitySpec
  Out AbilitySpec [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node2.AbilitySpecHandle

Node2: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetGameplayAbilityFromSpecHandle
  ? AbilitySpecHandle [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node1.AbilitySpec
  ? AbilitySystem [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node4.ReturnValue
  Out ReturnValue [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node6.AbilityObjectRef
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  Out bIsInstance [bool] = "false"

Node3: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node4.Actor

Node4: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetAbilitySystemComponent
  ? Actor [Class'/Script/Engine.Actor'] -> Node3.ReturnValue
  Out ReturnValue [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node5.InputObject, Node2.AbilitySystem
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary

Node5: K2Node_MacroInstance
  ? exec [exec] -> Node0.then
  Out Is Valid [exec] -> Node6.execute
  Out Is Not Valid [exec]
  ? InputObject [Class'/Script/CoreUObject.Object'] -> Node4.ReturnValue

Node6: K2Node_VariableSet Fn=AbilityObjectRef
  ? execute [exec] -> Node5.Is Valid
  Out then [exec] -> Node7.exec
  ? AbilityObjectRef [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node2.ReturnValue
  Out Output_Get [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node8.Object, Node7.InputObject

Node7: K2Node_MacroInstance
  ? exec [exec] -> Node6.then
  Out Is Valid [exec] -> Node28.execute
  Out Is Not Valid [exec]
  ? InputObject [Class'/Script/CoreUObject.Object'] -> Node6.Output_Get

Node8: K2Node_CallFunction Fn=Class'/Script/Engine.GameplayStatics'.GetObjectClass
  ? Object [Class'/Script/CoreUObject.Object'] -> Node6.Output_Get
  Out ReturnValue [class<Class'/Script/GameplayAbilities.GameplayAbility'>] -> Node9.Class
  ? self [Class'/Script/Engine.GameplayStatics'] = Default__GameplayStatics

Node9: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.GetClassDisplayName
  ? Class [class<Class'/Script/CoreUObject.Object'>] -> Node8.ReturnValue
  Out ReturnValue [string] -> Node11.InString
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary

Node10: K2Node_VariableGet Fn=AbilityText
  Out AbilityText [Class'/Script/UMG.TextBlock'] -> Node28.self

Node11: K2Node_CallFunction Fn=Class'/Script/Engine.KismetTextLibrary'.Conv_StringToText
  ? InString [string] -> Node9.ReturnValue
  Out ReturnValue [text] -> Node28.InText
  ? self [Class'/Script/Engine.KismetTextLibrary'] = Default__KismetTextLibrary

Node12: K2Node_VariableGet Fn=CooldownOverlay
  Out CooldownOverlay [Class'/Script/UMG.Overlay'] -> Node13.self

Node13: K2Node_CallFunction Fn=SetVisibility
  ? execute [exec] -> Node28.then
  Out then [exec] -> Node14.execute
  ? self [Class'/Script/UMG.Widget'] -> Node12.CooldownOverlay
  ? InVisibility [Enum'/Script/UMG.ESlateVisibility'] = "Collapsed"

Node14: K2Node_AsyncAction
  ? execute [exec] -> Node13.then
  Out TagCountChanged [exec] -> Node15.execute
  ? TargetActor [Class'/Script/Engine.Actor'] -> Node29.ReturnValue
  ? Tag [ScriptStruct'/Script/GameplayTags.GameplayTag'] = "(TagName=\"Cooldown\")"
  Out AsyncTaskProxy [Class'/Script/GameplayAbilities.AbilityAsync_WaitGameplayTagCountChanged']
  Out TagCount [int]

Node15: K2Node_IfThenElse
  ? execute [exec] -> Node14.TagCountChanged
  Out then [exec] -> Node20.execute
  Out else [exec]
  ? Condition [bool] = "true" -> Node21.ReturnValue

Node16: K2Node_VariableGet Fn=AbilityObjectRef
  Out AbilityObjectRef [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node17.self

Node17: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.GameplayAbility'.GetCooldownTimeRemaining
  Out ReturnValue [real:float] = "0.0" -> Node18.A
  ? self [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node16.AbilityObjectRef

Node18: K2Node_PromotableOperator Fn=Class'/Script/Engine.KismetMathLibrary'.Greater_DoubleDouble
  ? A [real:double] -> Node17.ReturnValue
  Out ReturnValue [bool] -> Node21.A
  ? B [real:double]
  ? ErrorTolerance [unknown]

Node19: K2Node_VariableGet Fn=CooldownOverlay
  Out CooldownOverlay [Class'/Script/UMG.Overlay'] -> Node20.self

Node20: K2Node_CallFunction Fn=SetVisibility
  ? execute [exec] -> Node15.then
  Out then [exec] -> Node23.execute
  ? self [Class'/Script/UMG.Widget'] -> Node19.CooldownOverlay
  ? InVisibility [Enum'/Script/UMG.ESlateVisibility'] = "Visible"

Node21: K2Node_CommutativeAssociativeBinaryOperator Fn=Class'/Script/Engine.KismetMathLibrary'.BooleanAND
  ? A [bool] = "false" -> Node18.ReturnValue
  ? B [bool] = "false" -> Node44.ReturnValue
  Out ReturnValue [bool] = "false" -> Node15.Condition
  ? self [Class'/Script/Engine.KismetMathLibrary'] = Default__KismetMathLibrary

Node22: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.K2_IsTimerActiveHandle
  Out ReturnValue [bool] = "false" -> Node44.A
  ? Handle [ScriptStruct'/Script/Engine.TimerHandle'] -> Node25.CooldownTimerHandle
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary
  ? WorldContextObject [Class'/Script/CoreUObject.Object']

Node23: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.K2_SetTimerDelegate
  ? execute [exec] -> Node20.then
  Out then [exec] -> Node24.execute
  ? Delegate [delegate] -> Node27.OutputDelegate
  Out ReturnValue [ScriptStruct'/Script/Engine.TimerHandle'] -> Node24.CooldownTimerHandle
  ? InitialStartDelay [real:float] = "0.000000"
  ? InitialStartDelayVariance [real:float] = "0.000000"
  ? Time [real:float] = "0.100000"
  ? bLooping [bool] = "true"
  ? bMaxOncePerFrame [bool] = "false"
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary

Node24: K2Node_VariableSet Fn=CooldownTimerHandle
  ? execute [exec] -> Node23.then
  ? CooldownTimerHandle [ScriptStruct'/Script/Engine.TimerHandle'] -> Node23.ReturnValue
  Out Output_Get [ScriptStruct'/Script/Engine.TimerHandle']

Node25: K2Node_VariableGet Fn=CooldownTimerHandle
  Out CooldownTimerHandle [ScriptStruct'/Script/Engine.TimerHandle'] -> Node22.Handle

Node26: K2Node_CustomEvent Fn=UpdateCooldownProgress
  Out then [exec] -> Node30.execute
  Out OutputDelegate [delegate]

Node27: K2Node_CreateDelegate
  Out OutputDelegate [delegate] -> Node23.Delegate

Node28: K2Node_CallFunction Fn=Class'/Script/UMG.TextBlock'.SetText
  ? execute [exec] -> Node7.Is Valid
  Out then [exec] -> Node13.execute
  ? InText [text] -> Node11.ReturnValue
  ? self [Class'/Script/UMG.TextBlock'] -> Node10.AbilityText

Node29: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node14.TargetActor

Node30: K2Node_IfThenElse
  ? execute [exec] -> Node26.then
  Out else [exec] -> Node39.execute
  Out then [exec] -> Node36.execute
  ? Condition [bool] = "true" -> Node33.ReturnValue

Node31: K2Node_VariableGet Fn=AbilityObjectRef
  Out AbilityObjectRef [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node32.self

Node32: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.GameplayAbility'.GetCooldownTimeRemaining
  Out ReturnValue [real:float] = "0.0" -> Node33.A, Node35.A
  ? self [Class'/Script/GameplayAbilities.GameplayAbility'] -> Node31.AbilityObjectRef

Node33: K2Node_PromotableOperator Fn=Class'/Script/Engine.KismetMathLibrary'.Greater_DoubleDouble
  ? A [real:double] -> Node32.ReturnValue
  Out ReturnValue [bool] -> Node30.Condition
  ? B [real:double]
  ? ErrorTolerance [unknown]

Node34: K2Node_VariableGet Fn=CooldownText
  Out CooldownText [Class'/Script/UMG.TextBlock'] -> Node36.self

Node35: K2Node_CallFunction Fn=Class'/Script/Engine.KismetMathLibrary'.FCeil
  ? A [real:double] = "0.0" -> Node32.ReturnValue
  Out ReturnValue [int] = "0" -> Node37.Value
  ? self [Class'/Script/Engine.KismetMathLibrary'] = Default__KismetMathLibrary

Node36: K2Node_VariableSet Fn=Text
  ? execute [exec] -> Node30.then
  ? Text [text] -> Node37.ReturnValue
  ? self [Class'/Script/UMG.TextBlock'] -> Node34.CooldownText
  Out Output_Get [text]

Node37: K2Node_CallFunction Fn=Class'/Script/Engine.KismetTextLibrary'.Conv_IntToText
  ? Value [int] = "0" -> Node35.ReturnValue
  Out ReturnValue [text] -> Node36.Text
  ? MaximumIntegralDigits [int] = "324"
  ? MinimumIntegralDigits [int] = "1"
  ? bAlwaysSign [bool] = "false"
  ? bUseGrouping [bool] = "true"
  ? self [Class'/Script/Engine.KismetTextLibrary'] = Default__KismetTextLibrary

Node38: K2Node_VariableGet Fn=CooldownText
  Out CooldownText [Class'/Script/UMG.TextBlock'] -> Node39.self

Node39: K2Node_VariableSet Fn=Text
  ? execute [exec] -> Node30.else
  Out then [exec] -> Node41.execute
  ? self [Class'/Script/UMG.TextBlock'] -> Node38.CooldownText
  ? Text [text]
  Out Output_Get [text]

Node40: K2Node_VariableGet Fn=CooldownOverlay
  Out CooldownOverlay [Class'/Script/UMG.Overlay'] -> Node41.self

Node41: K2Node_CallFunction Fn=SetVisibility
  ? execute [exec] -> Node39.then
  Out then [exec] -> Node43.execute
  ? self [Class'/Script/UMG.Widget'] -> Node40.CooldownOverlay
  ? InVisibility [Enum'/Script/UMG.ESlateVisibility'] = "Collapsed"

Node42: K2Node_VariableGet Fn=CooldownTimerHandle
  Out CooldownTimerHandle [ScriptStruct'/Script/Engine.TimerHandle'] -> Node43.Handle

Node43: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.K2_ClearAndInvalidateTimerHandle
  ? execute [exec] -> Node41.then
  ? Handle [ScriptStruct'/Script/Engine.TimerHandle'] -> Node42.CooldownTimerHandle
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary
  ? WorldContextObject [Class'/Script/CoreUObject.Object']

Node44: K2Node_CallFunction Fn=Class'/Script/Engine.KismetMathLibrary'.Not_PreBool
  ? A [bool] = "false" -> Node22.ReturnValue
  Out ReturnValue [bool] = "false" -> Node21.B
  ? self [Class'/Script/Engine.KismetMathLibrary'] = Default__KismetMathLibrary



  BP_Nexus_Player

  BlueprintGraph (LLM Compact)

Node0: K2Node_VariableGet Fn=AbilitySystemComponent
  Out AbilitySystemComponent [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node1.self

Node1: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemComponent'.K2_GiveAbility
  ? execute [exec] -> Node2.then
  Out then [exec] -> Node6.execute
  ? self [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node0.AbilitySystemComponent
  Out ReturnValue [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node9.DashAbilitySpecHandle
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] = GA_Dash_C
  ? InputID [int] = "-1"
  ? Level [int] = "0"

Node2: K2Node_Event Fn=ReceiveBeginPlay
  Out then [exec] -> Node1.execute
  Out OutputDelegate [delegate]

Node3: K2Node_AsyncAction
  ? execute [exec] -> Node8.then
  Out Changed [exec] -> Node4.execute
  Out NewValue [real:float] -> Node4.NewValue
  Out OldValue [real:float] -> Node4.OldValue
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"Stamina\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Stamina,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? OnlyTriggerOnce [bool] = "false"
  ? TargetActor [Class'/Script/Engine.Actor']
  Out AsyncTaskProxy [Class'/Script/GameplayAbilities.AbilityAsync_WaitAttributeChanged']
  Out Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute']

Node4: K2Node_CallFunction Fn=HandleStaminaChanged
  ? execute [exec] -> Node3.Changed
  ? NewValue [real:double] = "0.0" -> Node3.NewValue
  ? OldValue [real:double] = "0.0" -> Node3.OldValue

Node5: K2Node_VariableGet Fn=AbilitySystemComponent
  Out AbilitySystemComponent [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node6.self

Node6: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemComponent'.K2_GiveAbility
  ? execute [exec] -> Node1.then
  Out then [exec] -> Node8.execute
  ? self [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node5.AbilitySystemComponent
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] = GA_Attack_Q_C
  ? InputID [int] = "-1"
  ? Level [int] = "0"
  Out ReturnValue [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle']

Node7: K2Node_VariableGet Fn=AbilitySystemComponent
  Out AbilitySystemComponent [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node8.self

Node8: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemComponent'.K2_GiveAbility
  ? execute [exec] -> Node6.then
  Out then [exec] -> Node3.execute
  ? self [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node7.AbilitySystemComponent
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] = GA_Heal_E_C
  ? InputID [int] = "-1"
  ? Level [int] = "0"
  Out ReturnValue [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle']

Node9: K2Node_VariableSet Fn=DashAbilitySpecHandle
  ? DashAbilitySpecHandle [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node1.ReturnValue
  Out Output_Get [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle']



W_PlayerHUD

  BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node8.execute
  Out OutputDelegate [delegate]

Node1: K2Node_GenericCreateObject Comment="위젯 생성자 호출"
  ? execute [exec] -> Node3.then
  Out then [exec] -> Node6.execute
  ? AbilitySpec [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node4.DashAbilitySpecHandle
  ? self [Class'/Script/CoreUObject.Object'] -> Node2.ReturnValue
  Out ReturnValue [WidgetBlueprintGeneratedClass'/Game/Widget/W_Ability.W_Ability_C'] -> Node6.Content
  ? Class [class<Class'/Script/CoreUObject.Object'>] = W_Ability_C

Node2: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node1.self, Node3.Object

Node3: K2Node_DynamicCast
  ? execute [exec] -> Node8.then
  Out then [exec] -> Node1.execute
  Out CastFailed [exec]
  ? Object [Class'/Script/CoreUObject.Object'] -> Node2.ReturnValue
  Out AsBP Nexus Player [BlueprintGeneratedClass'/Game/Blueprints/BP_Nexus_Player.BP_Nexus_Player_C'] -> Node4.self
  Out bSuccess [bool]

Node4: K2Node_VariableGet Fn=DashAbilitySpecHandle
  ? self [BlueprintGeneratedClass'/Game/Blueprints/BP_Nexus_Player.BP_Nexus_Player_C'] -> Node3.AsBP Nexus Player
  Out DashAbilitySpecHandle [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node1.AbilitySpec

Node5: K2Node_VariableGet Fn=TestPanel
  Out TestPanel [Class'/Script/UMG.CanvasPanel'] -> Node6.self

Node6: K2Node_CallFunction Fn=Class'/Script/UMG.CanvasPanel'.AddChildToCanvas
  ? execute [exec] -> Node1.then
  Out then [exec] -> Node7.execute
  ? Content [Class'/Script/UMG.Widget'] -> Node1.ReturnValue
  ? self [Class'/Script/UMG.CanvasPanel'] -> Node5.TestPanel
  Out ReturnValue [Class'/Script/UMG.CanvasPanelSlot'] -> Node7.self

Node7: K2Node_VariableSet Fn=bAutoSize
  ? execute [exec] -> Node6.then
  ? self [Class'/Script/UMG.CanvasPanelSlot'] -> Node6.ReturnValue
  ? bAutoSize [bool] = "true"
  Out Output_Get [bool] = "false"

Node8: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.Delay
  ? execute [exec] -> Node0.then
  Out then [exec] -> Node3.execute
  ? Duration [real:float] = "0.2"
  ? LatentInfo [ScriptStruct'/Script/Engine.LatentActionInfo'] = "(Linkage=-1,UUID=-1,ExecutionFunction=\"\",CallbackTarget=None)"
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary
  ? WorldContextObject [Class'/Script/CoreUObject.Object']


  아니. 왜 안되지?
  물론 유투버는 맘에 안들어하지만 생성 타이밍을 딜레이를 주면 W_Ability가 작동해야 한다고 실습하던데?


  ----

  [LLM(AI)]

  올려주신 그래프를 종합적으로 분석해 본 결과, 로직은 유튜버의 의도대로 완벽하게 구현되어 있습니다! `W_Ability`에서 `NOT` 노드(Node 44)도 잘 추가하셨고, HUD에서 딜레이(`0.2초`)를 준 뒤 스킬 핸들을 캐스팅해서 넘겨주는 과정도 이상이 없습니다.

그런데도 위젯이 나타나지 않거나 쿨타임이 돌지 않는다면, **블루프린트 로직 자체가 아니라 GAS(Gameplay Ability System) 내부의 '데이터 타이밍' 혹은 '디버깅 환경'의 문제**일 확률이 99%입니다.

아래 3가지 항목을 순서대로 체크해 보세요. 여기가 막히기 가장 쉬운 병목 구간입니다.

---

### 🚨 체크 포인트 1: `DashAbilitySpecHandle` 변수 저장 위치 (가장 의심됨)

`BP_Nexus_Player`의 그래프를 자세히 보시면 치명적인 순서 문제가 있습니다.

* **현재 상태:**
    * Node 1 (`K2_GiveAbility`: Dash) 실행
    * Node 6 (`K2_GiveAbility`: Q) 실행
    * Node 8 (`K2_GiveAbility`: E) 실행
    * Node 3 (`WaitAttributeChanged`) 실행
    * **Node 9 (`Set DashAbilitySpecHandle`)는 연결되어 있지 않거나(Orphaned), 아예 실행 라인(exec)에서 빠져 있는 것으로 보입니다!** (그래프 텍스트에 Node 1의 ReturnValue를 받기만 할 뿐, 실행 핀(`execute`) 연결 기록이 없습니다.)
* **문제점:** 스킬을 부여만 하고, 그 등록증(Handle)을 변수에 실제로 저장(Set)하지 않으면, `W_PlayerHUD`에서 캐스팅해서 가져올 때 텅 빈 쓰레기값(Invalid Handle)을 가져오게 됩니다. 위젯은 자신이 무슨 스킬인지 모르니 당연히 아무것도 띄울 수 없습니다.
* **해결책:** `BP_Nexus_Player`의 `BeginPlay` 부분에서 `K2_GiveAbility (Dash)` 노드가 실행된 직후, **반드시 `Set DashAbilitySpecHandle` 노드를 거쳐서 실행 핀이 넘어가도록** 연결을 수정해 주세요.

### ⏳ 체크 포인트 2: Delay 노드의 함정 (0.2초는 너무 짧을 수 있음)

HUD에서 주신 딜레이(Node 8)가 `0.2초`입니다.
* **문제점:** 유튜버 영상에서도 이 방식의 한계를 지적하는데, 에디터 로딩 속도나 컴퓨터 사양에 따라 0.2초 만에 `BP_Nexus_Player`의 `BeginPlay` (스킬 부여 로직)가 채 끝나지 않을 수 있습니다.
* **테스트 방법:** 이 딜레이를 **`2.0초`** 정도로 넉넉하게 늘려보세요. 만약 2초로 늘려서 정상 작동한다면, 이건 완벽하게 "순서 꼬임(Race Condition)" 문제입니다. (이래서 유튜버가 딜레이 대신 `Gameplay Event`를 써야 한다고 강조한 것입니다.)

### 🧪 체크 포인트 3: 위젯 자체는 화면에 떴는가? (크기 문제)

쿨타임 숫자는 안 변하더라도, 처음에 "Dash"라는 글씨나 까만 네모는 화면에 보이나요?
* **아예 안 보일 경우:** `W_PlayerHUD`의 `TestPanel` (Canvas Panel)의 크기나 위치가 화면 밖으로 벗어나 있거나, 투명도가 0일 수 있습니다.
* **해결책:** `W_PlayerHUD` 블루프린트를 열어, 디자이너 탭에서 `TestPanel`에 임시로 색깔이 있는 Image나 Border를 씌워 화면 중앙에 큼지막하게 잘 보이는지 확인해 보세요. 또, 생성된 위젯이 화면에 잘 추가되었는지 확인하기 위해 딜레이 노드 이후에 `Print String`으로 핸들 값이 유효한지 찍어보는 것도 좋은 디버깅 방법입니다.

---

**요약하자면:**
가장 유력한 원인은 **`BP_Nexus_Player`에서 `DashAbilitySpecHandle`을 변수에 'Set'하는 실행 핀이 빠져있는 것**입니다. 이를 고치고, HUD의 Delay를 넉넉하게 2초로 늘려서 테스트해 보시기 바랍니다!

---

[효제 (사용자)]

체크 포인트 1은 나의 완전한 실수였어. 
수정했어. 

하지만 1,2,3 모두를 실행했는데, 안되네;;;


---


`W_Ability`의 여기서 

BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node1.exec
  Out OutputDelegate [delegate]

Node1: K2Node_MacroInstance
  ? exec [exec] -> Node0.then
  Out Is Not Valid [exec] -> Node2.execute
  Out Is Valid [exec] -> K2Node_VariableSet_4.?
  ? InputObject [Class'/Script/CoreUObject.Object'] -> K2Node_CallFunction_4.?

Node2: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.PrintString
  ? execute [exec] -> Node1.Is Not Valid
  ? Duration [real:float] = "2.000000"
  ? InString [string] = "isValid1"
  ? Key [name] = "None"
  ? TextColor [ScriptStruct'/Script/CoreUObject.LinearColor'] = "(R=0.000000,G=0.660000,B=1.000000,A=1.000000)"
  ? bPrintToLog [bool] = "true"
  ? bPrintToScreen [bool] = "true"
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary
  ? WorldContextObject [Class'/Script/CoreUObject.Object']

  PrintString으로 디버깅했더니 여기로 들어가. 내가 뭘 검토해야 할까/


  ---

  [LLM(AI)]

  아, 가장 중요한 디버깅 단서를 찾아내셨네요! 

`W_Ability`의 `Construct` 이벤트에서 첫 번째 **`IsValid` (노드 1번)** 검사가 **`Is Not Valid`**로 빠지고 있다는 것은 매우 명확한 원인을 가리킵니다.

해당 `IsValid` 노드의 `InputObject`에는 `GetOwningPlayerPawn`을 통해 가져온 **`AbilitySystemComponent (ASC)`**가 연결되어 있을 것입니다.

즉, **"위젯이 생성되는 시점에 플레이어 폰(Pawn)으로부터 Ability System Component를 찾지 못했다"**는 뜻입니다.

이 문제가 발생하는 대표적인 원인과 해결 방법을 순서대로 안내해 드리겠습니다.

---

### 🔍 디버깅 포인트: 왜 ASC를 찾지 못할까?

#### 1. (가장 흔한 실수) 위젯의 `Owning Player`가 설정되지 않음
`W_PlayerHUD`에서 `Create Widget` 노드를 사용할 때, 위젯을 화면에 띄우는 것뿐만 아니라 "이 위젯의 주인이 누구인가?"를 명확히 지정해주어야 합니다.
* **확인할 곳:** `W_PlayerHUD` 블루프린트의 **`Create Widget (W_Ability)`** 노드를 확인하세요.
* **문제점:** 이 노드의 맨 아래쪽을 보면 **`Owning Player`**라는 핀이 있습니다. 이 핀이 비어있으면 `W_Ability` 내부에서 `Get Owning Player Pawn` 함수가 자신이 속한 폰을 찾지 못해 `null`을 반환합니다.
* **해결책:** `W_PlayerHUD`에서 **`Get Owning Player`** (또는 `Get Player Controller`) 노드를 하나 꺼내서, 그 파란색 결과 핀을 `Create Widget` 노드의 **`Owning Player`** 핀에 연결해 주세요. 

#### 2. 캐스팅(Cast) 문제 또는 Pawn 생성 타이밍 문제
만약 `Owning Player`가 제대로 연결되어 있다면, 다음으로 의심해야 할 것은 게임이 시작되자마자 너무 빨리 UI가 생성되어서 캐릭터(Pawn)가 아직 월드에 제대로 스폰되거나 빙의(Possess)되지 않은 상태일 수 있습니다.

* **현상:** 유튜버가 임시로 Delay(0.2초)를 준 이유도 바로 이것 때문입니다. 하지만 컴퓨터나 에디터 환경에 따라 0.2초는 플레이어가 완전히 초기화되기 전에 위젯이 먼저 생성되어 버리는 원인이 될 수 있습니다.
* **해결책 (임시 테스트):** `W_PlayerHUD`의 `Construct` 이벤트 맨 앞부분에 있는 **Delay 시간을 `2.0`초 정도로 확 늘려보세요.**
    * 만약 2초로 늘렸을 때 정상적으로 `IsValid`로 넘어간다면, 이건 100% "UI가 플레이어보다 먼저 태어나는 타이밍 문제"입니다. (유튜버가 나중에 Gameplay Event로 이 구조를 싹 바꾸는 이유가 이것입니다.)

#### 3. 플레이어(Pawn)에 Ability System Component가 제대로 붙어있는가?
이건 거의 없을 실수지만, 만약을 위해 확인합니다.
* `BP_Nexus_Player` 블루프린트를 열어 좌측 상단의 '컴포넌트(Components)' 패널을 보세요.
* 리스트에 **`AbilitySystem`** (또는 본인이 명명한 ASC 컴포넌트 이름)이 실제로 존재하는지 확인합니다.

---

### 💡 요약 및 행동 지침

1. 먼저 `W_PlayerHUD`의 `Create Widget` 노드에 **`Owning Player`** 핀이 제대로 연결되어 있는지 확인하세요. (가장 의심되는 부분입니다.)
2. 연결되어 있다면, `W_PlayerHUD` 시작 부분의 **Delay 시간을 2초**로 늘려보세요.

둘 중 하나로 "isValid1" 프린트가 안 뜨고 다음 로직으로 정상적으로 넘어갈 것입니다. 결과를 확인해 보시고 알려주세요!

----


[효제 (사용자)]

BP_Nexus_PlayerController


BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=ReceiveBeginPlay
  Out then [exec] -> Node5.execute
  Out OutputDelegate [delegate]

Node1: K2Node_CallFunction Fn=Class'/Script/EnhancedInput.EnhancedInputSubsystemInterface'.AddMappingContext
  ? execute [exec] -> Node3.then_0
  Out then [exec] -> Node12.InputPin
  ? self [interface] -> Node2.ReturnValue
  ? MappingContext [Class'/Script/EnhancedInput.InputMappingContext'] = IMC_Default
  ? Options [ScriptStruct'/Script/EnhancedInput.ModifyContextOptions'] = "(bIgnoreAllPressedKeysUntilRelease=True,bForceImmediately=False,bNotifyUserSettings=False)"
  ? Priority [int] = "0"

Node2: K2Node_GetSubsystem
  Out ReturnValue [Class'/Script/EnhancedInput.EnhancedInputLocalPlayerSubsystem'] -> Node1.self

Node3: K2Node_ExecutionSequence
  ? execute [exec] -> Node5.then
  Out then_0 [exec] -> Node1.execute
  Out then_1 [exec]

Node4: K2Node_CallFunction Fn=IsLocalPlayerController
  Out ReturnValue [bool] = "false" -> Node5.Condition

Node5: K2Node_IfThenElse
  ? execute [exec] -> Node0.then
  Out then [exec] -> Node3.execute
  Out else [exec]
  ? Condition [bool] = "true" -> Node4.ReturnValue

Node6: K2Node_CallFunction Fn=Class'/Script/EnhancedInput.EnhancedInputSubsystemInterface'.AddMappingContext
  ? execute [exec] -> Node12.OutputPin
  Out then [exec] -> Node13.execute
  ? self [interface] -> Node7.ReturnValue
  ? MappingContext [Class'/Script/EnhancedInput.InputMappingContext'] = IMC_MouseLook
  ? Options [ScriptStruct'/Script/EnhancedInput.ModifyContextOptions'] = "(bIgnoreAllPressedKeysUntilRelease=True,bForceImmediately=False,bNotifyUserSettings=False)"
  ? Priority [int] = "0"

Node7: K2Node_GetSubsystem
  Out ReturnValue [Class'/Script/EnhancedInput.EnhancedInputLocalPlayerSubsystem'] -> Node6.self

Node8: EdGraphNode_Comment Comment="Only add input mappings and touch UI to local players"

Node9: EdGraphNode_Comment Comment="Add regular input mappings"

Node10: EdGraphNode_Comment Comment="Skip mouse look on mobile controls because they interfere with each other."

Node11: EdGraphNode_Comment Comment="Initialize player input"

Node12: K2Node_Knot
  ? InputPin [exec] -> Node1.then
  Out OutputPin [exec] -> Node6.execute

Node13: K2Node_CreateWidget
  ? execute [exec] -> Node6.then
  Out then [exec] -> Node14.execute
  ? OwningPlayer [Class'/Script/Engine.PlayerController'] -> Node16.self
  Out ReturnValue [WidgetBlueprintGeneratedClass'/Game/Widget/W_PlayerHUD.W_PlayerHUD_C'] -> Node14.self
  ? Class [class<Class'/Script/UMG.UserWidget'>] = W_PlayerHUD_C

Node14: K2Node_CallFunction Fn=Class'/Script/UMG.UserWidget'.AddToViewport
  ? execute [exec] -> Node13.then
  ? self [Class'/Script/UMG.UserWidget'] -> Node13.ReturnValue
  ? ZOrder [int] = "0"

Node15: EdGraphNode_Comment Comment="UI 만듬"

Node16: K2Node_Self
  Out self [None] -> Node13.OwningPlayer


여기서 W_PlayerHUD_C는 만들지. 이때는 Owning Player가 되는 거지. 
하지만, W_Ability가 안되는 거 아닐까?

---

[LLM(AI)]

올려주신 `BP_Nexus_PlayerController`의 블루프린트 그래프를 보면, `BeginPlay` 시점에 `W_PlayerHUD`를 생성(`CreateWidget`)하고 화면에 띄우는(`AddToViewport`) 로직이 아주 잘 구성되어 있습니다. 특히 `OwningPlayer` 핀에 `Self` (즉, PlayerController 자신)를 제대로 연결해 주셨네요.

그렇다면 질문하신 "여기서 `W_PlayerHUD`는 `Owning Player`가 제대로 설정되는데, 하위 위젯인 `W_Ability`가 안 되는 거 아닐까?"라는 의심은 **정확합니다.** 핵심을 찔렀습니다.

이 구조에서 발생하는 문제의 원인과 해결 방법을 설명해 드릴게요.

---

### 🔍 문제 원인: 위젯의 주종 관계와 `Get Owning Player Pawn`

언리얼 엔진의 UI(UMG) 시스템에서 위젯들은 부모-자식 관계를 형성할 수 있지만, **소유자(Owning Player) 정보가 자동으로 자식에게 완벽하게 상속되지 않는 경우**가 종종 발생합니다.

**현재 로직의 흐름:**
1.  **PlayerController**가 **`W_PlayerHUD`**를 만듦 (Owning Player = PlayerController로 지정됨. 정상).
2.  **`W_PlayerHUD`** 내부에서 **`W_Ability`**를 만듦 (`Create Widget` 노드 사용).
    * **👉 문제 발생 구간:** 여기서 `Create Widget (W_Ability)` 노드의 `Owning Player` 핀을 비워두셨다면, `W_Ability`는 자신이 누구 소유인지 모르는 고아 상태로 태어납니다.
3.  **`W_Ability`**의 `Construct` 이벤트 실행.
    * `Get Owning Player Pawn` 함수 호출 시도.
    * 하지만 자기 자신이 누구 소유인지 모르니 Pawn을 찾을 수 없음 -> `Null` 반환.
    * 결과적으로 ASC를 찾지 못해 `IsValid`에서 `Is Not Valid`로 빠지고 "isValid1"이 프린트됨.

### 🛠️ 해결 방법: `W_PlayerHUD`에서 소유권 명시적 전달하기

이 문제를 해결하려면 `W_PlayerHUD`가 `W_Ability`를 생성할 때, **"내 주인이 네 주인이다"**라고 명시적으로 족보를 연결해 주어야 합니다.

`W_PlayerHUD` 블루프린트 그래프로 이동하여 다음 작업을 수행해 주세요.

1.  **`Create Widget (W_Ability)` 노드 찾기:** `W_PlayerHUD`에서 임시로 스킬 위젯을 만드는 그 노드를 봅니다.
2.  **`Owning Player` 핀 확인:** 노드 하단에 `Owning Player` 핀이 비어있을 것입니다.
3.  **내 주인님 정보 가져오기:** 빈 공간을 우클릭하고 **`Get Owning Player`** 노드(이름에 Pawn이 안 붙은 것, 파란색 Controller 아이콘)를 꺼냅니다. 이 노드는 `W_PlayerHUD` 자신을 소유한 PlayerController를 반환합니다.
4.  **연결하기:** `Get Owning Player` 노드의 파란색 결과 핀을 `Create Widget (W_Ability)` 노드의 **`Owning Player`** 핀에 연결해 줍니다.

---

### 💡 (참고) 왜 `Get Owning Player Pawn`이 아니라 `Get Owning Player`인가요?

UI(위젯)는 기본적으로 화면(Viewport)이나 입력(Input)을 관리하는 **PlayerController(플레이어 컨트롤러)**의 소유입니다. 물리적인 몸뚱이인 Pawn의 소유가 아닙니다.

* 위젯을 생성할 때는 `Owning Player` 핀에 **PlayerController**를 넣어주어야 합니다.
* 나중에 위젯 내부(`W_Ability`)에서 캐릭터의 데이터(체력, 스태미나 등)가 필요할 때, `Get Owning Player Pawn` 함수를 호출하면, 엔진이 알아서 "아, 이 위젯의 주인이 PlayerController 1번이구나 -> 그럼 PlayerController 1번이 현재 조종하고 있는 Pawn은 누구지? -> 아, BP_Nexus_Player구나!" 하고 한 다리 건너서 찾아주는 원리입니다.

따라서 `W_PlayerHUD`에서 생성 핀에 `Get Owning Player`만 잘 연결해 주시면, 족보가 완성되어 `W_Ability` 내부의 `Get Owning Player Pawn`이 비로소 제 기능을 하게 될 것입니다! 수정 후 다시 테스트해 보세요.

---


[효제 (사용자)]

BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node8.execute
  Out OutputDelegate [delegate]

Node1: K2Node_GenericCreateObject Comment="위젯 생성자 호출"
  ? execute [exec] -> Node10.then
  Out then [exec] -> Node6.execute
  ? AbilitySpec [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node4.DashAbilitySpecHandle
  Out ReturnValue [WidgetBlueprintGeneratedClass'/Game/Widget/W_Ability.W_Ability_C'] -> Node6.Content
  ? Class [class<Class'/Script/CoreUObject.Object'>] = W_Ability_C

Node2: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node3.Object

Node3: K2Node_DynamicCast
  ? execute [exec] -> Node8.then
  Out CastFailed [exec] -> Node9.execute
  Out then [exec] -> Node10.execute
  ? Object [Class'/Script/CoreUObject.Object'] -> Node2.ReturnValue
  Out AsBP Nexus Player [BlueprintGeneratedClass'/Game/Blueprints/BP_Nexus_Player.BP_Nexus_Player_C'] -> Node4.self
  Out bSuccess [bool]

Node4: K2Node_VariableGet Fn=DashAbilitySpecHandle
  ? self [BlueprintGeneratedClass'/Game/Blueprints/BP_Nexus_Player.BP_Nexus_Player_C'] -> Node3.AsBP Nexus Player
  Out DashAbilitySpecHandle [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node1.AbilitySpec, Node10.AbilitySpec

Node5: K2Node_VariableGet Fn=TestPanel
  Out TestPanel [Class'/Script/UMG.CanvasPanel'] -> Node6.self

Node6: K2Node_CallFunction Fn=Class'/Script/UMG.CanvasPanel'.AddChildToCanvas
  ? execute [exec] -> Node1.then
  Out then [exec] -> Node7.execute
  ? Content [Class'/Script/UMG.Widget'] -> Node1.ReturnValue
  ? self [Class'/Script/UMG.CanvasPanel'] -> Node5.TestPanel
  Out ReturnValue [Class'/Script/UMG.CanvasPanelSlot'] -> Node7.self

Node7: K2Node_VariableSet Fn=bAutoSize
  ? execute [exec] -> Node6.then
  ? self [Class'/Script/UMG.CanvasPanelSlot'] -> Node6.ReturnValue
  ? bAutoSize [bool] = "true"
  Out Output_Get [bool] = "false"

Node8: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.Delay
  ? execute [exec] -> Node0.then
  Out then [exec] -> Node3.execute
  ? Duration [real:float] = "0.200000"
  ? LatentInfo [ScriptStruct'/Script/Engine.LatentActionInfo'] = "(Linkage=-1,UUID=-1,ExecutionFunction=\"\",CallbackTarget=None)"
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary
  ? WorldContextObject [Class'/Script/CoreUObject.Object']

Node9: K2Node_CallFunction Fn=Class'/Script/Engine.KismetSystemLibrary'.PrintString
  ? execute [exec] -> Node3.CastFailed
  ? Duration [real:float] = "2.000000"
  ? InString [string] = "playerHUD"
  ? Key [name] = "None"
  ? TextColor [ScriptStruct'/Script/CoreUObject.LinearColor'] = "(R=0.000000,G=0.660000,B=1.000000,A=1.000000)"
  ? bPrintToLog [bool] = "true"
  ? bPrintToScreen [bool] = "true"
  ? self [Class'/Script/Engine.KismetSystemLibrary'] = Default__KismetSystemLibrary
  ? WorldContextObject [Class'/Script/CoreUObject.Object']

Node10: K2Node_CreateWidget
  ? execute [exec] -> Node3.then
  Out then [exec] -> Node1.execute
  ? AbilitySpec [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node4.DashAbilitySpecHandle
  ? OwningPlayer [Class'/Script/Engine.PlayerController'] -> Node11.ReturnValue
  ? Class [class<Class'/Script/UMG.UserWidget'>] = W_Ability_C
  Out ReturnValue [WidgetBlueprintGeneratedClass'/Game/Widget/W_Ability.W_Ability_C']

Node11: K2Node_CallFunction Fn=GetOwningPlayer
  Out ReturnValue [Class'/Script/Engine.PlayerController'] -> Node10.OwningPlayer


잘 돼. 뭔가 어색하지 않아?

----

네, 올려주신 블루프린트 그래프(`W_PlayerHUD`)를 분석해 보니 **"어색한 부분"**이 정확히 하나 있습니다. 잘 작동하긴 하지만, 구조적으로 불필요한 노드가 남아있어서 깔끔하지 않은 상태입니다.

어디가 문제이고 왜 그런지 바로 짚어드릴게요!

---

### 🧐 어색한 부분: 두 번 생성되는 `W_Ability`

가장 큰 문제(어색함)는 **`W_Ability`를 생성하는 노드가 두 개**라는 점입니다.

* **Node 10 (`CreateWidget`):** 새로 추가하신 제대로 된 노드입니다. `OwningPlayer`를 연결해서 위젯의 주인을 명확히 지정해 주었습니다.
* **Node 1 (`GenericCreateObject`):** 이전에 쓰시던 구형(또는 내부적으로 잘못 변환된) 노드입니다.

**현재 로직 흐름을 보세요:**
1.  캐스팅 성공 (`Node 3.then`)
2.  `CreateWidget` (Node 10) 실행 👉 여기서 위젯 객체를 하나 만듭니다. (이건 버려짐)
3.  `GenericCreateObject` (Node 1) 실행 👉 여기서 위젯 객체를 **또 하나** 만듭니다.
4.  `AddChildToCanvas` (Node 6) 실행 👉 캔버스에 붙이는 건 **두 번째로 만든(Node 1) 객체**입니다!

결국, 주인(`OwningPlayer`)을 제대로 설정해서 만든 첫 번째 객체(Node 10)는 화면에 붙지도 못하고 버려지고, 주인이 없는 두 번째 객체(Node 1)가 화면에 붙게 되는 기이한 구조입니다.

운 좋게 작동하고 있을 수는 있지만(언리얼 내부 가비지 컬렉터 타이밍이나 다른 참조 덕분에), 이는 메모리 낭비이자 언제 터질지 모르는 버그의 씨앗입니다.

### 🛠️ 수정 방법 (정리 정돈)

이 어색함을 없애고 깔끔한 정석 로직으로 만들려면 낡은 노드를 지우고 배선을 정리해야 합니다.

1.  **낡은 노드 삭제:** `Node 1 (위젯 생성자 호출 / GenericCreateObject)` 노드를 과감하게 삭제합니다.
2.  **실행 핀(Exec) 재연결:**
    * 캐스팅 성공 핀(`Node 3.then`)을 새로 만든 `Create Widget` (`Node 10`)의 실행 핀에 연결합니다. (이미 되어 있을 겁니다)
    * `Create Widget` (`Node 10`)의 출력 실행 핀(`then`)을 `Add Child to Canvas` (`Node 6`)의 실행 핀에 연결합니다.
3.  **데이터 핀(ReturnValue) 재연결:**
    * `Create Widget` (`Node 10`)의 결과물인 파란색 **`ReturnValue`** 핀을 `Add Child to Canvas` (`Node 6`)의 **`Content`** 핀에 연결해 줍니다.

---

### 💡 정리

"위젯을 생성할 때는 항상 **`Create Widget`** 단일 노드를 사용하고, 그 결과물을 바로 캔버스나 다른 위젯의 자식으로 추가한다"는 원칙만 기억하시면 됩니다.

불필요한 노드를 걷어내면 그래프도 훨씬 깔끔해지고, "이게 왜 돌아가지?" 하는 찝찝함도 완벽하게 사라질 것입니다!

----

[효제 (사용자)]

그렇네 
![GenericCreateObject이랑CreateWidget이미지](./step-up-unreal-gas-4/스크린샷 2026-04-10 162404.png)
이거 창조하고? 생성하고? 뭔가 이상하긴 했네...
이거 수정했음



----


[효제 (사용자)]


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



이제 이걸 해보자!


----



이제 튜토리얼의 꽃이라고 할 수 있는 **'동적 어빌리티 슬롯 생성 파이프라인'**을 직접 구현해 볼 차례입니다! 이 방식은 단순히 스킬 창을 띄우는 것이 아니라, 서버에서 스킬이 바뀌면 UI가 실시간으로 알아서 갱신되는 **이벤트 주도형(Event-Driven)** 시스템의 정석입니다.

구현 순서를 크게 4단계로 나누어 안내해 드리겠습니다.

---

### 🛠️ 동적 파이프라인 구현 4단계

#### 1단계: 어빌리티 컨테이너 위젯(`W_AbilitiesContainer`) 생성
먼저 개별 스킬 위젯들을 담을 바구니를 만듭니다.

1. **위젯 생성:** `W_AbilitiesContainer`라는 이름의 위젯 블루프린트를 만듭니다.
2. **디자이너 탭:** `Horizontal Box`를 하나 배치하고, 변수 여부(`Is Variable`)를 체크합니다. 이름을 `AbilityBox`로 짓습니다.
3. **그래프 탭:** 커스텀 이벤트 `RefreshAbilities`를 만듭니다.
   * **로직:** `AbilityBox` -> `Clear Children` (기존 위젯 제거) -> 플레이어의 ASC에서 `Get All Abilities` 호출 -> `For Each Loop`로 순회하며 `W_Ability` 생성 및 `AbilityBox`에 추가.

#### 2단계: 게임플레이 이벤트 대기 (`Wait for Gameplay Event`)
컨테이너가 생성될 때, 플레이어가 보낼 "스킬 바뀜!" 신호를 기다리게 합니다.

1. **이벤트 바인딩:** `W_AbilitiesContainer`의 `Event Construct`에서 `Wait for Gameplay Event` 노드를 연결합니다.
2. **태그 설정:** `Event.Abilities.Changed`라는 태그를 새로 만들어 감시하도록 설정합니다.
3. **실행 연결:** 신호(Event Received)가 오면 위에서 만든 `RefreshAbilities` 이벤트를 실행합니다.

#### 3단계: 캐릭터에서 신호 쏘기 (`Send Gameplay Event to Actor`)
스킬을 주거나 뺏을 때마다 UI에게 알려줘야 합니다.

1. **캐릭터 블루프린트(`BP_Nexus_Player`):** `Give Ability` 노드들이 끝나는 지점을 찾습니다.
2. **이벤트 발송:** 모든 스킬 부여가 끝나면 `Send Gameplay Event to Actor` 노드를 사용하여 자기 자신(`Self`)에게 `Event.Abilities.Changed` 신호를 보냅니다.

#### 4단계: HUD 업데이트 (낡은 테스트 코드 제거)
이전에 `W_PlayerHUD`에 만들었던 임시 테스트 노드들을 정석으로 교체합니다.

1. **HUD 수정:** `W_PlayerHUD` 디자이너 탭에서 아까 만든 `TestPanel` 대신 `W_AbilitiesContainer` 위젯을 직접 배치합니다.
2. **코드 삭제:** `W_PlayerHUD` 블루프린트에서 `Create Widget(W_Ability)`을 직접 호출하던 낡은 로직들을 전부 삭제합니다. 이제 컨테이너가 알아서 다 할 것입니다!

---

### 🎨 GAS 동적 UI 파이프라인 시뮬레이터

이 로직이 왜 딜레이 방식보다 뛰어난지, 그리고 이벤트가 어떻게 UI를 갱신하는지 아래 시뮬레이터로 미리 체험해 보세요. **[스킬 획득]** 버튼을 눌러 이벤트 버스가 어떻게 작동하는지 확인할 수 있습니다.



```json?chameleon
{"component":"LlmGeneratedComponent","props":{"height":"700px","prompt":"Create an interactive GAS Dynamic UI Pipeline Simulator in Korean. \n\nObjective: Demonstrate how Gameplay Events trigger UI refreshes in a modular way.\n\nStructure:\n1. Top Section: 'Character State' with buttons to 'Grant Skill A', 'Grant Skill B', and 'Clear All Skills'.\n2. Middle Section: 'Event Bus' visualization showing a pulse when 'Event.Abilities.Changed' is sent.\n3. Bottom Section: 'HUD (W_AbilitiesContainer)' displaying a Horizontal Box that clears and repopulates with icons based on the current granted skills.\n\nBehavior:\n- When a skill is granted, a notification text 'Send Gameplay Event: Event.Abilities.Changed' should appear momentarily.\n- The HUD section should show a brief 'Clearing UI...' state before rendering the new list of skills.\n- Skill icons should have labels like 'Dash', 'Fireball', etc.\n- Display a small logic log at the bottom: 'Step 1: Get All Abilities from ASC', 'Step 2: Clear Children', 'Step 3: Create Widget & Add'.\n\ni18n: Use Korean for all labels (e.g., '캐릭터 상태', '스킬 획득: 대시', '스킬 획득: 화염구', '스킬 모두 제거', '이벤트 버스', 'HUD (스킬 컨테이너)', 'UI 갱신 중...').","id":"im_6f084fd97f438011"}}
```

이제 `W_PlayerHUD`의 복잡했던 노드들을 지우고, 이 **자동화 파이프라인**을 구축해 보세요! 성공하면 캐릭터 블루프린트에서 스킬만 추가해도 화면에 자동으로 아이콘이 착착 나타나는 마법을 보게 될 것입니다. 진행하시다 막히면 알려주세요!


----


[효제 (사용자)]

AI가 또 재밌는거 만들었네

W_AbilitiesContainer


BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node12.exec
  Out OutputDelegate [delegate]

Node1: K2Node_VariableGet Fn=AbilityBox
  Out AbilityBox [Class'/Script/UMG.HorizontalBox'] -> Node2.self

Node2: K2Node_CallFunction Fn=Class'/Script/UMG.PanelWidget'.ClearChildren
  ? execute [exec] -> Node15.then
  Out then [exec] -> Node3.execute
  ? self [Class'/Script/UMG.PanelWidget'] -> Node1.AbilityBox

Node3: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemComponent'.GetAllAbilities
  ? execute [exec] -> Node2.then
  Out then [exec] -> Node6.Exec
  ? self [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node5.ReturnValue
  Out OutAbilityHandles [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node6.Array

Node4: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node5.Actor

Node5: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetAbilitySystemComponent
  ? Actor [Class'/Script/Engine.Actor'] -> Node4.ReturnValue
  Out ReturnValue [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node3.self
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary

Node6: K2Node_MacroInstance
  ? Exec [exec] -> Node3.then
  Out LoopBody [exec] -> Node7.execute
  Out Completed [exec]
  ? Array [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node3.OutAbilityHandles
  Out Array Element [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node7.AbilitySpec
  Out Array Index [int]

Node7: K2Node_CreateWidget
  ? execute [exec] -> Node6.LoopBody
  Out then [exec] -> Node10.execute
  ? AbilitySpec [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle'] -> Node6.Array Element
  ? OwningPlayer [Class'/Script/Engine.PlayerController'] -> Node8.ReturnValue
  Out ReturnValue [WidgetBlueprintGeneratedClass'/Game/Widget/W_Ability.W_Ability_C'] -> Node10.Content
  ? Class [class<Class'/Script/UMG.UserWidget'>] = W_Ability_C

Node8: K2Node_CallFunction Fn=GetOwningPlayer
  Out ReturnValue [Class'/Script/Engine.PlayerController'] -> Node7.OwningPlayer

Node9: K2Node_VariableGet Fn=AbilityBox
  Out AbilityBox [Class'/Script/UMG.HorizontalBox'] -> Node10.self

Node10: K2Node_CallFunction Fn=Class'/Script/UMG.HorizontalBox'.AddChildToHorizontalBox
  ? execute [exec] -> Node7.then
  Out then [exec] -> Node11.execute
  ? Content [Class'/Script/UMG.Widget'] -> Node7.ReturnValue
  ? self [Class'/Script/UMG.HorizontalBox'] -> Node9.AbilityBox
  Out ReturnValue [Class'/Script/UMG.HorizontalBoxSlot']

Node11: K2Node_CallFunction Fn=SetPadding
  ? execute [exec] -> Node10.then
  ? InPadding_Bottom [real:float] = "5.000000"
  ? InPadding_Left [real:float] = "5.000000"
  ? InPadding_Right [real:float] = "5.000000"
  ? InPadding_Top [real:float] = "5.000000"
  ? InPadding [ScriptStruct'/Script/SlateCore.Margin']

Node12: K2Node_MacroInstance
  ? exec [exec] -> Node0.then
  Out Is Valid [exec] -> Node16.execute
  Out Is Not Valid [exec]
  ? InputObject [Class'/Script/CoreUObject.Object'] -> Node14.ReturnValue

Node13: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node14.Actor

Node14: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetAbilitySystemComponent
  ? Actor [Class'/Script/Engine.Actor'] -> Node13.ReturnValue
  Out ReturnValue [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node12.InputObject
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary

Node15: K2Node_CustomEvent Fn=FillAbilityBar
  Out then [exec] -> Node2.execute
  Out OutputDelegate [delegate]

Node16: K2Node_AsyncAction
  ? execute [exec] -> Node12.Is Valid
  Out then [exec] -> Node18.execute
  Out EventReceived [exec]
  ? TargetActor [Class'/Script/Engine.Actor'] -> Node17.ReturnValue
  ? OnlyMatchExact [bool] = "true"
  ? OnlyTriggerOnce [bool] = "false"
  ? EventTag [ScriptStruct'/Script/GameplayTags.GameplayTag']
  Out AsyncTaskProxy [Class'/Script/GameplayAbilities.AbilityAsync_WaitGameplayEvent']
  Out Payload [ScriptStruct'/Script/GameplayAbilities.GameplayEventData']

Node17: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node16.TargetActor

Node18: K2Node_CallFunction Fn=FillAbilityBar
  ? execute [exec] -> Node16.then


  ----

  BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=ReceiveBeginPlay
  Out then [exec] -> Node3.execute
  Out OutputDelegate [delegate]

Node1: K2Node_AsyncAction
  ? execute [exec] -> Node5.then
  Out Changed [exec] -> Node2.execute
  Out NewValue [real:float] -> Node2.NewValue
  Out OldValue [real:float] -> Node2.OldValue
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"Stamina\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Stamina,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? OnlyTriggerOnce [bool] = "false"
  ? TargetActor [Class'/Script/Engine.Actor']
  Out AsyncTaskProxy [Class'/Script/GameplayAbilities.AbilityAsync_WaitAttributeChanged']
  Out Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute']

Node2: K2Node_CallFunction Fn=HandleStaminaChanged
  ? execute [exec] -> Node1.Changed
  ? NewValue [real:double] = "0.0" -> Node1.NewValue
  ? OldValue [real:double] = "0.0" -> Node1.OldValue

Node3: K2Node_CallFunction Fn=GiveAbilities
  ? execute [exec] -> Node0.then
  Out then [exec] -> Node4.execute
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] = GA_Dash_C

Node4: K2Node_CallFunction Fn=GiveAbilities
  ? execute [exec] -> Node3.then
  Out then [exec] -> Node5.execute
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] = GA_Attack_Q_C

Node5: K2Node_CallFunction Fn=GiveAbilities
  ? execute [exec] -> Node4.then
  Out then [exec] -> Node1.execute
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] = GA_Heal_E_C


  ---

  BlueprintGraph (LLM Compact)

Node0: K2Node_FunctionEntry Fn=GiveAbilities
  Out then [exec] -> Node2.execute
  Out AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] -> Node2.AbilityClass

Node1: K2Node_VariableGet Fn=AbilitySystemComponent
  Out AbilitySystemComponent [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node2.self

Node2: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemComponent'.K2_GiveAbility
  ? execute [exec] -> Node0.then
  Out then [exec] -> Node3.execute
  ? AbilityClass [class<Class'/Script/GameplayAbilities.GameplayAbility'>] -> Node0.AbilityClass
  ? self [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node1.AbilitySystemComponent
  ? InputID [int] = "-1"
  ? Level [int] = "0"
  Out ReturnValue [ScriptStruct'/Script/GameplayAbilities.GameplayAbilitySpecHandle']

Node3: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.SendGameplayEventToActor
  ? execute [exec] -> Node2.then
  ? Actor [Class'/Script/Engine.Actor'] -> Node4.self
  ? EventTag [ScriptStruct'/Script/GameplayTags.GameplayTag'] = "(TagName=\"Event.Abilities.Changed\")"
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  ? Payload [ScriptStruct'/Script/GameplayAbilities.GameplayEventData']

Node4: K2Node_Self
  Out self [None] -> Node3.Actor


  ----


  올려주신 그래프를 보니, 거의 완벽하게 파이프라인을 구축하셨습니다! `W_AbilitiesContainer`에서 위젯을 지우고 새로 그리는 로직(`FillAbilityBar`)도 깔끔하고, 캐릭터 쪽에서 반복되는 `GiveAbility` 로직을 함수로 빼내어 이벤트를 방송(`SendGameplayEventToActor`)하는 구조도 아주 훌륭합니다.

하지만 화면에 스킬이 안 나오는 이유는 `W_AbilitiesContainer`의 **`Wait for Gameplay Event` 노드 연결**에 치명적인 실수가 하나 있기 때문입니다.

어디가 문제인지, 어떻게 고쳐야 하는지 정확히 짚어드릴게요.

---

### 🚨 문제 원인: 이벤트 연결의 오해 (Node 16과 Node 18)

`W_AbilitiesContainer` 그래프의 끝부분을 보겠습니다.

* **현재 상태:**
    * Node 12 (`IsValid`) 성공 👉 Node 16 (`Wait for Gameplay Event`) **`execute`** 실행
    * Node 16 (`Wait for Gameplay Event`) **`then`** 👉 Node 18 (`FillAbilityBar`) 실행
* **문제점:**
    * 비동기 노드(파란색 시계 아이콘 노드)인 `Wait for Gameplay Event`에서 **`then`** 핀은 "이 노드를 세팅하는 데 성공했다. 다음 줄을 계속 실행해라"라는 뜻입니다.
    * 따라서 이벤트 태그(`Event.Abilities.Changed`)가 오기를 **기다리지도 않고 바로** `FillAbilityBar`를 한 번 실행해 버리고 끝납니다. 이 시점에는 아직 플레이어에게 스킬이 부여되기 전일 확률이 높으므로 빈 배열을 그려버립니다.
    * 가장 중요한, 이벤트가 도착했을 때 실행되어야 할 **`Event Received`** 핀은 어디에도 연결되어 있지 않은 상태입니다.

### 🛠️ 해결 방법 (간단합니다!)

`W_AbilitiesContainer`의 `Event Construct` 로직 끝부분 배선을 조금만 수정하면 됩니다.

1.  **Event Tag 설정:** 먼저 `Wait for Gameplay Event` (Node 16) 노드의 **`Event Tag`** 핀에 `Event.Abilities.Changed` 태그가 정확히 설정되어 있는지 확인하세요. (그래프 텍스트에는 비어있는 것으로 보입니다.)
2.  **핀 연결 변경:** `Wait for Gameplay Event` (Node 16)의 위쪽 실행 핀인 **`then`**과 `FillAbilityBar` (Node 18) 사이의 연결을 **끊습니다.**
3.  **Event Received 연결:** `Wait for Gameplay Event` (Node 16)의 중간에 있는 실행 핀인 **`Event Received`**를 `FillAbilityBar` (Node 18)에 **연결합니다.**

**💡 올바른 흐름:**
> `IsValid` 통과 👉 `Wait for Gameplay Event` 세팅 완료. (여기서 로직 멈춤) 👉 나중에 누군가(캐릭터)가 `Event.Abilities.Changed` 방송을 쏨 👉 `Wait for Gameplay Event` 노드가 이를 감지하고 **`Event Received`** 핀을 발동시킴 👉 `FillAbilityBar` 실행됨 (기존 것 지우고 새 스킬 쫙 뿌림).

### 추가 체크 포인트 (혹시나 해서!)
만약 위 배선을 고쳤는데도 안 나온다면, 캐릭터 블루프린트(`BP_Nexus_Player`)에서 `GiveAbilities` 함수를 여러 번 호출할 때, 각 함수 내부에서 `SendGameplayEventToActor`를 개별적으로 쏘고 계신 구조(Node 3)를 한 번 점검해 볼 필요가 있습니다.

* 스킬 3개를 연달아 주면 이벤트가 0.001초 간격으로 3번 발송되고, UI도 0.001초 간격으로 3번 지웠다 그리기를 반복합니다. 작동은 하겠지만 효율적이진 않습니다.
* **권장 사항:** `GiveAbility` 함수 내부에서는 이벤트를 쏘지 말고 순수하게 스킬만 부여하게 한 뒤, `BeginPlay`에서 스킬 3개를 다 주고 난 **맨 마지막(Node 5 다음)**에 `SendGameplayEventToActor`를 **딱 한 번만** 쏘도록 구조를 바꾸는 것이 좋습니다.

일단 **`Event Received`** 핀 연결부터 수정해 보시고 테스트해 보세요! 마침내 스킬 위젯들이 화면에 예쁘게 정렬되어 나타날 것입니다.

----


BlueprintGraph (LLM Compact)

Node0: K2Node_VariableGet Fn=AbilityBox
  Out AbilityBox [Class'/Script/UMG.HorizontalBox'] -> Node1.self

Node1: K2Node_CallFunction Fn=Class'/Script/UMG.HorizontalBox'.AddChildToHorizontalBox
  ? execute [exec] -> K2Node_CreateWidget_0.?
  Out then [exec] -> Node2.execute
  ? Content [Class'/Script/UMG.Widget'] -> K2Node_CreateWidget_0.?
  ? self [Class'/Script/UMG.HorizontalBox'] -> Node0.AbilityBox
  Out ReturnValue [Class'/Script/UMG.HorizontalBoxSlot']

Node2: K2Node_CallFunction Fn=SetPadding
  ? execute [exec] -> Node1.then
  ? InPadding_Bottom [real:float] = "5.000000"
  ? InPadding_Left [real:float] = "5.000000"
  ? InPadding_Right [real:float] = "5.000000"
  ? InPadding_Top [real:float] = "5.000000"
  ? InPadding [ScriptStruct'/Script/SlateCore.Margin']

  ---

  제시해주신 그래프 요약을 보니, 튜토리얼을 잘 따라오셨고 패딩을 적용하려는 의도도 정확합니다. `AddChildToHorizontalBox` 노드 바로 다음에 `SetPadding` 노드를 연결하신 것 자체는 논리적으로 완벽한 접근입니다.

그럼에도 불구하고 서로 안 붙고 에러가 나거나 패딩이 적용되지 않는다면, **어떤 핀(Pin)들을 연결하려고 시도했는지**에 그 해답이 있습니다. 아주 흔하게 겪는 타깃(Target) 불일치 문제입니다.

정확한 원인과 해결 방법을 설명해 드리겠습니다.

---

### 🚨 문제 원인: 패딩의 '타깃(Target)'이 잘못됨

에디터에서 `Set Padding` 노드의 **`Target` (파란색 입력 핀)**을 자세히 보세요.

* `Set Padding`은 위젯 자체(예: W_Ability)의 기능이 아니라, 그 위젯을 감싸고 있는 **'슬롯(Slot)'의 기능**입니다. (슬롯이란 부모 위젯인 수평 박스가 자식 위젯에게 제공해 주는 자리입니다.)
* 하지만 보통 초보자분들이 실수하는 부분은 방금 생성한 위젯(`Create Widget`의 `ReturnValue`)을 그대로 `Set Padding`의 `Target`에 연결하려고 시도하는 것입니다. 타입이 맞지 않아서 선이 연결되지 않습니다.

### 🛠️ 해결 방법 (올바른 배선)

`AddChildToHorizontalBox` (Node 1) 노드의 파란색 출력 핀인 **`ReturnValue`**를 주목해야 합니다. 이 핀은 우리가 추가한 위젯(Content)이 아니라, 위젯이 들어간 **`HorizontalBoxSlot` (수평 박스 슬롯)**을 반환합니다.

패딩은 바로 이 슬롯(Slot)에다 주는 것입니다!

1.  **실행 핀 연결:**
    * `AddChildToHorizontalBox` (Node 1)의 `then` (실행 핀)을 `SetPadding` (Node 2)의 `execute`에 연결합니다. (이건 이미 하셨을 겁니다.)
2.  **타깃 핀 연결 (가장 중요!):**
    * **`AddChildToHorizontalBox` (Node 1)의 `ReturnValue` (슬롯 반환 핀)**에서 선을 뽑아 **`Set Padding` (Node 2)의 `Target`** 핀에 바로 연결합니다.
3.  **마진(Margin) 설정:**
    * `Set Padding` 노드의 `In Padding` 핀을 우클릭하고 **`구조체 핀 분할(Split Struct Pin)`**을 선택합니다.
    * 그러면 상/하/좌/우 4개의 입력 칸이 나옵니다. 여기에 각각 **5.0**씩 입력하시면 됩니다.

---

**💡 핵심 요약**
위젯을 화면에 붙일 때는 "방금 만든 위젯에 패딩을 줘!"가 아니라, **"위젯을 박스에 넣고 나서, 그 박스가 만들어준 '슬롯'의 여백을 늘려줘!"**라고 엔진에게 지시해야 합니다. `ReturnValue`를 `Target`에 연결하면 깔끔하게 패딩이 생길 것입니다. 다시 한번 연결을 시도해 보세요!

----

[효제 (사용자)]

Begin Object Class=/Script/UMG.SizeBox Name="SizeBox_37" ExportPath="/Script/UMG.SizeBox'/Game/Widget/W_Ability.W_Ability:WidgetTree.SizeBox_37'"
   Begin Object Class=/Script/UMG.SizeBoxSlot Name="SizeBoxSlot_0" ExportPath="/Script/UMG.SizeBoxSlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.SizeBox_37.SizeBoxSlot_0'"
   End Object
   Begin Object Name="SizeBoxSlot_0" ExportPath="/Script/UMG.SizeBoxSlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.SizeBox_37.SizeBoxSlot_0'"
      Parent="/Script/UMG.SizeBox'SizeBox_37'"
      Content="/Script/UMG.Overlay'Overlay_0'"
   End Object
   WidthOverride=120.000000
   HeightOverride=120.000000
   bOverride_WidthOverride=True
   bOverride_HeightOverride=True
   bOverride_MinAspectRatio=True
   bOverride_MaxAspectRatio=True
   Slots(0)="/Script/UMG.SizeBoxSlot'SizeBoxSlot_0'"
   bExpandedInDesigner=True
End Object
Begin Object Class=/Script/UMGEditor.WidgetSlotPair Name="WidgetSlotPair_0" ExportPath="/Script/UMGEditor.WidgetSlotPair'/Engine/Transient.WidgetSlotPair_0'"
   WidgetName="SizeBox_37"
End Object
Begin Object Class=/Script/UMG.Overlay Name="Overlay_0" ExportPath="/Script/UMG.Overlay'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0'"
   Begin Object Class=/Script/UMG.OverlaySlot Name="OverlaySlot_0" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0.OverlaySlot_0'"
   End Object
   Begin Object Class=/Script/UMG.OverlaySlot Name="OverlaySlot_2" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0.OverlaySlot_2'"
   End Object
   Begin Object Class=/Script/UMG.OverlaySlot Name="OverlaySlot_1" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0.OverlaySlot_1'"
   End Object
   Begin Object Name="OverlaySlot_0" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0.OverlaySlot_0'"
      HorizontalAlignment=HAlign_Fill
      VerticalAlignment=VAlign_Fill
      Parent="/Script/UMG.Overlay'Overlay_0'"
      Content="/Script/UMG.Image'AbilityBackground'"
   End Object
   Begin Object Name="OverlaySlot_2" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0.OverlaySlot_2'"
      HorizontalAlignment=HAlign_Fill
      VerticalAlignment=VAlign_Fill
      Parent="/Script/UMG.Overlay'Overlay_0'"
      Content="/Script/UMG.Overlay'CooldownOverlay'"
   End Object
   Begin Object Name="OverlaySlot_1" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.Overlay_0.OverlaySlot_1'"
      HorizontalAlignment=HAlign_Center
      VerticalAlignment=VAlign_Center
      Parent="/Script/UMG.Overlay'Overlay_0'"
      Content="/Script/UMG.TextBlock'AbilityText'"
   End Object
   Slots(0)="/Script/UMG.OverlaySlot'OverlaySlot_0'"
   Slots(1)="/Script/UMG.OverlaySlot'OverlaySlot_1'"
   Slots(2)="/Script/UMG.OverlaySlot'OverlaySlot_2'"
   bExpandedInDesigner=True
End Object
Begin Object Class=/Script/UMG.Image Name="AbilityBackground" ExportPath="/Script/UMG.Image'/Game/Widget/W_Ability.W_Ability:WidgetTree.AbilityBackground'"
   Brush=(ImageType=FullColor,ImageSize=(X=116.000000,Y=112.000000),ResourceObject="/Script/Engine.Texture2D'/Game/HyojeArchive/Images/SU_GAS_AttackQ.SU_GAS_AttackQ'")
   bIsVariable=False
   DisplayLabel="AbilityBackground"
End Object
Begin Object Class=/Script/UMG.TextBlock Name="AbilityText" ExportPath="/Script/UMG.TextBlock'/Game/Widget/W_Ability.W_Ability:WidgetTree.AbilityText'"
   Text=NSLOCTEXT("[2D2E6CCED5975294CB1D69273FC717BA]", "31EF60F64962F80AA0F375BF260E6253", "Dash")
   ColorAndOpacity=(SpecifiedColor=(R=0.517243,G=0.189443,B=1.000000,A=1.000000))
   Font=(Size=12.000000)
   bIsVariable=True
   DisplayLabel="AbilityText"
End Object
Begin Object Class=/Script/UMG.Overlay Name="CooldownOverlay" ExportPath="/Script/UMG.Overlay'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownOverlay'"
   Begin Object Class=/Script/UMG.OverlaySlot Name="OverlaySlot_1" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownOverlay.OverlaySlot_1'"
   End Object
   Begin Object Class=/Script/UMG.OverlaySlot Name="OverlaySlot_2" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownOverlay.OverlaySlot_2'"
   End Object
   Begin Object Name="OverlaySlot_1" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownOverlay.OverlaySlot_1'"
      HorizontalAlignment=HAlign_Fill
      VerticalAlignment=VAlign_Fill
      Parent="/Script/UMG.Overlay'CooldownOverlay'"
      Content="/Script/UMG.Image'CooldownBackground'"
   End Object
   Begin Object Name="OverlaySlot_2" ExportPath="/Script/UMG.OverlaySlot'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownOverlay.OverlaySlot_2'"
      HorizontalAlignment=HAlign_Center
      VerticalAlignment=VAlign_Center
      Parent="/Script/UMG.Overlay'CooldownOverlay'"
      Content="/Script/UMG.TextBlock'CooldownText'"
   End Object
   Slots(0)="/Script/UMG.OverlaySlot'OverlaySlot_1'"
   Slots(1)="/Script/UMG.OverlaySlot'OverlaySlot_2'"
   bIsVariable=True
   bExpandedInDesigner=True
   DisplayLabel="CooldownOverlay"
End Object
Begin Object Class=/Script/UMG.Image Name="CooldownBackground" ExportPath="/Script/UMG.Image'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownBackground'"
   Brush=(ImageType=FullColor,ImageSize=(X=116.000000,Y=112.000000))
   ColorAndOpacity=(R=0.000000,G=0.000000,B=0.000000,A=0.426087)
   bIsVariable=False
   DisplayLabel="CooldownBackground"
End Object
Begin Object Class=/Script/UMG.TextBlock Name="CooldownText" ExportPath="/Script/UMG.TextBlock'/Game/Widget/W_Ability.W_Ability:WidgetTree.CooldownText'"
   ColorAndOpacity=(SpecifiedColor=(R=0.517243,G=0.189443,B=1.000000,A=1.000000))
   Font=(Size=48.750000)
   bIsVariable=True
   DisplayLabel="CooldownText"
End Object


W_Ability

클래스 명으로 기술명이 나오게 설계했잖아. 
근데 여기에 뒤에 이미지에 각각 달라야 해. 

그리고 아직, 기술명이 준비가 안되어 있어. 
아직 Q랑 E가 나와야 해. 쿨타임이 아직 준비가 안되어 있네. 

----


본격적으로 스킬들을 확장하고 디테일을 잡아가는 단계에 오셨군요! 

현재 `W_Ability`는 클래스 이름(`GA_Attack_Q_C` 등)을 그대로 가져와서 텍스트로 띄우고, 배경 이미지는 하드코딩(SU_GAS_AttackQ)되어 있어서 모든 스킬이 똑같은 이미지를 띄우는 상태입니다.

각 스킬마다 **고유한 아이콘과 예쁜 이름**을 띄우고, **Q와 E의 쿨타임**을 작동시키기 위한 완벽한 해결책을 단계별로 정리해 드립니다.

---

### 🎨 1단계: 각 스킬(Ability)에 아이콘/이름 변수 추가하기

언리얼의 기본 `GameplayAbility` 클래스에는 '아이콘'이나 '스킬 이름'을 넣는 칸이 기본적으로 없습니다. 우리가 직접 만들어 주어야 합니다.

1. **부모 어빌리티 클래스 생성 (매우 권장):**
   * Q, E, 대시 스킬마다 변수를 따로 만들면 나중에 위젯에서 데이터를 꺼내기가 너무 힘듭니다.
   * `GameplayAbility`를 상속받는 블루프린트를 하나 새로 만듭니다. (이름: `GA_Base_C` 등)
   * 이 `GA_Base_C`를 열고 좌측 변수 탭에서 두 개의 변수를 추가합니다.
     * `SkillIcon` (변수 타입: **Texture 2D**)
     * `SkillDisplayName` (변수 타입: **Text**)
   * **중요:** 기존에 만든 `GA_Dash_C`, `GA_Attack_Q_C`, `GA_Heal_E_C`를 열고 상단 메뉴의 **클래스 세팅(Class Settings)**에서 부모 클래스를 `GameplayAbility`에서 방금 만든 **`GA_Base_C`**로 변경해 줍니다.
2. **각 스킬별 데이터 입력:**
   * 이제 `GA_Attack_Q_C`의 디테일 패널(Class Defaults)을 보면 방금 만든 `SkillIcon`과 `SkillDisplayName` 칸이 생겨있을 것입니다.
   * Q 스킬에는 주먹 아이콘과 "강타 (Q)"라는 이름을, E 스킬에는 힐 아이콘과 "치유 (E)"라는 이름을 각각 세팅해 줍니다.

### 🖼️ 2단계: W_Ability 위젯 세팅 및 로직 수정

이제 위젯이 하드코딩된 데이터 대신, 실제 스킬 블루프린트에 적힌 데이터를 가져와 화면에 그리도록 바꿉니다.

1. **이미지를 변수로 만들기:**
   * 올려주신 코드를 보면 `AbilityBackground` 이미지의 `bIsVariable`이 `False`로 되어 있습니다.
   * `W_Ability` 디자이너 탭으로 가서 **`AbilityBackground`** 이미지를 선택하고 우측 상단의 **`Is Variable (변수 여부)`**를 체크합니다.
2. **그래프(Construct) 로직 수정:**
   * `GetClassDisplayName`으로 이름을 가져오던 기존 로직(Node 8, 9, 11)을 지웁니다.
   * 저장해 둔 `AbilityObjectRef`를 가져와서, 방금 만든 부모 클래스인 **`Cast to GA_Base_C`** 노드에 연결합니다.
   * 캐스팅 성공 핀에서, 해당 스킬의 **`Get Skill Icon`**과 **`Get Skill Display Name`**을 꺼냅니다.
   * **이미지 변경:** `AbilityBackground` 변수를 가져와서 **`Set Brush from Texture`** 노드를 연결하고, `Skill Icon`을 꽂아줍니다.
   * **이름 변경:** `AbilityText` 변수를 가져와서 **`Set Text`** 노드를 연결하고, `Skill Display Name`을 꽂아줍니다.

---

### ⏳ 3단계: Q와 E 스킬 쿨타임 활성화 (체크리스트)

대시 스킬은 쿨타임이 도는데 Q와 E가 돌지 않는다면, 스킬 내부 세팅이 아직 덜 된 것입니다. 아래 3가지를 해당 스킬(`GA_Attack_Q_C`, `GA_Heal_E_C`)에서 반드시 확인하세요.

1. **쿨다운 전용 Gameplay Effect (GE) 만들기:**
   * Q 스킬 쿨타임용 GE를 하나 만듭니다. (예: `GE_Cooldown_Q`)
   * Duration Policy를 `Has Duration`으로 하고 시간(예: 5.0초)을 넣습니다.
   * **Granted Tags**에 위젯이 기다리고 있는 태그인 **`Cooldown`**을 추가합니다. (이게 없으면 UI 타이머가 절대 돌지 않습니다!)
2. **스킬에 Cooldown GE 할당하기:**
   * `GA_Attack_Q_C`를 열고 우측 디테일 패널에서 `Costs` -> **`Cooldown Gameplay Effect Class`** 항목에 방금 만든 `GE_Cooldown_Q`를 넣어줍니다.
3. **스킬 발동 시 Commit Ability 호출하기 (가장 흔한 실수):**
   * 스킬 블루프린트 그래프 내부(`Event ActivateAbility` 뒤쪽) 어딘가에 **`Commit Ability`** 노드가 반드시 실행되어야 합니다.
   * 이 노드가 실행되는 순간, 엔진이 알아서 스태미나를 깎고 위에 세팅한 쿨다운 GE를 플레이어에게 적용시킵니다.

이 세팅들을 마무리하시면, 스킬을 획득할 때마다 각기 다른 멋진 아이콘과 이름이 나타나고, Q와 E를 눌렀을 때 쿨타임 오버레이가 정상적으로 작동할 것입니다! 차근차근 적용해 보시고 막히는 부분이 있다면 알려주세요.

---

이건 나중에 해야 겠다. 
일단 그렇게 해. 
리펙토링을 어떻게 하지... 블프 어렵다.....

---

# 🤖 AI_GUIDE.md: Hyoje's Astro Blog Rules

이 문서는 Hyoje(효제)의 다국어 Astro 블로그를 유지보수하고 포스팅을 작성하는 AI를 위한 핵심 가이드라인입니다.  
코드를 수정하거나 마크다운 글을 작성할 때는 **반드시** 이 규칙을 따르세요.

## 1. Persona & Tone (페르소나 및 문체)

작성자는 **작성자는 **C++와 DirectX 11 기반 경험을 바탕으로, 현재 언리얼을 학습 중인 게임 프로그래머**입니다.**입니다.  
복잡한 시스템을 단순화하고, 런타임 효율을 높이는 과정에서 기술적 미학을 찾습니다.

글의 기본 태도는 다음 원칙을 따릅니다.

* **비용 의식:** 중복과 불필요한 복잡성은 유지보수 비용을 키우는 요소로 보고 경계합니다.
* **끝까지 파고드는 태도:** 한 번 붙잡은 문제는 적당히 봉합하기보다, 구조와 원인을 끝까지 추적해 더 나은 방식으로 정리합니다.
* **담백한 자신감:** 과장된 밈이나 과도한 감탄보다, 논리적 완결성과 관찰에서 나오는 절제된 자신감을 유지합니다.
* **은유는 절제해서 사용:** 성향을 드러낼 때는 직접적 표현보다 `리스크 관리`, `시너지 계산`, `장거리 호흡` 같은 추상적 표현을 사용할 수 있습니다.

전체적으로 글은  
**기술 블로그다운 명확함**,  
**구현 과정에 대한 집요한 추적**,  
그리고 **과장 없는 미적 감각**을 함께 유지해야 합니다.

---

## 2. File Architecture & i18n (다국어 라우팅 규칙)

* **폴더 분리 금지:** 다국어 처리를 위해 `ko/`, `en/` 같은 서브 폴더를 만들지 마세요. 모든 포스트는 `src/content/posts/` 하위(또는 그 안의 주제별 폴더)에 함께 위치합니다.
* **파일명 기반 언어 구분:**
  * 한국어 원본: `post-title.md` 또는 `post-title/index.md`
  * 영문 번역본: `post-title-en.md` 또는 `post-title-en/index.md`

---

## 3. Frontmatter Rules (프론트매터 필수 양식)

블로그 글을 작성할 때 프론트매터는 아래 양식을 엄격히 준수하세요.

* `tags`, `series`는 **반드시 영어 소문자와 하이픈(kebab-case)** 또는 콜론(`foo:goo`)으로 작성하세요. 한글은 사용하지 마세요.
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
````

---

## 4. Custom Markdown & Syntax (커스텀 마크다운 문법)

Astro 파이프라인에 Obsidian 커스텀 플러그인이 적용되어 있습니다. 포스팅 작성 시 아래 문법을 활용해 시각적 퀄리티를 높이세요.

### 4.1 Korean Bold Text Rendering (한국어 굵기 강조 규칙)

마크다운 강조(`**`) 직후에 띄어쓰기 없이 조사('입니다', '은/는' 등)를 붙여 써야 할 때는 파서 렌더링 오류를 막기 위해 반드시 `**` 뒤에 투명 공백 문자(`&#8203;`)를 삽입하세요.

```markdown
**픽셀 아트**&#8203;입니다.
```

### 4.2 Obsidian Callout (Admonitions)

```markdown
> [!info] 정보
> 안내 문구

> [!warning] 경고
> 주의할 점
```

### 4.3 Highlight & Wikilinks

* 형광펜 강조는 `==텍스트==`를 사용하세요.
* 내부 링크는 `[[링크]]`를 사용하세요.

### 4.4 Character Chats (말풍선)

`swallow`와 `cyper` 말풍선 문법을 사용할 수 있습니다.

* `swallow`는 **작성자인 효제의 시점**에 사용합니다.
* `cyper`는 **AI 보조 설명자 시점**에 사용합니다.
* 말풍선 UI는 본문 톤을 가볍게 만들 수 있으므로, **사용자가 요청한 경우에 우선적으로 사용**하고 평소에는 절제해서 사용하세요.

```markdown
:::swallow
짜잔! 나 장효젠데, 제비 아바타 말풍선입니다.
:::

:::cyper
나 생성형 AI의 분신, 사이퍼 등장!
:::
```

### 4.5 Image Paths (이미지 상대 경로)

`src/content/` 내부에서 이미지를 불러올 때는 **반드시 상대 경로**를 사용하세요.
절대 경로(`/`)는 `public/` 폴더 안의 파일에만 사용합니다.

```markdown
![이미지 설명](../../image_name.png '캡션 텍스트')
```

### 4.6 Multiple Images Layout (가로 나란히 배치)

2개의 이미지를 한 줄에 나란히 배치할 때는 HTML Flexbox 컨테이너와 마크다운 이미지 문법 사이에 **반드시 빈 줄(엔터)** 을 넣어 파서가 마크다운을 정상 인식하도록 하세요.

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

### 4.7 Code Blocks

코드 블록 작성 시 언어를 명시하고, 가능하면 파일명을 함께 추가하세요.

````markdown
```cpp title="AuroraEngine/Renderer.cpp"
// code here
````
---

## 5. Source & Attribution Policy (자료 출처 및 링크 표기 규칙)

사용자가 제공한 PR 링크, 커밋, 이슈, 문서, 영상, 이미지, 스크린샷은 가능한 한 본문에 직접 남기세요.  
이 자료들을 임의로 생략하거나, 출처 없는 일반 정보처럼 재서술하지 마세요.

### 5.1 기본 원칙

* 사용자가 준 링크는 가능한 한 본문에 직접 적으세요.
* 링크가 너무 많아 흐름을 해치면, 최소한 섹션 첫머리나 끝에 `작업 자료`, `참고 자료`, `재현 영상`, `설명 이미지` 등의 이름으로 묶어서 남기세요.
* 사용자가 제공한 자료를 기반으로 글을 쓸 때, 그 자료가 글의 근거임을 드러내세요.

### 5.2 자료별 표기 규칙

#### PR / Commit / Issue / Repository 링크
* 사용자가 제공한 개발 링크는 기본적으로 `작업 자료` 또는 `참고 자료`로 표기하세요.
* 사용자가 명시하지 않았다면, 해당 링크를 무조건 "내가 작업한 것"이라고 단정하지 마세요.
* 다만 문맥상 사용자의 작업 로그로 보이면 `이번 작업 자료`, `관련 PR`, `구현 근거 자료`처럼 자연스럽게 연결하세요.

#### Video / GIF / Demo Clip
* 사용자가 제공한 영상은 기본적으로 `시연 영상`, `재현 영상`, `플레이 영상`, `참고 영상`으로 표기하세요.
* 사용자가 직접 촬영했다고 명시하지 않았다면, 영상의 제작 주체를 단정하지 마세요.
* 본문에서 설명하는 문제 상황, 결과, 연출을 입증하는 위치에 배치하세요. 단순 장식처럼 글 하단에 몰아 넣지 마세요.

#### Image / Screenshot / Diagram
* 사용자가 제공한 이미지는 기본적으로 `스크린샷`, `설명 이미지`, `디버깅 캡처`, `참고 이미지`로 표기하세요.
* 사용자가 직접 캡처했다고 명시하지 않았다면, 출처 소유를 단정하지 마세요.
* 문제 원인 분석, 설정 설명, 결과 비교처럼 **설명과 직접 연결되는 지점**에 넣으세요.

### 5.3 문장 스타일 원칙

소유를 단정하기보다 **자료의 역할**을 먼저 설명하세요.

* `작업 자료는 아래 PR에 남겨 두었다.`
* `아래 영상은 문제 상황을 재현한 장면이다.`
* `다음 스크린샷은 SphereTrace 설정을 보여준다.`

사용자가 준 자료가 있으면, 가능하면 아래 표현을 우선 사용하세요.

* `작업 자료`
* `참고 자료`
* `관련 PR`
* `재현 영상`
* `시연 영상`
* `설명 이미지`
* `디버깅 캡처`

### 5.4 금지 사항

* 사용자가 제공한 링크, 영상, 이미지를 특별한 이유 없이 생략하지 마세요.
* 출처가 있는 자료를 AI가 원래 알고 있던 사실처럼 자연스럽게 흡수해서 쓰지 마세요.
* 사용자가 명시하지 않은 소유 관계를 단정하지 마세요.



----

흠... 오늘 