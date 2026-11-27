// Screenshot staging: ?shot=cover|cockpit|rings|landing|dash places the
// Kestrel in a framed, flying pose so a headless browser capture is
// a real render of the game's own code. No shot file is shipped;
// staging lives in code and runs only from the query string.

import { placePlane } from './flightModel.js';

export function applyShotStaging(params, plane, missionState, game) {
  const shot = params.get('shot');
  if (!shot) return false;
  game.state = 'flying';
  if (shot === 'cover') {
    game.view = 'chase';
    game.missionId = 'landing';
    placePlane(plane, 6, 72, 640, 0.03, 56, 0.62);
    plane.pitch = -0.02;
  } else if (shot === 'cockpit') {
    game.view = 'cockpit';
    game.missionId = 'landing';
    // Offset further left of the centreline so the runway stripes
    // AND the centreline dashes stay clear of the nose and the
    // prop disc instead of hiding behind them.
    placePlane(plane, -52, 58, 520, 0.02, 52, 0.58);
    plane.pitch = -0.03;
  } else if (shot === 'dash') {
    game.view = 'chase';
    game.missionId = 'dash';
    missionState.id = 'dash';
    missionState.index = 0;
    missionState.checkpointsHit = 0;
    missionState.score = 150;
    missionState.timeLeft = 132;
    // Low and fast on the checkpoint course: behind gate 1, heading
    // along the coast toward gate 2, fuel staged low so the amber
    // bar and the TIME countdown carry the pressure.
    placePlane(plane, -418, 50, 947, 0.32, 100, 1.0);
    plane.fuel = 18;
    // Battle damage, staged from the overspeed mechanic itself:
    // full throttle holds speed over the limit, so the OVERSPEED
    // warning stays lit and the AIRFRAME bar reads the damage the
    // airframe has already taken. Smoke shows in chase view.
    plane.damage = 66;
    plane.pitch = 0;
  } else if (shot === 'rings') {
    game.view = 'chase';
    game.missionId = 'rings';
    missionState.id = 'rings';
    missionState.index = 4;
    missionState.ringsHit = 4;
    missionState.score = 1000;
    // North toward the headland: ring 5 ahead over the plain, the
    // rust plateau rising beyond it — same mission, second biome,
    // ring framed against the cliffs.
    placePlane(plane, 100, 150, -400, -0.09, 58, 0.62);
    plane.pitch = 0;
  } else if (shot === 'landing') {
    game.view = 'chase';
    game.missionId = 'landing';
    placePlane(plane, 2, 12, 400, 0.01, 36, 0.30);
    plane.pitch = 0.06;
  } else {
    return false;
  }
  return true;
}
