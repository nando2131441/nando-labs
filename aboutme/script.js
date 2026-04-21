function applyTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light', saved === 'light');
}

applyTheme();

// Theme toggle
(function () {
  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light');
    localStorage.setItem('theme', isLight ? 'dark' : 'light');
    applyTheme();
  });
})();

// Canvas shooting stars
(function () {
  const canvas = document.getElementById('star-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, stars, lastTime;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class ShootingStar {
    constructor(initial) { this._init(initial); }

    _init(initial) {
      this.waiting = true;
      this.elapsed = 0;
      this.progress = 0;
      this.done = false;
      this.delay = (initial ? Math.random() * 12 : 3 + Math.random() * 10) * 1000;
      this._place();
    }

    _place() {
      this.startX = W * (0.05 + Math.random() * 0.8);
      this.startY = H * (0.02 + Math.random() * 0.35);
      const deg = 22 + Math.random() * 22;
      this.angle = deg * Math.PI / 180;
      this.speed = 380 + Math.random() * 420;
      this.maxTrail = 70 + Math.random() * 160;
      this.lineWidth = 1 + Math.random() * 1.4;
      const totalDist = this.maxTrail + Math.max(W, H) * 0.25;
      this.totalDuration = totalDist / this.speed * 1000;
    }

    update(dt) {
      if (this.done) return;
      if (this.waiting) {
        this.elapsed += dt;
        if (this.elapsed >= this.delay) {
          this.waiting = false;
          this.elapsed = 0;
          this._place();
        }
        return;
      }
      this.elapsed += dt;
      this.progress = this.elapsed / this.totalDuration;
      if (this.progress >= 1) this.done = true;
    }

    draw() {
      if (this.waiting || this.done) return;
      const dist = (this.elapsed / 1000) * this.speed;
      const headX = this.startX + Math.cos(this.angle) * dist;
      const headY = this.startY + Math.sin(this.angle) * dist;
      const p = this.progress;
      const opacity = p < 0.08 ? p / 0.08 : p > 0.62 ? Math.max(0, 1 - (p - 0.62) / 0.38) : 1;
      if (opacity < 0.01) return;
      const trailLen = Math.min(this.maxTrail, dist);
      const tailX = headX - Math.cos(this.angle) * trailLen;
      const tailY = headY - Math.sin(this.angle) * trailLen;
      const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      grad.addColorStop(0,    'rgba(200,225,255,0)');
      grad.addColorStop(0.45, `rgba(210,232,255,${opacity * 0.3})`);
      grad.addColorStop(0.8,  `rgba(240,248,255,${opacity * 0.72})`);
      grad.addColorStop(1,    `rgba(255,255,255,${opacity})`);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = this.lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      const r = 3 + this.lineWidth * 1.5;
      const glow = ctx.createRadialGradient(headX, headY, 0, headX, headY, r * 3.5);
      glow.addColorStop(0,    `rgba(255,255,255,${opacity})`);
      glow.addColorStop(0.35, `rgba(210,235,255,${opacity * 0.55})`);
      glow.addColorStop(1,    'rgba(180,220,255,0)');
      ctx.beginPath();
      ctx.arc(headX, headY, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.restore();
    }
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (document.body.classList.contains('day')) {
      ctx.clearRect(0, 0, W, H);
      lastTime = ts;
      return;
    }
    const dt = lastTime == null ? 0 : ts - lastTime;
    lastTime = ts;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.update(dt);
      s.draw();
      if (s.done) s._init(false);
    }
  }

  function init() {
    resize();
    stars = Array.from({ length: 6 }, () => new ShootingStar(true));
    lastTime = null;
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Scroll animations
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    });
  }, { threshold: 0.1 });

  function watch(el, delay) {
    el.classList.add('anim-item');
    if (delay) el.style.setProperty('--anim-delay', delay + 'ms');
    observer.observe(el);
  }

  // Hero children stagger in on load
  document.querySelectorAll('.hero > *').forEach((el, i) => watch(el, i * 85));

  // Section cards slide up
  document.querySelectorAll('.section').forEach(el => watch(el));

  // Pills stagger within each group
  document.querySelectorAll('.pills').forEach(group => {
    group.querySelectorAll('.pill').forEach((el, i) => watch(el, i * 40));
  });

  // Experience project entries stagger
  document.querySelectorAll('.exp-project').forEach((el, i) => watch(el, i * 90));

  // Education timeline entries stagger
  document.querySelectorAll('.tl-entry').forEach((el, i) => watch(el, i * 80));

  // Contact links stagger
  document.querySelectorAll('.contact-link').forEach((el, i) => watch(el, i * 70));
})();

// Navigation toggle
(function () {
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
})();
