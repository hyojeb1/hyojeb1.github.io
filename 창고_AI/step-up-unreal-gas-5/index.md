---
title: '[step-up-unreal-gas] Part 5 데미지/힐링 가이드'
published: 2026-04-14
draft: false
unlisted: false
tags: ['cpp', 'unreal-engine', 'gas', 'gameplay-abilility-system']
lang: 'ko'
series: 'step-up-unreal-gas'
---

# 영상부터 보자. 

리스펙트 투 Ali Elzoheiry
https://www.youtube.com/watch?v=0XfM_UyJdhY

---

언리얼 엔진의 **GAS(Gameplay Ability System)**를 활용하여 데미지와 힐링 시스템을 구축하는 과정에 대한 가이드를 정리해 드립니다. 이 가이드는 제공해주신 영상의 흐름을 따라가며, 상세한 블루프린트 로직과 C++ 코드를 포함합니다.

---

### **1. 데미지 Gameplay Effect 설정 (00:54)**
기존의 고정 수치 방식이 아닌, 외부에서 값을 전달받는 **Set by Caller** 방식을 사용합니다.

* **GE 생성:** `GE_Damage_OverTime_Infinite` (Gameplay Effect 클래스 상속)
* **Duration Policy:** `Infinite` (지속 효과)
* **Period:** `1.0` (1초마다 데미지 틱 발생)
* **Modifier 설정:**
    * **Attribute:** `Health`
    * **Modifier Op:** `Add Final` (다른 버프/디버프 계산 후 최종 적용)
    * **Magnitude Calculation Type:** `Set by Caller`
    * **Data Tag:** `Data.Damage` (새로운 Gameplay Tag 생성)
* **기타:** `Execute Periodic Effect on Application`을 체크 해제하면, 밟자마자 데미지를 입는 것이 아니라 1초 뒤부터 시작됩니다 [[10:43](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=643)].

---

### **2. 베이스 이펙트 액터 블루프린트 (04:10)**
다양한 장판(불, 힐 등)의 부모가 될 `BP_EffectArea_Base`를 작성합니다.

#### **구성 요소**
* **Sphere Collision:** 충돌 감지용 영역

#### **블루프린트 노드 연결 상세**
1.  **Actor Begin Overlap**
    * `Get Ability System Component` (상대방 액터로부터 호출)
    * `Is Valid` 노드로 체크
    * `Make Outgoing Gameplay Effect Spec` 노드 생성:
        * **Effect Class:** 위에서 만든 `GE_Damage_OverTime_Infinite` 선택
    * **Assign Tag Set By Caller Magnitude** 노드 연결:
        * **Spec Handle:** 위 노드의 출력값 연결
        * **Data Tag:** `Data.Damage`
        * **Magnitude:** `-15.0` (데미지 값)
    * `Apply Gameplay Effect Spec To Self` 노드로 최종 적용 [[07:44](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=464)].

2.  **Actor End Overlap**
    * `Get Ability System Component` -> `Is Valid` 확인
    * `Remove Active Gameplay Effect by Source Effect` 노드 호출:
        * **Target:** ASC
        * **Source Effect:** 적용했던 GE 클래스 선택 [[09:03](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=543)].

---

### **3. 속성 클램핑 (Attribute Clamping) - C++ 코드 (16:26)**
체력이 0 이하로 내려가거나 최대 체력을 초과하지 않도록 C++에서 제어합니다. `AttributeSet` 클래스에서 두 함수를 오버라이드합니다.

#### **AttributeSet.h**
```cpp
virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;
virtual void PostGameplayEffectExecute(const struct FGameplayEffectModCallbackData& Data) override;
```

#### **AttributeSet.cpp**
```cpp
#include "GameplayEffectExtension.h"

void UMyAttributeSet::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)
{
    Super::PreAttributeChange(Attribute, NewValue);

    // 체력 변경 전 클램핑
    if (Attribute == GetHealthAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxHealth());
    }
    // 스태미나 등 다른 속성도 동일하게 적용 가능
}

void UMyAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);

    // GE에 의해 속성이 변경된 후 다시 한번 체크 (클램핑 트리거)
    if (Data.EvaluatedData.Attribute == GetHealthAttribute())
    {
        SetHealth(FMath::Clamp(GetHealth(), 0.0f, GetMaxHealth()));
    }
}
```
* **중요:** `PreAttributeChange`는 값을 수동으로 설정할 때 호출되지만, GE에 의한 변경은 `PostGameplayEffectExecute`에서 다시 처리해주어야 완벽하게 클램핑됩니다 [[23:07](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=1387)].

---

### **4. Burst Gameplay Cue 적용 (24:33)**
데미지를 입거나 힐을 받을 때 시각/청각 효과를 추가합니다.

* **GC 생성:** `GC_Damage_Burst` (`GameplayCueNotify_Static` 상속)
* **Burst 효과 설정:**
    * **Niagara Particles:** 피격 이펙트 할당
    * **Sound:** 타격음 할당
    * **Camera Shake:** 화면 흔들림 효과 추가 (선택 사항)
* **Gameplay Cue Tag:** `GameplayCue.Damage.Burst`
* **GE 연결:** 이전에 만든 `GE_Damage_OverTime_Infinite` 내부의 `Gameplay Cues` 섹션에 위 태그를 추가합니다 [[28:02](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=1682)].

---

### **5. 힐링 장판으로 재사용 (11:13)**
부모 클래스를 활용해 힐링 장판을 쉽게 만듭니다.

1.  `BP_EffectArea_Base`를 상속받은 자식 블루프린트 생성 (`BP_EffectArea_Heal`).
2.  **변수화:** 부모 클래스에서 `EffectClass`, `DataTag`, `Magnitude`를 변수로 승격하고 **Instance Editable(인스턴스 편집 가능)**을 체크합니다.
3.  자식 클래스에서 다음 값을 설정합니다:
    * **Effect Class:** `GE_Heal_OverTime` (데미지 GE를 복제하여 생성)
    * **Data Tag:** `Data.Heal`
    * **Magnitude:** `15.0` (양수값)
4.  시각적으로 구별되도록 초록색 파티클이나 다른 이펙트를 컴포넌트로 추가합니다 [[15:30](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=930)].

이 가이드를 통해 GE의 동적 데이터 전달(`Set by Caller`), 안전한 수치 제어(`Clamping`), 그리고 효율적인 시각화(`Gameplay Cue`)의 기초를 다지실 수 있습니다. 궁금한 노드 연결이나 코드 부분이 있다면 말씀해 주세요!


---

|현재 Stamina에 대해 구현하신 **`Wait Attribute Changed`** (Node 14~17) 로직과 동일한 구조를 **Health** 속성에 대해서도 추가해주시면 됩니다. 

가장 효율적인 방법은 `Construct` 이벤트의 마지막 실행 핀(Node 14의 입력 핀과 병렬 혹은 직렬)에 **HP 전용 Async 노드**를 연결하는 것입니다.

---

### **추가해야 할 노드 구조 (LLM Compact 형식)**

기존 Node 14 뒤에 연결하거나, Node 12의 `then` 핀에서 실행 흐름을 이어가면 됩니다.

```text
Node 18: K2Node_AsyncAction (Wait Attribute Changed - HP 전용)
  ? execute [exec] -> Node 12.then (또는 Node 14.then)
  Out Changed [exec] -> Node 19.execute
  ? TargetActor [Class'/Script/Engine.Actor'] -> Node 15.ReturnValue
  Out NewValue [real:float] -> Node 19.HP
  ? Attribute [ScriptStruct] = "(AttributeName=\"Health\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Health,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? OnlyTriggerOnce [bool] = "false"

Node 19: K2Node_VariableSet Fn=HP
  ? execute [exec] -> Node 18.Changed
  Out then [exec] -> Node 20.execute
  ? HP [real:float] = "0.0" -> Node 18.NewValue

Node 20: K2Node_CallFunction Fn=UpdateHpPercent
  ? execute [exec] -> Node 19.then
```

---

### **수정 및 추가 가이드**

1.  **Async Action 추가**: `Wait Attribute Changed` 노드를 하나 더 생성합니다.
    * **Target Actor**: `GetOwningPlayerPawn` (기존 Node 15 재사용 가능)
    * **Attribute**: `Health` 속성을 선택합니다.
2.  **변수 업데이트**: `Changed` 출력 핀이 호출될 때마다 HUD의 내부 변수인 **`HP`**를 새 값(`NewValue`)으로 갱신합니다.
3.  **UI 갱신 함수 호출**: 변수 설정 직후에 **`UpdateHpPercent`** 함수를 호출하여 실제 Progress Bar의 % 수치를 변경합니다.



### **💡 팁: 왜 이렇게 하나요?**
현재 구성하신 `Wait Attribute Changed` 노드는 **이벤트 기반(Event-driven)** 방식입니다. 
* **Tick**을 써서 매 프레임 체크하는 것이 아니라, C++의 `AttributeSet`에서 값이 변경될 때만 HUD에게 "값이 바뀌었으니 새로 그려!"라고 알려주는 방식이라 성능상 매우 유리합니다.
* 다만, 게임 시작 시점에 한 번은 현재 값을 가져와야 하므로, 위에서 작성하신 **Node 5(초기값 가져오기)** 과정은 그대로 유지하셔야 합니다.

이제 체력 장판(Fire Area 등)에 들어갔을 때, C++에서 `PostGameplayEffectExecute`를 통해 값이 변하면 이 Async 노드가 반응하여 실시간으로 HP 바가 줄어드는 것을 보실 수 있을 겁니다! 구체적으로 노드 연결 중 막히는 부분이 있나요?

----
[효제 (사용자)]

UI에 적용이 안돼서 다시 묻습니다. ('키를 눌러 gas에서 제공하는 디버깅을 통해, (물론 PrintString 역시 동작을 하기에) hp감소가 적용되는건 확인 했습니다.) 
문제는 왜 UI에 적용이 안되는 것이가에 대해서 입니다.  (분명 제 로직이나, 채워야 할 란을 안 채운 것일 겁니다. ) 같이 찾아 봅시다.

BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node1.exec
  Out OutputDelegate [delegate]

Node1: K2Node_MacroInstance
  ? exec [exec] -> Node0.then
  Out Is Valid [exec] -> Node8.execute
  Out Is Not Valid [exec]
  ? InputObject [Class'/Script/CoreUObject.Object'] -> Node2.ReturnValue

Node2: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetAbilitySystemComponent
  ? Actor [Class'/Script/Engine.Actor'] -> Node3.ReturnValue
  Out ReturnValue [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node1.InputObject, Node4.AbilitySystem, Node5.AbilitySystem, Node6.AbilitySystem, Node7.AbilitySystem
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary

Node3: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node2.Actor

Node4: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetFloatAttributeFromAbilitySystemComponent
  Out ReturnValue [real:float] = "0.0" -> Node8.MAX_HP
  ? AbilitySystem [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node2.ReturnValue
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"MaxHealth\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:MaxHealth,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  Out bSuccessfullyFoundAttribute [bool] = "false"

Node5: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetFloatAttributeFromAbilitySystemComponent
  Out ReturnValue [real:float] = "0.0" -> Node9.HP
  ? AbilitySystem [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node2.ReturnValue
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"Health\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Health,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  Out bSuccessfullyFoundAttribute [bool] = "false"

Node6: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetFloatAttributeFromAbilitySystemComponent
  Out ReturnValue [real:float] = "0.0" -> Node10.MAX_Stamina
  ? AbilitySystem [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node2.ReturnValue
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"MaxStamina\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:MaxStamina,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  Out bSuccessfullyFoundAttribute [bool] = "false"

Node7: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetFloatAttributeFromAbilitySystemComponent
  Out ReturnValue [real:float] = "0.0" -> Node11.Stamina
  ? AbilitySystem [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node2.ReturnValue
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"Stamina\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Stamina,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  Out bSuccessfullyFoundAttribute [bool] = "false"

Node8: K2Node_VariableSet Fn=MAX_HP
  ? execute [exec] -> Node1.Is Valid
  Out then [exec] -> Node9.execute
  ? MAX_HP [real:float] = "0.0" -> Node4.ReturnValue
  Out Output_Get [real:float] = "0.0"

Node9: K2Node_VariableSet Fn=HP
  ? execute [exec] -> Node8.then
  Out then [exec] -> Node10.execute
  ? HP [real:float] = "0.0" -> Node5.ReturnValue
  Out Output_Get [real:float] = "0.0"

Node10: K2Node_VariableSet Fn=MAX_Stamina
  ? execute [exec] -> Node9.then
  Out then [exec] -> Node11.execute
  ? MAX_Stamina [real:float] = "0.0" -> Node6.ReturnValue
  Out Output_Get [real:float] = "0.0"

Node11: K2Node_VariableSet Fn=Stamina
  ? execute [exec] -> Node10.then
  Out then [exec] -> Node13.execute
  ? Stamina [real:float] = "0.0" -> Node7.ReturnValue
  Out Output_Get [real:float] = "0.0"

Node12: K2Node_CallFunction Fn=UpdateStaminaPercent
  ? execute [exec] -> Node13.then
  Out then [exec] -> Node14.execute

Node13: K2Node_CallFunction Fn=UpdateHpPercent
  ? execute [exec] -> Node11.then
  Out then [exec] -> Node12.execute

Node14: K2Node_AsyncAction
  ? execute [exec] -> Node12.then
  Out Changed [exec] -> Node16.execute
  ? TargetActor [Class'/Script/Engine.Actor'] -> Node15.ReturnValue
  Out NewValue [real:float] -> Node16.Stamina
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"Stamina\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Stamina,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? OnlyTriggerOnce [bool] = "false"
  Out AsyncTaskProxy [Class'/Script/GameplayAbilities.AbilityAsync_WaitAttributeChanged']
  Out Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute']
  Out OldValue [real:float]

Node15: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node14.TargetActor

Node16: K2Node_VariableSet Fn=Stamina
  ? execute [exec] -> Node14.Changed
  Out then [exec] -> Node17.execute
  ? Stamina [real:float] = "0.0" -> Node14.NewValue
  Out Output_Get [real:float] = "0.0"

Node17: K2Node_CallFunction Fn=UpdateStaminaPercent
  ? execute [exec] -> Node16.then
  Out then [exec] -> Node18.execute

Node18: K2Node_AsyncAction
  ? execute [exec] -> Node17.then
  Out then [exec] -> Node21.execute
  Out Changed [exec]
  ? TargetActor [Class'/Script/Engine.Actor'] -> Node19.ReturnValue
  Out NewValue [real:float] -> Node21.HP
  ? Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute'] = "(AttributeName=\"Health\",Attribute=/Script/StepUp_Unreal.BasicAttributeSet:Health,AttributeOwner=\"/Script/CoreUObject.Class\'/Script/StepUp_Unreal.BasicAttributeSet\'\")"
  ? OnlyTriggerOnce [bool] = "false"
  Out AsyncTaskProxy [Class'/Script/GameplayAbilities.AbilityAsync_WaitAttributeChanged']
  Out Attribute [ScriptStruct'/Script/GameplayAbilities.GameplayAttribute']
  Out OldValue [real:float]

Node19: K2Node_CallFunction Fn=GetOwningPlayerPawn
  Out ReturnValue [Class'/Script/Engine.Pawn'] -> Node18.TargetActor

Node20: K2Node_CallFunction Fn=UpdateStaminaPercent
  ? execute [exec] -> Node21.then

Node21: K2Node_VariableSet Fn=HP
  ? execute [exec] -> Node18.then
  Out then [exec] -> Node20.execute
  ? HP [real:float] = "0.0" -> Node18.NewValue
  Out Output_Get [real:float] = "0.0"

---

[LLM(AI)]


가장 먼저 축하드리고 싶은 점은, **GAS 디버깅(주석 창)과 PrintString으로 수치 감소를 확인하셨다는 것**입니다. 이건 백엔드 로직(AttributeSet, GameplayEffect)은 완벽하게 돌아가고 있다는 뜻이에요! 문제는 100% UI 블루프린트의 **'배선'**에 있습니다.

제공해주신 그래프 데이터에서 범인을 찾았습니다. **두 가지 결정적인 실수**가 보이네요. 같이 고쳐봅시다!

---

### **1. 첫 번째 범인: "Changed" 핀이 비어있음 (가장 중요)**

`Wait Attribute Changed` 노드(`Node18`)는 두 가지 실행 핀을 가집니다.
* **then (위쪽 핀):** 노드가 시작될 때 '한 번' 실행됩니다. (예약 버튼 누르기)
* **Changed (아래쪽 핀):** 실제로 값이 바뀔 때마다 '반복해서' 실행됩니다. (벨 울릴 때마다 나가기)

현재 데이터를 보면 다음과 같이 연결되어 있습니다:
> **Node18 (WaitAttributeChanged)** 의 **then** -> **Node21 (Set HP)** -> **Node20 (UpdateStaminaPercent)**

**문제점:** `Changed` 핀에 아무것도 연결되어 있지 않습니다! 즉, 체력이 실제로 깎여서 "야! 나 바뀌었어!"라고 벨을 눌러도, 그 신호를 받아줄 로직이 없는 상태입니다.

### **2. 두 번째 범인: 함수 이름 오타 (Node 20)**

데이터를 보면 HP 변수를 설정한 뒤에 호출하는 함수가 다음과 같습니다:
> **Node21 (Set HP)** -> **Node20 (UpdateStaminaPercent)**

**문제점:** HP를 업데이트했는데 왜 스태미나 퍼센트 함수를 부르시나요! 😂 이 부분은 `UpdateHpPercent`가 되어야 합니다.

---

### **올바른 배선 가이드 (수정본)**

`Node18` 이후의 로직을 다음과 같이 재배치해야 합니다.

| 노드 번호 | 역할 | 연결 수정 사항 |
| :--- | :--- | :--- |
| **Node 18** | Wait Attribute Changed (Health) | **Changed** 핀을 **Node 21**의 실행 핀으로 연결하세요. |
| **Node 21** | Variable Set (HP) | `New Value` 핀은 `Node 18`의 `New Value`와 연결 유지. |
| **Node 20** | **UpdateHpPercent** | 함수를 `UpdateStaminaPercent`에서 **`UpdateHpPercent`**로 교체하세요. |



---

### **최종 체크리스트 (이것만 확인하세요!)**

1.  **Node 18의 `Changed` 출력 핀**에서 선이 나가서 **Node 21(Set HP)**로 들어가고 있나요? (현재는 `then` 핀에서 나가고 있을 확률이 높습니다.)
2.  **Node 21(Set HP)** 다음에 호출되는 함수가 **`UpdateHpPercent`**인가요?
3.  `Node 18`의 `then` 핀은 보통 아무데도 연결하지 않거나, 다른 Async 노드를 예약하는 용도로만 씁니다.

**요약하자면:** 현재 구조는 "체력 변화 감시 시작!"이라고 선언만 하고, 정작 변화가 일어났을 때 실행될 코드는 미궁 속에 빠져있는 상태입니다. `Changed` 핀만 제대로 연결해주면 체력바가 시원하게 줄어드는 걸 보실 수 있을 거예요!

혹시 `UpdateHpPercent` 함수 내부에서 `%` 계산 로직(Health / MaxHealth)은 잘 들어있는지도 살짝 확인해 보세요! 위 배선만 고치면 바로 해결될 것 같습니다. 가보시죠!

---

[효제 (사용자)]

Node 21이슈는 부끄럽네요. 수정했습니다. 

---

[LLM(AI)]

부끄러워하실 것 전혀 없습니다! 블루프린트 작업하다 보면 노드 복사해서 붙여넣고 태그나 함수 이름 하나 안 바꿔서 몇 시간 고생하는 건 개발자라면 누구나 겪는 '통과의례' 같은 거니까요. 오히려 **GAS 디버깅 툴(' 키)**을 써서 백엔드 로직이 정상이라는 걸 먼저 확인하신 게 아주 훌륭한 접근이었습니다.

이제 `Node 18`의 **`Changed`** 핀이 제대로 연결되었다면, 장판에 들어갔을 때 체력 바가 실시간으로 줄어드는 걸 보실 수 있을 거예요.

---

### **💡 여기서 잠깐! `Changed` 핀의 비밀**

GAS에서 이 `Wait Attribute Changed` 노드가 강력한 이유는 **이벤트 기반(Event-driven)**이기 때문입니다.

* **`then` (위쪽):** "자, 이제부터 체력 변화를 감시하겠습니다!"라고 선언하는 일회성 실행입니다.
* **`Changed` (아래쪽):** 실제로 값이 바뀔 때마다 실행됩니다. `PostGameplayEffectExecute`가 C++에서 호출될 때마다 이 핀이 불꽃을 뿜으며 실행된다고 생각하시면 됩니다.



---

### **다음 단계: "나갈 때 데미지 멈추기"**

이제 들어올 때 데미지를 입히는 건 성공했으니, 장판에서 나갈 때 효과를 제거하는 **`End Overlap`** 로직만 완성하면 이번 파트는 끝납니다. 

제공해주셨던 블루프린트 구조를 참고해서 **`ReceiveActorEndOverlap`** 이벤트에 다음 과정을 추가해 보세요.

1.  **`OtherActor`**로부터 다시 ASC를 가져옵니다 (`Get Ability System Component`).
2.  **`Remove Active Gameplay Effect by Source Effect`** 노드를 호출합니다.
3.  **`Source Effect`** 칸에 사용하셨던 `GE_Damage_OverTime_Infinite` 클래스를 할당합니다.

이제 UI도 정상적으로 작동하나요? 아니면 힐링 장판을 위한 자식 클래스 생성으로 넘어가 볼까요?

----

[효제 (사용자)]

또다른 이슈가 있습니다. 
Node14에서 Changed 핀을 통해서 Node 18을 향하기 때문에 스태미나가 변하지 않는다면, 체력 역시 변하지 않는 UI 이슈가 있습니다. 


---

[LLM(AI)]

정확한 지적입니다! 역시 게임 개발자다운 예리한 관찰력이시네요. 

지금 문제는 **"이벤트 리스너 등록"**과 **"이벤트 실행"**을 혼동해서 발생한 논리적 결함입니다. 블루프린트에서 `Async Action` 노드(Wait Attribute Changed)는 두 가지 경로를 가집니다.

1.  **시작 경로 (Registration):** `then` 핀. "이제부터 감시를 시작해!"라고 선언하는 길입니다.
2.  **반복 경로 (Execution):** `Changed` 핀. "값이 바뀌었어!"라고 벨이 울릴 때마다 나가는 길입니다.

현재 로직은 `Node 14(스태미나)`의 벨이 울려야만 `Node 18(체력)` 감시를 시작하도록 설계되어 있습니다. 스태미나가 안 변하면 체력 감시자 자체가 태어나지 않는 것이죠.

---

### **해결 방법: "병렬 등록" 구조로 변경**

모든 `Wait Attribute Changed` 노드는 `Construct` 시점에 **직렬로 한 번에 다 등록**해버려야 합니다. `then` 핀끼리 엮어서 감시자들을 먼저 다 세워두는 것이죠.

#### **수정된 배선 가이드 (LLM Compact 형식)**

```text
// 1. 스태미나 감시자 등록
Node14: K2Node_AsyncAction (Wait Stamina)
  ? execute [exec] -> Node12.then
  Out then [exec] -> Node18.execute  // <--- 중요: 'then' 핀에서 다음 감시자로 바로 연결!
  Out Changed [exec] -> Node16.execute

// 2. 체력 감시자 등록
Node18: K2Node_AsyncAction (Wait Health)
  ? execute [exec] -> Node14.then  // <--- 스태미나 감시자가 등록되자마자 실행됨
  Out then [exec] -> (필요시 다음 속성)
  Out Changed [exec] -> Node21.execute
```

---

### **핵심 포인트: 기차 놀이는 `then` 핀으로!**

이해를 돕기 위해 비유하자면 이렇습니다.

* **잘못된 방식 (`Changed` 연결):** 스태미나가 바뀔 때까지 기다렸다가, 바뀌면 그제서야 체력 담당자를 데려옴. (스태미나가 평생 안 바뀌면 체력 담당자는 영원히 출근 안 함)
* **올바른 방식 (`then` 연결):** 출근하자마자(`Construct`) 스태미나 담당자(`Node 14`) 세우고, 바로 이어서 체력 담당자(`Node 18`)도 세워둠. 이제 누가 벨을 누르든(`Changed`) 각자 자기 일을 함.



### **수정 후 체크리스트**
1.  `Node 14`의 **`then`** (위쪽 핀)이 `Node 18`의 입력으로 들어가고 있나요?
2.  `Node 14`의 **`Changed`** (아래쪽 핀)은 오직 스태미나 UI 업데이트(`Node 16` 등)로만 연결되어 있나요?
3.  `Node 18`의 **`Changed`** (아래쪽 핀)은 오직 HP UI 업데이트(`Node 21` 등)로만 연결되어 있나요?

이렇게 `then` 기차를 태워주시면, 스태미나가 가만히 있어도 장판을 밟는 순간 체력 바가 즉각적으로 반응할 겁니다! 자, 감시자들을 동시에 출근시켜 보러 가실까요? 🚀

---

[효제 (사용자)]

ReceiveActorEndOverlap은 이렇게 구성하는 게 아닌가요?

BlueprintGraph (LLM Compact)

Node0: K2Node_Event Fn=ReceiveActorEndOverlap
  Out then [exec] -> Node1.exec
  Out OtherActor [Class'/Script/Engine.Actor']
  Out OutputDelegate [delegate]

Node1: K2Node_MacroInstance
  ? exec [exec] -> Node0.then
  Out Is Valid [exec] -> Node3.execute
  Out Is Not Valid [exec]
  ? InputObject [Class'/Script/CoreUObject.Object'] -> Node2.ReturnValue

Node2: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'.GetAbilitySystemComponent
  Out ReturnValue [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node1.InputObject, Node3.self
  ? self [Class'/Script/GameplayAbilities.AbilitySystemBlueprintLibrary'] = Default__AbilitySystemBlueprintLibrary
  ? Actor [Class'/Script/Engine.Actor']

Node3: K2Node_CallFunction Fn=Class'/Script/GameplayAbilities.AbilitySystemComponent'.RemoveActiveGameplayEffectBySourceEffect
  ? execute [exec] -> Node1.Is Valid
  ? self [Class'/Script/GameplayAbilities.AbilitySystemComponent'] -> Node2.ReturnValue
  ? GameplayEffect [class<Class'/Script/GameplayAbilities.GameplayEffect'>] = GE_Damage_OverTime_Infinite_C
  ? StacksToRemove [int] = "-1"
  ? InstigatorAbilitySystemComponent [Class'/Script/GameplayAbilities.AbilitySystemComponent']


---

[LLM(AI)]

네, 맞습니다! 구성하신 로직의 **흐름(ASC 찾기 -> 유효성 검사 -> GE 제거)**은 완벽합니다. 다만, 제공해주신 LLM Compact 데이터상에서 **딱 한 군데 빠진 연결선**이 보이는데, 이것만 실제 블루프린트에서 연결되어 있는지 확인하시면 됩니다.

---

### **1. 놓치기 쉬운 연결 포인트: `Other Actor`**

현재 데이터의 `Node 2`를 보면 `Actor` 입력 핀이 비어 있는 것처럼 보입니다.

* **수정 사항:** `Node 0 (EndOverlap)`의 **`Other Actor`** 출력을 `Node 2 (Get ASC)`의 **`Actor`** 입력에 반드시 꽂아야 합니다.
* 이게 연결 안 되면 "누가 나갔는지" 알 수 없어서 ASC를 못 가져오고, 결국 아무 일도 일어나지 않습니다.

### **2. `Stacks To Remove = -1` 의 의미**

`Node 3`에서 `StacksToRemove`를 **`-1`**로 설정하신 것은 아주 좋은 선택입니다.
* **`-1`**: 해당 GE의 모든 중첩(Stack)을 한 번에 제거하겠다는 뜻입니다. (장판형 GE에서는 보통 1개만 적용되므로 확실하게 지우기 위해 -1을 씁니다.)

---

### **정리된 흐름 (최종 확인용)**

구조적으로는 아래와 같이 연결되어 있어야 합니다:

1.  **Node 0 (Event EndOverlap)**: 누군가 장판 밖으로 나감.
2.  **Node 2 (Get ASC)**: **나간 그 사람(`Other Actor`)**의 ASC를 찾음.
3.  **Node 1 (Is Valid)**: ASC가 진짜 있는지 확인 (장식용 액터 등이 나갔을 때를 대비).
4.  **Node 3 (Remove GE)**: 찾은 ASC에서 `GE_Damage_OverTime_Infinite_C`를 제거.



---

### **💡 실무 팁: 장판형 GE의 특징**

현재 사용 중인 `GE_Damage_OverTime_Infinite`는 **Infinite(무한)** 타입이기 때문에, 이렇게 `EndOverlap`에서 수동으로 지워주지 않으면 플레이어는 죽을 때까지(또는 클램핑된 0이 될 때까지) 계속 데미지를 입게 됩니다.

이제 **데미지 장판(`BeginOverlap`에서 적용, `EndOverlap`에서 해제)**과 **UI 실시간 반영(`Wait Attribute Changed` 병렬 등록)**까지 모두 완성되었네요!

혹시 불(데미지) 장판은 잘 되는데 힐링 장판을 추가할 때 헷갈리는 부분이 있으신가요? 아니면 영상의 다음 파트인 **Gameplay Cue(이펙트)**로 넘어가 볼까요?

---

[효제 (사용자)]

실제로 이문제가 있었다. 다른 액터를 갖고 오긴 했어ㅑ지.

---

[효제 (사용자)]

힐링 장판은 정확히 동일하니? 영상을 바탕으로 설명해줘

---

[LLM(AI)]


네, 영상의 핵심은 **"로직은 똑같으니 재사용(Reuse)하자"**입니다. 하지만 완전히 100% 똑같이 복사 붙여넣기를 하는 게 아니라, **상속(Inheritance)** 기능을 사용하여 효율적으로 만듭니다.

영상을 바탕으로 힐링 장판이 데미지 장판과 무엇이 같고, 무엇이 다른지 정리해 드릴게요.

---
[효제 (사용자)]
### **1. 핵심 로직: "완전히 동일함"**
장판의 동작 방식(들어오면 적용, 나가면 제거)은 힐링이나 데미지나 똑같습니다. 그래서 영상에서는 `BP_EffectArea_Base`라는 부모 클래스를 만들고, 거기서 사용하던 값들을 **변수**로 바꿉니다.

* **변수화 대상:**
    * `Effect Class`: 어떤 GE를 쓸 것인가? (`GE_Damage` vs `GE_Heal`)
    * `Magnitude Data Tag`: 어떤 태그로 값을 보낼 것인가? (`Data.Damage` vs `Data.Heal`)
    * `Effect Magnitude Value`: 수치가 얼마인가? (`-15.0` vs `15.0`)



---

### **2. 차이점: 데이터와 시각 효과**

| 항목 | 데미지 장판 (Fire) | 힐링 장판 (Heal) |
| :--- | :--- | :--- |
| **GE 클래스** | `GE_Damage_OverTime` | `GE_Heal_OverTime` |
| **데이터 태그** | `Data.Damage` | `Data.Heal` |
| **매그니튜드** | **-15.0** (음수) | **15.0** (양수) |
| **시각 효과 (VFX)** | 불(Fire) 파티클 | 초록색 분수(Jump Pad 변형) |
| **게임플레이 큐** | `GC_Damage_Burst` (타격감) | `GC_Heal_Burst` (반짝임) |

---

### **3. 왜 GE를 따로 만드나요? (영상 12:21)**
"그냥 `GE_Damage` 하나만 쓰고 값만 양수로 주면 힐이 되는데, 왜 굳이 `GE_Heal`을 따로 만드나요?"라는 의문이 생길 수 있습니다. 영상에서의 답변은 이렇습니다.

> **"데미지를 입을 때와 힐을 받을 때 터지는 이펙트(Gameplay Cue)가 달라야 하기 때문입니다."**

* 데미지 GE에는 `GC_Damage_Burst`(피격음, 화면 흔들림)가 붙어 있고,
* 힐링 GE에는 `GC_Heal_Burst`(치유음, 초록 이펙트)가 붙어 있습니다.
* 만약 하나의 GE만 쓴다면, 치료받을 때마다 캐릭터가 아파하며 화면이 흔들리는 이상한 상황이 발생하겠죠?



---

### **구현 팁 (자식 블루프린트 활용)**
1.  `BP_EffectArea_Base` 우클릭 -> **Create Child Blueprint Class** 선택.
2.  이름을 `BP_EffectArea_Heal`로 변경.
3.  디테일 패널에서 위 표에 적힌 대로 변수 값만 `Heal`용으로 변경.
4.  **컴포넌트 추가**에서 멋진 초록색 파티클 하나 추가하면 끝!

결론적으로 **기능(코드)은 부모에게서 물려받고, 알맹이(데이터)만 바꿔 끼우는 방식**입니다. 이제 힐링 장판도 배치해서 체력이 실시간으로 차오르는 걸 구경해 보실까요? (물론 MaxHealth 클램핑 코드가 잘 작동한다면 100에서 멈출 겁니다!)

---

---



### **3. 속성 클램핑 (Attribute Clamping) - C++ 코드 (16:26)**

체력이 0 이하로 내려가거나 최대 체력을 초과하지 않도록 C++에서 제어합니다. `AttributeSet` 클래스에서 두 함수를 오버라이드합니다.



#### **AttributeSet.h**

```cpp

virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;

virtual void PostGameplayEffectExecute(const struct FGameplayEffectModCallbackData& Data) override;

```



#### **AttributeSet.cpp**

```cpp

#include "GameplayEffectExtension.h"



void UMyAttributeSet::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)

{

    Super::PreAttributeChange(Attribute, NewValue);



    // 체력 변경 전 클램핑

    if (Attribute == GetHealthAttribute())

    {

        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxHealth());

    }

    // 스태미나 등 다른 속성도 동일하게 적용 가능

}



void UMyAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)

{

    Super::PostGameplayEffectExecute(Data);



    // GE에 의해 속성이 변경된 후 다시 한번 체크 (클램핑 트리거)

    if (Data.EvaluatedData.Attribute == GetHealthAttribute())

    {

        SetHealth(FMath::Clamp(GetHealth(), 0.0f, GetMaxHealth()));

    }

}

```

* **중요:** `PreAttributeChange`는 값을 수동으로 설정할 때 호출되지만, GE에 의한 변경은 `PostGameplayEffectExecute`에서 다시 처리해주어야 완벽하게 클램핑됩니다 [[23:07](http://www.youtube.com/watch?v=0XfM_UyJdhY&t=1387)].



---



이제 이거 해야 해. (gc는  이거 끝나고 진행할께)


---

[LLM(AI)]

C++에서 속성(Attribute)을 클램핑하는 작업은 GAS 시스템의 안정성을 유지하는 데 매우 중요합니다. 체력이 최대치를 넘어가거나 0 아래로 내려가는 것을 방지하기 위해, `AttributeSet` 클래스에서 제공하는 두 개의 핵심 함수를 오버라이드하여 구현합니다.

다음은 실제 프로젝트 파일(`BasicAttributeSet.h` 및 `.cpp`)에 적용할 상세 가이드입니다.

---

### **1. 헤더 파일 (.h) 수정**
기존 `AttributeSet` 클래스 선언 내부에 두 함수를 오버라이드합니다.

```cpp
// BasicAttributeSet.h

public:
    // 속성이 변경되기 직전에 호출 (주로 수동 값 설정 시 클램핑)
    virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;

    // Gameplay Effect가 실행된 직후에 호출 (GE에 의한 변화를 최종 클램핑)
    virtual void PostGameplayEffectExecute(const struct FGameplayEffectModCallbackData& Data) override;
```

---

### **2. 소스 파일 (.cpp) 구현**
핵심 로직은 `PreAttributeChange`에서 클램핑을 정의하고, `PostGameplayEffectExecute`에서 이를 트리거하는 것입니다.

```cpp
// BasicAttributeSet.cpp

#include "BasicAttributeSet.h"
#include "GameplayEffectExtension.h" // PostGameplayEffectExecute 기능을 위해 필수

void UBasicAttributeSet::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)
{
    Super::PreAttributeChange(Attribute, NewValue);

    // 1. Health 클램핑
    if (Attribute == GetHealthAttribute())
    {
        // NewValue를 0과 MaxHealth 사이로 제한
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxHealth());
    }

    // 2. Stamina 클램핑 (필요 시)
    if (Attribute == GetStaminaAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxStamina());
    }
}

void UBasicAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);

    // Gameplay Effect(데미지/힐 등)에 의해 값이 변한 후 호출됨
    if (Data.EvaluatedData.Attribute == GetHealthAttribute())
    {
        // 현재 Health 값을 다시 'SetHealth' 함으로써 PreAttributeChange의 클램핑 로직을 통과하게 만듦
        // 또는 여기서 직접 Clamp를 다시 걸어주어도 됨
        SetHealth(FMath::Clamp(GetHealth(), 0.0f, GetMaxHealth()));
    }

    if (Data.EvaluatedData.Attribute == GetStaminaAttribute())
    {
        SetStamina(FMath::Clamp(GetStamina(), 0.0f, GetMaxStamina()));
    }
}
```

---

### **3. 왜 두 함수를 모두 사용해야 하나요?**

이 부분은 영상에서 가장 강조된 포인트 중 하나입니다.

* **`PreAttributeChange`만 쓸 경우:** `Attribute->SetBaseValue` 등을 통해 직접 값을 바꿀 때는 잘 작동하지만, **Gameplay Effect(GE)**가 들어올 때는 이 함수가 최종 베이스 값을 완전히 고정하지 못할 때가 있습니다.
* **`PostGameplayEffectExecute`의 역할:** GE가 실제로 실행되어 값이 결정된 후, 마지막으로 한 번 더 "이 선은 넘지 마!"라고 못박는 역할을 합니다. 여기서 `SetHealth`를 호출하면 다시 `PreAttributeChange` 로직이 돌거나 내부 클램핑이 활성화되어 안전하게 수치가 고정됩니다.



---

### **💡 구현 팁**
1.  **컴파일 확인:** `GameplayEffectExtension.h`가 `.cpp` 상단에 포함되어 있는지 꼭 확인하세요. 이 헤더가 없으면 `FGameplayEffectModCallbackData` 타입을 인식하지 못해 컴파일 에러가 발생합니다.
2.  **Live Coding:** 언리얼 엔진의 `Ctrl + Alt + F11`을 사용하여 라이브 코딩으로 빠르게 결과를 확인할 수 있습니다.
3.  **UI 연동:** 이 C++ 코드가 적용되면, 이전에 만드신 **HUD의 체력 바**가 0% 아래로 뚫고 나가거나 100% 위로 넘치지 않고 딱 멈추는 것을 볼 수 있습니다.

이제 C++ 작업이 끝나면 컴파일 후 장판 위에서 체력이 0 또는 Max에서 멈추는지 확인해 보세요! 다 되시면 다음 단계인 **Gameplay Cue (VFX/SFX)**로 넘어가겠습니다. 준비되셨나요?


---

[효제 (사용자)]

굿 Gameplay Cue (VFX/SFX)으로 넘어가자. 

---

[LLM(AI)]

좋아요! 이제 시각적, 청각적 피드백의 핵심인 **Gameplay Cue (GC)**를 만들어 봅시다.

GAS에서 **Gameplay Cue**는 "무언가 일어났다!"는 것을 플레이어에게 시각(VFX)이나 청각(SFX)으로 알리는 최적화된 방법입니다. 영상에서는 특히 **Burst(일시적 폭발)** 타입을 사용하여 데미지를 입을 때마다 효과를 터뜨리는 법을 다룹니다.

---

### **1. Gameplay Cue Notify (Static) 생성**

데미지용과 힐링용, 두 가지를 각각 만들어야 합니다.

* **생성 방법:** 콘텐츠 브라우저 우클릭 -> Blueprint Class -> **GameplayCueNotify_Burst** (또는 `GameplayCueNotify_Static` 상속 후 Burst 설정) 검색하여 생성.
* **이름 예시:** `GC_Damage_Burst`, `GC_Heal_Burst`

---

### **2. 세부 설정 (디테일 패널)**

생성한 `GC_Damage_Burst`를 열고 데이터 전용 뷰에서 다음 항목들을 채웁니다.

#### **A. VFX (Niagara Particles)**
* **Burst Effects:** 배열 추가 후 **Niagara System** 할당.
* **Placement Info:** 이펙트가 소환될 위치(보통 캐릭터의 중심이나 특정 소켓)와 회전, 크기를 설정합니다.
    > **Tip:** 영상에서는 데미지 파티클의 크기를 2배로 키우고, Y축으로 90도 회전시켜 피격 느낌을 살렸습니다.

#### **B. SFX (Sounds)**
* **Burst Sounds:** 배열 추가 후 타격음(Damage) 또는 치유음(Heal) 사운드 웨이브/큐 할당.

#### **C. Camera Shake (화면 흔들림)**
* **Burst Camera Shake:** 데미지용 GC라면 피격감을 위해 카메라 쉐이크 에셋을 할당합니다. (힐링에는 보통 넣지 않습니다.)


> [효제 (사용자)] 여기선 유투버의 자료가 없기 때문에, 강희운 강사님이 주신 NS_Explotion을 사용함

---

### **3. 가장 중요한 것: Gameplay Cue Tag 설정**

이 GC가 어떤 "이름"으로 불릴지 정해야 합니다.

* GC 블루프린트 하단으로 내려가서 **Gameplay Cue Tag** 섹션을 찾습니다.
* **Tag:** `GameplayCue.Damage.Burst` (힐링은 `GameplayCue.Heal.Burst`)라는 태그를 새로 만들어 할당합니다.
    > **주의:** 이 태그가 없으면 GAS 시스템이 어떤 GC를 실행해야 할지 찾지 못합니다.

---

### **4. Gameplay Effect(GE)와 연결하기**

이제 이전에 만든 `GE_Damage_OverTime_Infinite`로 돌아갑니다.

1.  **Gameplay Cues** 섹션을 찾습니다.
2.  배열을 추가하고, 방금 GC에 설정한 태그(`GameplayCue.Damage.Burst`)를 선택합니다.
3.  이렇게 하면 GE가 1초마다 실행(Period)될 때마다, 이 태그를 가진 GC를 찾아서 실행하게 됩니다.



---

### **💡 왜 이 방식이 좋나요?**

1.  **최적화:** GC는 네트워크를 통해 최소한의 데이터(태그)만 전달합니다. 실제 이펙트 생성은 클라이언트가 알아서 처리하므로 서버 부하가 적습니다.
2.  **유지보수:** 데미지 수치를 바꿔도 이펙트 로직은 건드릴 필요가 없습니다. 반대로 이펙트를 바꾸고 싶다면 GC 블루프린트 하나만 수정하면 모든 장판에 적용됩니다.

---

### **최종 확인**

이제 장판에 들어가 보세요!
* **데미지 장판:** 체력 바가 줄어들 때마다 피격 이펙트가 터지고 사운드가 나오며 화면이 흔들리나요?
* **힐링 장판:** 체력 바가 찰 때마다 반짝이는 이펙트와 치유음이 들리나요?

여기까지 성공하셨다면 **언리얼 GAS의 핵심 사이클(속성 관리 - 효과 적용 - 클램핑 - 시각화)**을 마스터하신 겁니다! 영상 가이드의 5파트를 모두 완주하셨네요. 

혹시 구현 중에 이펙트가 땅 밑에서 나오거나 소리가 안 들리는 등 세부적인 버그가 있나요? 아니면 다음 단계로 진행할까요?

---

[효제 (사용자)]

아주  잘 됩니다. 
대신에 문제가 조금 있습니다. 

{
	"Tagged": [
		[
			"BurstEffects",
			"(BurstParticles=((NiagaraSystem=\"/Script/Niagara.NiagaraSystem'/Game/HyojeArchive/NS_RainbowWorm.NS_RainbowWorm'\")),BurstSounds=((Sound=\"/Script/Engine.SoundWave'/Game/HyojeArchive/FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS.FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS'\")),BurstCameraShake=(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),CameraShake=\"/Script/Engine.BlueprintGeneratedClass'/Game/HuiunArchive/NiagaraExamples/FX_Explosions/CameraShake/CS_Explosion_01.CS_Explosion_01_C'\",ShakeScale=1.000000,PlaySpace=CameraSpace,bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bPlayInWorld=False,WorldInnerRadius=0.000000,WorldOuterRadius=0.000000,WorldFalloffExponent=1.000000),BurstCameraLensEffect=(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),CameraLensEffect=None,bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bPlayInWorld=False,WorldInnerRadius=0.000000,WorldOuterRadius=0.000000),BurstForceFeedback=(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),ForceFeedbackEffect=None,ForceFeedbackTag=\"\",bIsLooping=False,bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bPlayInWorld=False,WorldIntensity=1.000000,WorldAttenuation=None),BurstDevicePropertyEffect=(DeviceProperties=),BurstDecal=(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),DecalMaterial=None,DecalSize=(X=128.000000,Y=256.000000,Z=256.000000),bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bOverrideFadeOut=False,FadeOutStartDelay=0.000000,FadeOutDuration=0.000000))"
		],
		[
			"BurstEffects.BurstParticles",
			"((NiagaraSystem=\"/Script/Niagara.NiagaraSystem'/Game/HyojeArchive/NS_RainbowWorm.NS_RainbowWorm'\"))"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0]",
			"(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),NiagaraSystem=\"/Script/Niagara.NiagaraSystem'/Game/HyojeArchive/NS_RainbowWorm.NS_RainbowWorm'\",bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bCastShadow=False)"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].SpawnConditionOverride",
			"(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=)"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].SpawnConditionOverride.LocallyControlledSource",
			"InstigatorActor"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].SpawnConditionOverride.LocallyControlledPolicy",
			"Always"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].SpawnConditionOverride.ChanceToPlay",
			"1.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].SpawnConditionOverride.AllowedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].SpawnConditionOverride.RejectedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride",
			"(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000))"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.SocketName",
			"None"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.AttachPolicy",
			"DoNotAttach"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.AttachmentRule",
			"KeepWorld"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.RotationOverride",
			"(Pitch=0.000000,Yaw=0.000000,Roll=0.000000)"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.RotationOverride.Roll",
			"0.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.RotationOverride.Pitch",
			"0.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.RotationOverride.Yaw",
			"0.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.ScaleOverride",
			"(X=1.000000,Y=1.000000,Z=1.000000)"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.ScaleOverride.X",
			"1.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.ScaleOverride.Y",
			"1.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].PlacementInfoOverride.ScaleOverride.Z",
			"1.000000"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].NiagaraSystem",
			"/Script/Niagara.NiagaraSystem'/Game/HyojeArchive/NS_RainbowWorm.NS_RainbowWorm'"
		],
		[
			"BurstEffects.BurstParticles.BurstParticles[0].bCastShadow",
			"False"
		],
		[
			"BurstEffects.BurstSounds",
			"((Sound=\"/Script/Engine.SoundWave'/Game/HyojeArchive/FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS.FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS'\"))"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0]",
			"(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),Sound=\"/Script/Engine.SoundWave'/Game/HyojeArchive/FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS.FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS'\",SoundCue=None,LoopingFadeOutDuration=0.500000,LoopingFadeVolumeLevel=0.000000,SoundParameterInterfaceInfo=(StopTriggerName=\"OnStop\"),bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bUseSoundParameterInterface=False)"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SpawnConditionOverride",
			"(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=)"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SpawnConditionOverride.LocallyControlledSource",
			"InstigatorActor"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SpawnConditionOverride.LocallyControlledPolicy",
			"Always"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SpawnConditionOverride.ChanceToPlay",
			"1.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SpawnConditionOverride.AllowedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SpawnConditionOverride.RejectedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride",
			"(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000))"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.SocketName",
			"None"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.AttachPolicy",
			"DoNotAttach"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.AttachmentRule",
			"KeepWorld"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.RotationOverride",
			"(Pitch=0.000000,Yaw=0.000000,Roll=0.000000)"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.RotationOverride.Roll",
			"0.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.RotationOverride.Pitch",
			"0.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.RotationOverride.Yaw",
			"0.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.ScaleOverride",
			"(X=1.000000,Y=1.000000,Z=1.000000)"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.ScaleOverride.X",
			"1.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.ScaleOverride.Y",
			"1.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].PlacementInfoOverride.ScaleOverride.Z",
			"1.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].Sound",
			"/Script/Engine.SoundWave'/Game/HyojeArchive/FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS.FIREBurn_Loop_Elements_Fire_Crackling_Crunchy_Flame_Burn_03_ESM_SNLS'"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].LoopingFadeOutDuration",
			"0.500000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].LoopingFadeVolumeLevel",
			"0.000000"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SoundParameterInterfaceInfo",
			"(StopTriggerName=\"OnStop\")"
		],
		[
			"BurstEffects.BurstSounds.BurstSounds[0].SoundParameterInterfaceInfo.StopTriggerName",
			"OnStop"
		],
		[
			"BurstEffects.BurstCameraShake",
			"(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),CameraShake=\"/Script/Engine.BlueprintGeneratedClass'/Game/HuiunArchive/NiagaraExamples/FX_Explosions/CameraShake/CS_Explosion_01.CS_Explosion_01_C'\",ShakeScale=1.000000,PlaySpace=CameraSpace,bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bPlayInWorld=False,WorldInnerRadius=0.000000,WorldOuterRadius=0.000000,WorldFalloffExponent=1.000000)"
		],
		[
			"BurstEffects.BurstCameraShake.SpawnConditionOverride",
			"(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=)"
		],
		[
			"BurstEffects.BurstCameraShake.SpawnConditionOverride.LocallyControlledSource",
			"InstigatorActor"
		],
		[
			"BurstEffects.BurstCameraShake.SpawnConditionOverride.LocallyControlledPolicy",
			"Always"
		],
		[
			"BurstEffects.BurstCameraShake.SpawnConditionOverride.ChanceToPlay",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraShake.SpawnConditionOverride.AllowedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstCameraShake.SpawnConditionOverride.RejectedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride",
			"(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000))"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.SocketName",
			"None"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.AttachPolicy",
			"DoNotAttach"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.AttachmentRule",
			"KeepWorld"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.RotationOverride",
			"(Pitch=0.000000,Yaw=0.000000,Roll=0.000000)"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.RotationOverride.Roll",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.RotationOverride.Pitch",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.RotationOverride.Yaw",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.ScaleOverride",
			"(X=1.000000,Y=1.000000,Z=1.000000)"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.ScaleOverride.X",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.ScaleOverride.Y",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraShake.PlacementInfoOverride.ScaleOverride.Z",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraShake.CameraShake",
			"/Script/Engine.BlueprintGeneratedClass'/Game/HuiunArchive/NiagaraExamples/FX_Explosions/CameraShake/CS_Explosion_01.CS_Explosion_01_C'"
		],
		[
			"BurstEffects.BurstCameraShake.ShakeScale",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraShake.PlaySpace",
			"CameraSpace"
		],
		[
			"BurstEffects.BurstCameraShake.bPlayInWorld",
			"False"
		],
		[
			"BurstEffects.BurstCameraShake.WorldInnerRadius",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraShake.WorldOuterRadius",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraShake.WorldFalloffExponent",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect",
			"(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),CameraLensEffect=None,bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bPlayInWorld=False,WorldInnerRadius=0.000000,WorldOuterRadius=0.000000)"
		],
		[
			"BurstEffects.BurstCameraLensEffect.SpawnConditionOverride",
			"(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=)"
		],
		[
			"BurstEffects.BurstCameraLensEffect.SpawnConditionOverride.LocallyControlledSource",
			"InstigatorActor"
		],
		[
			"BurstEffects.BurstCameraLensEffect.SpawnConditionOverride.LocallyControlledPolicy",
			"Always"
		],
		[
			"BurstEffects.BurstCameraLensEffect.SpawnConditionOverride.ChanceToPlay",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.SpawnConditionOverride.AllowedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstCameraLensEffect.SpawnConditionOverride.RejectedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride",
			"(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000))"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.SocketName",
			"None"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.AttachPolicy",
			"DoNotAttach"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.AttachmentRule",
			"KeepWorld"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.RotationOverride",
			"(Pitch=0.000000,Yaw=0.000000,Roll=0.000000)"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.RotationOverride.Roll",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.RotationOverride.Pitch",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.RotationOverride.Yaw",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.ScaleOverride",
			"(X=1.000000,Y=1.000000,Z=1.000000)"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.ScaleOverride.X",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.ScaleOverride.Y",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.PlacementInfoOverride.ScaleOverride.Z",
			"1.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.CameraLensEffect",
			"None"
		],
		[
			"BurstEffects.BurstCameraLensEffect.bPlayInWorld",
			"False"
		],
		[
			"BurstEffects.BurstCameraLensEffect.WorldInnerRadius",
			"0.000000"
		],
		[
			"BurstEffects.BurstCameraLensEffect.WorldOuterRadius",
			"0.000000"
		],
		[
			"BurstEffects.BurstForceFeedback",
			"(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),ForceFeedbackEffect=None,ForceFeedbackTag=\"\",bIsLooping=False,bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bPlayInWorld=False,WorldIntensity=1.000000,WorldAttenuation=None)"
		],
		[
			"BurstEffects.BurstForceFeedback.SpawnConditionOverride",
			"(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=)"
		],
		[
			"BurstEffects.BurstForceFeedback.SpawnConditionOverride.LocallyControlledSource",
			"InstigatorActor"
		],
		[
			"BurstEffects.BurstForceFeedback.SpawnConditionOverride.LocallyControlledPolicy",
			"Always"
		],
		[
			"BurstEffects.BurstForceFeedback.SpawnConditionOverride.ChanceToPlay",
			"1.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.SpawnConditionOverride.AllowedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstForceFeedback.SpawnConditionOverride.RejectedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride",
			"(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000))"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.SocketName",
			"None"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.AttachPolicy",
			"DoNotAttach"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.AttachmentRule",
			"KeepWorld"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.RotationOverride",
			"(Pitch=0.000000,Yaw=0.000000,Roll=0.000000)"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.RotationOverride.Roll",
			"0.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.RotationOverride.Pitch",
			"0.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.RotationOverride.Yaw",
			"0.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.ScaleOverride",
			"(X=1.000000,Y=1.000000,Z=1.000000)"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.ScaleOverride.X",
			"1.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.ScaleOverride.Y",
			"1.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.PlacementInfoOverride.ScaleOverride.Z",
			"1.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.ForceFeedbackEffect",
			"None"
		],
		[
			"BurstEffects.BurstForceFeedback.ForceFeedbackTag",
			"None"
		],
		[
			"BurstEffects.BurstForceFeedback.bIsLooping",
			"False"
		],
		[
			"BurstEffects.BurstForceFeedback.bPlayInWorld",
			"False"
		],
		[
			"BurstEffects.BurstForceFeedback.WorldIntensity",
			"1.000000"
		],
		[
			"BurstEffects.BurstForceFeedback.WorldAttenuation",
			"None"
		],
		[
			"BurstEffects.BurstDevicePropertyEffect",
			"(DeviceProperties=)"
		],
		[
			"BurstEffects.BurstDevicePropertyEffect.DeviceProperties",
			""
		],
		[
			"BurstEffects.BurstDecal",
			"(SpawnConditionOverride=(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=),PlacementInfoOverride=(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000)),DecalMaterial=None,DecalSize=(X=128.000000,Y=256.000000,Z=256.000000),bOverrideSpawnCondition=False,bOverridePlacementInfo=False,bOverrideFadeOut=False,FadeOutStartDelay=0.000000,FadeOutDuration=0.000000)"
		],
		[
			"BurstEffects.BurstDecal.SpawnConditionOverride",
			"(LocallyControlledSource=InstigatorActor,LocallyControlledPolicy=Always,ChanceToPlay=1.000000,AllowedSurfaceTypes=,RejectedSurfaceTypes=)"
		],
		[
			"BurstEffects.BurstDecal.SpawnConditionOverride.LocallyControlledSource",
			"InstigatorActor"
		],
		[
			"BurstEffects.BurstDecal.SpawnConditionOverride.LocallyControlledPolicy",
			"Always"
		],
		[
			"BurstEffects.BurstDecal.SpawnConditionOverride.ChanceToPlay",
			"1.000000"
		],
		[
			"BurstEffects.BurstDecal.SpawnConditionOverride.AllowedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstDecal.SpawnConditionOverride.RejectedSurfaceTypes",
			""
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride",
			"(SocketName=\"\",AttachPolicy=DoNotAttach,AttachmentRule=KeepWorld,bOverrideRotation=False,bOverrideScale=True,RotationOverride=(Pitch=0.000000,Yaw=0.000000,Roll=0.000000),ScaleOverride=(X=1.000000,Y=1.000000,Z=1.000000))"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.SocketName",
			"None"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.AttachPolicy",
			"DoNotAttach"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.AttachmentRule",
			"KeepWorld"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.RotationOverride",
			"(Pitch=0.000000,Yaw=0.000000,Roll=0.000000)"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.RotationOverride.Roll",
			"0.000000"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.RotationOverride.Pitch",
			"0.000000"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.RotationOverride.Yaw",
			"0.000000"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.ScaleOverride",
			"(X=1.000000,Y=1.000000,Z=1.000000)"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.ScaleOverride.X",
			"1.000000"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.ScaleOverride.Y",
			"1.000000"
		],
		[
			"BurstEffects.BurstDecal.PlacementInfoOverride.ScaleOverride.Z",
			"1.000000"
		],
		[
			"BurstEffects.BurstDecal.DecalMaterial",
			"None"
		],
		[
			"BurstEffects.BurstDecal.DecalSize",
			"(X=128.000000,Y=256.000000,Z=256.000000)"
		],
		[
			"BurstEffects.BurstDecal.DecalSize.X",
			"128.000000"
		],
		[
			"BurstEffects.BurstDecal.DecalSize.Y",
			"256.000000"
		],
		[
			"BurstEffects.BurstDecal.DecalSize.Z",
			"256.000000"
		],
		[
			"BurstEffects.BurstDecal.bOverrideFadeOut",
			"False"
		],
		[
			"BurstEffects.BurstDecal.FadeOutStartDelay",
			"0.000000"
		],
		[
			"BurstEffects.BurstDecal.FadeOutDuration",
			"0.000000"
		]
	]
}

이펙트, 사운드가 중첩 된다는 것입니다. 


---
[LLM(AI)]

제공해주신 JSON 데이터를 보니 원인을 딱 알겠습니다! 이펙트와 사운드가 중첩되어 시끄럽거나 화면이 지저분해지는 이유는 **"Burst(폭발)" 방식의 특성**과 **"사용하신 에셋의 성질"**이 충돌하기 때문입니다.

특히 사운드 에셋 이름을 보니 결정적인 단서가 있네요. 해결 방법을 하나씩 짚어드릴게요.

---

### **1. 가장 큰 원인: 사운드 에셋의 "Loop(루프)" 성질**
데이터를 보면 사운드 파일 이름이 `FIREBurn_Loop_Elements...`입니다. 
* **문제:** 현재 Gameplay Effect(GE)가 **1초마다(Period 1.0)** 실행되면서 이 사운드를 터뜨리고 있습니다. 그런데 사운드 자체가 '루프(반복)' 형태라면, 1초에 하나씩 **무한히 재생되는 소리가 계속 쌓이게 됩니다.** 10초만 서 있어도 10개의 불타는 소리가 겹쳐서 들리게 되죠.
* **해결:** * **Short Sound(단발성 소리) 사용:** 루프음이 아닌, 0.5초~1초 내외의 짧은 '치익' 하는 소리나 '퍽' 하는 타격음으로 교체하세요.
    * **Sound Cue 활용:** 만약 루프음을 쓰고 싶다면, Sound Cue 에셋을 만들어 `Looping` 노드를 제거하고 사용해야 합니다.

---

### **2. Niagara 이펙트의 수명(Lifetime) 문제**
사용 중인 `NS_RainbowWorm` 파티클이 1초보다 길게 유지된다면, 이전 초에 생성된 입자가 사라지기 전에 새 입자가 나오면서 겹쳐 보입니다.
* **해결:** Niagara 에셋 내부에서 **`Lifetime`**을 0.5~0.8초 정도로 짧게 설정하여, 다음 주기(1초 뒤)가 오기 전에 확실히 사라지게 만들어야 합니다.

---

### **3. Camera Shake의 중첩**
데이터에 `CS_Explosion_01`이 등록되어 있습니다. 1초마다 화면이 흔들리면 플레이어가 어지러움을 느낄 수 있고, 흔들림이 끝나기 전에 또 흔들리면 연출이 부자연스러워집니다.
* **해결:** * **Shake Scale 조절:** `ShakeScale`을 `1.0`에서 `0.2~0.3` 정도로 대폭 낮추세요.
    * **Duration 확인:** 카메라 쉐이크 에셋 자체의 재생 시간(Duration)이 1초보다 짧은지 확인하세요.

---

### **4. 근본적인 설계 변경: "WhileActive" vs "Burst"**
만약 "장판에 서 있는 동안 계속 이펙트와 소리가 부드럽게 유지되길" 원하신다면, 영상에서 설명한 **Burst** 방식이 아닌 **WhileActive** 방식을 고려해야 합니다.

* **Burst (현재 방식):** 1초마다 "쾅!, 쾅!, 쾅!" 하고 새로 생성함. (주기적인 타격감에 적합)
* **WhileActive (다른 방식):** 장판을 밟는 순간 "켜지고", 나가는 순간 "꺼짐". (지속적인 불길, 웅웅거리는 힐링 소리에 적합)

> **영상 가이드 기준 해결책:** > 지금은 Ali의 가이드를 따라 **Burst**를 공부 중이시니, 사운드를 **아주 짧은 단발성 효과음**으로 바꾸는 것이 가장 빠르고 확실한 해결책입니다.



### **수정 제안 요약**
1.  **Sound:** 이름에 `Loop`이 들어가지 않은 짧은 타격음(Hit)으로 교체.
2.  **Niagara:** 파티클의 수명을 1초 미만으로 설정.
3.  **Camera Shake:** 흔들림 강도를 낮추거나 제거 (지속 데미지 장판에는 생략하기도 합니다).

이 에셋들만 "단발성"으로 바꿔주셔도 중첩 문제는 바로 해결될 겁니다. 혹시 에셋 교체 후에도 소리가 계속 쌓인다면 말씀해 주세요! 다시 파헤쳐 보겠습니다.

---

[효제 (사용자)]

마땅한 에셋을 갖고 있지 않음으로, 감수하고 가야 할 문제겠네;

이걸로 5강 완료! 이번 강의에 대한 기록이야. 

https://github.com/hyojeb1/StepUp_Unreal/pull/8

<video src="https://github.com/user-attachments/assets/671c0daa-0a69-43c6-9735-de9b2d3437c6" controls width="600"></video>

이거 두 사이트는 하나는 내 작업 풀리퀘고. 추가로 아래는 영상이야. 이것도 꼭써야 해

---