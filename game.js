const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const statusPill = document.getElementById("statusPill");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");
const difficultySelect = document.getElementById("difficulty");
const scoresButton = document.getElementById("scoresButton");
const resetButton = document.getElementById("resetButton");
const scoresModal = document.getElementById("scoresModal");
const scoreHistory = document.getElementById("scoreHistory");
const emptyHistory = document.getElementById("emptyHistory");

const STORAGE = {
  highScore: "balloonGame.highScore",
  history: "balloonGame.history",
  sound: "balloonGame.sound",
  difficulty: "balloonGame.difficulty"
};

const DIFFICULTY = {
  easy: { label: "Leve", spawn: 940, speed: 0.82, max: 18 },
  normal: { label: "Normal", spawn: 710, speed: 1, max: 25 },
  hard: { label: "Insana", spawn: 510, speed: 1.18, max: 34 }
};

const SPECIALS = {
  boom: { chance: 0.055, points: 3 },
  trap: { chance: 0.05, points: 0 },
  speed: { chance: 0.06, points: 2 },
  shell: { chance: 0.045, points: 1 },
  gold: { chance: 0.055, points: 10 },
  freeze: { chance: 0.04, points: 4 }
};

const colors = [
  ["#ff5a78", "#ffc2ce"],
  ["#25d0a7", "#b8fff0"],
  ["#4aa8ff", "#c2e3ff"],
  ["#ffbf42", "#ffe4a1"],
  ["#8d6bff", "#d9ceff"],
  ["#ff7ad9", "#ffd0f2"],
  ["#75e35f", "#d6ffc9"]
];

let width = 0;
let height = 0;
let dpr = 1;
let balloons = [];
let particles = [];
let score = 0;
let highScore = Number(localStorage.getItem(STORAGE.highScore) || 0);
let soundEnabled = localStorage.getItem(STORAGE.sound) !== "false";
let difficulty = localStorage.getItem(STORAGE.difficulty) || "normal";
let lastFrame = performance.now();
let spawnClock = 0;
let windTime = 0;
let speedBoostUntil = 0;
let shieldUntil = 0;
let freezeUntil = 0;
let audioContext = null;
let statusUntil = 0;

if (!DIFFICULTY[difficulty]) difficulty = "normal";
difficultySelect.value = difficulty;
highScoreEl.textContent = highScore;
syncSoundButton();

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getSpecialType() {
  const roll = Math.random();
  let cursor = 0;
  for (const [type, config] of Object.entries(SPECIALS)) {
    cursor += config.chance;
    if (roll < cursor) return type;
  }
  return "normal";
}

function createBalloon(forcedType) {
  const type = forcedType || getSpecialType();
  const [base, highlight] = pick(colors);
  const radius = random(25, 42);
  const isShielded = performance.now() < shieldUntil && type !== "trap";
  const speedBase = random(54, 132) * DIFFICULTY[difficulty].speed;
  const balloon = {
    id: `${Date.now()}-${Math.random()}`,
    x: random(radius, width - radius),
    y: height + radius + random(0, 90),
    radius,
    height: radius * random(1.18, 1.35),
    base,
    highlight,
    type,
    speed: type === "boom" ? speedBase * 2.45 : type === "trap" ? speedBase * random(0.72, 1.1) : speedBase,
    sway: random(18, 58),
    swaySpeed: random(0.0018, 0.004),
    phase: random(0, Math.PI * 2),
    spin: random(-0.18, 0.18),
    popped: false,
    hitsLeft: isShielded ? 3 : 1,
    bornAt: performance.now()
  };

  if (type === "gold") balloon.radius *= 0.86;
  if (type === "freeze") balloon.speed *= 0.78;
  return balloon;
}

function spawnBalloon(dt) {
  const config = DIFFICULTY[difficulty];
  const boosted = performance.now() < speedBoostUntil;
  spawnClock += dt;
  const interval = config.spawn * (boosted ? 0.58 : 1);
  if (spawnClock > interval && balloons.length < config.max) {
    spawnClock = 0;
    balloons.push(createBalloon());
    if (Math.random() < 0.18 && balloons.length < config.max) {
      balloons.push(createBalloon("normal"));
    }
  }
}

function update(dt, now) {
  windTime += dt;
  spawnBalloon(dt);
  const boosted = now < speedBoostUntil;
  const frozen = now < freezeUntil;
  const speedMultiplier = (boosted ? 1.75 : 1) * (frozen ? 0.42 : 1);

  for (const balloon of balloons) {
    balloon.y -= (balloon.speed * speedMultiplier * dt) / 1000;
    const wind = Math.sin(windTime * balloon.swaySpeed + balloon.phase) * balloon.sway;
    balloon.currentX = balloon.x + wind + Math.sin(now * 0.0012 + balloon.phase) * 8;
    balloon.rotation = Math.sin(now * 0.0015 + balloon.phase) * balloon.spin;
  }

  balloons = balloons.filter(balloon => balloon.y + balloon.height > -80 && !balloon.popped);

  for (const particle of particles) {
    particle.life -= dt;
    particle.x += (particle.vx * dt) / 1000;
    particle.y += (particle.vy * dt) / 1000;
    particle.vy += (210 * dt) / 1000;
  }
  particles = particles.filter(particle => particle.life > 0);

  if (now > statusUntil) {
    if (now < shieldUntil) setStatus("cascas duras: 3 toques", 260);
    else if (boosted) setStatus("turbo nos balões", 260);
    else if (frozen) setStatus("vento congelado", 260);
    else statusPill.textContent = "vento leve";
  }
}

function drawBackground(now) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 137 + Math.sin(now * 0.00014 + i) * 26) % width;
    const y = (i * 89 + now * 0.012) % height;
    ctx.beginPath();
    ctx.arc(x, y, (i % 5) + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBalloon(balloon) {
  const x = balloon.currentX || balloon.x;
  const y = balloon.y;
  const r = balloon.radius;
  const h = balloon.height;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(balloon.rotation || 0);

  const gradient = ctx.createRadialGradient(-r * 0.38, -h * 0.36, r * 0.12, 0, 0, r * 1.2);
  gradient.addColorStop(0, balloon.highlight);
  gradient.addColorStop(0.42, balloon.base);
  gradient.addColorStop(1, shade(balloon.base, -28));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  if (balloon.type === "trap") {
    ctx.ellipse(0, 0, r * 0.92, h * 0.95, 0, 0, Math.PI * 2);
  } else if (balloon.type === "boom") {
    ctx.ellipse(0, 0, r * 0.78, h * 1.05, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, 0, r, h, 0, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -h * 0.36, r * 0.18, h * 0.3, -0.35, 0, Math.PI * 2);
  ctx.fill();

  drawSpecialMark(balloon, r, h);

  if (balloon.hitsLeft > 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 7, h + 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(balloon.hitsLeft, 0, 0);
  }

  ctx.fillStyle = shade(balloon.base, -38);
  ctx.beginPath();
  ctx.moveTo(-8, h * 0.9);
  ctx.lineTo(8, h * 0.9);
  ctx.lineTo(0, h * 1.12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, h * 1.08);
  ctx.bezierCurveTo(-10, h * 1.45, 12, h * 1.62, 0, h * 2.02);
  ctx.stroke();

  ctx.restore();
}

function drawSpecialMark(balloon, r, h) {
  if (balloon.type === "normal") return;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (balloon.type === "boom") {
    ctx.strokeStyle = "#281900";
    ctx.fillStyle = "#fff36f";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const size = i % 2 ? r * 0.18 : r * 0.36;
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (balloon.type === "trap") {
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -h * 0.1);
    ctx.lineTo(-r * 0.08, h * 0.16);
    ctx.lineTo(r * 0.38, -h * 0.22);
    ctx.stroke();
    ctx.fillStyle = "#ffecf1";
    ctx.beginPath();
    ctx.arc(r * 0.44, h * 0.34, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (balloon.type === "speed") {
    ctx.strokeStyle = "#001c2a";
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -h * 0.44);
    ctx.lineTo(r * 0.08, -h * 0.04);
    ctx.lineTo(-r * 0.02, -h * 0.02);
    ctx.lineTo(r * 0.18, h * 0.42);
    ctx.stroke();
  }

  if (balloon.type === "shell") {
    ctx.strokeStyle = "#ffffff";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.arc(i * r * 0.24, 0, r * 0.3, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
    }
  }

  if (balloon.type === "gold") {
    ctx.fillStyle = "#fff4b0";
    ctx.font = `900 ${Math.floor(r * 0.7)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", 0, 0);
  }

  if (balloon.type === "freeze") {
    ctx.strokeStyle = "#ecfbff";
    for (let i = 0; i < 3; i += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-r * 0.38, 0);
      ctx.lineTo(r * 0.38, 0);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function render(now) {
  drawBackground(now);
  const ordered = [...balloons].sort((a, b) => a.radius - b.radius);
  ordered.forEach(drawBalloon);
  drawParticles();
}

function tick(now) {
  const dt = Math.min(48, now - lastFrame);
  lastFrame = now;
  update(dt, now);
  render(now);
  requestAnimationFrame(tick);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: source.clientX - rect.left,
    y: source.clientY - rect.top
  };
}

function hitTest(point) {
  for (let i = balloons.length - 1; i >= 0; i -= 1) {
    const balloon = balloons[i];
    const x = balloon.currentX || balloon.x;
    const dx = (point.x - x) / balloon.radius;
    const dy = (point.y - balloon.y) / balloon.height;
    if (dx * dx + dy * dy <= 1.05) return balloon;
  }
  return null;
}

function handlePop(event) {
  event.preventDefault();
  const point = pointerPosition(event);
  const balloon = hitTest(point);
  if (!balloon) return;

  balloon.hitsLeft -= 1;
  if (balloon.hitsLeft > 0) {
    playTone(160, 0.04, "square", 0.04);
    setStatus(`${balloon.hitsLeft} toque(s) para quebrar`, 900);
    return;
  }

  popBalloon(balloon, true);
}

function popBalloon(balloon, manual) {
  balloon.popped = true;
  burst(balloon);
  playTone(balloon.type === "trap" ? 96 : 420 + Math.random() * 360, 0.08, "sine", 0.07);

  if (!manual) {
    addScore(balloon.type === "gold" ? SPECIALS.gold.points : 1);
    return;
  }

  switch (balloon.type) {
    case "boom":
      popAllVisible();
      break;
    case "trap":
      archiveScore();
      score = 0;
      updateScore();
      setStatus("balão falso: pontuação zerada", 1800);
      break;
    case "speed":
      addScore(SPECIALS.speed.points);
      speedBoostUntil = performance.now() + 7800;
      setStatus("turbo ativado", 1600);
      break;
    case "shell":
      addScore(SPECIALS.shell.points);
      shieldUntil = performance.now() + 11000;
      setStatus("cascas duras por 11s", 1800);
      break;
    case "gold":
      addScore(SPECIALS.gold.points);
      setStatus("+10 pontos", 1200);
      break;
    case "freeze":
      addScore(SPECIALS.freeze.points);
      freezeUntil = performance.now() + 6200;
      setStatus("vento lento por 6s", 1500);
      break;
    default:
      addScore(1);
  }
}

function popAllVisible() {
  const visible = balloons.filter(balloon => !balloon.popped && balloon.y > -80 && balloon.y < height + 90);
  let points = SPECIALS.boom.points;
  for (const balloon of visible) {
    balloon.popped = true;
    burst(balloon);
    points += balloon.type === "gold" ? SPECIALS.gold.points : balloon.type === "trap" ? 0 : 1;
  }
  addScore(points);
  setStatus(`rajada: +${points}`, 1600);
}

function burst(balloon) {
  const x = balloon.currentX || balloon.x;
  const y = balloon.y;
  for (let i = 0; i < 18; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(70, 270);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(360, 720),
      maxLife: 720,
      size: random(2.4, 6.2),
      color: i % 3 ? balloon.base : balloon.highlight
    });
  }
}

function addScore(points) {
  score += points;
  updateScore();
}

function updateScore() {
  scoreEl.textContent = score;
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    localStorage.setItem(STORAGE.highScore, String(highScore));
  }
}

function archiveScore() {
  if (score <= 0) return;
  const history = readHistory();
  history.unshift({
    score,
    difficulty,
    date: new Date().toISOString()
  });
  localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 10)));
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = readHistory();
  scoreHistory.innerHTML = "";
  emptyHistory.hidden = history.length > 0;
  for (const item of history) {
    const li = document.createElement("li");
    const date = new Date(item.date);
    li.innerHTML = `<strong>${item.score}</strong> pontos · ${DIFFICULTY[item.difficulty]?.label || "Normal"} · ${date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
    scoreHistory.appendChild(li);
  }
}

function setStatus(text, duration) {
  statusPill.textContent = text;
  statusUntil = performance.now() + duration;
}

function resetGame() {
  archiveScore();
  score = 0;
  balloons = [];
  particles = [];
  speedBoostUntil = 0;
  shieldUntil = 0;
  freezeUntil = 0;
  spawnClock = 0;
  updateScore();
  setStatus("novo vento", 1200);
}

function shade(hex, amount) {
  const value = hex.replace("#", "");
  const num = Number.parseInt(value, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function playTone(frequency, duration, type, volume) {
  if (!soundEnabled) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function syncSoundButton() {
  soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
  soundToggle.title = soundEnabled ? "Som ligado" : "Som desligado";
  soundToggle.setAttribute("aria-label", soundToggle.title);
}

canvas.addEventListener("pointerdown", handlePop);
window.addEventListener("resize", resize);
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem(STORAGE.sound, String(soundEnabled));
  syncSoundButton();
});

difficultySelect.addEventListener("change", () => {
  difficulty = difficultySelect.value;
  localStorage.setItem(STORAGE.difficulty, difficulty);
  setStatus(`dificuldade: ${DIFFICULTY[difficulty].label}`, 1200);
});

scoresButton.addEventListener("click", () => {
  renderHistory();
  scoresModal.showModal();
});

resetButton.addEventListener("click", resetGame);
window.addEventListener("beforeunload", archiveScore);

resize();
for (let i = 0; i < 8; i += 1) {
  const balloon = createBalloon("normal");
  balloon.y = random(height * 0.18, height * 0.95);
  balloons.push(balloon);
}
requestAnimationFrame(tick);
