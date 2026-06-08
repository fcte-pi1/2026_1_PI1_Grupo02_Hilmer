import React, { useState, useEffect, useRef } from 'react';
import { useTelemetria } from '../hooks/useTelemetria';

type TipoAlertaTelemetria = 'bateria_critica' | 'possivel_parada_inesperada' | 'temperatura_critica';

interface AlertaTelemetria {
  tipo: TipoAlertaTelemetria;
  mensagem: string;
  timestamp_ms: number;
}

type EstadoCorridaVisual = 'configuracao' | 'em_movimento' | 'rota_otimizada' | 'concluida' | 'falha';

interface ItemHistorico {
  tempo: string;
  de: string;
  para: string;
  gatilho: string;
  tipoLog: 'Estado' | 'Alerta';
}

export function EstadosContent(): React.JSX.Element {
  // 1. Instancia o Hook de Telemetria que abstrai o WebSocket de forma performática
  const telemetria = useTelemetria();
  const { indicadores, configSessao, statusConexao, ultimaMovimentacao } = telemetria;

  // 2. Mantém os estados de controle visual e histórico locais solicitados pela interface
  const [estadoVisual, setEstadoVisual] = useState<EstadoCorridaVisual>('configuracao');
  const [historicoTransicoes, setHistoricoTransicoes] = useState<ItemHistorico[]>([]);
  const [filtroHistorico, setFiltroHistorico] = useState<'Tudo' | 'Estado' | 'Alerta'>('Tudo');

  const tempoConfigRef = useRef<number>(0);
  const tempoMovimentoRef = useRef<number>(0);
  const [tempoConfig, setTempoConfig] = useState<number>(0);
  const [tempoMovimento, setTempoMovimento] = useState<number>(0);
  const [tempoRota, setTempoRota] = useState<number>(0);

  // Auxiliar para popular a tabela de auditoria
  const adicionarAoHistorico = (de: string, para: string, gatilho: string, tipoLog: 'Estado' | 'Alerta' = 'Estado'): void => {
    const novoEvento: ItemHistorico = {
      tempo: new Date().toLocaleTimeString(),
      de,
      para,
      gatilho,
      tipoLog
    };
    setHistoricoTransicoes(prev => [novoEvento, ...prev]);
  };

  // Retorna os labels amigáveis baseados na tipagem visual
  const obterLabel = (id: EstadoCorridaVisual) => {
    if (id === 'configuracao') return 'Configuração Inicial';
    if (id === 'em_movimento') return 'Mapeamento Ativo';
    if (id === 'rota_otimizada') return 'Rota Otimizada';
    return id === 'concluida' ? 'Desafio Cumprido' : 'Corrida Interrompida';
  };

  // 3. Efeito reativo para escutar mudanças estruturais consolidadas pelo hook e gerenciar a máquina de estados local
  useEffect(() => {
    if (!indicadores) return;

    const tempoAtual = indicadores.ultimo_timestamp_ms ?? indicadores.tempo_decorrido_ms ?? 0;
    const statusBackend = indicadores.status_corrida;
    let proximoEstadoVisual: EstadoCorridaVisual = 'configuracao';
    let gatilhoMsg = 'Aguardando inicialização do barramento...';

    // A) Mapeamento de Estado Baseado em Indicadores de Negócio
    if (indicadores.alerta_temperatura_critica || statusBackend === 'falha') {
      proximoEstadoVisual = 'falha';
      gatilhoMsg = `Sinalizador Crítico: Execução interrompida via firmware aos ${tempoAtual}ms.`;
    } else if (statusBackend === 'concluida' || indicadores.tempo_final_ms !== null) {
      proximoEstadoVisual = 'concluida';
      gatilhoMsg = `Objetivo alcançado! Percurso finalizado com sucesso.`;
    } else if (ultimaMovimentacao !== null && statusBackend === 'em_andamento') {
      // Se houver uma última movimentação mas sem o encerramento, assumimos rota ou exploração ativa
      proximoEstadoVisual = 'em_movimento';
      gatilhoMsg = `Movimentação registrada: Célula [${ultimaMovimentacao.x}, ${ultimaMovimentacao.y}] mapeada com bitmask w=${ultimaMovimentacao.w}.`;
    } else if (statusBackend === 'em_andamento') {
      proximoEstadoVisual = 'em_movimento';
      gatilhoMsg = `Telemetria Ativa: Micromouse iniciou varredura do labirinto.`;
    } else if (statusBackend === 'aguardando') {
      proximoEstadoVisual = 'configuracao';
      gatilhoMsg = `Sessão Iniciada: Labirinto configurado para dimensão ${configSessao.dimensao ?? '16x16'}.`;
    }

    // B) Tratamento Estrito de Alertas no Histórico (Injetados apenas em transição de estado/ocorrência)
    if (indicadores.alerta_temperatura_critica) {
      adicionarAoHistorico('—', 'ALERTA CRÍTICO', `Temperatura elevada detectada! Hardware operando acima do limite nominal estável.`, 'Alerta');
    }
    if (indicadores.bateria_atual !== null && indicadores.bateria_atual <= 10) {
      adicionarAoHistorico('—', 'BATERIA BAIXA', `Nível de energia crítico: Sistema operando com ${indicadores.bateria_atual.toFixed(1)}%.`, 'Alerta');
    }

    // C) Gerenciamento e Acúmulo de Partição de Tempo das Métricas
    if (proximoEstadoVisual === 'configuracao') {
      tempoConfigRef.current = tempoAtual;
      setTempoConfig(tempoAtual);
    } else if (proximoEstadoVisual === 'em_movimento') {
      const diferenca = tempoAtual - tempoConfigRef.current;
      tempoMovimentoRef.current = diferenca > 0 ? diferenca : 0;
      setTempoMovimento(tempoMovimentoRef.current);
    } else if (proximoEstadoVisual === 'rota_otimizada') {
      const diferencaRota = tempoAtual - (tempoConfigRef.current + tempoMovimentoRef.current);
      setTempoRota(diferencaRota > 0 ? diferencaRota : 0);
    }

    // D) Commit da Transição de Estado no Histórico
    if (proximoEstadoVisual !== estadoVisual) {
      adicionarAoHistorico(obterLabel(estadoVisual), obterLabel(proximoEstadoVisual), gatilhoMsg, 'Estado');
      setEstadoVisual(proximoEstadoVisual);
    }

  }, [indicadores, configSessao, ultimaMovimentacao, estadoVisual]);

  // Formatação para exibição gráfica
  const formatarSegundos = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  const logsFiltrados = historicoTransicoes.filter(log => {
    if (filtroHistorico === 'Tudo') return true;
    return log.tipoLog === filtroHistorico;
  });

  const passoAtual = (() => {
    if (estadoVisual === 'configuracao') return 0;
    if (estadoVisual === 'em_movimento') return 1;
    if (estadoVisual === 'rota_otimizada') return 2;
    return 3;
  })();

  return (
    <div className="flex flex-col gap-4 w-full text-zinc-400">
      {/* Fluxo Visual Superior */}
      <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Fluxo da Máquina de Estados</h2>
            <p className="text-xs text-zinc-500">Ciclo de vida nominal do Micromouse espelhado via WebSockets</p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${statusConexao === 'online' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} /> 
              {statusConexao === 'online' ? 'WS Ativo' : 'WS Desconectado'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border transition-all ${passoAtual === 0 ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800/80 bg-zinc-900/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${passoAtual > 0 ? 'bg-zinc-700' : 'bg-blue-500'}`}>{passoAtual > 0 ? '✓' : '1'}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">CONFIGURAÇÃO</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${passoAtual === 0 ? 'text-blue-400' : 'text-zinc-300'}`}>Configuração Validada</span>
          </div>
          
          <div className={`p-4 rounded-xl border transition-all ${passoAtual === 1 ? 'border-blue-500/50 bg-blue-500/10' : passoAtual > 1 ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-zinc-900/40 opacity-40 bg-zinc-950/20'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${passoAtual > 1 ? 'bg-zinc-700' : 'bg-blue-500'}`}>{passoAtual > 1 ? '✓' : '2'}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">MAPEAMENTO</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${passoAtual === 1 ? 'text-blue-400' : 'text-zinc-300'}`}>Mapeamento Ativo</span>
          </div>
          
          <div className={`p-4 rounded-xl border transition-all ${passoAtual === 2 ? 'border-blue-500/50 bg-blue-500/10' : passoAtual > 2 ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-zinc-900/40 opacity-40 bg-zinc-950/20'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${passoAtual > 2 ? 'bg-zinc-700' : 'bg-blue-500'}`}>{passoAtual > 2 ? '✓' : '3'}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">EXECUÇÃO</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${passoAtual === 2 ? 'text-blue-400' : 'text-zinc-300'}`}>Rota Otimizada</span>
          </div>
          
          <div className={`p-4 rounded-xl border transition-all ${estadoVisual === 'concluida' ? 'border-emerald-500/40 bg-emerald-500/10' : estadoVisual === 'falha' ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-900/40 opacity-40 bg-zinc-950/20'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${estadoVisual === 'concluida' ? 'bg-emerald-500' : estadoVisual === 'falha' ? 'bg-red-500' : 'bg-zinc-800'}`}>4</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ENCERRAMENTO</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${estadoVisual === 'concluida' ? 'text-emerald-400' : estadoVisual === 'falha' ? 'text-red-400' : 'text-zinc-500'}`}>
              {estadoVisual === 'concluida' ? 'Desafio Cumprido!' : estadoVisual === 'falha' ? 'Corrida Interrompida' : 'Aguardando Finalização'}
            </span>
          </div>
        </div>
      </div>

      {/* Histórico e Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Tabela Log */}
        <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Histórico de Transições</h2>
              <p className="text-xs text-zinc-500">Filtragem dinâmica em tempo real mapeado por eventos abstratos</p>
            </div>
            <div className="flex rounded-lg bg-zinc-950 p-0.5 text-xs font-medium text-zinc-400 border border-zinc-800/60">
              {(['Tudo', 'Estado', 'Alerta'] as const).map(tipo => (
                <button key={tipo} onClick={() => setFiltroHistorico(tipo)} className={`rounded px-3 py-1 transition-all ${filtroHistorico === tipo ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'hover:text-zinc-200'}`}>{tipo}</button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/60 text-xs text-zinc-500 font-medium">
                  <th className="py-2.5 font-mono">Tempo</th>
                  <th className="py-2.5">De</th>
                  <th className="py-2.5">Para</th>
                  <th className="py-2.5">Gatilho de Transição Abstraído</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {logsFiltrados.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-zinc-500">Aguardando telemetria ativa do micorcontrolador pelo barramento...</td></tr>
                ) : (
                  logsFiltrados.map((transicao, i) => (
                    <tr key={i} className="border-b border-zinc-900/40 hover:bg-zinc-900/20">
                      <td className="py-3 text-zinc-500 font-mono">{transicao.tempo}</td>
                      <td className="py-3 text-zinc-400">{transicao.de}</td>
                      <td className={`py-3 font-medium ${transicao.tipoLog === 'Alerta' ? 'text-amber-500 font-bold' : 'text-blue-400'}`}>{transicao.tipoLog === 'Alerta' ? '⚠️ ' : '➔ '} {transicao.para}</td>
                      <td className="py-3 text-zinc-400 font-sans">{transicao.gatilho}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Métricas Acumuladas */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Métricas Acumuladas</h2>
            <p className="text-xs text-zinc-500 mb-4">Temporizadores por partição lógica do firmware</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-zinc-400">Configuração Inicial</span>
                  <span className="font-mono text-zinc-500">{formatarSegundos(tempoConfig)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: tempoConfig > 0 ? '100%' : '0%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-zinc-400">Mapeamento (Exploratório)</span>
                  <span className="font-mono text-zinc-500">{formatarSegundos(tempoMovimento)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: estadoVisual !== 'configuracao' ? '100%' : '0%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-zinc-400">Corrida Rápida (Floodfill)</span>
                  <span className="font-mono text-zinc-500">{formatarSegundos(tempoRota)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: (estadoVisual === 'rota_otimizada' || passoAtual === 3) ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-4 mt-6 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Tempo Geral Estimado:</span>
              <span className="font-mono font-bold text-zinc-300">{indicadores.tempo_decorrido_ms ? `${(indicadores.tempo_decorrido_ms / 1000).toFixed(1)}s` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Velocidade Média Total:</span>
              <span className="font-semibold text-zinc-400">{indicadores.velocidade_media ? `${indicadores.velocidade_media.toFixed(2)} cm/s` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Bateria Remanescente:</span>
              <span className={`font-semibold ${indicadores.bateria_atual && indicadores.bateria_atual <= 10 ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                {indicadores.bateria_atual !== null ? `${indicadores.bateria_atual.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}