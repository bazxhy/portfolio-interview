// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add scrolled class when past hero
    if (currentScroll > 80) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ===== Scroll Animation (Intersection Observer) =====
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px',
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all cards
document.querySelectorAll('.about-card, .project-card, .contact-card, .skill-category').forEach((el) => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
});

// Also observe section titles
document.querySelectorAll('.section-title').forEach((el) => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
});

// ===== Smooth Nav Link Active State =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach((section) => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.offsetHeight;

        if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach((link) => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${current}`) {
            link.style.color = 'var(--color-accent-light)';
        }
    });
});

// ===== Skill Tag Hover Effect =====
document.querySelectorAll('.skill-tag').forEach((tag) => {
    tag.addEventListener('mouseenter', () => {
        tag.style.transform = 'translateY(-2px)';
    });
    tag.addEventListener('mouseleave', () => {
        tag.style.transform = 'translateY(0)';
    });
});

// ===== Typing Animation for Hero Title (optional enhancement) =====
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
    const originalText = heroTitle.textContent;
    heroTitle.style.opacity = '0';
    heroTitle.style.transition = 'opacity 0.8s ease';

    setTimeout(() => {
        heroTitle.style.opacity = '1';
    }, 400);
}

console.log('Portfolio site loaded successfully! 🚀');
