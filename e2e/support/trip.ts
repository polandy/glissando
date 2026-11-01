import type { PlaceVisit } from "./app";

// Two places from public/places/cities15000.tsv, picked only as made-up coordinates for this
// test (never a real photo's own location): over 25 km apart (chapter-stays.ts, STAY_RADIUS_KM),
// so the second one starts a new stay (TRIP_CHAPTERS.md, Rule B).
const LISBON = { latitude: 38.725, longitude: -9.15 };
const PORTO = { latitude: 41.148, longitude: -8.611 };

/** Two days at Lisbon, then two at Porto: one automatic chapter, right before Porto's first day. */
export const TRIP: readonly PlaceVisit[] = [
  { day: "2025-07-12", place: LISBON },
  { day: "2025-07-13", place: LISBON },
  { day: "2025-07-14", place: PORTO },
  { day: "2025-07-15", place: PORTO },
];
