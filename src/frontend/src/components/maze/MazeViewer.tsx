import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTelemetria } from "../../hooks/useTelemetria";
import { createMaze, isInsideMaze, markVisited, markWall, normalizePathToOrthogonal, findGoalArea } from "./mazeUtils";
import type { Cell, Direction, Position } from "./types";
import { CriticalAlertModal, type CriticalAlertType } from "../CriticalAlertModal";

const LIMITE_BATERIA_CRITICA = 10;

const obterNumeroValido = (valor?: number | null): number | null => {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }
  return valor;
};

const normalizarStatus = (status?: string | null) => {
  return status?.toLowerCase() || "aguardando";
};

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

const DEFAULT_GRID_SIZE = 8;

const positionsEqual = (a: Position | null | undefined, b: Position | null | undefined) =>
  !!a && !!b && a.row === b.row && a.col === b.col;

type MazeViewerProps = {
  showHeader?: boolean;
  showSidebar?: boolean;
  standalone?: boolean;
  staticMaze?: Cell[][];
  staticPath?: Position[];
  staticGridSize?: number;
  staticGoalPosition?: Position;
};

export default function MazeViewer({ 
  showHeader = true, 
  standalone = false,
  staticMaze,
  staticPath,
  staticGridSize,
  staticGoalPosition
}: MazeViewerProps) {
  const { filaMovimentacoes, limparFilaMovimentacoes, configSessao, indicadores, statusConexao } =
    useTelemetria();
  
  const isStatic = !!staticMaze;

  // Estado principal da corrida e do labirinto.
  const [gridSize, setGridSize] = useState(staticGridSize || DEFAULT_GRID_SIZE);
  const [maze, setMaze] = useState(() => staticMaze || createMaze(DEFAULT_GRID_SIZE));
  const [position, setPosition] = useState<Position>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<Direction>("east");
  const [path, setPath] = useState<Position[]>([]);
  
  const [viewMode, setViewMode] = useState<"live" | "history">(isStatic ? "history" : "live");
  const [history, setHistory] = useState<
    {
      maze: Cell[][];
      path: Position[];
      endPosition: Position;
      endDirection: Direction;
      gridSize: number;
    }[]
  >([]);
  const [historyIndex] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<
    "idle" | "running" | "finished"
  >("idle");
  
  const stepRef = useRef(0);
  const sessionIdRef = useRef<number | null>(null);
  const positionRef = useRef<Position>({ row: 0, col: 0 });
  const mazeRef = useRef<Cell[][]>(maze);
  const pathRef = useRef<Position[]>(path);
  const directionRef = useRef<Direction>(direction);

  const [alertaCritico, setAlertaCritico] = useState<{
    type: CriticalAlertType;
    key: string;
  } | null>(null);

  const bateriaCriticaAbertaRef = useRef(false);
  const paradaInesperadaAbertaRef = useRef(false);

  // Fallbacks seguros para indicadores
  const statusCorrida = normalizarStatus(indicadores?.status_corrida);
  const bateriaAtual = obterNumeroValido(indicadores?.bateria_atual);
  const velocidadeMedia = obterNumeroValido(indicadores?.velocidade_media);
  const tempoDecorridoMs = obterNumeroValido(indicadores?.tempo_decorrido_ms) ?? 0;
  const tempoFinalMs = obterNumeroValido(indicadores?.tempo_final_ms);
  const ultimoTimestampMs = obterNumeroValido(indicadores?.ultimo_timestamp_ms);

  const bateriaCritica = !isStatic && bateriaAtual !== null && bateriaAtual <= LIMITE_BATERIA_CRITICA;
  const paradaInesperada = !isStatic && indicadores?.alerta_possivel_parada_inesperada === true;

  const tempoExibido = useMemo(() => {
    if (isStatic) return 0;
    if (statusCorrida === "concluida" && tempoFinalMs !== null) {
      return tempoFinalMs;
    }
    return tempoDecorridoMs;
  }, [isStatic, statusCorrida, tempoDecorridoMs, tempoFinalMs]);

  const snapshot = viewMode === "history" && !isStatic ? history[historyIndex] : undefined;
  
  // Computação Reativa e Segura dos dados de exibição
  const displayMaze = staticMaze || (snapshot ? snapshot.maze : maze);
  const displayPath = staticPath || (snapshot ? snapshot.path : path);
  const displayPosition = isStatic 
    ? (displayPath && displayPath.length > 0 ? displayPath[displayPath.length - 1] : { row: 0, col: 0 }) 
    : (snapshot ? snapshot.endPosition : position);
  const displayDirection = isStatic ? "east" : (snapshot ? snapshot.endDirection : direction);
  const displayGridSize = staticGridSize || (snapshot ? snapshot.gridSize : gridSize);
  
  const displayGridDimension =
    displayGridSize === 16
      ? "min(72vmin, 640px)"
      : displayGridSize === 8
        ? "min(70vmin, 520px)"
        : "min(60vmin, 360px)";

  // Lógica de Trajeto
  const rawPathPoints = isStatic ? [...(displayPath || [])] : [{ row: 0, col: 0 }, ...(displayPath || [])];
  
  if (!isStatic && rawPathPoints.length > 0 && !positionsEqual(rawPathPoints[rawPathPoints.length - 1], displayPosition)) {
    rawPathPoints.push(displayPosition);
  }

  const pathPoints = normalizePathToOrthogonal(rawPathPoints, displayMaze);
  const pathPointsString = pathPoints
    ?.filter(p => p !== undefined && p !== null)
    .map((point) => `${(point.col ?? 0) + 0.5},${(point.row ?? 0) + 0.5}`)
    .join(" ") || "";

  const goalAreaCells = findGoalArea(displayMaze);

  const cloneMaze = (source: Cell[][]) =>
    source.map((row) =>
      row.map((cell) => ({ ...cell, walls: { ...cell.walls } })),
    );

  const resetRunState = useCallback((size: number) => {
    if (isStatic) return;
    stepRef.current = 0;
    sessionIdRef.current = null;
    setSessionStatus("idle");
    setPosition({ row: 0, col: 0 });
    positionRef.current = { row: 0, col: 0 };
    setDirection("east");
    setPath([]);
    setMaze(createMaze(size));
    setViewMode("live");
  }, [isStatic]);

  useEffect(() => {
    if (isStatic || !bateriaCritica) {
      bateriaCriticaAbertaRef.current = false;
      return;
    }
    if (bateriaCriticaAbertaRef.current) return;
    bateriaCriticaAbertaRef.current = true;
    setAlertaCritico({
      type: "battery",
      key: `battery-${ultimoTimestampMs ?? Date.now()}`,
    });
  }, [isStatic, bateriaCritica, ultimoTimestampMs]);

  useEffect(() => {
    if (isStatic || !paradaInesperada) {
      paradaInesperadaAbertaRef.current = false;
      return;
    }
    if (paradaInesperadaAbertaRef.current) return;
    paradaInesperadaAbertaRef.current = true;
    setAlertaCritico({
      type: "stopped",
      key: `stopped-${ultimoTimestampMs ?? Date.now()}`,
    });
  }, [isStatic, paradaInesperada, ultimoTimestampMs]);

  useEffect(() => {
    mazeRef.current = maze;
    pathRef.current = path;
    directionRef.current = direction;
  }, [maze, path, direction]);

  useEffect(() => {
    if (isStatic || !configSessao?.dimensao) return;
    const dimensao = parseInt(String(configSessao.dimensao), 10);
    if (!Number.isNaN(dimensao) && (dimensao === 4 || dimensao === 8 || dimensao === 16)) {
      if (dimensao !== gridSize) {
        setTimeout(() => {
          resetRunState(dimensao);
          setGridSize(dimensao);
        }, 0);
      }
    }
  }, [isStatic, configSessao?.dimensao, gridSize, resetRunState]);

  useEffect(() => {
    if (isStatic || (filaMovimentacoes || []).length === 0) return;

    let nextMaze = mazeRef.current;
    let nextPath = [...pathRef.current];
    let nextPosition = positionRef.current;
    let nextDirection = directionRef.current;
    let statusChanged = false;

    for (const mov of filaMovimentacoes) {
      if (sessionIdRef.current !== mov.id_corrida) {
        sessionIdRef.current = mov.id_corrida;
        stepRef.current = 0;
        setSessionStatus("idle");
        nextMaze = createMaze(gridSize);
        nextPath = [];
        nextPosition = { row: 0, col: 0 };
        nextDirection = "east";
        setViewMode("live");
      }

      const currentTarget = { 
        row: mov.y, 
        col: mov.x 
      };
      if (!isInsideMaze(currentTarget, gridSize)) continue;

      if (currentTarget.row === nextPosition.row - 1) nextDirection = "north";
      else if (currentTarget.row === nextPosition.row + 1) nextDirection = "south";
      else if (currentTarget.col === nextPosition.col + 1) nextDirection = "east";
      else if (currentTarget.col === nextPosition.col - 1) nextDirection = "west";

      if (mov.paredes.norte) nextMaze = markWall(nextMaze, currentTarget, "north");
      if (mov.paredes.sul) nextMaze = markWall(nextMaze, currentTarget, "south");
      if (mov.paredes.leste) nextMaze = markWall(nextMaze, currentTarget, "east");
      if (mov.paredes.oeste) nextMaze = markWall(nextMaze, currentTarget, "west");

      stepRef.current += 1;
      nextMaze = markVisited(nextMaze, currentTarget, stepRef.current);

      const last = nextPath.length > 0 ? nextPath[nextPath.length - 1] : { row: 0, col: 0 };
      if (!positionsEqual(last, currentTarget)) {
        nextPath.push(currentTarget);
      }

      nextPosition = currentTarget;
      statusChanged = true;
    }

    if (statusChanged) {
      setMaze(nextMaze);
      setPath(nextPath);
      setPosition(nextPosition);
      positionRef.current = nextPosition;
      setDirection(nextDirection);
      setSessionStatus("running");
    }
    limparFilaMovimentacoes();
  }, [isStatic, filaMovimentacoes, gridSize, limparFilaMovimentacoes]);

  useEffect(() => {
    if (isStatic || (statusCorrida !== "concluida" && statusCorrida !== "falha")) return;
    setHistory((prev) => [
      {
        maze: cloneMaze(mazeRef.current),
        path: [...pathRef.current],
        endPosition: positionRef.current,
        endDirection: directionRef.current,
        gridSize,
      },
      ...prev,
    ]);
    setSessionStatus("finished");
  }, [isStatic, statusCorrida, gridSize]);

  const renderMazeGrid = (mazeData: Cell[][], currentPos: Position, trail: Position[], targetPos?: Position) => {
    if (!mazeData || !Array.isArray(mazeData)) return null;
    
    return mazeData.map((row, rowIndex) =>
      Array.isArray(row) && row.map((cell, colIndex) => {
        if (!cell) return null;
        const cellPosition = { row: rowIndex, col: colIndex };
        const isCurrent = positionsEqual(cellPosition, currentPos);
        const isOnPath = trail?.some((step) => positionsEqual(step, cellPosition));
        
        const isGoal = targetPos 
          ? positionsEqual(targetPos, cellPosition)
          : goalAreaCells?.some((goalCell) => positionsEqual(goalCell, cellPosition));
        
        const backgroundColor = isCurrent
          ? "rgb(125 211 252)"
          : isGoal
            ? "rgb(34 197 94)"
            : cell.visited
              ? "rgb(30 41 59)"
              : isOnPath
                ? "rgb(15 23 42)"
                : "rgb(9 9 11)";

        const wallShadows = [
          cell.walls?.north ? `inset 0 2px 0 0 rgb(234 179 8)` : null,
          cell.walls?.south ? `inset 0 -2px 0 0 rgb(234 179 8)` : null,
          cell.walls?.east ? `inset -2px 0 0 0 rgb(234 179 8)` : null,
          cell.walls?.west ? `inset 2px 0 0 0 rgb(234 179 8)` : null,
        ].filter(Boolean).join(", ");

        return (
          <div
            key={`${rowIndex}-${colIndex}`}
            className="relative aspect-square border border-zinc-900 z-20"
            style={{ backgroundColor, boxShadow: wallShadows || undefined }}
          />
        );
      })
    );
  };

  if (standalone) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans">
        <CriticalAlertModal
          open={alertaCritico !== null}
          type={alertaCritico?.type}
          soundKey={alertaCritico?.key ?? null}
          onDismiss={() => setAlertaCritico(null)}
          onConfirm={() => setAlertaCritico(null)}
        />
        <header className="mb-6 rounded-3xl border border-yellow-500/20 bg-zinc-900/40 p-6 backdrop-blur-md shadow-lg shadow-yellow-500/5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">⚡</span>
              <div>
                <h1 className="text-2xl font-bold tracking-wider text-yellow-400 uppercase">PIKACHU — Mapeamento</h1>
                <p className="text-xs text-zinc-400 mt-0.5 tracking-wide">Micromouse MM-07 System</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold tracking-wide bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-2.5">
               <div className="flex items-center gap-2">
                 <span className={`h-2.5 w-2.5 rounded-full ${statusConexao === "online" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                 <span className={statusConexao === "online" ? "text-emerald-400" : "text-rose-400"}>{statusConexao || "Offline"}</span>
               </div>
               <div className="h-4 w-px bg-zinc-800" />
               <div className="flex items-center gap-2">
                 <span className="text-zinc-500">Modo:</span>
                 <span className="text-yellow-400 uppercase">{viewMode}</span>
               </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 flex flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-semibold tracking-wide text-yellow-400">Arena / Labirinto</h2>
              <div className="flex gap-2">
                <button onClick={() => resetRunState(gridSize)} className="rounded-xl bg-yellow-400 text-zinc-950 font-bold px-4 py-2 text-xs">Limpar Mapa</button>
              </div>
            </div>

            <div className="flex justify-center items-center py-6 bg-zinc-950/20 rounded-2xl border border-zinc-800/50">
              <div className="relative grid select-none" style={{ gridTemplateColumns: `repeat(${displayGridSize}, minmax(0, 1fr))`, width: displayGridDimension, height: displayGridDimension }}>
                {renderMazeGrid(displayMaze, displayPosition, displayPath, staticGoalPosition)}
                <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${displayGridSize} ${displayGridSize}`}>
                  <polyline points={pathPointsString} fill="none" stroke="#a855f7" strokeWidth="0.04" strokeLinecap="round" strokeLinejoin="round" className="opacity-75" />
                </svg>
                <img
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                  alt="Pikachu"
                  className="pointer-events-none absolute z-30 object-contain"
                  style={{
                    width: `${120 / displayGridSize}%`,
                    height: `${120 / displayGridSize}%`,
                    left: `${((displayPosition.col + 0.5) / displayGridSize) * 100}%`,
                    top: `${((displayPosition.row + 0.5) / displayGridSize) * 100}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                />
              </div>
            </div>

            <footer className="mt-2 pt-4 border-t border-zinc-800 flex flex-wrap gap-x-6 gap-y-3 justify-center text-xs font-semibold tracking-wide text-zinc-400">
              <span className="text-zinc-500 uppercase mr-1">Legenda:</span>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-[rgb(30,41,59)] border border-zinc-700" />
                <span>Visitada</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-[rgb(34,197,94)] border border-green-500" />
                <span>Mapeada (Objetivo 2x2)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-transparent border border-zinc-800 shadow-[inset_0_2px_0_0_rgb(234,179,8)]" />
                <span>Parede Detectada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-3 bg-[#a855f7] rounded-full" />
                <span>Rastro</span>
              </div>
              <div className="flex items-center gap-2">
                <img
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                  alt="Pikachu Icon"
                  className="h-5 w-5 object-contain"
                />
                <span>Pikachu (Atual)</span>
              </div>
            </footer>
          </div>

          <div className="w-full lg:w-96 flex flex-col gap-6">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md shadow-lg flex-1">
              <h2 className="text-lg font-semibold tracking-wide text-yellow-400 border-b border-zinc-800 pb-4">
                Telemetria
              </h2>

              <div className="mt-6 space-y-6">
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">🎯</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Posição Atual</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-white font-mono">({displayPosition.col}, {displayPosition.row})</p>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">🧭</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Direção</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-white uppercase">
                    {displayDirection === "north" ? "Norte (↑)" : displayDirection === "south" ? "Sul (↓)" : displayDirection === "east" ? "Leste (→)" : "Oeste (←)"}
                  </p>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">⚡</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nível de Bateria</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white font-mono">{bateriaAtual !== null ? `${bateriaAtual.toFixed(1)}%` : "--%"}</span>
                    {bateriaCritica && <span className="text-xs text-rose-400 font-bold animate-pulse">[CRÍTICA]</span>}
                  </div>
                  <div className="mt-3 w-full bg-zinc-800 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${bateriaCritica ? "bg-rose-500" : bateriaAtual !== null && bateriaAtual <= 50 ? "bg-yellow-500" : "bg-emerald-500"}`} style={{ width: `${bateriaAtual ?? 0}%` }} />
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">⏱️</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tempo Decorrido</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-white font-mono">{formatarTempo(tempoExibido)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500 leading-none">{sessionStatus === "finished" ? "Tempo fixado de corrida concluída" : "Atualizado em tempo real"}</p>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">📈</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Velocidade Média</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-white font-mono">{velocidadeMedia !== null ? `${velocidadeMedia.toFixed(2)} cm/s` : "-- cm/s"}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm text-zinc-100">
      {showHeader && (
        <header className="flex flex-col gap-4 border-b border-zinc-805 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Labirinto</p>
            <h2 className="text-xl font-bold text-yellow-400">{isStatic ? "Visualização Estática" : "Mapa em Tempo Real"}</h2>
          </div>
        </header>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3">
            <div className="relative grid mx-auto" style={{ gridTemplateColumns: `repeat(${displayGridSize}, minmax(0, 1fr))`, width: displayGridDimension, height: displayGridDimension }}>
              {renderMazeGrid(displayMaze, displayPosition, displayPath, staticGoalPosition)}
              <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox={`0 0 ${displayGridSize} ${displayGridSize}`}>
                <polyline points={pathPointsString} fill="none" stroke="#a855f7" strokeWidth="0.04" strokeLinecap="round" strokeLinejoin="round" className="opacity-75" />
              </svg>
              <img
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                alt="Pikachu"
                className="pointer-events-none absolute z-30 object-contain"
                style={{
                  width: `${120 / displayGridSize}%`,
                  height: `${120 / displayGridSize}%`,
                  left: `${((displayPosition.col + 0.5) / displayGridSize) * 100}%`,
                  top: `${((displayPosition.row + 0.5) / displayGridSize) * 100}%`,
                  transform: "translate(-50%, -50%)"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
