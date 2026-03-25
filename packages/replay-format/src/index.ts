import type { MatchEvent } from "@pcrobots/engine";

export interface ReplayFile {
  version: 1;
  matchId: string;
  engineVersion: string;
  seed: number;
  createdAt: string;
  events: MatchEvent[];
}
