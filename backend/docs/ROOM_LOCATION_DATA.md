# Room Location Data Requirements

The active CIT dataset records each room's building label, but it does not include geographic coordinates, floor locations, or a campus distance graph. The current room finder can prefer the origin building and reports exact distance as unavailable.

To calculate physical proximity, add authoritative campus location data to each room (for example, validated latitude and longitude or a campus building/node identifier) and supply a trusted origin location. A distance-aware implementation should validate coordinates, define how paths across buildings are measured, and disclose when a room has no location data. Do not infer campus distances from room IDs or building names.

No coordinates are invented for the fictional starter dataset. This document is a backend/frontend integration note, not a claim that exact distance ranking is already supported.
