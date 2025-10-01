const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 480;
canvas.height = 640;

const STORAGE_KEY = 'shurikenHighScore';

const COLORS = {
  bg: '#0b1530',
  accent: '#e23b2b',
  bamboo: '#6aa84f',
  bambooDark: '#4a7d3a',
  paper: '#f3e9d6',
  darkBlue: '#1a2645',
  gold: '#ffd700',
  mountain: '#3d5a80',
  mountainDark: '#293d5a',
  cloud: 'rgba(255, 255, 255, 0.6)',
  sakura: '#ffb7c5'
};

const PHYSICS = {
  gravity: 0.6,
  flapStrength: -10,
  maxFallSpeed: 12,
  rotationSpeed: 0.08
};

const GAME_CONFIG = {
  obstacleSpeed: 3,
  obstacleSpawnInterval: 100,
  obstacleGap: 200,
  minGapHeight: 150,
  maxGapHeight: 150,
  difficultyIncreaseInterval: 500
};

let gameState = 'start';
let score = 0;
let highScore = parseInt(localStorage.getItem(STORAGE_KEY)) || 0;
let frameCount = 0;
let soundEnabled = true;
let deathAnimationTime = 0;
let restartDebounce = false;

const player = {
  x: 120,
  y: 320,
  width: 30,
  height: 30,
  velocity: 0,
  rotation: 0,
  animFrame: 0
};

const obstacles = [];
const particles = [];
const sakuraPetals = [];

const background = {
  mountainOffset: 0,
  cloudOffset: 0
};

for (let i = 0; i < 15; i++) {
  sakuraPetals.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 4 + 2,
    speed: Math.random() * 0.5 + 0.3,
    drift: Math.random() * 0.5 - 0.25
  });
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(0.4, '#b4d7f5');
  gradient.addColorStop(0.7, '#d4e4f5');
  gradient.addColorStop(1, '#f0e8d8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  background.mountainOffset += 0.2;
  if (background.mountainOffset > canvas.width) {
    background.mountainOffset = 0;
  }

  drawMountains(background.mountainOffset);
  drawMountains(background.mountainOffset - canvas.width);

  background.cloudOffset += 0.4;
  if (background.cloudOffset > canvas.width + 100) {
    background.cloudOffset = -100;
  }

  drawCloud(background.cloudOffset, 80);
  drawCloud(background.cloudOffset + 250, 120);
  drawCloud(background.cloudOffset - 200, 160);

  sakuraPetals.forEach(petal => {
    if (gameState === 'playing') {
      petal.y += petal.speed;
      petal.x += petal.drift;

      if (petal.y > canvas.height) {
        petal.y = -10;
        petal.x = Math.random() * canvas.width;
      }
      if (petal.x < -10) petal.x = canvas.width + 10;
      if (petal.x > canvas.width + 10) petal.x = -10;
    }

    ctx.fillStyle = COLORS.sakura;
    ctx.beginPath();
    ctx.arc(petal.x, petal.y, petal.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = COLORS.bamboo;
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

  ctx.fillStyle = COLORS.bambooDark;
  for (let i = 0; i < canvas.width; i += 30) {
    ctx.fillRect(i, canvas.height - 60, 3, 60);
  }
  for (let i = 0; i < canvas.width; i += 15) {
    ctx.fillRect(i, canvas.height - 30, 2, 30);
  }
}

function drawMountains(offsetX) {
  ctx.fillStyle = COLORS.mountain;
  ctx.beginPath();
  ctx.moveTo(offsetX, canvas.height - 200);
  ctx.lineTo(offsetX + 150, canvas.height - 400);
  ctx.lineTo(offsetX + 300, canvas.height - 200);
  ctx.lineTo(offsetX, canvas.height - 200);
  ctx.fill();

  ctx.fillStyle = COLORS.mountainDark;
  ctx.beginPath();
  ctx.moveTo(offsetX + 200, canvas.height - 200);
  ctx.lineTo(offsetX + 350, canvas.height - 350);
  ctx.lineTo(offsetX + 500, canvas.height - 200);
  ctx.lineTo(offsetX + 200, canvas.height - 200);
  ctx.fill();
}

function drawCloud(x, y) {
  ctx.fillStyle = COLORS.cloud;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
  ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.rotation);

  const spinSpeed = Math.floor(frameCount / 5) % 4;
  const rotationAngle = (Math.PI / 2) * spinSpeed;

  ctx.fillStyle = '#2c2c2c';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = rotationAngle + (Math.PI / 2) * i;
    const tipX = Math.cos(angle) * 16;
    const tipY = Math.sin(angle) * 16;
    const innerX = Math.cos(angle + Math.PI / 4) * 6;
    const innerY = Math.sin(angle + Math.PI / 4) * 6;
    const nextInnerX = Math.cos(angle + Math.PI / 2 - Math.PI / 4) * 6;
    const nextInnerY = Math.sin(angle + Math.PI / 2 - Math.PI / 4) * 6;

    if (i === 0) ctx.moveTo(tipX, tipY);
    else ctx.lineTo(tipX, tipY);
    ctx.lineTo(innerX, innerY);
    ctx.lineTo(0, 0);
    ctx.lineTo(nextInnerX, nextInnerY);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach(obstacle => {
    if (obstacle.type === 'bamboo') {
      drawBambooPole(obstacle.x, 0, obstacle.topHeight);
      drawBambooPole(obstacle.x, obstacle.bottomY, canvas.height - 60 - obstacle.bottomY);
    } else if (obstacle.type === 'torii') {
      drawTorii(obstacle.x, obstacle.topHeight, obstacle.bottomY);
    }
  });
}

function drawBambooPole(x, y, height) {
  ctx.fillStyle = COLORS.bamboo;
  ctx.fillRect(x, y, 60, height);

  ctx.fillStyle = COLORS.bambooDark;
  ctx.fillRect(x, y, 4, height);
  ctx.fillRect(x + 56, y, 4, height);

  ctx.fillStyle = '#8bc34a';
  ctx.fillRect(x + 8, y + 4, 44, height - 8);

  for (let segY = y; segY < y + height; segY += 40) {
    ctx.fillStyle = COLORS.bambooDark;
    ctx.fillRect(x, segY, 60, 3);
  }

  ctx.strokeStyle = COLORS.bambooDark;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, 60, height);
}

function drawTorii(x, topHeight, bottomY) {
  const gateY = topHeight;
  const gateHeight = bottomY - topHeight;
  const pillarWidth = 15;
  const beamHeight = 20;

  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(x + 5, gateY + beamHeight, pillarWidth, gateHeight - beamHeight);
  ctx.fillRect(x + 40, gateY + beamHeight, pillarWidth, gateHeight - beamHeight);

  ctx.fillStyle = '#c62828';
  ctx.fillRect(x, gateY, 60, beamHeight);
  ctx.fillRect(x, gateY - 10, 60, 8);

  ctx.strokeStyle = '#8b0000';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, gateY, 60, beamHeight);
  ctx.strokeRect(x + 5, gateY + beamHeight, pillarWidth, gateHeight - beamHeight);
  ctx.strokeRect(x + 40, gateY + beamHeight, pillarWidth, gateHeight - beamHeight);
}

function drawParticles() {
  particles.forEach((p, index) => {
    p.life--;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;

    if (p.life <= 0) {
      particles.splice(index, 1);
      return;
    }

    ctx.fillStyle = `rgba(106, 168, 79, ${p.life / p.maxLife})`;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
}

function spawnScoreParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 2,
      size: Math.random() * 3 + 2,
      life: 30,
      maxLife: 30
    });
  }
}

function spawnCollisionParticles(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      size: Math.random() * 4 + 2,
      life: 40,
      maxLife: 40
    });
  }
}

function updatePlayer() {
  player.velocity += PHYSICS.gravity;
  player.velocity = Math.min(player.velocity, PHYSICS.maxFallSpeed);
  player.y += player.velocity;

  player.rotation = Math.max(-0.5, Math.min(0.8, player.velocity * PHYSICS.rotationSpeed));

  if (player.y + player.height > canvas.height - 60) {
    player.y = canvas.height - 60 - player.height;
    if (gameState === 'playing') {
      triggerGameOver();
    }
  }

  if (player.y < 0) {
    player.y = 0;
    player.velocity = 0;
  }
}

function updateObstacles() {
  if (frameCount % GAME_CONFIG.obstacleSpawnInterval === 0) {
    spawnObstacle();
  }

  obstacles.forEach((obstacle, index) => {
    obstacle.x -= GAME_CONFIG.obstacleSpeed;

    if (!obstacle.scored && obstacle.x + 60 < player.x) {
      score++;
      obstacle.scored = true;
      updateScoreDisplay();
      playSound('score');
      spawnScoreParticles(player.x, player.y);
    }

    if (obstacle.x + 60 < 0) {
      obstacles.splice(index, 1);
    }

    if (checkCollision(obstacle)) {
      if (gameState === 'playing') {
        triggerGameOver();
      }
    }
  });
}

function spawnObstacle() {
  const isTorii = Math.random() < 0.15;
  const minHeight = 100;
  const maxHeight = canvas.height - 60 - GAME_CONFIG.obstacleGap - 100;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

  obstacles.push({
    x: canvas.width,
    topHeight,
    bottomY: topHeight + GAME_CONFIG.obstacleGap,
    scored: false,
    type: isTorii ? 'torii' : 'bamboo'
  });
}

function checkCollision(obstacle) {
  const hitboxPadding = 4;
  const playerLeft = player.x + hitboxPadding;
  const playerRight = player.x + player.width - hitboxPadding;
  const playerTop = player.y + hitboxPadding;
  const playerBottom = player.y + player.height - hitboxPadding;

  const obstacleLeft = obstacle.x;
  const obstacleRight = obstacle.x + 60;

  if (playerRight > obstacleLeft && playerLeft < obstacleRight) {
    if (playerTop < obstacle.topHeight || playerBottom > obstacle.bottomY) {
      return true;
    }
  }

  return false;
}

function flap() {
  if (gameState === 'start') {
    startGame();
  } else if (gameState === 'playing') {
    player.velocity = PHYSICS.flapStrength;
    playSound('flap');
  } else if (gameState === 'gameOver' && !restartDebounce) {
    resetGame();
  }
}

function startGame() {
  gameState = 'playing';
  document.getElementById('start-screen').classList.add('hidden');
  player.velocity = PHYSICS.flapStrength;
  playSound('flap');
}

function triggerGameOver() {
  gameState = 'gameOver';
  deathAnimationTime = 0;
  playSound('hit');

  spawnCollisionParticles(player.x + player.width / 2, player.y + player.height / 2);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(STORAGE_KEY, highScore);
  }

  setTimeout(() => {
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-high-score').textContent = highScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
    playSound('gameOver');
    restartDebounce = true;
    setTimeout(() => {
      restartDebounce = false;
    }, 500);
  }, 800);
}

function resetGame() {
  gameState = 'start';
  score = 0;
  frameCount = 0;
  player.y = 320;
  player.velocity = 0;
  player.rotation = 0;
  obstacles.length = 0;
  particles.length = 0;
  GAME_CONFIG.obstacleSpeed = 3;
  GAME_CONFIG.obstacleGap = 200;
  updateScoreDisplay();
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

function updateScoreDisplay() {
  document.getElementById('score').textContent = score;
  document.getElementById('high-score').textContent = highScore;
}

function playSound(type) {
  if (!soundEnabled) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case 'flap':
      oscillator.frequency.value = 400;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'score':
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'hit':
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 150;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
    case 'gameOver':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
      break;
  }
}

function gameLoop() {
  frameCount++;

  drawBackground();
  drawObstacles();
  drawParticles();
  drawPlayer();

  if (gameState === 'playing') {
    updatePlayer();
    updateObstacles();

    if (frameCount % GAME_CONFIG.difficultyIncreaseInterval === 0) {
      GAME_CONFIG.obstacleSpeed = Math.min(GAME_CONFIG.obstacleSpeed + 0.2, 6);
      GAME_CONFIG.obstacleGap = Math.max(GAME_CONFIG.obstacleGap - 5, 140);
    }
  } else if (gameState === 'gameOver') {
    deathAnimationTime++;
    if (deathAnimationTime < 50) {
      player.velocity += PHYSICS.gravity;
      player.y += player.velocity;
      player.rotation += 0.15;
    }
  }

  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    flap();
  }
});

canvas.addEventListener('click', (e) => {
  e.preventDefault();
  flap();
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  flap();
});

const muteToggle = document.getElementById('mute-toggle');
muteToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  muteToggle.textContent = soundEnabled ? '🔊' : '🔇';
  muteToggle.classList.toggle('muted', !soundEnabled);
});

updateScoreDisplay();
gameLoop();
