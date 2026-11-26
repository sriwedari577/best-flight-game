// Menu, pause and end screens: drawn on the canvas, clickable
// with the mouse and operable with keys 1/2/3 and Enter.

import { MISSIONS } from './missions.js';

export function missionCardRects(w, h) {
  const cw = 250;
  const gap = 22;
  const total = cw * 3 + gap * 2;
  const x0 = (w - total) / 2;
  const y = h * 0.44;
  return Object.keys(MISSIONS).map((id, i) => ({
    id, x: x0 + i * (cw + gap), y, w: cw, h: 190,
  }));
}

function button(ctx, x, y, w, h, label, hot) {
  ctx.fillStyle = hot ? '#ffd34d' : 'rgba(20,28,38,0.9)';
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hot ? '#1c2430' : '#ffffff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 6);
}

export function drawMenu(ctx, w, h, selected, time) {
  ctx.fillStyle = 'rgba(8,16,28,0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('ISLAND AIR PATROL  •  ORIGINAL FLIGHT GAME', w / 2, h * 0.14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('COASTAL SKIES', w / 2, h * 0.24);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Fly the Kestrel over the coast — rings, landings and a timed dash.', w / 2, h * 0.30);
  ctx.fillText('Throttle and turn discipline win sorties. Fuel and damage force decisions.', w / 2, h * 0.345);
  const cards = missionCardRects(w, h);
  cards.forEach((c, i) => {
    const hot = selected === c.id;
    ctx.fillStyle = hot ? 'rgba(255,211,77,0.16)' : 'rgba(14,22,34,0.88)';
    ctx.strokeStyle = hot ? '#ffd34d' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = hot ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, 12);
    ctx.fill();
    ctx.stroke();
    const m = MISSIONS[c.id];
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`PRESS ${i + 1}`, c.x + c.w / 2, c.y + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(m.name, c.x + c.w / 2, c.y + 62);
    ctx.fillStyle = '#cfe0ee';
    ctx.font = '14px system-ui, sans-serif';
    wrapText(ctx, m.goal, c.x + 18, c.y + 92, c.w - 36, 19);
    ctx.fillStyle = '#9fb4c4';
    ctx.font = '12px system-ui, sans-serif';
    wrapText(ctx, m.tip, c.x + 18, c.y + 148, c.w - 36, 16);
  });
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  const pulse = 0.7 + 0.3 * Math.sin(time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK A MISSION OR PRESS 1 / 2 / 3, THEN ENTER TO FLY', w / 2, h * 0.44 + 225);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('W/S or ↑/↓ pitch  •  A/D or ←/→ bank and turn  •  SHIFT / CTRL throttle  •  Mouse steers  •  C cockpit/chase  •  P pause', w / 2, h * 0.44 + 258);
  ctx.fillText('Landings: slow, level wings, gentle descent onto the runway. Crashes: hard, fast or steep ground contact.', w / 2, h * 0.44 + 282);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x + maxW / 2, yy);
      line = word;
      yy += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x + maxW / 2, yy);
}

export function drawPause(ctx, w, h) {
  ctx.fillStyle = 'rgba(8,16,28,0.66)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('PAUSED', w / 2, h * 0.42);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('P resume  •  R restart sortie  •  M sound  •  C change view  •  ESC back to menu', w / 2, h * 0.50);
}

export function drawEndScreen(ctx, w, h, kind, missionState, plane) {
  ctx.fillStyle = kind === 'crash' ? 'rgba(40,10,8,0.72)' : 'rgba(8,24,16,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  const title = kind === 'crash' ? 'CRASHED' : kind === 'complete' ? 'MISSION COMPLETE' : 'SORTIE OVER';
  ctx.fillStyle = kind === 'crash' ? '#ff7a5c' : '#ffd34d';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(title, w / 2, h * 0.32);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(missionState.doneReason || (kind === 'crash' ? 'The Kestrel came down hard. Check speed, descent and alignment next time.' : ''), w / 2, h * 0.40);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${missionState.score}   •   TIME ${Math.round(missionState.elapsed)}s   •   FUEL ${Math.round(plane.fuel)}%`, w / 2, h * 0.49);
  if (missionState.bonus > 0) {
    ctx.fillStyle = '#cfe0ee';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`Includes bonus +${missionState.bonus} for a clean finish and fuel remaining.`, w / 2, h * 0.55);
  }
  button(ctx, w / 2 - 260, h * 0.64, 240, 52, 'FLY AGAIN  (R)', false);
  button(ctx, w / 2 + 20, h * 0.64, 240, 52, 'CHANGE MISSION  (ESC)', false);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('R restarts this sortie. ESC returns to the mission menu.', w / 2, h * 0.64 + 84);
}
