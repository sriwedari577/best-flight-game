// Screenshot staging: ?shot=cover|cockpit|rings|landing places the
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
    // Closer and lower than the first staging so the runway fills
    // the windscreen and the nose/propeller frame the approach.
    placePlane(plane, -4, 58, 520, 0.02, 52, 0.58);
    plane.pitch = -0.03;
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
