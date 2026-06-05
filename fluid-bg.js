// ============================================================
// Fluid Particle Background — inspired by Tomotoes/HomePage
// Canvas 2D simulation: gradient orbs + particle network + mouse
// ============================================================

(function () {
    const canvas = document.getElementById('fluidBg');
    const ctx = canvas.getContext('2d');

    let W, H;
    let mouse = { x: -1000, y: -1000, active: false };
    let particles = [];
    let orbs = [];
    const PARTICLE_COUNT = 80;
    const ORB_COUNT = 3;

    // Theme colors
    function getColors() {
        const style = getComputedStyle(document.documentElement);
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        return {
            accent: style.getPropertyValue('--accent').trim() || '#6c8cff',
            accentAlt: style.getPropertyValue('--accent-alt').trim() || '#a78bfa',
            isLight: isLight,
            gridAlpha: isLight ? 0.04 : 0.03,
            orbAlpha: isLight ? 0.06 : 0.08,
            particleAlpha: isLight ? 0.35 : 0.5,
            lineAlpha: isLight ? 0.06 : 0.08,
        };
    }

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    // Gradient orb
    class Orb {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.r = Math.random() * 250 + 150;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.hue = Math.random() < 0.5 ? 0 : 1; // accent or accent-alt
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < -this.r) this.x = W + this.r;
            if (this.x > W + this.r) this.x = -this.r;
            if (this.y < -this.r) this.y = H + this.r;
            if (this.y > H + this.r) this.y = -this.r;
        }
        draw(ctx, colors) {
            const c = this.hue === 0 ? colors.accent : colors.accentAlt;
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
            grad.addColorStop(0, hexToRgba(c, colors.orbAlpha));
            grad.addColorStop(0.5, hexToRgba(c, colors.orbAlpha * 0.4));
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // Floating particle
    class Particle {
        constructor() {
            this.reset(true);
        }
        reset(init) {
            this.x = init ? Math.random() * W : -50;
            this.y = init ? Math.random() * H : Math.random() * H;
            this.vx = (Math.random() - 0.5) * 0.6;
            this.vy = (Math.random() - 0.5) * 0.6;
            this.r = Math.random() * 2 + 1;
            this.alpha = Math.random() * 0.6 + 0.2;
            this.life = Math.random() * 300 + 200;
            this.age = 0;
        }
        update() {
            // Organic wandering via perlin-like noise approximation
            this.vx += (Math.random() - 0.5) * 0.02;
            this.vy += (Math.random() - 0.5) * 0.02;
            // Clamp speed
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const maxSpeed = 0.8;
            if (speed > maxSpeed) {
                this.vx = (this.vx / speed) * maxSpeed;
                this.vy = (this.vy / speed) * maxSpeed;
            }
            // Mouse repulsion
            if (mouse.active) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                if (dist < 150) {
                    const force = (150 - dist) / 150 * 0.8;
                    this.vx += (dx / dist) * force;
                    this.vy += (dy / dist) * force;
                }
            }
            this.x += this.vx;
            this.y += this.vy;
            this.age++;
            // Respawn when old or out of bounds
            if (this.age > this.life || this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50) {
                this.reset(false);
                this.age = 0;
            }
        }
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function init() {
        resize();
        orbs = Array.from({ length: ORB_COUNT }, () => new Orb());
        particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    }

    // Mouse
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });
    document.addEventListener('mouseleave', () => { mouse.active = false; });
    document.addEventListener('touchmove', (e) => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
    }, { passive: true });
    document.addEventListener('touchend', () => { mouse.active = false; });

    window.addEventListener('resize', resize);

    function draw() {
        const colors = getColors();
        ctx.clearRect(0, 0, W, H);

        // Subtle grid
        ctx.strokeStyle = hexToRgba(colors.accent, colors.gridAlpha);
        ctx.lineWidth = 0.5;
        const gridSize = 60;
        for (let x = 0; x < W; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y < H; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Gradient orbs (soft glow behind everything)
        orbs.forEach(o => { o.update(); o.draw(ctx, colors); });

        // Update & draw particles
        particles.forEach(p => p.update());

        // Draw connections (particle network)
        const pAlpha = colors.particleAlpha;
        const lAlpha = colors.lineAlpha;
        const accent = colors.accent;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(accent, p.alpha * pAlpha);
            ctx.fill();

            // Draw connections to nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    const alpha = (1 - dist / 120) * lAlpha;
                    ctx.strokeStyle = hexToRgba(accent, alpha);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }

            // Mouse interaction glow
            if (mouse.active) {
                const mx = p.x - mouse.x;
                const my = p.y - mouse.y;
                const mDist = Math.sqrt(mx * mx + my * my);
                if (mDist < 180) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    const alpha = (1 - mDist / 180) * lAlpha * 2;
                    ctx.strokeStyle = hexToRgba(accent, alpha);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        // Mouse glow ring
        if (mouse.active) {
            const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
            glow.addColorStop(0, hexToRgba(accent, 0.12));
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 180, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    init();
    draw();

    // Re-init particles when theme changes
    const observer = new MutationObserver(() => {
        // Themes changed → reset orb colors
        orbs.forEach(o => { o.hue = Math.random() < 0.5 ? 0 : 1; });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    console.log('%c Fluid BG %c Canvas particle network + gradient orbs active',
        'background:#6c8cff;color:#fff;padding:2px 6px;border-radius:3px;', 'color:inherit;');
})();
