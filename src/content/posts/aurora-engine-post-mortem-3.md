---
title: '[오로라 엔진 회고 시리즈 (3)] Legacy를 넘어 시스템으로: 하드웨어 입력과 추상화 레이어'
published: 2026-03-18
draft: false
unlisted: false
tags: ['cpp', 'directx11', 'aurora-engine', 'game-engine-dev', 'unreal-engine', 'input-system']
lang: 'ko'
series: 'aurora-engine-post-mortem'
---

자체 엔진인 **Aurora Engine**&#8203;을 빌드하며 Win32 API의 `WM_INPUT`과 **Raw Input**&#8203;을 다룰 때, 저는 이것이 입력의 종착역이라 믿었습니다. 하드웨어의 신호를 가장 빠르고 정교하게 가로채는 것이 **런타임 효율의 극대화**&#8203;라고 생각했기 때문입니다. 

하지만 언리얼 엔진의 **Enhanced Input**&#8203;을 깊게 파고들면서, 제가 작성했던 코드가 언리얼의 **Legacy Input**&#8203;과 같은 철학을 공유하고 있다는 사실을 깨달았습니다. 오늘은 '입력을 받는 법'이 아니라 '입력을 다루는 구조'에 대해 고민한 흔적을 남겨봅니다.

---

## 1. 하드웨어에 종속된 '직설적'인 코드

기존에 제가 작성했던 `InputManager`의 핵심 로직입니다. 윈도우 메시지 루프에서 가상 키 코드를 받아 상태 배열에 저장하는 전형적인 **Singleton**&#8203; 패턴이죠.

```cpp title="AuroraEngine/InputManager.cpp"
void InputManager::ProcessRawKeyboard(const RAWKEYBOARD& keyboard)
{
    unsigned int vKey = keyboard.VKey;
    if (vKey >= 256) return;

    bool isKeyDown = !(keyboard.Flags & RI_KEY_BREAK);
    if (isKeyDown)
    {
        if (!m_keyState[vKey]) m_keyDownState[vKey] = true;
        m_keyState[vKey] = true;
    }
    else
    {
        m_keyUpState[vKey] = true;
        m_keyState[vKey] = false;
    }
}
```

이 방식은 **전략적 완결성**&#8203; 측면에서는 훌륭합니다. "어떤 키가 눌렸는가?"라는 질문에 가장 정직하게 답하니까요. 하지만 프로젝트의 규모가 커지고 게임패드, 조이스틱 등 다양한 디바이스가 추가되는 순간 **유지보수 비용의 증가**&#8203;라는 벽에 부딪힙니다.

:::swallow
"W 키가 눌리면 전진한다"는 로직은 쉽습니다. 하지만 "게임패드의 왼쪽 스틱을 위로 밀거나, W 키를 누를 때 전진한다. 단, 스틱은 데드존이 있어야 한다"는 요구사항이 들어오면 코드는 복잡한 조건문으로 뒤덮이기 시작하죠.
:::

---

## 2. Enhanced Input: 데이터 기반의 전처리(Pre-processor)

언리얼의 Enhanced Input은 입력을 **하드웨어 신호**&#8203;가 아닌 **데이터의 흐름**&#8203;으로 봅니다. 여기서 가장 핵심적인 개념이 바로 **Modifier**&#8203;입니다.

하드웨어에서 들어온 날것(Raw)의 데이터를 액션(Action)으로 보내기 전에, 중간에서 가공하는 공정 과정을 거치는 것이죠. 이는 마치 **장거리 호흡**&#8203;을 위해 페이스를 조절하는 것과 같습니다.

### 🛠️ 주요 Modifier의 역할 (데이터 가공의 미학)

| 카테고리 | Modifier | 핵심 역할 |
| :--- | :--- | :--- |
| **변환(Transform)** | **Negate / Scalar** | 부호를 뒤집거나 크기를 곱함. (S키에 -1을 곱해 전진 액션에 활용) |
| **보정(Calibration)** | **Dead Zone** | 아날로그 스틱의 미세한 노이즈(리스크)를 제거. |
| **해석(Swizzle)** | **Swizzle Axis** | 1D 입력을 Y축이나 Z축 데이터로 재배치. |
| **체감(Feel)** | **Response Curve** | 입력값에 곡선을 적용하여 조작의 심미적 미학을 구현. |

---

## 3. 다음 자체 Engine에 적용할 설계 철학

단순히 `GetKeyDown(KeyCode::W)`를 체크하는 방식을 넘어, 자체 엔진에서도 이러한 **추상화 레이어**&#8203;를 구축해야 할 시점이 왔습니다. 

> [!warning] 설계 주의사항
> 모든 입력 처리를 하드코딩하는 것은 당장의 시간은 아낄 수 있으나, 나중에 더 큰 **기술 부채**&#8203;로 돌아옵니다.

따라서 졸업 프로젝트는 여러 플랫폼을 고려해서더라도. 언리얼 엔진의 이 논리로 설계할려고 합니다. 

---

## 결론: 시스템이 주는 자유

직접 모든 키 코드를 매핑하는 것은 때로 즐거운 작업이지만, 시스템으로 문제를 해결하는 것은 개발자에게 더 큰 자유를 줍니다. 입력을 **리스크 관리**&#8203;의 관점에서 바라보고, 하드웨어라는 변수를 상수로 통제하는 구조를 만드는 것. 그것이 제가 추구하는 **기술적 미학**&#8203;입니다.

---
