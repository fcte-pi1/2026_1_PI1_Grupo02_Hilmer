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

const directions: Direction[] = ["north", "east", "south", "west"];

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

const getStepLimit = (size: number) => {
  if (size === 4) {
    return 8;
  }
  if (size === 8) {
    return 16;
  }
  if (size === 16) {
    return 32;
  }
  return Math.min(size, 16);
};

// Fabrica o simulador com ciclo de atualizacoes periodicas.
export const createMockTelemetry = (options: MockTelemetryOptions) => {
  let timer: number | null = null;
  let steps = 0;
  let currentDirection: Direction = "east";
  let currentPosition = { row: 0, col: 0 };
  const stepLimit = getStepLimit(options.size);

  // Avanca passos aleatorios e encerra no limite definido por tamanho.
  const tick = () => {
    if (steps >= stepLimit || steps >= options.maxSteps) {
      options.onFinish();
      return;
    }

    const direction = pickDirection(currentDirection);
    const nextPosition = stepFromPosition(currentPosition, direction);
    const boundaryHit = !isInsideMaze(nextPosition, options.size);

    steps += 1;
    if (direction !== currentDirection) {
      options.onTelemetry({
        position: currentPosition,
        direction,
        moved: false,
        hitWall: true,
        wallDir: direction,
      });
    }
    if (boundaryHit) {
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

    currentDirection = direction;
    currentPosition = nextPosition;
    options.onTelemetry({
      position: currentPosition,
      direction,
      moved: true,
      hitWall: false,
    });
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
