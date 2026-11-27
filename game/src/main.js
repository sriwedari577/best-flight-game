// Coastal Skies: game boot, main loop and state machine.
// One frame: read input, step the flight model and the mission,
// render sky, sea, terrain, targets, aircraft and instruments.

import { makePlane, resetPlane, stepFlight, planeStateText } from './flightModel.js';
import { makeMissionState, stepMission, missionTarget, MISSIONS } from './missions.js';
import { makeCamera, chaseCamera, cockpitCamera, projectPoint } from './projection.js';
import { drawSky, drawSea, drawTerrainMesh, drawRunway, drawTownAndTrees, drawMissionTargets, drawClouds, drawTargetArrow } from './renderWorld.js';
import { drawChaseAircraft, drawCockpitFrame } from './renderAircraft.js';
import { drawHud } from './instruments.js';
import { makeInput, bindInput, readControl, wasPressed, consumeClick } from './input.js';
import { makeAudio, startAudio, updateEngineSound, playRingChime, playCheckpointChime, playCompleteFanfare, playThud, toggleMute } from './audio.js';
import { drawMenu, drawPause, drawEndScreen, missionCardRects } from './screens.js';
import { applyShotStaging } from './shots.js';
import { terrainHeight } from './terrain.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const game = {
  state: 'menu', // menu | flying | paused | complete | crashed
  view: 'chase',
  missionId: 'rings',
  selected: 'rings',
  time: 0,
  crashTime: 0,
  endShownAt: 0,
};
const plane = makePlane();
let missionState = makeMissionState(game.missionId);
const cam = makeCamera();
const input = makeInput();
const audio = makeAudio();
bindInput(input, canvas);

const params = new URLSearchParams(window.location.search);
const staged = applyShotStaging(params, plane, missionState, game);
if (staged) {
  missionState = makeMissionState(game.missionId);
  // Re-apply ring progress for the rings shot after the fresh state.
  if (params.get('shot') === 'rings') {
    missionState.index = 4;
    missionState.ringsHit = 4;
    missionState.score = 1000;
  }
  // Re-apply dash progress for the dash shot after the fresh state.
  if (params.get('shot') === 'dash') {
    missionState.index = 0;
    missionState.checkpointsHit = 0;
    missionState.score = 150;
    missionState.timeLeft = 132;
  }
  cam.x = plane.x; cam.y = plane.y + 7; cam.z = plane.z + 26;
}

function startMission(id) {
  game.missionId = id;
  game.selected = id;
  input.pressed.clear();
  resetPlane(plane, id);
  missionState = makeMissionState(id);
  game.state = 'flying';
  game.crashTime = 0;
  startAudio(audio);
  announce(`${MISSIONS[id].name}. ${MISSIONS[id].goal}`);
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function handleMenuInput() {
  const click = consumeClick(input);
  if (click) {
    startAudio(audio);
    for (const card of missionCardRects(canvas.width, canvas.height)) {
      const px = click.x * canvas.width;
      const py = click.y * canvas.height;
      if (px >= card.x && px <= card.x + card.w && py >= card.y && py <= card.y + card.h) {
        game.selected = card.id;
        startMission(card.id);
        return;
      }
    }
  }
  if (wasPressed(input, '1')) game.selected = 'rings';
  if (wasPressed(input, '2')) game.selected = 'landing';
  if (wasPressed(input, '3')) game.selected = 'dash';
  if (wasPressed(input, 'Enter', ' ')) startMission(game.selected);
}

function handleEndInput() {
  const click = consumeClick(input);
  if (click) {
    const w = canvas.width;
    const h = canvas.height;
    const px = click.x * w;
    const py = click.y * h;
    if (py >= h * 0.64 && py <= h * 0.64 + 52) {
      if (px >= w / 2 - 260 && px <= w / 2 - 20) { startMission(game.missionId); return; }
      if (px >= w / 2 + 20 && px <= w / 2 + 260) { game.state = 'menu'; return; }
    }
  }
  if (wasPressed(input, 'r', 'R')) startMission(game.missionId);
  if (wasPressed(input, 'Escape')) game.state = 'menu';
}

function stepGame(dt) {
  const control = readControl(input, game.state === 'flying');
  const events = [];
  const beforeY = plane.y;
  stepFlight(plane, control, dt, events);
  stepMission(missionState, plane, events);
  for (const e of events) {
    if (e === 'ring') playRingChime(audio);
    if (e === 'checkpoint') playCheckpointChime(audio);
    if (e === 'complete') { playCompleteFanfare(audio); game.state = 'complete'; game.endShownAt = game.time; announce('Mission complete. Score ' + missionState.score); }
    if (e === 'failed' && missionState.done) { game.state = 'complete'; game.endShownAt = game.time; }
    if (e === 'touchdown') { playThud(audio); announce('Touchdown. Quality ' + Math.round(plane.touchdownQuality) + ' percent.'); }
    if (e === 'liftoff') announce('Airborne.');
    if (e === 'crash') {
      playThud(audio);
      game.state = 'crashed';
      game.crashTime = 0;
      game.endShownAt = game.time;
      announce('Crashed.');
    }
    if (e === 'fuelOut') announce('Fuel empty. Glide to the runway.');
  }
  if (plane.crashed && game.state !== 'crashed') {
    game.state = 'crashed';
    game.crashTime = 0;
    game.endShownAt = game.time;
  }
  if (game.state === 'crashed') game.crashTime += dt;
  updateEngineSound(audio, plane, game.state === 'flying');
}

function render() {
  const w = canvas.width;
  const h = canvas.height;
  // Camera follows the aircraft in both views.
  if (game.view === 'cockpit') {
    cockpitCamera(plane, cam);
  } else {
    chaseCamera(plane, cam, 1 / 60, cam);
  }
  const horizon = drawSky(ctx, w, h, cam, game.time);
  drawSea(ctx, w, h, cam, horizon, game.time);
  drawTerrainMesh(ctx, w, h, cam);
  drawRunway(ctx, w, h, cam);
  drawTownAndTrees(ctx, w, h, cam);
  drawClouds(ctx, w, h, cam, game.time);
  drawMissionTargets(ctx, w, h, cam, missionState, game.time);

  // Aircraft shadow on the ground: sells altitude and position.
  const gy = terrainHeight(plane.x, plane.z);
  const shadow = projectPoint(cam, { x: plane.x, y: gy + 0.6, z: plane.z }, w, h);
  if (shadow && plane.y - gy < 400) {
    const s = Math.max(3, 2600 / shadow.depth * 0.05) * Math.max(0.35, 1 - (plane.y - gy) / 400);
    ctx.fillStyle = 'rgba(20,30,20,0.30)';
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, s * 2.2, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (game.view === 'cockpit') {
    drawCockpitFrame(ctx, w, h, plane, game.time);
  } else {
    const crashed = game.state === 'crashed';
    drawChaseAircraft(ctx, w, h, plane, game.time, crashed);
  }
  if (game.state !== 'menu') drawTargetArrow(ctx, w, h, cam, plane, missionTarget(missionState));
  drawHud(ctx, w, h, plane, missionState, game.view, game.time, audio.muted);

  if (game.state === 'menu') {
    // Menu floats over a live view of the airfield.
    drawMenu(ctx, w, h, game.selected, game.time);
  } else if (game.state === 'paused') {
    drawPause(ctx, w, h);
  } else if (game.state === 'complete' || game.state === 'crashed') {
    if (game.time - game.endShownAt > 1.1) {
      drawEndScreen(ctx, w, h, game.state === 'crashed' ? 'crash' : 'complete', missionState, plane);
    }
  }
  // Crash tumble: the wreck slides and the view shakes briefly.
  if (game.state === 'crashed' && game.crashTime < 0.5) {
    const shake = (0.5 - game.crashTime) * 14;
    ctx.save();
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.restore();
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;

  if (wasPressed(input, 'm', 'M')) {
    startAudio(audio);
    const muted = toggleMute(audio);
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (game.state === 'menu') {
    handleMenuInput();
    if (game.state === 'menu') {
      // Idle camera drift over the airfield behind the menu.
      plane.x = Math.sin(game.time * 0.05) * 40;
      plane.z = 520 + Math.cos(game.time * 0.05) * 30;
      plane.heading = Math.sin(game.time * 0.05) * 0.2;
    }
  } else if (game.state === 'flying') {
    if (wasPressed(input, 'p', 'P', 'Escape')) { game.state = 'paused'; announce('Paused.'); }
    if (wasPressed(input, 'c', 'C')) { game.view = game.view === 'chase' ? 'cockpit' : 'chase'; announce(game.view + ' view.'); }
    if (wasPressed(input, 'r', 'R')) { startMission(game.missionId); }
    stepGame(dt);
  } else if (game.state === 'paused') {
    if (wasPressed(input, 'p', 'P', 'Escape')) { game.state = 'flying'; }
    if (wasPressed(input, 'r', 'R')) startMission(game.missionId);
    if (wasPressed(input, 'c', 'C')) game.view = game.view === 'chase' ? 'cockpit' : 'chase';
  } else if (game.state === 'complete' || game.state === 'crashed') {
    if (game.time - game.endShownAt > 1.1) handleEndInput();
    if (game.state === 'crashed') game.crashTime += dt;
  }
  render();
}

// First-gesture audio unlock for browsers that require it.
window.addEventListener('pointerdown', () => startAudio(audio), { once: false });
window.addEventListener('keydown', () => startAudio(audio), { once: false });

requestAnimationFrame(frame);

// Test hooks: scripted play-testing drives the game through these.
window.__game = {
  game, plane, get mission() { return missionState; },
  startMission, stepGame, render,
  setControl(pitch, roll, throttle) {
    input.keys.clear();
    if (pitch > 0) input.keys.add('w');
    if (pitch < 0) input.keys.add('s');
    if (roll < 0) input.keys.add('a');
    if (roll > 0) input.keys.add('d');
    if (throttle > 0) input.keys.add('Shift');
    if (throttle < 0) input.keys.add('Control');
  },
};
