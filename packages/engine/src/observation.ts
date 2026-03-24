import { ARENA_SIZE, ArenaCell, type MatchRobotState, type MatchState } from "./types.js";

export interface RobotObservation {
  id: string;
  name: string;
  teamId?: "A" | "B" | "C";
  x: number;
  y: number;
  heading: number;
  speed: number;
  battery: number;
  armour: number;
  shellsLeft: number;
  invisible: boolean;
}

export interface RobotTurnSnapshot {
  tick: number;
  self: RobotObservation;
  localMap: number[][];
}

function reportArenaCell(cell: ArenaCell): number {
  switch (cell) {
    case ArenaCell.Free:
      return 0;
    case ArenaCell.Wall:
      return 1;
    case ArenaCell.Slow:
      return 2;
    case ArenaCell.Damage:
      return 3;
    case ArenaCell.Obstacle:
      return 4;
    case ArenaCell.Refuel:
      return 30;
  }
}

function toRobotObservation(robot: MatchRobotState): RobotObservation {
  return {
    id: robot.id,
    name: robot.name,
    teamId: robot.teamId,
    x: Math.floor(robot.x / 100),
    y: Math.floor(robot.y / 100),
    heading: robot.heading,
    speed: robot.speed,
    battery: robot.battery / 10,
    armour: robot.armour,
    shellsLeft: robot.shellsLeft,
    invisible: robot.invisible
  };
}

export function getLocalMap(state: MatchState, robotId: string): number[][] {
  const robot = state.robots.find((entry) => entry.id === robotId);
  if (!robot) {
    throw new Error(`Unknown robot ${robotId}`);
  }

  const originX = Math.floor(robot.x / 1000) - 4;
  const originY = Math.floor(robot.y / 1000) - 4;

  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, column) => {
      const x = originX + column;
      const y = originY + row;
      if (x < 0 || y < 0 || x >= ARENA_SIZE || y >= ARENA_SIZE) {
        return 1;
      }
      return reportArenaCell(state.arena.cells[y][x]);
    })
  );
}

export function createRobotTurnSnapshot(state: MatchState, robotId: string): RobotTurnSnapshot {
  const robot = state.robots.find((entry) => entry.id === robotId);
  if (!robot) {
    throw new Error(`Unknown robot ${robotId}`);
  }

  return {
    tick: state.tick,
    self: toRobotObservation(robot),
    localMap: getLocalMap(state, robotId)
  };
}
