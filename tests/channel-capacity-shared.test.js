import test from "node:test";
import assert from "node:assert/strict";
import { calculateAvailabilityForCalendarSlotFromLoaded } from "../app/utils/capacity.server.js";

const startTime = new Date("2026-10-22T08:30:00.000Z"); // 09:30 Lisbon in October.
function booking(platform, count) {
  return { tourId:"t1",startTime,platform,status:"CONFIRMED",totalParticipants:count };
}
const base = { id:"t1",maxCapacity:20,timezone:"Europe/Lisbon",platformCapacityLimits:{shopify:10,getyourguide:150} };
function available(tour, bookings, platform) {
  return calculateAvailabilityForCalendarSlotFromLoaded({
    tour,bookings,dateKey:"2026-10-22",timeKey:"09:30",platform,
  });
}
test("configured channel allocations sum to 160 shared seats",()=>{
  const a=available(base,[booking("SHOPIFY",8)],"getyourguide");
  assert.equal(a.remainingSeats,150);
  assert.equal(a.capacity,160);
  assert.equal(a.channelLimit,150);
});
test("Shopify individual allocation is reduced by Shopify bookings while total is shared",()=>{
  const a=available(base,[booking("SHOPIFY",8),booking("GETYOURGUIDE",5)],"shopify");
  assert.equal(a.occupiedSeats,13);
  assert.equal(a.channelOccupiedSeats,8);
  assert.equal(a.remainingSeats,2);
  assert.equal(a.canAccept,true);
});
test("channel allocation rejects bookings above its individual limit",()=>{
  const a=calculateAvailabilityForCalendarSlotFromLoaded({
    tour:base,bookings:[booking("SHOPIFY",9)],dateKey:"2026-10-22",
    timeKey:"09:30",platform:"SHOPIFY",requestedSeats:2,
  });
  assert.equal(a.remainingSeats,1);
  assert.equal(a.canAccept,false);
});
test("unset cap preserves original shared availability",()=>{
  const a=available({...base,platformCapacityLimits:null},[booking("SHOPIFY",4)],"GETYOURGUIDE");
  assert.equal(a.remainingSeats,16);
});


test("Viator last physical seat is unavailable to a competing channel once occupied", () => {
  const tour = { id:"t1", maxCapacity:20, timezone:"Europe/Lisbon", platformCapacityLimits:null };
  const nineteen = [booking("SHOPIFY", 10), booking("GETYOURGUIDE", 9)];
  const first = calculateAvailabilityForCalendarSlotFromLoaded({
    tour, bookings:nineteen, dateKey:"2026-10-22", timeKey:"09:30",
    platform:"VIATOR", requestedSeats:1,
  });
  assert.equal(first.remainingSeats, 1);
  assert.equal(first.canAccept, true);
  const afterFirst = calculateAvailabilityForCalendarSlotFromLoaded({
    tour, bookings:[...nineteen, booking("VIATOR", 1)], dateKey:"2026-10-22",
    timeKey:"09:30", platform:"VIATOR", requestedSeats:1,
  });
  assert.equal(afterFirst.remainingSeats, 0);
  assert.equal(afterFirst.canAccept, false);
});

test("Canceling a Viator booking returns its seat to shared availability without double release", () => {
  const tour = { id:"t1", maxCapacity:20, timezone:"Europe/Lisbon", platformCapacityLimits:null };
  const nineteen = [booking("SHOPIFY", 10), booking("GETYOURGUIDE", 9)];
  const canceled = { ...booking("VIATOR",1), status:"CANCELED" };
  const beforeCancel = available(tour, [...nineteen, booking("VIATOR",1)], "SHOPIFY");
  const afterCancel = available(tour, [...nineteen, canceled], "SHOPIFY");
  const repeatedCancel = available(tour, [...nineteen, canceled], "SHOPIFY");
  assert.equal(beforeCancel.remainingSeats, 0);
  assert.equal(afterCancel.remainingSeats, 1);
  assert.equal(repeatedCancel.remainingSeats, 1);
});
