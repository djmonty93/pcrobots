import type { RobotCommand } from "@pcrobots/engine";

export function normalizeAction(action: unknown): RobotCommand {
  if (!action || typeof action !== "object") {
    throw new Error("Bot returned a non-object action");
  }

  const candidate = action as Partial<RobotCommand> & Record<string, unknown>;
  switch (candidate.kind) {
    case "noop":
      return { kind: "noop" };
    case "movement":
      return {
        kind: "movement",
        targetSpeed: Number(candidate.targetSpeed ?? 0),
        heading: Number(candidate.heading ?? 0)
      };
    case "scan":
      return {
        kind: "scan",
        heading: Number(candidate.heading ?? 0),
        resolution: Number(candidate.resolution ?? 0)
      };
    case "shoot":
      return {
        kind: "shoot",
        heading: Number(candidate.heading ?? 0),
        range: Number(candidate.range ?? 0)
      };
    case "invisibility":
      return {
        kind: "invisibility",
        enabled: Boolean(candidate.enabled)
      };
    case "pickup_obstacle":
      return {
        kind: "pickup_obstacle",
        direction: Number(candidate.direction ?? 0)
      };
    case "drop_obstacle":
      return {
        kind: "drop_obstacle",
        direction: Number(candidate.direction ?? 0)
      };
    case "hold_obstacle":
      return {
        kind: "hold_obstacle",
        enabled: Boolean(candidate.enabled)
      };
    default:
      throw new Error(`Unsupported action kind: ${String(candidate.kind)}`);
  }
}
