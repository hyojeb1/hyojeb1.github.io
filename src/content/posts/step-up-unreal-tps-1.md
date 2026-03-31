---
title: '[step-up-unreal] TPS 입력과 카메라 로직을 블루프린트에서 C++로 옮기기'
published: 2026-03-31
draft: false
unlisted: false
tags: ['cpp', 'unreal-engine', 'tps', 'enhanced-input', 'animation-study']
lang: 'ko'
series: 'step-up-unreal-tps'
---

언리얼 엔진의 3인칭 템플릿은 시작점으로는 훌륭하다.  
이미 움직이고, 점프하고, 카메라가 따라붙는다. 문제는 그 다음이다.  
보이는 것이 되는 것과, **왜 그렇게 동작하는지 이해하는 것**&#8203;은 전혀 다른 문제다.

이번 작업의 목표는 단순했다.  
언리얼의 3인칭 템플릿과 수업 예제를 그대로 소비하는 쪽이 아니라, **블루프린트에 숨어 있는 입력과 카메라 흐름을 C++로 끌어올려 구조를 다시 읽을 수 있는 상태로 만드는 것**&#8203;이다.

이번 정리는 아래 자료를 기준 삼아 진행했다.

## 링크

* [강사님이 제공해주신 링크](https://github.com/junios-study/L20250316_P38)
* [내 작업 링크](https://github.com/hyojeb1/StepUp_Unreal)
* [03-31까지의 작업 목록](https://github.com/hyojeb1/StepUp_Unreal/tree/07825755672ed4a142e2129f519c39c9d2894269)
* [언리얼 공식 Third Person Template 문서](https://dev.epicgames.com/documentation/en-us/unreal-engine/third-person-template-in-unreal-engine)


수업 예제를 그대로 따라가는 데서 멈추지 않고, 공식 템플릿이 무엇을 기본값으로 제공하는지 다시 확인한 뒤, 내 프로젝트 쪽 구조로 옮겨오는 흐름이었다.  
즉 이번 작업은 단순한 “이식”이라기보다, **템플릿을 해부한 다음 내 손으로 다시 조립하는 과정**&#8203;에 가까웠다.

---

## 오늘 정리한 범위

오늘 정리한 범위는 생각보다 명확하다.

- 스프링암과 팔로우 카메라를 `SU_Player`에 구성
- Enhanced Input 기반의 `Move`, `Aim`, `Zoom`, `Jump` 바인딩 추가
- `SU_PlayerController`에서 기본 `Input Mapping Context` 등록
- 컨트롤 회전 기준 이동 벡터 계산 로직 적용
- 점프 기능을 C++ 로직 기준으로 정리
- 블루프린트는 에셋 주입 계층으로 남기고, 실제 입력 흐름은 코드로 이동

이 작업은 대략 다음 커밋 흐름까지를 기준으로 정리한 내용이다.

- 수업 원본 예제: 강사님 저장소
- 내 이식 작업: `StepUp_Unreal`
- 2026-03-31 시점 작업 스냅샷: 03-31까지의 작업 목록

즉 오늘의 주제는 “TPS 전체 완성”이 아니라, **플레이어의 입력과 카메라 계층을 코드 중심으로 다시 세우는 일**&#8203;이었다.

---

## 왜 굳이 블루프린트에서 C++로 옮겼는가

이유는 익숙한 두 가지다.

첫째는 ==형상관리==다.  
블루프린트는 훌륭한 도구지만, diff를 읽고 구조 변화를 추적하는 데에는 늘 비용이 붙는다. 반면 C++는 어떤 값이 어디에서 결정되고, 어떤 흐름으로 실행되는지 한 줄씩 추적할 수 있다. 협업이 길어질수록 이 차이는 생각보다 크게 누적된다.

둘째는 ==구조의 명시성==이다.  
입력은 어디서 등록되는가, 이동 벡터는 어떤 기준으로 계산되는가, 카메라는 어떤 컴포넌트 계층 위에 놓이는가. 이런 질문에 대해 블루프린트는 빠르게 답을 만들게 해주지만, C++는 답의 구조를 남긴다.

> [!info] 이번 이관의 기준
> 블루프린트를 완전히 버리는 것이 목적은 아니다.  
> **로직은 C++에 두고, 에셋 연결은 블루프린트에 남기는 구조**&#8203;를 유지하는 것이 핵심이다.

이 기준은 공식 문서가 설명하는 3인칭 템플릿의 출발점과도 잘 맞는다.  
템플릿은 이미 캐릭터, 카메라, 점프, 이동, 레벨 프로토타입을 제공하지만, 학습 단계에서는 “그냥 된다”에서 끝내기보다 **각 요소가 어디서 초기화되고 어떻게 연결되는지 추적할 수 있어야** 한다.

---

## 오늘 정리한 클래스 구조

이번 작업에서는 플레이어 역할을 크게 둘로 나눴다.

- `SU_Player`
  - 캐릭터 본체
  - 카메라 컴포넌트 구성
  - 이동, 조준, 줌, 점프 입력 바인딩
- `SU_PlayerController`
  - 시작 시 `Input Mapping Context` 등록

이 분리는 생각보다 중요하다.  
캐릭터는 “움직이는 주체”이고, 플레이어 컨트롤러는 “입력 체계를 초기화하는 주체”에 가깝다.  
둘을 나누면 나중에 입력 세트를 교체하거나 상태에 따라 컨텍스트를 바꿀 때도 흐름이 선명해진다.

수업 시간에 제공된 블루프린트 예제에서는 이 흐름이 노드 단위로 흩어져 보이지만, C++로 옮기면 구조가 훨씬 직선적으로 드러난다.  
이번에 정리한 `SU_Player` / `SU_PlayerController` 분리는 그 첫 번째 정리였다.

---

## 카메라를 코드로 배치하기

3인칭 카메라의 기본 구조는 익숙하다.  
스프링암 위에 카메라를 붙이고, 캐릭터 메시를 캡슐 기준으로 적절히 보정한다.

```cpp title="Source/StepUp_Unreal/Player/SU_Player.cpp"
ASU_Player::ASU_Player()
{
	PrimaryActorTick.bCanEverTick = false;

	CamBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CamBoom"));
	CamBoom->SetupAttachment(RootComponent);

	FollowCam = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCam"));
	FollowCam->SetupAttachment(CamBoom);

	GetMesh()->SetRelativeLocationAndRotation(
		FVector(0, 0, -GetCapsuleComponent()->GetScaledCapsuleHalfHeight()),
		FRotator(0, -90.0f, 0)
	);
}
````

이 구성의 장점은 분명하다.

* 카메라 거리 조절이 쉽다
* 충돌 시 스프링암 기반으로 대응하기 좋다
* TPS에서 흔히 필요한 회전/줌 구조를 정리하기 편하다

블루프린트에서는 한 번 만들어두고 잊어버리기 쉬운 계층이지만, 코드로 두면 **카메라가 어떤 의도로 매달려 있는지**가 훨씬 잘 보인다.

공식 템플릿도 결국 비슷한 구조를 사용한다.
학습자의 입장에서는 중요한 것이 “Spring Arm을 붙였다”가 아니라, **왜 카메라를 직접 루트에 고정하지 않고 중간 계층을 두는가**를 이해하는 일이다.
줌, 회전, 충돌 대응을 고려하면 이 구조는 거의 정석에 가깝다.

---

## 입력은 바인딩만으로 끝나지 않는다

언리얼의 Enhanced Input은 처음 보면 단순해 보이지만, 실제로는 두 층으로 나뉜다.

1. 어떤 키가 어떤 액션을 발생시키는가
2. 그 액션이 발생했을 때 어떤 함수를 실행할 것인가

즉 `BindAction()`만으로는 충분하지 않다.
먼저 `Input Mapping Context`가 플레이어에 등록되어야 하고, 그다음 액션이 함수에 연결되어야 한다.

캐릭터 쪽 바인딩은 이렇게 정리했다.

```cpp title="Source/StepUp_Unreal/Player/SU_Player.cpp"
void ASU_Player::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		EIC->BindAction(IA_SU_Move, ETriggerEvent::Triggered, this, &ASU_Player::Move);
		EIC->BindAction(IA_SU_Aim, ETriggerEvent::Triggered, this, &ASU_Player::Aim);
		EIC->BindAction(IA_SU_Zoom, ETriggerEvent::Triggered, this, &ASU_Player::Zoom);

		EIC->BindAction(IA_SU_Jump, ETriggerEvent::Triggered, this, &ASU_Player::Jump);
		EIC->BindAction(IA_SU_Jump, ETriggerEvent::Completed, this, &ASU_Player::StopJumping);
	}
}
```

그리고 컨트롤러에서는 기본 매핑 컨텍스트를 등록했다.

```cpp title="Source/StepUp_Unreal/Player/SU_PlayerController.cpp"
void ASU_PlayerController::BeginPlay()
{
	Super::BeginPlay();

	if (IsLocalPlayerController())
	{
		if (ULocalPlayer* LocalPlayer = Cast<ULocalPlayer>(Player))
		{
			if (UEnhancedInputLocalPlayerSubsystem* InputSystem =
				LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
			{
				if (IMC_SU_Default)
				{
					InputSystem->AddMappingContext(IMC_SU_Default, 0);
				}
			}
		}
	}
}
```

여기서 중요한 건 코드보다도 ==역할 분리==다.
액션의 발생 조건은 컨텍스트가 쥐고 있고, 액션 이후의 실제 동작은 캐릭터가 담당한다.

수업 예제에서 블루프린트 두세 노드로 보이던 흐름이, C++에서는 결국 **로컬 플레이어의 Enhanced Input 서브시스템을 가져와 컨텍스트를 등록하는 코드**로 환원된다는 점도 흥미로웠다.
시각적으로는 길어 보여도, 의미를 해석하면 꽤 작은 단위의 구조였다.

---

## 이동 로직은 컨트롤 회전을 기준으로 계산한다

TPS에서 전진 방향은 월드 고정이 아니라, 보통 ==컨트롤러의 Yaw==를 기준으로 잡는다.
그래야 카메라가 바라보는 방향 기준으로 자연스럽게 이동한다.

```cpp title="Source/StepUp_Unreal/Player/SU_Player.cpp"
void ASU_Player::Move(const FInputActionValue& Value)
{
	const FVector2D Direction = Value.Get<FVector2D>();

	const FRotator YawRotation(0.f, GetControlRotation().Yaw, 0.f);
	const FVector Forward = UKismetMathLibrary::GetForwardVector(YawRotation);
	const FVector Right = UKismetMathLibrary::GetRightVector(YawRotation);

	AddMovementInput(Forward, Direction.X);
	AddMovementInput(Right, Direction.Y);
}
```

여기서 포인트는 두 가지다.

* `Pitch`는 버린다
  위를 쳐다본다고 전진 벡터가 위로 들리면 이상해진다.
* 수평면 기준 이동만 유지한다
  TPS 이동은 보통 카메라 시선과 연동되더라도, 물리적으로는 지면 위 움직임으로 유지하는 편이 안정적이다.

이런 종류의 규칙은 블루프린트로도 만들 수 있지만, 코드로 두면 훨씬 덜 흔들린다.
움직임 로직은 작은 차이 하나가 체감 품질을 크게 바꾸기 때문이다.

공식 문서에서는 WASD 이동과 마우스 회전을 “기본 제공되는 경험” 정도로 설명하지만, 실제로 학습자가 가져가야 하는 핵심은 이 벡터 계산 방식이다.
템플릿을 쓴다는 건 기능을 쓰는 것이고, C++로 옮긴다는 건 그 기능이 **어떤 좌표계 위에서 결정되는지 이해하는 것**이다.

---

## 오늘 가장 중요한 실수 하나

재미있었던 지점은, 코드 자체보다 ==에셋 주입 구조==에서 막혔다는 점이다.

처음에는 분명 `Input Mapping Context`도 등록했고, `BindAction()`도 걸었는데 입력이 오지 않았다.
원인은 간단했다.
`IA_SU_Move`, `IA_SU_Jump`, `IA_SU_Aim`, `IA_SU_Zoom`가 블루프린트 디테일 패널에서 비어 있었다.

즉 구조는 맞았지만, 실제 액션 에셋이 주입되지 않은 상태였다.

> [!warning] 언리얼 C++에서 자주 놓치는 감각
> `UPROPERTY(EditAnywhere)`는 “코드로 선언했으니 끝”이 아니라
> **에디터에서 값을 넣으라고 열어둔 슬롯**에 가깝다.

이 지점에서 다시 한 번 확인하게 된다.
언리얼은 순수 C++ 프로젝트처럼 “코드만으로 완결”되는 엔진이 아니다.
정확히는 **C++가 뼈대를 만들고, 블루프린트와 에디터가 데이터를 주입해서 완성하는 구조**다.

이번 작업에서 가장 크게 남은 것도 사실 이 감각이다.
블루프린트는 로직 도구이기도 하지만, 동시에 **C++ 클래스를 실사용 가능한 상태로 조립하는 계층**이기도 하다.

---

## 블루프린트와 C++는 경쟁 관계가 아니다

학습 초기에는 자주 이런 생각을 하게 된다.

“블루프린트로 하던 걸 C++로 옮기면 전부 C++로 끝나야 하는 것 아닌가?”

그런데 실제 작업 흐름은 그렇지 않다.

* C++는 구조와 동작을 정의한다
* 블루프린트는 메시, 애님 블루프린트, InputAction, MappingContext 같은 에셋을 꽂는다
* 둘이 합쳐져야 실제 플레이어가 완성된다

이 감각이 익숙해지기 전까지는 계속 어색하다.
하지만 구조를 한 번 이해하면 오히려 훨씬 편해진다.
무엇을 코드에 둘지, 무엇을 에디터에서 열어둘지 분리할 수 있기 때문이다.

---

## 점프와 줌도 함께 정리했다

점프는 입력 바인딩만 걸어두고 함수를 비워두면 아무 일도 일어나지 않는다.
이런 종류의 문제는 블루프린트에서는 노드 연결이 비어 있으면 금방 눈에 띄는데, C++에서는 함수 시그니처만 보고 지나치기 쉽다.

또 줌 로직에서는 `Clamp()` 결과를 다시 대입하지 않으면 실제 제한이 걸리지 않는다.

```cpp title="Source/StepUp_Unreal/Player/SU_Player.cpp"
void ASU_Player::Zoom(const FInputActionValue& Value)
{
	const float Zoom = Value.Get<float>();

	CamBoom->TargetArmLength += Zoom * 30.f;
	CamBoom->TargetArmLength = FMath::Clamp(CamBoom->TargetArmLength, 30.0f, 600.0f);
}
```

이런 부분은 언뜻 사소해 보여도, 런타임 감각에서는 꽤 직접적으로 드러난다.
특히 카메라와 입력은 플레이어가 가장 먼저 만지는 계층이라, 작은 어긋남도 바로 체감된다.

점프 역시 “기능이 있었다”와 “내가 제어 가능한 흐름으로 다시 정리했다”는 것은 다르다.
이번 작업에서는 템플릿의 기본 동작을 그대로 복사하는 데서 멈추지 않고, **입력에서 실행까지의 경로를 직접 소유하는 상태**로 바꾸는 데 의미가 있었다.

---

## 참고한 자료와 작업 흔적

이번 정리는 아래 자료들을 함께 보면서 진행했다.

* 강사님이 제공해주신 예제 저장소
* 내 프로젝트 저장소
* 2026-03-31 기준 작업 스냅샷
* 언리얼 공식 Third Person Template 문서

학습 과정에서 특히 유용했던 것은 두 저장소를 나란히 놓고 보는 방식이었다.
하나는 기준점이고, 다른 하나는 내가 구조를 다시 세운 결과물이다.
이 둘을 비교하면 어떤 부분을 단순히 따라 적었고, 어떤 부분은 이해해서 재구성했는지가 꽤 선명하게 드러난다.

> [!info] 이번 작업을 보는 가장 좋은 방법
> “수업 예제를 구현했다”보다
> **기준 예제를 내 구조 안으로 다시 옮기면서, 언리얼의 입력 계층과 카메라 계층을 읽는 연습을 했다**고 보는 편이 더 정확하다.

---

## 오늘 정리한 범위의 의미

이번 이관은 템플릿의 모든 것을 C++로 바꾼 작업은 아니다.
대신 중요한 한 축을 정리했다.

* 입력이 어디서 시작되는가
* 매핑 컨텍스트는 누가 등록하는가
* 이동 벡터는 무엇을 기준으로 계산되는가
* 카메라 계층은 어떤 식으로 구성되는가
* 블루프린트는 어떤 역할로 남겨둘 것인가

이 정도만 정리돼도 템플릿은 더 이상 “그냥 되는 예제”가 아니다.
읽을 수 있는 구조가 된다.

그리고 그 다음 단계도 자연스럽게 보인다.
이제 이동이 정리됐으니, 그 위에 올라갈 ==애니메이션 상태==를 연구할 수 있다.
맨몸 locomotion을 정리하고, 무기 장착과 조준, 상하체 분리, Aim Offset으로 확장하는 방향이 다음 순서가 될 가능성이 높다.

이번 작업이 애니메이션 연구의 준비 단계라는 점도 마음에 든다.
입력과 카메라가 흔들리면 그 위에 어떤 상태머신을 올려도 결국 기초가 불안하다.
먼저 플레이어의 기본 호흡을 정리해두고, 그다음에 보이는 층을 올리는 쪽이 전체 비용이 더 낮다.

---

## 마무리

오늘의 작업은 기능을 추가했다기보다, **입력과 카메라라는 기본 비용을 통제 가능한 구조로 정리한 일**에 가깝다.
겉보기엔 단순한 템플릿 이관이지만, 실제로는 언리얼에서 블루프린트와 C++가 어떻게 공존하는지 몸으로 확인하는 과정이었다.

결국 중요한 건 “블루프린트를 없애는 것”이 아니다.
어떤 로직을 코드로 고정하고, 어떤 부분을 에셋 주입 계층으로 남길지 구분하는 일이다.
이 기준이 생기면 템플릿은 학습용 샘플을 넘어, 다음 실험을 위한 기반 구조가 된다.

다음 단계는 아마 분명하다.
이제 움직이는 캐릭터 위에, **움직임이 어떻게 보일 것인가**를 올릴 차례다.

