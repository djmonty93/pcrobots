import {
  ARENA_SIZE,
  ArenaCell,
  BATTERY_CHARGE_PER_TICK,
  BATTERY_START,
  INTERNAL_UNITS_PER_CELL,
  MAX_INVISIBLE_TICKS,
  MAX_SCAN_RESOLUTION,
  ObstacleState,
  SHELL_RANGE_DECAY,
  SHELL_RELOAD_TICKS,
  SHELL_SPEED,
  SHELLS_IN_FLIGHT_LIMIT,
  ShellOutcome,
  type ArenaDefinition,
  type CommandMap,
  type DropObstacleCommand,
  type HoldObstacleCommand,
  type InvisibilityCommand,
  type MatchEntrant,
  type MatchEvent,
  type MatchObstacleState,
  type MatchResult,
  type MatchRobotState,
  type MatchShellState,
  type MatchState,
  type PickupObstacleCommand,
  type Point,
  type RobotCommand,
  type RobotConfig,
  type ScanCommand,
  type ShootCommand
} from "./types.js";

const DEFAULT_CONFIG: RobotConfig = {
  maxSpeed: 100,
  manoeuvreSpeed: 50,
  maxRange: 700,
  maxArmour: 100,
  acceleration: 10,
  invisibility: false
};

const OBSTACLE_DIRECTIONS: Point[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHeading(heading: number): number {
  const normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function normalizeDirection(direction: number): number {
  const normalized = direction % OBSTACLE_DIRECTIONS.length;
  return normalized < 0 ? normalized + OBSTACLE_DIRECTIONS.length : normalized;
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function isPassable(cell: ArenaCell): boolean {
  return cell !== ArenaCell.Wall && cell !== ArenaCell.Obstacle;
}

function toCellCoordinate(internal: number): number {
  return Math.floor(internal / INTERNAL_UNITS_PER_CELL);
}

function toArenaPoint(entity: { x: number; y: number }): Point {
  return {
    x: toCellCoordinate(entity.x),
    y: toCellCoordinate(entity.y)
  };
}

function createEvent(tick: number, type: MatchEvent["type"], payload: MatchEvent["payload"]): MatchEvent {
  return { tick, type, payload };
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleBetween(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return angle < 0 ? angle + 360 : angle;
}

function angleDelta(a: number, b: number): number {
  const delta = Math.abs(normalizeHeading(a) - normalizeHeading(b));
  return Math.min(delta, 360 - delta);
}

function nextRandom(state: MatchState): number {
  state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
  let value = state.rngState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function nextRandomInt(state: MatchState, maxExclusive: number): number {
  return Math.floor(nextRandom(state) * maxExclusive);
}

function pickSpawnPoint(
  arena: ArenaDefinition,
  entrant: MatchEntrant,
  occupied: Set<string>,
  nextInt: (maxExclusive: number) => number
): Point {
  const teamStart = entrant.teamId ? arena.teamStarts[entrant.teamId] : undefined;

  if (teamStart) {
    const key = pointKey(teamStart);
    if (!occupied.has(key)) {
      occupied.add(key);
      return teamStart;
    }
  }

  for (let attempts = 0; attempts < 10000; attempts += 1) {
    const point = { x: nextInt(ARENA_SIZE), y: nextInt(ARENA_SIZE) };
    const key = pointKey(point);
    if (occupied.has(key)) {
      continue;
    }
    if (!isPassable(arena.cells[point.y][point.x])) {
      continue;
    }
    occupied.add(key);
    return point;
  }

  throw new Error("Unable to place robot on arena");
}

function getRobotById(state: MatchState, robotId: string): MatchRobotState {
  const robot = state.robots.find((entry) => entry.id === robotId);
  if (!robot) {
    throw new Error(`Unknown robot ${robotId}`);
  }
  return robot;
}

function getObstacleById(state: MatchState, obstacleId: number): MatchObstacleState {
  const obstacle = state.obstacles.find((entry) => entry.id === obstacleId);
  if (!obstacle) {
    throw new Error(`Unknown obstacle ${obstacleId}`);
  }
  return obstacle;
}

function findFreeObstacleAt(state: MatchState, point: Point): MatchObstacleState | undefined {
  return state.obstacles.find(
    (obstacle) => obstacle.state === "free" && obstacle.x === point.x && obstacle.y === point.y
  );
}

function createEmptyResult(): MatchResult {
  return {
    finished: false,
    winnerRobotId: null,
    winnerTeamId: null,
    reason: null
  };
}

function updateShellOutcome(current: ShellOutcome, next: ShellOutcome): ShellOutcome {
  const rank: Record<ShellOutcome, number> = {
    [ShellOutcome.NotKnown]: -1,
    [ShellOutcome.InFlight]: 0,
    [ShellOutcome.Missed]: 1,
    [ShellOutcome.HitWall]: 1,
    [ShellOutcome.CloseBlast]: 2,
    [ShellOutcome.NearMiss]: 3,
    [ShellOutcome.DirectHit]: 4
  };

  return rank[next] > rank[current] ? next : current;
}

function isStepMatchOptions(value: CommandMap | StepMatchOptions): value is StepMatchOptions {
  if (!("commands" in value)) {
    return false;
  }

  const candidate = (value as { commands?: unknown }).commands;
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}

function emitObstacleStateChanged(state: MatchState, robot: MatchRobotState): void {
  state.events.push(
    createEvent(state.tick, "robot.obstacle_state_changed", {
      robotId: robot.id,
      obstacleState: robot.obstacleState,
      obstacleId: robot.obstacleId
    })
  );
}

function releaseHeldObstacles(state: MatchState, robot: MatchRobotState): void {
  let heldCount = 0;
  for (const obstacle of state.obstacles) {
    if (obstacle.state === ObstacleState.Holding && obstacle.ownerRobotId === robot.id) {
      obstacle.state = "free";
      obstacle.ownerRobotId = null;
      heldCount += 1;
    }
  }

  if (heldCount > 0 || robot.obstacleState === ObstacleState.Holding) {
    robot.obstacleState = ObstacleState.None;
    robot.obstacleId = null;
    emitObstacleStateChanged(state, robot);
  }
}

function tryDropCarriedObstacle(state: MatchState, robot: MatchRobotState, direction: number): boolean {
  if (robot.obstacleState !== ObstacleState.Carrying || robot.obstacleId === null) {
    return false;
  }

  const arenaPoint = toArenaPoint(robot);
  const offset = OBSTACLE_DIRECTIONS[normalizeDirection(direction)];
  const targetPoint = { x: arenaPoint.x + offset.x, y: arenaPoint.y + offset.y };

  if (
    targetPoint.x < 0 ||
    targetPoint.y < 0 ||
    targetPoint.x >= ARENA_SIZE ||
    targetPoint.y >= ARENA_SIZE ||
    state.arena.cells[targetPoint.y][targetPoint.x] !== ArenaCell.Free ||
    findFreeObstacleAt(state, targetPoint)
  ) {
    return false;
  }

  const obstacle = getObstacleById(state, robot.obstacleId);
  obstacle.x = targetPoint.x;
  obstacle.y = targetPoint.y;
  obstacle.state = "free";
  obstacle.ownerRobotId = null;

  state.arena.cells[targetPoint.y][targetPoint.x] = ArenaCell.Obstacle;
  robot.obstacleState = ObstacleState.None;
  robot.obstacleId = null;
  return true;
}

function applyDamageSideEffects(state: MatchState, robot: MatchRobotState, amount: number): void {
  if (robot.obstacleState === ObstacleState.Carrying) {
    if (nextRandomInt(state, 30) < amount) {
      if (tryDropCarriedObstacle(state, robot, nextRandomInt(state, OBSTACLE_DIRECTIONS.length))) {
        emitObstacleStateChanged(state, robot);
      }
    }
  }

  if (robot.obstacleState === ObstacleState.Holding) {
    if (nextRandomInt(state, 300) < amount) {
      releaseHeldObstacles(state, robot);
    }
  }
}

export interface CreateMatchOptions {
  seed: number;
  arena: ArenaDefinition;
  entrants: MatchEntrant[];
}

export function createMatchState(options: CreateMatchOptions): MatchState {
  let placementSeed = options.seed >>> 0;
  const nextPlacementInt = (maxExclusive: number): number => {
    placementSeed = (placementSeed + 0x6d2b79f5) >>> 0;
    let value = placementSeed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return Math.floor((((value ^ (value >>> 14)) >>> 0) / 4294967296) * maxExclusive);
  };

  const occupied = new Set<string>();
  const robots: MatchRobotState[] = options.entrants.map((entrant) => {
    const spawn = pickSpawnPoint(options.arena, entrant, occupied, nextPlacementInt);
    const config = { ...DEFAULT_CONFIG, ...entrant.config };

    return {
      id: entrant.id,
      name: entrant.name,
      teamId: entrant.teamId,
      x: spawn.x * INTERNAL_UNITS_PER_CELL,
      y: spawn.y * INTERNAL_UNITS_PER_CELL,
      heading: 0,
      speed: 0,
      targetSpeed: 0,
      battery: BATTERY_START,
      armour: config.maxArmour,
      maxArmour: config.maxArmour,
      alive: true,
      slowed: false,
      recharging: false,
      invisible: false,
      invisibilityEnabled: config.invisibility,
      invisibilityTicks: 0,
      shellsInFlight: 0,
      shellsLeft: config.invisibility ? 900 : 1000,
      lastFireTick: -SHELL_RELOAD_TICKS,
      lastScanTick: -1,
      lastShellState: ShellOutcome.NotKnown,
      obstacleState: ObstacleState.None,
      obstacleId: null,
      config
    };
  });

  const obstacles: MatchObstacleState[] = options.arena.obstaclePoints.map((point, index) => ({
    id: index,
    x: point.x,
    y: point.y,
    state: "free",
    ownerRobotId: null
  }));

  const events: MatchEvent[] = [createEvent(0, "match.created", { seed: options.seed })];
  for (const robot of robots) {
    events.push(
      createEvent(0, "robot.spawned", {
        robotId: robot.id,
        x: robot.x,
        y: robot.y,
        teamId: robot.teamId ?? null
      })
    );
  }

  return {
    seed: options.seed,
    rngState: placementSeed,
    tick: 0,
    arena: options.arena,
    robots,
    obstacles,
    shells: [],
    nextShellId: 1,
    events,
    result: createEmptyResult()
  };
}

function damageRobot(state: MatchState, robot: MatchRobotState, amount: number, cause: string): number {
  applyDamageSideEffects(state, robot, amount);

  robot.armour = Math.max(0, robot.armour - amount);
  state.events.push(
    createEvent(state.tick, "robot.damaged", {
      robotId: robot.id,
      amount,
      cause,
      armour: robot.armour
    })
  );

  if (robot.armour === 0 && robot.alive) {
    robot.alive = false;
    robot.speed = 0;
    robot.targetSpeed = 0;

    if (robot.obstacleState === ObstacleState.Carrying) {
      for (let attempt = 0; attempt < 10 && robot.obstacleState === ObstacleState.Carrying; attempt += 1) {
        if (tryDropCarriedObstacle(state, robot, nextRandomInt(state, OBSTACLE_DIRECTIONS.length))) {
          emitObstacleStateChanged(state, robot);
        }
      }
    }
    if (robot.obstacleState === ObstacleState.Holding) {
      releaseHeldObstacles(state, robot);
    }

    const reward = robot.battery;
    robot.battery = 0;
    state.events.push(
      createEvent(state.tick, "robot.destroyed", {
        robotId: robot.id,
        cause
      })
    );
    return reward;
  }

  return 0;
}

function applyMovementIntent(robot: MatchRobotState, command: RobotCommand | undefined): void {
  if (!command || command.kind !== "movement") {
    return;
  }

  if (robot.obstacleState === ObstacleState.Holding) {
    robot.targetSpeed = 0;
    return;
  }

  const speedLimit =
    robot.obstacleState === ObstacleState.Carrying ? Math.floor(robot.config.maxSpeed / 2) : robot.config.maxSpeed;
  const manoeuvreLimit =
    robot.obstacleState === ObstacleState.Carrying
      ? Math.floor(robot.config.manoeuvreSpeed / 2)
      : robot.config.manoeuvreSpeed;

  robot.targetSpeed = clamp(command.targetSpeed, 0, speedLimit);
  if (robot.speed <= manoeuvreLimit) {
    robot.heading = normalizeHeading(command.heading);
  }
}

function performScan(state: MatchState, robot: MatchRobotState, command: ScanCommand): void {
  if (!robot.alive) {
    return;
  }

  if (robot.invisible) {
    state.events.push(
      createEvent(state.tick, "robot.scanned", {
        robotId: robot.id,
        detectedRobotId: null,
        range: -1,
        heading: normalizeHeading(command.heading),
        resolution: 0
      })
    );
    return;
  }

  const heading = normalizeHeading(command.heading);
  const resolution = clamp(command.resolution, 0, MAX_SCAN_RESOLUTION);
  let nearest: MatchRobotState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of state.robots) {
    if (candidate.id === robot.id || !candidate.alive || candidate.invisible) {
      continue;
    }

    const candidateHeading = angleBetween(robot, candidate);
    if (angleDelta(candidateHeading, heading) > resolution) {
      continue;
    }

    const distance = distanceBetween(robot, candidate);
    if (distance <= nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  robot.lastScanTick = state.tick;
  state.events.push(
    createEvent(state.tick, "robot.scanned", {
      robotId: robot.id,
      detectedRobotId: nearest?.id ?? null,
      range: nearest ? Math.floor(nearestDistance / 100) : -1,
      heading,
      resolution
    })
  );
}

function performShoot(state: MatchState, robot: MatchRobotState, command: ShootCommand): void {
  if (!robot.alive || robot.invisible) {
    return;
  }

  if (robot.shellsLeft <= 0 || robot.shellsInFlight >= SHELLS_IN_FLIGHT_LIMIT) {
    return;
  }

  if (robot.lastFireTick + SHELL_RELOAD_TICKS > state.tick) {
    return;
  }

  const shellRange = clamp(command.range, 0, robot.config.maxRange);
  const shell: MatchShellState = {
    id: state.nextShellId,
    firerId: robot.id,
    x: robot.x,
    y: robot.y,
    heading: normalizeHeading(command.heading),
    rangeRemaining: shellRange,
    alive: true
  };

  state.nextShellId += 1;
  state.shells.push(shell);
  robot.shellsInFlight += 1;
  robot.shellsLeft -= 1;
  robot.lastFireTick = state.tick;
  robot.lastShellState = ShellOutcome.InFlight;

  state.events.push(
    createEvent(state.tick, "robot.fired", {
      robotId: robot.id,
      shellId: shell.id,
      heading: shell.heading,
      range: shell.rangeRemaining
    })
  );
}

function performInvisibility(state: MatchState, robot: MatchRobotState, command: InvisibilityCommand): void {
  if (!robot.alive || !robot.invisibilityEnabled) {
    return;
  }

  let nextValue = command.enabled;
  if (nextValue && !robot.invisible && robot.invisibilityTicks > 0) {
    nextValue = false;
  }

  robot.invisible = nextValue;
  state.events.push(
    createEvent(state.tick, "robot.invisibility_changed", {
      robotId: robot.id,
      enabled: robot.invisible
    })
  );
}

function performPickupObstacle(state: MatchState, robot: MatchRobotState, command: PickupObstacleCommand): void {
  if (!robot.alive || robot.obstacleState === ObstacleState.Carrying) {
    return;
  }

  if (robot.obstacleState === ObstacleState.Holding) {
    releaseHeldObstacles(state, robot);
  }

  const arenaPoint = toArenaPoint(robot);
  const offset = OBSTACLE_DIRECTIONS[normalizeDirection(command.direction)];
  const targetPoint = { x: arenaPoint.x + offset.x, y: arenaPoint.y + offset.y };
  if (
    targetPoint.x < 0 ||
    targetPoint.y < 0 ||
    targetPoint.x >= ARENA_SIZE ||
    targetPoint.y >= ARENA_SIZE ||
    state.arena.cells[targetPoint.y][targetPoint.x] !== ArenaCell.Obstacle
  ) {
    return;
  }

  const obstacle = findFreeObstacleAt(state, targetPoint);
  if (!obstacle) {
    return;
  }

  obstacle.state = ObstacleState.Carrying;
  obstacle.ownerRobotId = robot.id;
  robot.obstacleState = ObstacleState.Carrying;
  robot.obstacleId = obstacle.id;
  robot.speed = Math.floor(robot.speed / 2);
  robot.targetSpeed = Math.floor(robot.targetSpeed / 2);
  state.arena.cells[targetPoint.y][targetPoint.x] = ArenaCell.Free;
  emitObstacleStateChanged(state, robot);
}

function performDropObstacle(state: MatchState, robot: MatchRobotState, command: DropObstacleCommand): void {
  if (tryDropCarriedObstacle(state, robot, command.direction)) {
    emitObstacleStateChanged(state, robot);
  }
}

function performHoldObstacle(state: MatchState, robot: MatchRobotState, command: HoldObstacleCommand): void {
  if (!robot.alive || robot.obstacleState === ObstacleState.Carrying) {
    return;
  }

  if (!command.enabled) {
    releaseHeldObstacles(state, robot);
    return;
  }

  const arenaPoint = toArenaPoint(robot);
  let heldCount = 0;
  for (const obstacle of state.obstacles) {
    if (obstacle.state !== "free") {
      continue;
    }

    if (Math.abs(obstacle.x - arenaPoint.x) <= 1 && Math.abs(obstacle.y - arenaPoint.y) <= 1) {
      obstacle.state = ObstacleState.Holding;
      obstacle.ownerRobotId = robot.id;
      heldCount += 1;
    }
  }

  if (heldCount > 0) {
    robot.obstacleState = ObstacleState.Holding;
    robot.speed = 0;
    robot.targetSpeed = 0;
  } else {
    robot.obstacleState = ObstacleState.None;
  }
  robot.obstacleId = null;
  emitObstacleStateChanged(state, robot);
}

function applyCommands(state: MatchState, commands: CommandMap): void {
  for (const robot of state.robots) {
    if (!robot.alive) {
      continue;
    }

    const command = commands[robot.id];
    applyMovementIntent(robot, command);

    if (!command || command.kind === "noop" || command.kind === "movement") {
      continue;
    }

    switch (command.kind) {
      case "scan":
        performScan(state, robot, command);
        break;
      case "shoot":
        performShoot(state, robot, command);
        break;
      case "invisibility":
        performInvisibility(state, robot, command);
        break;
      case "pickup_obstacle":
        performPickupObstacle(state, robot, command);
        break;
      case "drop_obstacle":
        performDropObstacle(state, robot, command);
        break;
      case "hold_obstacle":
        performHoldObstacle(state, robot, command);
        break;
    }
  }
}

function updateRobotForTick(state: MatchState, robot: MatchRobotState): void {
  if (!robot.alive) {
    return;
  }

  const wasSlowed = robot.slowed;

  if (!robot.invisible) {
    robot.battery = Math.min(BATTERY_START, robot.battery + BATTERY_CHARGE_PER_TICK);
    if (robot.invisibilityTicks > 0) {
      robot.invisibilityTicks -= 1;
    }
  } else {
    robot.invisibilityTicks += 1;
    if (robot.invisibilityTicks > MAX_INVISIBLE_TICKS) {
      robot.invisible = false;
      state.events.push(
        createEvent(state.tick, "robot.invisibility_changed", {
          robotId: robot.id,
          enabled: false
        })
      );
    }
  }

  robot.battery -= robot.speed;
  if (robot.battery < 0) {
    robot.battery = 0;
    robot.targetSpeed = 0;
    robot.speed = 0;
  }

  const obstaclePenalty =
    robot.obstacleState === ObstacleState.Carrying
      ? 1
      : robot.obstacleState === ObstacleState.Holding
        ? 2
        : 0;

  const delta = robot.targetSpeed - robot.speed;
  if (delta !== 0) {
    const acceleration = Math.max(1, robot.config.acceleration >> obstaclePenalty);
    robot.speed += clamp(delta, -acceleration, acceleration);
  }

  const radians = (robot.heading * Math.PI) / 180;
  const oldX = robot.x;
  const oldY = robot.y;
  robot.x += Math.round(Math.cos(radians) * robot.speed);
  robot.y += Math.round(Math.sin(radians) * robot.speed);

  const cellX = toCellCoordinate(robot.x);
  const cellY = toCellCoordinate(robot.y);

  if (cellX < 0 || cellY < 0 || cellX >= ARENA_SIZE || cellY >= ARENA_SIZE) {
    robot.x = oldX;
    robot.y = oldY;
    robot.speed = 0;
    robot.targetSpeed = 0;
    state.events.push(createEvent(state.tick, "robot.collision", { robotId: robot.id, cause: "bounds" }));
    damageRobot(state, robot, 1, "collision");
    return;
  }

  const cell = state.arena.cells[cellY][cellX];
  if (!isPassable(cell)) {
    robot.x = oldX;
    robot.y = oldY;
    robot.speed = 0;
    robot.targetSpeed = 0;
    state.events.push(createEvent(state.tick, "robot.collision", { robotId: robot.id, cause: cell }));
    damageRobot(state, robot, 1, "collision");
    return;
  }

  switch (cell) {
    case ArenaCell.Free:
      robot.slowed = false;
      robot.recharging = false;
      break;
    case ArenaCell.Slow:
      if (!wasSlowed) {
        robot.speed = Math.floor(robot.speed / 2);
      }
      robot.slowed = true;
      break;
    case ArenaCell.Damage:
      damageRobot(state, robot, 1, "arena_damage");
      break;
    case ArenaCell.Refuel:
      if (robot.speed === 0) {
        robot.battery = Math.min(BATTERY_START, robot.battery + 100);
        robot.recharging = true;
        state.events.push(
          createEvent(state.tick, "robot.recharged", {
            robotId: robot.id,
            battery: robot.battery
          })
        );
      }
      break;
    default:
      break;
  }

  state.events.push(
    createEvent(state.tick, "robot.moved", {
      robotId: robot.id,
      x: robot.x,
      y: robot.y,
      heading: robot.heading,
      speed: robot.speed
    })
  );
}

function resolveShellExplosion(state: MatchState, shell: MatchShellState): void {
  const firer = getRobotById(state, shell.firerId);
  let shellOutcome = ShellOutcome.Missed;

  for (const target of state.robots) {
    if (!target.alive) {
      continue;
    }

    const distance = distanceBetween(shell, target);
    if (distance >= 5000) {
      continue;
    }

    let multiplier = 1;
    if (target.obstacleState === ObstacleState.Carrying && nextRandomInt(state, 4) === 0) {
      multiplier = 0;
    }

    let damage = 2;
    let outcome = ShellOutcome.CloseBlast;
    if (distance < 2500) {
      damage = 8;
      outcome = ShellOutcome.NearMiss;
      if (distance < 500) {
        damage = 25;
        outcome = ShellOutcome.DirectHit;
      }
    }

    shellOutcome = updateShellOutcome(shellOutcome, outcome);

    const reward = damageRobot(state, target, damage * multiplier, firer.id);
    if (reward > 0) {
      firer.battery = Math.min(BATTERY_START, firer.battery + reward);
    }
  }

  firer.lastShellState = shellOutcome;
  state.events.push(
    createEvent(state.tick, "shell.resolved", {
      shellId: shell.id,
      firerId: shell.firerId,
      outcome: shellOutcome
    })
  );
}

function updateShellsForTick(state: MatchState): void {
  for (const shell of state.shells) {
    if (!shell.alive) {
      continue;
    }

    const radians = (shell.heading * Math.PI) / 180;
    shell.x += Math.round(Math.cos(radians) * SHELL_SPEED);
    shell.y += Math.round(Math.sin(radians) * SHELL_SPEED);
    shell.rangeRemaining -= SHELL_RANGE_DECAY;

    const cellX = toCellCoordinate(shell.x);
    const cellY = toCellCoordinate(shell.y);
    const outOfBounds = cellX < 0 || cellY < 0 || cellX >= ARENA_SIZE || cellY >= ARENA_SIZE;
    const blocked = !outOfBounds && !isPassable(state.arena.cells[cellY][cellX]);

    if (outOfBounds || blocked || shell.rangeRemaining <= 0) {
      shell.alive = false;
      const firer = getRobotById(state, shell.firerId);
      firer.shellsInFlight = Math.max(0, firer.shellsInFlight - 1);

      if (shell.rangeRemaining <= 0) {
        resolveShellExplosion(state, shell);
      } else {
        firer.lastShellState = ShellOutcome.HitWall;
        state.events.push(
          createEvent(state.tick, "shell.resolved", {
            shellId: shell.id,
            firerId: shell.firerId,
            outcome: ShellOutcome.HitWall
          })
        );
      }

      continue;
    }

    state.events.push(
      createEvent(state.tick, "shell.moved", {
        shellId: shell.id,
        x: shell.x,
        y: shell.y,
        rangeRemaining: shell.rangeRemaining
      })
    );
  }
}

function updateMatchResult(state: MatchState): void {
  if (state.result.finished) {
    return;
  }

  const aliveRobots = state.robots.filter((robot) => robot.alive);
  if (aliveRobots.length <= 1) {
    state.result = {
      finished: true,
      winnerRobotId: aliveRobots[0]?.id ?? null,
      winnerTeamId: aliveRobots[0]?.teamId ?? null,
      reason: "last_robot"
    };
  } else {
    const aliveTeams = new Set(
      aliveRobots
        .map((robot) => robot.teamId)
        .filter((teamId): teamId is "A" | "B" | "C" => Boolean(teamId))
    );

    if (aliveTeams.size === 1 && aliveRobots.some((robot) => robot.teamId)) {
      const [winnerTeamId] = aliveTeams;
      state.result = {
        finished: true,
        winnerRobotId: null,
        winnerTeamId,
        reason: "last_team"
      };
    }
  }

  if (state.result.finished) {
    state.events.push(
      createEvent(state.tick, "match.finished", {
        winnerRobotId: state.result.winnerRobotId,
        winnerTeamId: state.result.winnerTeamId,
        reason: state.result.reason
      })
    );
  }
}

export interface StepMatchOptions {
  commands: CommandMap;
  timeLimit?: number;
}

export function stepMatch(state: MatchState, options: CommandMap | StepMatchOptions): MatchState {
  if (state.result.finished) {
    return state;
  }

  const normalized: StepMatchOptions = isStepMatchOptions(options)
    ? options
    : { commands: options };

  state.tick += 1;
  applyCommands(state, normalized.commands);

  for (const robot of state.robots) {
    updateRobotForTick(state, robot);
  }

  updateShellsForTick(state);

  if (typeof normalized.timeLimit === "number" && state.tick >= normalized.timeLimit && !state.result.finished) {
    state.result = {
      finished: true,
      winnerRobotId: null,
      winnerTeamId: null,
      reason: "time_limit"
    };
    state.events.push(
      createEvent(state.tick, "match.finished", {
        winnerRobotId: null,
        winnerTeamId: null,
        reason: "time_limit"
      })
    );
    return state;
  }

  updateMatchResult(state);
  return state;
}
