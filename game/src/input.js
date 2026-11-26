// Keyboard and mouse input: arrows/WASD fly, Shift/Ctrl work the
// throttle, C swaps the view, P pauses, R restarts, M mutes.
// Mouse position steers gently; clicks press menu buttons.

export function makeInput() {
  return {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 0.5, mouseY: 0.5, mouseSeen: false, mouseDown: false, clicked: false,
    clickX: 0, clickY: 0,
    pitchIn: 0, rollIn: 0, throttleIn: 0,
  };
}

export function bindInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    const name = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    input.keys.add(name);
    input.pressed.add(name);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseSeen = true;
    input.mouseX = (e.clientX - r.left) / r.width;
    input.mouseY = (e.clientY - r.top) / r.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseDown = true;
    input.clicked = true;
    input.clickX = (e.clientX - r.left) / r.width;
    input.clickY = (e.clientY - r.top) / r.height;
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('touchstart', (e) => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    input.clicked = true;
    input.clickX = (t.clientX - r.left) / r.width;
    input.clickY = (t.clientY - r.top) / r.height;
  }, { passive: true });
}

export function readControl(input, flying) {
  const k = input.keys;
  let pitch = 0;
  let roll = 0;
  if (k.has('ArrowUp') || k.has('w')) pitch += 1;
  if (k.has('ArrowDown') || k.has('s')) pitch -= 1;
  if (k.has('ArrowLeft') || k.has('a')) roll -= 1;
  if (k.has('ArrowRight') || k.has('d')) roll += 1;
  // Gentle mouse steering around the centre of the screen.
  if (flying && input.mouseSeen && !input.mouseDown) {
    const mx = (input.mouseX - 0.5) * 2;
    const my = (input.mouseY - 0.5) * 2;
    if (Math.abs(mx) > 0.25) roll += Math.max(-0.7, Math.min(0.7, mx * 0.9));
    if (Math.abs(my) > 0.25) pitch += Math.max(-0.7, Math.min(0.7, -my * 0.8));
  }
  let throttle = 0;
  if (k.has('Shift') || k.has('+') || k.has('=')) throttle += 1;
  if (k.has('Control') || k.has('-') || k.has('_')) throttle -= 1;
  if (k.has('PageUp')) throttle += 1;
  if (k.has('PageDown')) throttle -= 1;
  input.pitchIn = Math.max(-1, Math.min(1, pitch));
  input.rollIn = Math.max(-1, Math.min(1, roll));
  input.throttleIn = throttle;
  return { pitchIn: input.pitchIn, rollIn: input.rollIn, throttleIn: throttle };
}

export function wasPressed(input, ...names) {
  for (const n of names) {
    if (input.pressed.has(n)) {
      input.pressed.delete(n);
      return true;
    }
  }
  return false;
}

export function consumeClick(input) {
  if (!input.clicked) return null;
  input.clicked = false;
  return { x: input.clickX, y: input.clickY };
}
