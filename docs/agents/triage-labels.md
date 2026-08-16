# Triage Labels

The engineering skills use five canonical triage roles. In Beans, these roles map directly to tags with the same names.

| Canonical role | Bean tag | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this Bean |
| `needs-info` | `needs-info` | Waiting on the owner for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified and safe for autonomous implementation |
| `ready-for-human` | `ready-for-human` | Requires human implementation or judgment |
| `wontfix` | `wontfix` | Will not be actioned |

Apply exactly one role tag when a Bean reaches a triage state. Remove the prior role tag when moving it to another state.
