// World rendering: sky, sea, terrain mesh, runway, town, trees,
// target rings and clouds, all projected with the pinhole camera.

import { projectPoint } from './projection.js';
import { terrainHeight, terrainColor, groundType, TOWN_BUILDINGS, TREES, CLOUDS, runwayCorners, SEA_LEVEL } from './terrain.js';
import { RINGS, CHECKPOINTS } from './missions.js';

function fillPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

export function drawSky(ctx, w, h, cam, time) {
  const horizon = h * 0.5 - (cam.pitch * h * 0.9);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3f7fd6');
  g.addColorStop(0.55, '#8fb8e8');
  g.addColorStop(0.78, '#cfe4f5');
  g.addColorStop(1, '#e8f2f8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Sun with a soft halo, fixed in the sky ahead-left.
  const sunX = w * 0.24;
  const sunY = Math.max(30, horizon - h * 0.30);
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  halo.addColorStop(0, 'rgba(255,246,200,0.95)');
  halo.addColorStop(0.25, 'rgba(255,240,170,0.55)');
  halo.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = '#fff8d8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
  // Distant mountain silhouette along the horizon.
  ctx.fillStyle = 'rgba(96,110,140,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let x = 0; x <= w; x += 24) {
    const peak = 60 * Math.abs(Math.sin(x * 0.006 + 2)) + 30 * Math.abs(Math.sin(x * 0.017));
    ctx.lineTo(x, horizon - peak * (1 + 0.3 * Math.sin(x * 0.002)));
  }
  ctx.lineTo(w, horizon);
  ctx.closePath();
  ctx.fill();
  return horizon;
}

export function drawSea(ctx, w, h, cam, horizon, time) {
  // Sea plane: a wide quad at sea level west of the coast.
  const corners = [
    { x: -2600, y: SEA_LEVEL + 0.4, z: cam.z - 600 },
    { x: -320, y: SEA_LEVEL + 0.4, z: cam.z - 600 },
    { x: -320, y: SEA_LEVEL + 0.4, z: cam.z + 2600 },
    { x: -2600, y: SEA_LEVEL + 0.4, z: cam.z + 2600 },
  ];
  const pts = corners.map((c) => projectPoint(cam, c, w, h));
  if (pts.every(Boolean)) {
    const g = ctx.createLinearGradient(0, pts[0].y, 0, h);
    g.addColorStop(0, '#4f9ec4');
    g.addColorStop(1, '#2e7ba6');
    ctx.fillStyle = g;
    fillPoly(ctx, pts);
    // Shimmer strokes on the water.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const zz = cam.z - 400 + i * 220 + ((time * 30) % 220);
      const a = projectPoint(cam, { x: -2200, y: 0.6, z: zz }, w, h);
      const b = projectPoint(cam, { x: -700, y: 0.6, z: zz }, w, h);
      if (a && b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  // Horizon sea band so the world never shows a void at the edges.
  ctx.fillStyle = '#5aa3c8';
  ctx.fillRect(0, horizon, w, Math.max(0, h * 0.5 - horizon + 2));
}

export function drawTerrainMesh(ctx, w, h, cam) {
  const CELL = 110;
  const x0 = Math.floor((cam.x - 1900) / CELL) * CELL;
  const x1 = cam.x + 1900;
  const zFar = cam.z - 2600;
  const zNear = cam.z + 500;
  const z0 = Math.floor(zFar / CELL) * CELL;
  const rows = [];
  for (let z = z0; z < zNear; z += CELL) rows.push(z);
  // Far rows first: painter's algorithm over a mostly-flat mesh.
  for (let ri = 0; ri < rows.length; ri++) {
    const z = rows[ri];
    for (let x = x0; x < x1; x += CELL) {
      const a = { x, y: terrainHeight(x, z), z };
      const b = { x: x + CELL, y: terrainHeight(x + CELL, z), z };
      const c = { x: x + CELL, y: terrainHeight(x + CELL, z + CELL), z: z + CELL };
      const d = { x, y: terrainHeight(x, z + CELL), z: z + CELL };
      const pa = projectPoint(cam, a, w, h);
      const pb = projectPoint(cam, b, w, h);
      const pc = projectPoint(cam, c, w, h);
      const pd = projectPoint(cam, d, w, h);
      if (!pa || !pb || !pc || !pd) continue;
      // Skip cells fully below the horizon band already painted as sea
      // when the whole cell is underwater: the sea quad covers them.
      const avgH = (a.y + b.y + c.y + d.y) / 4;
      if (avgH < -0.5 && groundType(x + CELL / 2, z + CELL / 2) !== 'sand') continue;
      ctx.fillStyle = terrainColor(x + CELL / 2, z + CELL / 2);
      fillPoly(ctx, [pa, pb, pc, pd]);
    }
  }
}

export function drawRunway(ctx, w, h, cam) {
  // Clamp corners that fall behind the camera to just ahead of it so
  // the strip still fills the frame on short final.
  const corners = runwayCorners().map((c) => {
    const dz = c.z - cam.z;
    const forward = -Math.sin(cam.yaw) * (c.x - cam.x) - Math.cos(cam.yaw) * dz;
    if (forward < 8) return { x: c.x, y: c.y, z: cam.z - 8 * Math.cos(cam.yaw) - 0 };
    return c;
  });
  const pts = corners.map((c) => projectPoint(cam, c, w, h));
  if (!pts.every(Boolean)) return;
  ctx.fillStyle = '#3c3f45';
  fillPoly(ctx, pts);
  // White edge stripes along both sides, so the strip reads as a
  // runway even at contact-sheet size.
  for (const side of [-1, 1]) {
    const e1 = projectPoint(cam, { x: side * 20.4, y: 2.65, z: -352 }, w, h);
    const e2 = projectPoint(cam, { x: side * 22, y: 2.65, z: -352 }, w, h);
    const e3 = projectPoint(cam, { x: side * 22, y: 2.65, z: 352 }, w, h);
    const e4 = projectPoint(cam, { x: side * 20.4, y: 2.65, z: 352 }, w, h);
    if (e1 && e2 && e3 && e4) { ctx.fillStyle = '#e8e8da'; fillPoly(ctx, [e1, e2, e3, e4]); }
  }
  // Centreline dashes.
  ctx.fillStyle = '#f2f2e8';
  for (let i = 0; i < 9; i++) {
    const zA = -330 + i * 74;
    const p1 = projectPoint(cam, { x: -1.6, y: 2.7, z: zA }, w, h);
    const p2 = projectPoint(cam, { x: 1.6, y: 2.7, z: zA }, w, h);
    const p3 = projectPoint(cam, { x: 1.6, y: 2.7, z: zA + 38 }, w, h);
    const p4 = projectPoint(cam, { x: -1.6, y: 2.7, z: zA + 38 }, w, h);
    if (p1 && p2 && p3 && p4) fillPoly(ctx, [p1, p2, p3, p4]);
  }
  // Threshold bars at both ends.
  for (const zend of [-352, 352]) {
    const dir = zend < 0 ? 1 : -1;
    for (let i = -3; i <= 3; i++) {
      const p1 = projectPoint(cam, { x: i * 5 - 2, y: 2.7, z: zend }, w, h);
      const p2 = projectPoint(cam, { x: i * 5 + 2, y: 2.7, z: zend }, w, h);
      const p3 = projectPoint(cam, { x: i * 5 + 2, y: 2.7, z: zend + dir * 22 }, w, h);
      const p4 = projectPoint(cam, { x: i * 5 - 2, y: 2.7, z: zend + dir * 22 }, w, h);
      if (p1 && p2 && p3 && p4) { ctx.fillStyle = '#f2f2e8'; fillPoly(ctx, [p1, p2, p3, p4]); }
    }
  }
  // Runway number + edge lights, with a soft halo so they read at range.
  ctx.fillStyle = '#ffd34d';
  for (let i = -3; i <= 3; i++) {
    for (const side of [-1, 1]) {
      const p = projectPoint(cam, { x: side * 26, y: 3.4, z: i * 100 }, w, h);
      if (p && p.depth < 1600) {
        const r = Math.min(6, Math.max(2, 110 / p.depth));
        ctx.fillStyle = 'rgba(255,211,77,0.30)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawBox(ctx, w, h, cam, b) {
  const y0 = terrainHeight(b.x, b.z);
  const hw = b.w / 2;
  const hd = b.d / 2;
  const corners = [
    { x: b.x - hw, y: y0, z: b.z - hd }, { x: b.x + hw, y: y0, z: b.z - hd },
    { x: b.x + hw, y: y0, z: b.z + hd }, { x: b.x - hw, y: y0, z: b.z + hd },
  ];
  const tops = corners.map((c) => ({ x: c.x, y: y0 + b.h, z: c.z }));
  const pb = corners.map((c) => projectPoint(cam, c, w, h));
  const pt = tops.map((c) => projectPoint(cam, c, w, h));
  if (!pb.every(Boolean) || !pt.every(Boolean)) return;
  const faces = [
    { pts: [pb[0], pb[1], pt[1], pt[0]], color: shade(b.wall, 0.82) },
    { pts: [pb[1], pb[2], pt[2], pt[1]], color: shade(b.wall, 0.66) },
    { pts: [pb[2], pb[3], pt[3], pt[2]], color: shade(b.wall, 0.9) },
    { pts: [pt[0], pt[1], pt[2], pt[3]], color: b.roof },
  ];
  for (const f of faces) { ctx.fillStyle = f.color; fillPoly(ctx, f.pts); }
  // Windows on the two lit faces.
  ctx.fillStyle = 'rgba(40,60,90,0.85)';
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + i * 0.25;
    const wx = pb[1].x + (pb[2].x - pb[1].x) * t;
    const wy = pb[1].y + (pt[1].y - pb[1].y) * 0.6;
    ctx.fillRect(wx - 3, wy - 3, 6, 6);
  }
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function drawTownAndTrees(ctx, w, h, cam) {
  const items = [];
  for (const b of TOWN_BUILDINGS) {
    const dx = b.x - cam.x;
    const dz = b.z - cam.z;
    items.push({ d: dx * dx + dz * dz, kind: 'box', b });
  }
  for (const t of TREES) {
    const dx = t.x - cam.x;
    const dz = t.z - cam.z;
    if (dx * dx + dz * dz > 1500 * 1500) continue;
    items.push({ d: dx * dx + dz * dz, kind: 'tree', t });
  }
  items.sort((a, b) => b.d - a.d);
  for (const it of items) {
    if (it.kind === 'box') {
      drawBox(ctx, w, h, cam, it.b);
    } else {
      const t = it.t;
      const gy = terrainHeight(t.x, t.z);
      const base = projectPoint(cam, { x: t.x, y: gy, z: t.z }, w, h);
      const top = projectPoint(cam, { x: t.x, y: gy + t.h, z: t.z }, w, h);
      if (!base || !top) continue;
      // Size the canopy from the tree's projected height on screen:
      // a fixed-size canopy shrinks to nothing at range and leaves
      // only a bare trunk pin. The triangle grows with the tree.
      const hPx = Math.max(0, base.y - top.y);
      if (hPx < 3) continue;
      const s = Math.max(2, 900 / base.depth);
      ctx.strokeStyle = '#6b4a2f';
      ctx.lineWidth = Math.max(1, s * 0.14);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = '#2f6b33';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y - hPx * 0.85);
      ctx.lineTo(top.x - hPx * 0.45, top.y + hPx * 0.3);
      ctx.lineTo(top.x + hPx * 0.45, top.y + hPx * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawRingShape(ctx, w, h, cam, ring, color, pulse) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    // Ring stands vertical, facing along the course (normal = +z world).
    const p = projectPoint(cam, { x: ring.x + Math.cos(a) * ring.r, y: ring.y + Math.sin(a) * ring.r, z: ring.z }, w, h);
    if (!p) return;
    pts.push(p);
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 2600 / pts[0].depth * 0.09) + pulse;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  // Centre beacon.
  const c = projectPoint(cam, ring, w, h);
  if (c && c.depth < 2200 && c.depth > 40) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.min(9, Math.max(2, 700 / c.depth)), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMissionTargets(ctx, w, h, cam, missionState, time) {
  const pulse = 2 + Math.sin(time * 5) * 1.5;
  if (missionState.id === 'rings') {
    RINGS.forEach((ring, i) => {
      if (i < missionState.index) return;
      const color = i === missionState.index ? '#ffb400' : 'rgba(255,180,0,0.45)';
      const d = Math.hypot(ring.x - cam.x, ring.z - cam.z);
      if (d < 2400) drawRingShape(ctx, w, h, cam, ring, color, i === missionState.index ? pulse : 0);
    });
  } else if (missionState.id === 'dash') {
    CHECKPOINTS.forEach((cp, i) => {
      if (i < missionState.index) return;
      const d = Math.hypot(cp.x - cam.x, cp.z - cam.z);
      if (d < 2400) drawRingShape(ctx, w, h, cam, cp, i === missionState.index ? '#22d3ee' : 'rgba(34,211,238,0.4)', i === missionState.index ? pulse : 0);
    });
  }
  if (missionState.id === 'landing') {
    // Approach lights on the runway centreline, over the strip
    // itself: the old beacons floated off the runway and one sat
    // in the sky on short final. Gate out anything projected into
    // the upper sky so no stray dot appears above the horizon.
    for (let i = 0; i < 4; i++) {
      const p = projectPoint(cam, { x: 0, y: 6 + i * 4, z: 300 - i * 55 }, w, h);
      if (p && p.depth > 50 && p.depth < 1800 && p.y > h * 0.30) {
        ctx.fillStyle = i % 2 ? '#ff5a4d' : '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.min(7, Math.max(2, 600 / p.depth)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function drawClouds(ctx, w, h, cam, time) {
  const drawn = [];
  for (const c of CLOUDS) {
    const cx = c.x + ((time * c.drift) % 3600);
    const p = projectPoint(cam, { x: cx, y: c.y, z: c.z }, w, h);
    if (!p || p.depth < 60) continue;
    drawn.push({ p, s: c.s * p.scale * 0.11 });
  }
  drawn.sort((a, b) => b.p.depth - a.p.depth);
  for (const { p, s } of drawn) {
    if (s < 4) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (const [ox, oy, r] of [[-0.9, 0.1, 0.55], [-0.3, -0.25, 0.7], [0.4, -0.1, 0.62], [0.95, 0.15, 0.45]]) {
      ctx.beginPath();
      ctx.ellipse(p.x + ox * s, p.y + oy * s, r * s, r * s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(190,205,220,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + s * 0.22, s * 1.15, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Off-screen direction arrow pointing at the next target.
export function drawTargetArrow(ctx, w, h, cam, plane, target) {
  if (!target) return;
  const p = projectPoint(cam, target, w, h);
  const onScreen = p && p.x > 40 && p.x < w - 40 && p.y > 40 && p.y < h - 40;
  if (onScreen) {
    // Diamond marker over the target.
    ctx.save();
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 3;
    const s = 14;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s, p.y);
    ctx.closePath(); ctx.stroke();
    ctx.restore();
    return;
  }
  const dx = target.x - plane.x;
  const dz = target.z - plane.z;
  const worldAng = Math.atan2(-dx, -dz);
  let rel = worldAng - plane.heading;
  const sx = w / 2 + Math.sin(-rel) * (w * 0.38);
  const sy = h * 0.22;
  ctx.save();
  ctx.translate(Math.max(50, Math.min(w - 50, sx)), sy);
  ctx.rotate(-rel);
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(11, 10); ctx.lineTo(0, 4); ctx.lineTo(-11, 10);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TARGET', Math.max(50, Math.min(w - 50, sx)), sy + 34);
}
