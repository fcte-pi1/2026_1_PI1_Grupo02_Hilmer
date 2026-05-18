import React, { useEffect, useMemo, useState } from "react";
import { useTelemetria } from "../hooks/useTelemetria";

type StatusCorrida = "aguardando" | "em_andamento" | "concluida" | "abortada";

type IndicadoresTelemetria = {
  bateria_atual?: number | null;
  velocidade_media?: number | null;
  tempo_decorrido_ms?: number | null;
  tempo_final_ms?: number | null;
  status_corrida?: StatusCorrida | string | null;
  ultimo_timestamp_ms?: number | null;
};

const LIMITE_BATERIA_CRITICA = 15;
const LIMITE_SEM_TELEMETRIA_MS = 3000;

const formatarTempo = (ms?: number | null): string => {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) {
    return "00:00.000";
  }

  const minutos = Math.floor(ms / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  const milissegundos = Math.floor(ms % 1000);

  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(
    2,
    "0",
  )}.${String(milissegundos).padStart(3, "0")}`;
};

const normalizarStatus = (status?: string | null): StatusCorrida => {
  const valor = status?.toLowerCase();

  if (valor === "em_andamento" || valor === "concluida" || valor === "abortada") {
    return valor;
  }

  return "aguardando";
};

const rotuloStatus: Record<StatusCorrida, string> = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  abortada: "Abortada",
};

const obterNumeroValido = (valor?: number | null): number | null => {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }

  return valor;
};

type CardIndicadorProps = {
  titulo: string;
  valor: string;
  descricao?: string;
  estado?: "normal" | "critico" | "sucesso" | "vazio";
};

const CardIndicador: React.FC<CardIndicadorProps> = ({
  titulo,
  valor,
  descricao,
  estado = "normal",
}) => {
  const estilos = {
    normal: "border-neutral-200 bg-white text-neutral-900",
    critico: "border-red-300 bg-red-50 text-red-950",
    sucesso: "border-green-300 bg-green-50 text-green-950",
    vazio: "border-neutral-200 bg-neutral-50 text-neutral-400",
  }[estado];

  return (
    <section className={`rounded-xl border p-5 transition-colors ${estilos}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {titulo}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{valor}</p>
      {descricao && <p className="mt-2 text-xs text-current opacity-75">{descricao}</p>}
    </section>
  );
};

export const DashboardIndicadores: React.FC = () => {
  const { indicadores, conectado } = useTelemetria() as {
    indicadores?: IndicadoresTelemetria | null;
    conectado: boolean;
  };

  const [alertaSemSinal, setAlertaSemSinal] = useState(false);

  const statusCorrida = normalizarStatus(indicadores?.status_corrida);
  const corridaAguardando = !indicadores || statusCorrida === "aguardando";
  const corridaConcluida = statusCorrida === "concluida";
  const corridaAbortada = statusCorrida === "abortada";

  const bateriaAtual = obterNumeroValido(indicadores?.bateria_atual);
  const velocidadeMedia = obterNumeroValido(indicadores?.velocidade_media);
  const tempoDecorridoMs = obterNumeroValido(indicadores?.tempo_decorrido_ms) ?? 0;
  const tempoFinalMs = obterNumeroValido(indicadores?.tempo_final_ms);
  const ultimoTimestampMs = obterNumeroValido(indicadores?.ultimo_timestamp_ms);

  const bateriaCritica = bateriaAtual !== null && bateriaAtual < LIMITE_BATERIA_CRITICA;

  const tempoExibido = useMemo(() => {
    if (corridaConcluida && tempoFinalMs !== null) {
      return tempoFinalMs;
    }

    return tempoDecorridoMs;
  }, [corridaConcluida, tempoDecorridoMs, tempoFinalMs]);

  useEffect(() => {
    if (!indicadores || statusCorrida !== "em_andamento") {
      setAlertaSemSinal(false);
      return;
    }

    setAlertaSemSinal(false);

    const timer = window.setTimeout(() => {
      setAlertaSemSinal(true);
    }, LIMITE_SEM_TELEMETRIA_MS);

    return () => window.clearTimeout(timer);
  }, [indicadores, statusCorrida, ultimoTimestampMs]);

  return (
    <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex flex-col gap-3 border-b border-neutral-100 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Telemetria
          </p>
          <h2 className="text-2xl font-semibold text-neutral-950">
            Indicadores de Desempenho
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Métricas em tempo real da corrida do Micromouse.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              conectado
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            WebSocket: {conectado ? "Conectado" : "Desconectado"}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700">
            Corrida: {rotuloStatus[statusCorrida]}
          </span>
        </div>
      </header>

      <div className="mb-5 space-y-3">
        {bateriaCritica && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            ⚠️ Bateria crítica: nível abaixo de {LIMITE_BATERIA_CRITICA}%.
          </div>
        )}

        {alertaSemSinal && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
            ⚠️ Ausência de telemetria recente: sem novos pacotes há mais de 3 segundos.
          </div>
        )}
      </div>

      <main className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CardIndicador
          titulo="Bateria"
          valor={corridaAguardando || bateriaAtual === null ? "--%" : `${bateriaAtual.toFixed(1)}%`}
          descricao={
            bateriaCritica
              ? "Bateria crítica"
              : corridaAguardando
                ? "Aguardando telemetria"
                : "Última bateria conhecida"
          }
          estado={corridaAguardando ? "vazio" : bateriaCritica ? "critico" : "normal"}
        />

        <CardIndicador
          titulo="Velocidade média"
          valor={
            corridaAguardando || velocidadeMedia === null || velocidadeMedia < 0
              ? "-- cm/s"
              : `${velocidadeMedia.toFixed(2)} cm/s`
          }
          descricao={corridaAguardando ? "Aguardando deslocamento" : "Calculada pela telemetria"}
          estado={corridaAguardando ? "vazio" : "normal"}
        />

        <CardIndicador
          titulo={corridaConcluida || corridaAbortada ? "Tempo final" : "Tempo decorrido"}
          valor={corridaAguardando ? "00:00.000" : formatarTempo(tempoExibido)}
          descricao={
            corridaConcluida
              ? "Tempo fixado após conclusão"
              : corridaAbortada
                ? "Tempo fixado após encerramento"
                : corridaAguardando
                  ? "Aguardando largada"
                  : "Atualizado durante a corrida"
          }
          estado={
            corridaAguardando
              ? "vazio"
              : corridaConcluida
                ? "sucesso"
                : corridaAbortada
                  ? "critico"
                  : "normal"
          }
        />
      </main>
    </div>
  );
};