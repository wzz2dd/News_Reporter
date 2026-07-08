# Daily Word Reporter

一个 AI 驱动的每日英语新闻报告生成器。选择权威来源和新闻类别，一键生成包含新闻摘要和个人反思的双语报告。

## 功能

- **权威来源** — 预置 Reuters、The Guardian、BBC、TechCrunch 四个权威新闻源
- **6 个新闻类别** — Politics、Technology、Entertainment、Finance、Sports、Health
- **AI 报告生成** — 自动搜索近 7 天新闻，生成结构化报告（来源、日期、摘要、个人反思）
- **中英双语** — 报告内容一键切换中文/英文，UI 界面同步切换
- **去 AI 化反思** — personal_reflection 专门优化 Prompt，模仿真实学生的口语化表达
- **三种导出格式** — 支持下载 DOCX、PDF、Markdown
- **历史记录** — 自动保存生成记录到本地，左侧边栏随时回看
- **分风格生成** — 根据新闻类别自动匹配不同写作风格（严肃/科技/轻松）

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + Vite |
| AI 编排 | Dify Workflow（条件分支 + LLM） |
| 新闻搜索 | Tavily Search API |
| 大模型 | GPT-4o / Claude 3.5 Sonnet（通过 Dify 调用） |
| 存储 | localStorage（历史记录） |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/wzz2dd/News_Reporter.git
cd news-agent
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_DIFY_URL=https://api.dify.ai/v1/workflows/run
VITE_DIFY_API_KEY=app-你的Dify密钥
```

> Dify API Key 从 Dify 应用页面的「API 访问」中获取。

### 3. 导入 Dify 工作流

1. 注册 [Dify Cloud](https://dify.ai)（免费版即可）
2. 注册 [Tavily](https://tavily.com) 获取 API Key（免费 1000 次/月）
3. 在 Dify 中：**创建空白应用 → 选择 Workflow → 右上角 ⋮ → 导入 DSL → 选择 `workflow/News Reporter.yml`**
4. 导入后需要配置：

| 配置项 | 位置 | 操作 |
|--------|------|------|
| Tavily Key | HTTP Request 节点（HTTP 请求-Tavily搜索）→ Authorization | 替换 `YOUR_TAVILY_KEY` 为你的 Tavily API Key |
| LLM 模型 | 三个 LLM 节点 → 模型设置 | 默认 Moonshot（月之暗面），可切换为你偏好的模型 |
| LLM Provider Key | Dify 右上角头像 → 设置 → 模型供应商 | 填入你选择的模型 API Key |

5. 点击 **发布** → 进入「API 访问」→ 复制 API Key
6. 将 API Key 填入 `.env` 文件

### 4. 启动开发服务器

```bash
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。

### 5. 生产构建

```bash
npm run build    # 输出到 dist/
npm run preview  # 预览构建结果
```

## 工作流架构

```
Start → Tavily HTTP Request → IF/ELSE（按类别分支）
                                  ├→ LLM-严肃（Politics/Finance/Health）
                                  ├→ LLM-科技（Technology）
                                  └→ LLM-轻松（Entertainment/Sports）
                                        ↓
                                      End
```

工作流已导出为 `workflow/News Reporter.yml`，可直接导入 Dify。完整 Prompt 和设计思路见 `docs/PRODUCT_PORTFOLIO.md`。

## 项目结构

```
news-agent/
├── docs/
│   ├── 竞品分析.md          # 竞品分析文档
│   └── PRODUCT_PORTFOLIO.md # 产品作品集
├── workflow/
│   └── News Reporter.yml    # Dify 工作流 DSL 文件
├── src/
│   ├── App.jsx              # 主应用组件
│   ├── main.jsx             # 入口文件
│   └── styles.css           # 全局样式
├── assets/                   # 截图资源
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

## 常见问题

**Q: 生成报告时报错 "Empty response from Dify"？**

检查 Dify 工作流是否已发布，API Key 是否正确。在 Dify 内先手动测试工作流是否能跑通。

**Q: 生成的日期显示 "Mon DD, YYYY"？**

检查 LLM Prompt 中日期字段的描述是否为示例格式（e.g.）而非模板占位符。

**Q: 可以自定义新闻来源吗？**

当前版本预置 4 个来源。后续计划支持用户自定义 RSS 源或 URL 输入。

**Q: 历史记录存在哪里？**

浏览器 localStorage，清除浏览器数据会丢失。最多保存 50 条。
