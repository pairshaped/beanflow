// Beanflow Pi extension: restore run state across sessions, continue a live
// run on agent_settled while eligible work remains, and pause on an Esc-aborted
// turn so agent_settled does not restart it.
//
// Loaded by Pi directly as a .ts extension. The core logic is compiled to
// dist/ and imported below; run `pnpm build` before loading.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import {
  decideContinuation,
  eligibleWorkRemains,
  isAbortedStopReason,
  lastAssistantStopReason,
  type SessionEntry,
} from "../dist/core/continuation.js";
import { discoverBeans } from "../dist/core/discovery.js";
import { activeRunId, loadRunState, persistRunState } from "../dist/core/runstate.js";

export default function (pi: ExtensionAPI) {
  pi.on("agent_settled", async (_event, ctx) => {
    const runId = activeRunId();
    if (!runId) return;

    const state = loadRunState(runId);
    const entries = ctx.sessionManager.getBranch() as SessionEntry[];
    const lastStopReason = lastAssistantStopReason(entries);

    if (isAbortedStopReason(lastStopReason) && state.phase !== "paused") {
      persistRunState({ ...state, phase: "paused", updatedAt: new Date().toISOString() });
      return;
    }

    const tree = discoverBeans(join(ctx.cwd, ".beans"));
    const eligible = eligibleWorkRemains(tree, state.manifest, state);
    const decision = decideContinuation({
      phase: state.phase,
      lastStopReason,
      eligibleWorkRemains: eligible,
    });

    if (decision.shouldContinue) {
      await pi.sendUserMessage("Continue the beanflow run: implement the next eligible leaf.", {
        deliverAs: "followUp",
      });
    }
  });
}
