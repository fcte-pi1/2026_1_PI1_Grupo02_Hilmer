/**
 * Página de histórico de sessões (corridas).
 *
 * Exibe o CardMelhorTempo como destaque visual e uma tabela com todas as
 * corridas registradas, com filtro por tipo de labirinto.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

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

const formatarIdCorrida = (id: number): string => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `#${ano}-${mes}-${dia}-${String(id).padStart(3, "0")}`;
};

// ---------------------------------------------------------------------------
// Badge de status
// ---------------------------------------------------------------------------

type StatusCorrida = CorridaResumoResponse["status_corrida"];

const badgeStatus: Record<StatusCorrida, { label: string; classes: string }> =
  {
    CONCLUIDA: {
      label: "Concluída",
      classes: "bg-green-100 text-green-700",
    },
    ABORTADA: {
      label: "Abortada",
      classes: "bg-red-100 text-red-700",
    },
    EM_ANDAMENTO: {
      label: "Em andamento",
      classes: "bg-amber-100 text-amber-700",
    },
  };

const BadgeStatus: React.FC<{ status: StatusCorrida }> = ({ status }) => {
  const { label, classes } = badgeStatus[status] ?? {
    label: status,
    classes: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      {label}
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
// SessionsPage
// ---------------------------------------------------------------------------

// 1. Atualizado as tipagens dos props para aceitar a nova rota de estados
type SessionsPageProps = {
  activeView: "telemetria" | "labirinto" | "corridas" | "estados";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateCorridas: () => void;
  onNavigateEstados: () => void;
};

export function SessionsPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateCorridas,
  onNavigateEstados, // Desestruturado aqui
}: SessionsPageProps) {
  const [corridas, setCorridas] = useState<CorridaResumoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoSelecionado, setTipoSelecionado] =
    useState<TipoLabirintoFiltro>("TODOS");
  const [contadorTabela, setContadorTabela] = useState(0);

  // Tipo para o CardMelhorTempo
  const tipoParaRecorde: TipoLabirinto =
    tipoSelecionado === "TODOS" ? "4X4" : tipoSelecionado;

  // Hook do melhor tempo
  const { melhorTempo, loading: loadingRecorde, erro: erroRecorde, refetch } =
    useMelhorTempo(tipoParaRecorde);

  // Ref para comparar tempo anterior e exibir toast de novo recorde
  const melhorTempoAnteriorRef = useRef<number | null>(null);

  // Refetch + toast ao encerrar com sucesso
  const handleSessaoEncerradaComSucesso = useCallback(() => {
    refetch();
    setContadorTabela((c) => c + 1);
  }, [refetch]);

  const telemetria = useTelemetria({
    onSessaoEncerradaComSucesso: handleSessaoEncerradaComSucesso,
  });

  // Exibe toast de novo recorde
  useEffect(() => {
    if (melhorTempo === null) return;

    const anterior = melhorTempoAnteriorRef.current;
    const atual = melhorTempo.tempo_total;

    if (anterior !== null && atual < anterior) {
      toast.success("Novo recorde!", { id: "novo-recorde", duration: 4000 });
    }

    melhorTempoAnteriorRef.current = atual;
  }, [melhorTempo]);

  // Busca a tabela de corridas
  useEffect(() => {
    let cancelado = false;

    async function buscar() {
      setLoading(true);
      setErro(null);
      try {
        const tipo =
          tipoSelecionado === "TODOS" ? undefined : tipoSelecionado;
        const resultado = await listarCorridasResumo(tipo);
        if (!cancelado) setCorridas(resultado);
      } catch (e) {
        if (!cancelado)
          setErro(
            e instanceof Error ? e.message : "Erro ao carregar corridas.",
          );
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
      onNavigateEstados={onNavigateEstados} // 2. Passando a propriedade obrigatória para o Layout
      eyebrow="Corridas"
      title="Histórico de Sessões"
      description="Consulte todas as corridas registradas e veja o melhor resultado por tipo de labirinto."
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      {/* Destaque: melhor tempo */}
      <div className="mb-8">
        <CardMelhorTempo
          tipo={tipoParaRecorde}
          melhorTempo={melhorTempo}
          loading={loadingRecorde}
          erro={erroRecorde}
        />
      </div>

      {/* Filtro por tipo */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Filtrar por tipo:
        </span>
        <div className="flex gap-1">
          {TIPOS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipoSelecionado(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tipoSelecionado === value
                  ? "bg-zinc-950 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de corridas */}
      <div className="w-full rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-950">Corridas</h2>
          <p className="text-sm text-zinc-500">
            {loading
              ? "Carregando..."
              : `${corridas.length} corrida${corridas.length !== 1 ? "s" : ""} encontrada${corridas.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {erro && (
          <div className="mx-6 my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            ⚠️ {erro}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Data / Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Dimensão
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Duração
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Vel. Média
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : corridas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-zinc-400"
                  >
                    Nenhuma corrida encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                corridas.map((corrida) => (
                  <tr
                    key={corrida.id_corrida}
                    className="border-b border-neutral-100 transition hover:bg-neutral-50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                      {formatarIdCorrida(corrida.id_corrida)}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
                      {formatarData(corrida.data_hora_inicio)}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
                      {corrida.tipo_labirinto ?? "--"}
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-700">
                      {formatarTempo(corrida.tempo_total)}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
                      {corrida.velocidade_media != null
                        ? `${corrida.velocidade_media.toFixed(2)} cm/s`
                        : "--"}
                    </td>
                    <td className="px-6 py-4">
                      <BadgeStatus status={corrida.status_corrida} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MonitoringLayout>
  );
}