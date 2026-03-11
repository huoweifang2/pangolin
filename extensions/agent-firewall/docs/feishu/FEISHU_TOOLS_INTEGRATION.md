# 飞书工具集成完成

## 更新时间

2026-03-10 14:53

## 问题

用户发现虽然飞书通道已经实现，但 LLM 无法调用飞书工具（如创建文档、表格等）。

## 根本原因

`feishu_tools.py` 模块已经存在并定义了飞书工具，但没有被集成到主工具注册流程中。

## 解决方案

### 1. 导入 FeishuToolRegistry

**文件:** `src/main.py`
**位置:** 第 58 行

```python
from .feishu_tools import FeishuToolRegistry
```

### 2. 初始化 Feishu Tool Registry

**文件:** `src/main.py`
**位置:** 第 121-140 行

```python
# Initialize Feishu channel adapter if enabled
self.feishu_adapter: FeishuAdapter | None = None
self.feishu_tool_registry: FeishuToolRegistry | None = None
if config.feishu_enabled and config.feishu_app_id:
    # ... 初始化 feishu_adapter ...

    # Initialize Feishu tool registry
    self.feishu_tool_registry = FeishuToolRegistry(self.feishu_adapter)
```

### 3. 注册飞书工具到工具列表

**文件:** `src/main.py`
**位置:** `_all_tools_openai_format()` 函数（第 1093 行）

```python
def _all_tools_openai_format() -> list[dict[str, Any]]:
    """Build OpenAI function-calling tools from dynamic registries (gateway + skills + feishu)."""
    # Gateway tools
    gw_registry = _get_gateway_tool_registry()
    gateway_tools = gw_registry.get_openai_tools()

    # Skill tools
    skill_registry = _get_skill_registry()
    skill_tools = skill_registry.get_openai_tools()

    # Feishu tools (if adapter is enabled)
    feishu_tools = []
    if _state_instance and _state_instance.feishu_tool_registry:
        feishu_tools = _state_instance.feishu_tool_registry.get_tool_definitions()

    return gateway_tools + skill_tools + feishu_tools
```

### 4. 添加工具执行处理

**文件:** `src/main.py`
**位置:** 工具调用处理循环（第 1475 行）

```python
elif tool_name in ["feishu_create_document", "feishu_create_spreadsheet"]:
    # Handle Feishu tools
    if s.feishu_tool_registry:
        logger.info(
            "feishu_tool: %s args=%s",
            tool_name,
            json.dumps(tool_args, ensure_ascii=False)[:200],
        )
        tool_result_dict = await s.feishu_tool_registry.invoke_tool(
            tool_name, tool_args
        )
        tool_result = json.dumps(tool_result_dict, ensure_ascii=False)
    else:
        tool_result = "[Error] Feishu adapter not enabled"
```

### 5. 修复工具定义格式

**文件:** `src/feishu_tools.py`
**位置:** `get_tool_definitions()` 方法（第 73 行）

```python
def get_tool_definitions(self) -> list[dict[str, Any]]:
    """Get all tool definitions in OpenAI function calling format."""
    openai_tools = []
    for tool_name, tool_def in self._tools.items():
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool_def["name"],
                "description": tool_def["description"],
                "parameters": tool_def["parameters"],
            }
        })
    return openai_tools
```

## 已注册的飞书工具

### 1. feishu_create_document

**功能:** 创建飞书文档

**参数:**

- `title` (string, required) - 文档标题
- `content` (string, required) - 文档内容（支持 Markdown）
- `folder_token` (string, optional) - 文件夹 token

**示例:**

```json
{
  "title": "项目计划",
  "content": "# 项目计划\n\n## 目标\n...",
  "folder_token": ""
}
```

### 2. feishu_create_spreadsheet

**功能:** 创建飞书多维表格

**参数:**

- `title` (string, required) - 表格标题
- `folder_token` (string, optional) - 文件夹 token

**示例:**

```json
{
  "title": "数据统计表",
  "folder_token": ""
}
```

## 工具注册架构

```
┌─────────────────────────────────────────────────────────┐
│                  _all_tools_openai_format()              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Gateway    │  │    Skills    │  │   Feishu     │  │
│  │    Tools     │  │    Tools     │  │    Tools     │  │
│  │              │  │              │  │              │  │
│  │ • invoke_    │  │ • get_skill_ │  │ • feishu_    │  │
│  │   gateway    │  │   docs       │  │   create_    │  │
│  │              │  │ • run_skill  │  │   document   │  │
│  │              │  │              │  │ • feishu_    │  │
│  │              │  │              │  │   create_    │  │
│  │              │  │              │  │   spreadsheet│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│                    Combined Tool List                    │
│                           ↓                              │
│                    Passed to LLM                         │
└─────────────────────────────────────────────────────────┘
```

## 测试方法

### 1. 通过飞书发送消息

在飞书应用中发送：

```
帮我创建一个飞书文档，标题是"测试文档"，内容是"这是一个测试"
```

### 2. 通过 Chat Lab 测试

访问 http://localhost:9091/#/chat，发送：

```
帮我创建一个飞书文档，标题是"项目计划"
```

### 3. 查看工具调用日志

```bash
tail -f /tmp/restart6.log | grep -E "(feishu_tool|tool_call)"
```

## 预期结果

LLM 应该能够：

1. 识别飞书工具可用
2. 调用 `feishu_create_document` 或 `feishu_create_spreadsheet`
3. 返回创建结果（文档 ID 或表格 token）

## 工具调用流程

```
用户消息
  ↓
Chat API (/api/chat/send)
  ↓
获取所有工具 (_all_tools_openai_format)
  ├─ Gateway Tools
  ├─ Skill Tools
  └─ Feishu Tools ✅ (新增)
  ↓
传递给 LLM (with tools)
  ↓
LLM 决定调用工具
  ↓
工具执行处理
  ├─ run_skill → SkillRegistry
  ├─ invoke_gateway → GatewayToolRegistry
  └─ feishu_create_* → FeishuToolRegistry ✅ (新增)
  ↓
返回工具结果
  ↓
LLM 生成最终响应
```

## 注意事项

1. **飞书适配器必须启用**: 确保 `.env` 中 `AF_FEISHU_ENABLED=1`
2. **飞书凭证配置**: 需要正确的 App ID 和 Secret
3. **工具权限**: 飞书应用需要有文档和表格的创建权限
4. **错误处理**: 如果飞书 API 调用失败，会返回错误信息

## 下一步扩展

可以继续添加更多飞书工具：

- `feishu_read_document` - 读取文档内容
- `feishu_update_document` - 更新文档
- `feishu_create_folder` - 创建文件夹
- `feishu_upload_file` - 上传文件
- `feishu_search` - 搜索文档

只需在 `feishu_tools.py` 的 `_register_tools()` 方法中添加新工具定义，并在 `invoke_tool()` 方法中实现调用逻辑即可。

## 总结

✅ 飞书工具已成功集成到工具注册系统
✅ LLM 现在可以调用飞书文档和表格创建功能
✅ 工具调用流程与现有 Gateway 和 Skill 工具一致
✅ 支持通过飞书消息和 Chat Lab 两种方式使用

现在用户可以通过自然语言让 AI 创建飞书文档和表格了！🎉
