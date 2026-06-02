import { useTelemetria } from "../hooks/useTelemetria";

interface SessionManagerProps {
  onNavigate?: () => void;
}

export default function SessionManager({ onNavigate }: SessionManagerProps) {
  const { indicadores, configSessao, conectado, erro } = useTelemetria();

  // Determina se a sessão de monitoramento já foi iniciada
  const sessaoIniciada = indicadores.status_corrida === "em_andamento";

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      {/* Indicador de conexão com o WebSocket */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-surface border border-border px-4 py-2 rounded-full shadow-md">
        <span
          className={`w-2.5 h-2.5 rounded-full ${conectado ? "bg-success animate-pulse" : "bg-danger"}`}
        ></span>
        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
          {conectado ? "Servidor Conectado" : "Conectando..."}
        </span>
      </div>

      {erro && (
        <div className="absolute top-20 right-6 bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm shadow-md backdrop-blur-md">
          {erro}
        </div>
      )}

      <div className="w-full max-w-md transition-all duration-500">
        {!sessaoIniciada ? (
          /* FASE 1: AGUARDANDO CONFIGURAÇÃO */
          <div className="bg-surface border border-border p-8 rounded-3xl text-center shadow-xl relative overflow-hidden">
            {/* Efeito de brilho de fundo suave */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>

            {/* Ícone Pulsante */}
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Aguardando Inicialização
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              O sistema de monitoramento está pronto e ouvindo. Ligue o
              Micromouse para iniciar a sessão automaticamente.
            </p>

            {/* Spinner/Pulse animado */}
            <div className="flex justify-center gap-1.5 py-2">
              <span
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: "0ms" }}
              ></span>
              <span
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: "150ms" }}
              ></span>
              <span
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: "300ms" }}
              ></span>
            </div>
          </div>
        ) : (
          /* FASE 2: SESSÃO INICIADA */
          <div className="bg-surface border border-success/20 p-8 rounded-3xl shadow-xl relative overflow-hidden animate-fade-in text-center">
            {/* Efeito de brilho verde indicando sucesso */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-success/5 rounded-full blur-3xl"></div>

            {/* Ícone de Sucesso */}
            <div className="w-20 h-20 bg-success/10 border border-success/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Sessão Iniciada!
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              O Micromouse conectou-se com sucesso e o monitoramento em tempo
              real está pronto para ser iniciado.
            </p>

            <div className="space-y-3 mb-8">
              <div className="bg-background border border-border p-3 rounded-2xl flex justify-between items-center text-sm">
                <span className="text-zinc-400">Dimensão do Labirinto</span>
                <span className="font-mono font-bold text-zinc-200 bg-surface px-2 py-0.5 rounded-md border border-border shadow-xs">
                  {configSessao.dimensao}
                </span>
              </div>
              <div className="bg-background border border-border p-3 rounded-2xl flex justify-between items-center text-sm">
                <span className="text-zinc-400">Bateria Inicial</span>
                <span className="font-bold text-success">
                  {indicadores.bateria_inicial}%
                </span>
              </div>
            </div>

            {/* Botão de Redirecionamento */}
            <button
              onClick={onNavigate}
              className="w-full bg-success hover:bg-success/90 active:bg-emerald-700 text-background font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-success/20 hover:shadow-success/30 transition-all duration-200 cursor-pointer"
            >
              Ir para o Monitoramento
            </button>
          </div>
        )}

        {/* BOTÃO PARA PULAR INICIO DE SESSÃO --> PARA TESTAR OUTRAS PARTES DA PAGINA WEB <-- */}
        {onNavigate && !sessaoIniciada && (
          <button
            onClick={onNavigate}
            className="mt-4 w-full rounded-2xl border border-border bg-surface hover:bg-surface-hover px-6 py-3.5 font-semibold text-zinc-300 shadow-sm transition-all duration-200 cursor-pointer"
          >
            Abrir monitoramento e labirinto
          </button>
        )}
      </div>
    </div>
  );
}
