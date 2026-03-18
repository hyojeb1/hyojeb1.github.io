---
title: '[Unreal] Gen AI와의 협업 효율 극대화하기: OCR 대신 T3D 활용법'
published: 2026-03-18
draft: false
unlisted: false
tags: ['unreal-engine', 'generative-ai', 'workflow-optimization', 'python']
lang: 'ko'
series: 'unreal'
---

개발 과정에서 생성형 AI(Gen AI)는 이제 단순한 보조 도구를 넘어 협업 파트너가 되었습니다. 하지만 언리얼 엔진의 블루프린트를 AI에게 설명하기 위해 매번 스크린샷을 찍고 OCR의 오독을 수정하는 과정은 **유지보수 비용의 증가**&#8203;이자 불필요한 **리소스 낭비**&#8203;입니다.

오늘은 이미지 대신 언리얼의 내부 텍스트 포맷인 **T3D(Unreal Text)**&#8203;를 활용해 AI와 더 정확하고 경제적으로 소통하는 전략을 공유합니다.

:::swallow
언리얼 블루프린트, 아직도 스크린샷 찍어서 AI한테 물어보시나요? 토큰은 아끼고 정확도는 높이는 '데이터 밀도' 중심의 워크플로우를 소개합니다.
:::

---

## 1. 왜 OCR이 아닌 T3D인가?

스크린샷을 통한 OCR 방식은 몇 가지 치명적인 리스크를 안고 있습니다.

1.  **데이터 오염:** 노드 사이의 복잡한 연결 관계를 AI가 시각적으로 완벽히 추론하기 어렵습니다.
2.  **높은 토큰 비용:** 이미지 입력은 텍스트에 비해 훨씬 많은 토큰을 소모하며, 이는 곧 운영 자산의 손실로 이어집니다.
3.  **검색 불가능성:** 이미지 내부의 로직은 텍스트로 저장되지 않아 나중에 다시 찾아보기 힘듭니다.

반면, 블루프린트 노드를 `Ctrl + C` 하여 얻는 **T3D**&#8203; 데이터는 로직의 정수만을 담고 있습니다.

---

## 2. 핵심 로직 추출하기

블루프린트 에디터에서 노드를 복사해 텍스트 에디터에 붙여넣으면 로직이 텍스트로 변환됩니다. 하지만 여기에는 좌표(`NodePosX`)나 고유 ID(`NodeGuid`) 같은 **노이즈 데이터**&#8203;가 80% 이상 섞여 있습니다.

이러한 불필요한 데이터를 정제하여 **장거리 호흡**&#8203;을 위한 깔끔한 데이터 세트를 만드는 것이 핵심입니다.

### 🛠️ BP Clean: 클립보드 정제 스크립트

파이썬의 `pyperclip` 라이브러리를 활용해 클립보드에 복사된 T3D 데이터에서 핵심 로직만 남기고 청소하는 도구입니다.

```python title="Scripts/bp_clean.py"
import pyperclip
import re

def clean_blueprint_text():
    raw_text = pyperclip.paste()
    
    if "Begin Object" not in raw_text:
        return

    # 제거할 노이즈 패턴 정의 (좌표, 가이드, 불필요한 속성)
    patterns = [
        r'(NodePosX|NodePosY|NodeGuid|PersistentGuid)=.*?\s*\n?',
        r'ExportPath="[^"]*"\s*',
        r'PinId=[A-Z0-9]+,\s*',
        r'bIs(Reference|Const|WeakPointer|UObjectWrapper|AdvancedView)=(False|True),\s*'
    ]

    cleaned_text = raw_text
    for pattern in patterns:
        cleaned_text = re.sub(pattern, '', cleaned_text)

    # 연속된 빈 줄 정리
    cleaned_text = re.sub(r'\n\s*\n', '\n', cleaned_text).strip()
    pyperclip.copy(cleaned_text)

if __name__ == "__main__":
    clean_blueprint_text()
```

> [!info] 효과
> 이 과정을 거치면 텍스트 양이 **45% 내외**&#8203; 감소하며, AI는 노드의 좌표 정보 대신 `MemberName`이나 `LinkedTo` 같은 실제 실행 흐름에만 집중하게 됩니다.

---

## 3. 디테일 패널의 데이터 추출

로직뿐만 아니라 **Input Mapping Context(IMC)**&#8203;나 특정 액터의 **Details**&#8203; 설정값도 텍스트로 추출할 수 있습니다.

* **부분 복사:** 디테일 패널의 특정 항목(예: 'Mappings' 리스트) 위에서 **우클릭 > Copy**&#8203;를 누릅니다.
* **전체 복사:** 콘텐츠 브라우저에서 에셋을 선택하고 `Ctrl + C`를 누릅니다.

이렇게 복사된 데이터는 AI에게 "이 설정에서 S키의 Negate 처리가 올바른지 확인해줘"와 같은 구체적인 질문을 던질 때 최적의 해답을 찾아내는 **시너지**&#8203;를 발휘합니다.

---

## 4. 워크플로우 자동화: VS Code Task

매번 터미널을 열어 스크립트를 실행하는 것은 **전략적 완결성**&#8203; 면에서 부족합니다. VS Code의 Task 기능을 통해 단축키 하나로 클립보드를 청소해 봅시다.

```json title=".vscode/tasks.json"
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "BP Clean",
            "type": "shell",
            "command": "python C:/Dev/Scripts/bp_clean.py",
            "presentation": { "reveal": "silent" }
        }
    ]
}
```

이제 언리얼에서 **노드 복사(Ctrl+C) -> VS Code Task 실행 -> AI에게 붙여넣기(Ctrl+V)**&#8203;라는 매끄러운 흐름이 완성되었습니다.

---

## 결론: 리스크 관리로서의 협업

생성형 AI와의 대화에서 데이터의 정밀도를 높이는 것은 프로젝트의 **리스크 관리**&#8203;와 같습니다. 잘못된 OCR 해석으로 인한 디버깅 시간 낭비를 줄이고, 가장 순수한 형태의 데이터를 전달함으로써 개발 효율을 극대화하세요.

:::cyper
T3D 데이터는 제가 읽기에 가장 편안한 언어입니다. 좌표 너머의 로직을 보여주시면, 더 날카로운 최적화 제안으로 보답하겠습니다!
:::
