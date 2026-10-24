# ChatSelect 群组选择组件

**组件路径**：`@/components/business-ui/chat-select`

---

## 群组类型

```typescript
interface Chat {
  id: string;
  name: string;
  avatar: string;
}
```

---

## 功能概述

- 群组字段选择组件，用于表单中录入"群组"字段
- 通过触发器打开弹层，弹层内置搜索功能（始终可用）
- **仅支持 ID 模式**：`value/onChange` 只使用群组 `chatID`（string）
- 组件在 UI 上可展示群组信息（头像/名称），但对外值仅返回/接收 `chatID`
- 选择后自动回显已选群组信息：群头像 + 群名称（多选以 tag 形式展示）
- 组件自带群组检索能力，无需额外传搜索接口/数据源

## 类型定义

type TriggerType = 'button' | 'search' | 'custom';

type ChatSelectProps = {
  value: string | null | string[];
  onChange: (value: string | null | string[]) => void;
  multiple?: boolean;
  triggerType?: TriggerType;
  disabled?: boolean;
  placeholder?: string;
};

## Props 说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string \| null` / `string[]` | - | 单选传 `string \| null`（群组 ID），多选传 `string[]` |
| `onChange` | `function` | - | 值变化回调 |
| `multiple` | `boolean` | `false` | 是否多选 |
| `triggerType` | `'button' \| 'search' \| 'custom'` | `'button'` | 触发器类型 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `placeholder` | `string` | `'请选择'` | 占位文本 |

## 受控规范

> ⚠️ **强约束**

1. **必须受控**：始终传 `value` + `onChange`
2. **禁止传**：`undefined` / 群组对象 / 其他类型
3. **空值规则**：单选清空 `null`，多选清空 `[]`

## 使用示例

```tsx
import { useState } from 'react';
import { ChatSelect } from '@/components/business-ui/chat-select';

function SingleSelectExample() {
  const [chatId, setChatId] = useState<string | null>(null);
  return <ChatSelect value={chatId} onChange={setChatId} placeholder="请选择群组" />;
}

function MultipleSelectExample() {
  const [chatIds, setChatIds] = useState<string[]>([]);
  return (
    <ChatSelect multiple value={chatIds} onChange={setChatIds} placeholder="请选择群组" />
  );
}
```
