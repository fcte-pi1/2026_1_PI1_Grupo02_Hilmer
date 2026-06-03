import React, { useState } from "react";

type MonitoringLayoutProps = {
  activeView: "telemetria" | "labirinto" | "corridas";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateCorridas: () => void;
  eyebrow: string;
  title: string;
  description: string;
  statusConexao: "online" | "offline" | "waiting";
  mensagemStatusConexao?: string | null;
  children: React.ReactNode;
};

export function MonitoringLayout({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateCorridas,
  eyebrow,
  title,
  description,
  statusConexao,
  children,
}: MonitoringLayoutProps) {
  const exibindoTelemetria = activeView === "telemetria";
  const exibindoLabirinto = activeView === "labirinto";
  const exibindoCorridas = activeView === "corridas";
  const statusLabel =
    statusConexao === "online"
      ? "Online"
      : statusConexao === "offline"
        ? "Offline"
        : "Aguardando conexao";
  const statusClasses =
    statusConexao === "online"
      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
      : statusConexao === "offline"
        ? "border-red-500/30 bg-red-950/40 text-red-400"
        : "border-amber-500/30 bg-amber-950/40 text-amber-400";
  const statusDotClass =
    statusConexao === "online"
      ? "bg-emerald-500"
      : statusConexao === "offline"
        ? "bg-red-500"
        : "bg-amber-500";

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-primary">
      <div className="flex min-h-screen">
        <aside
          className={`hidden border-r border-border bg-surface lg:flex lg:flex-col transition-all duration-300 sticky top-0 h-screen overflow-hidden ${
            isCollapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Header do Menu (Área de clique para expandir/recolher) */}
          <div
            className={`flex h-16 items-center border-b border-border cursor-pointer hover:bg-surface-hover transition-colors shrink-0 ${
              isCollapsed ? "justify-center px-0" : "gap-3 px-5"
            }`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Expandir/Recolher Menu"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface border border-border shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-primary"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>

            {!isCollapsed && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <h1 className="text-sm font-semibold text-primary">Micromouse</h1>
                <p className="text-xs text-zinc-500">Control Center</p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-2 py-6 overflow-y-auto overflow-x-hidden custom-scrollbar px-3">
            <button
              className={`flex w-full items-center rounded-lg py-2.5 text-sm text-zinc-400 transition hover:bg-surface-hover hover:text-primary ${
                isCollapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
              title="Visão Geral"
            >
              <span className="shrink-0 text-lg">▦</span>
              {!isCollapsed && <span className="whitespace-nowrap">Visão Geral</span>}
            </button>

            <button
              type="button"
              onClick={onNavigateTelemetria}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                exibindoTelemetria
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              title="Monitoramento"
            >
              <span className="shrink-0 text-lg">⌗</span>
              {!isCollapsed && <span className="whitespace-nowrap">Monitoramento</span>}
            </button>

            <button
              type="button"
              onClick={onNavigateCorridas}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                exibindoCorridas
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              title="Corridas"
            >
              <span className="shrink-0 text-lg">↺</span>
              {!isCollapsed && <span className="whitespace-nowrap">Corridas</span>}
            </button>

            <button
              type="button"
              onClick={onNavigateLabirinto}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                exibindoLabirinto
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              title="Labirinto"
            >
              <span className="shrink-0 text-lg">▣</span>
              {!isCollapsed && <span className="whitespace-nowrap">Labirinto</span>}
            </button>

            <button
              className={`flex w-full items-center rounded-lg py-2.5 text-sm text-zinc-400 transition hover:bg-surface-hover hover:text-primary ${
                isCollapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
              title="Histórico"
            >
              <span className="shrink-0 text-lg">↺</span>
              {!isCollapsed && <span className="whitespace-nowrap">Histórico</span>}
            </button>

            <button
              className={`flex w-full items-center rounded-lg py-2.5 text-sm text-zinc-400 transition hover:bg-surface-hover hover:text-primary ${
                isCollapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
              title="Configuração"
            >
              <span className="shrink-0 text-lg">⚙</span>
              {!isCollapsed && <span className="whitespace-nowrap">Configuração</span>}
            </button>
          </nav>

          {!isCollapsed ? (
            <div className="m-3 rounded-lg border border-border bg-background/50 p-3 shrink-0 whitespace-nowrap">
              <p className="text-xs font-medium uppercase text-zinc-500">Firmware</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Sincronizado</span>
                <span className="rounded-md bg-surface border border-border px-2 py-1 text-[10px] font-bold text-primary">
                  v2.4.1
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-3 mx-auto shrink-0" title="Firmware Sincronizado v2.4.1">
               <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border text-[10px] font-bold text-primary">
                  v2
               </span>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-8 shrink-0">
            <div>
              <p className="text-xs text-zinc-500">Sessão #2026-05-02-014</p>
              <h2 className="text-sm font-medium text-primary">
                Painel de Monitoramento — Robô MM-07
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <input
                  type="text"
                  placeholder="Buscar evento, sessão..."
                  className="h-9 w-64 rounded-lg border border-border bg-background px-3 text-sm text-primary outline-none transition placeholder:text-zinc-600 focus:border-primary"
                />
              </div>

              <div
                role="status"
                aria-live="polite"
                title={`Status da conexao: ${statusLabel}`}
                className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${statusClasses}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${statusDotClass} ${
                    statusConexao === "offline" ? "" : "animate-pulse"
                  }`}
                />
                {statusLabel}
              </div>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-sm text-zinc-400 hover:text-primary transition-colors"
              >
                🔔
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-background">
                AL
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 lg:px-10 overflow-auto">
            <section className="mx-auto w-full max-w-[1600px]">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {eyebrow}
                </p>

                <h1 className="mt-1 text-2xl font-semibold text-primary">
                  {title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                  {description}
                </p>
              </div>

              {children}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
