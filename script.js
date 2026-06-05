// ============================================================
// 关福博 — Portfolio · Full Interaction Engine
// Intro overlay · Canvas fluid bg · Scroll reveal · i18n · Theme
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initIntro();
    initNavbar();
    initTyping();
    initScrollReveal();
    initCounters();
    initSkillBars();
    initMobileMenu();
    initSettingsPanel();
    initThemeToggle();
    initLangSwitcher();

    console.log('%c Portfolio Ready %c  关福博 · github.com/bazxhy',
        'background:var(--accent, #6c8cff);color:#fff;padding:4px 8px;border-radius:4px;',
        'color:inherit;');
});

// ============================================================
// INTRO ANIMATION — splash screen → fade to main content
// ============================================================
function initIntro() {
    const overlay = document.getElementById('introOverlay');
    const main = document.getElementById('mainContent');
    if (!overlay || !main) return;

    // Hide intro after animation plays (2.5s)
    const duration = 2500;

    setTimeout(() => {
        overlay.classList.add('hidden');
        main.classList.add('visible');
        document.body.style.overflow = '';

        // Start typing after intro
        if (typeof restartTyping === 'function') restartTyping();
    }, duration);

    // Prevent scroll during intro
    document.body.style.overflow = 'hidden';
}

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
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
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
            if (currentScroll >= top) current = section.getAttribute('id');
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
// TYPING EFFECT
// ============================================================
let typingTimeout = null;

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
        if (!isDeleting && charIdx === target.length) { speed = 2000; isDeleting = true; }
        else if (isDeleting && charIdx === 0) { isDeleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; speed = 400; }

        typingTimeout = setTimeout(type, speed);
    }
    typingTimeout = setTimeout(type, 300);
}

// ============================================================
// SCROLL REVEAL (IntersectionObserver)
// ============================================================
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal-up, .about-card, .contact-card, .skill-domain, .project-featured').forEach(el => {
        el.classList.add('reveal-up');
        observer.observe(el);
    });
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
}

function animateCounter(el, target) {
    const duration = 1200;
    const start = performance.now();
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - progress) * (1 - progress);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }
    requestAnimationFrame(update);
}

// ============================================================
// SKILL BAR ANIMATION
// ============================================================
function initSkillBars() {
    const bars = document.querySelectorAll('.skill-bar-fill');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const targetWidth = bar.dataset.width + '%';
                bar.style.width = targetWidth;
                observer.unobserve(bar);
            }
        });
    }, { threshold: 0.3 });
    bars.forEach(bar => observer.observe(bar));
}

// ============================================================
// MOBILE MENU
// ============================================================
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const menu = document.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.classList.remove('open')));
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) menu.classList.remove('open');
    });
}
