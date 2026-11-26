// Coastal Skies: deterministic world height and features.
// The island airfield sits at the origin; the sea is to the west,
// a town and the airfield are on the coastal plain, and a mountain
// ridge rises to the east. All heights are pure functions of x/z,
// so the terrain is identical on every run.

export const SEA_LEVEL = 0;
export const RUNWAY_HALF_WIDTH = 22;
export const RUNWAY_HALF_LENGTH = 360;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function bump(x, z, cx, cz, radius, height) {
  const dx = x - cx;
  const dz = z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 > radius * radius) return 0;
  const t = 1 - d2 / (radius * radius);
  return height * t * t;
}

function coastLine(z) {
  return -620 + 130 * Math.sin(z * 0.0009) + 60 * Math.sin(z * 0.0023 + 1.7);
}

// Rolling inland hills, kept gentle so the airfield stays readable.
function hillField(x, z) {
  return (
    14 * Math.sin(x * 0.0016 + 1.2) * Math.cos(z * 0.0011 + 0.4) +
    9 * Math.sin(x * 0.0037 + z * 0.0021) +
    5 * Math.sin(x * 0.008 + 3.1) * Math.sin(z * 0.006 + 0.7)
  );
}

export function terrainHeight(x, z) {
  const coast = coastLine(z);
  // Seabed, sloping down away from the beach.
  let h = -10 + 0.006 * Math.max(0, coast - x);
  // Beach ramp up to the coastal plain.
  const beach = smoothstep(coast - 90, coast + 110, x);
  h = h + (6 - h) * beach;
  // Inland hills: the coastal plain never dips below the beach.
  h += hillField(x, z) * smoothstep(coast + 80, coast + 320, x);
  if (x > coast + 110) h = Math.max(h, 2.5);
  // Eastern mountain ridge.
  h += 330 * smoothstep(850, 1500, x) + 60 * smoothstep(700, 900, x) * (0.5 + 0.5 * Math.sin(z * 0.004));
  // Two sea islands, clear of the beach.
  h += bump(x, z, -1080, 620, 300, 46);
  h += bump(x, z, -1350, -640, 260, 38);
  h += bump(x, z, -900, -120, 130, 12);
  // Flatten the runway strip and its approaches.
  const onStrip = Math.abs(x) < 150 && Math.abs(z) < 620;
  if (onStrip) {
    const w = smoothstep(150, 60, Math.abs(x)) * smoothstep(620, 420, Math.abs(z));
    h = h * (1 - w) + 2 * w;
  }
  // Flatten the town pad.
  const inTown = x > 260 && x < 760 && z > -320 && z < 340;
  if (inTown) {
    const w = smoothstep(260, 330, x) * smoothstep(760, 690, x) * smoothstep(-320, -240, z) * smoothstep(340, 260, z);
    h = h * (1 - w) + 7 * w;
  }
  // Gentle approach valley south of the runway, so a final approach
  // descends over flat ground instead of a 20 m plateau.
  if (Math.abs(x) < 200 && z > 300 && z < 1000) {
    const w = smoothstep(200, 90, Math.abs(x)) * smoothstep(1000, 720, z);
    h = h * (1 - w) + 3 * w;
  }
  return h;
}

export function groundType(x, z) {
  const h = terrainHeight(x, z);
  const coast = coastLine(z);
  if (h < 0.6 && x < coast + 140) return 'sand';
  if (Math.abs(x) < RUNWAY_HALF_WIDTH + 14 && Math.abs(z) < RUNWAY_HALF_LENGTH + 14) return 'apron';
  if (x > 260 && x < 760 && z > -320 && z < 340) return 'town';
  if (h > 180) return 'rock';
  if (h > 90) return 'highland';
  if (x < coast + 130) return 'dune';
  return 'grass';
}

export function terrainColor(x, z) {
  const h = terrainHeight(x, z);
  const type = groundType(x, z);
  // Long-wavelength variation only: the mesh cells are 110 m wide,
  // so any faster noise flips colour cell-to-cell and reads as a
  // patchwork grid. Wavelengths here are ~1.5 km and up, so
  // neighbouring cells blend and only broad fields remain.
  const n = 0.5 + 0.5 * Math.sin(x * 0.0038 + z * 0.0029) * Math.sin(x * 0.0013 - z * 0.0021 + 1.3);
  if (type === 'sand') return h < 0.2 ? '#d9c48f' : '#dccb9a';
  if (type === 'apron') return '#7d8a7a';
  if (type === 'town') return '#b9a888';
  if (type === 'rock') {
    const r = Math.round(123 + 15 * n);
    const g = Math.round(118 + 15 * n);
    const b = Math.round(110 + 16 * n);
    return `rgb(${r},${g},${b})`;
  }
  if (type === 'highland') {
    const g = Math.round(125 + 10 * n);
    return `rgb(${104 + Math.round(8 * n)},${g},${82 + Math.round(6 * n)})`;
  }
  if (type === 'dune') return '#cbb98a';
  const g = 96 + Math.round(14 * n) + Math.min(20, Math.max(0, h * 0.25));
  return `rgb(${58 + Math.round(7 * n)},${g},${52 + Math.round(5 * n)})`;
}

// Town buildings: simple boxes with a roof colour, all on the town pad.
export const TOWN_BUILDINGS = (() => {
  const list = [];
  const rows = [
    [330, -260, 26, 34, 22], [395, -260, 22, 30, 16], [455, -260, 30, 30, 28],
    [520, -255, 24, 34, 18], [590, -260, 26, 30, 24], [660, -255, 24, 30, 15],
    [335, -180, 24, 28, 14], [400, -175, 28, 28, 26], [470, -180, 22, 30, 19],
    [545, -175, 30, 28, 32], [625, -180, 24, 28, 17], [690, -175, 22, 26, 13],
    [340, -90, 26, 30, 18], [410, -85, 24, 28, 12], [480, -90, 30, 28, 24],
    [555, -85, 24, 30, 16], [630, -90, 28, 28, 30], [695, -85, 20, 26, 11],
    [335, 10, 24, 30, 15], [405, 15, 28, 28, 21], [480, 10, 24, 30, 14],
    [550, 15, 30, 28, 26], [625, 10, 24, 28, 18], [360, 110, 26, 30, 17],
    [435, 115, 24, 28, 23], [510, 110, 28, 30, 15], [585, 115, 24, 28, 19],
    [350, 210, 24, 28, 13], [425, 215, 28, 28, 20], [505, 210, 24, 30, 16],
    [580, 215, 26, 28, 25], [655, 210, 22, 26, 12],
  ];
  const roofs = ['#b8543f', '#c97b4a', '#8a6f4d', '#a8513f', '#7d8a99'];
  for (let i = 0; i < rows.length; i++) {
    const [x, z, w, d, hgt] = rows[i];
    list.push({ x, z, w, d, h: hgt, roof: roofs[i % roofs.length], wall: i % 3 === 0 ? '#efe6d4' : '#e3d9c2' });
  }
  // Airfield hangars and tower, west of the runway.
  list.push({ x: -95, z: -120, w: 46, d: 60, h: 20, roof: '#5d6b7a', wall: '#c8ccd2' });
  list.push({ x: -95, z: 60, w: 46, d: 60, h: 20, roof: '#5d6b7a', wall: '#c8ccd2' });
  list.push({ x: -90, z: 230, w: 20, d: 20, h: 42, roof: '#3f4a56', wall: '#d8d2c2' });
  return list;
})();

// Lone trees dotted around the plain, away from strip and town.
export const TREES = (() => {
  const list = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 90; i++) {
    const x = -480 + rnd() * 1250;
    const z = -900 + rnd() * 1800;
    if (Math.abs(x) < 130 && Math.abs(z) < 560) continue;
    if (x > 240 && x < 780 && z > -340 && z < 360) continue;
    if (x < coastLine(z) + 60) continue;
    list.push({ x, z, h: 9 + rnd() * 7 });
  }
  return list;
})();

// Clouds: fixed puffs drifting slowly east, drawn as soft billboards.
export const CLOUDS = (() => {
  const list = [];
  let seed = 31;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    list.push({
      x: -1800 + rnd() * 3400,
      z: -2400 + rnd() * 4800,
      y: 300 + rnd() * 220,
      s: 90 + rnd() * 150,
      drift: 3 + rnd() * 4,
    });
  }
  return list;
})();

export function runwayCorners() {
  return [
    { x: -RUNWAY_HALF_WIDTH, y: 2.4, z: -RUNWAY_HALF_LENGTH },
    { x: RUNWAY_HALF_WIDTH, y: 2.4, z: -RUNWAY_HALF_LENGTH },
    { x: RUNWAY_HALF_WIDTH, y: 2.4, z: RUNWAY_HALF_LENGTH },
    { x: -RUNWAY_HALF_WIDTH, y: 2.4, z: RUNWAY_HALF_LENGTH },
  ];
}
