export const ARENA_SIZE = 100;
export const INTERNAL_UNITS_PER_CELL = 1000;
export const DISPLAY_UNITS_PER_CELL = 10;
export const BATTERY_REAL_UNIT = 10;
export const BATTERY_START = 1000 * BATTERY_REAL_UNIT;
export const BATTERY_CHARGE_PER_TICK = 4 * BATTERY_REAL_UNIT;
export const SHELLS_IN_FLIGHT_LIMIT = 7;
export const SHELL_RELOAD_TICKS = 50;
export const SHELL_SPEED = 400;
export const SHELL_RANGE_DECAY = 4;
export const MAX_SCAN_RESOLUTION = 45;
export const MAX_INVISIBLE_TICKS = 100;

export enum ArenaCell {
  Free = "free",
  Wall = "wall",
  Slow = "slow",
  Damage = "damage",
  Obstacle = "obstacle",
  Refuel = "refuel"
}

export enum ObstacleState {
  None = "none",
  Carrying = "carrying",
  Holding = "holding"
}

export interface Point {
  x: number;
  y: number;
}

export interface ArenaDefinition {
  width: number;
  height: number;
  cells: ArenaCell[][];
  teamStarts: Partial<Record<"A" | "B" | "C", Point>>;
  refuelPoints: Point[];
  obstaclePoints: Point[];
}

export interface RobotConfig {
  maxSpeed: number;
  manoeuvreSpeed: number;
  maxRange: number;
  maxArmour: number;
  acceleration: number;
  invisibility: boolean;
}

export interface MatchEntrant {
  id: string;
  name: string;
  teamId?: "A" | "B" | "C";
  config?: Partial<RobotConfig>;
}

export enum ShellOutcome {
  Missed = "missed",
  HitWall = "hit_wall",
  CloseBlast = "close_blast",
  NearMiss = "near_miss",
  DirectHit = "direct_hit",
  InFlight = "in_flight",
  NotKnown = "not_known"
}

export interface MatchRobotState {
  id: string;
  name: string;
  teamId?: "A" | "B" | "C";
  x: number;
  y: number;
  heading: number;
  speed: number;
  targetSpeed: number;
  battery: number;
  armour: number;
  maxArmour: number;
  alive: boolean;
  slowed: boolean;
  recharging: boolean;
  invisible: boolean;
  invisibilityEnabled: boolean;
  invisibilityTicks: number;
  shellsInFlight: number;
  shellsLeft: number;
  lastFireTick: number;
  lastScanTick: number;
  lastShellState: ShellOutcome;
  obstacleState: ObstacleState;
  obstacleId: number | null;
  config: RobotConfig;
}

export interface MatchObstacleState {
  id: number;
  x: number;
  y: number;
  state: ObstacleState | "free";
  ownerRobotId: string | null;
}

export interface MatchShellState {
  id: number;
  firerId: string;
  x: number;
  y: number;
  heading: number;
  rangeRemaining: number;
  alive: boolean;
}

export interface MatchEvent {
  tick: number;
  type:
    | "match.created"
    | "robot.spawned"
    | "robot.moved"
    | "robot.collision"
    | "robot.damaged"
    | "robot.recharged"
    | "robot.destroyed"
    | "robot.scanned"
    | "robot.fired"
    | "robot.invisibility_changed"
    | "robot.obstacle_state_changed"
    | "shell.moved"
    | "shell.resolved"
    | "match.finished";
  payload: Record<string, number | string | boolean | null>;
}

export interface MatchResult {
  finished: boolean;
  winnerRobotId: string | null;
  winnerTeamId: "A" | "B" | "C" | null;
  reason: "last_robot" | "last_team" | "time_limit" | null;
}

export interface MatchState {
  seed: number;
  rngState: number;
  tick: number;
  arena: ArenaDefinition;
  robots: MatchRobotState[];
  obstacles: MatchObstacleState[];
  shells: MatchShellState[];
  nextShellId: number;
  events: MatchEvent[];
  result: MatchResult;
}

export interface MovementCommand {
  kind: "movement";
  targetSpeed: number;
  heading: number;
}

export interface NoopCommand {
  kind: "noop";
}

export interface ScanCommand {
  kind: "scan";
  heading: number;
  resolution: number;
}

export interface ShootCommand {
  kind: "shoot";
  heading: number;
  range: number;
}

export interface InvisibilityCommand {
  kind: "invisibility";
  enabled: boolean;
}

export interface PickupObstacleCommand {
  kind: "pickup_obstacle";
  direction: number;
}

export interface DropObstacleCommand {
  kind: "drop_obstacle";
  direction: number;
}

export interface HoldObstacleCommand {
  kind: "hold_obstacle";
  enabled: boolean;
}

export type RobotCommand =
  | MovementCommand
  | NoopCommand
  | ScanCommand
  | ShootCommand
  | InvisibilityCommand
  | PickupObstacleCommand
  | DropObstacleCommand
  | HoldObstacleCommand;

export type CommandMap = Record<string, RobotCommand | undefined>;
