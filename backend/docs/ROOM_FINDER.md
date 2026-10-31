# Room Finder

Authenticated users can search for a room by day, period, duration, attendance, room type, required features, accessibility need, and allowed use. The finder removes candidates that fail the requested criteria or are occupied by classes, approved bookings, or room closures. Set `availableOnly: false` to inspect unavailable rooms and the reason each one failed.

## Optional origin

Add `originRoomId` or `originBuilding` to prefer rooms in that building. Provide only one. `originRoomId` must exist in the active dataset; `originBuilding` must match a building label in that dataset (case-insensitive). Same-building preference is applied after availability and before capacity fit, feature fit, and utilization. The response includes `locationPreference.sameBuilding` and explains the preference in `rankReasons`.

The bundled dataset contains building names but no room coordinates or distances between buildings. The finder therefore prefers a matching building and reports `distanceMeters: null`; it does not claim that one different building is physically nearer than another. See [ROOM_LOCATION_DATA.md](ROOM_LOCATION_DATA.md) for the data needed to support exact distance ranking later.

## Request example

`POST /api/rooms/find`:

```json
{
  "day": "WED",
  "startPeriod": 6,
  "duration": 1,
  "attendance": 80,
  "roomTypes": ["lecture_hall"],
  "needs": ["projector"],
  "use": "lecture",
  "originRoomId": "LH-1"
}
```

The bundled dataset uses `LH-1` for Lecture Hall 1 in the Lecture Hall Complex. Availability depends on the active generated timetable, so an example slot may need adjustment.
