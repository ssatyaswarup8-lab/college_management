# Conflict Resolution Assistant

Admins and department coordinators can record and analyze a timetable conflict, then request ranked alternatives with `POST /api/conflicts/:id/solutions`.

The response separates two lists:

- `solutions` contains placements that passed full hard-constraint validation. Only these are selectable by `solutionIndex` for the Admin-only apply endpoint. Applying one saves a schedule proposal; it does not immediately activate it.
- `nearMisses` contains placements that failed validation, ordered by violation count and how much the placement differs from the current one. Each item lists the validator's violation codes, messages, and details. Near misses explain why a tempting option is unsafe and cannot be applied.

The request may set `maxSolutions` (1-10, default 5) and `maxNearMisses` (0-10, default 3). The active timetable version is checked before solutions are generated. If the timetable changed after analysis, rerun conflict analysis.

Department coordinators can view and analyze only sessions in their department. Only Admins can apply a selected valid solution.
