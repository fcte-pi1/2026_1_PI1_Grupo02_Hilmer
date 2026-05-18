import type { Cell, Direction, Position } from "./types";

// Cria o labirinto inicial com paredes externas fechadas.
export const createMaze = (size: number): Cell[][] => {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => {
      const isTop = row === 0;
      const isBottom = row === size - 1;
      const isLeft = col === 0;
      const isRight = col === size - 1;

      return {
        visited: false,
        historyStep: null,
        walls: {
          north: isTop,
          south: isBottom,
          west: isLeft,
          east: isRight,
        },
      };
    }),
  );
};

// Retorna a direcao oposta (para espelhar paredes).
export const getOppositeDirection = (direction: Direction): Direction => {
  switch (direction) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "east":
      return "west";
    case "west":
      return "east";
  }
};

// Calcula a proxima posicao a partir de uma direcao.
export const stepFromPosition = (
  position: Position,
  direction: Direction,
): Position => {
  switch (direction) {
    case "north":
      return { row: position.row - 1, col: position.col };
    case "south":
      return { row: position.row + 1, col: position.col };
    case "east":
      return { row: position.row, col: position.col + 1 };
    case "west":
      return { row: position.row, col: position.col - 1 };
  }
};

// Valida se a posicao esta dentro do grid.
export const isInsideMaze = (position: Position, size: number): boolean => {
  return (
    position.row >= 0 &&
    position.row < size &&
    position.col >= 0 &&
    position.col < size
  );
};

// Marca parede detectada na celula atual e na vizinha correspondente.
export const markWall = (
  maze: Cell[][],
  position: Position,
  direction: Direction,
): Cell[][] => {
  const next = maze.map((row) =>
    row.map((cell) => ({ ...cell, walls: { ...cell.walls } })),
  );
  const cell = next[position.row]?.[position.col];
  if (!cell) {
    return next;
  }

  cell.walls[direction] = true;
  const neighbor = stepFromPosition(position, direction);
  if (next[neighbor.row]?.[neighbor.col]) {
    next[neighbor.row][neighbor.col].walls[getOppositeDirection(direction)] =
      true;
  }

  return next;
};

// Marca a celula como visitada e registra o passo do historico.
export const markVisited = (
  maze: Cell[][],
  position: Position,
  step: number,
): Cell[][] => {
  const next = maze.map((row) =>
    row.map((cell) => ({ ...cell, walls: { ...cell.walls } })),
  );
  const cell = next[position.row]?.[position.col];
  if (!cell) {
    return next;
  }

  cell.visited = true;
  cell.historyStep = step;
  return next;
};
