// Beanflow Pi extension: restore run state across sessions, continue a live
// run on agent_settled while eligible work remains, pause on an Esc-aborted
// turn, and expose the beanflow tool (status, resume, refresh, landing).
//
// Loaded by Pi directly as a .ts extension. The core logic is compiled to
// dist/ and imported below; run `pnpm build` before loading.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
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
import { statusOf } from "../dist/core/runstate.js";
import { parseOperation } from "../dist/core/tool.js";
import { checkBounds, shouldStop } from "../dist/core/safety.js";
import { stateDir } from "../dist/core/runstate.js";

export default function (pi: ExtensionAPI) {
  pi.on("agent_settled", async (_event, ctx) => {
    const runId = activeRunId();
    if (!runId) return;

    const state = loadRunState(runId);
    const entries = ctx.sessionManager.getBranch() as SessionEntry[];
    const lastStopReason = lastAssistantStopReason(entries);

    if (shouldStop(checkBounds(state, stateDir(), new Date().toISOString()))) {
      persistRunState({ ...state, phase: "paused", updatedAt: new Date().toISOString() });
      return;
    }

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

  pi.registerTool({
    name: "beanflow",
    label: "Beanflow",
    description:
      "Drive a Beanflow run with a plain-language request: check status, resume, refresh the manifest, or land.",
    parameters: Type.Object({
      request: Type.String({
        description: "Plain-language request, e.g. 'show status', 'resume', 'refresh', or 'land'.",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const op = parseOperation(params.request);
      const runId = activeRunId();

      switch (op) {
        case "status": {
          if (!runId) {
            return { content: [{ type: "text", text: "No active beanflow run." }], details: {} };
          }
          const state = loadRunState(runId);
          const s = statusOf(state);
          const text = `Run ${runId}: phase=${s.phase}, selected=${s.selectedLeaf?.id ?? "none"}, blockers=${s.blockers.length}.`;
          return { content: [{ type: "text", text }], details: {} };
        }
        case "resume": {
          if (!runId) {
            return { content: [{ type: "text", text: "No active beanflow run to resume." }], details: {} };
          }
          const state = loadRunState(runId);
          if (state.phase === "paused") {
            persistRunState({ ...state, phase: "running", updatedAt: new Date().toISOString() });
          }
          return { content: [{ type: "text", text: "Resuming the beanflow run." }], details: {} };
        }
        case "refresh": {
          return {
            content: [
              {
                type: "text",
                text: "Refresh is an explicit re-freeze: re-discover Beans, re-freeze the manifest from the audited parent, and persist the new state. The agent performs this per the beanflow skill.",
              },
            ],
            details: {},
          };
        }
        case "land": {
          return {
            content: [
              {
                type: "text",
                text: "Landing requires separate owner approval and follows repository merge policy. The agent performs this per the beanflow skill.",
              },
            ],
            details: {},
          };
        }
        default:
          return {
            content: [{ type: "text", text: `Unrecognized beanflow request: ${params.request}` }],
            details: {},
          };
      }
    },
  });
}
