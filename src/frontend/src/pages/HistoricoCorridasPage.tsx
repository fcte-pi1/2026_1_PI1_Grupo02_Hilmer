/**
 * Página de histórico de corridas.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Search, AlertCircle } from "lucide-react";

import { CardMelhorTempo } from "../components/CardMelhorTempo";
import { MonitoringLayout } from "../components/MonitoringLayout";
import { useMelhorTempo } from "../hooks/useMelhorTempo";
import { useTelemetria } from "../hooks/useTelemetria";
import { listarCorridasResumo } from "../services/corrida";
import type {
  CorridaResumoResponse,
  TipoLabirinto,
  TipoLabirintoFiltro,
} from "../types/corrida";
import { CorridaDetailOverlay } from "../components/corrida/CorridaDetailOverlay";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatarTempo = (ms?: number | null): string => {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) {
    return "--";
  }
  const minutos = Math.floor(ms / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  const milissegundos = Math.floor(ms % 1000);
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}.${String(milissegundos).padStart(3, "0")}`;
};

const formatarData = (dataIso: string | null): string => {
  if (!dataIso) return "--";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dataIso));
  } catch {
    return dataIso;
  }
};

// ---------------------------------------------------------------------------
// Badge de status
// ---------------------------------------------------------------------------

type StatusCorrida = CorridaResumoResponse["status_corrida"];

const badgeStatusMap: Record<StatusCorrida, { label: string; classes: string }> =
  {
    CONCLUIDA: {
      label: "Concluída",
      classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    ABORTADA: {
      label: "Abortada",
      classes: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    EM_ANDAMENTO: {
      label: "Em andamento",
      classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  };

const BadgeStatus: React.FC<{ status: StatusCorrida }> = ({ status }) => {
  const config = badgeStatusMap[status] ?? {
    label: status,
    classes: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${config.classes}`}>
      {config.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Filtro de tipo
// ---------------------------------------------------------------------------

const TIPOS: { value: TipoLabirintoFiltro; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "4X4", label: "4×4" },
  { value: "8X8", label: "8×8" },
  { value: "16X16", label: "16×16" },
];

// ---------------------------------------------------------------------------
// HistoricoCorridasPage
// ---------------------------------------------------------------------------

type HistoricoCorridasPageProps = {
  activeView: "telemetria" | "labirinto" | "corridas";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateCorridas: () => void;
};

export function HistoricoCorridasPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateCorridas,
}: HistoricoCorridasPageProps) {
  const [corridas, setCorridas] = useState<CorridaResumoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoSelecionado, setTipoSelecionado] =
    useState<TipoLabirintoFiltro>("TODOS");
  const [contadorTabela, setContadorTabela] = useState(0);
  const [idCorridaSelecionada, setIdCorridaSelecionada] = useState<number | null>(null);

  const tipoParaRecorde: TipoLabirinto =
    tipoSelecionado === "TODOS" ? "4X4" : tipoSelecionado;

  const { melhorTempo, loading: loadingRecorde, erro: erroRecorde, refetch } =
    useMelhorTempo(tipoParaRecorde);

  const melhorTempoAnteriorRef = useRef<number | null>(null);

  const handleSessaoEncerradaComSucesso = useCallback(() => {
    refetch();
    setContadorTabela((c) => c + 1);
  }, [refetch]);

  const telemetria = useTelemetria({
    onSessaoEncerradaComSucesso: handleSessaoEncerradaComSucesso,
  });

  useEffect(() => {
    if (!melhorTempo) return;
    const anterior = melhorTempoAnteriorRef.current;
    const atual = melhorTempo.tempo_total;
    if (anterior !== null && atual < anterior) {
      toast.success("Novo recorde global!", { id: "novo-recorde", duration: 4000 });
    }
    melhorTempoAnteriorRef.current = atual;
  }, [melhorTempo]);

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      setLoading(true);
      setErro(null);
      try {
        const tipo = tipoSelecionado === "TODOS" ? undefined : tipoSelecionado;
        const resultado = await listarCorridasResumo(tipo);
        if (!cancelado) setCorridas(resultado);
      } catch (e) {
        if (!cancelado)
          setErro(e instanceof Error ? e.message : "Erro ao carregar histórico.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    buscar();
    return () => {
      cancelado = true;
    };
  }, [tipoSelecionado, contadorTabela]);

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      onNavigateCorridas={onNavigateCorridas}
      eyebrow="Histórico"
      title="Análise de Performance"
      description="Visualize o desempenho histórico do robô e identifique padrões de navegação e recordes."
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Recordes Section */}
        <section data-testid="card-melhor-tempo">
          <CardMelhorTempo
            tipo={tipoParaRecorde}
            melhorTempo={melhorTempo}
            loading={loadingRecorde}
            erro={erroRecorde}
          />
          {melhorTempo && (
            <span data-testid="melhor-tempo-valor" className="sr-only">
              {formatarTempo(melhorTempo.tempo_total)}
            </span>
          )}
        </section>

        {/* List Section */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3" data-testid="filtro-labirinto">
              <Search size={18} className="text-zinc-500" />
              <div className="flex gap-1 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
                {TIPOS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    data-tipo={value}
                    data-testid={`filtro-labirinto-${value}`}
                    onClick={() => setTipoSelecionado(value)}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold transition duration-200 ${
                      tipoSelecionado === value
                        ? "bg-zinc-800 text-yellow-400 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setContadorTabela(c => c + 1)}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar Dados
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/30">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Data e Hora</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Dimensão</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Tempo Total</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Vel. Média</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900" data-testid="lista-corridas">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="h-6 bg-zinc-900/50 rounded-lg w-full" />
                        </td>
                      </tr>
                    ))
                  ) : erro ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-rose-400 font-medium">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle size={24} />
                          <span>{erro}</span>
                        </div>
                      </td>
                    </tr>
                  ) : corridas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-zinc-600 italic">
                        Nenhum registro encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    corridas.map((corrida) => (
                      <tr
                        key={corrida.id_corrida}
                        onClick={() => setIdCorridaSelecionada(corrida.id_corrida)}
                        className="group cursor-pointer transition hover:bg-zinc-900/40"
                      >
                        <td className="px-6 py-5 font-mono text-xs font-bold text-yellow-500/60 group-hover:text-yellow-400">
                          #{corrida.id_corrida}
                        </td>
                        <td className="px-6 py-5 text-zinc-300">
                          {formatarData(corrida.data_hora_inicio)}
                        </td>
                        <td className="px-6 py-5">
                          <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-black border border-zinc-800 text-zinc-400">
                            {corrida.tipo_labirinto ?? "--"}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono text-zinc-300 font-medium">
                          {formatarTempo(corrida.tempo_total)}
                        </td>
                        <td className="px-6 py-5 text-zinc-400">
                          {corrida.velocidade_media != null
                            ? `${corrida.velocidade_media.toFixed(2)} cm/s`
                            : "--"}
                        </td>
                        <td className="px-6 py-5">
                          <BadgeStatus status={corrida.status_corrida} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {idCorridaSelecionada !== null && (
        <CorridaDetailOverlay 
          idCorrida={idCorridaSelecionada} 
          onClose={() => setIdCorridaSelecionada(null)} 
        />
      )}
    </MonitoringLayout>
  );
}