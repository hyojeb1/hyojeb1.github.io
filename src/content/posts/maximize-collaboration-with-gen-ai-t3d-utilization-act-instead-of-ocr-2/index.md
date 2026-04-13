---
title: '[unreal-llm] 블루프린트를 LLM이 알아듣기 쉽게 바꿔본 이야기'
published: 2026-04-13
draft: false
unlisted: false
tags: ['unreal-engine', 'generative-ai', 'workflow-optimization', 'python', 'autohotkey']
lang: 'ko'
series: 'unreal-llm'
---

:::swallow
요즘은 블루프린트 짜다가 막히면 바로 AI한테 물어보는 흐름이 꽤 자연스러워졌습니다.

그런데 어느 순간부터 이런 생각이 들었습니다.

“잠깐, 내가 지금 AI랑 대화하는 비용이 너무 큰데?”
:::

언리얼 블루프린트를 생성형 AI에게 설명할 때, 저는 한동안 스크린샷을 찍어서 보여주는 방식에 기대고 있었습니다.  
처음엔 편했습니다. 그냥 보이는 걸 찍어서 던지면 되니까요.

하지만 조금만 복잡한 그래프가 나오면 금방 한계가 보였습니다.

* 스크린샷은 생각보다 토큰을 많이 씁니다.
* OCR이나 비전 모델은 노드 연결을 완벽하게 읽지 못할 때가 있습니다.
* 결국 사람이 다시 설명을 덧붙여야 합니다.
* 나중에 같은 내용을 다시 검색하거나 재사용하기도 어렵습니다.

:::cyper
이미지도 볼 수는 있습니다만, 블루프린트는 구조가 중요하거든요.

연결 관계를 텍스트로 주시면 **제가 알아듣기 쉽겠네요~~**
:::

그래서 방향을 바꿨습니다.  
핵심은 단순합니다.

> **블루프린트를 이미지가 아니라, LLM이 읽기 좋은 텍스트로 바꾸자.**

---

## 왜 하필 T3D인가

언리얼 블루프린트는 노드를 복사하면 내부적으로 텍스트 형태가 클립보드에 들어갑니다.  
이걸 텍스트 에디터에 붙여 넣어 보면, 이미지보다 훨씬 더 직접적인 형태로 로직을 꺼낼 수 있습니다. :contentReference[oaicite:3]{index=3}

문제는 이 텍스트가 그대로는 너무 장황하다는 점입니다.

예를 들면 이런 것들이 잔뜩 붙어 있습니다.

* `NodePosX`, `NodePosY`
* `NodeGuid`, `PersistentGuid`
* 긴 클래스 경로
* `ExportPath`
* 핀 안에 들어 있는 각종 메타데이터
* 비어 있는 기본값과 불필요한 boolean 속성

즉, **로직도 들어 있지만 노이즈도 아주 많습니다.**

:::swallow
처음 T3D를 봤을 때 느낌은 이랬습니다.

“오, 이건 된다.”
그리고 바로 이어서
“아니 근데 왜 이렇게 쓸데없는 정보가 많지?”
:::

---

## 첫 단계: 일단 청소부터

처음 만든 건 `bp_clean.py`였습니다.  
방향은 보수적이었습니다. 원문 구조는 최대한 유지하되, LLM이 볼 필요 없는 메타데이터를 걷어내는 방식이었습니다. :contentReference[oaicite:4]{index=4}

예를 들어 이런 정보들을 제거했습니다.

* 노드 좌표
* GUID
* ExportPath
* 일부 불필요한 Pin 속성
* 빈 값과 기본 상태로 남아 있는 속성들

이 단계에서 바로 체감이 왔습니다.  
실측으로도 꽤 잘 줄었습니다.

> [!info] 초기 절감 결과
> `10777 -> 5738` 약 **46.8% 절약**  
> `42522 -> 23238` 약 **45.4% 절약**  
> `104467 -> 57313` 약 **45.1% 절약** :contentReference[oaicite:5]{index=5}

이 정도만 해도 이미 의미는 있었습니다.  
LLM에게 넣는 텍스트 양이 거의 절반 가까이 줄었으니까요.

:::cyper
이 시점부터는 저도 숨통이 트입니다.

좌표와 GUID를 덜 보면, 실행 흐름에 더 집중할 수 있거든요.
:::

---

## 그런데 여기서 만족하면 좀 아쉽다

초기 결과는 만족스러웠지만, 곧 이런 생각이 들었습니다.

**“이건 아직 청소지, 최적화는 아니다.”**

왜냐하면 가장 큰 토큰 낭비 구간이 아직 남아 있었기 때문입니다.  
바로 `CustomProperties Pin (...)` 영역이었습니다. :contentReference[oaicite:6]{index=6}

핀 안에는 정보가 엄청 많이 들어 있는데, 실제로 LLM이 이해하는 데 필요한 건 생각보다 적습니다.

보통 중요한 건 이 정도입니다.

* 핀 이름
* 입력/출력 방향
* 타입
* 기본값
* 어디에 연결되어 있는지

나머지는 대부분 장황한 설명입니다.

그래서 이 구간을 과감하게 다시 압축했습니다.

---

## 두 번째 단계: 핀을 사람이 읽는 형태로 압축

이제부터는 단순 삭제가 아니라, **읽기 좋은 형태로 재구성**하는 쪽으로 넘어갔습니다.

예를 들어 원래 장황한 핀 정보를 그대로 두는 대신,  
핵심 속성만 남기도록 줄였습니다.

결과는 바로 나왔습니다.

> [!info] 핀 압축 이후 결과
> `134498 -> 46278`  
> 약 **65.6% 절약** :contentReference[oaicite:7]{index=7}

여기서 느낌이 확 달라졌습니다.

문자 수만 줄어든 게 아니라,  
**LLM이 실제로 읽어야 하는 밀도**가 높아졌습니다.

:::swallow
이쯤 오면 그냥 “청소 스크립트”가 아니라,
“LLM이랑 대화하기 위한 사전 정리기” 같은 느낌이 납니다.
:::

:::cyper
네. 이제부터는 자료를 던져 주는 게 아니라,  
제가 이해하기 쉬운 방식으로 번역해 주는 단계에 가깝습니다~~
:::

---

## 세 번째 단계: 아예 LLM용 포맷으로 바꿔버리기

그다음엔 한 발 더 들어갔습니다.

여기서 질문은 이거였습니다.

> “굳이 원문을 조금 남겨야 하나?  
> 그냥 LLM이 알아듣기 좋은 구조로 다시 써버리면 되지 않나?”

그래서 최종적으로는 블루프린트 복붙 텍스트를  
**LLM용 초압축 포맷**으로 변환하는 쪽으로 갔습니다. :contentReference[oaicite:8]{index=8}

출력은 대략 이런 느낌입니다.

```text
Node0: K2Node_Event Fn=Construct
  Out then [exec] -> Node5.exec

Node1: K2Node_VariableGet Fn=AbilitySpec
  Out AbilitySpec [...] -> Node2.AbilitySpecHandle

Node2: K2Node_CallFunction Fn=GetGameplayAbilityFromSpecHandle
  ? AbilitySpecHandle [...] -> Node1.AbilitySpec
  Out ReturnValue [...] -> Node6.AbilityObjectRef
````

핵심은 이것입니다.

* 긴 오브젝트 이름 대신 `Node0`, `Node1` 같은 alias 사용
* 노드 종류, 함수명, 변수명 유지
* 핀 연결 정보 유지
* 불필요한 경로, GUID, 좌표, 메타데이터 제거

즉, 블루프린트를 다시 붙여 넣을 수 있는 텍스트가 아니라,
**LLM과 대화하기 좋은 설명형 그래프 표현**으로 바꾼 것입니다.

그리고 결과는 꽤 강했습니다.

> [!info] 초압축 포맷 결과
> `134498 -> 10138`
> 약 **92.5% 절약** 

---

## 이게 왜 재밌었냐면

이 작업은 단순히 문자열 길이를 줄인 게 아닙니다.

정확히는 이런 작업이었습니다.

1. 블루프린트를 이미지에서 텍스트로 옮기고
2. 텍스트에서 노이즈를 걷어내고
3. 그 텍스트를 다시 LLM 친화적인 구조로 바꾸는 것

즉, **블루프린트를 AI와 대화 가능한 데이터로 번역한 셈**입니다.

---

## 실행 흐름도 더 짧게 만들었다

처음에는 VS Code의 `Run Task`로 `bp_clean.py`를 실행하고 있었습니다. 
그 자체로도 나쁘진 않았지만, 한 단계가 더 있었습니다.

그러다 보니 자연스럽게 이런 생각이 들었습니다.

**“이제는 키 한 번으로 실행되면 좋겠다.”**

그래서 AutoHotkey를 붙였습니다.

* `Ctrl + Alt + Shift + B`로 전역 핫키 설정
* `pythonw.exe`로 `bp_clean.py` 실행
* Huion Keydial Mini에 같은 단축키 할당
* 실제 실행 확인 완료 

![](./스크린샷%202026-04-10%20145334.png)

지금 제 흐름은 꽤 단순합니다.

1. 언리얼에서 블루프린트 복사
2. 키다이얼 버튼 누르기
3. 정리된 텍스트를 바로 LLM에 붙여 넣기

이 정도면 꽤 매끄럽습니다.

---

## 아직 할 수 있는 건 더 있다

지금 단계에서도 이미 충분히 만족스럽습니다.
실제로도 “여기까지면 됐다”는 감각이 있습니다. 

물론 다음 단계는 남아 있습니다.

* 트레이 알림 붙이기
* 더 예쁜 pretty printer 만들기
* Knot 노드 제거
* 자주 쓰는 노드 이름 더 읽기 좋게 변환
* 실행 안정성 조금 더 다듬기

하지만 이런 건 지금 당장 필수는 아닙니다.

이번에는 여기까지만 해도 충분했습니다.
이미 실사용 가능한 수준까지 왔고, 효과도 명확했으니까요.

---

## 마무리

이번 작업의 핵심은 “파이썬 스크립트를 만들었다”가 아닙니다.

더 정확히 말하면 이렇습니다.

> **언리얼 블루프린트를 LLM이 알아듣기 쉬운 형태로 바꿨다.**

스크린샷과 OCR에 기대는 대신,
복사 가능한 텍스트를 정제하고,
그 텍스트를 다시 의미 중심으로 압축했습니다.

그 결과:

* 초기 청소만으로 약 **45%**
* 핀 압축까지 가면 약 **65%**
* 초압축 포맷까지 가면 약 **92.5%**

이 정도면 꽤 설득력 있는 변화입니다.   

앞으로도 생성형 AI와 협업할 일은 계속 많아질 겁니다.
그럴수록 중요한 건 “무엇을 물어보느냐”만이 아니라,
**어떤 형태로 전달하느냐**일지도 모르겠습니다.

---

## 초압축 변환기 코드

위에서 설명한 **LLM용 초압축 포맷 변환기**&#8203;는 아래 코드입니다.  
저는 이 스크립트를 클립보드 기반으로 실행해서, 언리얼 블루프린트 복붙 텍스트를 바로 LLM 친화적인 형태로 바꾸는 데 사용했습니다.

```python title="Scripts/bp_clean.py"
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

## 핫키로 실행하기

매번 VS Code에서 Task를 실행하는 것도 나쁘진 않았지만,  
복사하고 바로 돌리는 흐름이 더 잘 맞아서 결국 핫키로 붙였습니다.

지금은 `Ctrl + Alt + Shift + B`를 사용하고 있고,  
Huion Keydial Mini에도 같은 단축키를 걸어 두었습니다.

```ahk title="Scripts/bp_clean_by_short_cut.ahk"
#Requires AutoHotkey v2.0

^!+b::
{
    Run('"C:\Users\user\AppData\Local\Programs\Python\Python312\pythonw.exe" "C:\Dev\90Scripts\bp_clean.py"')
}
```
