// ============================================================
// DONKEY KONG - Simple Arcade Game
// HTML5 Canvas + Vanilla JavaScript
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 480;
const H = 600;
canvas.width = W;
canvas.height = H;

// ---- STATE ----
let gameState = 'start';
let score = 0;
let lives = 3;
let level = 1;
let highScore = parseInt(localStorage.getItem('dk_high') || '0');
let barrelTimer = 0;
let barrelInterval = 90;
let frameCount = 0;

// ---- INPUT ----
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });

function bindMobile(id, code) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys[code] = true; });
  btn.addEventListener('touchend', e => { e.preventDefault(); keys[code] = false; });
  btn.addEventListener('mousedown', () => { keys[code] = true; });
  btn.addEventListener('mouseup', () => { keys[code] = false; });
}
bindMobile('btnLeft', 'ArrowLeft');
bindMobile('btnRight', 'ArrowRight');
bindMobile('btnUp', 'ArrowUp');
bindMobile('btnDown', 'ArrowDown');
bindMobile('btnJump', 'Space');

// ---- PLATFORMS ----
function createPlatforms() {
  const plats = [];
  const rows = 6;
  const platH = 10;
  const gapY = (H - 100) / rows;
  for (let i = 0; i < rows; i++) {
    const y = H - 40 - i * gapY;
    const offset = (i % 2 === 0) ? 0 : 40;
    const slope = (i % 2 === 0) ? 0.03 : -0.03;
    plats.push({ x: offset, y, w: W - 40 - offset + (i === 0 ? 40 : 0), h: platH, slope, row: i });
  }
  return plats;
}

// ---- LADDERS ----
function createLadders(platforms) {
  const ladders = [];
  for (let i = 0; i < platforms.length - 1; i++) {
    const p = platforms[i];
    const pAbove = platforms[i + 1];
    const numLadders = (i < platforms.length - 2) ? (1 + Math.floor(Math.random() * 2)) : 1;
    for (let j = 0; j < numLadders; j++) {
      const minX = Math.max(p.x, pAbove.x) + 30;
      const maxX = Math.min(p.x + p.w, pAbove.x + pAbove.w) - 30;
      if (maxX <= minX) continue;
      const lx = minX + Math.random() * (maxX - minX);
      ladders.push({ x: lx, y: pAbove.y + pAbove.h, w: 20, h: p.y - pAbove.y - pAbove.h });
    }
  }
  return ladders;
}

// ---- PLAYER ----
function createPlayer(platforms) {
  const p = platforms[0];
  return { x: p.x + 30, y: p.y - 28, w: 22, h: 28, vx: 0, vy: 0, onGround: true, onLadder: false, facing: 1, walkFrame: 0, invincible: 0 };
}

// ---- DONKEY KONG ----
function createDK(platforms) {
  const top = platforms[platforms.length - 1];
  return { x: top.x + 20, y: top.y - 52, w: 48, h: 52, frame: 0, throwTimer: 0 };
}

// ---- PRINCESS ----
function createPrincess(platforms) {
  const top = platforms[platforms.length - 1];
  return { x: top.x + top.w / 2, y: top.y - 30, w: 20, h: 30 };
}

// ---- BARRELS ----
let barrels = [];
function spawnBarrel(dk, platforms) {
  const topPlat = platforms[platforms.length - 1];
  barrels.push({ x: dk.x + dk.w, y: topPlat.y - 16, w: 16, h: 16, vx: 2.5 + level * 0.3, vy: 0, rotation: 0, row: platforms.length - 1, active: true });
}

// ---- COLLISION ----
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function isOnPlatform(entity, platforms) {
  for (const p of platforms) {
    const feetY = entity.y + entity.h;
    const slopeY = p.y + (entity.x - p.x) * (p.slope || 0);
    if (entity.x + entity.w > p.x && entity.x < p.x + p.w && feetY >= slopeY - 2 && feetY <= slopeY + 8) return p;
  }
  return null;
}

function isOnLadder(entity, ladders) {
  const cx = entity.x + entity.w / 2;
  const cy = entity.y + entity.h / 2;
  for (const l of ladders) {
    if (cx > l.x && cx < l.x + l.w && cy > l.y && cy < l.y + l.h + 10) return l;
  }
  return null;
}

// ---- GAME OBJECTS ----
let platforms, ladders, player, dk, princess;
function initLevel() {
  platforms = createPlatforms();
  ladders = createLadders(platforms);
  player = createPlayer(platforms);
  dk = createDK(platforms);
  princess = createPrincess(platforms);
  barrels = [];
  barrelTimer = 0;
  barrelInterval = Math.max(40, 90 - level * 10);
}
initLevel();

// ---- DRAWING ----
function drawPlatforms() {
  for (const p of platforms) {
    ctx.fillStyle = '#c84c09';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#ff7b39';
    for (let rx = p.x + 5; rx < p.x + p.w; rx += 20) {
      ctx.fillRect(rx, p.y + 2, 8, 3);
      ctx.fillRect(rx, p.y + p.h - 5, 8, 3);
    }
  }
}

function drawLadders() {
  ctx.strokeStyle = '#6fc3df';
  ctx.lineWidth = 2;
  for (const l of ladders) {
    ctx.beginPath();
    ctx.moveTo(l.x + 2, l.y); ctx.lineTo(l.x + 2, l.y + l.h);
    ctx.moveTo(l.x + l.w - 2, l.y); ctx.lineTo(l.x + l.w - 2, l.y + l.h);
    ctx.stroke();
    for (let ry = l.y + 10; ry < l.y + l.h; ry += 14) {
      ctx.beginPath(); ctx.moveTo(l.x + 2, ry); ctx.lineTo(l.x + l.w - 2, ry); ctx.stroke();
    }
  }
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2) return;
  const px = player.x, py = player.y, f = player.facing;
  // Body
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(px + 4, py + 8, 14, 12);
  // Head
  ctx.fillStyle = '#ffd5a0'; ctx.fillRect(px + 6, py, 10, 10);
  // Hat
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(px + 4, py - 2, 14, 4);
  // Eyes
  ctx.fillStyle = '#000'; ctx.fillRect(px + (f > 0 ? 12 : 8), py + 3, 2, 2);
  // Legs
  ctx.fillStyle = '#3498db';
  const lo = player.onGround ? Math.sin(player.walkFrame * 0.3) * 3 : 0;
  ctx.fillRect(px + 5, py + 20, 5, 8 + lo); ctx.fillRect(px + 12, py + 20, 5, 8 - lo);
  // Arms
  ctx.fillStyle = '#ffd5a0'; ctx.fillRect(px + 1, py + 10, 4, 8); ctx.fillRect(px + 17, py + 10, 4, 8);
}

function drawDK() {
  const dx = dk.x, dy = dk.y;
  ctx.fillStyle = '#8B4513'; ctx.fillRect(dx + 6, dy + 14, 36, 30);
  ctx.fillStyle = '#D2691E'; ctx.fillRect(dx + 12, dy + 20, 24, 18);
  ctx.fillStyle = '#8B4513'; ctx.fillRect(dx + 10, dy, 28, 18);
  ctx.fillStyle = '#D2691E'; ctx.fillRect(dx + 14, dy + 4, 20, 12);
  ctx.fillStyle = '#fff'; ctx.fillRect(dx + 16, dy + 5, 6, 5); ctx.fillRect(dx + 26, dy + 5, 6, 5);
  ctx.fillStyle = '#000'; ctx.fillRect(dx + 18, dy + 6, 3, 3); ctx.fillRect(dx + 28, dy + 6, 3, 3);
  ctx.fillStyle = '#000'; ctx.fillRect(dx + 18, dy + 12, 12, 3);
  ctx.fillStyle = '#8B4513';
  const armY = dk.throwTimer > 0 ? -6 : 0;
  ctx.fillRect(dx, dy + 16 + armY, 8, 14); ctx.fillRect(dx + 40, dy + 16 + armY, 8, 14);
  ctx.fillRect(dx + 10, dy + 44, 10, 8); ctx.fillRect(dx + 28, dy + 44, 10, 8);
}

function drawPrincess() {
  const px = princess.x, py = princess.y;
  ctx.fillStyle = '#ff69b4'; ctx.fillRect(px + 3, py + 10, 14, 18); ctx.fillRect(px, py + 22, 20, 8);
  ctx.fillStyle = '#ffd5a0'; ctx.fillRect(px + 5, py, 10, 12);
  ctx.fillStyle = '#f1c40f'; ctx.fillRect(px + 4, py - 2, 12, 5); ctx.fillRect(px + 3, py + 2, 3, 8); ctx.fillRect(px + 14, py + 2, 3, 8);
  ctx.fillStyle = '#000'; ctx.fillRect(px + 7, py + 4, 2, 2); ctx.fillRect(px + 11, py + 4, 2, 2);
  if (Math.floor(frameCount / 30) % 2) { ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.fillText('HELP!', px - 5, py - 8); }
}

function drawBarrels() {
  for (const b of barrels) {
    if (!b.active) continue;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    ctx.rotate(b.rotation);
    ctx.fillStyle = '#c84c09'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, 3);
    ctx.fillRect(-b.w / 2, b.h / 2 - 3, b.w, 3);
    ctx.fillRect(-b.w / 2, -1, b.w, 2);
    ctx.restore();
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a2e'); grad.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

// ---- UPDATE ----
function updatePlayer() {
  const speed = 2.5, gravity = 0.5, jumpForce = -9;
  if (player.invincible > 0) player.invincible--;

  if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -speed; player.facing = -1; player.walkFrame++; }
  else if (keys['ArrowRight'] || keys['KeyD']) { player.vx = speed; player.facing = 1; player.walkFrame++; }
  else { player.vx = 0; }

  const ladder = isOnLadder(player, ladders);
  if (ladder) {
    if (keys['ArrowUp'] || keys['KeyW']) { player.onLadder = true; player.vy = -2.5; player.vx = 0; }
    else if (keys['ArrowDown'] || keys['KeyS']) { player.onLadder = true; player.vy = 2.5; player.vx = 0; }
    else if (player.onLadder) { player.vy = 0; }
  } else { player.onLadder = false; }

  if ((keys['Space'] || keys['ArrowUp']) && player.onGround && !player.onLadder) {
    player.vy = jumpForce; player.onGround = false;
  }

  if (!player.onLadder) player.vy += gravity;
  player.x += player.vx; player.y += player.vy;

  if (!player.onLadder) {
    const plat = isOnPlatform(player, platforms);
    if (plat && player.vy >= 0) {
      player.y = (plat.y + (player.x - plat.x) * (plat.slope || 0)) - player.h;
      player.vy = 0; player.onGround = true;
    } else if (!plat) { player.onGround = false; }
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > W) player.x = W - player.w;
  if (player.y > H + 50) playerDie();
}

function updateBarrels() {
  barrelTimer++;
  if (barrelTimer >= barrelInterval) { barrelTimer = 0; spawnBarrel(dk, platforms); dk.throwTimer = 15; }
  if (dk.throwTimer > 0) dk.throwTimer--;

  for (const b of barrels) {
    if (!b.active) continue;
    b.vy = b.vy || 0;
    b.vy += 0.4;
    b.x += b.vx; b.y += b.vy;
    b.rotation += b.vx * 0.08;

    const plat = isOnPlatform(b, platforms);
    if (plat && b.vy >= 0) {
      b.y = (plat.y + (b.x - plat.x) * (plat.slope || 0)) - b.h;
      b.vy = 0;
      if (plat.row !== b.row) { b.row = plat.row; b.vx = -b.vx; }
    }

    if (b.y > H + 50 || b.x < -50 || b.x > W + 50) b.active = false;

    if (player.invincible <= 0 && rectsOverlap(player, b)) {
      if (player.vy > 0 && player.y + player.h < b.y + 5) { score += 100; b.active = false; }
      else { playerDie(); b.active = false; }
    }
  }

  for (const b of barrels) {
    if (!b.active) continue;
    if (!b.scored && player.y + player.h < b.y && Math.abs(player.x - b.x) < 30 && !player.onGround) {
      score += 100; b.scored = true;
    }
  }
  barrels = barrels.filter(b => b.active);
}

function checkWin() {
  if (rectsOverlap(player, princess)) {
    score += 1000 + level * 500;
    gameState = 'win';
    document.getElementById('winScreen').style.display = 'flex';
    document.getElementById('winScore').textContent = score;
    if (score > highScore) { highScore = score; localStorage.setItem('dk_high', highScore); }
    document.getElementById('winHighScore').textContent = highScore;
  }
}

function playerDie() {
  lives--;
  if (lives <= 0) {
    gameState = 'gameover';
    document.getElementById('gameOver').style.display = 'flex';
    document.getElementById('finalScore').textContent = score;
    if (score > highScore) { highScore = score; localStorage.setItem('dk_high', highScore); }
    document.getElementById('highScore').textContent = highScore;
  } else {
    const p = platforms[0];
    player.x = p.x + 30; player.y = p.y - player.h;
    player.vx = 0; player.vy = 0; player.onGround = true; player.onLadder = false;
    player.invincible = 90; barrels = [];
  }
  updateUI();
}

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('lives').textContent = lives;
  document.getElementById('level').textContent = level;
}

// ---- MAIN LOOP ----
function gameLoop() {
  frameCount++;
  if (gameState === 'playing') {
    drawBackground(); drawPlatforms(); drawLadders(); drawBarrels(); drawDK(); drawPrincess(); drawPlayer();
    updatePlayer(); updateBarrels(); checkWin(); updateUI();
  } else {
    drawBackground(); drawPlatforms(); drawLadders(); drawDK(); drawPrincess();
  }
  requestAnimationFrame(gameLoop);
}

// ---- START / RESTART ----
function handleStart() {
  if (gameState === 'start') {
    gameState = 'playing'; document.getElementById('startScreen').style.display = 'none';
  } else if (gameState === 'gameover') {
    gameState = 'playing'; score = 0; lives = 3; level = 1;
    document.getElementById('gameOver').style.display = 'none'; initLevel(); updateUI();
  } else if (gameState === 'win') {
    level++; document.getElementById('winScreen').style.display = 'none';
    gameState = 'playing'; initLevel(); updateUI();
  }
}

window.addEventListener('keydown', e => { if (e.code === 'Space') handleStart(); });
document.getElementById('btnJump').addEventListener('touchstart', handleStart);

gameLoop();
