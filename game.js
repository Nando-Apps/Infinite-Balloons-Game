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
const localeButtons = document.querySelectorAll("[data-locale-option]");
const closeButton = document.querySelector(".close-button");

const STORAGE = {
  highScore: "balloonGame.highScore",
  history: "balloonGame.history",
  sound: "balloonGame.sound",
  difficulty: "balloonGame.difficulty",
  locale: "balloonGame.locale"
};

const I18N = {
  "pt-BR": {
    title: "Baloes Infinitos",
    score: "Pontos",
    highScore: "Recorde",
    sound: "Som",
    soundOn: "Som ligado",
    soundOff: "Som desligado",
    soundOnShort: "ON",
    soundOffShort: "OFF",
    difficulty: "Dificuldade",
    difficultyEasy: "Leve",
    difficultyNormal: "Normal",
    difficultyHard: "Insana",
    lastScores: "Ultimas 10",
    reset: "Reiniciar",
    legendBoom: "rajada",
    legendTrap: "falso",
    legendSpeed: "turbo",
    legendShell: "casco",
    legendGold: "bonus",
    scoreHistoryTitle: "Ultimas pontuacoes",
    emptyHistory: "Nenhuma pontuacao salva ainda.",
    points: "pontos",
    lightWind: "vento leve",
    hardShell: "cascas duras: 3 toques",
    turboBalloons: "turbo nos baloes",
    frozenWind: "vento congelado",
    hitsLeft: "{count} toque(s) para quebrar",
    trapReset: "balao falso: pontuacao zerada",
    turboOn: "turbo ativado",
    shellOn: "cascas duras por 11s",
    goldBonus: "+10 pontos",
    freezeOn: "vento lento por 6s",
    burst: "rajada: +{points}",
    newWind: "novo vento",
    difficultyStatus: "dificuldade: {difficulty}",
    close: "Fechar"
  },
  "en-US": {
    title: "Infinite Balloons",
    score: "Score",
    highScore: "High score",
    sound: "Sound",
    soundOn: "Sound on",
    soundOff: "Sound off",
    soundOnShort: "ON",
    soundOffShort: "OFF",
    difficulty: "Difficulty",
    difficultyEasy: "Easy",
    difficultyNormal: "Normal",
    difficultyHard: "Hard",
    lastScores: "Last 10",
    reset: "Reset",
    legendBoom: "burst",
    legendTrap: "trap",
    legendSpeed: "turbo",
    legendShell: "shell",
    legendGold: "bonus",
    scoreHistoryTitle: "Recent scores",
    emptyHistory: "No saved scores yet.",
    points: "points",
    lightWind: "light wind",
    hardShell: "hard shells: 3 taps",
    turboBalloons: "balloon turbo",
    frozenWind: "frozen wind",
    hitsLeft: "{count} tap(s) to break",
    trapReset: "trap balloon: score reset",
    turboOn: "turbo enabled",
    shellOn: "hard shells for 11s",
    goldBonus: "+10 points",
    freezeOn: "slow wind for 6s",
    burst: "burst: +{points}",
    newWind: "fresh wind",
    difficultyStatus: "difficulty: {difficulty}",
    close: "Close"
  }
};

const DIFFICULTY = {
  easy: { labelKey: "difficultyEasy", spawn: 940, speed: 0.82, max: 18 },
  normal: { labelKey: "difficultyNormal", spawn: 710, speed: 1, max: 25 },
  hard: { labelKey: "difficultyHard", spawn: 510, speed: 1.18, max: 34 }
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
let shockwaves = [];
let score = 0;
let highScore = Number(localStorage.getItem(STORAGE.highScore) || 0);
let soundEnabled = localStorage.getItem(STORAGE.sound) !== "false";
let difficulty = localStorage.getItem(STORAGE.difficulty) || "normal";
let locale = localStorage.getItem(STORAGE.locale) || "pt-BR";
let lastFrame = performance.now();
let spawnClock = 0;
let windTime = 0;
let speedBoostUntil = 0;
let shieldUntil = 0;
let freezeUntil = 0;
let audioContext = null;
let statusUntil = 0;

if (!DIFFICULTY[difficulty]) difficulty = "normal";
if (!I18N[locale]) locale = "pt-BR";

difficultySelect.value = difficulty;
highScoreEl.textContent = highScore;
applyLocale();
syncSoundButton();

function t(key, params = {}) {
  let text = I18N[locale][key] || I18N["en-US"][key] || key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replace(`{${name}}`, value);
  }
  return text;
}

function applyLocale() {
  document.documentElement.lang = locale;
  document.title = t("title");
  canvas.setAttribute("aria-label", t("title"));
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const option of difficultySelect.options) {
    option.textContent = t(option.dataset.i18n);
  }
  for (const button of localeButtons) {
    const isActive = button.dataset.localeOption === locale;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  closeButton.setAttribute("aria-label", t("close"));
  closeButton.title = t("close");
  syncSoundButton();
  if (performance.now() > statusUntil) {
    statusPill.textContent = t("lightWind");
  }
  if (scoresModal.open) renderHistory();
}

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
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
  const compact = width < 520;
  const radius = random(compact ? 22 : 25, compact ? 36 : 43);
  const isShielded = performance.now() < shieldUntil && type !== "trap";
  const speedBase = random(54, 132) * DIFFICULTY[difficulty].speed;
  const startX = random(radius + 10, Math.max(radius + 12, width - radius - 10));
  const balloon = {
    id: `${Date.now()}-${Math.random()}`,
    x: startX,
    y: height + radius + random(0, compact ? 70 : 100),
    radius,
    height: radius * random(1.18, 1.36),
    base,
    highlight,
    type,
    speed: type === "boom" ? speedBase * 2.45 : type === "trap" ? speedBase * random(0.72, 1.1) : speedBase,
    sway: random(compact ? 12 : 18, compact ? 38 : 58),
    swaySpeed: random(0.0018, 0.0044),
    phase: random(0, Math.PI * 2),
    spin: random(-0.2, 0.2),
    popped: false,
    hitsLeft: isShielded ? 3 : 1,
    bornAt: performance.now(),
    currentX: startX,
    trail: []
  };

  if (type === "gold") balloon.radius *= 0.86;
  if (type === "freeze") balloon.speed *= 0.78;
  return balloon;
}

function spawnBalloon(dt) {
  const config = DIFFICULTY[difficulty];
  const boosted = performance.now() < speedBoostUntil;
  const compact = width < 520;
  spawnClock += dt;
  const interval = config.spawn * (boosted ? 0.58 : 1) * (compact ? 1.12 : 1);
  const maxVisible = compact ? Math.max(10, Math.floor(config.max * 0.72)) : config.max;
  if (spawnClock > interval && balloons.length < maxVisible) {
    spawnClock = 0;
    balloons.push(createBalloon());
    if (!compact && Math.random() < 0.18 && balloons.length < maxVisible) {
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
    const microWind = Math.sin(now * 0.0018 + balloon.phase * 1.7) * 5;
    balloon.currentX = clamp(balloon.x + wind + microWind, balloon.radius * 0.7, width - balloon.radius * 0.7);
    balloon.rotation = Math.sin(now * 0.0015 + balloon.phase) * balloon.spin;
    balloon.breath = 1 + Math.sin(now * 0.004 + balloon.phase) * 0.018;

    if (!balloon.trail.length || distance(balloon.trail[balloon.trail.length - 1], balloon) > 18) {
      balloon.trail.push({ x: balloon.currentX, y: balloon.y + balloon.height * 0.8, life: 1 });
      if (balloon.trail.length > 7) balloon.trail.shift();
    }
    for (const point of balloon.trail) {
      point.life -= dt / 1900;
    }
    balloon.trail = balloon.trail.filter(point => point.life > 0);
  }

  balloons = balloons.filter(balloon => balloon.y + balloon.height > -80 && !balloon.popped);

  for (const particle of particles) {
    particle.life -= dt;
    particle.x += (particle.vx * dt) / 1000;
    particle.y += (particle.vy * dt) / 1000;
    particle.vy += (210 * dt) / 1000;
    particle.rotation += particle.spin * dt;
  }
  particles = particles.filter(particle => particle.life > 0);

  for (const wave of shockwaves) {
    wave.life -= dt;
    wave.radius += (wave.speed * dt) / 1000;
  }
  shockwaves = shockwaves.filter(wave => wave.life > 0);

  if (now > statusUntil) {
    if (now < shieldUntil) setStatus(t("hardShell"), 260);
    else if (boosted) setStatus(t("turboBalloons"), 260);
    else if (frozen) setStatus(t("frozenWind"), 260);
    else statusPill.textContent = t("lightWind");
  }
}

function distance(point, balloon) {
  return Math.hypot(point.x - balloon.currentX, point.y - balloon.y);
}

function drawBackground(now) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 137 + Math.sin(now * 0.00014 + i) * 26) % width;
    const y = (i * 89 + now * 0.012) % height;
    ctx.beginPath();
    ctx.arc(x, y, (i % 5) + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i += 1) {
    const y = ((i + 1) * height) / 7 + Math.sin(now * 0.0004 + i) * 18;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(width * 0.22, y - 24, width * 0.58, y + 24, width + 40, y - 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBalloonTrail(balloon) {
  if (balloon.type === "trap") return;
  ctx.save();
  for (const point of balloon.trail) {
    ctx.globalAlpha = point.life * 0.16;
    ctx.fillStyle = balloon.highlight;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, balloon.radius * 0.22, balloon.radius * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBalloon(balloon, now) {
  const x = balloon.currentX || balloon.x;
  const y = balloon.y;
  const r = balloon.radius;
  const h = balloon.height;
  const age = now - balloon.bornAt;
  const intro = clamp(age / 460, 0, 1);
  const scale = 0.3 + easeOutBack(intro) * 0.7;
  const squash = balloon.breath || 1;

  drawBalloonTrail(balloon);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(balloon.rotation || 0);
  ctx.scale(scale / squash, scale * squash);

  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 12;

  const gradient = ctx.createRadialGradient(-r * 0.38, -h * 0.36, r * 0.12, 0, 0, r * 1.2);
  gradient.addColorStop(0, balloon.highlight);
  gradient.addColorStop(0.42, balloon.base);
  gradient.addColorStop(1, shade(balloon.base, -30));

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
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -h * 0.36, r * 0.18, h * 0.3, -0.35, 0, Math.PI * 2);
  ctx.fill();

  drawSpecialMark(balloon, r, h);
  drawShield(balloon, r, h, now);
  drawKnotAndString(balloon, r, h, now);

  ctx.restore();
}

function drawShield(balloon, r, h, now) {
  if (balloon.hitsLeft <= 1) return;
  const pulse = 1 + Math.sin(now * 0.008) * 0.035;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.ellipse(0, 0, (r + 7) * pulse, (h + 7) * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 16px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(balloon.hitsLeft, 0, 0);
}

function drawKnotAndString(balloon, r, h, now) {
  ctx.fillStyle = shade(balloon.base, -38);
  ctx.beginPath();
  ctx.moveTo(-8, h * 0.9);
  ctx.lineTo(8, h * 0.9);
  ctx.lineTo(0, h * 1.12);
  ctx.closePath();
  ctx.fill();

  const wiggle = Math.sin(now * 0.006 + balloon.phase) * 8;
  ctx.strokeStyle = "rgba(255,255,255,0.46)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, h * 1.08);
  ctx.bezierCurveTo(-10 + wiggle, h * 1.42, 12 - wiggle, h * 1.64, 0, h * 2.02);
  ctx.stroke();
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
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.roundRect(-particle.size * 0.5, -particle.size * 0.35, particle.size, particle.size * 0.7, 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawShockwaves() {
  for (const wave of shockwaves) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, wave.life / wave.maxLife) * 0.55;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function render(now) {
  drawBackground(now);
  const ordered = [...balloons].sort((a, b) => a.radius - b.radius);
  ordered.forEach(balloon => drawBalloon(balloon, now));
  drawShockwaves();
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
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function hitTest(point) {
  for (let i = balloons.length - 1; i >= 0; i -= 1) {
    const balloon = balloons[i];
    const x = balloon.currentX || balloon.x;
    const dx = (point.x - x) / balloon.radius;
    const dy = (point.y - balloon.y) / balloon.height;
    if (dx * dx + dy * dy <= 1.18) return balloon;
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
    tapShield(balloon);
    playTone(160, 0.04, "square", 0.04);
    setStatus(t("hitsLeft", { count: balloon.hitsLeft }), 900);
    return;
  }

  popBalloon(balloon, true);
}

function tapShield(balloon) {
  const x = balloon.currentX || balloon.x;
  shockwaves.push({
    x,
    y: balloon.y,
    radius: balloon.radius,
    speed: 130,
    life: 260,
    maxLife: 260,
    color: "rgba(255,255,255,0.9)"
  });
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
      setStatus(t("trapReset"), 1800);
      break;
    case "speed":
      addScore(SPECIALS.speed.points);
      speedBoostUntil = performance.now() + 7800;
      setStatus(t("turboOn"), 1600);
      break;
    case "shell":
      addScore(SPECIALS.shell.points);
      shieldUntil = performance.now() + 11000;
      setStatus(t("shellOn"), 1800);
      break;
    case "gold":
      addScore(SPECIALS.gold.points);
      setStatus(t("goldBonus"), 1200);
      break;
    case "freeze":
      addScore(SPECIALS.freeze.points);
      freezeUntil = performance.now() + 6200;
      setStatus(t("freezeOn"), 1500);
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
  setStatus(t("burst", { points }), 1600);
}

function burst(balloon) {
  const x = balloon.currentX || balloon.x;
  const y = balloon.y;
  shockwaves.push({
    x,
    y,
    radius: balloon.radius * 0.7,
    speed: 260,
    life: 420,
    maxLife: 420,
    color: balloon.highlight
  });

  for (let i = 0; i < 22; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(80, 310);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(380, 760),
      maxLife: 760,
      size: random(4, 9),
      color: i % 3 ? balloon.base : balloon.highlight,
      rotation: random(0, Math.PI),
      spin: random(-0.014, 0.014)
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
    const label = t(DIFFICULTY[item.difficulty]?.labelKey || "difficultyNormal");
    li.innerHTML = `<strong>${item.score}</strong> ${t("points")} · ${label} · ${date.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}`;
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
  shockwaves = [];
  speedBoostUntil = 0;
  shieldUntil = 0;
  freezeUntil = 0;
  spawnClock = 0;
  updateScore();
  setStatus(t("newWind"), 1200);
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
  soundIcon.textContent = soundEnabled ? t("soundOnShort") : t("soundOffShort");
  soundToggle.title = soundEnabled ? t("soundOn") : t("soundOff");
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
  setStatus(t("difficultyStatus", { difficulty: t(DIFFICULTY[difficulty].labelKey) }), 1200);
});

for (const button of localeButtons) {
  button.addEventListener("click", () => {
    locale = button.dataset.localeOption;
    localStorage.setItem(STORAGE.locale, locale);
    applyLocale();
  });
}

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
