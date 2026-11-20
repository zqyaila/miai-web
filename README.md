# 咪爱编程 · 网页版

由 [MiAiCoding](https://github.com/TCX123-a/MiAiCoding)（Electron 桌面端）移植而来的浏览器版本。
猫咪口吻 + 大肥鱼陪你学编程，**278 节课、6110 道题**，C / C++ / Java / Python 代码在本机真编译、真运行。

## 快速开始

需要 Node.js 18+ 和本机编译器（可选，仅代码题需要）。

**如果你是下载的压缩包，且只想直接打开使用：** 无需 `npm install`，解压后进入目录直接运行：

```bash
cd miai-web
node server.mjs
```

然后浏览器打开 **http://localhost:8787**。（`dist/` 构建产物已包含在内，判题服务零第三方依赖。）

**如果要改源码 / 重新构建：**

```bash
cd miai-web
npm install       # 仅重新构建时才需要
npm run serve     # 构建 + 启动服务（一条命令）
```

开发模式（热更新）：

```bash
npm run dev       # Vite 开发服务器 http://localhost:5173
node server.mjs   # 另开一个终端启动判题服务
```

## 它是怎么来的

原项目是 Windows 桌面应用，渲染层是 Vue 3 + Pinia + Vue Router，通过 Electron 的
`window.miai`（preload IPC）调用主进程能力。网页版做了三层改造：

| 原桌面能力 | 网页版实现 |
|---|---|
| Vue 3 渲染层 / 组件 / 样式 / store / 判分逻辑 | **原样复用**，一行不改 |
| `window.miai` IPC（存储/运行/…） | `src/miai-browser.ts` 浏览器适配层 |
| 学习进度、错题本、收藏、备忘录、设置 | localStorage（带戳文档存储） |
| 代码编译运行（主进程 spawn） | `server.mjs` 本地判题服务（POST /api/run） |
| 课程/题库内容包 | 由 `content/` 经 `content-build` 脚本生成，静态导入 |
| 动态壁纸 / 桌宠窗口 | CSS 渐变背景 + 占位（见下） |

## 功能对照

**完整保留：** 课程学习、六种题型判分、练习场代码真运行、错题本、收藏、备忘录、
每日复习、每日挑战、学习统计、全文搜索、夜间模式、缩放、奖励图鉴、内容全量。

**降级/简化：**

- **动态壁纸 / 桌宠独立窗口 / IDE 联动**：桌面专属能力，网页版退化为 CSS 渐变背景 +
  内置占位吉祥物，功能入口保留但不可用。
- **云账号 / 排行榜 / AI 出题讲解**：需要自建后端与密钥，网页版统一返回"未开启"，
  不影响任何本地学习功能（原应用本就支持完全离线使用）。
- **吉祥物立绘**：默认显示内置占位。把 PNG 放进 `src/assets/mascot/` 并重新构建即可显示真图。
- **数据存于浏览器 localStorage**：换浏览器/清缓存会丢失学习进度（原版存本地文件）。

## 代码运行安全

⚠️ 代码在本机真实执行，权限等同于你在终端里运行它。**不要粘贴来路不明的代码。**
判题服务带编译/运行超时、输出截断、单任务队列。

## 目录结构

```
miai-web/
├── src/
│   ├── main.ts              入口（精简自原版）
│   ├── miai-browser.ts      ★ 浏览器端 window.miai 适配层
│   ├── App.vue / views/ / components/   原渲染层组件
│   ├── stores/              Pinia 状态（原样复用）
│   ├── shared/              主/渲染共享逻辑（判分、题型等）
│   ├── styles/             样式 + web.css 补充
│   └── generated/
│       └── content-bundle.json   278 课 + 6110 题（24MB）
├── server.mjs               ★ 本地判题服务 + 静态托管
├── dist/                    构建产物
└── vite.config.ts
```
