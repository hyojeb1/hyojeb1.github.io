---
title: '[DOB:UE] 템플릿의 껍질을 깨고: C++ 리듬 판정 시스템 구축기'
published: 2026-03-20
draft: false
unlisted: false
tags: ['cpp', 'aurora-engine', 'game-engine-dev', 'unreal-engine', 'game-dev', 'rhythm-fps']
lang: 'ko'
series: 'dead-on-beat-ue'
---

기존의 결과물을 새로운 환경으로 이식하는 과정은 단순한 복사가 아닙니다. 그것은 시스템의 **리스크 관리**&#8203;이자, 더 나은 구조를 위한 **전략적 재설계**&#8203;의 과정입니다. 오늘은 언리얼 엔진 5.7 환경에서 *DeadOnBeat(DOB)*&#8203;의 심장을 C++로 다시 고동치게 만드는 첫 번째 이정표를 세웠습니다.

## 1. 템플릿 분석: 기반 시스템의 이해

새로운 엔진에 발을 들일 때 가장 경계해야 할 것은 '바퀴를 다시 발명하는 것'입니다. 언리얼의 *First Person 템플릿*&#8203;은 이미 최적화된 입력 레이어를 제공하고 있었습니다.

* **Enhanced Input 기반:** `IMC_Default`와 `IMC_MouseLook`이 분리된 구조를 확인했습니다. 이는 모바일 환경과의 인터페이스 간섭을 최소화하려는 설계 의도가 엿보이는 대목입니다.
* **구조적 학습:** `BP_FirstPersonCharacter`와 `PlayerController` 사이의 역할 분담을 파악하며, 향후 C++로 이전할 핵심 로직의 위치를 선정했습니다.

## 2. 히트스캔 사격과 물리 반응의 정석

단순히 총알이 나가는 것을 넘어, **런타임 효율**&#8203;을 고려한 라인트레이스 로직을 구현했습니다.

> [!info] 올바른 트레이스 계산
> `End = Start + (ForwardVector * Distance)`
> 단순히 벡터를 곱하는 실수를 바로잡고, 월드 좌표계에서의 정확한 끝점을 계산하는 기초를 다졌습니다.

단순히 맞히는 것에 그치지 않고, `HitComponent`의 `IsSimulatingPhysics`를 검사하는 루틴을 추가했습니다. 이는 물리 연산이 불가능한 오브젝트에 임펄스를 가해 발생하는 불필요한 에러를 방지하기 위함입니다. **유지보수 비용**&#8203;을 줄이기 위한 당연한 수순입니다.

## 3. C++와 UHT: 엔진의 심부로 진입

블루프린트의 유연함을 즐기되, 핵심 판정 로직은 C++의 견고함 위에 쌓기로 했습니다. `UHT(Unreal Header Tool)`와의 조우는 언리얼 C++ 빌드 시스템의 특수성을 이해하는 계기가 되었습니다.

```cpp title="Source/DeadOnBeat/Public/DOBRhythmTypes.h"
#pragma once

#include "CoreMinimal.h"
#include "DOBRhythmTypes.generated.h"

UENUM(BlueprintType)
enum class EDOBBeatJudgeResult : uint8
{
	Early    UMETA(DisplayName = "Early"),
	Perfect  UMETA(DisplayName = "Perfect"),
	Late     UMETA(DisplayName = "Late"),
	Miss     UMETA(DisplayName = "Miss")
};
```

단순한 조건문이 아니라, `EvaluateFixedBeatInput` 함수를 통해 **장거리 호흡**&#8203;이 가능한 리듬 판정 라이브러리를 구축했습니다. `SongStartTime`을 기준으로 상대 시간을 계산하고, 밀리초 단위의 윈도우를 검사하는 이 로직은 향후 모든 리듬 액션의 근간이 될 것입니다.

## 4. 리듬과 액션의 동기화 (Sync & Flow)

이제 FPS의 사격(Fire)과 이동(Dash)은 단순한 클릭이 아닌, **전략적 시너지**&#8203;를 요구합니다.

1.  **비트 신호:** 0.5초 간격의 `BeatPulse`를 통해 플레이어에게 청각적 가이드를 제공합니다.
2.  **조건부 실행:** 리듬 판정 결과가 `Miss`가 아닐 때만 실제 액션 함수(`DoDash`, `Fire`)가 트리거됩니다.
3.  **Latent Action:** 대시의 쿨다운을 `Delay` 노드와 `CanDash` 플래그로 제어하여 입력의 남발을 방지했습니다.

:::swallow
단순히 템플릿 위에 기능을 얹는 것을 넘어, 이제 프로젝트는 '리듬 FPS'라는 고유의 정체성을 갖추기 시작했어. 0.5초마다 울리는 스냅 소리가 마치 심장 박동 같네!
:::

:::cyper
C++ 기반의 판정 라이브러리는 아주 영리한 선택이었어. 블루프린트의 가독성과 C++의 성능, 그 사이의 최적의 지점을 잘 짚어낸 것 같군.
:::

## 향후 과제

오늘 구축한 시스템은 견고하지만, 아직 보완할 점이 남았습니다. 다음 단계에서는 다음 요소들에 집중할 계획입니다.

* **Reload 로직:** 사격, 대시와 동일한 리듬 판정 패턴 적용.
* **시각적 피드백:** 크로스헤어의 비트 반응 및 판정 UI 텍스트 출력.
* **C++ 포팅 확장:** 현재 블루프린트에 구현된 `DoDash` 등의 로직을 점진적으로 C++ 클래스로 이관.

오늘의 작업은 템플릿이라는 껍질을 깨고, *DeadOnBeat*&#8203;만의 고유한 시스템을 구축하기 위한 **성공적인 첫 수**&#8203;였습니다.
