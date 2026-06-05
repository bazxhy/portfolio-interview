// ============================================================
// Seasonal Animation Engine — v2
// Ground-level ecosystems for all 4 seasons
// Spring: grass, flowers, butterflies, bees at bottom
// Summer: lush grass, fireflies, summer blooms
// Autumn: dry grass, fallen leaves, mushrooms
// Winter: snow layer, bare branches, frost sparkles
// ============================================================
(function () {
  'use strict';

  const canvas = document.getElementById('fluidBg');
  const ctx = canvas.getContext('2d');

  let W, H, dpr;
  let currentSeason = 'spring';
  let targetSeason = 'spring';
  let seasonBlend = 0;
  let transitioning = false;
  let animFrame;
  let mouseX = -100, mouseY = -100;
  let groundY; // bottom y-coordinate for ground features

  // ============================================================
  // RESIZE
  // ============================================================
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H;
    regrowGrass();
  }

  // ============================================================
  // UTILS
  // ============================================================
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Global wind
  let windTime = 0, windStrength = 0, windTarget = 0;

  // ============================================================
  // GRASS BLADE — natural realism
  // ============================================================
  class GrassBlade {
    constructor(x, season) {
      this.x = x;
      this.season = season;
      this.lean = rand(-0.15, 0.15);
      this.curve = rand(0.2, 0.7) * (Math.random() > 0.5 ? 1 : -1);
      this.phase = rand(0, Math.PI * 2);
      this.speed = rand(0.005, 0.018);
      this._init();
    }
    _init() {
      // Regenerate season-specific traits (height, width, colors)
      const s = this.season;
      this.h = s === 'summer' ? rand(50, 150) : s === 'spring' ? rand(30, 100) : s === 'autumn' ? rand(18, 65) : rand(4, 18);
      this.w = rand(0.8, 2.2);
      this.tipR = s === 'spring' ? randInt(120, 190) : s === 'summer' ? randInt(60, 140) : s === 'autumn' ? randInt(140, 200) : randInt(100, 150);
      this.tipG = s === 'spring' ? randInt(180, 230) : s === 'summer' ? randInt(160, 210) : s === 'autumn' ? randInt(80, 140) : randInt(120, 160);
      this.tipB = s === 'spring' ? randInt(40, 100) : s === 'summer' ? randInt(30, 80) : s === 'autumn' ? randInt(20, 60) : randInt(100, 140);
      this.baseR = s === 'autumn' ? randInt(120, 170) : randInt(30, 80);
      this.baseG = s === 'autumn' ? randInt(50, 100) : randInt(100, 160);
      this.baseB = s === 'autumn' ? randInt(15, 40) : randInt(15, 50);
    }
    update() {
      windTime += 0.003;
      windStrength = lerp(windStrength, windTarget, 0.005);
      windTarget += rand(-0.003, 0.003);
      windTarget = clamp(windTarget, -0.5, 0.5);
      this.phase += this.speed;
    }
    draw(ctx, alpha, gp) {
      const h = this.h * gp;
      if (h < 1) return;
      const wind = windStrength * h * 0.03;
      const swayBase = Math.sin(this.phase) * h * 0.08 * this.curve;
      const sway = swayBase + wind + this.lean * h * 0.5;
      const tipX = this.x + sway;
      const tipY = groundY - h;
      const midX = this.x + sway * 0.4;
      const midY = groundY - h * 0.55;

      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      // Gradient from base to tip
      const grd = ctx.createLinearGradient(this.x, groundY, tipX, tipY);
      grd.addColorStop(0, `rgba(${this.baseR},${this.baseG},${this.baseB},0.9)`);
      grd.addColorStop(0.6, `rgba(${Math.floor((this.baseR+this.tipR)/2)},${Math.floor((this.baseG+this.tipG)/2)},${Math.floor((this.baseB+this.tipB)/2)},0.8)`);
      grd.addColorStop(1, `rgba(${this.tipR},${this.tipG},${this.tipB},0.7)`);
      ctx.strokeStyle = grd;
      ctx.lineWidth = this.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, groundY);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();

      // Slight highlight on one side
      if (h > 20) {
        ctx.strokeStyle = `rgba(255,255,255,0.06)`;
        ctx.lineWidth = this.w * 0.4;
        ctx.beginPath();
        ctx.moveTo(this.x + 0.5, groundY);
        ctx.quadraticCurveTo(midX + 0.5, midY, tipX + 0.3, tipY);
        ctx.stroke();
      }

      // Seed tip
      if (h > 10 && (this.season === 'spring' || this.season === 'summer')) {
        const tipColor = this.season === 'spring'
          ? `rgba(${Math.min(this.tipR+40,255)},${Math.min(this.tipG+20,255)},${Math.min(this.tipB+30,255)},0.6)`
          : `rgba(${Math.min(this.tipR+30,255)},${Math.min(this.tipG+30,255)},${Math.min(this.tipB+20,255)},0.5)`;
        ctx.fillStyle = tipColor;
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, this.w * 1.2, this.w * 1.8, Math.atan2(tipY - groundY, sway) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  let grassBlades = [];
  function regrowGrass() {
    grassBlades = [];
    const count = Math.floor(W / 4); // denser grass
    for (let i = 0; i < count; i++) {
      grassBlades.push(new GrassBlade(rand(0, W), 'spring'));
    }
  }

  // ============================================================
  // GROUND FLOWER (Spring — grows from bottom)
  // ============================================================
  class GroundFlower {
    constructor() {
      this.x = rand(10, W - 10);
      this.stemH = rand(40, 140);
      this.bloom = 0;
      this.bloomSpeed = rand(0.004, 0.01);
      this.petalCount = randInt(5, 9);
      this.color = [
        [255, 105, 180], [255, 20, 147], [255, 127, 80],
        [255, 160, 122], [255, 99, 71], [255, 182, 193],
        [218, 112, 214], [255, 140, 0], [255, 215, 0],
      ][randInt(0, 8)];
      this.petalR = rand(10, 20);
      this.swayPhase = rand(0, Math.PI * 2);
      this.swaySpeed = rand(0.005, 0.015);
    }
    update(active) {
      if (active) this.bloom = Math.min(1, this.bloom + this.bloomSpeed);
      else this.bloom = Math.max(0, this.bloom - this.bloomSpeed * 2);
      this.swayPhase += this.swaySpeed;
    }
    draw(ctx, alpha) {
      if (this.bloom < 0.02) return;
      const bp = this.bloom;
      const sway = Math.sin(this.swayPhase) * 6 * bp;
      const stemBot = groundY;
      const stemTop = groundY - this.stemH * bp;
      const [r, g, b] = this.color;
      ctx.save();
      ctx.globalAlpha = bp * alpha * 0.85;

      // Stem
      ctx.strokeStyle = 'rgba(60,160,80,0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.x, stemBot);
      ctx.quadraticCurveTo(this.x + sway * 0.5, (stemBot + stemTop) / 2, this.x + sway, stemTop);
      ctx.stroke();

      // Leaves on stem
      if (bp > 0.4) {
        ctx.fillStyle = 'rgba(40,150,70,0.6)';
        const lx = this.x + sway * 0.3;
        const ly = stemBot - this.stemH * bp * 0.4;
        ctx.beginPath();
        ctx.ellipse(lx + 10, ly, 8, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(lx - 10, ly + 3, 8, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Petals
      const cx = this.x + sway;
      const cy = stemTop;
      const r2 = this.petalR * bp;
      for (let i = 0; i < this.petalCount; i++) {
        const angle = (i / this.petalCount) * Math.PI * 2;
        const px = cx + Math.cos(angle) * r2 * 0.55;
        const py = cy + Math.sin(angle) * r2 * 0.55;
        ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
        ctx.beginPath();
        ctx.arc(px, py, r2 * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2 * 0.3);
      grd.addColorStop(0, 'rgba(255,230,100,1)');
      grd.addColorStop(1, 'rgba(255,180,40,0.6)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, r2 * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ============================================================
  // GROUND BUTTERFLY — detailed wings, natural flight
  // ============================================================
  class GroundButterfly {
    constructor() {
      this.x = rand(40, W - 40);
      this.y = rand(groundY - 200, groundY - 30);
      this.size = rand(12, 22);
      this.wingColor = [
        [255, 80, 60], [255, 150, 30], [255, 220, 30],
        [255, 100, 160], [130, 100, 220], [50, 200, 200],
        [240, 140, 60], [180, 80, 200],
      ][randInt(0, 7)];
      this.wingPhase = rand(0, Math.PI * 2);
      this.wingSpeed = rand(0.05, 0.12);
      this.vx = rand(-0.25, 0.25);
      this.vy = rand(-0.2, 0.2);
      this.targetX = this.x; this.targetY = this.y;
      this.changeTimer = rand(0, 120);
    }
    update(active) {
      this.wingPhase += this.wingSpeed;
      if (!active) { this.vx *= 0.96; this.vy *= 0.96; }
      else {
        this.changeTimer++;
        if (this.changeTimer > rand(70, 200)) {
          this.changeTimer = 0;
          // Sometimes target the name
          if (nameTargets.length > 0 && Math.random() < 0.35) {
            const t = nameTargets[randInt(0, nameTargets.length - 1)];
            this.targetX = t.x + rand(-t.w * 0.8, t.w * 0.8);
            this.targetY = t.y + rand(-t.h * 0.6, t.h * 0.6);
          } else {
            this.targetX = rand(30, W - 30);
            this.targetY = rand(groundY - 220, groundY - 15);
          }
        }
        this.vx = lerp(this.vx, (this.targetX - this.x) * 0.025, 0.03);
        this.vy = lerp(this.vy, (this.targetY - this.y) * 0.025, 0.03);
        this.vx = clamp(this.vx, -0.6, 0.6);
        this.vy = clamp(this.vy, -0.5, 0.5);
        // Bounce off ground
        if (this.y > groundY - 8) { this.vy = -rand(0.3, 0.6); }
        if (this.y < groundY - 250) this.vy += 0.03;
        if (this.x < 5) this.vx += 0.05;
        if (this.x > W - 5) this.vx -= 0.05;
      }
      this.x += this.vx;
      this.y += this.vy;
    }
    draw(ctx, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      const s = this.size;
      const wf = Math.abs(Math.sin(this.wingPhase));
      const [r, g, b] = this.wingColor;
      const dir = this.vx !== 0 ? (this.vx > 0 ? 1 : -1) : 1;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.35 * wf, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = '#3a2815';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.09, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper wings with gradient
      for (let side = -1; side <= 1; side += 2) {
        const sx = side * dir;
        const upGrd = ctx.createRadialGradient(sx * s * 0.25, -s * 0.15, s * 0.05, sx * s * 0.35, -s * 0.12, s * 0.45);
        upGrd.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
        upGrd.addColorStop(0.6, `rgba(${Math.floor(r*0.7)},${Math.floor(g*0.7)},${Math.floor(b*0.7)},0.8)`);
        upGrd.addColorStop(1, `rgba(${Math.floor(r*0.4)},${Math.floor(g*0.4)},${Math.floor(b*0.4)},0.5)`);
        ctx.fillStyle = upGrd;
        ctx.beginPath();
        ctx.ellipse(sx * s * 0.32, -s * 0.12, s * 0.42 * wf, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing veins
        ctx.strokeStyle = `rgba(0,0,0,0.12)`;
        ctx.lineWidth = 0.5;
        for (let v = 0; v < 4; v++) {
          const va = -0.4 + v * 0.25;
          ctx.beginPath();
          ctx.moveTo(sx * s * 0.05, -s * 0.02);
          ctx.lineTo(sx * s * 0.32 + Math.cos(va) * s * 0.3 * wf, -s * 0.12 + Math.sin(va) * s * 0.22);
          ctx.stroke();
        }

        // Lower wings
        ctx.fillStyle = `rgba(${Math.floor(r*0.8)},${Math.floor(g*0.8)},${Math.floor(b*0.8)},0.7)`;
        ctx.beginPath();
        ctx.ellipse(sx * s * 0.22, s * 0.15, s * 0.3 * wf, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing spots
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(sx * s * 0.35, -s * 0.18, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(sx * s * 0.25, -s * 0.06, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      // Antennae
      ctx.strokeStyle = '#3a2815'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.quadraticCurveTo(dir * s * 0.25, -s * 0.6, dir * s * 0.35, -s * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.quadraticCurveTo(-dir * s * 0.25, -s * 0.6, -dir * s * 0.35, -s * 0.55);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ============================================================
  // GROUND BEE (near flowers)
  // ============================================================
  class GroundBee {
    constructor() {
      this.x = rand(40, W - 40);
      this.y = rand(groundY - 160, groundY - 30);
      this.size = rand(5, 9);
      this.vx = rand(-0.4, 0.4);
      this.vy = rand(-0.3, 0.3);
      this.buzzPhase = rand(0, Math.PI * 2);
      this.targetX = this.x;
      this.targetY = this.y;
      this.changeTimer = 0;
    }
    update(active) {
      if (!active) { this.vx *= 0.95; this.vy *= 0.95; }
      else {
        this.buzzPhase += 0.3;
        this.changeTimer++;
        if (this.changeTimer > rand(60, 160)) {
          this.changeTimer = 0;
          // Prefer name targets ~40% of the time in spring
          if (nameTargets.length > 0 && Math.random() < 0.4) {
            const t = nameTargets[randInt(0, nameTargets.length - 1)];
            this.targetX = t.x + rand(-t.w * 0.6, t.w * 0.6);
            this.targetY = t.y + rand(-t.h * 0.5, t.h * 0.5);
          } else {
            this.targetX = rand(30, W - 30);
            this.targetY = rand(groundY - 180, groundY - 20);
          }
        }
        this.vx = lerp(this.vx, (this.targetX - this.x) * 0.03, 0.04);
        this.vy = lerp(this.vy, (this.targetY - this.y) * 0.03, 0.04);
        this.vx = clamp(this.vx, -0.8, 0.8);
        this.vy = clamp(this.vy, -0.6, 0.6);
        if (this.y > groundY - 5) { this.vy = -0.4; this.y = groundY - 10; }
        if (this.y < groundY - 200) this.vy += 0.03;
      }
      this.x += this.vx;
      this.y += this.vy;
    }
    draw(ctx, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      const s = this.size;
      ctx.fillStyle = '#f5c842';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.3, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(-s * 0.12, -s * 0.2, s * 0.07, s * 0.4);
      ctx.fillRect(s * 0.08, -s * 0.2, s * 0.07, s * 0.4);
      // Wings
      const wf = Math.abs(Math.sin(this.buzzPhase));
      ctx.fillStyle = 'rgba(200,220,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.05, -s * 0.3, s * 0.3 * wf, s * 0.15, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.05, -s * 0.3, s * 0.3 * wf, s * 0.15, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a0a';
      ctx.beginPath();
      ctx.arc(s * 0.3, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ============================================================
  // SUMMER — DRAGONFLY
  // ============================================================
  class Dragonfly {
    constructor() {
      this.x = rand(30, W - 30);
      this.y = rand(groundY - 200, groundY - 30);
      this.size = rand(14, 22);
      this.vx = rand(-0.3, 0.3); this.vy = rand(-0.2, 0.2);
      this.targetX = this.x; this.targetY = this.y;
      this.changeTimer = rand(0, 60);
      this.wingPhase = rand(0, Math.PI * 2);
      this.bodyColor = [[50,180,220],[30,160,200],[80,200,140],[40,150,210]][randInt(0,3)];
    }
    update(active) {
      this.wingPhase += 0.3;
      if (!active) { this.vx *= 0.95; this.vy *= 0.95; }
      else {
        this.changeTimer++;
        if (this.changeTimer > rand(40, 120)) {
          this.changeTimer = 0;
          this.targetX = rand(30, W - 30);
          this.targetY = rand(groundY - 200, groundY - 20);
        }
        // Dart quickly then hover
        this.vx = lerp(this.vx, (this.targetX - this.x) * 0.06, 0.08);
        this.vy = lerp(this.vy, (this.targetY - this.y) * 0.06, 0.08);
        this.vx = clamp(this.vx, -1.2, 1.2);
        this.vy = clamp(this.vy, -0.8, 0.8);
        if (this.y > groundY - 5) { this.vy = -0.6; }
        if (this.y < groundY - 250) this.vy += 0.03;
      }
      this.x += this.vx; this.y += this.vy;
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      const s = this.size;
      const dir = this.vx !== 0 ? (this.vx > 0 ? 1 : -1) : 1;
      const [r, g, b] = this.bodyColor;

      // Body
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.beginPath();
      ctx.ellipse(dir * s * 0.1, 0, s * 0.55, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = `rgba(${Math.min(r+40,255)},${Math.min(g+40,255)},${Math.min(b+40,255)},0.9)`;
      ctx.beginPath();
      ctx.arc(dir * s * 0.6, 0, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 4 wings
      const wf = Math.abs(Math.sin(this.wingPhase));
      ctx.fillStyle = 'rgba(200,230,255,0.25)';
      for (let wi = 0; wi < 4; wi++) {
        const side = wi < 2 ? 1 : -1;
        const xo = dir * s * 0.05;
        const yo = (wi % 2 === 0 ? -1 : 1) * s * 0.05;
        ctx.beginPath();
        ctx.ellipse(xo, yo, s * 0.55 * wf, s * 0.12, 0.3 * side, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tail
      ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.lineWidth = 1;
      for (let t = 0; t < 4; t++) {
        const tx = -dir * s * (0.4 + t * 0.12);
        ctx.beginPath();
        ctx.arc(tx, 0, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ============================================================
  // SUMMER — LADYBUG
  // ============================================================
  class Ladybug {
    constructor() {
      this.x = rand(20, W - 20);
      this.y = groundY - rand(5, 40);
      this.size = rand(4, 7);
      this.vx = rand(-0.08, 0.08);
      this.dir = this.vx > 0 ? 1 : -1;
      this.spots = randInt(2, 5);
      this.spotPos = [];
      for (let i = 0; i < this.spots; i++) this.spotPos.push({ x: rand(-0.4, 0.4), y: rand(-0.3, 0.1) });
      this.climbTarget = 0;
      this.climbProgress = 0;
    }
    update(active) {
      if (!active) { this.vx *= 0.95; }
      else {
        this.vx += rand(-0.005, 0.005);
        this.vx = clamp(this.vx, -0.15, 0.15);
        if (Math.abs(this.vx) > 0.01) this.dir = this.vx > 0 ? 1 : -1;
        if (this.x < 10) this.vx = 0.08;
        if (this.x > W - 10) this.vx = -0.08;
      }
      this.x += this.vx;
      this.y = groundY - 15 + Math.sin(this.x * 0.005) * 5;
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = alpha * 0.9;
      ctx.translate(this.x, this.y);
      const s = this.size;
      const dir = this.dir;

      // Body dome
      ctx.fillStyle = '#cc2222';
      ctx.beginPath();
      ctx.ellipse(dir * s * 0.1, -s * 0.1, s * 0.6, s * 0.45, 0, Math.PI, 0);
      ctx.fill();

      // Head
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(dir * s * 0.55, -s * 0.2, s * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Center line
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(0, s * 0.2);
      ctx.stroke();

      // Spots
      ctx.fillStyle = '#111';
      this.spotPos.forEach(sp => {
        ctx.beginPath();
        ctx.arc(sp.x * s, sp.y * s, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      });

      // Legs
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.4;
      for (let l = -1; l <= 1; l += 2) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(l * s * 0.15, s * (0.05 + i * 0.08));
          ctx.lineTo(l * s * 0.4, s * (0.15 + i * 0.06));
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  // ============================================================
  // AUTUMN — CATERPILLAR
  // ============================================================
  class Caterpillar {
    constructor() {
      this.x = rand(30, W - 30);
      this.y = groundY - rand(3, 20);
      this.size = rand(5, 8);
      this.segments = randInt(4, 7);
      this.vx = rand(-0.06, 0.06);
      this.wavePhase = rand(0, Math.PI * 2);
      this.color = [[120,200,50],[140,180,40],[160,170,30],[180,150,60]][randInt(0,3)];
    }
    update(active) {
      if (!active) { this.vx *= 0.95; }
      else {
        this.wavePhase += 0.04;
        this.vx += rand(-0.003, 0.003);
        this.vx = clamp(this.vx, -0.1, 0.1);
        if (this.x < 20) this.vx = 0.06;
        if (this.x > W - 20) this.vx = -0.06;
      }
      this.x += this.vx;
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = alpha * 0.85;
      const [r, g, b] = this.color;
      const s = this.size;

      for (let i = 0; i < this.segments; i++) {
        const sx = this.x + i * s * 0.6;
        const sy = this.y + Math.sin(this.wavePhase + i * 0.7) * s * 0.4;
        const brightness = 1 - i * 0.08;
        ctx.fillStyle = `rgba(${Math.floor(r*brightness)},${Math.floor(g*brightness)},${Math.floor(b*brightness)},0.85)`;
        ctx.beginPath();
        ctx.arc(sx, sy, s * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Tiny legs
        if (i > 0 && i < this.segments - 1) {
          ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(sx, sy + s * 0.3);
          ctx.lineTo(sx - 2, sy + s * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx, sy + s * 0.3);
          ctx.lineTo(sx + 2, sy + s * 0.6);
          ctx.stroke();
        }
      }

      // Antennae on head
      const hx = this.x;
      const hy = this.y + Math.sin(this.wavePhase) * s * 0.4;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(hx, hy - s * 0.3);
      ctx.lineTo(hx - s * 0.5, hy - s * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx, hy - s * 0.3);
      ctx.lineTo(hx + s * 0.5, hy - s * 0.7);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ============================================================
  // AUTUMN — SNAIL
  // ============================================================
  class Snail {
    constructor() {
      this.x = rand(30, W - 30);
      this.y = groundY - rand(5, 30);
      this.size = rand(8, 14);
      this.vx = rand(-0.02, 0.02);
      this.shellColor = [[180,130,80],[160,110,60],[200,150,100],[140,100,70]][randInt(0,3)];
      this.spiralTurns = randInt(3, 5);
    }
    update(active) {
      if (!active) { this.vx *= 0.95; }
      else {
        this.vx += rand(-0.001, 0.001);
        this.vx = clamp(this.vx, -0.05, 0.05);
        if (this.x < 30) this.vx = 0.03;
        if (this.x > W - 30) this.vx = -0.03;
      }
      this.x += this.vx;
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = alpha * 0.85;
      const [r, g, b] = this.shellColor;
      const s = this.size;

      // Body/foot
      ctx.fillStyle = 'rgba(220,210,180,0.7)';
      ctx.beginPath();
      ctx.ellipse(this.x - s * 0.2, this.y, s * 0.6, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shell spiral
      for (let t = 0; t < this.spiralTurns; t++) {
        const tr = s * 0.4 * (1 - t * 0.2);
        ctx.fillStyle = `rgba(${Math.floor(r*(1-t*0.1))},${Math.floor(g*(1-t*0.1))},${Math.floor(b*(1-t*0.1))},0.8)`;
        ctx.beginPath();
        ctx.arc(this.x + s * 0.1, this.y - s * 0.1, tr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shell highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(this.x + s * 0.05, this.y - s * 0.25, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Antennae
      ctx.strokeStyle = 'rgba(180,160,130,0.6)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x - s * 0.5, this.y - s * 0.1);
      ctx.lineTo(this.x - s * 0.7, this.y - s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x - s * 0.5, this.y - s * 0.1);
      ctx.lineTo(this.x - s * 0.6, this.y - s * 0.45);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ============================================================
  // WINTER — SMALL BIRD
  // ============================================================
  class WinterBird {
    constructor() {
      this.x = rand(40, W - 40);
      this.y = groundY - rand(10, 50);
      this.size = rand(10, 16);
      this.vx = rand(-0.05, 0.05);
      this.hopPhase = rand(0, Math.PI * 2);
      this.hopSpeed = rand(0.03, 0.06);
      this.pecking = false;
      this.peckTimer = 0;
      this.type = Math.random() > 0.5 ? 'robin' : 'chickadee';
    }
    update(active) {
      if (!active) { this.vx *= 0.95; }
      else {
        this.hopPhase += this.hopSpeed;
        if (Math.abs(this.hopPhase - Math.floor(this.hopPhase / Math.PI) * Math.PI) < 0.1) {
          this.vx += rand(-0.04, 0.04);
          this.vx = clamp(this.vx, -0.15, 0.15);
          this.peckTimer = rand(20, 60);
          this.pecking = true;
        }
        if (this.peckTimer > 0) {
          this.peckTimer--;
          if (this.peckTimer <= 0) this.pecking = false;
        }
        if (this.x < 30) this.vx = 0.06;
        if (this.x > W - 30) this.vx = -0.06;
      }
      this.x += this.vx;
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = alpha * 0.9;
      const s = this.size;
      const hopY = -Math.abs(Math.sin(this.hopPhase * 2)) * s * 0.6;
      const y = this.y + hopY;
      const dir = this.vx !== 0 ? (this.vx > 0 ? 1 : -1) : 1;

      // Body
      if (this.type === 'robin') {
        // Red breast
        ctx.fillStyle = '#cc5533';
        ctx.beginPath();
        ctx.ellipse(this.x, y + s * 0.1, s * 0.4, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Brown back
        ctx.fillStyle = '#6b4e3d';
        ctx.beginPath();
        ctx.ellipse(this.x, y - s * 0.05, s * 0.4, s * 0.35, Math.PI, 0.5, Math.PI * 1.5, false);
        ctx.fill();
      } else {
        // Chickadee - white belly
        ctx.fillStyle = '#e8e8e0';
        ctx.beginPath();
        ctx.ellipse(this.x, y, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Black cap
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(this.x, y - s * 0.25, s * 0.22, Math.PI, 0);
        ctx.fill();
        // Grey back
        ctx.fillStyle = '#8a8a7a';
        ctx.beginPath();
        ctx.ellipse(this.x, y - s * 0.05, s * 0.35, s * 0.28, Math.PI, 0.5, Math.PI * 1.5, false);
        ctx.fill();
      }

      // Head
      ctx.fillStyle = this.type === 'robin' ? '#3a2a1a' : '#333';
      ctx.beginPath();
      ctx.arc(this.x + dir * s * 0.2, y - s * 0.2, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f5a623';
      ctx.beginPath();
      const beakOpen = this.pecking ? 0.15 : 0.08;
      ctx.moveTo(this.x + dir * s * 0.35, y - s * 0.22);
      ctx.lineTo(this.x + dir * s * 0.5, y - s * 0.18 - (this.pecking ? s * 0.05 : 0));
      ctx.lineTo(this.x + dir * s * 0.35, y - s * 0.15 + (this.pecking ? s * 0.05 : 0));
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(this.x + dir * s * 0.28, y - s * 0.25, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x + dir * s * 0.29, y - s * 0.26, s * 0.02, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = '#4a3a2a';
      ctx.lineWidth = 0.6;
      for (let l = -1; l <= 1; l += 2) {
        ctx.beginPath();
        ctx.moveTo(this.x + l * s * 0.1, y + s * 0.25);
        ctx.lineTo(this.x + l * s * 0.08, this.y + s * 0.45);
        ctx.stroke();
        // Foot
        ctx.beginPath();
        ctx.moveTo(this.x + l * s * 0.08, this.y + s * 0.45);
        ctx.lineTo(this.x + l * s * 0.18, this.y + s * 0.5);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ============================================================
  // SUMMER FLOWER (daisy/sunflower at ground)
  // ============================================================
  class SummerFlower {
    constructor() {
      this.x = rand(20, W - 20);
      this.stemH = rand(50, 180);
      this.bloom = 0;
      this.bloomSpeed = rand(0.005, 0.012);
      this.type = Math.random() > 0.5 ? 'daisy' : 'sunflower';
      this.swayPhase = rand(0, Math.PI * 2);
      this.swaySpeed = rand(0.005, 0.012);
    }
    update(active) {
      if (active) this.bloom = Math.min(1, this.bloom + this.bloomSpeed);
      else this.bloom = Math.max(0, this.bloom - this.bloomSpeed * 2);
      this.swayPhase += this.swaySpeed;
    }
    draw(ctx, alpha) {
      if (this.bloom < 0.02) return;
      const bp = this.bloom;
      const sway = Math.sin(this.swayPhase) * 5 * bp;
      const topY = groundY - this.stemH * bp;
      ctx.save();
      ctx.globalAlpha = bp * alpha * 0.8;

      ctx.strokeStyle = 'rgba(40,130,60,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, groundY);
      ctx.quadraticCurveTo(this.x + sway * 0.3, (groundY + topY) / 2, this.x + sway, topY);
      ctx.stroke();

      const cx = this.x + sway;
      const cy = topY;
      const r = this.type === 'sunflower' ? bp * 16 : bp * 10;

      if (this.type === 'daisy') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.25, r * 0.55, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,220,60,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          ctx.fillStyle = 'rgba(255,200,20,0.8)';
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.2, r * 0.5, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(80,40,10,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ============================================================
  // AUTUMN — MUSHROOM
  // ============================================================
  class Mushroom {
    constructor() {
      this.x = rand(30, W - 30);
      this.yBase = groundY;
      this.stemH = rand(15, 40);
      this.capR = rand(8, 18);
      this.bloom = 0;
      this.bloomSpeed = rand(0.004, 0.01);
      this.color = [
        [220, 60, 60], [200, 50, 50], [240, 100, 80],
        [180, 130, 80], [160, 100, 60],
      ][randInt(0, 4)];
      this.spots = randInt(2, 5);
      this.spotPositions = [];
      for (let i = 0; i < this.spots; i++) {
        this.spotPositions.push({ a: rand(0, Math.PI * 2), d: rand(0.2, 0.7) });
      }
    }
    update(active) {
      if (active) this.bloom = Math.min(1, this.bloom + this.bloomSpeed);
      else this.bloom = Math.max(0, this.bloom - this.bloomSpeed * 2.5);
    }
    draw(ctx, alpha) {
      if (this.bloom < 0.02) return;
      const bp = this.bloom;
      const [r, g, b] = this.color;
      ctx.save();
      ctx.globalAlpha = bp * alpha * 0.9;

      // Stem
      ctx.fillStyle = 'rgba(240,230,210,0.8)';
      const stemW = 4 * bp;
      const stemY = groundY - this.stemH * bp;
      ctx.beginPath();
      ctx.roundRect(this.x - stemW, stemY, stemW * 2, this.stemH * bp, stemW);
      ctx.fill();

      // Cap
      const capR = this.capR * bp;
      ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.beginPath();
      ctx.ellipse(this.x, stemY, capR, capR * 0.6, 0, Math.PI, 0);
      ctx.fill();

      // Spots
      this.spotPositions.forEach(sp => {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(sp.a) * capR * sp.d, stemY - capR * 0.2, capR * 0.12, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }
  }

  // ============================================================
  // AUTUMN — GROUND LEAF PILE
  // ============================================================
  class GroundLeaf {
    constructor() {
      this.x = rand(0, W);
      this.y = groundY - rand(0, 30);
      this.size = rand(8, 18);
      this.rot = rand(0, Math.PI * 2);
      this.color = [
        [180, 50, 30], [200, 100, 20], [220, 140, 30],
        [160, 80, 40], [190, 60, 20], [210, 110, 50],
      ][randInt(0, 5)];
      this.accumulating = false;
      this.accumulateY = this.y;
    }
    update(active) {
      if (active) {
        this.accumulating = true;
        this.accumulateY = lerp(this.accumulateY, groundY - rand(1, 20), 0.02);
      } else {
        this.accumulating = false;
        this.accumulateY = lerp(this.accumulateY, groundY + 50, 0.02);
      }
    }
    draw(ctx, alpha) {
      const useY = this.accumulating ? this.accumulateY : this.y + 50;
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.translate(this.x, useY);
      ctx.rotate(this.rot);
      const [r, g, b] = this.color;
      const s = this.size;
      ctx.fillStyle = `rgba(${r},${g},${b},1)`;
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.bezierCurveTo(s / 2, -s / 3, s / 2, s / 3, 0, s / 2);
      ctx.bezierCurveTo(-s / 2, s / 3, -s / 2, -s / 3, 0, -s / 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ============================================================
  // WINTER — BARE BRANCH
  // ============================================================
  class BareBranch {
    constructor() {
      this.x = rand(20, W - 20);
      this.baseY = groundY;
      this.height = rand(30, 100);
      this.angle = rand(-0.3, 0.3);
      this.subBranches = randInt(1, 3);
      this.subAngles = [];
      for (let i = 0; i < this.subBranches; i++) {
        this.subAngles.push({ h: rand(0.3, 0.8), a: rand(-0.8, 0.8), len: rand(0.3, 0.6) });
      }
      this.visible = false;
      this.visProgress = 0;
    }
    update(active) {
      if (active) this.visProgress = Math.min(1, this.visProgress + 0.02);
      else this.visProgress = Math.max(0, this.visProgress - 0.03);
    }
    draw(ctx, alpha) {
      if (this.visProgress < 0.02) return;
      ctx.save();
      ctx.globalAlpha = this.visProgress * alpha * 0.7;
      ctx.strokeStyle = 'rgba(80,70,60,0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      const tipX = this.x + Math.sin(this.angle) * this.height;
      const tipY = this.baseY - Math.cos(this.angle) * this.height;

      ctx.beginPath();
      ctx.moveTo(this.x, this.baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      this.subAngles.forEach(sb => {
        const bx = this.x + (tipX - this.x) * sb.h;
        const by = this.baseY + (tipY - this.baseY) * sb.h;
        const brLen = this.height * sb.len;
        const brAngle = this.angle + sb.a;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.sin(brAngle) * brLen, by - Math.cos(brAngle) * brLen);
        ctx.stroke();
      });

      ctx.restore();
    }
  }

  // ============================================================
  // POOLS
  // ============================================================
  let groundFlowers = [];
  let groundButterflies = [];
  let groundBees = [];
  let dragonflies = [];
  let ladybugs = [];
  let caterpillars = [];
  let snails = [];
  let winterBirds = [];
  let summerFlowers = [];
  let mushrooms = [];
  let groundLeaves = [];
  let bareBranches = [];

  // Sky particles
  let petals = [];
  let autumnLeaves = [];
  let snowflakes = [];
  let sparkles = [];

  // ============================================================
  // PETAL — with color gradient
  // ============================================================
  class Petal {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = rand(-50, W + 50);
      this.y = init ? rand(-H, -20) : rand(-60, -20);
      this.w = rand(12, 24); this.h = rand(18, 34);
      this.rot = rand(0, Math.PI * 2); this.rotSpeed = rand(-0.02, 0.02);
      this.speedX = rand(-0.4, 0.4); this.speedY = rand(0.7, 2.0);
      this.swing = rand(0.3, 0.9); this.swingPhase = rand(0, Math.PI * 2);
      this.opacity = rand(0.6, 0.92);
      this.color = [[255,183,197],[255,228,225],[255,192,203],[255,240,245],[255,218,185],[255,245,238]][randInt(0,5)];
    }
    update() {
      this.swingPhase += 0.014;
      this.x += this.speedX + Math.sin(this.swingPhase) * this.swing;
      this.y += this.speedY; this.rot += this.rotSpeed;
      if (this.y > H + 60) this.reset(false);
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = this.opacity * alpha;
      ctx.translate(this.x, this.y); ctx.rotate(this.rot);
      const [r, g, b] = this.color;
      const grd = ctx.createLinearGradient(0, -this.h/2, 0, this.h/2);
      grd.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
      grd.addColorStop(0.5, `rgba(${Math.floor(r*0.95)},${Math.floor(g*0.95)},${Math.floor(b*0.95)},0.8)`);
      grd.addColorStop(1, `rgba(${Math.floor(r*0.85)},${Math.floor(g*0.85)},${Math.floor(b*0.85)},0.6)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, -this.h / 2);
      ctx.bezierCurveTo(this.w / 2, -this.h / 3, this.w / 2, this.h / 3, 0, this.h / 2);
      ctx.bezierCurveTo(-this.w / 2, this.h / 3, -this.w / 2, -this.h / 3, 0, -this.h / 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ============================================================
  // AUTUMN LEAF (sky)
  // ============================================================
  class AutumnLeaf {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = rand(-30, W + 30); this.y = init ? rand(-H, -10) : rand(-60, -10);
      this.size = rand(10, 22); this.rot = rand(0, Math.PI * 2); this.rotSpeed = rand(-0.04, 0.04);
      this.vx = rand(-0.5, 0.5); this.vy = rand(0.5, 2);
      this.swing = rand(0.5, 1.5); this.swingPhase = rand(0, Math.PI * 2);
      this.opacity = rand(0.6, 0.9);
      this.color = [[255,69,0],[255,140,0],[218,165,32],[205,92,92],[178,34,34],[255,99,71],[210,105,30],[244,164,96]][randInt(0,7)];
    }
    update() {
      this.swingPhase += 0.02;
      this.x += this.vx + Math.sin(this.swingPhase) * this.swing;
      this.y += this.vy; this.rot += this.rotSpeed;
      if (this.y > H + 60) this.reset(false);
    }
    draw(ctx, alpha) {
      ctx.save(); ctx.globalAlpha = this.opacity * alpha;
      ctx.translate(this.x, this.y); ctx.rotate(this.rot);
      const [r, g, b] = this.color;
      const s = this.size;
      // Realistic oval leaf shape
      ctx.fillStyle = `rgba(${r},${g},${b},1)`;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.bezierCurveTo(s * 0.35, -s * 0.35, s * 0.4, s * 0.2, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.4, s * 0.2, -s * 0.35, -s * 0.35, 0, -s * 0.45);
      ctx.fill();
      // Central vein
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(0, s * 0.4); ctx.stroke();
      // Side veins
      for (let v = -2; v <= 2; v++) {
        if (v === 0) continue;
        const vy = v * s * 0.12;
        ctx.beginPath(); ctx.moveTo(0, vy); ctx.lineTo(v * s * 0.2, vy + s * 0.05); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ============================================================
  // SNOWFLAKE — 6-point crystal
  // ============================================================
  class Snowflake {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = rand(-20, W + 20); this.y = init ? rand(-H, -10) : rand(-40, -10);
      this.size = rand(1.5, 6); this.vy = rand(0.3, 1.4); this.vx = rand(-0.3, 0.3);
      this.swing = rand(0.3, 0.8); this.swingPhase = rand(0, Math.PI * 2);
      this.opacity = rand(0.5, 0.95); this.rot = rand(0, Math.PI * 2); this.rotSpeed = rand(-0.02, 0.02);
      this.melt = 0; this.branches = randInt(2, 4);
    }
    update(warm) {
      this.swingPhase += 0.012;
      this.x += this.vx + Math.sin(this.swingPhase) * this.swing;
      this.y += this.vy; this.rot += this.rotSpeed;
      if (warm) this.melt = Math.min(1, this.melt + 0.04);
      else this.melt = Math.max(0, this.melt - 0.04);
      if (this.y > H + 30) this.reset(false);
    }
    draw(ctx, alpha) {
      const a = alpha * (1 - this.melt);
      if (a < 0.02) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(this.x, this.y); ctx.rotate(this.rot);
      const s = this.size;

      // Draw dark outline first for visibility on light bg
      ctx.strokeStyle = 'rgba(150,170,200,0.5)';
      ctx.lineWidth = s * 0.35;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
        ctx.stroke();
        if (this.branches > 1 && s > 2) {
          for (let b = 1; b <= this.branches; b++) {
            const bp = (0.4 + b * 0.2);
            const bx = Math.cos(angle) * s * bp;
            const by = Math.sin(angle) * s * bp;
            const bl = s * 0.25;
            ctx.lineWidth = s * 0.22;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(angle + 0.7) * bl, by + Math.sin(angle + 0.7) * bl);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(angle - 0.7) * bl, by + Math.sin(angle - 0.7) * bl);
            ctx.stroke();
          }
        }
      }
      // White core on top
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = s * 0.15;
      ctx.lineCap = 'round';

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        // Main arm
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
        ctx.stroke();

        // Side branches
        if (this.branches > 1 && s > 2) {
          for (let b = 1; b <= this.branches; b++) {
            const bp = (0.4 + b * 0.2);
            const bx = Math.cos(angle) * s * bp;
            const by = Math.sin(angle) * s * bp;
            const bl = s * 0.25;
            ctx.lineWidth = s * 0.15;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(angle + 0.7) * bl, by + Math.sin(angle + 0.7) * bl);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(angle - 0.7) * bl, by + Math.sin(angle - 0.7) * bl);
            ctx.stroke();
          }
        }
      }

      // Center dot
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ============================================================
  // SPARKLE (winter frost)
  // ============================================================
  class Sparkle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = rand(0, W); this.y = init ? rand(0, H) : rand(0, H);
      this.size = rand(1, 3); this.life = 0; this.maxLife = rand(60, 180);
      this.phase = rand(0, Math.PI * 2);
    }
    update() { this.life++; this.phase += 0.05; if (this.life > this.maxLife) this.reset(false); }
    draw(ctx, alpha) {
      const a = Math.sin((this.life / this.maxLife) * Math.PI) * alpha;
      if (a < 0.02) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ============================================================
  // ENSURE POOLS
  // ============================================================
  function ensurePools() {
    while (petals.length < 60) petals.push(new Petal());
    while (autumnLeaves.length < 55) autumnLeaves.push(new AutumnLeaf());
    while (snowflakes.length < 90) snowflakes.push(new Snowflake());
    while (sparkles.length < 25) sparkles.push(new Sparkle());
    while (groundFlowers.length < 18) groundFlowers.push(new GroundFlower());
    while (groundButterflies.length < 5) groundButterflies.push(new GroundButterfly());
    while (groundBees.length < 3) groundBees.push(new GroundBee());
    while (dragonflies.length < 4) dragonflies.push(new Dragonfly());
    while (ladybugs.length < 5) ladybugs.push(new Ladybug());
    while (caterpillars.length < 4) caterpillars.push(new Caterpillar());
    while (snails.length < 3) snails.push(new Snail());
    while (winterBirds.length < 3) winterBirds.push(new WinterBird());
    while (summerFlowers.length < 10) summerFlowers.push(new SummerFlower());
    while (mushrooms.length < 8) mushrooms.push(new Mushroom());
    while (groundLeaves.length < 50) groundLeaves.push(new GroundLeaf());
    while (bareBranches.length < 6) bareBranches.push(new BareBranch());
    if (petals.length > 70) petals.length = 70;
    if (autumnLeaves.length > 70) autumnLeaves.length = 70;
    if (snowflakes.length > 120) snowflakes.length = 120;
    if (sparkles.length > 35) sparkles.length = 35;
  }

  // ============================================================
  // DRAW GROUND LAYER
  // ============================================================
  function drawGroundLayer(season, alpha, growProgress) {
    if (alpha < 0.01) return;

    // Ground base gradient
    if (season === 'winter') {
      // Snow layer
      const snowGrd = ctx.createLinearGradient(0, groundY - 80, 0, groundY);
      snowGrd.addColorStop(0, 'rgba(230,240,250,0)');
      snowGrd.addColorStop(0.3, 'rgba(220,235,248,0.15)');
      snowGrd.addColorStop(0.6, 'rgba(210,228,245,0.35)');
      snowGrd.addColorStop(0.85, 'rgba(240,245,252,0.65)');
      snowGrd.addColorStop(1, 'rgba(250,252,255,0.9)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = snowGrd;
      ctx.fillRect(0, groundY - 80, W, 80);
      // Snow surface sparkle line
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(0, groundY - 2, W, 3);
      ctx.globalAlpha = 1;
    } else {
      let soilColor;
      switch (season) {
        case 'spring': soilColor = ['rgba(55,110,45,0.12)', 'rgba(35,70,25,0.25)']; break;
        case 'summer': soilColor = ['rgba(40,95,30,0.15)', 'rgba(20,55,15,0.3)']; break;
        case 'autumn': soilColor = ['rgba(110,75,35,0.12)', 'rgba(75,45,18,0.25)']; break;
        default: soilColor = ['transparent', 'transparent'];
      }
      const soilGrd = ctx.createLinearGradient(0, groundY - 60, 0, groundY);
      soilGrd.addColorStop(0, 'transparent');
      soilGrd.addColorStop(0.5, soilColor[0]);
      soilGrd.addColorStop(1, soilColor[1]);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = soilGrd;
      ctx.fillRect(0, groundY - 60, W, 60);
      ctx.globalAlpha = 1;
    }

    // Grass (winter has very short pale grass)
    grassBlades.forEach(g => {
      if (g.season !== season) g._init(); // regenerate for new season
      g.season = season;
      g.update();
      g.draw(ctx, alpha, growProgress);
    });

    // Season-specific ground features
    switch (season) {
      case 'spring':
        groundFlowers.forEach(f => { f.update(true); f.draw(ctx, alpha); });
        groundButterflies.forEach(b => { b.update(true); b.draw(ctx, alpha); });
        groundBees.forEach(bee => { bee.update(true); bee.draw(ctx, alpha); });
        break;
      case 'summer':
        summerFlowers.forEach(f => { f.update(true); f.draw(ctx, alpha); });
        dragonflies.forEach(d => { d.update(true); d.draw(ctx, alpha); });
        ladybugs.forEach(l => { l.update(true); l.draw(ctx, alpha); });
        break;
      case 'autumn':
        mushrooms.forEach(m => { m.update(true); m.draw(ctx, alpha); });
        groundLeaves.forEach(l => { l.update(true); l.draw(ctx, alpha); });
        caterpillars.forEach(c => { c.update(true); c.draw(ctx, alpha); });
        snails.forEach(s => { s.update(true); s.draw(ctx, alpha); });
        break;
      case 'winter':
        bareBranches.forEach(b => { b.update(true); b.draw(ctx, alpha); });
        winterBirds.forEach(wb => { wb.update(true); wb.draw(ctx, alpha); });
        break;
    }
  }

  // Fade out non-active ground features
  function fadeOutGroundFeatures(season) {
    if (season !== 'spring') {
      groundFlowers.forEach(f => { f.update(false); });
      groundButterflies.forEach(b => { b.update(false); });
      groundBees.forEach(bee => { bee.update(false); });
    }
    if (season !== 'summer') {
      summerFlowers.forEach(f => { f.update(false); });
      dragonflies.forEach(d => { d.update(false); });
      ladybugs.forEach(l => { l.update(false); });
    }
    if (season !== 'autumn') {
      mushrooms.forEach(m => { m.update(false); });
      groundLeaves.forEach(l => { l.update(false); });
      caterpillars.forEach(c => { c.update(false); });
      snails.forEach(s => { s.update(false); });
    }
    if (season !== 'winter') {
      bareBranches.forEach(b => { b.update(false); });
      winterBirds.forEach(wb => { wb.update(false); });
    }
  }

  // ============================================================
  // BACKGROUND GLOW
  // ============================================================
  function drawSkyGlow(season, alpha) {
    if (alpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    let grd;
    switch (season) {
      case 'spring':
        grd = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, Math.max(W, H) * 0.6);
        grd.addColorStop(0, 'rgba(255,210,220,0.06)');
        grd.addColorStop(0.5, 'rgba(255,183,197,0.03)');
        grd.addColorStop(1, 'rgba(2,2,8,0)');
        break;
      case 'summer':
        grd = ctx.createRadialGradient(W / 2, H * 0.25, 0, W / 2, H * 0.25, Math.max(W, H) * 0.6);
        grd.addColorStop(0, 'rgba(255,255,180,0.06)');
        grd.addColorStop(0.5, 'rgba(144,238,144,0.03)');
        grd.addColorStop(1, 'rgba(2,2,8,0)');
        break;
      case 'autumn':
        grd = ctx.createRadialGradient(W * 0.65, H * 0.3, 0, W / 2, H * 0.45, Math.max(W, H) * 0.6);
        grd.addColorStop(0, 'rgba(255,165,0,0.06)');
        grd.addColorStop(0.5, 'rgba(255,140,0,0.03)');
        grd.addColorStop(1, 'rgba(2,2,8,0)');
        break;
      case 'winter':
        grd = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.6);
        grd.addColorStop(0, 'rgba(200,220,255,0.06)');
        grd.addColorStop(0.5, 'rgba(176,196,222,0.03)');
        grd.addColorStop(1, 'rgba(2,2,8,0)');
        break;
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ============================================================
  // SPRING — NAME VINES (hanging down like a curtain)
  // ============================================================
  let nameVinePhase = 0;
  let nameTargets = [];
  let nameVines = []; // pre-generated vine paths

  function updateNameTargets() {
    nameTargets = [];
    const spans = document.querySelectorAll('.hn');
    spans.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.width > 0 && r.top < H + 200 && r.bottom > -200) {
        nameTargets.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height });
      }
    });
    // Generate vines from name bounding area
    if (nameTargets.length > 0 && nameVines.length === 0) {
      const minX = Math.min(...nameTargets.map(t => t.x - t.w * 0.5));
      const maxX = Math.max(...nameTargets.map(t => t.x + t.w * 0.5));
      const topY = Math.min(...nameTargets.map(t => t.y - t.h * 0.5));
      const w = maxX - minX;
      const h = nameTargets[0].y + nameTargets[0].h * 0.5 - topY;
      const vineCount = 5;
      for (let v = 0; v < vineCount; v++) {
        const originX = minX + (w / (vineCount + 1)) * (v + 1);
        const originY = topY - rand(10, 40);
        const length = h + rand(30, 80);
        const segments = randInt(8, 14);
        const swayAmp = rand(0.3, 0.7);
        const swayFreq = rand(0.8, 1.5);
        const nodes = [];
        for (let s = 0; s <= segments; s++) {
          const t = s / segments;
          nodes.push({
            t,
            baseX: originX + rand(-8, 8),
            baseY: originY + length * t,
            sway: Math.sin(t * Math.PI) * 30 * swayAmp,
          });
        }
        nameVines.push({ nodes, swayFreq, originX, originY, length, color: [randInt(60,140), randInt(150,210), randInt(40,90)] });
      }
    }
  }

  function drawNameVines(alpha) {
    updateNameTargets();
    if (nameTargets.length < 1 || nameVines.length === 0) return;
    nameVinePhase += 0.006;

    ctx.save();
    ctx.globalAlpha = alpha * 0.85;

    nameVines.forEach(vine => {
      const [vr, vg, vb] = vine.color;
      const sway = Math.sin(nameVinePhase * vine.swayFreq) * 15;

      // Draw vine stem
      ctx.strokeStyle = `rgba(${vr},${vg},${vb},0.6)`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      vine.nodes.forEach((node, i) => {
        const x = node.baseX + Math.sin(nameVinePhase * vine.swayFreq + i * 0.4) * node.sway;
        const y = node.baseY;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prev = vine.nodes[i - 1];
          const px = prev.baseX + Math.sin(nameVinePhase * vine.swayFreq + (i - 1) * 0.4) * prev.sway;
          const py = prev.baseY;
          const midX = (px + x) / 2;
          const midY = (py + y) / 2;
          ctx.quadraticCurveTo(midX, midY + rand(-5, 5), x, y);
        }
      });
      ctx.stroke();

      // Leaves along vine
      vine.nodes.forEach((node, i) => {
        if (i === 0 || i >= vine.nodes.length - 1) return;
        const x = node.baseX + Math.sin(nameVinePhase * vine.swayFreq + i * 0.4) * node.sway;
        const y = node.baseY;
        const leafAngle = Math.sin(nameVinePhase * 2 + i) * 0.5 + (i % 2 === 0 ? 0.6 : -0.6);
        const leafSize = 5 + Math.sin(i * 1.2) * 3;

        // Leaf on left
        ctx.fillStyle = `rgba(${Math.floor(vr*1.2)},${Math.floor(vg*1.1)},${Math.floor(vb*0.9)},0.55)`;
        ctx.beginPath();
        ctx.ellipse(x - 3, y - 2, leafSize, leafSize * 1.6, leafAngle - 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Leaf on right
        ctx.fillStyle = `rgba(${Math.floor(vr*0.9)},${Math.floor(vg*1.2)},${Math.floor(vb*0.9)},0.5)`;
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 1, leafSize, leafSize * 1.6, leafAngle + 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Small flowers at some nodes
      vine.nodes.forEach((node, i) => {
        if (i < 2 || i >= vine.nodes.length - 2 || i % 3 !== 0) return;
        const x = node.baseX + Math.sin(nameVinePhase * vine.swayFreq + i * 0.4) * node.sway;
        const y = node.baseY;
        const bloom = 0.5 + 0.5 * Math.sin(nameVinePhase * 3 + i);
        const fs = 4 + bloom * 3;
        const fcolors = [[255,150,180],[255,110,160],[255,170,200],[255,200,110]];
        const [fr, fg, fb] = fcolors[i % 4];

        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2;
          ctx.fillStyle = `rgba(${fr},${fg},${fb},0.75)`;
          ctx.beginPath();
          ctx.arc(x + Math.cos(pa) * fs * 0.5, y + Math.sin(pa) * fs * 0.5, fs * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,230,80,0.85)';
        ctx.beginPath();
        ctx.arc(x, y, fs * 0.22, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.restore();
  }

  // ============================================================
  // RENDER
  // ============================================================
  function render() {
    ctx.clearRect(0, 0, W, H);

    let alpha1 = 1, alpha2 = 0;
    if (transitioning) {
      seasonBlend = Math.min(1, seasonBlend + 0.012);
      if (seasonBlend >= 1) {
        transitioning = false;
        currentSeason = targetSeason;
        seasonBlend = 0;
      }
      alpha1 = 1 - seasonBlend;
      alpha2 = seasonBlend;
    }

    // Draw current season
    drawSkyGlow(currentSeason, alpha1);
    drawSkyParticles(currentSeason, alpha1);
    drawGroundLayer(currentSeason, alpha1, 1);

    // Fade in target season
    if (transitioning) {
      drawSkyGlow(targetSeason, alpha2);
      drawSkyParticles(targetSeason, alpha2);
      drawGroundLayer(targetSeason, alpha2, seasonBlend);
    }

    updateAll();
    animFrame = requestAnimationFrame(render);
  }

  function drawSkyParticles(season, alpha) {
    if (alpha < 0.01) return;
    switch (season) {
      case 'spring': petals.forEach(p => p.draw(ctx, alpha)); break;
      case 'autumn': autumnLeaves.forEach(l => l.draw(ctx, alpha)); break;
      case 'winter':
        snowflakes.forEach(s => s.draw(ctx, alpha));
        sparkles.forEach(s => s.draw(ctx, alpha));
        break;
    }
  }

  function updateAll() {
    petals.forEach(p => p.update());
    autumnLeaves.forEach(l => l.update());
    const isWinter = currentSeason === 'winter' || (transitioning && targetSeason === 'winter');
    snowflakes.forEach(s => s.update(!isWinter));
    sparkles.forEach(s => s.update());
  }

  // ============================================================
  // SEASON SWITCHING
  // ============================================================
  function switchSeason(newSeason) {
    // Always accept the latest target, even mid-transition
    if (newSeason === targetSeason && transitioning) return;
    if (newSeason === currentSeason && !transitioning) return;
    // If switching mid-transition, reset blend so we go directly to new target
    if (transitioning && newSeason !== targetSeason) {
      seasonBlend = 0;
      currentSeason = targetSeason; // resolve current transition instantly
    }
    targetSeason = newSeason;
    transitioning = true;
    document.body.setAttribute('data-season', newSeason);
  }

  function setupSectionObserver() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    const sectionMap = {
      'home': 'spring', 'about': 'summer',
      'skills': 'autumn', 'projects': 'autumn',
      'contact': 'winter',
    };
    let ticking = false;

    function update() {
      let bestId = 'home', bestArea = 0;
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const vTop = Math.max(0, rect.top);
        const vBot = Math.min(H, rect.bottom);
        const vH = Math.max(0, vBot - vTop);
        if (vH > bestArea) { bestArea = vH; bestId = section.id; }
      });
      const season = sectionMap[bestId];
      if (season) switchSeason(season);
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    // Fire once on load
    update();
  }

  function setupMouseTracking() {
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener('mouseleave', () => { mouseX = -100; mouseY = -100; });
  }

  let started = false;

  function init() {
    resize();
    regrowGrass();
    ensurePools();
    setupSectionObserver();
    setupMouseTracking();
    document.body.setAttribute('data-season', 'spring');

    window.addEventListener('resize', () => {
      resize();
      regrowGrass();
    });

    // Don't start render until start() is called
  }

  function start() {
    if (started) return;
    started = true;
    render();
    console.log('%c Seasons %c Ground ecosystems active',
      'background:linear-gradient(135deg,#ffb7c5,#87ceeb,#ff8c00,#b0e0e6);color:#111;padding:3px 8px;border-radius:4px;', '');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Seasons = { switchTo: switchSeason, getCurrent: () => currentSeason, start: start };
})();
