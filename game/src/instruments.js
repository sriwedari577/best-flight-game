// HUD and instruments: big legible altitude / speed / heading,
// a lit artificial horizon, airspeed and altitude dials, fuel and
// damage bars, mission progress and warnings. Everything is drawn
// on the canvas so it is present in every screenshot.

import { headingDegrees, compassLabel } from './projection.js';
import { missionProgressText } from './missions.js';
import { planeStateText } from './flightModel.js';

function panel(ctx, x, y, w, h, r) {
  ctx.save();
  // Fully opaque so sky, mountains and clouds behind the HUD
  // cannot bleed through the panel and smudge the numbers.
  ctx.fillStyle = 'rgb(10,14,20)';
  ctx.strokeStyle = 'rgba(255,210,90,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function dial(ctx, cx, cy, r, label, valueText, frac, warn) {
  ctx.save();
  // Lit dial face.
  const face = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  face.addColorStop(0, warn ? '#5a2320' : '#2e3a44');
  face.addColorStop(1, '#10161c');
  ctx.fillStyle = face;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = warn ? '#ff6a55' : '#e8d9a0';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  // Tick marks.
  ctx.strokeStyle = 'rgba(232,217,160,0.8)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
    ctx.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94);
    ctx.stroke();
  }
  // Needle.
  const na = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.strokeStyle = warn ? '#ff8a70' : '#ffd34d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(na) * r * 0.18, cy - Math.sin(na) * r * 0.18);
  ctx.lineTo(cx + Math.cos(na) * r * 0.78, cy + Math.sin(na) * r * 0.78);
  ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eef2f5';
  ctx.font = `bold ${Math.round(r * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(valueText, cx, cy + r * 0.52);
  ctx.fillStyle = '#9fb4c4';
  ctx.font = `${Math.round(r * 0.26)}px system-ui, sans-serif`;
  ctx.fillText(label, cx, cy + r * 1.28);
  ctx.restore();
}

export function drawArtificialHorizon(ctx, cx, cy, r, plane) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll);
  const pitchPx = plane.pitch * r * 1.4;
  // Sky and ground halves, shifted by pitch.
  ctx.fillStyle = '#5aa3d8';
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 + pitchPx);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(-r * 2, pitchPx, r * 4, r * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-r * 2, pitchPx); ctx.lineTo(r * 2, pitchPx); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  for (const off of [-0.35, 0.35]) {
    ctx.beginPath(); ctx.moveTo(-r * 0.5, pitchPx + off * r); ctx.lineTo(r * 0.5, pitchPx + off * r); ctx.stroke();
  }
  ctx.rotate(plane.roll);
  // Fixed wings symbol.
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, 0); ctx.lineTo(-r * 0.18, 0); ctx.lineTo(0, 0); ctx.lineTo(r * 0.18, 0); ctx.lineTo(r * 0.62, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e8d9a0';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#9fb4c4';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, cy + r + 14);
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#eef2f5';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 4);
}

export function drawHud(ctx, w, h, plane, missionState, view, time, muted) {
  const deg = headingDegrees(plane.heading);
  const altM = Math.max(0, Math.round(plane.y));
  const spdKt = Math.round(plane.speed * 1.94);
  // Top-left flight data: always large and legible.
  panel(ctx, 14, 12, 318, 86, 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fb4c8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ALTITUDE', 28, 34);
  ctx.fillText('SPEED', 138, 34);
  ctx.fillText('HEADING', 238, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`${altM}m`, 28, 66);
  ctx.fillText(`${spdKt}kt`, 138, 66);
  ctx.fillText(`${String(Math.round(deg)).padStart(3, '0')}°`, 238, 66);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(compassLabel(deg), 238, 88);
  ctx.fillStyle = '#8fb4c8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('THR', 28, 88);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, 58, 88);

  // Top-right mission block.
  panel(ctx, w - 332, 12, 318, 86, 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(missionState.id === 'rings' ? 'RING RUN' : missionState.id === 'dash' ? 'COAST DASH' : 'ISLAND LANDING', w - 316, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(missionProgressText(missionState), w - 316, 64);
  ctx.fillStyle = '#8fb4c8';
  ctx.font = '13px system-ui, sans-serif';
  const right = missionState.id === 'dash' ? `TIME ${Math.max(0, Math.ceil(missionState.timeLeft))}s` : `SCORE ${missionState.score}`;
  ctx.fillText(right, w - 316, 86);

  // State + view pill, top centre.
  const state = planeStateText(plane);
  ctx.font = 'bold 14px system-ui, sans-serif';
  const pillText = `${state}  •  ${view === 'cockpit' ? 'COCKPIT' : 'CHASE'} VIEW  •  ${muted ? 'MUTED' : 'SOUND ON'}`;
  const pw = ctx.measureText(pillText).width + 28;
  panel(ctx, w / 2 - pw / 2, 12, pw, 30, 15);
  ctx.fillStyle = state.includes('STALL') || state === 'CRASHED' ? '#ff7a5c' : '#eef2f5';
  ctx.textAlign = 'center';
  ctx.fillText(pillText, w / 2, 32);

  // Instrument cluster along the bottom.
  const iy = h - 118;
  panel(ctx, 14, iy - 14, 352, 118, 10);
  drawArtificialHorizon(ctx, 62, iy + 38, 34, plane);
  dial(ctx, 150, iy + 38, 34, 'AIRSPEED kt', String(spdKt), plane.speed / 110, plane.stallWarn || plane.overspeedWarn);
  dial(ctx, 240, iy + 38, 34, 'ALT m', String(altM), Math.min(1, plane.y / 500), false);
  dial(ctx, 322, iy + 38, 30, 'HDG', String(Math.round(deg)).padStart(3, '0'), deg / 360, false);

  // Fuel / damage bars, bottom right.
  panel(ctx, w - 286, iy - 14, 272, 118, 10);
  bar(ctx, w - 266, iy + 18, 232, 14, plane.fuel / 100, plane.fuel < 25 ? '#ff6a55' : '#ffb400', `FUEL ${Math.round(plane.fuel)}%`);
  bar(ctx, w - 266, iy + 56, 232, 14, 1 - plane.damage / 100, plane.damage > 60 ? '#ff6a55' : '#4ecb71', `AIRFRAME ${Math.round(100 - plane.damage)}%`);
  ctx.fillStyle = '#8fb4c8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${missionState.score}`, w - 266, iy + 94);

  // Centre warnings.
  if (plane.stallWarn && Math.floor(time * 3) % 2 === 0) {
    ctx.fillStyle = '#ff6a55';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STALL — LOWER THE NOSE, ADD POWER', w / 2, h * 0.30);
  }
  if (plane.overspeedWarn) {
    ctx.fillStyle = '#ff6a55';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OVERSPEED — THROTTLE BACK', w / 2, h * 0.30);
  }
  if (plane.fuel <= 0 && !plane.crashed) {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL EMPTY — GLIDE TO THE RUNWAY', w / 2, h * 0.34);
  }
  // Mission message banner.
  if (missionState.messageTime > 0) {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(missionState.message, w / 2, h * 0.20);
  }
  // Controls hint, bottom centre.
  ctx.fillStyle = 'rgba(238,242,245,0.85)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('W/S pitch  •  A/D bank  •  SHIFT/CTRL throttle  •  C view  •  P pause  •  R restart  •  M sound', w / 2, h - 8);
}
