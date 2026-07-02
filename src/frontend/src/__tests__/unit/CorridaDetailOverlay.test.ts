import { describe, expect, it } from "vitest";
import { buildStaticMazeFromCells } from "../../components/corrida/CorridaDetailOverlay";
import type { CelulaResponse } from "../../types/corrida";

describe("buildStaticMazeFromCells", () => {
  it("uses the mapped cell walls instead of deriving walls from the optimized route", () => {
    const cells: CelulaResponse[] = [
      {
        id_celula: 112,
        coordenada_x: 0,
        coordenada_y: 0,
        parede_norte: false,
        parede_sul: true,
        parede_leste: false,
        parede_oeste: true,
      },
      {
        id_celula: 113,
        coordenada_x: 0,
        coordenada_y: 1,
        parede_norte: false,
        parede_sul: false,
        parede_leste: false,
        parede_oeste: true,
      },
      {
        id_celula: 114,
        coordenada_x: 0,
        coordenada_y: 2,
        parede_norte: true,
        parede_sul: false,
        parede_leste: false,
        parede_oeste: true,
      },
    ];
    const routeCells = new Map(cells.map((cell) => [`${cell.coordenada_x},${cell.coordenada_y}`, cell]));

    const maze = buildStaticMazeFromCells(4, cells, routeCells);

    expect(maze[3][0].visited).toBe(true);
    expect(maze[3][0].walls).toEqual({
      north: false,
      south: true,
      east: false,
      west: true,
    });
    expect(maze[1][0].walls.north).toBe(true);
  });

  it("keeps default external walls for cells absent from the persisted maze", () => {
    const maze = buildStaticMazeFromCells(4, [], new Map());

    expect(maze[0][0].walls.north).toBe(true);
    expect(maze[0][0].walls.west).toBe(true);
    expect(maze[1][1].walls).toEqual({
      north: false,
      south: false,
      east: false,
      west: false,
    });
  });
});
