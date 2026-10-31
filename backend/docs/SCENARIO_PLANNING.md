# What-if Scenario Planning

Scenario planning lets an Admin inspect and simulate temporary disruptions without immediately changing the active timetable.

## Workflow

1. Preview temporary conditions with `POST /api/scenarios/preview` and a `changes` array. This read-only endpoint reports sessions that currently violate the proposed room or faculty unavailability, with the exact hard-constraint reasons.
2. Create the scenario with `POST /api/scenarios`, including a name, optional description, and the same `changes`.
3. Simulate it with `POST /api/scenarios/:scenarioId/simulate`. The scheduler repairs directly impacted sessions and may move related sessions if needed. It saves a proposed version; the active timetable remains unchanged.
4. Review `GET /api/scenarios/:scenarioId/compare`. The response contains each changed session's `before` and `after` placement plus a summary of affected rooms, faculty, and groups.
5. Apply with `POST /api/scenarios/:scenarioId/apply` only after review. The backend revalidates the proposal and refuses to apply it if the base timetable has changed.

## Supported temporary conditions

- `room_unavailable`: `roomId`, one or more `days`, and one or more `periods`.
- `faculty_unavailable`: `facultyId`, one or more `days`, and one or more `periods`.

IDs are checked against the active dataset. Scenario periods can include event-only periods, but existing academic sessions can only be repaired within the scheduler's teaching period rules. A failed simulation does not activate a timetable.

## Preview response

Each `impactedSessions` row includes the current session, course, group, faculty, day, period, and room, plus `violations` containing the deterministic validator's code, explanation, and details. `summary.directlyAffectedSessions` counts these current placements. The simulation comparison can include more sessions because preserving a valid schedule may require moving related classes.
