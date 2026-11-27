// The aircraft, drawn as a built machine: chase view shows the
// Kestrel from behind and above; cockpit view shows the nose,
// spinning propeller and the panel frame around the windscreen.

export function drawChaseAircraft(ctx, w, h, plane, time, crashed) {
  const cx = w * 0.5;
  const cy = h * 0.56;
  const s = h / 720;
  const bank = plane.roll;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-bank * 0.9);
  ctx.scale(s, s);
  if (crashed) ctx.rotate(0.5);
  // Shadow of the aircraft on the ground far below is drawn by the
  // caller through the world; here the machine itself:
  // Wings.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-24, -8); ctx.lineTo(24, -8); ctx.lineTo(150, 6);
  ctx.lineTo(138, 18); ctx.lineTo(-138, 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.moveTo(-150, 6); ctx.lineTo(-138, 18); ctx.lineTo(-108, 16); ctx.lineTo(-122, 4); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(150, 6); ctx.lineTo(138, 18); ctx.lineTo(108, 16); ctx.lineTo(122, 4); ctx.closePath(); ctx.fill();
  // Tailplane and fin.
  ctx.fillStyle = '#a82f24';
  ctx.beginPath();
  ctx.moveTo(-52, -52); ctx.lineTo(-12, -58); ctx.lineTo(12, -58); ctx.lineTo(52, -52);
  ctx.lineTo(44, -42); ctx.lineTo(-44, -42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(0, -62); ctx.lineTo(16, -34); ctx.lineTo(-2, -30); ctx.closePath(); ctx.fill();
  // Fuselage, tapering toward the tail.
  const fus = ctx.createLinearGradient(-14, 0, 14, 0);
  fus.addColorStop(0, '#e8e4da');
  fus.addColorStop(0.5, '#f5f1e6');
  fus.addColorStop(1, '#cfc9b8');
  ctx.fillStyle = fus;
  ctx.beginPath();
  ctx.moveTo(-13, 30); ctx.lineTo(-10, -48); ctx.lineTo(0, -62); ctx.lineTo(10, -48); ctx.lineTo(13, 30);
  ctx.quadraticCurveTo(0, 42, -13, 30);
  ctx.closePath(); ctx.fill();
  // Cockpit canopy.
  ctx.fillStyle = '#1d3a52';
  ctx.beginPath();
  ctx.ellipse(0, -18, 9, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,245,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3, -24, 4, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Registration stripe and roundel.
  ctx.fillStyle = '#1d3a52';
  ctx.fillRect(-13, 8, 26, 5);
  ctx.fillStyle = '#f5f1e6';
  ctx.beginPath(); ctx.arc(-84, 4, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath(); ctx.arc(-84, 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(84, 4, 9, 0, Math.PI * 2); ctx.fillStyle = '#f5f1e6'; ctx.fill();
  ctx.beginPath(); ctx.arc(84, 4, 5, 0, Math.PI * 2); ctx.fillStyle = '#c23b2e'; ctx.fill();
  // Propeller blur at the nose (top of the drawing, away from camera).
  const spin = crashed ? 0 : 0.35 + plane.throttle * 0.65;
  ctx.fillStyle = `rgba(60,60,66,${0.25 + spin * 0.4})`;
  ctx.beginPath();
  ctx.ellipse(0, -64, 26 * spin + 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Smoke / fire when damaged.
  if (plane.damage > 35 && !crashed) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.ellipse(6, -70 - (time % 1) * 30, 10, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (crashed) {
    ctx.fillStyle = 'rgba(255,110,20,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,60,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCockpitFrame(ctx, w, h, plane, time) {
  const s = h / 720;
  ctx.save();
  // Nose and spinning propeller, bold and centred in the windscreen
  // over the panel: the nose must read instantly as the aircraft
  // itself, not as a marking on the ground below.
  const nx = w * 0.5;
  const ny = h * 0.66;
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(nx - 38 * s, ny + 66 * s);
  ctx.lineTo(nx - 15 * s, ny - 72 * s);
  ctx.lineTo(nx + 15 * s, ny - 72 * s);
  ctx.lineTo(nx + 38 * s, ny + 66 * s);
  ctx.closePath(); ctx.fill();
  // Cream centre stripe down the nose, widening toward the panel.
  ctx.fillStyle = '#f5f1e6';
  ctx.beginPath();
  ctx.moveTo(nx - 5 * s, ny - 68 * s);
  ctx.lineTo(nx + 5 * s, ny - 68 * s);
  ctx.lineTo(nx + 10 * s, ny + 62 * s);
  ctx.lineTo(nx - 10 * s, ny + 62 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.fillRect(nx - 38 * s, ny + 56 * s, 76 * s, 5 * s);
  // Propeller disc, centred on the nose tip: a wide, visible disc
  // with two blurred blades and a spinner hub. Kept compact so
  // the runway centreline ahead stays clear of the blur.
  const propR = 54 * s * (0.45 + plane.throttle * 0.55);
  ctx.fillStyle = 'rgba(58,58,66,0.46)';
  ctx.beginPath();
  ctx.ellipse(nx, ny - 72 * s, propR, propR * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,30,36,0.6)';
  ctx.lineWidth = 4 * s;
  const a = time * (6 + plane.throttle * 22);
  for (const off of [0, Math.PI / 2]) {
    const aa = a + off;
    ctx.beginPath();
    ctx.moveTo(nx - Math.cos(aa) * propR, ny - 72 * s - Math.sin(aa) * propR * 0.42);
    ctx.lineTo(nx + Math.cos(aa) * propR, ny - 72 * s + Math.sin(aa) * propR * 0.42);
    ctx.stroke();
  }
  ctx.fillStyle = '#1d3a52';
  ctx.beginPath();
  ctx.arc(nx, ny - 72 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5f1e6';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(nx, ny - 72 * s, 7 * s, 0, Math.PI * 2);
  ctx.stroke();
  // Windscreen pillars and roof.
  ctx.fillStyle = '#23262c';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w * 0.07, h * 0.20); ctx.lineTo(w * 0.115, h * 0.20); ctx.lineTo(0, h * 0.05);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, 0); ctx.lineTo(w * 0.93, h * 0.20); ctx.lineTo(w * 0.885, h * 0.20); ctx.lineTo(w, h * 0.05);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(0, 0, w, h * 0.04);
  // Cream inner edge so each pillar reads as cockpit frame,
  // not a stray dark triangle.
  ctx.strokeStyle = 'rgba(245,241,230,0.35)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(w * 0.115, h * 0.20); ctx.lineTo(0, h * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.885, h * 0.20); ctx.lineTo(w, h * 0.05);
  ctx.stroke();
  // Glareshield.
  const shield = ctx.createLinearGradient(0, h * 0.62, 0, h * 0.74);
  shield.addColorStop(0, '#2b2e34');
  shield.addColorStop(1, '#17191d');
  ctx.fillStyle = shield;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.74);
  ctx.lineTo(0, h * 0.66);
  ctx.quadraticCurveTo(w * 0.5, h * 0.60, w, h * 0.66);
  ctx.lineTo(w, h * 0.74);
  ctx.closePath(); ctx.fill();
  // Dashboard panel: fills the bottom of the windscreen so the
  // world never shows through below the glareshield.
  const panelGrad = ctx.createLinearGradient(0, h * 0.74, 0, h);
  panelGrad.addColorStop(0, '#23262c');
  panelGrad.addColorStop(0.12, '#1b1e24');
  panelGrad.addColorStop(1, '#101216');
  ctx.fillStyle = panelGrad;
  ctx.fillRect(0, h * 0.74, w, h * 0.26);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, h * 0.74, w, 2);
  // Rivet dots along the panel top edge.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let rx = w * 0.04; rx < w * 0.97; rx += w * 0.06) {
    if (Math.abs(rx - w * 0.5) < 60 * s) continue;
    ctx.beginPath(); ctx.arc(rx, h * 0.758, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  }
  // Two standby dials, left and right of the nose, in the clear
  // gap between the two floating HUD panels.
  for (const dx of [w * 0.40, w * 0.60]) {
    const dy = h * 0.885;
    const dr = 30 * s;
    const face = ctx.createRadialGradient(dx - dr * 0.3, dy - dr * 0.3, dr * 0.1, dx, dy, dr);
    face.addColorStop(0, '#2e3a44');
    face.addColorStop(1, '#10161c');
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8d9a0';
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,217,160,0.8)';
    ctx.lineWidth = 1.5 * s;
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(dx + Math.cos(a) * dr * 0.8, dy + Math.sin(a) * dr * 0.8);
      ctx.lineTo(dx + Math.cos(a) * dr * 0.92, dy + Math.sin(a) * dr * 0.92);
      ctx.stroke();
    }
    const na = Math.PI * 0.75 + 0.62 * Math.PI * 1.5;
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(dx - Math.cos(na) * dr * 0.15, dy - Math.sin(na) * dr * 0.15);
    ctx.lineTo(dx + Math.cos(na) * dr * 0.72, dy + Math.sin(na) * dr * 0.72);
    ctx.stroke();
  }
  // Centre compass strip, below the nose.
  const stripX = w * 0.42;
  const stripW = w * 0.16;
  const stripY = h * 0.795;
  ctx.fillStyle = '#10161c';
  ctx.fillRect(stripX, stripY, stripW, 26 * s);
  ctx.strokeStyle = 'rgba(232,217,160,0.6)';
  ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(stripX, stripY, stripW, 26 * s);
  ctx.fillStyle = '#eef2f5';
  ctx.font = `bold ${Math.round(13 * s)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const marks = ['N', 'E', 'S', 'W'];
  marks.forEach((m, i) => {
    const mx = stripX + stripW * (0.14 + i * 0.24);
    ctx.fillText(m, mx, stripY + 18 * s);
  });
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(w * 0.5 - 1.5 * s, stripY, 3 * s, 7 * s);
  // Switch row along the bottom of the panel.
  for (let i = 0; i < 12; i++) {
    const sx = w * 0.10 + i * w * 0.072;
    const sy = h * 0.945;
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(sx, sy, 14 * s, 8 * s);
    ctx.fillStyle = i % 3 === 0 ? '#ffd34d' : '#c8ccd4';
    ctx.fillRect(sx + 3 * s, sy - 6 * s, 8 * s, 7 * s);
  }
  // Round knobs flanking the standby dials.
  for (const kx of [w * 0.335, w * 0.665]) {
    ctx.fillStyle = '#2b2e34';
    ctx.beginPath(); ctx.arc(kx, h * 0.885, 11 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.arc(kx, h * 0.885, 11 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(kx, h * 0.885);
    ctx.lineTo(kx + 7 * s, h * 0.885 - 7 * s);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,211,77,0.25)';
  ctx.fillRect(w * 0.42, h * 0.78, w * 0.16, 3);
  ctx.restore();
}
