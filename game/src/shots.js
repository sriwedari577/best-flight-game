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
    // Offset left of the centreline so the runway stripes stay
    // visible beside the nose instead of hiding behind the prop disc.
    placePlane(plane, -34, 58, 520, 0.02, 52, 0.58);
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
    placePlane(plane, -418, 50, 947, 0.32, 78, 0.85);
    plane.fuel = 18;
    plane.pitch = 0;
  } else if (shot === 'rings') {
    game.view = 'chase';
    game.missionId = 'rings';
    missionState.id = 'rings';
    missionState.index = 1;
    missionState.ringsHit = 1;
    missionState.score = 250;
    placePlane(plane, -110, 96, 420, 0.42, 58, 0.62);
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
