import type { Direction, TelemetryUpdate } from "./types";
import { isInsideMaze, stepFromPosition } from "./mazeUtils";

// Parametros para simular telemetria em tempo real.
interface MockTelemetryOptions {
  size: number;
  intervalMs: number;
  maxSteps: number;
  onTelemetry: (update: TelemetryUpdate) => void;
  onFinish: () => void;
}

// Ordem das direcoes para facilitar giros.
const directions: Direction[] = ["north", "east", "south", "west"];

// Mantem a direcao com maior probabilidade e aplica giros leves.
const pickDirection = (current: Direction): Direction => {
  const index = directions.indexOf(current);
  const choice = Math.random();

  if (choice < 0.55) {
    return current;
  }

  if (choice < 0.8) {
    return directions[(index + 1) % directions.length];
  }

  return directions[(index + directions.length - 1) % directions.length];
};

// Fabrica o simulador com ciclo de atualizacoes periodicas.
export const createMockTelemetry = (options: MockTelemetryOptions) => {
  let timer: number | null = null;
  let steps = 0;
  let currentDirection: Direction = "east";
  let currentPosition = { row: 0, col: 0 };

  // Avanca um passo ou gera colisao com parede.
  const tick = () => {
    const direction = pickDirection(currentDirection);
    const nextPosition = stepFromPosition(currentPosition, direction);
    const boundaryHit = !isInsideMaze(nextPosition, options.size);
    const randomWallHit = Math.random() < 0.2;

    if (boundaryHit || randomWallHit) {
      currentDirection = direction;
      options.onTelemetry({
        position: currentPosition,
        direction,
        moved: false,
        hitWall: true,
        wallDir: direction,
      });
      return;
    }

    steps += 1;
    currentDirection = direction;
    currentPosition = nextPosition;
    options.onTelemetry({
      position: currentPosition,
      direction,
      moved: true,
      hitWall: false,
    });

    if (steps >= options.maxSteps) {
      options.onFinish();
    }
  };

  return {
    start: () => {
      if (timer !== null) {
        return;
      }
      timer = window.setInterval(tick, options.intervalMs);
    },
    stop: () => {
      if (timer === null) {
        return;
      }
      window.clearInterval(timer);
      timer = null;
    },
    reset: () => {
      // Reinicia a simulacao para o ponto de origem.
      steps = 0;
      currentDirection = "east";
      currentPosition = { row: 0, col: 0 };
    },
  };
};
