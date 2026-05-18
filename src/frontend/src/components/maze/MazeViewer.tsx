import { useEffect, useRef, useState } from "react";
import { createMockTelemetry } from "./mockTelemetry";
import { createMaze, markVisited, markWall } from "./mazeUtils";
import type { Cell, Direction, Position } from "./types";

const DEFAULT_GRID_SIZE = 8;
const GRID_SIZES = [16, 8, 4] as const;
const MAX_STEPS = 512;

// Setas para indicar direcao atual do robo.
const directionArrow: Record<Direction, string> = {
  north: "▲",
  east: "▶",
  south: "▼",
  west: "◀",
};

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
  const telemetryRef = useRef<ReturnType<typeof createMockTelemetry> | null>(
    null,
  );
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
    telemetryRef.current?.stop();
    stepRef.current = 0;
    setSessionStatus("idle");
    setPosition({ row: 0, col: 0 });
    positionRef.current = { row: 0, col: 0 };
    setDirection("east");
    setPath([]);
    setMaze(createMaze(size));
    setViewMode("live");
    setIsHistoryOpen(false);
  };

  const updateGridSize = (size: number) => {
    if (size === gridSize) {
      return;
    }

    resetRunState(size);
    setGridSize(size);
  };

  // Inicia a telemetria mock (CA-12-01).
  const startSession = () => {
    if (sessionStatus === "running") {
      return;
    }
    resetRunState(gridSize);
    setSessionStatus("running");
  };

  const openHistory = () => {
    if (history.length === 0) {
      return;
    }

    telemetryRef.current?.stop();
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

  // Ciclo principal da telemetria e atualizacao do grid.
  useEffect(() => {
    if (sessionStatus !== "running") {
      return;
    }

    const telemetry = createMockTelemetry({
      size: gridSize,
      intervalMs: 450,
      maxSteps: MAX_STEPS,
      onTelemetry: (update) => {
        if (update.hitWall && update.wallDir) {
          setMaze((prev) =>
            markWall(prev, positionRef.current, update.wallDir!),
          );
          setDirection(update.direction);
          return;
        }

        if (update.moved) {
          stepRef.current += 1;
          setMaze((prev) =>
            markVisited(prev, update.position, stepRef.current),
          );
          setPath((prev) => [...prev, update.position]);
          setPosition(update.position);
          positionRef.current = update.position;
          setDirection(update.direction);
        }
      },
      onFinish: () => {
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
        telemetry.stop();
      },
    });

    telemetryRef.current = telemetry;
    telemetry.start();

    return () => {
      telemetry.stop();
    };
  }, [sessionStatus, gridSize]);

  return (
    <section className="maze-shell">
      <header className="maze-header">
        <div>
          <p className="eyebrow">Micromouse Control Room</p>
          <h1>Mapa de Navegacao em Tempo Real</h1>
          <p className="subhead">
            Sinal vivo da corrida com rastreio de paredes, celulas visitadas e
            historico de rotas.
          </p>
        </div>
        <div className="controls">
          <button type="button" className="btn primary" onClick={startSession}>
            Simular corrida
          </button>
          <button type="button" className="btn" onClick={openHistory}>
            Historico
          </button>
          {GRID_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className="btn"
              onClick={() => updateGridSize(size)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </header>

      <div className="maze-layout">
        <div
          className="maze-grid"
          style={{
            gridTemplateColumns: `repeat(${displayGridSize}, minmax(0, 1fr))`,
            width: displayGridDimension,
            height: displayGridDimension,
          }}
        >
          <svg
            className="maze-path"
            viewBox={`0 0 ${displayGridSize} ${displayGridSize}`}
            aria-hidden="true"
          >
            <polyline points={pathPointsString} />
          </svg>
          {displayMaze.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const cellPosition = { row: rowIndex, col: colIndex };
              const isCurrent = positionsEqual(cellPosition, displayPosition);
              const isOnPath = displayPath.some((step) =>
                positionsEqual(step, cellPosition),
              );
              const classes = [
                "maze-cell",
                cell.visited ? "visited" : "",
                isOnPath ? "path" : "",
                isCurrent ? "current" : "",
                cell.walls.north ? "wall-n" : "",
                cell.walls.south ? "wall-s" : "",
                cell.walls.east ? "wall-e" : "",
                cell.walls.west ? "wall-w" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={`${rowIndex}-${colIndex}`} className={classes}>
                  {isCurrent && (
                    <span className="mouse">
                      <span className="mouse-core" />
                      <span className="mouse-arrow">
                        {directionArrow[displayDirection]}
                      </span>
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>

        <aside className="maze-panel">
          <div className="panel-card">
            <h2>Status da Corrida</h2>
            <p className="status">Sessao: {sessionStatus}</p>
            <p className="status">
              Posicao: ({displayPosition.row}, {displayPosition.col})
            </p>
          </div>
        </aside>
      </div>
      {isHistoryOpen && (
        <div className="history-backdrop" role="dialog" aria-modal="true">
          <div className="history-modal">
            <div className="history-modal-header">
              <h2>Historico de Corridas</h2>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setIsHistoryOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="history-list">
              {history.map((run, index) => (
                <button
                  key={`history-${index}`}
                  type="button"
                  className="history-item"
                  onClick={() => selectHistory(index)}
                >
                  <div>
                    <span className="history-title">Corrida {index + 1}</span>
                    <span className="history-meta">
                      {run.gridSize}x{run.gridSize} · {run.path.length} passos
                    </span>
                  </div>
                  <span className="history-arrow">→</span>
                </button>
              ))}
            </div>
            {history.length === 0 && (
              <p className="history-empty">Nenhuma corrida registrada ainda.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
