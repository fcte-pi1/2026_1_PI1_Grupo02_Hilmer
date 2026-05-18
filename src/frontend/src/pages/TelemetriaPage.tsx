import { DashboardIndicadores } from '../components/DashboardIndicadores';

export function TelemetriaPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
              🤖
            </div>

            <div>
              <h1 className="text-sm font-semibold text-zinc-900">
                Micromouse
              </h1>
              <p className="text-xs text-zinc-500">Control Center</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-6">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>▦</span>
              Visão Geral
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>⌗</span>
              Labirinto
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white">
              <span>⌁</span>
              Telemetria
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>▣</span>
              Estados
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>↺</span>
              Histórico
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>⚙</span>
              Configuração
            </button>
          </nav>

          <div className="m-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase text-zinc-500">
              Firmware
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Sincronizado</span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-700">
                v2.4.1
              </span>
            </div>
          </div>
        </aside>

        {/* Área principal */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-8">
            <div>
              <p className="text-xs text-zinc-500">Sessão #2026-05-02-014</p>
              <h2 className="text-sm font-medium text-zinc-900">
                Painel de Monitoramento — Robô MM-07
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <input
                  type="text"
                  placeholder="Buscar evento, sessão..."
                  className="h-9 w-64 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-violet-500"
                />
              </div>

              <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Online
              </div>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm text-zinc-600"
              >
                🔔
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
                AL
              </div>
            </div>
          </header>

          {/* Conteúdo */}
          <main className="flex-1 px-4 py-8 lg:px-10">
            <section className="mx-auto w-full max-w-6xl">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Telemetria
                </p>

                <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
                  Métricas em tempo real do robô MM-07
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  Acompanhe os indicadores exigidos para avaliação da corrida:
                  bateria, velocidade média e tempo de execução.
                </p>
              </div>

              <DashboardIndicadores />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}