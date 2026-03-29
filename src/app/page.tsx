import { TraceChat } from "@/components/trace-chat";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="trace-panel flex flex-col gap-5 p-6">
          <div className="space-y-3">
            <span className="trace-tag">TRACE</span>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink-strong)]">
              多轮情绪支持聊天网站
            </h1>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              这个原型按照你上一条确认的运行链路来工作：
              安全分流、状态读取、阶段判断、策略选择、回复生成、校验、状态更新和摘要压缩，全部串成一个完整会话回路。
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-5">
            <h2 className="text-sm font-semibold text-[var(--ink-strong)]">
              当前网站能力
            </h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-[var(--ink-soft)]">
              <li>支持多轮会话，自动保留阶段、策略和摘要。</li>
              <li>后端通过 GPT-4o 执行 TRACE 编排，而不是只发一个大 prompt。</li>
              <li>浏览器本地保存会话，Railway 重启后也能恢复当前聊天。</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-[var(--line-soft)] bg-[var(--panel-strong)] p-5">
            <h2 className="text-sm font-semibold text-[var(--ink-strong)]">
              使用提醒
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              TRACE 是情绪支持原型，不提供医疗诊断或危机替代支持。若出现自伤、自杀、伤人或失去现实检验能力等紧急风险，系统会优先做安全分流。
            </p>
          </div>
        </aside>

        <TraceChat />
      </section>
    </main>
  );
}
