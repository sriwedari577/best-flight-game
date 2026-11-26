// Flight model: throttle, lift, stall, overspeed, turns, ground
// contact and damage. Speeds in m/s, angles in radians, heights in m.

import { terrainHeight } from './terrain.js';

export const STALL_SPEED = 24;
export const MAX_SPEED = 98;
export const CRUISE_SPEED = 62;

export function makePlane() {
  return {
    x: 0, y: 3.2, z: 520,
    heading: 0, pitch: 0, roll: 0,
    speed: 0, throttle: 0,
    fuel: 100, damage: 0,
    onGround: true, airborne: false, tookOff: false,
    verticalSpeed: 0, crashed: false, landed: false,
    gearDown: true, flaps: 0,
    stallWarn: false, overspeedWarn: false,
    touchdownQuality: 0, flightTime: 0,
  };
}

export function resetPlane(plane, mission) {
  const fresh = makePlane();
  Object.assign(plane, fresh);
  if (mission === 'landing') {
    // Start parked on the runway, ready for a short-field takeoff.
    plane.z = 300;
  }
  return plane;
}

export function placePlane(plane, x, y, z, heading, speed, throttle) {
  plane.x = x; plane.y = y; plane.z = z;
  plane.heading = heading; plane.speed = speed; plane.throttle = throttle;
  plane.pitch = 0; plane.roll = 0;
  plane.onGround = false; plane.airborne = true; plane.tookOff = true;
  plane.verticalSpeed = 0; plane.crashed = false;
  return plane;
}

// control: {pitchIn:-1..1 (pull up positive), rollIn:-1..1, throttleIn:-1..1}
// Returns events: 'stall' | 'overspeed' | 'touchdown' | 'crash' | 'fuelOut'
export function stepFlight(plane, control, dt, events) {
  if (plane.crashed) return;
  const groundH = terrainHeight(plane.x, plane.z);

  // Throttle responds quickly; speed chases the throttle target.
  plane.throttle = Math.min(1, Math.max(0, plane.throttle + control.throttleIn * dt * 0.55));
  const targetSpeed = 8 + plane.throttle * 92;
  const diveBoost = Math.max(0, -plane.pitch) * 26;
  const climbCost = Math.max(0, plane.pitch) * 30;
  // On the ground with the throttle closed the speed target is
  // zero: the 8 m/s idle floor would otherwise hold every rollout
  // at ~8 m/s forever, so a landing could never roll to a stop.
  const goal = plane.onGround && plane.throttle < 0.15
    ? 0
    : Math.min(MAX_SPEED + 12, targetSpeed + diveBoost - climbCost);
  const accel = plane.speed < goal ? 14 : 9;
  plane.speed += Math.min(Math.abs(goal - plane.speed), accel * dt) * Math.sign(goal - plane.speed);
  plane.speed = Math.max(0, plane.speed);

  // Roll and pitch ease toward the pilot's input: responsive at every speed.
  const authority = 0.55 + 0.45 * Math.min(1, plane.speed / 40);
  const targetRoll = control.rollIn * 0.95 * authority;
  const targetPitch = control.pitchIn * 0.30 * authority;
  plane.roll += (targetRoll - plane.roll) * Math.min(1, dt * 5.5);
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 4.5);

  // Turn rate grows with bank and speed; a hard bank bleeds speed.
  const turnRate = -plane.roll * (0.35 + plane.speed * 0.006);
  plane.heading += turnRate * dt;
  if (Math.abs(plane.roll) > 0.6) plane.speed = Math.max(10, plane.speed - 3.2 * dt);

  // Lift: enough speed and the wing flies; too slow and she sinks.
  const liftFactor = Math.min(1, plane.speed / (STALL_SPEED + 6));
  const climb = Math.sin(plane.pitch) * plane.speed * liftFactor;
  plane.stallWarn = plane.speed < STALL_SPEED + 3 && !plane.onGround;
  if (plane.stallWarn) {
    plane.pitch += (-0.10 - plane.pitch) * Math.min(1, dt * 1.6);
    plane.verticalSpeed = Math.max(plane.verticalSpeed - 14 * dt, -16);
  }
  plane.overspeedWarn = plane.speed > MAX_SPEED && !plane.onGround;
  if (plane.overspeedWarn) {
    plane.damage = Math.min(100, plane.damage + 2.2 * dt);
    events.push('overspeed');
  }

  const fx = -Math.sin(plane.heading);
  const fz = -Math.cos(plane.heading);
  const forward = plane.speed * Math.cos(plane.pitch);
  plane.x += fx * forward * dt;
  plane.z += fz * forward * dt;

  if (plane.onGround) {
    plane.y = groundH + 1.6;
    plane.verticalSpeed = 0;
    if (plane.speed > 30 && plane.pitch > 0.10) {
      plane.onGround = false;
      plane.airborne = true;
      plane.tookOff = true;
      plane.landed = false;
      plane.y += 0.8;
      events.push('liftoff');
    }
  } else {
    // Power-off sink: cutting the throttle makes her descend gently,
    // so a landing is flown with power as well as pitch.
    const idleSink = plane.throttle < 0.35 ? (0.35 - plane.throttle) * 12 : 0;
    plane.verticalSpeed = climb - idleSink;
    if (!plane.stallWarn) plane.verticalSpeed = climb - idleSink;
    plane.y += plane.verticalSpeed * dt;
    plane.flightTime += dt;
  }

  // Fuel burn: throttle-heavy flying costs range; decisions matter.
  if (plane.fuel > 0) {
    plane.fuel = Math.max(0, plane.fuel - dt * (0.22 + plane.throttle * 0.55));
    if (plane.fuel === 0) events.push('fuelOut');
  } else if (plane.throttle > 0.25) {
    plane.throttle = 0.25; // dead-stick glide on fumes
  }

  // Ground contact.
  const clearance = plane.y - (groundH + 1.6);
  if (clearance <= 0 && !plane.onGround) {
    const hard = plane.verticalSpeed < -7;
    const fast = plane.speed > 52;
    const overRunway = Math.abs(plane.x) < 30 && Math.abs(plane.z) < 600 && Math.abs(groundH - 2) < 14;
    const aligned = Math.abs(Math.sin(plane.heading)) < 0.35 && Math.abs(plane.roll) < 0.3;
    if ((hard || fast) && !(overRunway && aligned && !hard)) {
      plane.crashed = true;
      plane.damage = 100;
      events.push('crash');
    } else {
      plane.onGround = true;
      plane.airborne = false;
      plane.y = groundH + 1.6;
      plane.pitch = Math.min(plane.pitch, 0.06);
      plane.roll *= 0.3;
      plane.touchdownQuality = overRunway && aligned ? Math.max(0, 100 + plane.verticalSpeed * 9 - Math.abs(plane.roll) * 40) : 25;
      events.push('touchdown');
      if (plane.speed < 12 && plane.tookOff) plane.landed = true;
    }
  }
  if (plane.onGround && plane.speed < 4 && plane.throttle < 0.1 && plane.tookOff) plane.landed = true;
  // Rolling friction: with the throttle closed the Kestrel rolls to
  // a stop instead of cruising forever at the idle speed floor
  // (8 m/s), which made a landing rollout unable to finish the
  // Island Landing sortie — `landed` needs speed under 4 m/s.
  if (plane.onGround && plane.throttle < 0.15 && !plane.crashed) {
    plane.speed = Math.max(0, plane.speed - 10 * dt);
  }
  if (plane.damage >= 100 && !plane.crashed) {
    plane.crashed = true;
    events.push('crash');
  }
}

export function planeStateText(plane) {
  if (plane.crashed) return 'CRASHED';
  if (plane.landed) return 'LANDED';
  if (plane.onGround) return 'ON RUNWAY';
  if (plane.stallWarn) return 'STALL!';
  if (plane.overspeedWarn) return 'OVERSPEED';
  return 'FLYING';
}
