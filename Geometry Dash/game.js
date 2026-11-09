
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = 960;
const H = 480;
const GROUND = 390;

const levels = [
  {
    name: "Stereo Madness",
    difficulty: "ŁATWY",
    speed: 5,
    length: 3500,
    color: "#00eaff",
    obstacles: [
      [500,"spike"],[850,"block"],
      [1250,"spike"],[1650,"spike"],
      [2050,"block"],[2450,"spike"],
      [2900,"block"],[3300,"spike"]
    ]
  },
  {
    name: "Back on Track",
    difficulty: "NORMALNY",
    speed: 5.5,
    length: 4000,
    color: "#ffb000",
    obstacles: [
      [450,"spike"],[850,"block"],
      [1300,"spike"],[1750,"block"],
      [2200,"spike"],[2650,"spike"],
      [3100,"block"],[3550,"spike"]
    ]
  },
  {
    name: "Polargeist",
    difficulty: "NORMALNY",
    speed: 6,
    length: 4400,
    color: "#bd55ff",
    obstacles: [
      [500,"block"],[1000,"spike"],
      [1500,"block"],[2000,"spike"],
      [2500,"block"],[3000,"spike"],
      [3500,"block"],[4050,"spike"]
    ]
  },
  {
    name: "Dry Out",
    difficulty: "TRUDNY",
    speed: 6.5,
    length: 4800,
    color: "#ff5555",
    obstacles: [
      [450,"spike"],[950,"block"],
      [1450,"spike"],[1950,"block"],
      [2500,"spike"],[3000,"block"],
      [3550,"spike"],[4150,"block"]
    ]
  },
  {
    name: "Base After Base",
    difficulty: "BARDZO TRUDNY",
    speed: 7,
    length: 5200,
    color: "#aaff00",
    obstacles: [
      [450,"block"],[1000,"spike"],
      [1550,"block"],[2100,"spike"],
      [2650,"block"],[3200,"spike"],
      [3750,"block"],[4400,"spike"],
      [4900,"block"]
    ]
  },
  {
    name: "Can't Let Go",
    difficulty: "EKSTREMALNY",
    speed: 7.5,
    length: 5600,
    color: "#ff55cc",
    obstacles: [
      [500,"spike"],[1050,"block"],
      [1600,"spike"],[2150,"block"],
      [2700,"spike"],[3250,"block"],
      [3800,"spike"],[4350,"block"],
      [4950,"spike"],[5350,"block"]
    ]
  }
];

const skins = [
  "#00ffff",
  "#ff315b",
  "#aaff00",
  "#ffcc00",
  "#bd55ff",
  "#ff7700",
  "#ffffff",
  "#ff55cc"
];

let selectedSkin = localStorage.getItem("gdSkin") || skins[0];

let currentLevel = 0;
let running = false;
let paused = false;
let animation = null;

let player;
let obstacles = [];
let particles = [];

let distance = 0;
let attempts = 0;
let best = Number(localStorage.getItem("gdBest") || 0);

let audioContext = null;
let musicEnabled = true;
let musicTimer = null;
let musicStep = 0;

let lastTime = 0;
let respawnTimer = null;
let runToken = 0;

// MENU

function showScreen(id) {
  clearTimeout(respawnTimer);
  runToken++;

  running = false;
  paused = false;

  cancelAnimationFrame(animation);
  stopMusic();

  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  if (id === "levels") renderLevels();
  if (id === "skins") renderSkins();

  updateStats();
}

function updateStats() {
  document.getElementById("bestMenu").textContent = best + "%";
  document.getElementById("attemptMenu").textContent = attempts;
}

function renderLevels() {
  const list = document.getElementById("levelList");
  list.innerHTML = "";

  levels.forEach((level, i) => {
    const card = document.createElement("div");
    card.className = "level-card";

    card.innerHTML = `
      <h3>${i + 1}. ${level.name}</h3>
      <p>Trudność: ${level.difficulty}</p>
      <p>Prędkość: ${level.speed}</p>
      <p style="color:${level.color}">◆◆◆◆</p>
      <button>GRAJ</button>
    `;

    card.querySelector("button").onclick = () => startLevel(i);

    list.appendChild(card);
  });
}

function renderSkins() {
  const list = document.getElementById("skinList");
  const preview = document.getElementById("skinPreview");

  preview.style.background = selectedSkin;
  preview.style.boxShadow = `0 0 30px ${selectedSkin}`;

  list.innerHTML = "";

  skins.forEach(color => {
    const button = document.createElement("button");

    button.className = "skin-choice";
    button.style.background = color;
    button.style.color = "#101020";

    if (color === selectedSkin) {
      button.classList.add("selected");
    }

    button.textContent = "KOSTKA";

    button.onclick = () => {
      selectedSkin = color;
      localStorage.setItem("gdSkin", color);
      renderSkins();
    };

    list.appendChild(button);
  });
}

// AUDIO

function initAudio() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function tone(freq, duration, type = "square", volume = 0.04) {
  if (!musicEnabled && type !== "sine") return;

  initAudio();

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, audioContext.currentTime);

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration
  );

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

function startMusic() {
  stopMusic();

  if (!musicEnabled) return;

  initAudio();

  const notes = [
    261.63,329.63,392,329.63,
    293.66,349.23,440,349.23
  ];

  musicStep = 0;

  musicTimer = setInterval(() => {
    if (!running || paused || !musicEnabled) return;

    tone(notes[musicStep % notes.length], 0.13, "triangle", 0.025);

    if (musicStep % 4 === 0) {
      tone(130, 0.1, "sine", 0.035);
    }

    musicStep++;
  }, 180);
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function toggleMusic() {
  musicEnabled = !musicEnabled;

  document.getElementById("musicLabel").textContent =
    musicEnabled ? "ON" : "OFF";

  if (musicEnabled && running && !paused) {
    startMusic();
  } else {
    stopMusic();
  }
}

// START POZIOMU

function startLevel(index) {
  clearTimeout(respawnTimer);
  runToken++;

  initAudio();

  currentLevel = index;
  attempts++;

  distance = 0;
  particles = [];

  const level = levels[index];

  player = {
    x: 150,
    y: GROUND - 42,
    size: 42,
    vy: 0,
    rotation: 0,
    grounded: true
  };

  obstacles = level.obstacles.map(([x, type]) => ({
    x,
    width: type === "block" ? 85 : 45,
    height: type === "block" ? 65 : 45,
    type
  }));

  document.getElementById("levelName").textContent = level.name;
  document.getElementById("attempts").textContent = attempts;

  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
  });

  document.getElementById("gameScreen").classList.add("active");

  document.getElementById("gameOverlay").classList.add("hidden");

  document.getElementById("progressBar").style.width = "0%";
  document.getElementById("progressText").textContent = "0%";

  running = true;
  paused = false;
  lastTime = performance.now();

  startMusic();
  updateStats();

  cancelAnimationFrame(animation);
  animation = requestAnimationFrame(loop);
}

// STEROWANIE

function jump() {
  if (!running || paused || !player.grounded) return;

  player.vy = -15;
  player.grounded = false;

  tone(520, 0.12, "square", 0.04);

  for (let i = 0; i < 8; i++) {
    particles.push({
      x: player.x + 20,
      y: player.y + 40,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 5,
      life: 25,
      color: selectedSkin
    });
  }
}

document.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();

    if (document.getElementById("gameScreen").classList.contains("active")) {
      if (paused) {
        resumeGame();
      } else {
        jump();
      }
    }
  }
});

canvas.addEventListener("pointerdown", jump);

// PAUZA

function pauseGame() {
  if (!running || paused) return;

  paused = true;
  stopMusic();

  document.getElementById("overlayTitle").textContent = "PAUZA";
  document.getElementById("overlayText").textContent = "Gra została zatrzymana";
  document.getElementById("resumeButton").style.display = "block";

  document.getElementById("gameOverlay").classList.remove("hidden");
}

function resumeGame() {
  if (!paused) return;

  paused = false;
  lastTime = performance.now();

  document.getElementById("gameOverlay").classList.add("hidden");

  startMusic();

  animation = requestAnimationFrame(loop);
}

// AUTOMATYCZNY RESPAWN

function gameOver() {
  if (!running) return;

  running = false;
  stopMusic();

  tone(120, 0.4, "sawtooth", 0.06);

  const progress = Math.floor(
    Math.min(100, distance / levels[currentLevel].length * 100)
  );

  if (progress > best) {
    best = progress;
    localStorage.setItem("gdBest", best);
  }

  document.getElementById("overlayTitle").textContent = "💀 ZGINĄŁEŚ!";
  document.getElementById("overlayText").textContent =
    `Postęp: ${progress}% | Odrodzenie za chwilę...`;

  document.getElementById("resumeButton").style.display = "none";

  document.getElementById("gameOverlay").classList.remove("hidden");

  updateStats();

  const token = runToken;

  clearTimeout(respawnTimer);

  respawnTimer = setTimeout(() => {
    if (
      token === runToken &&
      document.getElementById("gameScreen").classList.contains("active")
    ) {
      startLevel(currentLevel);
    }
  }, 1200);
}

// ZWYCIĘSTWO

function victory() {
  if (!running) return;

  running = false;
  stopMusic();

  tone(880, 0.3, "sine", 0.07);

  best = 100;
  localStorage.setItem("gdBest", best);

  document.getElementById("overlayTitle").textContent = "🏆 POZIOM UKOŃCZONY!";
  document.getElementById("overlayText").textContent = "GRATULACJE! 100%";

  document.getElementById("resumeButton").style.display = "none";

  document.getElementById("gameOverlay").classList.remove("hidden");

  updateStats();
}

// TŁO

function background() {
  const level = levels[currentLevel];

  ctx.fillStyle = "#101b48";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#ffffff12";
  ctx.lineWidth = 1;

  const offset = (distance * 0.4) % 60;

  for (let x = -offset; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND);
    ctx.stroke();
  }

  for (let y = 0; y < GROUND; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#182b65";

  for (let i = 0; i < 9; i++) {
    let x = i * 150 - (distance * 0.2) % 150;

    ctx.beginPath();
    ctx.moveTo(x, GROUND);
    ctx.lineTo(x + 75, 230 + (i % 3) * 35);
    ctx.lineTo(x + 150, GROUND);
    ctx.fill();
  }

  ctx.fillStyle = level.color;
  ctx.fillRect(0, GROUND, W, 5);

  ctx.fillStyle = "#142657";
  ctx.fillRect(0, GROUND + 5, W, H - GROUND);
}

// KOSTKA

function drawPlayer() {
  ctx.save();

  ctx.translate(
    player.x + player.size / 2,
    player.y + player.size / 2
  );

  ctx.rotate(player.rotation);

  ctx.shadowColor = selectedSkin;
  ctx.shadowBlur = 20;

  ctx.fillStyle = selectedSkin;
  ctx.fillRect(-21, -21, 42, 42);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(-21, -21, 42, 42);

  ctx.fillStyle = "#09112c";
  ctx.fillRect(-12, -8, 8, 9);
  ctx.fillRect(5, -8, 8, 9);
  ctx.fillRect(-9, 8, 19, 4);

  ctx.restore();
}

// PRZESZKODY

function drawObstacles() {
  obstacles.forEach(o => {
    const x = o.x - distance;

    if (x < -100 || x > W + 100) return;

    ctx.save();

    if (o.type === "spike") {
      ctx.shadowColor = "#ff315b";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ff315b";

      ctx.beginPath();
      ctx.moveTo(x, GROUND);
      ctx.lineTo(x + o.width / 2, GROUND - o.height);
      ctx.lineTo(x + o.width, GROUND);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#000000";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 12;

      ctx.fillRect(
        x,
        GROUND - o.height,
        o.width,
        o.height
      );

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;

      ctx.strokeRect(
        x,
        GROUND - o.height,
        o.width,
        o.height
      );
    }

    ctx.restore();
  });
}

// CZĄSTECZKI

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 25);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 6, 6);
  });

  ctx.globalAlpha = 1;
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
  });

  particles = particles.filter(p => p.life > 0);
}

// KOLIZJE

function checkSpikeCollision(o) {
  const x = o.x - distance;

  const center = player.x + player.size / 2;
  const spikeCenter = x + o.width / 2;

  if (center < x - 5 || center > x + o.width + 5) {
    return false;
  }

  const dx = Math.abs(center - spikeCenter);

  const height = o.height * (
    1 - dx / (o.width / 2)
  );

  return player.y + player.size - 5 > GROUND - height;
}

function checkBlockCollision(o, previousBottom) {
  const x = o.x - distance;
  const top = GROUND - o.height;

  const overlaps =
    player.x + player.size - 5 > x &&
    player.x + 5 < x + o.width;

  const bottom = player.y + player.size;

  if (
    overlaps &&
    player.vy >= 0 &&
    previousBottom <= top + 3 &&
    bottom >= top
  ) {
    player.y = top - player.size;
    player.vy = 0;
    player.grounded = true;
    return false;
  }

  const horizontal =
    player.x + player.size - 5 > x &&
    player.x + 5 < x + o.width;

  const vertical =
    player.y + player.size > top + 5 &&
    player.y < GROUND;

  if (horizontal && vertical) {
    const standing =
      Math.abs(player.y + player.size - top) < 2 &&
      player.vy === 0;

    return !standing;
  }

  return false;
}

// FIZYKA

function update(dt) {
  const level = levels[currentLevel];

  distance += level.speed * dt;

  const previousBottom = player.y + player.size;

  player.vy += 0.85 * dt;
  player.y += player.vy * dt;

  player.grounded = false;

  // Podłoga
  if (
    player.y + player.size >= GROUND &&
    player.vy >= 0
  ) {
    player.y = GROUND - player.size;
    player.vy = 0;
    player.grounded = true;
  }

  // Bloki
  for (const o of obstacles) {
    if (o.type !== "block") continue;

    const x = o.x - distance;
    const top = GROUND - o.height;

    const overlaps =
      player.x + player.size - 5 > x &&
      player.x + 5 < x + o.width;

    const bottom = player.y + player.size;

    if (
      overlaps &&
      player.vy >= 0 &&
      previousBottom <= top + 3 &&
      bottom >= top
    ) {
      player.y = top - player.size;
      player.vy = 0;
      player.grounded = true;
    }
  }

  if (player.grounded) {
    player.rotation =
      Math.round(player.rotation / (Math.PI / 2)) *
      (Math.PI / 2);
  } else {
    player.rotation += 0.08 * dt;
  }

  updateParticles();

  for (const o of obstacles) {
    if (o.type === "spike" && checkSpikeCollision(o)) {
      gameOver();
      return;
    }

    if (
      o.type === "block" &&
      checkBlockCollision(o, previousBottom)
    ) {
      gameOver();
      return;
    }
  }

  const progress = Math.min(
    100,
    Math.floor(distance / level.length * 100)
  );

  document.getElementById("progressBar").style.width =
    progress + "%";

  document.getElementById("progressText").textContent =
    progress + "%";

  if (distance >= level.length) {
    victory();
  }
}

// RYSOWANIE

function draw() {
  background();
  drawObstacles();
  drawParticles();
  drawPlayer();
}

// GŁÓWNA PĘTLA

function loop(timestamp) {
  if (!running || paused) return;

  const dt = Math.min(
    (timestamp - lastTime) / 16.67,
    2
  );

  lastTime = timestamp;

  update(dt);

  if (!running) return;

  draw();

  animation = requestAnimationFrame(loop);
}

// URUCHOMIENIE

renderLevels();
renderSkins();
updateStats();
drawEditor();

// Tworzenie gracza przed pierwszym rysowaniem
player = {
  x: 150,
  y: GROUND - 42,
  size: 42,
  vy: 0,
  rotation: 0,
  grounded: true,
  gravity: 1,
  cooldown: 0
};

draw();
