import React, { useEffect, useState } from "react";
import { X, Clock, Gauge, MapPin, Target, ChevronRight, Activity } from "lucide-react";
import { obterCorrida } from "../../services/corrida";
import type { CorridaDetailResponse, CelulaResponse } from "../../types/corrida";
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

  // Fallbacks seguros para campos da corrida
  const percursoList = corrida.percurso || [];
  const celulasList = corrida.celulas || [];
  const gridSize = corrida.tipo_labirinto ? (parseInt(corrida.tipo_labirinto.split("X")[0]) || 8) : 8;

  // 1. Filtrar percurso: Priorizar Rota Otimizada (Tipo 2)
  const rotaOtimizada = percursoList.filter(p => p.tipo_percurso === "otimizado");
  const temRotaOtimizada = rotaOtimizada.length > 0;
  
  // Garantir ordenação sequencial estrita para evitar diagonais e pulos
  const percursoParaExibir = temRotaOtimizada 
    ? [...rotaOtimizada].sort((a, b) => (a.id_percurso || 0) - (b.id_percurso || 0))
    : percursoList;

  // Mapeamento de células e trajeto
  const cellsInRouteMap = new Map<string, CelulaResponse>();
  const pathPositions: Position[] = [];

  percursoParaExibir.forEach((p) => {
    const cell = celulasList.find(c => c.id_celula === p.id_celula);
    if (cell) {
      const x = cell.coordenada_x;
      const y = cell.coordenada_y;
      
      const row = y;
      const col = x;
      const key = `${col},${row}`;
      
      cellsInRouteMap.set(key, cell);
      pathPositions.push({ row, col });
    }
  });

  // 2. Objetivo Preciso: Ponto final da rota (1x1)
  const ultimoPasso = percursoParaExibir.length > 0 ? percursoParaExibir[percursoParaExibir.length - 1] : null;
  const ultimaCelulaData = ultimoPasso ? celulasList.find(c => c.id_celula === ultimoPasso.id_celula) : null;
  const staticGoalPosition: Position | undefined = ultimaCelulaData 
    ? { row: ultimaCelulaData.coordenada_y, col: ultimaCelulaData.coordenada_x }
    : undefined;

  // 3. Reconstrução do Labirinto focada na Rota (Lógica de Corredor)
  const staticMaze: Cell[][] = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => {
      const coordKey = `${col},${row}`;
      const isInRoute = cellsInRouteMap.has(coordKey);

      if (!isInRoute) {
        return {
          visited: false,
          walls: { north: false, south: false, east: false, west: false },
          historyStep: null,
        };
      }

      // Lógica de Corredor: Identificar onde o caminho entra e sai desta célula
      const allowed = { north: false, south: false, east: false, west: false };
      
      for (let i = 0; i < pathPositions.length; i++) {
        const curr = pathPositions[i];
        if (curr.row === row && curr.col === col) {
          // Conexão com o anterior
          if (i > 0) {
            const prev = pathPositions[i - 1];
            if (prev.row === row - 1 && prev.col === col) allowed.north = true;
            if (prev.row === row + 1 && prev.col === col) allowed.south = true;
            if (prev.row === row && prev.col === col + 1) allowed.east = true;
            if (prev.row === row && prev.col === col - 1) allowed.west = true;
          }
          // Conexão com o próximo
          if (i < pathPositions.length - 1) {
            const next = pathPositions[i + 1];
            if (next.row === row - 1 && next.col === col) allowed.north = true;
            if (next.row === row + 1 && next.col === col) allowed.south = true;
            if (next.row === row && next.col === col + 1) allowed.east = true;
            if (next.row === row && next.col === col - 1) allowed.west = true;
          }
        }
      }

      // Adiciona parede em todas as direções pela qual a rota NÃO passa
      return {
        visited: true,
        walls: {
          north: !allowed.north,
          south: !allowed.south,
          east: !allowed.east,
          west: !allowed.west,
        },
        historyStep: null,
      };
    })
  );

  const formatarTempo = (ms: number | null) => {
    if (ms === null || ms === undefined) return "--:--.---";
    const min = Math.floor(ms / 60000);
    const seg = Math.floor((ms % 60000) / 1000);
    const msec = Math.floor(ms % 1000);
    return `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}.${msec.toString().padStart(3, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden animate-in fade-in zoom-in duration-300">
      <header className="flex h-20 items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-8 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="group rounded-2xl bg-zinc-800 p-3 hover:bg-zinc-700 text-zinc-400 transition">
            <X size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black tracking-tighter uppercase">Corrida #{corrida.id_corrida}</h2>
              <div className="rounded-md px-2 py-0.5 text-[10px] font-black border border-zinc-800 bg-zinc-800/50">
                {corrida.status_corrida}
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              {corrida.tipo_labirinto || "Tamanho Desconhecido"}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 pr-4">
           <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Tempo Total</p>
              <p className="text-xl font-black font-mono text-yellow-400">{formatarTempo(corrida.tempo_total)}</p>
           </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-80 border-r border-zinc-800 bg-zinc-950 p-8 overflow-y-auto shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-8 flex items-center gap-2">
            <Activity size={14} className="text-yellow-400" /> Performance Analítica
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <MetricCard icon={<Clock size={20} className="text-blue-400" />} label="Duração" value={formatarTempo(corrida.tempo_total)} />  
            <MetricCard icon={<Gauge size={20} className="text-emerald-400" />} label="Velocidade" value={corrida.velocidade_media ? `${corrida.velocidade_media.toFixed(2)} cm/s` : "--"} />
            <MetricCard icon={<MapPin size={20} className="text-purple-400" />} label="Células na Rota" value={`${cellsInRouteMap.size}`} />   
          </div>
          <div className="mt-10">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-6 flex items-center gap-2">
                <ChevronRight size={14} className="text-purple-400" /> Trajeto (X, Y)
             </h4>
             <div className="space-y-2">
                {percursoParaExibir.slice(-8).reverse().map((p, i) => {
                  const cell = celulasList.find(c => c.id_celula === p.id_celula);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-[10px]">
                      <span className="font-bold text-zinc-400 uppercase">{p.tipo_percurso}</span>
                      <span className="font-mono text-zinc-200 bg-zinc-950 px-2 py-0.5 rounded">
                        {cell ? `(${cell.coordenada_x}, ${cell.coordenada_y})` : '??'}
                      </span>
                    </div>
                  );
                })}
             </div>
          </div>
        </aside>

        <main className="flex-1 bg-zinc-900/20 relative flex flex-col items-center p-4 lg:p-12 pb-32 overflow-auto custom-scrollbar">       
          <div className="absolute top-6 left-6 z-10 hidden sm:block">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2 backdrop-blur-md flex items-center gap-3">
               <div className={`h-2 w-2 rounded-full ${temRotaOtimizada ? 'bg-emerald-500' : 'bg-purple-500'} animate-pulse`} />
               <p className="text-xs font-bold text-zinc-200">{temRotaOtimizada ? 'ROTA OTIMIZADA' : 'EXPLORAÇÃO'}</p>
            </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center min-h-[400px]">
             <div className="relative border border-zinc-800 bg-zinc-950 p-2 rounded-xl shadow-2xl">
                <div 
                  className="grid select-none gap-0" 
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    width: 'min(70vmin, 520px)',
                    height: 'min(70vmin, 520px)'
                  }}
                >
                  {staticMaze.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      const x = colIndex;
                      const y = rowIndex;
                      const coordKey = `${x},${y}`;
                      const isInRoute = cellsInRouteMap.has(coordKey);

                      const wallShadows = isInRoute ? [
                        cell.walls.north ? `inset 0 2px 0 0 rgb(234 179 8)` : null,
                        cell.walls.south ? `inset 0 -2px 0 0 rgb(234 179 8)` : null,
                        cell.walls.east ? `inset -2px 0 0 0 rgb(234 179 8)` : null,
                        cell.walls.west ? `inset 2px 0 0 0 rgb(234 179 8)` : null,
                      ].filter(Boolean).join(", ") : undefined;

                      const isCurrent = pathPositions.length > 0 && 
                                       pathPositions[pathPositions.length - 1].row === y && 
                                       pathPositions[pathPositions.length - 1].col === x;
                      const isGoal = staticGoalPosition && 
                                    staticGoalPosition.row === y && 
                                    staticGoalPosition.col === x;

                      const backgroundColor = isCurrent ? "rgb(125 211 252)" : 
                                             isGoal ? "rgb(34 197 94)" : 
                                             isInRoute ? "rgb(30 41 59)" : "rgb(9 9 11)";

                      return (
                        <div
                          key={coordKey}
                          className="relative aspect-square border border-zinc-900/50 z-20"
                          style={{ backgroundColor, boxShadow: wallShadows || undefined }}
                        />
                      );
                    })
                  )}

                  <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${gridSize} ${gridSize}`}>
                    <polyline 
                      points={pathPositions.map(p => `${p.col + 0.5},${p.row + 0.5}`).join(" ")} 
                      fill="none" 
                      stroke="#a855f7" 
                      strokeWidth="0.04" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="opacity-75" 
                    />
                  </svg>

                  {pathPositions.length > 0 && (
                    <img
                      src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                      alt="Pikachu"
                      className="pointer-events-none absolute z-30 object-contain"
                      style={{
                        width: `${120 / gridSize}%`,
                        height: `${120 / gridSize}%`,
                        left: `${((pathPositions[pathPositions.length - 1].col + 0.5) / gridSize) * 100}%`,
                        top: `${((pathPositions[pathPositions.length - 1].row + 0.5) / gridSize) * 100}%`,
                        transform: "translate(-50%, -50%)"
                      }}
                    />
                  )}
                </div>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 group">
    <div className="flex items-center gap-4 mb-3">
      <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">{icon}</div>
      <p className="text-[9px] font-black uppercase text-zinc-500">{label}</p>
    </div>
    <div className="text-2xl font-black text-zinc-100 font-mono tracking-tighter">{value}</div>
  </div>
);
