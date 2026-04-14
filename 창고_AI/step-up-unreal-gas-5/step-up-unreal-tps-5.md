---
title: '[step-up-unreal-gas] Part 5 데미지, 힐링, 클램핑, 그리고 Gameplay Cue'
published: 2026-04-14
draft: false
unlisted: false
tags: ['cpp', 'unreal-engine', 'gas', 'gameplay-ability-system']
lang: 'ko'
series: 'step-up-unreal-gas'
---

# Part 5. 데미지, 힐링, 클램핑, 그리고 Gameplay Cue

GAS를 따라가다 보면, 스탯을 바꾸는 것 자체보다  
**그 변화가 어떻게 전달되고, 어디서 끊기고, 어떤 기준으로 정리되는지**가 더 중요해지는 순간이 온다.

이번 파트에서는 다음 네 가지를 한 흐름으로 묶었다.

1. 데미지 장판과 힐링 장판 구성
2. UI가 갱신되지 않던 원인 추적
3. `AttributeSet`에서의 클램핑 처리
4. Gameplay Cue를 통한 VFX / SFX 연결

이번 작업 자료와 시연 영상은 아래에 남겨 둔다.

## 작업 자료

- 학습 영상 : https://www.youtube.com/watch?v=0XfM_UyJdhY
- 작업 PR: https://github.com/hyojeb1/StepUp_Unreal/pull/8

## 시연 영상

<video src="https://github.com/user-attachments/assets/671c0daa-0a69-43c6-9735-de9b2d3437c6" controls width="600"></video>

---

## 먼저 정리할 것: 이번 파트에서 만든 것

겉으로 보면 불 장판과 힐 장판을 만든 정도로 보이지만, 실제로는 조금 더 큰 구조를 만졌다.

- `SetByCaller` 기반의 주기성 데미지 / 힐링 효과
- 장판 진입 / 이탈 시 `GameplayEffect` 적용과 제거
- `Wait Attribute Changed`를 통한 HUD 반영
- `PreAttributeChange`, `PostGameplayEffectExecute`를 활용한 수치 클램핑
- `GameplayCue`를 통한 피격 / 치유 연출

중요했던 건 기능을 하나씩 붙이는 일이 아니라,  
**데이터가 바뀌는 경로를 끝까지 추적해서 시스템이 끊기지 않게 만드는 일**이었다.

---

## 1. 데미지 장판은 `SetByCaller`로 열어 두는 편이 낫다

이번 파트에서 데미지 장판은 고정값을 GE 안에 박아 넣는 방식 대신,  
외부에서 값을 주입하는 `SetByCaller` 방식으로 구성했다.

이 구조를 택하면 장판마다 다른 데미지를 주는 일이 훨씬 단순해진다.  
불 장판, 독 장판, 힐 장판이 전부 비슷한 부모 로직을 공유할 수 있기 때문이다.

예를 들어 데미지용 GE는 이런 식으로 가져간다.

- `Duration Policy`: `Infinite`
- `Period`: `1.0`
- Modifier 대상 Attribute: `Health`
- Magnitude Calculation Type: `Set by Caller`
- Data Tag: `Data.Damage`

핵심은 ==효과의 형태==와 ==실제 수치==를 분리하는 데 있다.  
효과는 GE가 들고 있고, 얼마를 깎을지는 장판 쪽에서 넘긴다.

이렇게 해 두면 나중에 부모 액터 하나로 장판 계열을 정리하기가 훨씬 편하다.

---

## 2. 장판 로직 자체는 단순한데, 빠지는 칸이 있다

장판 로직은 요약하면 이 정도다.

### Begin Overlap
- 상대 액터의 `AbilitySystemComponent`를 가져온다.
- `GameplayEffectSpec`를 만든다.
- `SetByCaller`로 데미지 혹은 힐 수치를 넣는다.
- `Apply Gameplay Effect Spec To Self`로 적용한다.

### End Overlap
- 다시 상대 액터의 `AbilitySystemComponent`를 가져온다.
- 들어올 때 적용했던 `GameplayEffect`를 제거한다.

구조만 보면 특별할 것이 없다.  
그런데 실제로 한 번 막혔던 지점은 `ReceiveActorEndOverlap` 쪽이었다.

문제는 의외로 단순했다.  
**빠져나간 상대 액터(`OtherActor`)를 제대로 넘겨주지 않으면**,  
누구의 ASC에서 효과를 제거해야 하는지 시스템이 알 수 없다.

이건 기능을 몰라서 생긴 문제가 아니라,  
블루프린트에서 자주 나오는 **“흐름은 맞는데 입력이 비어 있는”** 종류의 실수였다.

> [!info] 이번에 확인한 포인트
> `EndOverlap`은 로직 순서보다도  
> `OtherActor -> GetAbilitySystemComponent` 연결이 먼저다.  
> 누가 나갔는지 못 가져오면 제거 로직은 사실상 시작도 못 한다.

---

## 3. UI 문제는 값이 안 바뀐 게 아니라, 감시자가 늦게 태어난 문제였다

이번 파트에서 가장 오래 붙잡고 본 건 UI였다.

콘솔 디버깅과 `PrintString`으로는 HP 감소가 확인되는데,  
정작 HUD의 체력바는 움직이지 않았다.

이럴 때 흔히 먼저 의심하는 건 `AttributeSet`이나 GE 쪽인데,  
이번 경우엔 반대로 **백엔드는 이미 정상**이었다.  
문제는 UI 블루프린트의 배선에 있었다.

### 첫 번째 문제: `Changed`가 아니라 `then`을 타고 있었다

`Wait Attribute Changed` 노드는 말 그대로  
“변화가 발생했을 때” 반응해야 한다.

그런데 HP 쪽 업데이트 흐름이 `Changed`가 아니라 `then` 쪽에 연결되어 있으면,  
실제 수치가 바뀌어도 UI 갱신은 일어나지 않는다.

이건 한 번 감시를 시작하는 핀과,  
실제 변경 이벤트를 받는 핀을 혼동한 셈이다.

### 두 번째 문제: 감시 등록이 직렬이 아니라 종속 구조였다

더 중요한 문제는 이쪽이었다.

스태미나용 `Wait Attribute Changed`가 먼저 반응해야  
그 다음에 HP 감시가 연결되는 구조였다.  
즉, 스태미나가 변하지 않으면 HP UI도 갱신되지 않는 상태였다.

이 구조는 비용도 안 좋고, 논리적으로도 취약하다.  
어떤 속성의 감시 시작이 다른 속성의 이벤트에 종속되면 안 된다.

정리하면 `Construct` 시점에 해야 할 일은 두 가지다.

1. 초기값을 HUD 변수에 반영한다.
2. 각 속성의 `Wait Attribute Changed`를 **독립적으로 등록**한다.

즉, 감시자는 나중에 필요할 때 만드는 게 아니라  
**처음부터 병렬로 세워 둬야 한다.**

> [!warning] 여기서 막히기 쉬운 이유
> `then`은 “등록 완료”이고, `Changed`는 “실제 변경 발생”이다.  
> 이름만 보면 비슷해 보여도 역할이 완전히 다르다.

이 구간은 기능을 추가하는 파트라기보다,  
**이벤트 기반 UI가 어떤 식으로 연결되어야 하는지 감을 잡는 파트**에 더 가까웠다.

---

## 4. 힐링 장판은 “같다”기보다 “같게 만들어야 한다”

히어로 기능 하나를 만들고 나면, 다음은 대개 복제의 유혹이 온다.  
하지만 장판 계열은 여기서 복붙으로 가면 금방 비용이 불어난다.

힐링 장판은 데미지 장판과 동작 구조가 거의 같다.

- 들어오면 효과 적용
- 나가면 효과 제거
- 일정 주기로 수치 반영
- UI는 Attribute 변경 이벤트를 통해 갱신

달라지는 건 사실상 데이터다.

| 항목 | 데미지 장판 | 힐링 장판 |
|---|---|---|
| Effect Class | `GE_Damage_OverTime` | `GE_Heal_OverTime` |
| Data Tag | `Data.Damage` | `Data.Heal` |
| Magnitude | 음수 | 양수 |
| 시각 효과 | 피격 / 화염 계열 | 회복 / 치유 계열 |

그래서 부모 블루프린트에서 아래 항목들을 변수화해 두는 편이 낫다.

- `EffectClass`
- `DataTag`
- `Magnitude`

그 다음 자식 블루프린트에서 값만 갈아 끼우면 된다.

이런 구조는 화려하지 않지만,  
장판 종류가 늘어날수록 차이가 난다.  
나중에 독 장판이든 버프 장판이든 같은 틀에서 밀어 넣을 수 있기 때문이다.

---

## 5. 클램핑은 “예외 처리”가 아니라 속성의 경계 선언이다

이번 파트에서 C++ 쪽으로 정리한 핵심은 `AttributeSet`의 클램핑이었다.

체력은 0 아래로 내려가면 안 되고,  
힐링이 들어오더라도 `MaxHealth`를 넘기면 안 된다.

겉으로는 단순한 제약처럼 보이지만,  
실제로는 시스템의 기준선을 코드에 박아 넣는 작업에 가깝다.

`AttributeSet`에서는 다음 두 함수를 오버라이드했다.

```cpp title="BasicAttributeSet.h"
virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;
virtual void PostGameplayEffectExecute(const struct FGameplayEffectModCallbackData& Data) override;
````

그리고 구현은 이런 식으로 가져갔다.

```cpp title="BasicAttributeSet.cpp"
#include "GameplayEffectExtension.h"

void UBasicAttributeSet::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)
{
    Super::PreAttributeChange(Attribute, NewValue);

    if (Attribute == GetHealthAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxHealth());
    }

    if (Attribute == GetStaminaAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.0f, GetMaxStamina());
    }
}

void UBasicAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);

    if (Data.EvaluatedData.Attribute == GetHealthAttribute())
    {
        SetHealth(FMath::Clamp(GetHealth(), 0.0f, GetMaxHealth()));
    }

    if (Data.EvaluatedData.Attribute == GetStaminaAttribute())
    {
        SetStamina(FMath::Clamp(GetStamina(), 0.0f, GetMaxStamina()));
    }
}
```

여기서 포인트는 둘 중 하나만 쓰는 게 아니라,
**속성 변경 전 / GE 실행 후를 각각 다른 책임으로 다루는 것**이다.

* `PreAttributeChange`: 수동 변경이나 일반적인 변경 경로에서의 1차 정리
* `PostGameplayEffectExecute`: GE 계산이 끝난 뒤 최종 결과를 다시 경계 안으로 밀어 넣는 단계

GAS를 쓰다 보면 값이 바뀌는 지점이 한 군데가 아니다.
그래서 클램핑은 “나중에 붙이는 안전장치”라기보다,
**속성 설계 자체의 일부**로 보는 편이 맞다.

---

## 6. Gameplay Cue는 연결 자체보다, 어떤 자산을 물리느냐가 더 중요했다

이번 파트의 마지막은 `GameplayCue`였다.

데미지나 힐링이 실제로 적용되더라도,
플레이어가 그 순간을 감각적으로 못 느끼면 게임플레이는 비어 보인다.
그래서 이 구간에서는 `GameplayCueNotify`를 통해 VFX / SFX를 붙였다.

이번 작업에서는 유튜버가 사용한 자료 대신,
수업에서 받은 에셋으로 대체했다.

* Niagara: `NS_Explotion` 대신 실험 과정에서 보유 에셋 사용
* 현재 구성에서 사용한 이펙트 예시: `NS_RainbowWorm`
* 사운드 예시: 화염 루프 계열 사운드
* Camera Shake: 폭발 계열 쉐이크

그리고 여기서 또 하나의 문제가 나왔다.

## 7. 잘 되는데, 이펙트와 사운드가 겹친다

기능은 분명 정상인데,
장판 위에 서 있으면 이펙트와 사운드가 계속 중첩된다.

이건 `GameplayCue`가 고장 난 게 아니라,
현재 설계와 자산의 성질이 정확히 충돌한 경우였다.

### 왜 겹치는가

이번 데미지 GE는 `Period = 1.0`으로 주기 실행된다.
즉 1초마다 `Burst`가 새로 터진다.

문제는 여기에 붙인 자산이 **짧게 한 번 끝나는 타입이 아니라는 점**이다.

특히 사운드는 이름부터 루프 성격이 강한 화염 계열이었다.
그 상태에서 1초마다 새 Burst를 쏘면, 이전 재생이 끝나기 전에 다음 사운드가 또 올라온다.
Niagara도 수명이 길면 같은 문제가 난다.

즉 지금 상황은 버그라기보다 다음에 가깝다.

* `Burst`는 주기성 트리거
* 사용 자산은 지속형 성격
* 결과적으로 중첩

이 문제를 정석적으로 풀려면 보통 두 갈래다.

### 선택지 1. 짧은 단발성 자산으로 교체

가장 단순하고 안정적이다.

* 짧은 히트 사운드
* 수명이 짧은 파티클
* 강도가 낮은 카메라 쉐이크

### 선택지 2. `Burst`가 아니라 지속형 연출 구조로 바꾸기

장판 위에 서 있는 동안 계속 켜져 있어야 하는 연출이라면,
사실 `Burst`보다 `WhileActive` 류 접근이 더 자연스럽다.

다만 이번 파트는 `GameplayCue`의 연결 감을 잡는 것이 우선이었고,
당장 손에 맞는 자산도 넉넉하지 않았기 때문에
이번에는 일단 **감수하고 넘어가기로 했다**.

이 선택은 아주 우아하진 않지만 현실적이다.
작업 리듬을 끊지 않고 다음 단계로 넘어가는 판단도 필요하다.

> [!info] 이번에 남겨 둘 판단
> 연출 품질이 아쉬운 원인을 시스템 탓으로 돌리기보다,
> ==현재 자산과 재생 방식의 궁합 문제==로 분리해서 보는 편이 낫다.

---

## 마무리

이번 파트는 표면적으로는 데미지 / 힐링 / 피격 연출을 붙이는 과정이었지만,
실제로 남은 건 그보다 조금 더 구조적인 감각이었다.

* 값이 바뀌는 것과 UI가 갱신되는 것은 같은 문제가 아니다.
* 감시자는 이벤트가 필요해진 뒤에 만드는 게 아니라 처음부터 등록해야 한다.
* 장판 계열은 복붙보다 부모화가 싸다.
* 클램핑은 예외처리가 아니라 속성의 경계를 선언하는 일이다.
* Gameplay Cue는 연결만으로 끝나지 않고, 어떤 자산을 연결하느냐까지 포함해 봐야 한다.

결국 이번 파트에서 제일 크게 배운 건
**기능이 되는지**보다 **흐름이 어디서 끊기는지**를 보는 시선이었다.

언젠가 이 위에 좀 더 정돈된 연출과 구조를 얹어 볼 생각이다.
