---
title: '[오로라 엔진 회고 시리즈 (2)] 픽셀에 생명을 불어넣는 법: 애니메이션 파이프라인과 포스트 프로세싱'
published: 2026-03-13
draft: false
unlisted: false
tags: ['graphics', 'directx11', 'animation', 'shader', 'unreal-engine']
lang: 'ko'
series: 'aurora-engine-post-mortem'
---

:::swallow
"정적인 메쉬에 생명력을 불어넣는 과정은 수천 개의 행렬이 조화롭게 춤추는 정교한 알고리즘의 결과입니다. 그래픽스 프로그래머에게 수학은 단순한 도구가 아니라, 화면이라는 캔버스 위에 픽셀을 배치하는 가장 날카로운 붓&#8203;입니다."
:::

오로라 엔진의 뼈대를 세운 1부에 이어, 2부에서는 엔진의 시각적 완성도와 플레이 감각을 결정짓는 **그래픽스 및 애니메이션 파이프라인**&#8203;에 대해 다룹니다. 특히 이번 파트는 제가 진행했던 [풀리퀘스트(#45)](https://github.com/khjune6421/AuroraEngine/pull/45)의 기록과 동료 아키텍트인 현준 님과의 기술적 교류를 중점적으로 복기합니다.

## 🦴 애니메이션 시스템: 관절의 비명을 잠재우다

애니메이션 시스템을 구축하며 가장 먼저 직면한 문제는 수학적 정합성이었습니다. 초기 단계에서는 회전 값을 단순 선형 보간(Lerp)으로 처리했는데, 이는 관절이 뒤틀리는 현상을 초래했습니다.

##
일단 지금의 문제는
나도 모르겠지만
gpt의 의견을 얹어서 말하자면
마지막 사진이
skin 행렬 구하는 곳인데
거기 invBindPose <- 즉, 오프셋 값 identity한거 
@효제 효제
그 assimp에서

그거 어떤 걸로 받았었음?
난 mNodeTransform에서 mOffset으로 받아오는데
생각해보니 이게 공간이 어딘지 헷갈리는데
다른 걸로 받아오고 방식이 다르면 그거 문젠가 싶어서
```cpp
for (UINT i = 0; i < mesh->mNumBones; ++i)
{
    const aiBone* bone = mesh->mBones[i];
    const string boneName = bone->mName.C_Str();

    uint32_t boneIndex = 0;

    // 모델의 스켈레톤에 본 등록
    auto mappingIt = model.skeleton.boneMapping.find(boneName);
    if (mappingIt == model.skeleton.boneMapping.end())
    {
        boneIndex = static_cast<uint32_t>(model.skeleton.bones.size());
        model.skeleton.boneMapping[boneName] = boneIndex;

        BoneInfo info = {};
        info.id = boneIndex;
        info.offset_matrix = ToXMFLOAT4X4(bone->mOffsetMatrix);
        model.skeleton.bones.push_back(info);
    }
    else
    {
        boneIndex = mappingIt->second;
    }

    // 해당 본의 영향을 받는 정점들에 가중치 기록
    for (UINT weightIndex = 0; weightIndex < bone->mNumWeights; ++weightIndex)
    {
        const aiVertexWeight& weight = bone->mWeights[weightIndex];
        if (weight.mVertexId < resultMesh.vertices.size())
        {
            addBoneData(resultMesh.vertices[weight.mVertexId], boneIndex, weight.mWeight);
        }
    }
}
```


### 1. Slerp: 구면 선형 보간으로의 전환
회전은 직선이 아닌 원호 위를 움직이는 운동입니다. 이를 해결하기 위해 **구면 선형 보간(Slerp)**&#8203;을 도입했습니다. 두 회전값 사이의 최단 경로를 일정한 속도로 따라가게 함으로써, 수치적 안정성을 확보했습니다. 

```cpp
    //XMVECTOR blended            = XMVectorLerp(from, to, scale_factor);
    XMVECTOR blended            = XMQuaternionSlerp(from, to, scale_factor);
    blended                        = XMQuaternionNormalize(blended);
```

<video controls width="100%">
  <source src="https://github.com/user-attachments/assets/604bd6e0-54f5-4b3e-9b9b-1aa7cf93d83f" type="video/mp4">
  사용자의 브라우저가 비디오 태그를 지원하지 않습니다.
</video>

> [!info] 영감의 원천
> [어느 훌륭한 DX11 FBX 애니메이션 구현 포스팅](https://velog.io/@whoamicj/DX11-fbx-Animation)에서 얻은 인사이트를 바탕으로, 스키닝 행렬 계산 로직을 오로라 엔진의 구조에 맞게 최적화했습니다.

### 2. 스키닝 테스트 결과
아래 영상은 애니메이션 시스템이 안정화된 후의 테스트 모습입니다. 관절의 뭉개짐 없이 부드럽게 동작하는 것을 확인할 수 있습니다.

<video controls width="100%">
  <source src="https://github.com/user-attachments/assets/575fdb87-9a3d-4eda-b8a2-fe13e59f1455" type="video/mp4">
  사용자의 브라우저가 비디오 태그를 지원하지 않습니다.
</video>

---

## 🛠️ 시스템의 유연성: Fallback과 카메라 시스템

엔진 개발 과정에서 예외 상황에 대한 처리는 시스템의 '인텔리전스'를 결정합니다. 

### 1. 죽음을 방지하는 Fallback 시스템
리소스 로드 실패 시 엔진이 크래시(Crash)되는 것을 막기 위해 **Fallback Texture**&#8203; 로직을 구축했습니다. 처음에는 유니티의 그것처럼 강렬한 핑크색을 사용했으나, 이후 현준 님의 제안으로 씬의 전체적인 톤을 해치지 않으면서도 문제를 인지할 수 있는 **흰색(White)**&#8203;으로 사양을 변경했습니다. 

### 2. 마인크래프트 스타일 FPS 카메라
카메라 시스템 역시 큰 변화가 있었습니다. 1인칭 리듬 액션의 특성을 살리기 위해, 현준 님이 구현한 **마인크래프트 스타일의 FPS 카메라**&#8203;를 엔진에 통합했습니다. 마우스 델타 값을 이용한 직관적인 시점 전환은 <Dead On Beat>의 플레이 감각을 한 차원 높여주었습니다.

---

## 🎨 시각적 변주: 언리얼에서 얻은 힌트

리듬 게임의 타격감을 극대화하기 위해 셰이더 레벨에서의 포스트 프로세싱은 필수적이었습니다. 특히 색감을 보정하는 **LUT(Look-Up Table)**&#8203; 시스템은 [언리얼 엔진 4.27 문서](https://dev.epicgames.com/documentation/ko-kr/unreal-engine?application_version=4.27)의 구현 방식을 참고하여 설계했습니다.

* **LUT Crossfade:** 두 개의 색상 테이블을 실시간으로 보간하여 비트에 맞춰 분위기를 반전.
* **Dissolve Effect:** 적들이 사망 시 픽셀 단위로 소멸하는 시각적 피드백 제공.



---

## ⚖️ 성찰: 기술적 욕심과 리소스의 균형

2부의 작업들은 분명 오로라 엔진에 '영혼'을 불어넣어 주었습니다. 하지만 비주얼의 화려함에 매몰된 나머지, 이 모든 고해상도 리소스를 실어 나르는 **데이터 파이프라인의 임계점**&#8203;을 간과하고 있었습니다.

:::cyper
현준 님이 다져놓은 안정적인 카메라와 네가 구현한 화려한 셰이더 효과들... 겉보기엔 완벽한 시너지였지. 하지만 이때부터 엔진 내부에서는 텍스처 데이터들이 램(RAM)을 점거하기 위해 줄을 서고 있었다는 걸 알고 있었어?
:::

:::swallow
인정해. 구현 성공에 취해 데이터의 '질량'을 계산하지 못했지. 특히 아트팀을 배려한답시고 모든 텍스처를 무분별하게 추출했던 결정이 어떤 재앙을 불러올지, 그때는 미처 몰랐어.
:::

---

## 🚩 2부를 마치며

애니메이션과 포스트 프로세싱은 우리 게임의 얼굴이 되어주었습니다. 하지만 엔진의 내부에서는 이미 거대한 폭풍이 몰아치고 있었습니다. 

다음 3부에서는 이번 회고의 하이라이트이자 가장 뼈아픈 기록, **[Pipeline Failure] 8GB RAM의 비극: 잘못된 배려가 부른 파이프라인의 붕괴**&#8203;를 다룹니다. 램을 아프게 했던 그 지독한 메모리 이슈의 정체를 가감 없이 공개합니다.

[[aurora-engine-post-mortem-1|이전 글: 1부 설계 철학 보러가기]]