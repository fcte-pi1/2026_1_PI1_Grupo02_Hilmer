import { useEffect, useRef, useState } from "react";
import { createMockTelemetry } from "./mockTelemetry";
import { createMaze, markVisited, markWall } from "./mazeUtils";
import type { Direction, Position } from "./types";

const DEFAULT_GRID_SIZE = 8;
const GRID_SIZES = [16, 8, 4] as const;
const MAX_STEPS = 140;

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
  const [sessionStatus, setSessionStatus] = useState<
    "idle" | "running" | "finished"
  >("idle");
  const stepRef = useRef(0);
  // Mantem posicao atual sem depender do fechamento do useEffect.
  const positionRef = useRef<Position>({ row: 0, col: 0 });
  const telemetryRef = useRef<ReturnType<typeof createMockTelemetry> | null>(
    null,
  );
  const gridDimension =
    gridSize === 16
      ? "min(72vmin, 640px)"
      : gridSize === 8
        ? "min(70vmin, 520px)"
        : "min(60vmin, 360px)";

  const updateGridSize = (size: number) => {
    if (size === gridSize) {
      return;
    }

    telemetryRef.current?.stop();
    stepRef.current = 0;
    setSessionStatus("idle");
    setPosition({ row: 0, col: 0 });
    positionRef.current = { row: 0, col: 0 };
    setDirection("east");
    setPath([]);
    setMaze(createMaze(size));
    setGridSize(size);
  };

  // Inicia a telemetria mock (CA-12-01).
  const startSession = () => {
    if (sessionStatus === "running") {
      return;
    }
    setSessionStatus("running");
  };

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
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: gridDimension,
            height: gridDimension,
          }}
        >
          {maze.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const cellPosition = { row: rowIndex, col: colIndex };
              const isCurrent = positionsEqual(cellPosition, position);
              const isOnPath = path.some((step) =>
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
                        {directionArrow[direction]}
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
              Posicao: ({position.row}, {position.col})
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
