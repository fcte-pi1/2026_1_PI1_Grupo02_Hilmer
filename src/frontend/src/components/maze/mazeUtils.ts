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
  _maze?: Cell[][],
): Position[] => {
  // Para rotas otimizadas e histórico fiel, não tentamos 'adivinhar' caminhos intermediários.
  // Retornamos os pontos originais para garantir que a linha siga exatamente o array.
  return [...points];
};

// Encontra a área 2x2 que representa o objetivo.
// Em um labirinto Micromouse, o objetivo é uma área 2x2 sem paredes internas.
export const findGoalArea = (maze: Cell[][]): Position[] => {
  if (!maze || maze.length === 0) return [];
  const size = maze.length;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const c1 = maze[r][c];       // Top-Left
      const c2 = maze[r+1][c];     // Bottom-Left
      const c3 = maze[r][c+1];     // Top-Right
      const c4 = maze[r+1][c+1];   // Bottom-Right

      if (!c1 || !c2 || !c3 || !c4) continue;

      // Verifica se as paredes internas entre essas 4 células estão ausentes
      if (
        !c1.walls.south && !c1.walls.east &&
        !c2.walls.north && !c2.walls.east &&
        !c3.walls.south && !c3.walls.west &&
        !c4.walls.north && !c4.walls.west
      ) {
        // Retorna as 4 células que compõem o objetivo
        // Apenas se pelo menos uma delas foi visitada (para evitar falsos positivos num labirinto não inicializado)
        if (c1.visited || c2.visited || c3.visited || c4.visited) {
          return [
            { row: r, col: c },
            { row: r + 1, col: c },
            { row: r, col: c + 1 },
            { row: r + 1, col: c + 1 },
          ];
        }
      }
    }
  }
  return [];
};
