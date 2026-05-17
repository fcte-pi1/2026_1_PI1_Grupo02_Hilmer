import { useTelemetria } from '../hooks/useTelemetria';

export default function SessionManager() {
    const { indicadores, configSessao, conectado, erro } = useTelemetria();

    // Determina se a sessão de monitoramento já foi iniciada
    const sessaoIniciada = indicadores.status_corrida === "em_andamento";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">

            {/* Indicador de conexão com o WebSocket */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200/80 px-4 py-2 rounded-full shadow-md">
                <span className={`w-2.5 h-2.5 rounded-full ${conectado ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                    {conectado ? 'Servidor Conectado' : 'Conectando...'}
                </span>
            </div>

            {erro && (
                <div className="absolute top-20 right-6 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm shadow-md backdrop-blur-md">
                    {erro}
                </div>
            )}

            <div className="w-full max-w-md transition-all duration-500">
                {!sessaoIniciada ? (
                    /* FASE 1: AGUARDANDO CONFIGURAÇÃO */
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-8 rounded-3xl text-center shadow-xl relative overflow-hidden">
                        {/* Efeito de brilho de fundo suave */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>

                        {/* Ícone Pulsante */}
                        <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
                            <span className="text-3xl">🤖</span>
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Aguardando Inicialização
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            O sistema de monitoramento está pronto e ouvindo. Ligue o Micromouse para iniciar a sessão automaticamente.
                        </p>

                        {/* Spinner/Pulse animado */}
                        <div className="flex justify-center gap-1.5 py-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                ) : (
                    /* FASE 2: SESSÃO INICIADA */
                    <div className="bg-white/90 backdrop-blur-xl border border-emerald-500/20 p-8 rounded-3xl shadow-xl relative overflow-hidden animate-fade-in text-center">
                        {/* Efeito de brilho verde indicando sucesso */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>

                        {/* Ícone de Sucesso */}
                        <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <span className="text-3xl">🎉</span>
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Sessão Iniciada!
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            O Micromouse conectou-se com sucesso e o monitoramento em tempo real está pronto para ser iniciado.
                        </p>

                        <div className="space-y-3 mb-8">
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex justify-between items-center text-sm">
                                <span className="text-slate-500">Tentativa:</span>
                                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
                                    #{configSessao.tentativa}
                                </span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex justify-between items-center text-sm">
                                <span className="text-slate-500">Dimensão do Labirinto</span>
                                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
                                    {configSessao.dimensao}
                                </span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex justify-between items-center text-sm">
                                <span className="text-slate-500">Bateria Inicial</span>
                                <span className="font-bold text-emerald-600">
                                    {indicadores.bateria_inicial}%
                                </span>
                            </div>
                        </div>

                        {/* Botão de Redirecionamento */}
                        <button
                            onClick={() => alert("Redirecionando para a tela de monitoramento...")}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 cursor-pointer"
                        >
                            Ir para o Monitoramento
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

