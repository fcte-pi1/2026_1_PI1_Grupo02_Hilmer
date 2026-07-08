import type { Cell, Direction, Position } from "./types";

export interface MazeCoordinate {
  x: number;
  y: number;
}

// Firmware: origem no canto inferior esquerdo e y crescendo para o Norte.
// Grid visual: row=0 no topo e row crescendo para baixo.
export const mazeToDisplayPosition = (
  coordinate: MazeCoordinate,
  gridSize: number,
): Position => ({
  row: gridSize - 1 - coordinate.y,
  col: coordinate.x,
});

export const displayToMazePosition = (
  position: Position,
  gridSize: number,
): MazeCoordinate => ({
  x: position.col,
  y: gridSize - 1 - position.row,
});

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

export const hasWallBetween = (
  maze: Cell[][],
  p1: Position,
  p2: Position,
): boolean => {
  const cell1 = maze[p1.row]?.[p1.col];
  const cell2 = maze[p2.row]?.[p2.col];
  if (!cell1 && !cell2) return false;

  if (p2.col === p1.col + 1 && p2.row === p1.row) {
    return cell1?.walls?.east || cell2?.walls?.west || false;
  }
  if (p2.col === p1.col - 1 && p2.row === p1.row) {
    return cell1?.walls?.west || cell2?.walls?.east || false;
  }
  if (p2.row === p1.row + 1 && p2.col === p1.col) {
    return cell1?.walls?.south || cell2?.walls?.north || false;
  }
  if (p2.row === p1.row - 1 && p2.col === p1.col) {
    return cell1?.walls?.north || cell2?.walls?.south || false;
  }

  return true; // Not adjacent, consider it walled to prevent direct crossing
};

/**
 * Normaliza um array de posições para que o trajeto siga apenas
 * movimentos ortogonais (horizontal e vertical), sem linhas diagonais.
 *
 * Quando dois pontos consecutivos diferem tanto em row quanto em col,
 * um ponto intermediário é inserido para criar um caminho em "L".
 * Usa o labirinto (se fornecido) para escolher o caminho intermediário
 * que não atravessa paredes.
 */
export const normalizePathToOrthogonal = (
  points: Position[],
  maze?: Cell[][],
): Position[] => {
  if (points.length <= 1) return [...points];

  const normalized: Position[] = [points[0]];
  const areAdjacent = (p1: Position, p2: Position) =>
    Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col) === 1;
  const routeBlocked = (p1: Position, corner: Position, p2: Position) =>
    !!maze &&
    areAdjacent(p1, corner) &&
    areAdjacent(corner, p2) &&
    (hasWallBetween(maze, p1, corner) || hasWallBetween(maze, corner, p2));

  for (let i = 1; i < points.length; i += 1) {
    const previous = normalized[normalized.length - 1];
    const current = points[i];
    const rowChanged = previous.row !== current.row;
    const colChanged = previous.col !== current.col;

    if (rowChanged && colChanged) {
      const horizontalFirst = { row: previous.row, col: current.col };
      const verticalFirst = { row: current.row, col: previous.col };

      const horizontalFirstBlocked = routeBlocked(
        previous,
        horizontalFirst,
        current,
      );
      const verticalFirstBlocked = routeBlocked(
        previous,
        verticalFirst,
        current,
      );

      normalized.push(
        horizontalFirstBlocked && !verticalFirstBlocked
          ? verticalFirst
          : horizontalFirst,
      );
    }

    normalized.push(current);
  }

  return normalized;
};

const areAdjacent = (p1: Position, p2: Position) =>
  Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col) === 1;

const samePosition = (p1: Position, p2: Position) =>
  p1.row === p2.row && p1.col === p2.col;

const canDrawAdjacentStep = (
  maze: Cell[][] | undefined,
  p1: Position,
  p2: Position,
) => areAdjacent(p1, p2) && (!maze || !hasWallBetween(maze, p1, p2));

const canDrawStraightSegment = (
  maze: Cell[][] | undefined,
  from: Position,
  to: Position,
): boolean => {
  if (samePosition(from, to)) return true;
  if (from.row !== to.row && from.col !== to.col) return false;

  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let cursor = from;

  while (!samePosition(cursor, to)) {
    const next = {
      row: cursor.row + rowStep,
      col: cursor.col + colStep,
    };

    if (!canDrawAdjacentStep(maze, cursor, next)) {
      return false;
    }

    cursor = next;
  }

  return true;
};

const appendPoint = (segment: Position[], point: Position) => {
  const last = segment[segment.length - 1];
  if (!last || !samePosition(last, point)) {
    segment.push(point);
  }
};

export const buildDrawablePathSegments = (
  points: Position[],
  maze?: Cell[][],
): Position[][] => {
  if (points.length === 0) return [];

  const segments: Position[][] = [[points[0]]];
  let currentSegment = segments[0];

  const startNewSegment = (point: Position) => {
    currentSegment = [point];
    segments.push(currentSegment);
  };

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];

    if (samePosition(previous, current)) {
      appendPoint(currentSegment, current);
      continue;
    }

    if (canDrawStraightSegment(maze, previous, current)) {
      appendPoint(currentSegment, current);
      continue;
    }

    const rowDelta = Math.abs(previous.row - current.row);
    const colDelta = Math.abs(previous.col - current.col);
    const isSingleCellDiagonal = rowDelta === 1 && colDelta === 1;

    if (isSingleCellDiagonal) {
      const horizontalFirst = { row: previous.row, col: current.col };
      const verticalFirst = { row: current.row, col: previous.col };
      const canUseHorizontalFirst =
        canDrawAdjacentStep(maze, previous, horizontalFirst) &&
        canDrawAdjacentStep(maze, horizontalFirst, current);
      const canUseVerticalFirst =
        canDrawAdjacentStep(maze, previous, verticalFirst) &&
        canDrawAdjacentStep(maze, verticalFirst, current);

      if (canUseHorizontalFirst || canUseVerticalFirst) {
        const corner = canUseHorizontalFirst ? horizontalFirst : verticalFirst;
        appendPoint(currentSegment, corner);
        appendPoint(currentSegment, current);
        continue;
      }
    }

    startNewSegment(current);
  }

  return segments.filter((segment) => segment.length > 1);
};

// Retorna a região 2x2 fixa no centro do labirinto.
export const findGoalArea = (maze: Cell[][]): Position[] => {
  if (!maze || maze.length < 2) return [];
  const size = maze.length;
  const start = Math.floor(size / 2) - 1;

  return [
    { row: start, col: start },
    { row: start + 1, col: start },
    { row: start, col: start + 1 },
    { row: start + 1, col: start + 1 },
  ];
};
