// Camera and 3D projection: a pinhole camera with yaw, pitch and
// roll. World axes: x east, y up, z south. Heading 0 faces -z
// (north, toward the far end of the runway from the south).

export function makeCamera() {
  return { x: 0, y: 80, z: 900, yaw: 0, pitch: 0, roll: 0, fov: 1.15 };
}

// Project a world point into screen space. Returns null behind camera.
export function projectPoint(cam, p, w, h) {
  const dx = p.x - cam.x;
  const dy = p.y - cam.y;
  const dz = p.z - cam.z;
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  // Rotate into camera space: forward is -z in camera space.
  let cx = dx * cy - dz * sy;
  let cz = dx * sy + dz * cy;
  let cyv = dy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y1 = cyv * cp - cz * sp;
  const z1 = cyv * sp + cz * cp;
  const cr = Math.cos(cam.roll);
  const sr = Math.sin(cam.roll);
  const x2 = cx * cr - y1 * sr;
  const y2 = cx * sr + y1 * cr;
  const z2 = z1;
  // Camera looks along -z2; points ahead have z2 < 0.
  if (z2 > -0.6) return null;
  const f = (h * 0.5) / Math.tan(cam.fov * 0.5);
  return {
    x: w * 0.5 + (x2 / -z2) * f,
    y: h * 0.5 - (y2 / -z2) * f,
    depth: -z2,
    scale: f / -z2,
  };
}

// Follow camera for chase view: behind and above the aircraft,
// looking along its heading with smoothed motion.
export function chaseCamera(plane, cam, dt, out) {
  const back = 26;
  const up = 7;
  const fx = -Math.sin(plane.heading);
  const fz = -Math.cos(plane.heading);
  const tx = plane.x - fx * back;
  const tz = plane.z - fz * back;
  const ty = plane.y + up + plane.pitch * 6;
  const k = 1 - Math.exp(-dt * 7);
  out.x += (tx - out.x) * k;
  out.y += (ty - out.y) * k;
  out.z += (tz - out.z) * k;
  out.yaw = plane.heading;
  out.pitch = plane.pitch * 0.55 - 0.03;
  out.roll = plane.roll * 0.45;
  return out;
}

// Cockpit camera: at the pilot's head, looking along the nose.
export function cockpitCamera(plane, out) {
  const fx = -Math.sin(plane.heading);
  const fz = -Math.cos(plane.heading);
  out.x = plane.x + fx * 1.6;
  out.y = plane.y + 1.7;
  out.z = plane.z + fz * 1.6;
  out.yaw = plane.heading;
  out.pitch = plane.pitch;
  out.roll = plane.roll;
  return out;
}

export function headingDegrees(heading) {
  let d = (-heading * 180) / Math.PI;
  d = ((d % 360) + 360) % 360;
  return d;
}

export function compassLabel(deg) {
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return points[Math.round(deg / 22.5) % 16];
}
