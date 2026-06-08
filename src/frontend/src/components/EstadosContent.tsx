import React, { useState, useEffect, useRef } from 'react';
import { useTelemetria } from '../hooks/useTelemetria';

type EstadoCorridaVisual = 'configuracao' | 'em_movimento' | 'concluida' | 'falha';

interface ItemHistorico {
  tempo: string;
  de: string;
  para: string;
  gatilho: string;
  tipoLog: 'Estado' | 'Alerta';
}

export function EstadosContent(): React.JSX.Element {
  const telemetria = useTelemetria();
  const { indicadores, configSessao, statusConexao, ultimaMovimentacao } = telemetria;

  const [estadoVisual, setEstadoVisual] = useState<EstadoCorridaVisual>('configuracao');
  const [historicoTransicoes, setHistoricoTransicoes] = useState<ItemHistorico[]>([]);
  const [filtroHistorico, setFiltroHistorico] = useState<'Tudo' | 'Estado' | 'Alerta'>('Tudo');

  const tempoConfigRef = useRef<number>(0);
  const tempoMovimentoRef = useRef<number>(0);
  const [tempoMovimento, setTempoMovimento] = useState<number>(0);
  
  const [setupRecebido, setSetupRecebido] = useState<boolean>(false);

  const ultimoTimestampLogRef = useRef<number | null>(null);
  const ultimaBateriaLogRef = useRef<number | null>(null);
  
  const alertaBateriaDisparadoRef = useRef<boolean>(false);
  const alertaTemperaturaDisparadoRef = useRef<boolean>(false);

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

  const obterLabel = (id: EstadoCorridaVisual) => {
    if (id === 'configuracao') return 'Configuração Inicial';
    if (id === 'em_movimento') return 'Mapeamento Ativo';
    if (id === 'concluida') return 'Desafio Cumprido';
    return 'Falha Detectada';
  };

  useEffect(() => {
    if (!indicadores) return;

    const tempoAtual = indicadores.ultimo_timestamp_ms ?? indicadores.tempo_decorrido_ms ?? 0;
    const statusBackend = indicadores.status_corrida;
    
    let proximoEstadoVisual: EstadoCorridaVisual = 'configuracao';
    let gatilhoMsg = '';
    let logPacoteDetectado = '';

    // A flag de temperatura só ativa se o hook enviar explicitamente como true
    const isTemperaturaCritica = !!indicadores.alerta_temperatura_critica;

    // =========================================================================
    // 1. IDENTIFICAÇÃO DE RECEBIMENTO DE PACOTES
    // =========================================================================
    if (tempoAtual !== ultimoTimestampLogRef.current || indicadores.bateria_atual !== ultimaBateriaLogRef.current) {
      if (isTemperaturaCritica) {
        logPacoteDetectado = `Pacote Alerta Crítico: Sensor reportou limite seguro de temperatura excedido.`;
      } 
      else if (statusBackend === 'concluida' || indicadores.sucesso === true) {
        logPacoteDetectado = `Pacote Fim de Corrida: Labirinto solucionado! Dados gravados no banco.`;
      }
      else if (statusBackend === 'falha' || indicadores.sucesso === false) {
        logPacoteDetectado = `Pacote Fim de Corrida: Execução interrompida. Robô reportou colisão ou desistência.`;
      } 
      else if (ultimaMovimentacao !== null && tempoAtual === ultimaMovimentacao.timestamp_ms) {
        logPacoteDetectado = `Pacote Movimentação: Célula [${ultimaMovimentacao.x}, ${ultimaMovimentacao.y}] mapeada com bitmask w=${ultimaMovimentacao.w}.`;
      } 
      else if (statusBackend === 'aguardando' && tempoAtual === 0) {
        logPacoteDetectado = `Pacote Configuração: Sessão criada para labirinto de dimensão ${configSessao.dimensao ?? '4x4'}.`;
      } 
      else {
        logPacoteDetectado = `Pacote Heartbeat: Sinal de conexão ativa recebido. Bateria em ${indicadores.bateria_atual?.toFixed(0)}%.`;
      }

      ultimoTimestampLogRef.current = tempoAtual;
      ultimaBateriaLogRef.current = indicadores.bateria_atual;
    }

    if (statusBackend === 'aguardando' || statusBackend === 'em_andamento' || tempoAtual > 0 || ultimaMovimentacao !== null) {
      setSetupRecebido(true);
    }

    // =========================================================================
    // 2. DISPARO ANALÍTICO DE ALERTAS NO HISTÓRICO
    // =========================================================================
    if (isTemperaturaCritica && !alertaTemperaturaDisparadoRef.current) {
      adicionarAoHistorico('Mapeamento Ativo', 'CRÍTICO: SUPERAQUECIMENTO', `Alerta Crítico: Motores/MCU operando acima da temperatura limite!`, 'Alerta');
      alertaTemperaturaDisparadoRef.current = true;
    } else if (!isTemperaturaCritica) {
      alertaTemperaturaDisparadoRef.current = false;
    }

    if (indicadores.bateria_atual !== null && indicadores.bateria_atual <= 10 && !alertaBateriaDisparadoRef.current) {
      adicionarAoHistorico('Mapeamento Ativo', 'AVISO: BATERIA CRÍTICA', `Nível de energia perigoso: Micromouse operando com apenas ${indicadores.bateria_atual.toFixed(1)}%.`, 'Alerta');
      alertaBateriaDisparadoRef.current = true;
    } else if (indicadores.bateria_atual !== null && indicadores.bateria_atual > 10) {
      alertaBateriaDisparadoRef.current = false;
    }

    // =========================================================================
    // 3. TRANSIÇÃO DE ESTADOS VISUAIS
    // =========================================================================
    if (isTemperaturaCritica || statusBackend === 'falha' || indicadores.sucesso === false) {
      proximoEstadoVisual = 'falha';
      gatilhoMsg = logPacoteDetectado || `Corrida cancelada por condições críticas de hardware aos ${tempoAtual}ms.`;
    } else if (statusBackend === 'concluida' || indicadores.sucesso === true) {
      proximoEstadoVisual = 'concluida';
      gatilhoMsg = logPacoteDetectado || `Desafio finalizado com sucesso! Centro alcançado de forma autônoma.`;
    } else if (statusBackend === 'em_andamento' || ultimaMovimentacao !== null) {
      proximoEstadoVisual = 'em_movimento';
      gatilhoMsg = logPacoteDetectado || `Exploratório ativo: Varredura de paredes em andamento.`;
    } else if (statusBackend === 'aguardando') {
      proximoEstadoVisual = 'configuracao';
      gatilhoMsg = logPacoteDetectado || `Aguardando liberação do barramento de largada.`;
    }

    if (proximoEstadoVisual === 'configuracao') {
      tempoConfigRef.current = tempoAtual;
    } else if (proximoEstadoVisual === 'em_movimento') {
      const diferenca = tempoAtual - tempoConfigRef.current;
      tempoMovimentoRef.current = diferenca > 0 ? diferenca : 0;
      setTempoMovimento(tempoMovimentoRef.current);
    }

    // =========================================================================
    // 4. COMMIT DOS EVENTOS DE ESTADO
    // =========================================================================
    if (proximoEstadoVisual !== estadoVisual) {
      adicionarAoHistorico(obterLabel(estadoVisual), obterLabel(proximoEstadoVisual), gatilhoMsg, 'Estado');
      setEstadoVisual(proximoEstadoVisual);
    } else if (logPacoteDetectado) {
      adicionarAoHistorico(obterLabel(estadoVisual), obterLabel(estadoVisual), logPacoteDetectado, 'Estado');
    }

  }, [indicadores, configSessao, ultimaMovimentacao, estadoVisual]);

  const formatarSegundos = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  const logsFiltrados = historicoTransicoes.filter(log => {
    if (filtroHistorico === 'Tudo') return true;
    return log.tipoLog === filtroHistorico;
  });

  const passoAtual = (() => {
    if (estadoVisual === 'configuracao') return 0;
    if (estadoVisual === 'em_movimento') return 1;
    return 2;
  })();

  return (
    <div className="flex flex-col gap-4 w-full text-zinc-400">
      {/* Painel da Máquina de Estados */}
      <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Fluxo da Máquina de Estados</h2>
            <p className="text-xs text-zinc-500">Ciclo de vida nominal do Micromouse espelhado via WebSockets</p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${statusConexao === 'online' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} /> 
              {statusConexao === 'online' ? 'WS Conectado' : statusConexao === 'offline' ? 'Link Caído' : 'Aguardando Link'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border transition-all ${passoAtual === 0 ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800/80 bg-zinc-900/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${passoAtual > 0 ? 'bg-zinc-700' : 'bg-blue-500'}`}>{passoAtual > 0 ? '✓' : '1'}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">1. CONFIGURAÇÃO</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${passoAtual === 0 ? 'text-blue-400' : 'text-zinc-300'}`}>Inicialização Validada</span>
          </div>
          
          <div className={`p-4 rounded-xl border transition-all ${passoAtual === 1 ? 'border-blue-500/50 bg-blue-500/10' : passoAtual > 1 ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-zinc-900/40 opacity-40 bg-zinc-950/20'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${passoAtual > 1 ? 'bg-zinc-700' : 'bg-blue-500'}`}>{passoAtual > 1 ? '✓' : '2'}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">2. MAPEAMENTO</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${passoAtual === 1 ? 'text-blue-400' : 'text-zinc-300'}`}>Exploração Ativa</span>
          </div>
          
          <div className={`p-4 rounded-xl border transition-all ${estadoVisual === 'concluida' ? 'border-emerald-500/40 bg-emerald-500/10' : estadoVisual === 'falha' ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-900/40 opacity-40 bg-zinc-950/20'}`}>
            <div className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${estadoVisual === 'concluida' ? 'bg-emerald-500' : estadoVisual === 'falha' ? 'bg-red-500' : 'bg-zinc-800'}`}>3</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">3. RESOLUÇÃO FINAL</span>
            </div>
            <span className={`text-xs font-semibold block mt-1.5 ${estadoVisual === 'concluida' ? 'text-emerald-400' : estadoVisual === 'falha' ? 'text-red-400' : 'text-zinc-500'}`}>
              {estadoVisual === 'concluida' ? 'Desafio Cumprido!' : estadoVisual === 'falha' ? 'Corrida Interrompida / Falha' : 'Aguardando Desfecho'}
            </span>
          </div>
        </div>
      </div>

      {/* Histórico de Auditoria de Mensagens e Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Tabela de Logs */}
        <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Histórico de Transições e Pacotes</h2>
              <p className="text-xs text-zinc-500">Auditoria linear de eventos capturados via WebSocket em tempo real</p>
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
                  <th className="py-2.5 font-mono">Horário</th>
                  <th className="py-2.5">Origem</th>
                  <th className="py-2.5">Destino / Sinal</th>
                  <th className="py-2.5">Mensagem do Pacote Abstraído</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {logsFiltrados.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-zinc-500">Aguardando dados telemétricos iniciais do microcontrolador...</td></tr>
                ) : (
                  logsFiltrados.map((transicao, i) => (
                    <tr key={i} className="border-b border-zinc-900/40 hover:bg-zinc-900/20">
                      <td className="py-3 text-zinc-500 font-mono">{transicao.tempo}</td>
                      <td className="py-3 text-zinc-400">{transicao.de}</td>
                      <td className={`py-3 font-medium ${transicao.tipoLog === 'Alerta' ? 'text-amber-500 font-bold' : transicao.para === 'Falha Detectada' ? 'text-red-400 font-bold' : 'text-blue-400'}`}>
                        {transicao.tipoLog === 'Alerta' ? '⚠️ ' : '➔ '} {transicao.para}
                      </td>
                      <td className="py-3 text-zinc-300 font-sans">{transicao.gatilho}</td>
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
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-zinc-400">Tempo de Setup (Config)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono ${setupRecebido ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-zinc-950 text-zinc-600 border border-zinc-800'}`}>
                    {setupRecebido ? 'Recebido' : 'Aguardando'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: setupRecebido ? '100%' : '0%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-zinc-400">Tempo de Exploração</span>
                  <span className="font-mono text-zinc-400 font-semibold">{formatarSegundos(tempoMovimento)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: estadoVisual !== 'configuracao' ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}