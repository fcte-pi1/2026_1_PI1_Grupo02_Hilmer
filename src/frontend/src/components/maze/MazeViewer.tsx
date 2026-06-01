import { useEffect, useRef, useState } from "react";
import { createMaze, isInsideMaze, markVisited, markWall } from "./mazeUtils";
import type { Cell, Direction, Position } from "./types";
import { WS_TELEMETRIA_URL } from "../../services/telemetria";
import { createMockTelemetry } from "./mockTelemetry";

const DEFAULT_GRID_SIZE = 8;
const USE_MOCK_TELEMETRY = import.meta.env.VITE_USE_MAZE_MOCK === "true";
const MOCK_MAZE_SIZE = (() => {
  const value = Number(import.meta.env.VITE_MAZE_MOCK_SIZE ?? 8);
  return value === 4 || value === 8 || value === 16 ? value : 8;
})();

const positionsEqual = (a: Position, b: Position) =>
  a.row === b.row && a.col === b.col;

export default function MazeViewer() {
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
  // Mantem posicao atual sem depender do fechamento do useEffect.
  const positionRef = useRef<Position>({ row: 0, col: 0 });
  const mazeRef = useRef<Cell[][]>(maze);
  const pathRef = useRef<Position[]>(path);
  const directionRef = useRef<Direction>(direction);
  const gridSizeRef = useRef(gridSize);
  const snapshot = viewMode === "history" ? history[historyIndex] : undefined;
  const displayMaze = snapshot ? snapshot.maze : maze;
  const displayPath = snapshot ? snapshot.path : path;
  const displayPosition = snapshot ? snapshot.endPosition : position;
  const displayGridSize = snapshot ? snapshot.gridSize : gridSize;
  const displayGridDimension =
    displayGridSize === 16
      ? "min(72vmin, 640px)"
      : displayGridSize === 8
        ? "min(70vmin, 520px)"
        : "min(60vmin, 360px)";
  const wallShadowColor = "rgb(9 9 11)";
  const origin = displayPath[0] ?? displayPosition;
  const pathPoints = [origin, ...displayPath];
  if (!positionsEqual(pathPoints[pathPoints.length - 1], displayPosition)) {
    pathPoints.push(displayPosition);
  }
  const pathPointsString = pathPoints
    .map((point) => `${point.col + 0.5},${point.row + 0.5}`)
    .join(" ");

  const cloneMaze = (source: Cell[][]) =>
    source.map((row) =>
      row.map((cell) => ({ ...cell, walls: { ...cell.walls } })),
    );

  const resetRunState = (size: number) => {
    stepRef.current = 0;
    setSessionStatus("idle");
    const startPosition = { row: size - 1, col: 0 };
    setPosition(startPosition);
    positionRef.current = startPosition;
    setDirection("east");
    setPath([]);
    setMaze(createMaze(size));
    setViewMode("live");
    setIsHistoryOpen(false);
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
    gridSizeRef.current = gridSize;
  }, [gridSize]);

  const toGridPosition = (x: number, y: number, size: number): Position => {
    return { row: size - 1 - y, col: x };
  };

  const decodeWalls = (mask: number): Direction[] => {
    const walls: Direction[] = [];
    if (mask & 1) {
      walls.push("north");
    }
    if (mask & 2) {
      walls.push("south");
    }
    if (mask & 4) {
      walls.push("east");
    }
    if (mask & 8) {
      walls.push("west");
    }
    return walls;
  };

  const finishSession = () => {
    setHistory((prev) => [
      {
        maze: cloneMaze(mazeRef.current),
        path: [...pathRef.current],
        endPosition: positionRef.current,
        endDirection: directionRef.current,
        gridSize: gridSizeRef.current,
      },
      ...prev,
    ]);
    setHistoryIndex(0);
    setSessionStatus("finished");
  };

  const applyTelemetryPacket = (data: Record<string, unknown>) => {
    if ("dimensao" in data && "tentativa" in data) {
      const size = Number(data.dimensao);
      if (!Number.isFinite(size)) {
        return;
      }

      resetRunState(size);
      setGridSize(size);
      setSessionStatus("running");
      return;
    }

    if ("rota" in data) {
      return;
    }

    if ("sucesso" in data && "v_med" in data) {
      finishSession();
      return;
    }

    if ("x" in data && "y" in data && "w" in data) {
      const size = gridSizeRef.current;
      const x = Number(data.x);
      const y = Number(data.y);
      const w = Number(data.w);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w)) {
        return;
      }

      const nextPosition = toGridPosition(x, y, size);
      if (!isInsideMaze(nextPosition, size)) {
        return;
      }

      stepRef.current += 1;
      setMaze((prev) => {
        const walls = decodeWalls(w);
        let nextMaze = prev;
        walls.forEach((wallDirection) => {
          nextMaze = markWall(nextMaze, nextPosition, wallDirection);
        });
        return markVisited(nextMaze, nextPosition, stepRef.current);
      });
      setPath((prev) => [...prev, nextPosition]);
      setPosition(nextPosition);
      positionRef.current = nextPosition;
    }
  };

  // Conexao com a telemetria externa (ESP32 -> backend -> WebSocket).
  useEffect(() => {
    if (USE_MOCK_TELEMETRY) {
      const mockTelemetry = createMockTelemetry({
        size: MOCK_MAZE_SIZE,
        intervalMs: 450,
        maxSteps: 64,
        onTelemetry: () => {},
        onPacket: (packet) => {
          applyTelemetryPacket(packet.payload);
        },
        onFinish: () => {
          finishSession();
        },
      });

      mockTelemetry.start();

      return () => {
        mockTelemetry.stop();
      };
    }

    const ws = new WebSocket(WS_TELEMETRIA_URL);

    ws.onmessage = (event) => {
      let payload: unknown;

      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!payload || typeof payload !== "object") {
        return;
      }

      applyTelemetryPacket(payload as Record<string, unknown>);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 border-b border-zinc-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Labirinto
          </p>
          <h2 className="text-xl font-semibold text-zinc-950">
            Mapa de navegacao em tempo real
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sinal vivo da corrida com rastreio de paredes, celulas visitadas e
            historico de rotas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            onClick={openHistory}
          >
            Historico
          </button>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div
              className="relative grid"
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
                  const backgroundColor = isCurrent
                    ? "rgb(125 211 252)"
                    : cell.visited
                      ? "rgb(186 230 253)"
                      : isOnPath
                        ? "rgb(224 242 254)"
                        : "rgb(255 255 255)";
                  const wallShadows = [
                    cell.walls.north
                      ? `inset 0 2px 0 0 ${wallShadowColor}`
                      : null,
                    cell.walls.south
                      ? `inset 0 -2px 0 0 ${wallShadowColor}`
                      : null,
                    cell.walls.east
                      ? `inset -2px 0 0 0 ${wallShadowColor}`
                      : null,
                    cell.walls.west
                      ? `inset 2px 0 0 0 ${wallShadowColor}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  const classes = [
                    "relative aspect-square border border-zinc-200",
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
                  stroke="rgb(37 99 235)"
                  strokeWidth="0.04"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                className="pointer-events-none absolute z-30 h-3 w-3 rounded-full bg-black"
                style={{
                  left: `${((displayPosition.col + 0.5) / displayGridSize) * 100}%`,
                  top: `${((displayPosition.row + 0.5) / displayGridSize) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-72">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Status da corrida
            </p>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <p className="flex items-center justify-between">
                <span>Sessao</span>
                <span className="font-semibold text-zinc-900">
                  {sessionStatus}
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                {sessionStatus === "idle"
                  ? "Aguardando pacote inicial da ESP32."
                  : "Telemetria recebida do embarcado."}
              </p>
              <p className="flex items-center justify-between">
                <span>Posicao</span>
                <span className="font-semibold text-zinc-900">
                  ({displayPosition.row}, {displayPosition.col})
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Grade</span>
                <span className="font-semibold text-zinc-900">
                  {displayGridSize}x{displayGridSize}
                </span>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                Historico de Corridas
              </h2>
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50"
                onClick={() => setIsHistoryOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {history.map((run, index) => (
                <button
                  key={`history-${index}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  onClick={() => selectHistory(index)}
                >
                  <div>
                    <span className="block text-sm font-semibold text-zinc-900">
                      Corrida {index + 1}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {run.gridSize}x{run.gridSize} · {run.path.length} passos
                    </span>
                  </div>
                  <span className="text-lg text-zinc-400">→</span>
                </button>
              ))}
              {history.length === 0 && (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
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
