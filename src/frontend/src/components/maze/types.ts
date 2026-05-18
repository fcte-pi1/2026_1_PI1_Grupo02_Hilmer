// Direcoes cardeais usadas no grid.
export type Direction = "north" | "south" | "east" | "west";

export type CellWalls = Record<Direction, boolean>;

// Estado de cada celula do labirinto.
export interface Cell {
  visited: boolean;
  walls: CellWalls;
  historyStep: number | null;
}

// Coordenadas da celula no grid.
export interface Position {
  row: number;
  col: number;
}

// Atualizacao pontual vinda da telemetria (real ou mock).
export interface TelemetryUpdate {
  position: Position;
  direction: Direction;
  moved: boolean;
  hitWall: boolean;
  wallDir?: Direction;
}
