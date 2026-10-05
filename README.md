# 工银成长金管家网页工程源码

当前版本为 V2.3 评审增强版，参赛方向为赛道九“青年群体服务”。网页新增“证据台”和反向压力测试，用同一笔到账串起事件事实、生活覆盖、目标代价和用户确认，并明确展示规则验证结果与真实模型接入边界。

## 内容

- `dist/index.html`：网页入口
- `dist/style.css`：样式
- `dist/app.js`：页面状态、交互和规划卡片
- `dist/coach.js`：规则型 AI Coach 多轮对话逻辑
- `dist/engine.js`：资金分配、目标时间、敏感性和定时补款计算
- `dist/index.html`：包含资金总览、到账规划、消费模拟、成长教练、规划记录和证据台六个页面
- `tests/coach.test.cjs`：Agent 回归测试

## 本地运行

### 仅规则演示

直接打开 `dist/index.html` 即可查看静态 Demo。此模式不会调用大模型。

### 接入真实模型

服务端代理会保护模型密钥，并把模型工具调用限制在只读规划、消费模拟和收入日期重算。金额与日期仍由 `dist/engine.js` 计算。默认示例使用阿里云百炼 Qwen-plus 的 OpenAI 兼容接口，也支持其他兼容 Chat Completions 的服务。

```powershell
Copy-Item .env.example .env
# 编辑 .env，填写 MODEL_API_KEY；不要把 .env 提交到仓库
$env:MODEL_API_KEY = "你的模型密钥"
$env:MODEL_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:MODEL_NAME = "qwen-plus"
node server.mjs
```

然后访问 `http://localhost:8787`。页面上的成长教练会显示“模型已接入”；请求失败时会自动回到规则演示。生产部署需要把 `server.mjs` 部署到同一域名，并在服务端环境变量中设置密钥，不能将密钥写入 `dist`。

## 测试

在项目环境中运行：

```bash
node tests/coach.test.cjs
```

当前已增加 OpenAI 兼容模型代理；未配置密钥时仍使用规则编排 Agent。模型只负责自然语言理解与解释，`engine.js` 仍是金额、日期和资金守恒的数值权威层。系统不接入真实银行账户，也不会自动交易。

GitHub Pages 发布的是静态规则演示，不包含模型密钥。需要真实模型时，应在服务端运行 `server.mjs` 并通过环境变量配置密钥，不能把密钥写入 `dist` 或公开仓库。

## 版本

- 评审增强版本：`V2.3`（2026-10-06）
- `engine.js` SHA-256：`b65cdf69be409f1dc9fafda75562423c19b3902e7196504b665672a8af5df209`
- `coach.js` SHA-256：`9d6a66d57e921d8bb9ffcf0c325680277ae673da8f58a29b160fe4e59e234487`
