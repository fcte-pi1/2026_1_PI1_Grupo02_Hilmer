import { describe, it, expect } from "vitest";
import {
  createMaze,
  getOppositeDirection,
  stepFromPosition,
  isInsideMaze,
  markWall,
  markVisited,
  hasWallBetween,
  findGoalArea,
  mazeToDisplayPosition,
  displayToMazePosition,
} from "../../components/maze/mazeUtils";
import type { Position } from "../../components/maze/types";

describe("mazeUtils", () => {
  describe("coordinate conversion", () => {
    it("converts firmware coordinates to display row/col", () => {
      expect(mazeToDisplayPosition({ x: 0, y: 0 }, 4)).toEqual({ row: 3, col: 0 });
      expect(mazeToDisplayPosition({ x: 0, y: 1 }, 4)).toEqual({ row: 2, col: 0 });
      expect(mazeToDisplayPosition({ x: 2, y: 2 }, 4)).toEqual({ row: 1, col: 2 });
    });

    it("converts display row/col back to firmware coordinates", () => {
      expect(displayToMazePosition({ row: 3, col: 0 }, 4)).toEqual({ x: 0, y: 0 });
      expect(displayToMazePosition({ row: 2, col: 0 }, 4)).toEqual({ x: 0, y: 1 });
      expect(displayToMazePosition({ row: 1, col: 2 }, 4)).toEqual({ x: 2, y: 2 });
    });

    it("maps the firmware mock optimized route to a bottom-left origin display path", () => {
      const route = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ];

      expect(route.map((point) => mazeToDisplayPosition(point, 4))).toEqual([
        { row: 3, col: 0 },
        { row: 2, col: 0 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ]);
    });
  });

  describe("createMaze", () => {
    it("should create a maze of given size with external walls", () => {
      const maze = createMaze(4);
      expect(maze.length).toBe(4);
      expect(maze[0].length).toBe(4);

      // Top-left corner
      expect(maze[0][0].walls.north).toBe(true);
      expect(maze[0][0].walls.west).toBe(true);
      expect(maze[0][0].walls.south).toBe(false);
      expect(maze[0][0].walls.east).toBe(false);
      expect(maze[0][0].visited).toBe(false);

      // Bottom-right corner
      expect(maze[3][3].walls.south).toBe(true);
      expect(maze[3][3].walls.east).toBe(true);
      expect(maze[3][3].walls.north).toBe(false);
      expect(maze[3][3].walls.west).toBe(false);
    });
  });

  describe("getOppositeDirection", () => {
    it("returns correct opposite directions", () => {
      expect(getOppositeDirection("north")).toBe("south");
      expect(getOppositeDirection("south")).toBe("north");
      expect(getOppositeDirection("east")).toBe("west");
      expect(getOppositeDirection("west")).toBe("east");
    });
  });

  describe("stepFromPosition", () => {
    it("calculates correct next position", () => {
      const pos: Position = { row: 1, col: 1 };
      expect(stepFromPosition(pos, "north")).toEqual({ row: 0, col: 1 });
      expect(stepFromPosition(pos, "south")).toEqual({ row: 2, col: 1 });
      expect(stepFromPosition(pos, "east")).toEqual({ row: 1, col: 2 });
      expect(stepFromPosition(pos, "west")).toEqual({ row: 1, col: 0 });
    });
  });

  describe("isInsideMaze", () => {
    it("returns true if inside maze", () => {
      expect(isInsideMaze({ row: 0, col: 0 }, 4)).toBe(true);
      expect(isInsideMaze({ row: 3, col: 3 }, 4)).toBe(true);
    });

    it("returns false if outside maze", () => {
      expect(isInsideMaze({ row: -1, col: 0 }, 4)).toBe(false);
      expect(isInsideMaze({ row: 0, col: -1 }, 4)).toBe(false);
      expect(isInsideMaze({ row: 4, col: 0 }, 4)).toBe(false);
      expect(isInsideMaze({ row: 0, col: 4 }, 4)).toBe(false);
    });
  });

  describe("markWall", () => {
    it("marks wall in current cell and opposite wall in neighbor cell", () => {
      const maze = createMaze(4);
      const newMaze = markWall(maze, { row: 1, col: 1 }, "east");
      
      expect(newMaze[1][1].walls.east).toBe(true);
      expect(newMaze[1][2].walls.west).toBe(true);
      
      // Original maze should not be mutated
      expect(maze[1][1].walls.east).toBe(false);
    });

    it("handles out of bounds neighbor safely", () => {
      const maze = createMaze(4);
      const newMaze = markWall(maze, { row: 0, col: 3 }, "east");
      
      expect(newMaze[0][3].walls.east).toBe(true);
    });

    it("handles out of bounds current cell safely", () => {
      const maze = createMaze(4);
      const newMaze = markWall(maze, { row: -1, col: -1 }, "east");
      expect(newMaze).toEqual(maze);
    });
  });

  describe("markVisited", () => {
    it("marks cell as visited and sets history step", () => {
      const maze = createMaze(4);
      const newMaze = markVisited(maze, { row: 1, col: 1 }, 5);
      
      expect(newMaze[1][1].visited).toBe(true);
      expect(newMaze[1][1].historyStep).toBe(5);
      
      expect(maze[1][1].visited).toBe(false);
    });

    it("handles out of bounds safely", () => {
      const maze = createMaze(4);
      const newMaze = markVisited(maze, { row: -1, col: -1 }, 5);
      expect(newMaze).toEqual(maze);
    });
  });

  describe("hasWallBetween", () => {
    it("returns true if there is a wall between adjacent cells", () => {
      let maze = createMaze(4);
      maze = markWall(maze, { row: 1, col: 1 }, "east");
      
      expect(hasWallBetween(maze, { row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
      expect(hasWallBetween(maze, { row: 1, col: 2 }, { row: 1, col: 1 })).toBe(true);
    });

    it("returns false if there is no wall between adjacent cells", () => {
      const maze = createMaze(4);
      expect(hasWallBetween(maze, { row: 1, col: 1 }, { row: 1, col: 2 })).toBe(false);
      expect(hasWallBetween(maze, { row: 1, col: 2 }, { row: 1, col: 1 })).toBe(false);
    });

    it("checks north/south walls", () => {
      let maze = createMaze(4);
      maze = markWall(maze, { row: 1, col: 1 }, "south");
      
      expect(hasWallBetween(maze, { row: 1, col: 1 }, { row: 2, col: 1 })).toBe(true);
      expect(hasWallBetween(maze, { row: 2, col: 1 }, { row: 1, col: 1 })).toBe(true);
      expect(hasWallBetween(maze, { row: 1, col: 1 }, { row: 0, col: 1 })).toBe(false);
    });

    it("returns true for non-adjacent cells", () => {
      const maze = createMaze(4);
      expect(hasWallBetween(maze, { row: 1, col: 1 }, { row: 2, col: 2 })).toBe(true);
    });

    it("handles out of bounds safely", () => {
      const maze = createMaze(4);
      // If one is out of bounds, it's considered walled
      expect(hasWallBetween(maze, { row: -1, col: -1 }, { row: 0, col: 0 })).toBe(true);
      // If both are completely out of bounds and not found, it returns false
      expect(hasWallBetween(maze, { row: -1, col: -1 }, { row: -2, col: -2 })).toBe(false);
    });
  });

  describe("findGoalArea", () => {
    it("returns the fixed central 2x2 area for a 4x4 maze", () => {
      const maze = createMaze(4);
      expect(findGoalArea(maze)).toEqual([
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ]);
    });

    it("returns the fixed central 2x2 area for an 8x8 maze", () => {
      const maze = createMaze(8);
      expect(findGoalArea(maze)).toEqual([
        { row: 3, col: 3 },
        { row: 4, col: 3 },
        { row: 3, col: 4 },
        { row: 4, col: 4 },
      ]);
    });

    it("returns empty array for empty maze", () => {
      expect(findGoalArea([])).toEqual([]);
    });

    it("does not depend on visited cells", () => {
      let maze = createMaze(4);
      maze = markVisited(maze, { row: 1, col: 1 }, 1);

      expect(findGoalArea(maze)).toEqual([
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ]);
    });

    it("does not depend on internal walls", () => {
      let maze = createMaze(4);
      maze = markVisited(maze, { row: 1, col: 1 }, 1);
      maze = markWall(maze, { row: 1, col: 1 }, "east");
      maze = markWall(maze, { row: 1, col: 1 }, "south");

      expect(findGoalArea(maze)).toEqual([
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ]);
    });
  });
});
