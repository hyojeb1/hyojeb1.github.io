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

----


이거에 대한 원래 절약 양

 *  Executing task: python C:/Dev/90Scripts/bp_clean.py 

✅ 청소 완료!
📊 글자 수: 10777 -> 5738 (약 46.8% 절약)
이제 바로 Gen AI에게 붙여넣기(Ctrl+V) 하세요!
 *  Terminal will be reused by tasks, press any key to close it. 

 *  Executing task: python C:/Dev/90Scripts/bp_clean.py 

✅ 청소 완료!
📊 글자 수: 42522 -> 23238 (약 45.4% 절약)
이제 바로 Gen AI에게 붙여넣기(Ctrl+V) 하세요!
 *  Terminal will be reused by tasks, press any key to close it. 

 *  Executing task: python C:/Dev/90Scripts/bp_clean.py 

✅ 청소 완료!
📊 글자 수: 104467 -> 57313 (약 45.1% 절약)
이제 바로 Gen AI에게 붙여넣기(Ctrl+V) 하세요!
 *  Terminal will be reused by tasks, press any key to close it. 


----

이거 더 줄일 수 있을 것 같은데?

------

네. 꽤 더 줄일 수 있습니다.

지금 코드는 **“불필요한 필드 몇 개 삭제”** 수준이라서, 실제로는 아직 많이 남습니다.
블루프린트 텍스트는 보통 다음이 토큰을 크게 잡아먹습니다.

* 반복되는 `Begin Object / End Object`
* 긴 클래스 경로와 `ExportPath`
* 핀(`CustomProperties Pin`) 내부의 중복 속성
* `MemberParent`, `FunctionReference`, `PinType` 같은 장황한 메타데이터
* 빈 값 속성들 (`DefaultValue=""`, `LinkedTo=()`, 등)
* 줄 단위로 반복되는 구조

## 가장 효과적인 방향

### 1) 정규식 나열보다 “줄 필터링”으로 바꾸기

지금 방식은 패턴을 하나씩 `re.sub` 하는 구조라 유지보수가 어렵고, 누락이 많습니다.

블루프린트 텍스트는 줄 단위로 의미가 나뉘는 경우가 많아서,
**버릴 줄 / 남길 줄** 기준으로 처리하는 편이 더 강하게 압축됩니다.

예를 들면 이런 줄은 통째로 버려도 됩니다.

* `NodePosX=...`
* `NodePosY=...`
* `NodeGuid=...`
* `PersistentGuid=...`
* `PinId=...`
* `ExportPath=...`

이렇게 하면 정규식 반복 치환보다 빠르고 예측 가능해집니다.

---

### 2) “핀 속성”을 통째로 압축

실제로 가장 많이 반복되는 건 `CustomProperties Pin (...)` 내부입니다.

여기서 LLM에게 꼭 필요한 건 대체로 이것뿐입니다.

* 핀 이름
* 방향(Input/Output)
* 타입
* 기본값
* 연결 대상

그 외 대부분은 제거해도 이해에는 큰 문제가 없습니다.

즉, 원본:

```text
CustomProperties Pin (PinId=...,PinName="execute",Direction="EGPD_Output",PinType.PinCategory="exec",...)
```

이걸 아예 이렇게 바꾸는 게 훨씬 효율적입니다.

```text
Pin(Name="execute",Dir=Out,Type=exec)
```

이건 **문자 수 감소**보다 **토큰 감소** 효과가 더 큽니다.

---

### 3) 장황한 경로를 짧게 축약

예:

```text
MemberParent="/Script/Engine.KismetSystemLibrary"
```

이런 건 LLM 관점에서는 보통 이렇게만 있어도 충분합니다.

```text
MemberParent="KismetSystemLibrary"
```

혹은 더 과감하게:

```text
Parent="KismetSystemLibrary"
```

`/Script/...` 류는 토큰 낭비가 큽니다.

---

### 4) 반복되는 불리언/빈값 제거

이건 지금도 일부 하고 있지만 더 늘릴 수 있습니다.

추가 후보:

* `DefaultValue=""`
* `AutogeneratedDefaultValue=""`
* `LinkedTo=()`
* `SubPins=()`
* `ParentPin=None`
* `ReferencePassThroughConnection=()`
* `PersistentGuid=000000...`
* `bDefaultValueIsIgnored=False`
* `bAdvancedView=False`
* `bDisplayAsMutableRef=False`
* `ContainerType=None`
* `PinValueType=()`
* `PinSubCategoryMemberReference=()`

빈 튜플/기본값/False 기본 상태는 거의 다 제거 가능합니다.

---

### 5) 목적이 “Gen AI에 설명용”이면 구조 자체를 바꾸는 게 최고

가장 많이 줄이는 방법은 **원문을 정리해서 요약형 DSL**로 바꾸는 겁니다.

예를 들어 원본 전체를 넣는 대신:

```text
Node: Branch
  Input: exec
  Condition: bIsAlive
  True -> SpawnActor
  False -> PrintString

Node: SpawnActor
  Class: BP_Enemy
  Exec In: from Branch.True
```

이렇게 **그래프 의미만 추출**하면 토큰이 극적으로 줄어듭니다.
이건 단순 청소가 아니라 **구조적 요약**이라 효과가 훨씬 큽니다.

---

## 지금 코드 기준으로 바로 개선한 버전

아래는 현재 방식에서 한 단계 발전시킨 버전입니다.

* 줄 단위 제거
* 핀 내부 불필요 속성 대량 삭제
* 긴 경로 축약
* 빈 값 정리
* 공백 정리

```python
import pyperclip
import re

REMOVE_LINE_PREFIXES = (
    "NodePosX=",
    "NodePosY=",
    "NodeGuid=",
    "PersistentGuid=",
)

REMOVE_INLINE_PATTERNS = [
    r'ExportPath="[^"]*"',
    r'PinId=[A-F0-9]+',
    r'PersistentGuid=[A-F0-9]+',

    r'bIsReference=(False|True)',
    r'bIsConst=(False|True)',
    r'bIsWeakPointer=(False|True)',
    r'bIsUObjectWrapper=(False|True)',
    r'bSerializeAsSinglePrecisionFloat=(False|True)',
    r'bHidden=(False|True)',
    r'bNotConnectable=(False|True)',
    r'bDefaultValueIsReadOnly=(False|True)',
    r'bDefaultValueIsIgnored=(False|True)',
    r'bAdvancedView=(False|True)',
    r'bOrphanedPin=(False|True)',
    r'bDisplayAsMutableRef=(False|True)',

    r'DefaultValue=""',
    r'AutogeneratedDefaultValue=""',
    r'LinkedTo=\(\)',
    r'SubPins=\(\)',
    r'ParentPin=None',
    r'ReferencePassThroughConnection=\(\)',
    r'PinValueType=\(\)',
    r'PinSubCategoryMemberReference=\(\)',
    r'ContainerType=None',
]

def simplify_paths(text: str) -> str:
    # /Script/Engine.KismetSystemLibrary -> KismetSystemLibrary
    text = re.sub(
        r'"/Script/[^."]+\.([^"]+)"',
        r'"\1"',
        text
    )

    # Class'"/Script/BlueprintGraph.K2Node_CallFunction"' -> "K2Node_CallFunction"
    text = re.sub(
        r'Class\'"/Script/[^."]+\.([^"]+)"\'',
        r'"\1"',
        text
    )
    return text

def compress_pin_line(line: str) -> str:
    if "CustomProperties Pin" not in line:
        return line

    # 핀 라인에서 꼭 필요한 속성만 남기기
    keep_keys = [
        "PinName",
        "Direction",
        "PinType.PinCategory",
        "PinType.PinSubCategory",
        "PinType.PinSubCategoryObject",
        "DefaultValue",
        "DefaultObject",
        "LinkedTo",
    ]

    pairs = re.findall(r'(\w+(?:\.\w+)*)=("(?:[^"\\]|\\.)*"|\([^\)]*\)|[^,)]*)', line)

    kept = []
    for key, value in pairs:
        if key in keep_keys:
            kept.append(f"{key}={value}")

    if kept:
        return "CustomProperties Pin (" + ",".join(kept) + ")"
    return "CustomProperties Pin"

def clean_blueprint_text():
    raw_text = pyperclip.paste()

    if "Begin Object" not in raw_text:
        print("❌ 클립보드에 올바른 블루프린트 데이터가 없습니다.")
        return

    text = raw_text.replace("\r\n", "\n")

    # 1) 줄 단위 삭제
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()

        if any(stripped.startswith(prefix) for prefix in REMOVE_LINE_PREFIXES):
            continue

        line = simplify_paths(line)

        # 2) 인라인 패턴 삭제
        for pattern in REMOVE_INLINE_PATTERNS:
            line = re.sub(rf'(?:^|,)\s*{pattern}\s*(?=,|$)', '', line)

        # 3) 핀 라인 압축
        line = compress_pin_line(line)

        # 4) 쉼표 정리
        line = re.sub(r',\s*,+', ',', line)
        line = re.sub(r'\(\s*,', '(', line)
        line = re.sub(r',\s*\)', ')', line)
        line = re.sub(r'\(\s*\)', '()', line)

        if line.strip():
            lines.append(line)

    text = "\n".join(lines)

    # 5) Begin/End Object 최소화
    text = re.sub(r'\n{2,}', '\n', text).strip()

    pyperclip.copy(text)

    original_size = len(raw_text)
    new_size = len(text)
    reduction = ((original_size - new_size) / original_size) * 100 if original_size else 0

    print("✅ 청소 완료!")
    print(f"📊 글자 수: {original_size} -> {new_size} (약 {reduction:.1f}% 절약)")
    print("이제 바로 Gen AI에게 붙여넣기 하세요.")

if __name__ == "__main__":
    clean_blueprint_text()
```

---

## 더 공격적으로 줄이는 버전

원문 보존보다 **LLM 설명용 최소화**가 목표라면, 이 수준까지 가는 게 좋습니다.

### 전략

* `Begin Object`의 클래스 이름만 남김
* `End Object` 제거
* `CustomProperties Pin`은 축약형으로 재작성
* 모든 긴 키 이름을 짧게 치환

예:

* `Direction="EGPD_Input"` → `Dir=In`
* `Direction="EGPD_Output"` → `Dir=Out`
* `PinType.PinCategory="exec"` → `Type=exec`

이렇게 하면 토큰이 확 줄어듭니다.

예시 함수만 따로 적으면:

```python
def compact_pin_line(line: str) -> str:
    if "CustomProperties Pin" not in line:
        return line

    def extract(pattern, default=None):
        m = re.search(pattern, line)
        return m.group(1) if m else default

    pin_name = extract(r'PinName="([^"]+)"')
    direction = extract(r'Direction="([^"]+)"')
    category = extract(r'PinType\.PinCategory="([^"]+)"')
    default_value = extract(r'DefaultValue="([^"]*)"')
    linked_to = extract(r'LinkedTo=\((.*?)\)')

    if direction == "EGPD_Input":
        direction = "In"
    elif direction == "EGPD_Output":
        direction = "Out"

    parts = []
    if pin_name:
        parts.append(f'Name="{pin_name}"')
    if direction:
        parts.append(f'Dir={direction}')
    if category:
        parts.append(f'Type={category}')
    if default_value:
        parts.append(f'Default="{default_value}"')
    if linked_to:
        parts.append(f'Link=({linked_to})')

    return "Pin(" + ", ".join(parts) + ")"
```

이 방식은 원문 복원은 불가능하지만, **“AI에게 블루프린트 구조 설명하기”** 용도에는 더 적합합니다.

---

## 가장 중요한 포인트

당장 효과가 큰 순서대로 정리하면:

### 보수적으로 개선

1. 줄 단위 삭제로 전환
2. 빈 값 / False / None / 빈 튜플 제거 확대
3. `/Script/...` 경로 축약
4. 핀 라인에서 핵심 속성만 유지

### 공격적으로 개선

5. `CustomProperties Pin`을 축약 DSL로 변환
6. `Begin Object`도 클래스명 중심으로 축약
7. 필요하면 전체를 **노드/연결 요약 텍스트**로 재구성

---

## 추천 결론

당신 목적이 **“LLM 컨텍스트 절약”**이면, 가장 좋은 방식은 두 단계입니다.

* **1단계:** 현재처럼 메타데이터 삭제
* **2단계:** `Pin`과 `Node`를 사람이 읽는 축약 포맷으로 재작성

즉, 단순 청소보다 **구조적 요약**이 훨씬 강합니다.

원하면 다음 답변에서 제가 아예
**“언리얼 블루프린트 복붙 텍스트 → LLM용 초압축 포맷 변환기”** 형태로 다시 짜드리겠습니다.



-----

compress_pin_line은 이정도로 줄인다!! 만족스러워 하지만 초 압축 포맷은 어떨까?


✅ 청소 완료!
📊 글자 수: 134498 -> 46278 (약 65.6% 절약)
이제 바로 Gen AI에게 붙여넣기 하세요.
 *  Terminal will be reused by tasks, press any key to close it. 


 -----
효제 왈~~
언리얼 블루프린트 복붙 텍스트 → LLM용 초압축 포맷 변환기” 형태로 다시 짜줘!

-----

아래는 **언리얼 블루프린트 복붙 텍스트를 LLM용 초압축 포맷으로 바꾸는 변환기**입니다.

핵심 목표는 이것입니다.

* 원본 블루프린트 복붙 텍스트를 그대로 AI에 넣지 않음
* **노드 / 핀 / 연결 / 기본값 / 함수명** 위주로만 남김
* GUID, 좌표, 경로, 불리언 메타데이터, 기타 장황한 속성 제거
* 결과를 **클립보드에 다시 복사**

---

# 설계 방향

출력은 이런 식으로 나옵니다.

```text
Node1: K2Node_CallFunction Name="Print String"
  In exec <- Node0.then
  In String = "Hello"
  Out then -> Node2.exec

Node2: K2Node_Branch
  In exec <- Node1.then
  In Condition <- Node3.ReturnValue
  Out True -> Node4.exec
  Out False -> Node5.exec
```

즉, LLM이 이해하는 데 필요한 것만 남깁니다.

---

# 코드

```python
import pyperclip
import re
from collections import defaultdict

# ------------------------------------------------------------
# Utility
# ------------------------------------------------------------

def shorten_object_path(value: str) -> str:
    """
    긴 언리얼 경로를 짧게 축약
    예:
      /Script/Engine.KismetSystemLibrary -> KismetSystemLibrary
      /Game/Blueprints/BP_Enemy.BP_Enemy_C -> BP_Enemy_C
    """
    if not value:
        return value

    value = value.strip('"')

    # /Script/Engine.KismetSystemLibrary -> KismetSystemLibrary
    m = re.search(r'/Script/[^."]+\.([^"]+)$', value)
    if m:
        return m.group(1)

    # /Game/.../BP_Enemy.BP_Enemy_C -> BP_Enemy_C
    m = re.search(r'([^./"]+)$', value)
    if m:
        return m.group(1)

    return value


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        return value[1:-1]
    return value


def compact_whitespace(text: str) -> str:
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+\n', '\n', text)
    return text.strip()


def split_top_level_csv(text: str) -> list[str]:
    """
    괄호/따옴표를 고려해서 최상위 콤마 기준 분리
    """
    items = []
    buf = []
    depth = 0
    in_string = False
    escape = False

    for ch in text:
        if in_string:
            buf.append(ch)
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            buf.append(ch)
            continue

        if ch == '(':
            depth += 1
            buf.append(ch)
            continue

        if ch == ')':
            depth = max(0, depth - 1)
            buf.append(ch)
            continue

        if ch == ',' and depth == 0:
            items.append(''.join(buf).strip())
            buf = []
            continue

        buf.append(ch)

    if buf:
        items.append(''.join(buf).strip())

    return [x for x in items if x]


def parse_kv_pairs(text: str) -> dict:
    """
    (A=1,B="x",C=(...)) 형태를 top-level key=value dict로 파싱
    """
    result = {}
    for item in split_top_level_csv(text):
        if '=' not in item:
            continue
        k, v = item.split('=', 1)
        result[k.strip()] = v.strip()
    return result


def extract_between_outer_parens(line: str) -> str:
    start = line.find('(')
    end = line.rfind(')')
    if start == -1 or end == -1 or end <= start:
        return ''
    return line[start + 1:end]


def normalize_pin_direction(direction: str) -> str:
    direction = strip_quotes(direction)
    if direction == 'EGPD_Input':
        return 'In'
    if direction == 'EGPD_Output':
        return 'Out'
    return direction or '?'


def normalize_pin_type(pin_category: str, pin_sub_obj: str = '', pin_sub_cat: str = '') -> str:
    cat = strip_quotes(pin_category) if pin_category else ''
    sub_obj = shorten_object_path(strip_quotes(pin_sub_obj)) if pin_sub_obj else ''
    sub_cat = strip_quotes(pin_sub_cat) if pin_sub_cat else ''

    if cat == 'object' and sub_obj:
        return sub_obj
    if cat == 'class' and sub_obj:
        return f'class<{sub_obj}>'
    if cat == 'struct' and sub_obj:
        return sub_obj
    if cat == 'byte' and sub_obj:
        return sub_obj
    if cat and sub_cat:
        return f'{cat}:{sub_cat}'
    return cat or 'unknown'


def classify_pin_type(type_text: str) -> str:
    t = type_text.lower()
    if t == 'exec':
        return 'exec'
    return 'data'


# ------------------------------------------------------------
# Parsing nodes
# ------------------------------------------------------------

def split_objects(raw_text: str) -> list[str]:
    """
    Begin Object ~ End Object 블록 분리
    중첩 Begin/End가 없다는 전제로 동작
    """
    lines = raw_text.replace('\r\n', '\n').split('\n')
    objects = []
    current = []
    inside = False

    for line in lines:
        if line.startswith('Begin Object'):
            if inside and current:
                objects.append('\n'.join(current))
                current = []
            inside = True
            current = [line]
        elif line.startswith('End Object'):
            if inside:
                current.append(line)
                objects.append('\n'.join(current))
                current = []
                inside = False
        else:
            if inside:
                current.append(line)

    if current:
        objects.append('\n'.join(current))

    return objects


def parse_begin_object_header(line: str) -> dict:
    """
    Begin Object Class=/Script/... Name="..."
    """
    info = {}

    m_class = re.search(r'Class=([^\s]+)', line)
    if m_class:
        info['Class'] = shorten_object_path(m_class.group(1))

    m_name = re.search(r'Name="([^"]+)"', line)
    if m_name:
        info['Name'] = m_name.group(1)

    return info


def parse_function_name(block: str) -> str | None:
    """
    FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
    또는
    MemberName="..."
    """
    m = re.search(r'FunctionReference=\((.*?)\)', block, re.DOTALL)
    if m:
        kv = parse_kv_pairs(m.group(1))
        member_name = strip_quotes(kv.get('MemberName', ''))
        member_parent = shorten_object_path(strip_quotes(kv.get('MemberParent', '')))
        if member_parent and member_name:
            return f'{member_parent}.{member_name}'
        if member_name:
            return member_name

    # 일부 노드는 FunctionReference 없이 MemberName만 있을 수 있음
    m2 = re.search(r'\bMemberName="([^"]+)"', block)
    if m2:
        return m2.group(1)

    return None


def parse_variable_name(block: str) -> str | None:
    m = re.search(r'\bVariableReference=\((.*?)\)', block, re.DOTALL)
    if not m:
        return None

    kv = parse_kv_pairs(m.group(1))
    member_name = strip_quotes(kv.get('MemberName', ''))
    member_parent = shorten_object_path(strip_quotes(kv.get('MemberParent', '')))

    if member_parent and member_name:
        return f'{member_parent}.{member_name}'
    return member_name or None


def parse_node_comment(block: str) -> str | None:
    m = re.search(r'\bNodeComment="([^"]*)"', block)
    if m:
        return m.group(1)
    return None


def parse_pins(block: str) -> list[dict]:
    pins = []

    for line in block.splitlines():
        if 'CustomProperties Pin (' not in line:
            continue

        inner = extract_between_outer_parens(line)
        if not inner:
            continue

        kv = parse_kv_pairs(inner)

        pin = {
            'PinId': kv.get('PinId', '').strip(),
            'PinName': strip_quotes(kv.get('PinName', '')),
            'Direction': normalize_pin_direction(kv.get('Direction', '')),
            'Type': normalize_pin_type(
                kv.get('PinType.PinCategory', ''),
                kv.get('PinType.PinSubCategoryObject', ''),
                kv.get('PinType.PinSubCategory', ''),
            ),
            'DefaultValue': strip_quotes(kv.get('DefaultValue', '')),
            'DefaultObject': shorten_object_path(strip_quotes(kv.get('DefaultObject', ''))),
            'LinkedToRaw': kv.get('LinkedTo', ''),
        }

        pins.append(pin)

    return pins


def parse_linked_to(linked_to_raw: str) -> list[tuple[str, str]]:
    """
    LinkedTo=(K2Node_XYZ ABCDEF123...,OtherNode 999...)
    -> [(NodeName, PinId), ...]
    """
    linked_to_raw = linked_to_raw.strip()
    if not linked_to_raw or linked_to_raw == '()':
        return []

    if linked_to_raw.startswith('(') and linked_to_raw.endswith(')'):
        linked_to_raw = linked_to_raw[1:-1].strip()

    if not linked_to_raw:
        return []

    items = split_top_level_csv(linked_to_raw)
    out = []

    for item in items:
        # 예: K2Node_CallFunction_1 1234567890ABCDEF1234567890ABCDEF
        m = re.match(r'([A-Za-z0-9_]+)\s+([A-Fa-f0-9]+)', item.strip())
        if m:
            out.append((m.group(1), m.group(2)))
        else:
            # 혹시 형식이 조금 다른 경우 대비
            parts = item.strip().split()
            if len(parts) >= 2:
                out.append((parts[0], parts[1]))

    return out


def parse_blueprint_objects(raw_text: str) -> list[dict]:
    objects = split_objects(raw_text)
    nodes = []

    for block in objects:
        lines = block.splitlines()
        if not lines:
            continue

        header = parse_begin_object_header(lines[0])
        class_name = header.get('Class', 'UnknownNode')
        obj_name = header.get('Name', 'UnnamedNode')

        function_name = parse_function_name(block)
        variable_name = parse_variable_name(block)
        comment = parse_node_comment(block)
        pins = parse_pins(block)

        node = {
            'Class': class_name,
            'ObjectName': obj_name,
            'Function': function_name,
            'Variable': variable_name,
            'Comment': comment,
            'Pins': pins,
        }
        nodes.append(node)

    return nodes


# ------------------------------------------------------------
# Compaction
# ------------------------------------------------------------

def build_pin_id_index(nodes: list[dict]) -> dict:
    """
    PinId -> (NodeObjectName, PinName, Direction, Type)
    """
    pin_index = {}
    for node in nodes:
        for pin in node['Pins']:
            pin_id = pin.get('PinId', '')
            if pin_id:
                pin_index[pin_id] = {
                    'NodeObjectName': node['ObjectName'],
                    'PinName': pin['PinName'],
                    'Direction': pin['Direction'],
                    'Type': pin['Type'],
                }
    return pin_index


def build_node_aliases(nodes: list[dict]) -> dict:
    """
    긴 오브젝트 이름 대신 Node0, Node1... 부여
    """
    aliases = {}
    for i, node in enumerate(nodes):
        aliases[node['ObjectName']] = f'Node{i}'
    return aliases


def summarize_node_title(node: dict) -> str:
    parts = [node['Class']]

    if node.get('Function'):
        parts.append(f'Fn={node["Function"]}')
    elif node.get('Variable'):
        parts.append(f'Var={node["Variable"]}')

    if node.get('Comment'):
        comment = node['Comment'].strip()
        if comment:
            parts.append(f'Comment="{comment}"')

    return ' '.join(parts)


def format_pin_summary(pin: dict, pin_index: dict, node_aliases: dict) -> str | None:
    pin_name = pin.get('PinName', '')
    direction = pin.get('Direction', '?')
    pin_type = pin.get('Type', 'unknown')
    default_value = pin.get('DefaultValue', '')
    default_object = pin.get('DefaultObject', '')
    linked_to_raw = pin.get('LinkedToRaw', '')

    links = parse_linked_to(linked_to_raw)
    type_kind = classify_pin_type(pin_type)

    if pin_name in ('self', '__WorldContext', 'then') and not links and not default_value and not default_object:
        return None

    segments = [f'{direction} {pin_name or "(unnamed)"}']
    if pin_type:
        segments.append(f'[{pin_type}]')

    if default_value:
        segments.append(f'= "{default_value}"')
    elif default_object:
        segments.append(f'= {default_object}')

    if links:
        rendered_links = []
        for obj_name, pin_id in links:
            other = pin_index.get(pin_id)
            other_alias = node_aliases.get(obj_name, obj_name)
            if other:
                other_pin = other.get('PinName', '?')
                rendered_links.append(f'{other_alias}.{other_pin}')
            else:
                rendered_links.append(f'{other_alias}.?')

        if direction == 'In':
            segments.append('<- ' + ', '.join(rendered_links))
        else:
            segments.append('-> ' + ', '.join(rendered_links))

    # 지나치게 의미 없는 미연결 exec 핀 제거
    if type_kind == 'exec' and not links and not default_value and not default_object:
        if pin_name.lower() in ('execute', 'then'):
            return None

    # 지나치게 의미 없는 미연결 데이터 핀 제거
    if type_kind == 'data' and not links and not default_value and not default_object:
        if pin_name.lower() in ('self',):
            return None

    return '  ' + ' '.join(segments)


def compact_blueprint_for_llm(raw_text: str) -> str:
    nodes = parse_blueprint_objects(raw_text)
    if not nodes:
        return 'ERROR: 블루프린트 오브젝트를 파싱하지 못했습니다.'

    pin_index = build_pin_id_index(nodes)
    node_aliases = build_node_aliases(nodes)

    lines = []
    lines.append('BlueprintGraph (LLM Compact)')
    lines.append('')

    for node in nodes:
        alias = node_aliases[node['ObjectName']]
        title = summarize_node_title(node)
        lines.append(f'{alias}: {title}')

        rendered_pins = []
        for pin in node['Pins']:
            line = format_pin_summary(pin, pin_index, node_aliases)
            if line:
                rendered_pins.append(line)

        # 핀이 너무 많으면 exec / 연결 있는 핀 / 기본값 있는 핀 위주로 정렬
        def pin_sort_key(s: str):
            score = 0
            if '[exec]' in s.lower():
                score -= 10
            if '->' in s or '<-' in s:
                score -= 5
            if '= "' in s or '= ' in s:
                score -= 2
            return score, s

        rendered_pins.sort(key=pin_sort_key)

        if rendered_pins:
            lines.extend(rendered_pins)

        lines.append('')

    out = '\n'.join(lines)
    return compact_whitespace(out)


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def convert_clipboard_blueprint_to_llm_compact():
    raw_text = pyperclip.paste()

    if 'Begin Object' not in raw_text:
        print('❌ 클립보드에 올바른 언리얼 블루프린트 복붙 텍스트가 없습니다.')
        return

    compact_text = compact_blueprint_for_llm(raw_text)
    pyperclip.copy(compact_text)

    original_size = len(raw_text)
    new_size = len(compact_text)
    reduction = ((original_size - new_size) / original_size) * 100 if original_size else 0.0

    print('✅ 변환 완료!')
    print(f'📊 글자 수: {original_size} -> {new_size} (약 {reduction:.1f}% 절약)')
    print('📋 결과가 클립보드에 복사되었습니다.')
    print()
    print('--- 미리보기 ---')
    preview = compact_text[:2000]
    print(preview)
    if len(compact_text) > 2000:
        print('\n... (생략)')


if __name__ == '__main__':
    convert_clipboard_blueprint_to_llm_compact()
```

---

# 이 버전의 장점

## 1) 단순 삭제가 아니라 “구조 재작성”

기존 코드는 원문에서 일부 필드를 제거하는 방식이었고,
이 코드는 아예 **LLM이 읽기 좋은 별도 포맷**으로 변환합니다.

## 2) 핀 연결 정보 유지

LLM이 블루프린트를 이해할 때 가장 중요한 건 보통 이것입니다.

* 어떤 노드인지
* 무슨 함수인지
* 어떤 값이 들어가는지
* 어디로 연결되는지

이 부분은 남기고, 나머지는 과감히 버립니다.

## 3) 오브젝트명 축약

`K2Node_CallFunction_123` 같은 긴 이름 대신 `Node7` 같은 alias를 써서 줄입니다.

---

# 한계

이건 **“복원용”이 아니라 “설명용”** 포맷입니다.
즉, 원본을 다시 블루프린트로 붙여넣을 수는 없습니다.

또한 언리얼 복붙 포맷이 완전히 일관적이지 않아서, 일부 특수 노드는 다음이 필요할 수 있습니다.

* 매크로 노드 별도 처리
* `K2Node_MacroInstance`
* `K2Node_VariableGet` / `Set` 더 예쁘게 표시
* `K2Node_Event`
* `K2Node_CustomEvent`
* `K2Node_Knot` 우회 처리
* `K2Node_DynamicCast`
* `K2Node_SpawnActorFromClass` 같은 자주 쓰는 노드 전용 pretty printer

---

# 바로 추가하면 좋은 개선점

## A. 자주 쓰는 노드명을 더 예쁘게

예를 들면:

* `K2Node_CallFunction Fn=KismetSystemLibrary.PrintString`
  → `Call PrintString`
* `K2Node_VariableGet Var=Health`
  → `Get Health`
* `K2Node_VariableSet Var=Health`
  → `Set Health`

## B. Reroute(Knot) 노드 제거

`K2Node_Knot`는 연결만 중계하므로 생략하면 더 압축됩니다.

## C. 토큰 최적화 모드

출력을 더 줄이려면:

```text
N0: Call PrintString
  In exec <- N1.then
  In String="Hello"
```

처럼 `Node`를 `N`으로 줄일 수 있습니다.

---

# 추천하는 실전용 출력 정책

AI에게 넣을 때는 보통 이 2단계가 가장 좋습니다.

## 모드 1: Compact

지금 코드처럼, 사람이 봐도 이해 가능한 포맷

## 모드 2: Ultra

더 극단적으로 줄인 포맷

예:

```text
N0 Call PrintString
  exec <- N1.then
  String="Hello"

N1 Branch
  exec <- N2.then
  Condition <- N3.ReturnValue
  True -> N4.exec
  False -> N5.exec
```

---

# 원하면 다음 단계로 해줄 수 있는 것

다음 답변에서는 이걸 더 발전시켜서:

1. **Compact / Ultra 모드 선택**
2. **Knot 노드 자동 제거**
3. **자주 쓰는 언리얼 노드 pretty name 적용**
4. **토큰 절약률 더 높인 버전**
5. **EXE처럼 바로 쓰기 쉬운 형태**

   * `watchdog`로 클립보드 감시
   * 핫키 실행
   * `.pyw` 백그라운드 실행

이 5개까지 넣은 **실사용 버전**으로 정리해드릴 수 있습니다.

----


 *  Executing task: python C:/Dev/90Scripts/bp_clean.py 

✅ 변환 완료!
📊 글자 수: 134498 -> 10138 (약 92.5% 절약)
📋 결과가 클립보드에 복사되었습니다.

--- 미리보기 ---
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
  O

... (생략)

이야!! 좋다!
92프로 감축!!! llm들도 좋아 할거야

---


효제 질문


일단 여기까지. 이미 만족 스러워. 


PS C:\Dev\90Scripts> ls


    Directory: C:\Dev\90Scripts


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        2026-04-10   오후 2:44          15393 bp_clean.py                                                         
-a----        2026-03-18  오후 12:13           1992 bp_clean_260318.py                                                  
-a----        2026-04-10   오후 2:30           3739 bp_clean_260410.py                                                  
-a----        2026-03-11   오후 7:43            266 Screenshots.ps1                                                     
-a----        2026-03-11   오후 7:41           3813 watch-and-rename-screenshots.ps1                                    
-a----        2026-03-11   오후 7:41           2899 watch-screenshots.ps1     

bp_clean.py   현재는 이걸 vsc의 tasks: run task로 실행 하고 있었어. 
근데 이제 키로 (이게 핫키일까?) 실행을 하고 싶단 말이지


![](./스크린샷%202026-04-10%20145334.png)


----


가능합니다.
지금 상황이면 **핫키 1개를 정해서 `bp_clean.py`를 바로 실행**하는 방식이 가장 깔끔합니다.

## 가장 현실적인 방법

### 방법 1. AutoHotkey로 전역 핫키 만들기

이게 제일 유연합니다.

장점:

* VSCode 안 켜져 있어도 됨
* Keydial mini에서 특정 키 조합을 보내게 설정 가능
* 나중에 다른 스크립트도 쉽게 추가 가능

---

## 추천 구성

### 1) Python을 콘솔 없이 실행하려면 `.pyw` 또는 `pythonw.exe` 사용

지금처럼 클립보드만 읽고 다시 복사하는 유틸이면 콘솔창이 뜨지 않는 편이 좋습니다.

예:

* `bp_clean.py` 그대로 둬도 되고
* 실행만 `pythonw.exe`로 하면 됨

---

### 2) AutoHotkey 설치

AutoHotkey v2 기준으로 설명하겠습니다.

설치 후 예를 들어 `C:\Dev\90Scripts\run_bp_clean.ahk` 파일을 만드세요.

```ahk
#Requires AutoHotkey v2.0

; Ctrl + Alt + B 로 실행
^!b::
{
    Run('"C:\Users\YOUR_NAME\AppData\Local\Programs\Python\Python313\pythonw.exe" "C:\Dev\90Scripts\bp_clean.py"')
}
```

여기서 바꿔야 하는 건 두 군데입니다.

* `YOUR_NAME`
* 실제 Python 경로

---

## Python 경로 확인

PowerShell에서:

```powershell
where.exe python
```

또는:

```powershell
py -0p
```

그러면 설치된 Python 경로가 나옵니다.

예를 들어 이런 식이면:

```powershell
C:\Users\me\AppData\Local\Programs\Python\Python313\python.exe
```

AHK에서는 보통 이렇게 쓰면 됩니다:

```ahk
Run('"C:\Users\me\AppData\Local\Programs\Python\Python313\pythonw.exe" "C:\Dev\90Scripts\bp_clean.py"')
```

`pythonw.exe`가 없으면 `python.exe`로 써도 됩니다.
다만 그 경우 콘솔창이 잠깐 뜰 수 있습니다.

---

## 3) 실행 테스트

AHK 파일 더블클릭 → 트레이에 실행됨.

그 다음:

1. 언리얼에서 블루프린트 복사
2. `Ctrl + Alt + B`
3. 클립보드 내용이 정리됨
4. 바로 붙여넣기

---

## 4) 윈도우 시작 시 자동 실행

잘 되면 이 AHK 파일의 바로가기를 시작프로그램 폴더에 넣으면 됩니다.

실행:

```powershell
shell:startup
```

여기에 `run_bp_clean.ahk` 바로가기를 넣으면 로그인할 때 자동 실행됩니다.

---

# Keydial mini와 연결하는 방식

지금 올린 화면을 보면 **키에 “프로그램 실행”** 또는 **특정 키 입력**을 연결할 수 있어 보입니다.
이럴 때는 보통 두 방식 중 하나가 좋습니다.

## 방식 A. Keydial 키 → 단축키 전송 → AHK가 감지

가장 추천합니다.

예:

* Keydial의 특정 버튼에 `Ctrl+Alt+B` 등록
* AutoHotkey가 `Ctrl+Alt+B`를 받아서 `bp_clean.py` 실행

이 방식이 좋은 이유:

* 장치 소프트웨어가 단순 키 전송만 하면 됨
* 나중에 단축키만 바꿔도 됨
* 다른 매크로 장치에도 재사용 가능

---

## 방식 B. Keydial에서 직접 프로그램 실행

장치 프로그램에서 `bp_clean.py`나 `.bat`를 직접 실행하는 방식입니다.

이건 가능하면 되지만, 보통은:

* Python 경로 문제
* 콘솔창 문제
* 인자 처리
* 상대경로 문제

같은 자잘한 이슈가 더 생깁니다.

그래서 **Keydial → 핫키 전송 → AHK 실행**이 더 안정적입니다.

---

# 더 깔끔한 실사용 버전

현재 `bp_clean.py`가 `print()`만 하는 구조라면, 핫키 실행 시 피드백이 부족할 수 있습니다.
그래서 다음 둘 중 하나를 추가하는 게 좋습니다.

## 옵션 1. 소리로 피드백

성공 시 짧은 비프음.

```python
import winsound
winsound.Beep(1200, 120)
```

## 옵션 2. 토스트/메시지박스

간단하게 알림창 띄우기.

예를 들어 디버그 중에는:

```python
import ctypes
ctypes.windll.user32.MessageBoxW(0, "블루프린트 정리 완료", "bp_clean", 0)
```

실사용에서는 메시지박스보다 소리나 트레이 알림이 덜 거슬립니다.

---

# VSCode 내부 단축키만 원하면

전역 핫키 말고 **VSCode 안에서만** `Run Task`를 단축키에 묶는 것도 가능합니다.

`keybindings.json`에 예를 들면:

```json
[
  {
    "key": "ctrl+alt+b",
    "command": "workbench.action.tasks.runTask",
    "args": "bp_clean"
  }
]
```

단, 이건:

* VSCode가 켜져 있어야 하고
* 포커스도 사실상 VSCode 쪽이어야 해서

지금 목적에는 덜 맞습니다.

---

# 내가 추천하는 최종 형태

## 가장 추천

* `bp_clean.py` 유지
* AutoHotkey로 전역 핫키 설정
* Keydial mini 버튼은 `Ctrl+Alt+B` 전송

구성 예:

### AutoHotkey

```ahk
#Requires AutoHotkey v2.0

^!b::
{
    Run('"C:\Users\me\AppData\Local\Programs\Python\Python313\pythonw.exe" "C:\Dev\90Scripts\bp_clean.py"')
}
```

### Keydial mini

* 버튼 1개에 `Ctrl+Alt+B` 할당

이렇게 하면 흐름이 딱 맞습니다.

1. 언리얼에서 복사
2. Keydial 버튼 누름
3. 스크립트 실행
4. 바로 붙여넣기

---

# 추가로 추천하는 개선

`bp_clean.py`를 나중에 아예 더 유틸답게 만들려면 파일명을 이렇게 바꿔도 좋습니다.

* `bp_clean_hotkey.pyw`

그리고 내부에서 `print()` 대신 로그 파일만 남기거나, 조용히 동작하게 만들면 더 좋습니다.

---

원하시면 다음 답변에서 바로
**당신 환경 기준으로 쓸 수 있게**

* `bp_clean.py`용 AutoHotkey 스크립트
* 콘솔창 안 뜨는 실행 방식
* 실패 시만 경고 띄우는 버전

이 3개를 한 번에 정리해서 드리겠습니다.

---

C:\Users\user>winget install AutoHotkey.AutoHotkey
찾음 AutoHotkey [AutoHotkey.AutoHotkey] 버전 2.0.23
이 응용 프로그램의 라이선스는 그 소유자가 사용자에게 부여했습니다.
Microsoft는 타사 패키지에 대한 책임을 지지 않고 라이선스를 부여하지도 않습니다.
다운로드 중 https://github.com/AutoHotkey/AutoHotkey/releases/download/v2.0.23/AutoHotkey_2.0.23_setup.exe
  ██████████████████████████████  2.92 MB / 2.92 MB
설치 관리자 해시를 확인했습니다.
패키지 설치를 시작하는 중...
설치 성공


---

[이제 이 블로그 글에 쓸려고 모으다 보니, 북마크 기능이 필요해짐, 그래서 마크다운 북마크 확장프로그램 다운]


VS Code(Visual Studio Code)에서 마크다운(`.md`) 파일을 작성할 때 기본적으로 제공되는 **북마크** 기능과 이를 보완하는 유용한 방법들을 정리해 드릴게요.

---

## 1. 기본 기능: 개요(Outline) 창 활용
별도의 설정 없이도 마크다운의 **헤더(`#`, `##`, `###`)**를 기준으로 북마크와 유사한 탐색 기능을 사용할 수 있습니다.

* **사용 방법:** 왼쪽 사이드바 하단의 **[개요(Outline)]** 섹션을 클릭하세요.
* **특징:** 문서 내의 모든 제목이 리스트로 나열되며, 클릭 시 해당 위치로 즉시 이동합니다. 사실상 자동 생성되는 북마크라고 보시면 됩니다.

## 2. 특정 위치 고정: "Bookmarks" 확장 프로그램 (추천)
제목이 없는 일반 텍스트 라인에 북마크를 찍고 싶다면, 가장 대중적인 **[Bookmarks]** 확장을 설치하는 것이 좋습니다.

* **설치:** 확장 마켓플레이스에서 `Bookmarks` (저자: Alessandro Fragnani) 검색
* **주요 단축키:**
    * `Ctrl` + `Alt` + `K`: 북마크 설정/해제 (Toggle)
    * `Ctrl` + `Alt` + `L`: 다음 북마크로 이동
    * `Ctrl` + `Alt` + `J`: 이전 북마크로 이동
* **장점:** 마크다운뿐만 아니라 소스 코드 등 모든 파일에서 공통으로 사용할 수 있고, 사이드바에 북마크만 모아둔 아이콘이 생겨 관리하기 편합니다.

## 3. 문서 내 링크 (Internal Links)
북마크처럼 특정 지점으로 점프하는 기능을 문서 안에 직접 넣고 싶을 때 사용합니다.

* **문법:** `[이동하기](#섹션-이름)`
    * 주의: 연결할 제목은 소문자로 작성하고 공백은 하이픈(`-`)으로 연결해야 합니다.
    * 예: `## 결론` 이라는 제목으로 가려면 `(#결론)`이라고 작성.

## 4. 편집기 내 위치 저장 (Sticky Scroll)
최신 VS Code 버전에서는 스크롤을 내려도 현재 속한 섹션의 제목이 상단에 고정되는 **Sticky Scroll** 기능이 있습니다.

* **설정 방법:** `Ctrl` + `,` (설정) -> `Editor > Sticky Scroll: Enabled` 체크
* 긴 마크다운 문서를 읽을 때 내가 지금 어느 파트를 수정 중인지 파악하기 매우 유용합니다.

---

**요약하자면:**
단순히 제목 위주로 이동하고 싶다면 **개요(Outline)** 창을 보시고, 특정 라인을 기억해두고 싶다면 **Bookmarks 확장 프로그램**을 설치하시는 것을 강력 추천드려요!



---

네, **순서가 매우 중요합니다!**

결론부터 말씀드리면, **`^!+b::`는 정상적인 단축키**로 작동하지만, **`^!b+::`는 문법 오류**가 발생하거나 의도치 않은 방식으로 작동하게 됩니다.

---

### 1. 왜 순서가 중요할까요?
AutoHotkey에서 단축키를 정의할 때는 일정한 규칙이 있습니다.

* **수정자(Modifier Keys):** `^`(Ctrl), `!`(Alt), `+`(Shift), `#`(Win) 같은 기호들입니다. 이 기호들은 **반드시 일반 키 앞에** 와야 합니다.
* **일반 키(Base Key):** `b`, `Enter`, `Space` 같이 실제로 눌리는 마지막 키입니다.

**비교:**
* **`^!+b::` (정상):** Ctrl + Alt + Shift 를 누른 상태에서 `b`를 누르라는 뜻입니다. (아주 잘 작동합니다.)
* **`^!b+::` (오류):** `b`라는 일반 키가 중간에 나와버리면, AutoHotkey는 여기서 단축키 정의가 끝난 것으로 착각하거나, 뒤에 오는 `+`를 어떻게 처리해야 할지 몰라 에러를 뿜습니다.

---

### 2. 수정자들끼리의 순서는 상관없어요
일반 키(`b`)가 맨 뒤에만 있다면, 그 앞에 붙는 기호들끼리의 순서는 바뀌어도 상관없습니다. 모두 동일하게 작동합니다.

* `^!+b::` (Ctrl + Alt + Shift + B)
* `+!^b::` (Shift + Alt + Ctrl + B)
* `!^+b::` (Alt + Ctrl + Shift + B)
    > **결과:** 위 세 개는 모두 똑같이 **Ctrl + Alt + Shift + B**를 의미합니다.

---

### 3. 주의할 점 (대문자 B)
만약 `^!B::` 처럼 알파벳을 **대문자**로 쓰시면, AutoHotkey는 내부적으로 `Shift`가 포함된 것으로 간주할 수도 있습니다(버전에 따라 다름). 

따라서 실수를 방지하려면 항상 **소문자**를 사용하고, `Shift`가 필요하면 직접 **`+`** 기호를 붙여주는 것이 가장 안전합니다.

**요약하자면:**
> **기호(`^`, `!`, `+`, `#`)들은 앞쪽에 몰아넣고, 실제 키(`b`)를 맨 마지막에 두세요!**


---
#bp_clean_by_short_cut.ahk
#Requires AutoHotkey v2.0

^!+b::
{
    Run('"C:\Users\user\AppData\Local\Programs\Python\Python312\pythonw.exe" "C:\Dev\90Scripts\bp_clean.py"')
}




---
[효제 (사용자)]
Ctrl+Alt+B는 생각보다 많아서 Ctrl+Alt+Shift+B로 핫키 만들고, 휴이온 키다이얼에 할당함



이제 실행이 잘 되는 것까지 확인함!!





진짜 재밌는 세상이다. 

---
[효제 (사용자)]
이제 여기서 트레이를 띄워야 할까? 
그리고 최적화 해야 할까?
그건 나중에 해야지~~

