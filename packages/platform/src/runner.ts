import { processTournamentMatchCompletionWithClient } from "./competitions.js";
import { type Database, type MatchRecord } from "./db.js";
import { applyEliminationTiebreak } from "./execution.js";
import { executeIsolatedMatch } from "./sandbox.js";

export { applyEliminationTiebreak } from "./execution.js";

export interface ExecuteStoredMatchResult {
  match: MatchRecord;
  followUpMatchIds: string[];
}

export async function executeStoredMatch(database: Database, matchId: string): Promise<ExecuteStoredMatchResult> {
  const match = await database.getMatch(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} was not found`);
  }

  const claimed = await database.startMatchRun(matchId);
  if (!claimed) {
    const current = await database.getMatch(matchId);
    throw new Error(`Match ${matchId} is not runnable from status ${current?.status ?? "missing"}`);
  }

  const followUpMatchIds: string[] = [];

  try {
    const simulated = executeIsolatedMatch(match);
    const completed = await database.completeRunningMatchRun(
      matchId,
      {
        result: simulated.result,
        events: simulated.events,
        errorMessage: null
      },
      match.tournamentId
        ? async (client) => {
            followUpMatchIds.push(...(await processTournamentMatchCompletionWithClient(client, matchId)));
          }
        : undefined
    );
    if (!completed) {
      throw new Error(`Match ${matchId} could not be marked completed from its current status`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await database.updateRunningMatchRun(matchId, "failed", {
      result: null,
      events: null,
      errorMessage: message
    });

    if (!failed) {
      console.error("match failure could not be persisted", { matchId, error: message });
    }

    throw error;
  }

  const updated = await database.getMatch(matchId);
  if (!updated) {
    throw new Error(`Match ${matchId} disappeared after execution`);
  }

  return {
    match: updated,
    followUpMatchIds
  };
}

