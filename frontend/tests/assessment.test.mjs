import test from "node:test";
import assert from "node:assert/strict";
import {
  sameTrip,
  assessmentFreshness,
  arrivalDate,
} from "../src/lib/assessment.ts";
const trip = {
  origin: { label: "Bengaluru", lat: 12.9767936, lon: 77.590082 },
  destination: { label: "Jharkhand", lat: 23.4559809, lon: 85.2557301 },
  departure_time: "2026-10-28T06:30:00Z",
  load_weight_lb: 40000,
  interval_miles: 50,
};
test("equivalent timezone offsets refer to the same submitted trip", () => {
  assert.equal(
    sameTrip(trip, { ...trip, departure_time: "2026-10-28T12:00:00+05:30" }),
    true,
  );
});
test("editing load, interval or departure marks the results out of date", () => {
  for (const patch of [
    { load_weight_lb: 40001 },
    { interval_miles: 25 },
    { departure_time: "2026-10-28T07:30:00Z" },
  ])
    assert.equal(sameTrip(trip, { ...trip, ...patch }), false);
});
test("location coordinates and labels must match the analyzed request", () => {
  for (const key of ["origin", "destination"]) {
    assert.equal(
      sameTrip(trip, {
        ...trip,
        [key]: { ...trip[key], lat: trip[key].lat + 0.01 },
      }),
      false,
    );
    assert.equal(
      sameTrip(trip, {
        ...trip,
        [key]: { ...trip[key], label: "Different place" },
      }),
      false,
    );
  }
  assert.equal(sameTrip(trip, null), false);
});
test("freshness expires after the documented cache window", () => {
  const timestamp = "2026-10-28T06:00:00Z",
    epoch = Date.parse(timestamp);
  assert.equal(assessmentFreshness(timestamp, epoch + 900000), "fresh");
  assert.equal(assessmentFreshness(timestamp, epoch + 900001), "stale");
  assert.equal(assessmentFreshness(undefined, epoch), "unknown");
  assert.equal(assessmentFreshness("invalid", epoch), "unknown");
});
test("a multi-day arrival includes its UTC calendar date", () => {
  assert.equal(arrivalDate("2026-10-29T18:25:34.872Z"), "29 Oct");
  assert.equal(arrivalDate("2026-10-29T00:15:00+05:30"), "28 Oct");
});
