import assert from "node:assert/strict";

import { aviationRoute, aviationRoutes, greatCircleDistanceKm, routeDistance } from "../src/lib/route-data";

const lhrJfk = aviationRoute("lhr-jfk");
assert.ok(lhrJfk);
assert.equal(lhrJfk.currentAirlines.length, 5);
assert.ok(lhrJfk.aircraft.some((aircraft) => aircraft.name === "Concorde"));
assert.ok(lhrJfk.historicOperators.length > 0);
assert.ok(lhrJfk.history.length >= 5);
assert.ok(lhrJfk.sources.every((source) => source.url.startsWith("https://")));
const distance = routeDistance(lhrJfk);
assert.ok(distance.kilometres > 5_500 && distance.kilometres < 5_600);
assert.ok(distance.nauticalMiles > 2_950 && distance.nauticalMiles < 3_050);
assert.equal(greatCircleDistanceKm(lhrJfk.origin, lhrJfk.origin), 0);
assert.equal(new Set(aviationRoutes.map((route) => route.slug)).size, aviationRoutes.length);

console.log("Route page tests passed");
