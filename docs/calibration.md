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
| `sports-l5f1-1788624375436` | `sports-1l7l` | GPT-5.6 Sol | high | GPT-5.6 Sol | low | about 39 min | 1 | 0 | 1 | 1 | no |
| `sports-l5f1-1788624375436` | `sports-88qy` | GPT-5.6 Sol | high | GPT-5.6 Sol | low | about 93 min | 0 | 0 | 1 | 3 | no |
| `sports-l5f1-1788624375436` | `sports-uqed` | GPT-5.6 Sol | high | GPT-5.6 Sol | low | about 78 min | 1 | 0 | 0 | 2 | no |

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

On `sports-1l7l`, the worker asked one valid question because the accepted Website
configuration had only a landing component sequence while the Bean could have implied a
new generic shell-slot schema. The parent chose reference-only landing variants and a
fixed Contact route. After substantial implementation and an initial focused test, the
worker stayed marked active for several minutes without filesystem or verification
progress and did not answer a lightweight checkpoint. One explicit continuation nudge
resumed work. This is the first observed Sol-low continuation lapse in the run.

Parent review rejected the first completion because the reusable Contact component was
only a marker whose Rust and Hypertea renderers read the current route's Contact page.
That passed isolated tests but could not work when embedded in a future Landing page.
The same implementation also projected landing-only component data into every Contact
response and copied the canonical public-notice path-matching SQL into the Contact
module. The repair made each component payload self-contained, removed landing data and
Sponsor queries from Contact, moved the bounded Sponsor projection to a shared module,
and reused the existing path-aware notice loader. It removed more code than it added.
Independent focused Rust and Hypertea checks passed.

This leaf is another strong argument for keeping the parent boundary review. Sol low
handled a precise repair batch well and ran all required gates, but its green tests were
written around a route-coupled shape that would have forced the next leaf to refactor or
duplicate the work. The useful process signal is not only defect detection: review
prevented premature code from becoming an accepted dependency.

## sports-88qy notes

The worker asked one valid design question because the accepted configuration did not
yet define the requested landing variants. The parent bounded the new schema, clarified
which components were reference-only, and fixed the server-owned limits. The worker then
continued without a continuation nudge and consistently ran the full formatter, build,
Clippy, lint, typecheck, island, focused Rust, and browser gates.

The first completion was much larger than the prior leaves and its green tests concealed
a real server fallback failure. The Rust renderer converted each component to a String
and interpolated it through Hypertext's ordinary escaped-text path. Assertions passed
because they searched for attribute names inside escaped markup, while the browser looked
correct only after Hypertea mounted. The same completion gave identical Website
components duplicate VDOM keys, did not force the parent-render lifecycle boundary with
a script-backed provider, and placed shared public document and landing rendering under
the Contact route module. The first repair moved that ownership to a shared module,
removed the duplicate keys, and added two identical Gift Up children through PublicApp.

Two further reviews found friendly fallback fixtures. The first repair tested only one
Tab and one initially open Accordion item, so it omitted the hidden content Hypertea
retained. The second used an English Carousel with no link and a provider paragraph with
no safe destination, so it missed French alt selection, linked media, and provider
fallback links. The final tests use secondary and closed panels, French and English alt
values, a non-null Carousel link, and both script-backed and iframe provider links through
the composed public document boundary.

This leaf is strong evidence that Sol low is persistent but still needs skeptical parent
review for boundary ownership and adversarial fixture selection. Three rejected
completions is expensive in wall time even without continuation nudges. The useful result
is that each repair was narrow and the final code removed the route coupling instead of
adding a compatibility path. Beanflow now explicitly rejects route-owned shared
composition and server-markup tests that can pass on escaped HTML text.

## sports-uqed notes

The worker needed one lightweight status nudge but no design guidance. It caught and
fixed a real Hypertea reconciliation failure during its own 1440 by 1000 browser check,
then completed the Product list and detail migration with the required formatter,
build, Clippy, lint, typecheck, island, focused Rust, and full Rust gates.

Parent review rejected the first completion for three migration-parity gaps: the
available-credit alert disappeared, French Product navigation could never be active
because localized links were compared with an unlocalized route path, and Product cards
dropped the established Details action and semantic structure. The first repair fixed
all three. Parent review then rejected a second completion because the worker classified
the Product cart-count failure as future cart scope even though the current migration
had removed that existing shell behavior. The second repair projected the already
loaded count through the shared typed document and rendered it in both Rust and
Hypertea without adding a fetch or nested island.

The same narrow shell test group exposed four regressions from an earlier accepted leaf:
account navigation, signed-out login and language navigation, Google One Tap, and the
impersonation warning. This is evidence against accepting a full-suite failure count as
baseline without checking failures that name a changed route or replaced boundary.
Beanflow now requires those failures to reproduce at the recorded base commit or be
traced concretely to unchanged code. The earlier shared-shell leaf is being repaired
before new feature work continues.
