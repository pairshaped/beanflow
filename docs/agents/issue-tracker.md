# Issue Tracker

Beans is the authoritative issue tracker for this repository. Beans are stored under `.beans/` and managed with the `beans` CLI.

Run `beans prime` before tracker work to load the current command guidance. Use Bean parent relationships for hierarchy and blocked-by relationships for execution order.

Do not create a separate checklist, todo file, or competing task list. Put durable work state, requirements, acceptance criteria, dependencies, and blockers in Beans.

Completed implementation Beans are deleted with `beans delete <bean-id> --force` as part of the same commit as their implementation. Do not archive completed porting Beans.
