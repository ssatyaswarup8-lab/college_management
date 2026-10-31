# Manual Timetable Change Impact

`POST /api/admin/schedule/session/impact` lets an Admin or department coordinator inspect a proposed placement before saving it. It compares the proposed timetable with the active version and does not create or activate a schedule proposal.

The response includes:

- `conflictsIntroduced`: hard violations introduced by the proposed placement, with their validator codes and details.
- `impactedSessions`, `impactedFaculty`, and `impactedGroups`: dataset names and IDs for the changed class and classes affected by introduced conflicts.
- `roomImpact`: before/after rooms and room-related validity issues.
- `studentGapChanges`: per-group, per-day gap periods before and after the move, plus each literal gap-count difference.
- `studentGapPeriodChange`: total gap-period count change for the moved session's groups. `studentGapChange` is the existing S2 soft-penalty difference and is not a literal count.
- `facultyDailyHours.byDay`: before/after faculty load for each affected day, including both days when a session moves across days. The top-level `before`, `after`, and `difference` preserve the destination-day fields for existing clients.

The proposal endpoint reruns impact analysis and checks that the active timetable version has not changed since the analysis. If the base version changed, it returns `SCHEDULE_VERSION_STALE`; rerun impact analysis before proposing again.
