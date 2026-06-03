import React, { useEffect, useRef, useState } from "react";
import { useTelemetria, type UseTelemetriaReturn } from "../hooks/useTelemetria";
import { CriticalAlertModal, type CriticalAlertType } from "./CriticalAlertModal";

type StatusCorrida = "aguardando" | "em_andamento" | "concluida" | "abortada";

const LIMITE_BATERIA_CRITICA = 10;
const LIMITE_SEM_TELEMETRIA_MS = 3000;

const formatarTempo = (ms?: number | null): string => {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) return "00:00.000";
  const minutos = Math.floor(ms / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  const milissegundos = Math.floor(ms % 1000);
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}.${String(milissegundos).padStart(3, "0")}`;
};

const normalizarStatus = (status?: string | null): StatusCorrida => {
  const valor = status?.toLowerCase();
  if (valor === "em_andamento" || valor === "concluida" || valor === "abortada") return valor;
  if (valor === "falha") return "abortada";
  return "aguardando";
};

const obterNumeroValido = (valor?: number | null): number | null => {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  return valor;
};

export const TopIndicators: React.FC<{ telemetria: UseTelemetriaReturn }> = ({ telemetria }) => {
  const { indicadores, ultimaMovimentacao } = telemetria;
  const bateriaAtual = obterNumeroValido(indicadores?.bateria_atual);
  const bateriaCritica = bateriaAtual !== null && bateriaAtual <= LIMITE_BATERIA_CRITICA;
  const statusCorrida = normalizarStatus(indicadores?.status_corrida);
  const corridaConcluida = statusCorrida === "concluida";
  const tempoDecorridoMs = obterNumeroValido(indicadores?.tempo_decorrido_ms) ?? 0;
  const tempoFinalMs = obterNumeroValido(indicadores?.tempo_final_ms);
  const tempoExibido = corridaConcluida && tempoFinalMs !== null ? tempoFinalMs : tempoDecorridoMs;
  const velocidadeMedia = obterNumeroValido(indicadores?.velocidade_media);
  const xPos = ultimaMovimentacao ? ultimaMovimentacao.x : 0;
  const yPos = ultimaMovimentacao ? ultimaMovimentacao.y : 0;
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
        <span className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Bateria</span>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg sm:text-2xl font-mono font-bold text-white">{bateriaAtual !== null ? `${bateriaAtual.toFixed(1)}%` : "--%"}</span>
          <div className="w-10 sm:w-12 h-4 sm:h-5 border-2 border-zinc-700 rounded-sm relative flex items-center p-[2px]">
            <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[3px] h-2 sm:h-2.5 bg-zinc-700 rounded-r-sm"></div>
            <div className={`h-full rounded-sm transition-all duration-300 ${bateriaCritica ? 'bg-rose-500 animate-pulse' : (bateriaAtual ?? 0) < 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${bateriaAtual ?? 0}%` }}></div>
          </div>
        </div>
      </div>
      
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
        <span className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Velocidade Média</span>
        <span className="text-lg sm:text-2xl font-mono font-bold text-white mt-2">{velocidadeMedia !== null ? `${velocidadeMedia.toFixed(1)} cm/s` : "--"}</span>
      </div>

      <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
        <span className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Tempo Decorrido</span>
        <span className="text-lg sm:text-2xl font-mono font-bold text-primary mt-2">{formatarTempo(tempoExibido)}</span>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
        <span className="text-[10px] sm:text-[11px] uppercase font-bold text-zinc-500 tracking-wider">Posição Atual</span>
        <span className="text-lg sm:text-2xl font-mono font-bold text-white mt-2">({xPos}, {yPos})</span>
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<{ telemetria: UseTelemetriaReturn }> = ({ telemetria }) => {
  const { indicadores, configSessao, statusConexao } = telemetria;
  const statusCorrida = normalizarStatus(indicadores?.status_corrida);
  const idCorrida = indicadores?.id_corrida_banco ? `#${indicadores.id_corrida_banco}` : "Nenhuma";
  const dimensaoGrid = configSessao?.dimensao ? (String(configSessao.dimensao).toLowerCase().includes('x') ? String(configSessao.dimensao) : `${configSessao.dimensao}x${configSessao.dimensao}`) : "--x--";

  return (
    <div className="flex flex-col gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm w-full h-fit">
      <h3 className="text-[11px] font-bold uppercase text-zinc-500 mb-1 border-b border-zinc-800/50 pb-2 tracking-wider">Controle da Sessão</h3>
      
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-zinc-400">Conexão</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusConexao === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span className={`text-[11px] font-bold uppercase ${statusConexao === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {statusConexao === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-zinc-400">Corrida ID</span>
        <span className="text-xs font-bold text-zinc-200">{idCorrida}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-zinc-400">Grade</span>
        <span className="text-xs font-bold text-zinc-200">{dimensaoGrid}</span>
      </div>

      <div className="flex flex-col mt-1 pt-3 border-t border-zinc-800/50 gap-1">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Modo de Execução</span>
        <span className="text-sm font-bold text-primary">{statusCorrida === 'aguardando' ? 'Aguardando' : statusCorrida === 'em_andamento' ? 'Mapeamento' : 'Finalizado'}</span>
      </div>
    </div>
  );
};

export const TelemetryAlerts: React.FC<{ telemetria: UseTelemetriaReturn }> = ({ telemetria }) => {
  const { indicadores } = telemetria;
  const statusCorrida = normalizarStatus(indicadores?.status_corrida);
  const bateriaAtual = obterNumeroValido(indicadores?.bateria_atual);
  const ultimoTimestampMs = obterNumeroValido(indicadores?.ultimo_timestamp_ms);
  
  const [alertaSemSinal, setAlertaSemSinal] = useState(false);
  const [alertaCritico, setAlertaCritico] = useState<{ type: CriticalAlertType; key: string; } | null>(null);

  const bateriaCritica = bateriaAtual !== null && bateriaAtual <= LIMITE_BATERIA_CRITICA;
  const paradaInesperada = indicadores?.alerta_possivel_parada_inesperada === true;

  const bateriaCriticaAbertaRef = useRef(false);
  const paradaInesperadaAbertaRef = useRef(false);

  useEffect(() => {
    let timer: number | undefined;
    if (indicadores && statusCorrida === "em_andamento") {
      setAlertaSemSinal(false);
      timer = window.setTimeout(() => setAlertaSemSinal(true), LIMITE_SEM_TELEMETRIA_MS);
    } else {
      setAlertaSemSinal(false);
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, [indicadores, statusCorrida, ultimoTimestampMs]);

  useEffect(() => {
    if (!bateriaCritica) { bateriaCriticaAbertaRef.current = false; return; }
    if (bateriaCriticaAbertaRef.current) return;
    bateriaCriticaAbertaRef.current = true;
    setAlertaCritico({ type: "battery", key: `battery-${ultimoTimestampMs ?? Date.now()}` });
  }, [bateriaCritica, ultimoTimestampMs]);

  useEffect(() => {
    if (!paradaInesperada) { paradaInesperadaAbertaRef.current = false; return; }
    if (paradaInesperadaAbertaRef.current) return;
    paradaInesperadaAbertaRef.current = true;
    setAlertaCritico({ type: "stopped", key: `stopped-${ultimoTimestampMs ?? Date.now()}` });
  }, [paradaInesperada, ultimoTimestampMs]);

  return (
    <>
      <CriticalAlertModal open={alertaCritico !== null} type={alertaCritico?.type} soundKey={alertaCritico?.key ?? null} onDismiss={() => setAlertaCritico(null)} onConfirm={() => setAlertaCritico(null)} />
      {(bateriaCritica || alertaSemSinal) && (
        <div className="w-full flex flex-col gap-2 mt-2">
          {bateriaCritica && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-bold text-danger">
              ⚠️ Bateria crítica: {bateriaAtual?.toFixed(1)}%
            </div>
          )}
          {alertaSemSinal && (
            <div className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-2 text-xs font-bold text-warning">
              ⚠️ Ausência de telemetria recente.
            </div>
          )}
        </div>
      )}
    </>
  );
};

export const DashboardIndicadores: React.FC<{ telemetria?: UseTelemetriaReturn }> = ({ telemetria }) => {
  const telemetriaHook = useTelemetria();
  const t = telemetria ?? telemetriaHook;
  return (
    <div className="flex flex-col gap-4">
      <TopIndicators telemetria={t} />
      <ControlPanel telemetria={t} />
      <TelemetryAlerts telemetria={t} />
    </div>
  );
};
