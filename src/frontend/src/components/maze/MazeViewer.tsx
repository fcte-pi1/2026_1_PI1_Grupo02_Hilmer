import { useEffect, useRef, useState, useMemo } from "react";
import { useTelemetria } from "../../hooks/useTelemetria";
import { createMaze, isInsideMaze, markVisited, markWall, normalizePathToOrthogonal, hasWallBetween, findGoalArea } from "./mazeUtils";
import type { Cell, Direction, Position } from "./types";
import { CriticalAlertModal, type CriticalAlertType } from "../CriticalAlertModal";

const LIMITE_BATERIA_CRITICA = 10;
const LIMITE_SEM_TELEMETRIA_MS = 3000;

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


const positionsEqual = (a: Position, b: Position) =>
  a.row === b.row && a.col === b.col;

type MazeViewerProps = {
  showHeader?: boolean;
  showSidebar?: boolean;
  standalone?: boolean;
};

export default function MazeViewer({ showHeader = true, showSidebar = true, standalone = false }: MazeViewerProps) {
  const { filaMovimentacoes, limparFilaMovimentacoes, configSessao, indicadores, statusConexao } =
    useTelemetria();
  // Estado principal da corrida e do labirinto.
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [maze, setMaze] = useState(() => createMaze(DEFAULT_GRID_SIZE));
  const [position, setPosition] = useState<Position>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<Direction>("east");
  const [path, setPath] = useState<Position[]>([]);
  const [viewMode, setViewMode] = useState<"live" | "history">("live");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<
    {
      maze: Cell[][];
      path: Position[];
      endPosition: Position;
      endDirection: Direction;
      gridSize: number;
    }[]
  >([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<
    "idle" | "running" | "finished"
  >("idle");
  const stepRef = useRef(0);
  const sessionIdRef = useRef<number | null>(null);
  // Mantem posicao atual sem depender do fechamento do useEffect.
  const positionRef = useRef<Position>({ row: 0, col: 0 });
  const mazeRef = useRef<Cell[][]>(maze);
  const pathRef = useRef<Position[]>(path);
  const directionRef = useRef<Direction>(direction);

  const [alertaSemSinal, setAlertaSemSinal] = useState(false);
  const [alertaCritico, setAlertaCritico] = useState<{
    type: CriticalAlertType;
    key: string;
  } | null>(null);

  const bateriaCriticaAbertaRef = useRef(false);
  const paradaInesperadaAbertaRef = useRef(false);

  const statusCorrida = normalizarStatus(indicadores?.status_corrida);
  const bateriaAtual = obterNumeroValido(indicadores?.bateria_atual);
  const velocidadeMedia = obterNumeroValido(indicadores?.velocidade_media);
  const tempoDecorridoMs = obterNumeroValido(indicadores?.tempo_decorrido_ms) ?? 0;
  const tempoFinalMs = obterNumeroValido(indicadores?.tempo_final_ms);
  const ultimoTimestampMs = obterNumeroValido(indicadores?.ultimo_timestamp_ms);

  const bateriaCritica = bateriaAtual !== null && bateriaAtual <= LIMITE_BATERIA_CRITICA;
  const paradaInesperada = indicadores?.alerta_possivel_parada_inesperada === true;

  const tempoExibido = useMemo(() => {
    if (statusCorrida === "concluida" && tempoFinalMs !== null) {
      return tempoFinalMs;
    }
    return tempoDecorridoMs;
  }, [statusCorrida, tempoDecorridoMs, tempoFinalMs]);

  useEffect(() => {
    let timer: number | undefined;

    if (indicadores && statusCorrida === "em_andamento") {
      setAlertaSemSinal(false);
      timer = window.setTimeout(() => {
        setAlertaSemSinal(true);
      }, LIMITE_SEM_TELEMETRIA_MS);
    } else {
      setAlertaSemSinal(false);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [indicadores, statusCorrida, ultimoTimestampMs]);

  useEffect(() => {
    if (!bateriaCritica) {
      bateriaCriticaAbertaRef.current = false;
      return;
    }

    if (bateriaCriticaAbertaRef.current) {
      return;
    }

    bateriaCriticaAbertaRef.current = true;
    setAlertaCritico({
      type: "battery",
      key: `battery-${ultimoTimestampMs ?? Date.now()}`,
    });
  }, [bateriaCritica, ultimoTimestampMs]);

  useEffect(() => {
    if (!paradaInesperada) {
      paradaInesperadaAbertaRef.current = false;
      return;
    }

    if (paradaInesperadaAbertaRef.current) {
      return;
    }

    paradaInesperadaAbertaRef.current = true;
    setAlertaCritico({
      type: "stopped",
      key: `stopped-${ultimoTimestampMs ?? Date.now()}`,
    });
  }, [paradaInesperada, ultimoTimestampMs]);

  const snapshot = viewMode === "history" ? history[historyIndex] : undefined;
  const displayMaze = snapshot ? snapshot.maze : maze;
  const displayPath = snapshot ? snapshot.path : path;
  const displayPosition = snapshot ? snapshot.endPosition : position;
  const displayDirection = snapshot ? snapshot.endDirection : direction;
  const displayGridSize = snapshot ? snapshot.gridSize : gridSize;
  const displayGridDimension =
    displayGridSize === 16
      ? "min(72vmin, 640px)"
      : displayGridSize === 8
        ? "min(70vmin, 520px)"
        : "min(60vmin, 360px)";
  const origin = { row: 0, col: 0 };
  const rawPathPoints = [origin, ...displayPath];
  if (!positionsEqual(rawPathPoints[rawPathPoints.length - 1], displayPosition)) {
    rawPathPoints.push(displayPosition);
  }
  // Normaliza o trajeto para evitar linhas diagonais entre células.
  const pathPoints = normalizePathToOrthogonal(rawPathPoints, displayMaze);
  const pathPointsString = pathPoints
    .map((point) => `${point.col + 0.5},${point.row + 0.5}`)
    .join(" ");

  const goalAreaCells = findGoalArea(displayMaze);

  const cloneMaze = (source: Cell[][]) =>
    source.map((row) =>
      row.map((cell) => ({ ...cell, walls: { ...cell.walls } })),
    );

  const resetRunState = (size: number) => {
    stepRef.current = 0;
    sessionIdRef.current = null;
    setSessionStatus("idle");
    setPosition({ row: 0, col: 0 });
    positionRef.current = { row: 0, col: 0 };
    setDirection("east");
    setPath([]);
    setMaze(createMaze(size));
    setViewMode("live");
    setIsHistoryOpen(false);
  };


  const startSession = () => {
    resetRunState(gridSize);
  };

  const openHistory = () => {
    if (history.length === 0) {
      return;
    }
    setSessionStatus("finished");
    setViewMode("history");
    setHistoryIndex(0);
    setIsHistoryOpen(true);
  };

  const selectHistory = (index: number) => {
    setHistoryIndex(index);
    setViewMode("history");
    setIsHistoryOpen(false);
  };

  useEffect(() => {
    mazeRef.current = maze;
  }, [maze]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    if (!configSessao?.dimensao) return;
    const dimensao = parseInt(String(configSessao.dimensao), 10);
    if (
      !Number.isNaN(dimensao) &&
      (dimensao === 4 || dimensao === 8 || dimensao === 16)
    ) {
      if (dimensao !== gridSize) {
        resetRunState(dimensao);
        setGridSize(dimensao);
      }
    }
  }, [configSessao?.dimensao, gridSize]);

  useEffect(() => {
    if (filaMovimentacoes.length === 0) {
      return;
    }

    let nextMaze = mazeRef.current;
    let nextPath = [...pathRef.current];
    let nextPosition = positionRef.current;
    let nextDirection = directionRef.current;
    let statusChanged = false;

    for (const mov of filaMovimentacoes) {
      if (sessionIdRef.current !== mov.id_corrida) {
        sessionIdRef.current = mov.id_corrida;
        // Reinicia variaveis locais (equivalente ao resetRunState, para não agendar varios renders)
        stepRef.current = 0;
        setSessionStatus("idle");
        nextMaze = createMaze(gridSize);
        nextPath = [];
        nextPosition = { row: 0, col: 0 };
        nextDirection = "east";
        setViewMode("live");
        setIsHistoryOpen(false);
      }

      const currentTarget = {
        row: mov.y,
        col: mov.x,
      };

      if (!isInsideMaze(currentTarget, gridSize)) {
        continue;
      }

      if (currentTarget.row === nextPosition.row - 1) {
        nextDirection = "north";
      } else if (currentTarget.row === nextPosition.row + 1) {
        nextDirection = "south";
      } else if (currentTarget.col === nextPosition.col + 1) {
        nextDirection = "east";
      } else if (currentTarget.col === nextPosition.col - 1) {
        nextDirection = "west";
      }

      if (mov.paredes.norte) nextMaze = markWall(nextMaze, currentTarget, "north");
      if (mov.paredes.sul) nextMaze = markWall(nextMaze, currentTarget, "south");
      if (mov.paredes.leste) nextMaze = markWall(nextMaze, currentTarget, "east");
      if (mov.paredes.oeste) nextMaze = markWall(nextMaze, currentTarget, "west");

      stepRef.current += 1;
      nextMaze = markVisited(nextMaze, currentTarget, stepRef.current);

      const last = nextPath.length > 0 ? nextPath[nextPath.length - 1] : { row: 0, col: 0 };
      if (!positionsEqual(last, currentTarget)) {
        const dx = Math.abs(currentTarget.col - last.col);
        const dy = Math.abs(currentTarget.row - last.row);

        if (dx + dy === 1) {
          if (!hasWallBetween(nextMaze, last, currentTarget)) {
            nextPath.push(currentTarget);
          } else {
            console.warn("Movimento ignorado: parede bloqueando caminho", last, currentTarget);
          }
        } else {
          const p1 = { row: last.row, col: currentTarget.col };
          const p2 = { row: currentTarget.row, col: last.col };

          const p1Valid = !hasWallBetween(nextMaze, last, p1) && !hasWallBetween(nextMaze, p1, currentTarget);
          const p2Valid = !hasWallBetween(nextMaze, last, p2) && !hasWallBetween(nextMaze, p2, currentTarget);

          if (p1Valid) {
            nextPath.push(p1, currentTarget);
          } else if (p2Valid) {
            nextPath.push(p2, currentTarget);
          } else {
            console.warn("Movimento diagonal inválido: bloqueado por paredes", last, currentTarget);
          }
        }
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
  }, [filaMovimentacoes, gridSize, limparFilaMovimentacoes]);

  useEffect(() => {
    if (
      indicadores.status_corrida !== "concluida" &&
      indicadores.status_corrida !== "falha"
    ) {
      return;
    }

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
    setHistoryIndex(0);
    setSessionStatus("finished");
  }, [indicadores.status_corrida, gridSize]);

  if (standalone) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans">
        {/* Modals & Alerts */}
        <CriticalAlertModal
          open={alertaCritico !== null}
          type={alertaCritico?.type}
          soundKey={alertaCritico?.key ?? null}
          onDismiss={() => setAlertaCritico(null)}
          onConfirm={() => setAlertaCritico(null)}
        />

        {/* Top Header Block */}
        <header className="mb-6 rounded-3xl border border-yellow-500/20 bg-zinc-900/40 p-6 backdrop-blur-md shadow-lg shadow-yellow-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">⚡</span>
              <div>
                <h1 className="text-2xl font-bold tracking-wider text-yellow-400 uppercase">
                  PIKACHU — Mapeamento em Tempo Real
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5 tracking-wide">
                  Micromouse MM-07 Control System
                </p>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold tracking-wide bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Status:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusConexao === "online" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className={statusConexao === "online" ? "text-emerald-400" : "text-rose-400"}>
                    {statusConexao === "online" ? "Online" : statusConexao === "offline" ? "Offline" : "Conectando..."}
                  </span>
                </div>
              </div>

              <div className="h-4 w-px bg-zinc-800" />

              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Modo:</span>
                <span className="text-yellow-400">
                  {viewMode === "history"
                    ? "Histórico"
                    : sessionStatus === "finished"
                      ? "Finalizado"
                      : sessionStatus === "running"
                        ? "Mapeamento"
                        : "Aguardando"}
                </span>
              </div>

              <div className="h-4 w-px bg-zinc-800" />

              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Corrida:</span>
                <span className="text-zinc-300">
                  {indicadores.id_corrida_banco ? `#${indicadores.id_corrida_banco}` : "Atual"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Warning banners */}
        <div className="mb-6 space-y-3">
          {bateriaCritica && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3.5 text-sm font-semibold text-rose-300 flex items-center gap-2 animate-pulse">
              ⚠️ Bateria crítica: nível em {bateriaAtual?.toFixed(1)}% ou menos. Ação imediata necessária.
            </div>
          )}

          {alertaSemSinal && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5 text-sm font-semibold text-amber-300 flex items-center gap-2">
              ⚠️ Ausência de telemetria recente: sem novos pacotes de movimentação há mais de 3 segundos.
            </div>
          )}
        </div>

        {/* Main Grid area */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left Column: Maze & Legend */}
          <div className="flex-1 flex flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-semibold tracking-wide text-yellow-400">
                Arena / Labirinto
              </h2>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startSession}
                  className="rounded-xl bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-zinc-950 font-bold px-4 py-2 text-xs transition duration-155 shadow-md shadow-yellow-500/10 cursor-pointer"
                >
                  Limpar Mapa
                </button>
                <button
                  type="button"
                  onClick={openHistory}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-850 text-zinc-300 hover:text-white px-4 py-2 text-xs transition duration-150 cursor-pointer"
                >
                  Histórico
                </button>


              </div>
            </div>

            {/* Maze Center Wrapper */}
            <div className="flex justify-center items-center py-6 bg-zinc-950/20 rounded-2xl border border-zinc-800/50">
              <div
                className="relative grid select-none"
                style={{
                  gridTemplateColumns: `repeat(${displayGridSize}, minmax(0, 1fr))`,
                  width: displayGridDimension,
                  height: displayGridDimension,
                }}
              >
                {displayMaze.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const cellPosition = { row: rowIndex, col: colIndex };
                    const isCurrent = positionsEqual(
                      cellPosition,
                      displayPosition,
                    );
                    const isOnPath = displayPath.some((step) =>
                      positionsEqual(step, cellPosition),
                    );
                    const isGoal = goalAreaCells.some((goalCell) => 
                      positionsEqual(goalCell, cellPosition)
                    );
                    
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
                      cell.walls.north
                        ? `inset 0 2px 0 0 rgb(234 179 8)`
                        : null,
                      cell.walls.south
                        ? `inset 0 -2px 0 0 rgb(234 179 8)`
                        : null,
                      cell.walls.east
                        ? `inset -2px 0 0 0 rgb(234 179 8)`
                        : null,
                      cell.walls.west
                        ? `inset 2px 0 0 0 rgb(234 179 8)`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    const classes = [
                      "relative aspect-square border border-zinc-850",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`z-20 ${classes}`}
                        style={{
                          backgroundColor,
                          boxShadow: wallShadows || undefined,
                        }}
                      />
                    );
                  }),
                )}
                {/* SVG path points */}
                <svg
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                  viewBox={`0 0 ${displayGridSize} ${displayGridSize}`}
                  aria-hidden="true"
                >
                  <polyline
                    points={pathPointsString}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="0.04"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-75"
                  />
                </svg>
                {/* Pikachu sprite */}
                <img
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                  alt="Pikachu Micromouse"
                  className="pointer-events-none absolute z-30 object-contain"
                  style={{
                    width: `${120 / displayGridSize}%`,
                    height: `${120 / displayGridSize}%`,
                    left: `${((displayPosition.col + 0.5) / displayGridSize) * 100}%`,
                    top: `${((displayPosition.row + 0.5) / displayGridSize) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    filter: "drop-shadow(0px 2px 4px rgba(250,204,21,0.5))"
                  }}
                />
              </div>
            </div>

            {/* Legend Panel */}
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

          {/* Right Column: Telemetry */}
          <div className="w-full lg:w-96 flex flex-col gap-6">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-md shadow-lg flex-1">
              <h2 className="text-lg font-semibold tracking-wide text-yellow-400 border-b border-zinc-800 pb-4">
                Telemetria
              </h2>

              <div className="mt-6 space-y-6">
                {/* Posicao Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">🎯</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Posição Atual
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-white font-mono">
                    ({displayPosition.col}, {displayPosition.row})
                  </p>
                </div>

                {/* Direcao Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">🧭</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Direção
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-white uppercase">
                    {displayDirection === "north"
                      ? "Norte (↑)"
                      : displayDirection === "south"
                        ? "Sul (↓)"
                        : displayDirection === "east"
                          ? "Leste (→)"
                          : "Oeste (←)"}
                  </p>
                </div>

                {/* Bateria Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">⚡</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Nível de Bateria
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                      {bateriaAtual !== null ? `${bateriaAtual.toFixed(1)}%` : "--%"}
                    </span>
                    {bateriaCritica && (
                      <span className="text-xs text-rose-400 font-bold animate-pulse">
                        [CRÍTICA]
                      </span>
                    )}
                  </div>
                  <div className="mt-3 w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        bateriaCritica
                          ? "bg-rose-500"
                          : bateriaAtual !== null && bateriaAtual <= 50
                            ? "bg-yellow-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${bateriaAtual ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Tempo Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">⏱️</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Tempo Decorrido
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-white font-mono">
                    {formatarTempo(tempoExibido)}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-500 leading-none">
                    {sessionStatus === "finished"
                      ? "Tempo fixado de corrida concluída"
                      : "Atualizado em tempo real"}
                  </p>
                </div>

                {/* Velocidade Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                  <span className="absolute right-4 top-4 text-2xl text-zinc-700">📈</span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Velocidade Média
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-white font-mono">
                    {velocidadeMedia !== null ? `${velocidadeMedia.toFixed(2)} cm/s` : "-- cm/s"}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* History Modal */}
        {isHistoryOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-lg font-bold text-yellow-400 uppercase tracking-wide">
                  Histórico de Corridas
                </h2>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="rounded-xl p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {history.map((run, idx) => (
                  <button
                    key={`history-${idx}`}
                    type="button"
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition duration-150 cursor-pointer ${
                      viewMode === "history" && historyIndex === idx
                        ? "border-yellow-400 bg-yellow-400/5 text-white"
                        : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700"
                    }`}
                    onClick={() => selectHistory(idx)}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm">Corrida #{history.length - idx}</p>
                      <p className="text-xs text-zinc-500">
                        Tamanho da grade: {run.gridSize}x{run.gridSize} · {run.path.length} passos
                      </p>
                    </div>
                    <span className="text-xs font-bold text-yellow-400">Ver Trajeto</span>
                  </button>
                ))}
                {history.length === 0 && (
                  <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                    Nenhuma corrida registrada ainda.
                  </p>
                )}
              </div>

              {viewMode === "history" && (
                <button
                  type="button"
                  className="mt-6 w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-bold transition duration-150 cursor-pointer"
                  onClick={() => {
                    setViewMode("live");
                    setIsHistoryOpen(false);
                  }}
                >
                  Voltar para tempo real
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm text-zinc-100">
      {showHeader && (
        <header className="flex flex-col gap-4 border-b border-zinc-805 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Labirinto
            </p>
            <h2 className="text-xl font-bold text-yellow-400">
              Mapa de navegação em tempo real
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-950 px-3 py-2 text-xs font-bold transition duration-150 cursor-pointer"
              onClick={startSession}
            >
              Limpar mapa
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white transition hover:bg-zinc-700 cursor-pointer"
              onClick={openHistory}
            >
              Histórico
            </button>

          </div>
        </header>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3">
            <div
              className="relative grid mx-auto"
              style={{
                gridTemplateColumns: `repeat(${displayGridSize}, minmax(0, 1fr))`,
                width: displayGridDimension,
                height: displayGridDimension,
              }}
            >
              {displayMaze.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const cellPosition = { row: rowIndex, col: colIndex };
                  const isCurrent = positionsEqual(
                    cellPosition,
                    displayPosition,
                  );
                  const isOnPath = displayPath.some((step) =>
                    positionsEqual(step, cellPosition),
                  );
                  const isGoal = goalAreaCells.some((goalCell) => 
                    positionsEqual(goalCell, cellPosition)
                  );
                  
                  const backgroundColor = isCurrent
                    ? "rgb(125 211 252)"
                    : isGoal
                      ? "rgb(34 197 94)" // verde vibrante para destacar do amarelo das paredes
                      : cell.visited
                        ? "rgb(30 41 59)"
                        : isOnPath
                          ? "rgb(15 23 42)"
                          : "rgb(9 9 11)";
                  const wallShadows = [
                    cell.walls.north
                      ? `inset 0 2px 0 0 rgb(234 179 8)`
                      : null,
                    cell.walls.south
                      ? `inset 0 -2px 0 0 rgb(234 179 8)`
                      : null,
                    cell.walls.east
                      ? `inset -2px 0 0 0 rgb(234 179 8)`
                      : null,
                    cell.walls.west
                      ? `inset 2px 0 0 0 rgb(234 179 8)`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  const classes = [
                    "relative aspect-square border border-zinc-900",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`z-20 ${classes}`}
                      style={{
                        backgroundColor,
                        boxShadow: wallShadows || undefined,
                      }}
                    />
                  );
                }),
              )}
              <svg
                className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                viewBox={`0 0 ${displayGridSize} ${displayGridSize}`}
                aria-hidden="true"
              >
                <polyline
                  points={pathPointsString}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="0.04"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-75"
                />
              </svg>
              <img
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                alt="Pikachu Micromouse"
                className="pointer-events-none absolute z-30 object-contain"
                style={{
                  width: `${120 / displayGridSize}%`,
                  height: `${120 / displayGridSize}%`,
                  left: `${((displayPosition.col + 0.5) / displayGridSize) * 100}%`,
                  top: `${((displayPosition.row + 0.5) / displayGridSize) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  filter: "drop-shadow(0px 2px 4px rgba(250,204,21,0.5))"
                }}
              />
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-x-6 gap-y-3 justify-center text-xs font-semibold text-zinc-400">
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
          </div>
        </div>

        {showSidebar && (
          <aside className="w-full lg:w-72">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status da corrida
              </p>
              <div className="mt-3 space-y-2 text-sm text-zinc-400">
                <p className="flex items-center justify-between">
                  <span>Sessao</span>
                  <span className="font-semibold text-zinc-200">
                    {sessionStatus}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Conexao</span>
                  <span className="font-semibold text-zinc-200">
                    {statusConexao}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Posicao</span>
                  <span className="font-semibold text-zinc-200">
                    ({displayPosition.row}, {displayPosition.col})
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Grade</span>
                  <span className="font-semibold text-zinc-200">
                    {displayGridSize}x{displayGridSize}
                  </span>
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-955/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-yellow-400">
                Histórico de Corridas
              </h2>
              <button
                type="button"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:text-white transition hover:bg-zinc-700 cursor-pointer"
                onClick={() => setIsHistoryOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {history.map((run, index) => (
                <button
                  key={`history-${index}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer"
                  onClick={() => selectHistory(index)}
                >
                  <div>
                    <span className="block text-sm font-semibold text-zinc-100">
                      Corrida {index + 1}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {run.gridSize}x{run.gridSize} · {run.path.length} passos
                    </span>
                  </div>
                  <span className="text-lg text-zinc-600">→</span>
                </button>
              ))}
              {history.length === 0 && (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                  Nenhuma corrida registrada ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
