// ============================================================
// 关福博 — Portfolio · Interaction Engine
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initNavbar();
    initTyping();
    initScrollAnimations();
    initCounters();
    initSkillBars();
    initMobileMenu();
    console.log('%c Portfolio Ready %c  关福博 · github.com/bazxhy',
        'background:#6c8cff;color:#fff;padding:4px 8px;border-radius:4px;',
        'color:#9494b8;');
});

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

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Scrolled state
        navbar.classList.toggle('scrolled', currentScroll > 80);

        // Active nav link
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
                link.style.color = '#fff';
                link.style.background = 'rgba(108, 140, 255, 0.12)';
            } else {
                link.style.color = '';
                link.style.background = '';
            }
        });

        lastScroll = currentScroll;
    });
}

// ============================================================
// TYPING EFFECT FOR HERO ROLE
// ============================================================
function initTyping() {
    const el = document.getElementById('typingText');
    if (!el) return;

    const phrases = [
        'AI 应用开发探索者',
        '用 AI 高效构建软件',
        'Python 自动化开发者',
        '从需求到部署全流程',
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
            // Pause at the end before deleting
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            speed = 400;
        }

        setTimeout(type, speed);
    }

    // Start after a short delay
    setTimeout(type, 1200);
}

// ============================================================
// SCROLL ANIMATIONS (Intersection Observer)
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
                observer.unobserve(entry.target); // animate once
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
                    // Ease out quad
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
                // Trigger reflow then animate
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        bar.style.width = targetWidth;
                    });
                });
                barObserver.unobserve(bar);
            }
        });
    }, { threshold: 0.3 });

    // Store widths before observing
    bars.forEach(bar => {
        bar.dataset.width = bar.style.width;
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

    // Close menu on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
        });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !toggle.contains(e.target)) {
            menu.classList.remove('open');
        }
    });
}
