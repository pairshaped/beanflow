# Implementer calibration

Use this log to compare implementer model and reasoning settings on real Beanflow
leaves. It is directional evidence, not a controlled benchmark. Repository difficulty,
Bean quality, parent strictness, and policy changes can dominate small differences.

Record one row only after the parent accepts the leaf. Count an implementer turn when
the worker returns an outcome. Count a rejected completion when the parent finds a
required behavior or proof gap after `BEANFLOW_OUTCOME: completed`. Count a continuation
nudge when the worker remains active without filesystem or verification progress and
the parent has to tell it to resume already-decided work.

| Run | Leaf | Orchestrator | Orchestrator effort | Implementer | Implementer effort | Approx. wall time | Continuation nudges | Invalid guidance bounces | Valid guidance questions | Rejected completions | First completion accepted |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `sports-l5f1-1788624375436` | `sports-6xr3` | GPT-5.6 Sol | high | GPT-5.6 Luna | medium | 56 min | not recorded | 3 | 2 | 5 | no |
| `sports-l5f1-1788624375436` | `sports-f2xi` | GPT-5.6 Sol | high | GPT-5.6 Sol | low | about 80 min | 0 | 0 | 1 | 2 | no |
| `sports-l5f1-1788624375436` | `sports-tymd` | GPT-5.6 Sol | high | GPT-5.6 Sol | low | about 39 min | 0 | 0 | 0 | 2 | no |
| `sports-l5f1-1788624375436` | `sports-j06d` | GPT-5.6 Sol | high | GPT-5.6 Sol | low | about 35 min | 0 | 0 | 0 | 1 | no |

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

The persistent Luna-medium worker then carried the same task context into later
leaves. It prematurely completed the Carousel leaf several times and claimed the
provider-boundary leaf complete after adding only one test. Beginning with the next
new leaf, Beanflow creates a fresh implementer per leaf and reuses it only for that
leaf's repair loop. Treat this as a process change when comparing later rows: it gives
up cross-leaf conversational context to limit accumulated correction history and
compaction loss.

The next newly spawned implementer uses GPT-5.6 Sol at low reasoning. This replaces
the unrun Terra-medium and Luna-extra-high trials. Compare its first leaf
using the same columns. The useful signal is whether Sol's newer-generation continuity
reduces stalls and correction turns while low effort keeps accepted-leaf time and usage
competitive. Keep the orchestrator at GPT-5.6 Sol high so the implementer is the main
changed variable. This also tests whether using one model family for planning and
implementation reduces handoff friction despite the separate agent contexts.

Do not infer a model conclusion from wall time alone. A slower accepted first completion
can still beat a fast sequence of incomplete claims, while a polished report without
the required behavior is still a failure. If Sol low needs materially less babysitting,
keep it despite a higher nominal per-token price. If its continuation nudges and rejected
completion rate are similar to Luna medium, test Luna at extra-high reasoning next.
Benchmark intelligence and cost charts make Luna extra-high a plausible value point,
but this workflow must measure its slower wall time and long-horizon compliance directly.

## Sol-low provider leaf notes

Both Sol-low leaves ran continuously without a continuation nudge or invalid guidance
bounce. The social-provider leaf asked one valid question when Instagram did not offer
the requested profile-feed shape. The parent selected each provider's supported embed,
and the worker continued in the same leaf thread.

Continuity was better than the earlier Luna-medium run, but first-pass acceptance was
not. Parent review rejected both leaves twice. On `sports-f2xi`, it caught flattened
provider schemas, stale iframe naming, duplicate Rust serialization, and a generated
browser parser that rejected Rust's own Google Docs and OneDrive sandbox values. On
`sports-tymd`, it caught an EmailOctopus script mounted in the document head instead of
at the inline form location, a hard-coded Mailchimp field name and unusable fallback,
then a Gift Up test that invented an iframe and preserved detached checkout DOM instead
of using the provider's `.gift-up-target` contract.

A follow-up integration review found one more uncovered boundary: the provider tests
mounted each Hypertea program directly, but that does not prove a provider inserted by
the parent PublicApp during navigation is mounted, survives parent renders safely, and
is stopped when removed. The owning landing-composition Bean now requires a production
parent/child lifecycle test, and Beanflow now treats host-framework composition as a
separate acceptance boundary for provider work.

The approximate times use the prior accepted leaf commit and final accepted repair
commit, so they include parent review, provider research, repair turns, and cold-build
cost. They are useful end-to-end workflow measurements, not pure model runtime. Sol low
looks much better for persistence and guidance discipline, but this sample does not yet
support reducing parent review. The process now requires current first-party provider
contracts as the oracle for external integrations.

On `sports-j06d`, the worker completed continuously and ran the full formatter, build,
island, lint, typecheck, and Clippy gate without prompting. Parent review still found a
canonical link emitted in the body instead of the head, a stale `<html lang>` after
French SPA navigation, and a theme-order assertion that proved only the base stylesheet
rather than the configuration-selected Theme. One bounded repair fixed all three and
added hostile canonical-duplication, locale-transition, platform-Theme, and
Organization-Theme assertions. Independent focused checks passed. This leaf strengthens
the current conclusion: Sol low is persistent and responds well to concrete repair
batches, but a green implementer suite is not yet a substitute for parent boundary
review.
