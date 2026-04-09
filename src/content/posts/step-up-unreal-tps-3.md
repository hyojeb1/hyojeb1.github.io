---
title: '[step-up-unreal] 블렌딩 오류인 줄 알았는데, 사실은 카메라와 조준 입력 문제였다'
published: 2026-04-08
draft: false
unlisted: false
tags: ['unreal-engine', 'tps', 'animation-study', 'blend-space', 'character-movement', 'camera']
lang: 'ko'
series: 'step-up-unreal-tps'
---

이번에는 TPS 애니메이션 작업 중에 꽤 오래 붙잡고 있던 문제를 정리한다.  
처음에는 ==Blend Space 블렌딩이 깨진 줄 알았다.==  
그래서 Blend Space Graph를 의심했고, 샘플 구성도 뒤졌고, Aim Offset까지 전부 다시 봤다.

그런데 끝까지 따라가 보니 문제의 중심은 다른 곳에 있었다.  
겉으로는 블렌딩이 0과 1 사이를 오가지 못하는 것처럼 보였지만, 실제로는 **카메라 방향, 캐릭터 회전 정책, 그리고 AimPitch 입력 처리**가 서로 어긋나고 있었다.

작업 자료는 아래에 남겨 두었다.

- 작업 자료: github.com/hyojeb1/StepUp_Unreal/pull/5/
- 참고 자료: https://github.com/junios-study/L20250316_P38/commit/4f11e791ac919a64d07b281a6b34ae4e894dd294

강희운 교수님의 작업을 바탕으로 진행했다.

---

# 문제를 처음 봤을 때의 인상

증상만 놓고 보면 전형적인 Blend Space 문제처럼 보였다.

- Aim Offset이 부드럽게 보간되지 않는 느낌
- 특정 구간에서 값이 급격히 튀는 느낌
- Pitch가 예상보다 과하게 반응하는 현상
- 조준과 이동이 섞일 때 애니메이션이 자연스럽지 않은 문제

처음에는 당연히 Blend Space 자산이나 샘플 배치가 잘못된 줄 알았다.  
실제로 샘플 구성을 뜯어보면 의심할 만한 부분도 있었고, 덤프를 보면 내부 구조가 예상보다 훨씬 복잡하게 펼쳐져 있었다.

하지만 문제를 계속 좁혀 가다 보니, 노드 종류 자체보다 **입력값이 어떤 의미로 들어가고 있는지**가 더 중요했다.

---

# 카메라 오류 수정

당시 `SU_AnimInstance.cpp`에서 조준 관련 값은 아래처럼 처리하고 있었다.

```cpp title="SU_AnimInstance.cpp"
void USU_AnimInstance::NativeUpdateAnimation(float DeltaSeconds)
{
	Super::NativeUpdateAnimation(DeltaSeconds);

	ASU_Player* Player = Cast<ASU_Player>(TryGetPawnOwner());

	if (IsValid(Player))
	{
		Speed = Player->GetCharacterMovement()->Velocity.Size2D();
		Direction = UKismetAnimationLibrary::CalculateDirection(
			Player->GetCharacterMovement()->Velocity,
			Player->GetActorRotation()
		);
		CurrentWeapon = Player->CurrentWeapon;

		AimYaw = Player->GetBaseAimRotation().Yaw;
		AimPitch = Player->GetBaseAimRotation().Pitch * 0.01f;
	}
}
````

문제는 여기서 `AimPitch`였다.
Pitch가 급격히 올라가는 현상이 있었고, 실제 플레이에서도 에임 오프셋이 과장되거나 기대와 다르게 반응했다.

<video src="https://github.com/user-attachments/assets/ad0abb38-c87d-4235-b3fa-c615dbeaa2c5" controls width="600"></video>

처음에는 이걸 보고 **블렌딩이 잘못되었다**고 생각했다.
그런데 정리해 보면, 블렌딩 계산 그 자체보다는 **조준 회전값을 어떤 기준으로 읽고, 어떤 스케일로 에셋에 넣고 있느냐**의 문제가 더 컸다.

---

# 사격 쪽 확인

아래 스크린샷은 당시 사격 관련 구성이다.

<img width="1805" height="1115" alt="image" src="https://github.com/user-attachments/assets/f47440c3-dae3-42f6-89cd-4ecf9aa3eb2e" />

이 시점의 나는 Blend Space Player와 Blend Space Graph, Aim Offset 사이를 오가면서 원인을 찾고 있었다.
겉으로 드러나는 증상만 보면 샘플 간 블렌딩이 매끄럽지 않은 것처럼 보이기 때문이다.

하지만 실제로는 **카메라가 바라보는 방향**, **캐릭터가 회전하는 정책**, **AnimInstance에서 읽어 오는 Aim 값**이 서로 다른 좌표계 감각으로 연결되고 있었다.

---

# 왜 Blend Space 문제처럼 보였나

이 문제를 더 헷갈리게 만든 건, 증상이 너무 Blend Space 오류처럼 보였다는 점이다.

## 1. 조준 포즈가 부드럽게 이어지지 않았다

조준 입력은 연속값으로 들어가야 하는데, 실제 결과는 특정 구간에서 갑자기 튀는 느낌이 있었다.
그러면 자연스럽게 “블렌딩이 깨졌나?”라는 결론으로 가게 된다.

## 2. 블루프린트 덤프를 보면 구조가 과하게 복잡해 보였다

Blend Space Player로 참조한 줄 알았는데, 내부를 펼쳐 보면 샘플 그래프와 시퀀스 플레이어가 줄줄이 나온다.
그러면 노드 수가 불어난 것처럼 느껴지고, 실제 문제보다 구조 자체를 먼저 의심하게 된다.

## 3. 임시 수정이 증상을 완화했다

`AimPitch`에 `0.01` 배율을 곱하자 현상이 어느 정도 가라앉았다.
이게 문제를 더 헷갈리게 만들었다.
겉으로 보면 “아, Pitch 값이 너무 커서 블렌딩이 깨졌던 거구나”처럼 보이기 때문이다.

하지만 이건 구조를 바로잡은 수정이라기보다, **현재 세팅에서 증상을 눌러 놓은 임시 조정**에 가깝다.

---

# 이번 커밋에서 실제로 한 일

이번 단계에서는 일단 작업을 멈추지 않기 위해 임시 수정을 적용했다.

> [!info] 이번 단계의 임시 처리
>
> * `AimPitch`에 `0.01` 배율 적용
> * 에임 오프셋 동작을 일단 안정화
> * 추가로 `Orient Rotation to Movement` 옵션 비활성화

정리하면 커밋의 성격은 이렇다.

> [!warning] 이 수정은 최종 해법이 아니다
> Blend Space의 근본 원인을 해결한 것이 아니라,
> 현재 카메라/회전/Aim 입력 조합에서 발생하는 불안정을 임시로 완화한 것이다.
> 다음 커밋에서 원인 분석을 이어갈 예정이다.

---

# 내가 헷갈렸던 지점

이번 작업에서 가장 크게 배운 건, **Blend Space 문제처럼 보여도 실제로는 회전 정책 문제일 수 있다**는 점이다.

언리얼에서 카메라와 캐릭터 방향을 맞추는 방식은 장르에 따라 꽤 다르다.

* FPS처럼 카메라 방향과 캐릭터 방향이 거의 항상 일치하는 구조
* TPS처럼 평상시 이동 방향과 조준 방향이 분리되는 구조
* 특정 입력에서만 캐릭터가 카메라 방향을 따라가게 하는 구조
* 하체는 이동하고 상체만 Aim Offset으로 조준하는 구조

이 차이를 제대로 의식하지 않으면,
애니메이션 문제와 회전 정책 문제를 섞어서 보게 된다.

---

# 이후에 확인해야 할 것들

지금 기준에서 다음 커밋에서 검토할 내용은 분명하다.

## 1. `GetBaseAimRotation()`을 그대로 쓰는 것이 맞는가

현재는 아래처럼 월드 기준 회전값을 바로 가져와서 쓰고 있다.

```cpp title="SU_AnimInstance.cpp"
AimYaw = Player->GetBaseAimRotation().Yaw;
AimPitch = Player->GetBaseAimRotation().Pitch * 0.01f;
```

이 값이 실제로 Aim Offset 에셋이 기대하는 로컬 기준 값과 일치하는지 확인이 필요하다.

## 2. 캐릭터 회전 정책과 조준 정책이 충돌하는가

특히 다음 옵션의 조합을 다시 볼 필요가 있다.

* `Orient Rotation to Movement`
* `Use Controller Rotation Yaw`
* `Use Controller Desired Rotation`

이번에는 `Orient Rotation to Movement`를 끄는 방향으로 임시 정리했지만,
이게 최종 구조인지까지는 아직 판단하지 않았다.

## 3. AimPitch를 왜 억지로 줄여야 했는가

정상적인 세팅이라면 `* 0.01f` 같은 보정은 거의 들어가지 않는다.
이 말은 결국 지금 프로젝트의 어느 부분이 이미 기대값과 어긋나 있다는 뜻이다.

---

# 검색하면서 정리한 키워드

문제를 좁혀 가면서 찾아본 키워드도 같이 남겨 둔다.
나중에 다시 비슷한 문제를 만났을 때 검색 출발점으로 쓰기 좋다.

## 캐릭터가 카메라 방향으로 회전하게 하고 싶을 때

* `Orient Rotation to Movement`
* `Use Controller Desired Rotation`
* `Use Controller Rotation Yaw`
* `Unreal Engine character face camera direction`

## 특정 상황에서만 카메라 방향을 보게 하고 싶을 때

* `Find Look at Rotation`
* `RInterp To`
* `Set Control Rotation`
* `Rotate Character to Camera forward vector`

## 애니메이션과 연동하고 싶을 때

* `Aim Offset`
* `Control Rig Look At`
* `Yaw Offset calculation`
* `Spine rotation based on Camera Pitch/Yaw`

## 검색 조합

영문 검색이 훨씬 자료가 많다.

* `Unreal Engine 5 rotate character to camera direction blueprint`
* `UE5 character look where camera is looking`
* `Unreal Engine 5 aim offset pitch yaw character rotation`

---

# 정리

이번 작업은 결과적으로 이런 흐름이었다.

**블렌딩 오류인 줄 알았는데, 사실은 카메라와 캐릭터 회전 정책, 그리고 Aim 입력 해석이 서로 어긋난 문제였다.**

겉으로 드러난 현상은 Blend Space가 부드럽게 동작하지 않는 것처럼 보였다.
그래서 Blend Space 자산과 샘플 구성을 먼저 의심했다.
하지만 실제로는 조준 입력이 어떤 기준으로 들어가는지, 캐릭터가 카메라를 어떻게 따라가는지, 그리고 AimPitch를 왜 억지로 줄여야 했는지를 보는 편이 더 정확했다.

이번 커밋은 그 문제를 완전히 해결한 커밋이 아니다.
일단 작업을 앞으로 밀기 위해 `AimPitch *= 0.01f`와 회전 옵션 조정으로 임시 안정화를 만들었다.

다음 커밋에서는 이 문제를 더 구조적으로 정리할 생각이다.
특히 `GetBaseAimRotation()`의 사용 방식과, Aim Offset에 넣는 Pitch/Yaw를 어떤 기준으로 계산할지 다시 확인할 예정이다.

