# Issue Tracker

Beans is the authoritative issue tracker for this repository. Beans are stored under `.beans/` and managed with the `beans` CLI.

Run `beans prime` before tracker work to load the current command guidance. Use Bean parent relationships for hierarchy and blocked-by relationships for execution order.

Do not create a separate checklist, todo file, or competing task list. Put durable work state, requirements, acceptance criteria, dependencies, and blockers in Beans.

Implementation Beans remain intact while their code is under review. After the parent accepts the implementation and verification evidence, it deletes the Bean with `beans delete <bean-id> --force` and commits the resulting tracker and dependency cleanup separately. Do not archive completed porting Beans.
