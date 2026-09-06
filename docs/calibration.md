# Implementer calibration

Use this log to compare implementer model and reasoning settings on real Beanflow
leaves. It is directional evidence, not a controlled benchmark. Repository difficulty,
Bean quality, parent strictness, and policy changes can dominate small differences.

Record one row only after the parent accepts the leaf. Count an implementer turn when
the worker returns an outcome. Count a rejected completion when the parent finds a
required behavior or proof gap after `BEANFLOW_OUTCOME: completed`.

| Run | Leaf | Model | Effort | Approx. wall time | Invalid guidance bounces | Valid guidance questions | Rejected completions | First completion accepted |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `sports-l5f1-1788624375436` | `sports-6xr3` | GPT-5.6 Luna | medium | 56 min | 3 | 2 | 5 | no |

For each row, also record the useful parent-review findings and important caveats.

## sports-6xr3 notes

Parent review caught missing HTTP-boundary coverage, competing projection types,
an empty image source, incomplete invalid-state coverage, missing quota and restore
proof, cleanup double-counting, a legacy fixture presented as typed-media coverage,
conditional assertions that could silently skip, and overlapping retention fixtures
that masked one pruning branch.

This was the first deliberately strict calibration run. The Bean boundary and several
Beanflow policies changed during the leaf, so its 56-minute duration and rejection
count are a useful medium-effort baseline but not a clean model-only comparison.

The next newly spawned implementer uses GPT-5.6 Luna at extra-high reasoning. Compare
its first one-leaf work set using the same columns. The useful signal is whether extra
reasoning reduces invalid bounces and rejected completion claims enough to offset any
increase in turn latency.

If extra high does not materially improve first-pass acceptance or parent-review
findings, test Luna at low reasoning on a comparable one-leaf run. Low plus the
mechanical guidance bounce may win when extra turns are cheap. Reject it if plausible
but incomplete completion claims increase enough to consume more parent review or
accepted-leaf wall time.
