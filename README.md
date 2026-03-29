# TRACE Web

基于 `trace1.0.docx` 落地的聊天机器人网站原型。网站后端严格按照你前面确认的 TRACE 运行链路组织：

`安全分流 -> 状态读取与评估 -> 阶段判断 -> 策略选择 -> 回复生成 -> 校验 -> 状态更新 -> 摘要压缩`

## 技术栈

- `Next.js 16 + React 19 + TypeScript`
- App Router 页面 + API Route
- Tailwind CSS 4
- GPT-4o 通过 OpenAI-compatible `chat/completions` 接口调用

## 目录结构

```text
src/
  app/
    api/chat/route.ts        # 会话 API
    layout.tsx               # 站点布局与 metadata
    page.tsx                 # 首页
  components/
    trace-chat.tsx           # 聊天界面
  lib/trace/
    openai.ts                # Lingyun / OpenAI-compatible 调用封装
    orchestrator.ts          # TRACE 主编排链
    prompts.ts               # 全部 prompt 模块
    session-store.ts         # 服务端缓存与恢复
    types.ts                 # 类型与状态定义
```

## 环境变量

复制 `.env.example` 为 `.env.local`，并填入你的值：

```bash
TRACE_OPENAI_API_KEY=your_api_key_here
TRACE_OPENAI_BASE_URL=https://lingyunapi.com/v1
TRACE_OPENAI_MODEL=gpt-4o
```

`TRACE_OPENAI_BASE_URL` 支持三种写法：

- `https://lingyunapi.com`
- `https://lingyunapi.com/v1`
- `https://lingyunapi.com/v1/chat/completions`

代码会自动规范化到最终的 `chat/completions` 端点。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 质量检查

```bash
pnpm lint
pnpm build
```

## TRACE 编排说明

后端不是把所有逻辑塞进一个 prompt，而是拆成七个模块：

1. `Safety Router`
2. `Safety Support`
3. `State Extractor`
4. `Strategy Planner`
5. `Responder`
6. `Validator`
7. `State Updater`
8. `Session Summarizer`

其中会话状态采用两层保留：

- 服务端内存缓存，保证单实例下的连续多轮
- 浏览器 `localStorage` 快照，保证 Railway 休眠或重启后仍可恢复当前会话

## Railway 部署

1. 在 Railway 项目里连接本仓库
2. 配置环境变量：
   - `TRACE_OPENAI_API_KEY`
   - `TRACE_OPENAI_BASE_URL`
   - `TRACE_OPENAI_MODEL`
3. 触发部署即可

这个项目已经显式提供 `Dockerfile`，Railway 会直接按仓库里的构建定义部署，不再依赖默认的 Nixpacks 推断。
