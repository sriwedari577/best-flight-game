// Missions: three sorties with different goals, scoring and timers.
// Ring centres and checkpoint positions are fixed in the world so
// every run of a mission is the same course.

export const MISSIONS = {
  rings: {
    id: 'rings',
    name: 'RING RUN',
    short: 'Rings',
    goal: 'Fly through all 6 golden rings in order.',
    tip: 'Line up early — a hard bank bleeds speed and misses the ring.',
  },
  landing: {
    id: 'landing',
    name: 'ISLAND LANDING',
    short: 'Landing',
    goal: 'Take off, fly the circuit, and land on the runway.',
    tip: 'Slow to 40 knots over the threshold, flare gently, keep wings level.',
  },
  dash: {
    id: 'dash',
    name: 'COAST DASH',
    short: 'Dash',
    goal: 'Hit 5 low checkpoints along the coast before the clock runs out.',
    tip: 'Stay low and fast, but watch fuel — full throttle drinks the tank.',
  },
};

export const RINGS = [
  { x: 0, y: 70, z: 620, r: 30 },
  { x: -180, y: 95, z: 240, r: 30 },
  { x: -420, y: 110, z: -160, r: 32 },
  { x: -260, y: 90, z: -560, r: 30 },
  { x: 120, y: 75, z: -620, r: 30 },
  { x: 320, y: 60, z: -260, r: 30 },
];

export const CHECKPOINTS = [
  { x: -500, y: 55, z: 700, r: 42 },
  { x: -700, y: 45, z: 100, r: 42 },
  { x: -560, y: 50, z: -520, r: 42 },
  { x: 60, y: 60, z: -760, r: 42 },
  { x: 520, y: 55, z: -420, r: 42 },
];

export function makeMissionState(missionId) {
  return {
    id: missionId,
    index: 0,
    score: 0,
    elapsed: 0,
    timeLeft: missionId === 'dash' ? 150 : 0,
    ringsHit: 0,
    checkpointsHit: 0,
    done: false,
    doneReason: '',
    bonus: 0,
    message: '',
    messageTime: 0,
    bestLanding: 0,
  };
}

function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Advance mission state; returns event names for sound/announce.
export function stepMission(state, plane, events) {
  if (state.done) return;
  state.elapsed += 1 / 60;
  if (state.messageTime > 0) state.messageTime -= 1 / 60;

  if (state.id === 'rings') {
    const ring = RINGS[state.index];
    if (ring && dist3(plane, ring) < ring.r) {
      state.index += 1;
      state.ringsHit += 1;
      state.score += 250;
      state.message = `RING ${state.ringsHit} OF 6  +250`;
      state.messageTime = 2.2;
      events.push('ring');
      if (state.index >= RINGS.length) {
        state.done = true;
        state.doneReason = 'ALL RINGS FLOWN';
        state.bonus = Math.max(0, Math.round(600 - state.elapsed * 2) + Math.round(plane.fuel));
        state.score += state.bonus;
        events.push('complete');
      }
    }
  } else if (state.id === 'dash') {
    state.timeLeft -= 1 / 60;
    const cp = CHECKPOINTS[state.index];
    if (cp && dist3(plane, cp) < cp.r) {
      state.index += 1;
      state.checkpointsHit += 1;
      state.score += 150;
      state.message = `CHECKPOINT ${state.checkpointsHit} OF 5  +150`;
      state.messageTime = 2.2;
      events.push('checkpoint');
      if (state.index >= CHECKPOINTS.length) {
        state.done = true;
        state.doneReason = 'COURSE COMPLETE';
        state.bonus = Math.round(state.timeLeft) * 5 + Math.round(plane.fuel);
        state.score += state.bonus;
        events.push('complete');
      }
    }
    if (state.timeLeft <= 0 && !state.done) {
      state.done = true;
      state.doneReason = 'TIME UP';
      events.push('failed');
    }
  } else if (state.id === 'landing') {
    if (plane.landed && plane.touchdownQuality > 0) {
      state.bestLanding = Math.max(state.bestLanding, plane.touchdownQuality);
    }
    if (plane.landed && plane.speed < 6 && plane.flightTime > 8) {
      const overRunway = Math.abs(plane.x) < 24 && Math.abs(plane.z) < 365;
      if (overRunway) {
        state.done = true;
        state.doneReason = 'LANDED ON THE RUNWAY';
        state.bonus = Math.round(state.bestLanding * 4) + Math.round(plane.fuel);
        state.score += state.bonus;
        events.push('complete');
      } else {
        state.done = true;
        state.doneReason = 'LANDED OFF THE RUNWAY';
        state.score += 40;
        events.push('failed');
      }
    }
  }
  if (plane.fuel <= 0 && !state.done && state.id !== 'landing') {
    state.message = 'FUEL EMPTY — GLIDE TO THE RUNWAY';
    state.messageTime = 3;
  }
}

export function missionTarget(state) {
  if (state.id === 'rings') return RINGS[state.index] || null;
  if (state.id === 'dash') return CHECKPOINTS[state.index] || null;
  return null;
}

export function missionProgressText(state) {
  if (state.id === 'rings') return `RINGS ${state.ringsHit}/6`;
  if (state.id === 'dash') return `GATES ${state.checkpointsHit}/5`;
  return planeLandingText(state);
}

function planeLandingText(state) {
  return state.bestLanding > 0 ? `TOUCHDOWN ${Math.round(state.bestLanding)}%` : 'LAND ON RUNWAY';
}
