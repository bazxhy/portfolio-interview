// ============================================================
// 关福博 — Portfolio · Interaction Engine
// Features: Particles, Navbar, Typing, Counters, Skill Bars,
//           Scroll Animations, Settings Panel, Dark/Light + Lang
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initNavbar();
    initTyping();
    initScrollAnimations();
    initCounters();
    initSkillBars();
    initMobileMenu();
    initSettingsPanel();
    initThemeToggle();
    initLangSwitcher();
    refreshParticleColors();

    console.log('%c Portfolio Ready %c  关福博 · github.com/bazxhy',
        `background:var(--accent);color:#fff;padding:4px 8px;border-radius:4px;`,
        'color:inherit;');
});

// ============================================================
// SETTINGS PANEL
// ============================================================
function initSettingsPanel() {
    const trigger = document.getElementById('settingsTrigger');
    const panel = document.getElementById('settingsPanel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !trigger.contains(e.target)) {
            panel.classList.remove('open');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') panel.classList.remove('open');
    });
}

// ============================================================
// DARK / LIGHT THEME TOGGLE
// ============================================================
function initThemeToggle() {
    const saved = localStorage.getItem('portfolio-theme') || 'dark';
    applyTheme(saved);

    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('portfolio-theme', next);
        refreshParticleColors();
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Show only the active label
    document.querySelectorAll('.theme-toggle-label').forEach(label => {
        const labelTheme = label.dataset.themeLabel;
        label.style.display = (labelTheme === theme) ? 'inline' : 'none';
    });

    refreshParticleColors();
}

function refreshParticleColors() {
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim();
    document.querySelectorAll('.particle').forEach(p => {
        p.style.background = accent;
    });
}

// ============================================================
// LANGUAGE SWITCHER
// ============================================================
function initLangSwitcher() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            I18n.toggle(lang);
            restartTyping();
        });
    });
}

// ============================================================
// BACKGROUND PARTICLES
// ============================================================
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const COUNT = 40;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = Math.random() * 3 + 1;
        const left = Math.random() * 100;
        const delay = Math.random() * 12;
        const duration = Math.random() * 8 + 10;

        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            animation-delay: ${delay}s;
            animation-duration: ${duration}s;
            opacity: ${Math.random() * 0.4 + 0.1};
        `;

        fragment.appendChild(particle);
    }

    container.appendChild(fragment);
}

// ============================================================
// NAVBAR SCROLL + ACTIVE LINK
// ============================================================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        navbar.classList.toggle('scrolled', currentScroll > 80);

        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 140;
            if (currentScroll >= top) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            const href = link.getAttribute('href')?.replace('#', '');
            if (href === current) {
                link.style.color = 'var(--text-heading)';
                link.style.background = 'color-mix(in srgb, var(--accent) 15%, transparent)';
            } else {
                link.style.color = '';
                link.style.background = '';
            }
        });
    });
}

// ============================================================
// TYPING EFFECT (i18n-aware)
// ============================================================
let typingTimeout = null;

function initTyping() {
    restartTyping();
}

function restartTyping() {
    if (typingTimeout) clearTimeout(typingTimeout);

    const el = document.getElementById('typingText');
    if (!el) return;

    const phrases = [
        I18n.t('type.0'),
        I18n.t('type.1'),
        I18n.t('type.2'),
        I18n.t('type.3'),
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let currentPhrase = '';

    function type() {
        const target = phrases[phraseIdx];

        if (isDeleting) {
            currentPhrase = target.substring(0, charIdx - 1);
            charIdx--;
        } else {
            currentPhrase = target.substring(0, charIdx + 1);
            charIdx++;
        }

        el.textContent = currentPhrase;

        let speed = isDeleting ? 40 : 80;

        if (!isDeleting && charIdx === target.length) {
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            speed = 400;
        }

        typingTimeout = setTimeout(type, speed);
    }

    typingTimeout = setTimeout(type, 1200);
}

// ============================================================
// SCROLL ANIMATIONS
// ============================================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll(
        '.about-card, .contact-card, .skill-domain, .project-featured, ' +
        '.section-title, .section-subtitle, .section-tag'
    ).forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function initCounters() {
    const counters = document.querySelectorAll('.counter');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                const duration = 1200;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - (1 - progress) * (1 - progress);
                    const current = Math.floor(eased * target);
                    el.textContent = current;
                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = target;
                    }
                }

                requestAnimationFrame(update);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => counterObserver.observe(c));
}

// ============================================================
// SKILL BAR ANIMATION
// ============================================================
function initSkillBars() {
    const bars = document.querySelectorAll('.skill-bar-fill');

    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const targetWidth = bar.style.width;
                bar.style.width = '0';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        bar.style.width = targetWidth;
                    });
                });
                barObserver.unobserve(bar);
            }
        });
    }, { threshold: 0.3 });

    bars.forEach(bar => {
        bar.style.width = '0';
        barObserver.observe(bar);
    });
}

// ============================================================
// MOBILE MENU
// ============================================================
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const menu = document.querySelector('.nav-menu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) {
            menu.classList.remove('open');
        }
    });
}
