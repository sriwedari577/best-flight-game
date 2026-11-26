# Coastal Skies — Island Air Patrol

[![Make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/sriwedari577/best-flight-game/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/sriwedari577/best-flight-game/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

An original 3D-feel flight game that runs offline in a desktop browser from static files. Fly the Kestrel over a recognisable coast — sea, islands, town, airfield and mountain ridge — in chase or cockpit view, with lit instruments, a live HUD (altitude, speed, heading), and three missions: Ring Run, Island Landing, and the timed Coast Dash. Throttle and turn discipline matter: stall, overspeed, fuel and damage all shape every sortie. Sounds are generated with WebAudio; no network requests, no external assets.

## Play

Serve `game/` with any static server (for example `node serve.ts`, then open http://localhost:8080) and fly with keyboard and mouse:

- **W/S or ↑/↓** pitch · **A/D or ←/→** bank and turn · **SHIFT / CTRL** throttle · mouse steers gently
- **C** chase/cockpit view · **P** pause · **R** restart · **M** sound · **1/2/3** choose a mission

## Layout

- `game/index.html` + `game/style.css` — page shell
- `game/src/main.js` — boot, loop and state machine
- `game/src/flightModel.js` — throttle, lift, stall, overspeed, ground contact
- `game/src/terrain.js` — coastline, islands, town, airfield, mountains, clouds
- `game/src/projection.js` — pinhole camera, chase and cockpit cameras
- `game/src/renderWorld.js` — sky, sea, terrain, runway, town, rings, clouds
- `game/src/renderAircraft.js` — the Kestrel and the cockpit frame
- `game/src/instruments.js` — HUD, artificial horizon, dials, fuel and damage
- `game/src/missions.js` — the three missions, scoring and timers
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — generated WebAudio engine, wind and event sounds
- `game/src/screens.js` — menu, pause and end screens
- `game/src/shots.js` — `?shot=` staging used to capture the screenshots
- `screenshots/` — four real renders of the game in a browser
- `main.ts` — the make.fun hand-in program; `vendor/makefun-game.ts` is the kit library, unchanged

## License

MIT — see `LICENSE`.
