# nanobot 快速启动指南

## 📋 目录

- [项目简介](#项目简介)
- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [基础配置](#基础配置)
- [启动方式](#启动方式)
- [使用示例](#使用示例)
- [进阶配置](#进阶配置)
- [常见问题](#常见问题)

---

## 项目简介

nanobot 是一个超轻量级的个人 AI 助手框架，核心代码仅约 4000 行。它支持：

- 🤖 多种 LLM 提供商（OpenRouter、Claude、GPT、DeepSeek 等）
- 💬 多个聊天平台（Telegram、Discord、WhatsApp、飞书等）
- 🛠️ 丰富的工具集（文件操作、Shell 执行、网页搜索等）
- 🧠 智能记忆系统
- ⏰ 定时任务支持
- 🔌 MCP (Model Context Protocol) 集成

---

## 环境要求

- **Python**: 3.11 或更高版本
- **操作系统**: Windows / Linux / macOS
- **网络**: 需要访问 LLM API（如 OpenRouter、OpenAI 等）

---

## 安装步骤

### 方法 1: 从源码安装（推荐用于开发）

```bash
# 1. 克隆项目（如果还没有）
git clone https://github.com/HKUDS/nanobot.git
cd nanobot

# 2. 安装依赖（开发模式）
pip install -e .

# 3. 验证安装
nanobot --help
```

### 方法 2: 使用 pip 安装（稳定版本）

```bash
# 直接从 PyPI 安装
pip install nanobot-ai

# 验证安装
nanobot --help
```

### 方法 3: 使用 uv 安装（快速）

```bash
# 使用 uv 工具安装
uv tool install nanobot-ai

# 验证安装
nanobot --help
```

---

## 基础配置

### 1. 初始化配置文件

```bash
nanobot onboard
```

这个命令会创建：
- 配置文件: `~/.nanobot/config.json`
- 工作空间: `~/.nanobot/workspace/`

### 2. 配置 LLM 提供商

编辑 `~/.nanobot/config.json`，添加你的 API 密钥：

#### 选项 A: 使用 OpenRouter（推荐，支持所有模型）

```json
{
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-v1-你的密钥"
    }
  },
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-5"
    }
  }
}
```

**获取 API 密钥**: https://openrouter.ai/keys

#### 选项 B: 使用 DeepSeek（国内推荐）

```json
{
  "providers": {
    "deepseek": {
      "apiKey": "sk-你的密钥"
    }
  },
  "agents": {
    "defaults": {
      "model": "deepseek-chat"
    }
  }
}
```

**获取 API 密钥**: https://platform.deepseek.com

#### 选项 C: 使用通义千问

```json
{
  "providers": {
    "dashscope": {
      "apiKey": "sk-你的密钥"
    }
  },
  "agents": {
    "defaults": {
      "model": "qwen-max"
    }
  }
}
```

**获取 API 密钥**: https://dashscope.console.aliyun.com

### 3. 配置网页搜索（可选）

如果需要网页搜索功能，添加 Brave Search API 密钥：

```json
{
  "tools": {
    "web": {
      "search": {
        "apiKey": "你的_BRAVE_API_KEY",
        "maxResults": 5
      }
    }
  }
}
```

**获取 API 密钥**: https://brave.com/search/api/

---

## 启动方式

### 方式 1: CLI 命令行模式

#### 单次对话

```bash
nanobot agent -m "你好，介绍一下你自己"
```

#### 交互式聊天

```bash
nanobot agent
```

进入交互模式后：
- 直接输入消息进行对话
- 输入 `exit`、`quit` 或按 `Ctrl+D` 退出
- 输入 `/new` 开始新对话
- 输入 `/help` 查看帮助

#### 显示运行日志

```bash
nanobot agent --logs
```

#### 纯文本输出（不使用 Markdown）

```bash
nanobot agent --no-markdown
```

### 方式 2: 网关模式（连接聊天平台）

网关模式允许 nanobot 连接到各种聊天平台（Telegram、Discord 等）。

```bash
nanobot gateway
```

启动后，nanobot 会监听配置的聊天渠道，自动响应消息。

---

## 使用示例

### 示例 1: 文件操作

```bash
nanobot agent -m "读取当前目录下的 README.md 文件，并总结主要内容"
```

### 示例 2: 代码编写

```bash
nanobot agent -m "帮我写一个 Python 函数，用于计算斐波那契数列"
```

### 示例 3: 网页搜索

```bash
nanobot agent -m "搜索最新的 Python 3.12 新特性"
```

### 示例 4: Shell 命令执行

```bash
nanobot agent -m "列出当前目录下的所有 Python 文件"
```

### 示例 5: 定时任务

```bash
# 添加每天早上 9 点的提醒
nanobot cron add --name "morning" --message "早安，今天的天气如何？" --cron "0 9 * * *"

# 查看所有定时任务
nanobot cron list

# 删除任务
nanobot cron remove <job_id>
```

---

## 进阶配置

### 1. 连接 Telegram

#### 步骤 1: 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 并按提示操作
3. 复制获得的 Bot Token

#### 步骤 2: 获取你的 User ID

在 Telegram 设置中查看你的用户名（例如 `@yourname`），或使用 `@userinfobot` 获取数字 ID。

#### 步骤 3: 配置

编辑 `~/.nanobot/config.json`：

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "你的_BOT_TOKEN",
      "allowFrom": ["你的_USER_ID"]
    }
  }
}
```

#### 步骤 4: 启动网关

```bash
nanobot gateway
```

现在可以在 Telegram 中与你的 bot 对话了！

### 2. 连接 Discord

#### 步骤 1: 创建 Discord Bot

1. 访问 https://discord.com/developers/applications
2. 创建新应用 → Bot → Add Bot
3. 复制 Bot Token

#### 步骤 2: 启用权限

在 Bot 设置中启用 **MESSAGE CONTENT INTENT**

#### 步骤 3: 获取 User ID

- Discord 设置 → 高级 → 启用开发者模式
- 右键点击你的头像 → 复制用户 ID

#### 步骤 4: 配置

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "你的_BOT_TOKEN",
      "allowFrom": ["你的_USER_ID"]
    }
  }
}
```

#### 步骤 5: 邀请 Bot 到服务器

1. OAuth2 → URL Generator
2. 勾选 Scopes: `bot`
3. 勾选权限: `Send Messages`, `Read Message History`
4. 打开生成的 URL，将 bot 添加到服务器

#### 步骤 6: 启动网关

```bash
nanobot gateway
```

### 3. 配置飞书（Feishu）

飞书使用 WebSocket 长连接，无需公网 IP。

#### 步骤 1: 创建飞书应用

1. 访问 https://open.feishu.cn/app
2. 创建企业自建应用
3. 启用「机器人」能力
4. 添加权限：`im:message`（发送消息）
5. 添加事件订阅：`im.message.receive_v1`（接收消息）
6. 选择「长连接」模式
7. 获取 App ID 和 App Secret

#### 步骤 2: 配置

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "allowFrom": []
    }
  }
}
```

#### 步骤 3: 启动网关

```bash
nanobot gateway
```

### 4. 使用本地模型（vLLM）

如果你想使用本地部署的模型：

#### 步骤 1: 启动 vLLM 服务器

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct --port 8000
```

#### 步骤 2: 配置

```json
{
  "providers": {
    "vllm": {
      "apiKey": "dummy",
      "apiBase": "http://localhost:8000/v1"
    }
  },
  "agents": {
    "defaults": {
      "model": "meta-llama/Llama-3.1-8B-Instruct"
    }
  }
}
```

### 5. MCP (Model Context Protocol) 集成

MCP 允许你连接外部工具服务器。

#### 示例：添加文件系统 MCP 服务器

```json
{
  "tools": {
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
      }
    }
  }
}
```

#### 示例：添加远程 MCP 服务器

```json
{
  "tools": {
    "mcpServers": {
      "my-remote-mcp": {
        "url": "https://example.com/mcp/",
        "headers": {
          "Authorization": "Bearer xxxxx"
        }
      }
    }
  }
}
```

### 6. 安全配置

限制工具访问范围到工作空间目录：

```json
{
  "tools": {
    "restrictToWorkspace": true
  }
}
```

### 7. 心跳任务（Heartbeat）

网关每 30 分钟会检查 `~/.nanobot/workspace/HEARTBEAT.md` 文件，执行其中的任务。

编辑 `~/.nanobot/workspace/HEARTBEAT.md`：

```markdown
## 定期任务

- [ ] 检查天气预报并发送摘要
- [ ] 扫描收件箱中的紧急邮件
- [ ] 检查 GitHub 仓库的新 issue
```

---

## 常见问题

### Q1: 如何查看当前状态？

```bash
nanobot status
```

### Q2: 如何更换模型？

编辑 `~/.nanobot/config.json`，修改 `agents.defaults.model` 字段：

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-3.5-sonnet"
    }
  }
}
```

### Q3: 如何查看日志？

```bash
# CLI 模式显示日志
nanobot agent --logs

# 网关模式日志会输出到终端
nanobot gateway
```

### Q4: 如何开始新对话？

在交互模式中输入：

```
/new
```

或者删除会话文件：

```bash
rm -rf ~/.nanobot/workspace/sessions/
```

### Q5: 支持哪些模型？

nanobot 支持所有 LiteLLM 兼容的模型，包括：

- **OpenRouter**: 所有主流模型（Claude、GPT、Gemini 等）
- **Anthropic**: Claude 系列
- **OpenAI**: GPT 系列
- **DeepSeek**: deepseek-chat, deepseek-coder
- **通义千问**: qwen-max, qwen-plus
- **Moonshot**: moonshot-v1-8k
- **智谱**: glm-4, glm-4-plus
- **本地模型**: 通过 vLLM 或任何 OpenAI 兼容服务器

### Q6: 如何设置代理？

#### 方法 1: 环境变量

```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
nanobot agent
```

#### 方法 2: Telegram 专用代理

```json
{
  "channels": {
    "telegram": {
      "proxy": "http://127.0.0.1:7890"
    }
  }
}
```

### Q7: 如何限制工具权限？

```json
{
  "tools": {
    "restrictToWorkspace": true
  },
  "channels": {
    "telegram": {
      "allowFrom": ["你的_USER_ID"]
    }
  }
}
```

### Q8: 如何使用 Docker 部署？

```bash
# 构建镜像
docker build -t nanobot .

# 初始化配置
docker run -v ~/.nanobot:/root/.nanobot --rm nanobot onboard

# 编辑配置（在宿主机上）
vim ~/.nanobot/config.json

# 启动网关
docker run -v ~/.nanobot:/root/.nanobot -p 18790:18790 nanobot gateway

# 或使用 Docker Compose
docker compose up -d nanobot-gateway
```

### Q9: 如何查看工具调用？

使用 `--logs` 参数：

```bash
nanobot agent --logs -m "读取 README.md 文件"
```

你会看到详细的工具调用日志。

### Q10: 如何贡献代码？

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 🎯 快速测试清单

安装完成后，按顺序测试以下功能：

```bash
# 1. 验证安装
nanobot --help

# 2. 查看状态
nanobot status

# 3. 简单对话
nanobot agent -m "你好"

# 4. 文件操作
nanobot agent -m "列出当前目录的文件"

# 5. 网页搜索（需要配置 Brave API）
nanobot agent -m "搜索 Python 最新版本"

# 6. 交互模式
nanobot agent
```

---

## 📚 更多资源

- **项目主页**: https://github.com/HKUDS/nanobot
- **问题反馈**: https://github.com/HKUDS/nanobot/issues
- **讨论区**: https://github.com/HKUDS/nanobot/discussions
- **Discord 社区**: https://discord.gg/MnCvHqpUGB

---

## 📝 配置文件完整示例

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.nanobot/workspace",
      "model": "anthropic/claude-opus-4-5",
      "maxTokens": 8192,
      "temperature": 0.1,
      "maxToolIterations": 40,
      "memoryWindow": 100
    }
  },
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-v1-xxx"
    },
    "deepseek": {
      "apiKey": "sk-xxx"
    }
  },
  "channels": {
    "sendProgress": true,
    "sendToolHints": false,
    "telegram": {
      "enabled": true,
      "token": "your_bot_token",
      "allowFrom": ["your_user_id"],
      "proxy": null,
      "replyToMessage": false
    },
    "discord": {
      "enabled": false,
      "token": "",
      "allowFrom": []
    }
  },
  "tools": {
    "web": {
      "search": {
        "apiKey": "your_brave_api_key",
        "maxResults": 5
      }
    },
    "exec": {
      "timeout": 60
    },
    "restrictToWorkspace": false,
    "mcpServers": {}
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "heartbeat": {
      "enabled": true,
      "intervalS": 1800
    }
  }
}
```

---

**祝你使用愉快！** 🐈✨

如有问题，欢迎在 GitHub 上提 Issue 或加入社区讨论。
