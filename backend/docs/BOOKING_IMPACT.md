# Booking Decision Impact Preview

Before making a booking decision, Admins and authorized department coordinators can inspect the proposal with `POST /api/bookings/:id/impact`. This is a read-only analysis against the active dataset, active timetable, room closures, existing approved bookings, and currently pending higher-priority requests.

## Request

```json
{
  "action": "approve",
  "day": "MON",
  "startPeriod": 4,
  "roomId": "AUD"
}
```

Use `action: "alternative"` when previewing an offered time outside the requester's windows. The analysis does not save an offer or approval.

## Response meaning

- `decisionBlockers` lists deterministic validation failures such as room capacity, room closure, room conflicts, and mandatory-attendee conflicts.
- `impact.affectedSessions` enriches class conflicts with course, faculty, and group names.
- `impact.affectedFaculty` and `impact.affectedGroups` provide distinct records for impact summaries.
- `impact.affectedBookings` identifies other approved booking requests that occupy the same room or mandatory attendees.
- `impact.higherPriorityRequests` identifies pending requests that trigger the recorded Admin override workflow.
- `available` is true only when there are no validation blockers and no higher-priority request requiring review.

The preview does not reserve a room, update a booking, or freeze the timetable. The selected approval/alternative endpoint reruns validation and priority checks, so the frontend should handle a later conflict response if the schedule changes between preview and decision.
