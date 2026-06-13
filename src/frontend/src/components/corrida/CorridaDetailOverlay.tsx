import React, { useEffect, useState } from "react";
import { X, Clock, Zap, Gauge, MapPin, Target, ChevronRight, Activity } from "lucide-react";
import { obterCorrida } from "../../services/corrida";
import type { CorridaDetailResponse } from "../../types/corrida";
import MazeViewer from "../maze/MazeViewer";
import type { Cell, Position } from "../maze/types";

interface CorridaDetailOverlayProps {
  idCorrida: number;
  onClose: () => void;
}

export const CorridaDetailOverlay: React.FC<CorridaDetailOverlayProps> = ({
  idCorrida,
  onClose,
}) => {
  const [corrida, setCorrida] = useState<CorridaDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const data = await obterCorrida(idCorrida);
        setCorrida(data);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar detalhes.");
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [idCorrida]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-800 border-t-yellow-400 mx-auto mb-6" />
          <p className="text-zinc-400 font-bold tracking-widest animate-pulse uppercase text-xs">
            Sincronizando dados da corrida...
          </p>
        </div>
      </div>
    );
  }

  if (erro || !corrida) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center shadow-2xl">
          <div className="h-20 w-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <Target size={40} className="text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Falha na Requisição</h2>
          <p className="text-zinc-400 mb-8">{erro || "Os dados desta corrida não foram encontrados no servidor."}</p>
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-zinc-800 px-4 py-4 font-bold text-zinc-100 hover:bg-zinc-700 transition active:scale-95"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    );
  }

  // Lógica de Mascaramento Baseada em Coordenadas (Mais Robusta)
  const percursoList = corrida.percurso || [];
  const gridSize = corrida.tipo_labirinto ? parseInt(corrida.tipo_labirinto.split("X")[0]) : 8;
  
  // Criar um Set de coordenadas visitadas no formato "x,y"
  const visitedCoords = new Set<string>();
  const coordToStep = new Map<string, number>();
  const pathPositions: Position[] = [];
  
  // Mapear direções abertas por célula para criar o efeito de corredor
  const openDirections = new Map<string, Set<string>>();

  percursoList.forEach((p, index) => {
    const cell = corrida.celulas?.find(c => c.id_celula === p.id_celula);
    if (cell) {
      const key = `${cell.coordenada_x},${cell.coordenada_y}`;
      visitedCoords.add(key);
      if (!coordToStep.has(key)) {
        coordToStep.set(key, index + 1);
      }
      
      const currentPos = { row: cell.coordenada_y, col: cell.coordenada_x };
      pathPositions.push(currentPos);
      
      if (!openDirections.has(key)) openDirections.set(key, new Set());
      
      // Conectar com a célula anterior no percurso
      if (index > 0) {
        const prevP = percursoList[index - 1];
        const prevCell = corrida.celulas?.find(c => c.id_celula === prevP.id_celula);
        if (prevCell) {
          const prevKey = `${prevCell.coordenada_x},${prevCell.coordenada_y}`;
          if (!openDirections.has(prevKey)) openDirections.set(prevKey, new Set());
          
          if (prevCell.coordenada_x < cell.coordenada_x) {
            openDirections.get(key)!.add("west");
            openDirections.get(prevKey)!.add("east");
          } else if (prevCell.coordenada_x > cell.coordenada_x) {
            openDirections.get(key)!.add("east");
            openDirections.get(prevKey)!.add("west");
          } else if (prevCell.coordenada_y < cell.coordenada_y) {
            openDirections.get(key)!.add("north");
            openDirections.get(prevKey)!.add("south");
          } else if (prevCell.coordenada_y > cell.coordenada_y) {
            openDirections.get(key)!.add("south");
            openDirections.get(prevKey)!.add("north");
          }
        }
      }
    }
  });

  const staticMaze: Cell[][] = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => {
      const coordKey = `${col},${row}`;

      const isInPercurso = visitedCoords.has(coordKey);
      const step = coordToStep.get(coordKey);
      
      // Verificar se é área de objetivo (central 2x2 ou conforme detectado)
      // Usamos a lógica de mazeUtils se possível, mas aqui fazemos uma checagem simples
      // Micromouse oficial center é (gridSize/2-1, gridSize/2-1) até (gridSize/2, gridSize/2)
      const isGoal = (
        row >= Math.floor(gridSize / 2) - 1 && 
        row <= Math.ceil(gridSize / 2) && 
        col >= Math.floor(gridSize / 2) - 1 && 
        col <= Math.ceil(gridSize / 2)
      );

      const openSet = openDirections.get(coordKey) || new Set();

      const walls = {
        north: isInPercurso && !isGoal && !openSet.has("north"),
        south: isInPercurso && !isGoal && !openSet.has("south"),
        east: isInPercurso && !isGoal && !openSet.has("east"),
        west: isInPercurso && !isGoal && !openSet.has("west"),
      };

      return {
        visited: isInPercurso,
        walls,
        historyStep: step || null,
      };
    })
  );

  const formatarTempo = (ms: number | null) => {
    if (ms === null) return "--:--.---";
    const min = Math.floor(ms / 60000);
    const seg = Math.floor((ms % 60000) / 1000);
    const msec = Math.floor(ms % 1000);
    return `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}.${msec.toString().padStart(3, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden animate-in fade-in zoom-in duration-300">
      {/* Header Estilizado */}
      <header className="flex h-20 items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-8 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="group rounded-2xl bg-zinc-800 p-3 hover:bg-zinc-700 text-zinc-400 hover:text-white transition active:scale-90"
            title="Fechar Detalhes"
          >
            <X size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black tracking-tighter uppercase">Corrida #{corrida.id_corrida}</h2>
              <div className={`rounded-md px-2 py-0.5 text-[10px] font-black border ${
                corrida.status_corrida === "CONCLUIDA" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-rose-500/30 text-rose-400 bg-rose-500/10"
              }`}>
                {corrida.status_corrida}
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {corrida.tipo_labirinto} • {new Date(corrida.data_hora_inicio || "").toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 pr-4">
           <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Tempo Total</p>
              <p className="text-xl font-black font-mono text-yellow-400">{formatarTempo(corrida.tempo_total)}</p>
           </div>
           <div className="h-10 w-px bg-zinc-800" />
           <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Status do Desafio</p>
              <p className={`text-sm font-black uppercase ${corrida.desafio_cumprido ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {corrida.desafio_cumprido ? 'Sucesso' : 'Incompleto'}
              </p>
           </div>
        </div>
      </header>

      {/* Grid Principal */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Painel Lateral de Métricas */}
        <aside className="w-full lg:w-80 border-r border-zinc-800 bg-zinc-950 p-8 overflow-y-auto shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-8 flex items-center gap-2">
            <Activity size={14} className="text-yellow-400" />
            Performance Analítica
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            <MetricCard 
              icon={<Clock size={20} className="text-blue-400" />} 
              label="Duração Total" 
              value={formatarTempo(corrida.tempo_total)} 
            />
            <MetricCard 
              icon={<Gauge size={20} className="text-emerald-400" />} 
              label="Velocidade Média" 
              value={corrida.velocidade_media ? `${corrida.velocidade_media.toFixed(2)} m/s` : "--"}
            />
             <MetricCard 
              icon={<Zap size={20} className="text-amber-400" />} 
              label="Tensão Nominal" 
              value={corrida.tensao_media ? `${corrida.tensao_media.toFixed(2)} V` : "--"} 
            />
            <MetricCard 
              icon={<MapPin size={20} className="text-purple-400" />} 
              label="Células Mapeadas" 
              value={`${visitedCoords.size}`} 
            />
          </div>

          <div className="mt-10">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-6 flex items-center gap-2">
                <ChevronRight size={14} className="text-purple-400" />
                Histórico de Passagem
             </h4>
             <div className="space-y-2">
                {percursoList.slice(-6).reverse().map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-[10px]">
                    <span className="font-bold text-zinc-400 uppercase">{p.tipo_percurso}</span>
                    <span className="font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">ID CEL {p.id_celula}</span>
                  </div>
                ))}
             </div>
          </div>
        </aside>

        {/* Visualização do Labirinto - Otimizada para Caber na Tela */}
        <main className="flex-1 bg-zinc-900/20 relative flex flex-col items-center p-4 lg:p-12 overflow-auto custom-scrollbar">
          <div className="absolute top-6 left-6 z-10 hidden sm:block">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2 backdrop-blur-md flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
               <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter leading-none">Renderização de Rota</p>
                  <p className="text-xs font-bold text-zinc-200">HISTÓRICO ATIVO</p>
               </div>
            </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center min-h-[400px]">
            <div className="transform scale-90 sm:scale-100 transition-transform origin-center">
              <MazeViewer 
                showHeader={false} 
                showSidebar={false} 
                staticMaze={staticMaze} 
                staticPath={pathPositions} 
                staticGridSize={gridSize} 
              />
            </div>
          </div>

          <div className="mt-8 mb-4 flex flex-wrap items-center justify-center gap-6 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] shrink-0">
             <div className="flex items-center gap-2">
                <div className="h-1 w-4 bg-[#a855f7] rounded-full" />
                <span>Trajeto Percorrido</span>
             </div>
             <div className="flex items-center gap-2 text-zinc-300">
                <span className="font-mono bg-zinc-800 px-1 rounded">#N</span>
                <span>Sequência de Exploração</span>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 group">
    <div className="flex items-center gap-4 mb-3">
      <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
    </div>
    <div className="text-2xl font-black text-zinc-100 font-mono tracking-tighter">{value}</div>
  </div>
);
