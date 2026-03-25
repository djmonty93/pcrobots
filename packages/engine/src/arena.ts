import { ARENA_SIZE, ArenaCell, type ArenaDefinition, type Point } from "./types.js";

function createEmptyCells(): ArenaCell[][] {
  return Array.from({ length: ARENA_SIZE }, () =>
    Array.from({ length: ARENA_SIZE }, () => ArenaCell.Free)
  );
}

export function parseArenaText(text: string): ArenaDefinition {
  const lines = text.replace(/\r\n/g, "\n").split("\n").slice(0, ARENA_SIZE);
  const cells = createEmptyCells();
  const teamStarts: ArenaDefinition["teamStarts"] = {};
  const refuelPoints: Point[] = [];
  const obstaclePoints: Point[] = [];

  for (let y = 0; y < ARENA_SIZE; y += 1) {
    const line = lines[y] ?? "";

    for (let x = 0; x < ARENA_SIZE; x += 1) {
      const marker = line[x] ?? ".";

      switch (marker) {
        case ".":
          cells[y][x] = ArenaCell.Free;
          break;
        case "X":
          cells[y][x] = ArenaCell.Wall;
          break;
        case "S":
          cells[y][x] = ArenaCell.Slow;
          break;
        case "D":
          cells[y][x] = ArenaCell.Damage;
          break;
        case "R":
          cells[y][x] = ArenaCell.Refuel;
          refuelPoints.push({ x, y });
          break;
        case "*":
          cells[y][x] = ArenaCell.Obstacle;
          obstaclePoints.push({ x, y });
          break;
        case "A":
        case "B":
        case "C":
          cells[y][x] = ArenaCell.Free;
          teamStarts[marker] = { x, y };
          break;
        default:
          throw new Error(`Unknown arena marker "${marker}" at (${x}, ${y})`);
      }
    }
  }

  return {
    width: ARENA_SIZE,
    height: ARENA_SIZE,
    cells,
    teamStarts,
    refuelPoints,
    obstaclePoints
  };
}
