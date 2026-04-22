// ── Time / theme ────────────────────────────────────────────────────────
function getLisbonHour() {
  return +new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon',
    hour: 'numeric',
    hour12: false
  }).format(new Date());
}

function applyTimeOfDay() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.body.classList.toggle('day',   saved === 'light');
    document.body.classList.toggle('night', saved === 'dark');
    return;
  }
  const h = getLisbonHour();
  const isDay = h >= 8 && h < 20;
  document.body.classList.toggle('day',   isDay);
  document.body.classList.toggle('night', !isDay);
}

applyTimeOfDay();
setInterval(applyTimeOfDay, 60_000);

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isLight = document.body.classList.contains('day');
  localStorage.setItem('theme', isLight ? 'dark' : 'light');
  applyTimeOfDay();
});

// ── Navigation ──────────────────────────────────────────────────────────
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

// ── Shooting stars ──────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars, lastTime;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class ShootingStar {
    constructor(initial) { this._init(initial); }
    _init(initial) {
      this.waiting = true; this.elapsed = 0; this.progress = 0; this.done = false;
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
        if (this.elapsed >= this.delay) { this.waiting = false; this.elapsed = 0; this._place(); }
        return;
      }
      this.elapsed += dt;
      this.progress = this.elapsed / this.totalDuration;
      if (this.progress >= 1) this.done = true;
    }
    draw() {
      if (this.waiting || this.done) return;
      const dist  = (this.elapsed / 1000) * this.speed;
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
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(headX, headY);
      ctx.strokeStyle = grad; ctx.lineWidth = this.lineWidth; ctx.lineCap = 'round';
      ctx.stroke();
      const r = 3 + this.lineWidth * 1.5;
      const glow = ctx.createRadialGradient(headX, headY, 0, headX, headY, r * 3.5);
      glow.addColorStop(0,    `rgba(255,255,255,${opacity})`);
      glow.addColorStop(0.35, `rgba(210,235,255,${opacity * 0.55})`);
      glow.addColorStop(1,    'rgba(180,220,255,0)');
      ctx.beginPath(); ctx.arc(headX, headY, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill(); ctx.restore();
    }
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (document.body.classList.contains('day')) { ctx.clearRect(0, 0, W, H); lastTime = ts; return; }
    const dt = lastTime == null ? 0 : ts - lastTime;
    lastTime = ts;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) { s.update(dt); s.draw(); if (s.done) s._init(false); }
  }

  function init() {
    resize();
    stars = Array.from({ length: 6 }, () => new ShootingStar(true));
    lastTime = null;
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// ── NASA helpers ────────────────────────────────────────────────────────
const API_KEY   = (window.NASA_CONFIG && window.NASA_CONFIG.apiKey) || 'DEMO_KEY';
const NASA_BASE = 'https://api.nasa.gov';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtNum(val) {
  return (+val).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDist(km) {
  const n = +km;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M km`;
  return `${fmtNum(n)} km`;
}

function fmtSize(minKm, maxKm) {
  if (maxKm >= 1) return `${(+minKm).toFixed(2)} – ${(+maxKm).toFixed(2)} km`;
  return `${Math.round(minKm * 1000)} – ${Math.round(maxKm * 1000)} m`;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanAsteroidName(raw) {
  return raw
    .replace(/^\(\d+\)\s*/, '')
    .replace(/^\d+\s+/, '')
    .replace(/[()]/g, '')
    .trim() || raw;
}

// ── APOD ────────────────────────────────────────────────────────────────
function apodSkeletonHTML() {
  return `<div class="skeleton-apod" aria-hidden="true">
    <div class="sk sk-img"></div>
    <div class="sk-body">
      <div class="sk sk-title"></div>
      <div class="sk sk-line"></div>
      <div class="sk sk-line sk-short"></div>
      <div class="sk sk-line"></div>
      <div class="sk sk-line sk-short"></div>
    </div>
  </div>`;
}

function showError(container, message, retryFn) {
  const div = document.createElement('div');
  div.className = 'api-error';
  div.innerHTML = `<p class="error-msg">${esc(message)}</p><button class="btn-retry">Try again</button>`;
  div.querySelector('.btn-retry').addEventListener('click', retryFn);
  container.innerHTML = '';
  container.appendChild(div);
}

async function loadAPOD(date) {
  const wrap = document.getElementById('apod-content');
  wrap.innerHTML = apodSkeletonHTML();

  try {
    const res = await fetch(`${NASA_BASE}/planetary/apod?api_key=${API_KEY}&date=${date}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.msg || body.error?.message || `HTTP ${res.status}`);
    wrap.innerHTML = '';
    wrap.appendChild(renderAPOD(body));
  } catch (err) {
    showError(wrap, `Could not load picture — ${err.message}`, () => loadAPOD(date));
  }
}

function renderAPOD(data) {
  const card = document.createElement('div');
  card.className = 'apod-card';

  let mediaHTML;
  if (data.media_type === 'video') {
    mediaHTML = `<div class="apod-video-wrap">
      <iframe src="${esc(data.url)}" title="${esc(data.title)}"
        allow="fullscreen" allowfullscreen loading="lazy"></iframe>
    </div>`;
  } else {
    const src = data.hdurl || data.url;
    mediaHTML = `<a href="${esc(src)}" target="_blank" rel="noopener noreferrer" class="apod-img-link">
      <img class="apod-img" src="${esc(src)}" alt="${esc(data.title)}" loading="lazy">
      <span class="apod-img-hint">Open full resolution</span>
    </a>`;
  }

  const apodDate = new Date(data.date + 'T00:00:00')
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const credit = data.copyright
    ? `<span class="apod-credit">&#169; ${esc(data.copyright.trim().replace(/\s+/g, ' '))}</span>`
    : '';

  card.innerHTML = `
    ${mediaHTML}
    <div class="apod-info">
      <div class="apod-meta">
        <time class="apod-date" datetime="${esc(data.date)}">${apodDate}</time>
        ${credit}
      </div>
      <h3 class="apod-title">${esc(data.title)}</h3>
      <p class="apod-explanation">${esc(data.explanation)}</p>
    </div>`;
  return card;
}

// ── Asteroids NeoWs ─────────────────────────────────────────────────────
function neoSkeletonHTML() {
  return Array(6).fill(0).map(() => `
    <div class="sk-card" aria-hidden="true">
      <div class="sk sk-title"></div>
      <div class="sk sk-line sk-short"></div>
      <div class="sk-stats">
        <div class="sk sk-stat"></div>
        <div class="sk sk-stat"></div>
        <div class="sk sk-stat"></div>
      </div>
    </div>`).join('');
}

async function loadAsteroids(start, end) {
  const grid    = document.getElementById('neo-grid');
  const summary = document.getElementById('neo-summary');
  grid.innerHTML = neoSkeletonHTML();
  summary.innerHTML = '';

  try {
    const url = `${NASA_BASE}/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${API_KEY}`;
    const res  = await fetch(url);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error_message || body.near_earth_objects?.error || `HTTP ${res.status}`);
    renderAsteroids(body, grid, summary);
  } catch (err) {
    summary.innerHTML = '';
    showError(grid, `Could not load asteroid data — ${err.message}`, () => loadAsteroids(start, end));
  }
}

function renderAsteroids(data, grid, summaryEl) {
  const all = Object.values(data.near_earth_objects).flat();
  const hazardCount = all.filter(a => a.is_potentially_hazardous_asteroid).length;

  summaryEl.innerHTML = `<div class="neo-summary-bar">
    <div class="ns-stat">
      <span class="ns-num">${esc(String(data.element_count))}</span>
      <span class="ns-label">asteroids found</span>
    </div>
    <div class="ns-divider" aria-hidden="true"></div>
    <div class="ns-stat${hazardCount > 0 ? ' ns-hazard' : ''}">
      <span class="ns-num">${hazardCount}</span>
      <span class="ns-label">potentially hazardous</span>
    </div>
  </div>`;

  if (all.length === 0) {
    grid.innerHTML = '<p class="no-results">No asteroids found for this date range.</p>';
    return;
  }

  all.sort((a, b) => {
    const da = a.close_approach_data[0]?.close_approach_date || '';
    const db = b.close_approach_data[0]?.close_approach_date || '';
    return da.localeCompare(db);
  });

  grid.innerHTML = all.map(a => asteroidCardHTML(a)).join('');
}

function asteroidCardHTML(a) {
  const approach  = a.close_approach_data[0] || {};
  const dia       = a.estimated_diameter.kilometers;
  const hazardous = a.is_potentially_hazardous_asteroid;
  const name      = esc(cleanAsteroidName(a.name));
  const size      = esc(fmtSize(dia.estimated_diameter_min, dia.estimated_diameter_max));
  const vel       = esc(`${fmtNum(approach.relative_velocity?.kilometers_per_hour || 0)} km/h`);
  const dist      = esc(fmtDist(approach.miss_distance?.kilometers || 0));
  const date      = approach.close_approach_date ? esc(fmtDate(approach.close_approach_date)) : '—';
  const badge     = hazardous
    ? '<span class="badge-hazard">Hazardous</span>'
    : '<span class="badge-safe">Safe</span>';

  return `<div class="asteroid-card${hazardous ? ' hazardous' : ''}">
    <div class="asteroid-top">
      <h3 class="asteroid-name" title="${esc(a.name)}">${name}</h3>
      ${badge}
    </div>
    <p class="asteroid-approach">Closest approach &mdash; <strong>${date}</strong></p>
    <div class="asteroid-stats">
      <div class="astat"><span class="astat-val">${size}</span><span class="astat-key">Diameter</span></div>
      <div class="astat"><span class="astat-val">${vel}</span><span class="astat-key">Velocity</span></div>
      <div class="astat"><span class="astat-val">${dist}</span><span class="astat-key">Miss dist.</span></div>
    </div>
  </div>`;
}

// ── Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const t = todayStr();

  // APOD setup
  const apodDate = document.getElementById('apod-date');
  apodDate.value = t;
  apodDate.max   = t;
  apodDate.min   = '1995-06-16';
  loadAPOD(t);
  apodDate.addEventListener('change', () => { if (apodDate.value) loadAPOD(apodDate.value); });

  // Asteroids setup
  const neoStart  = document.getElementById('neo-start');
  const neoEnd    = document.getElementById('neo-end');
  const neoErr    = document.getElementById('neo-date-error');
  const neoSearch = document.getElementById('neo-search');

  neoStart.value = t;
  neoEnd.value   = addDays(t, 7);
  loadAsteroids(t, addDays(t, 7));

  neoSearch.addEventListener('click', () => {
    neoErr.hidden = true;
    neoErr.textContent = '';
    const s = neoStart.value;
    const e = neoEnd.value;

    if (!s || !e) {
      neoErr.textContent = 'Please select both dates.';
      neoErr.hidden = false;
      return;
    }
    const diffDays = (new Date(e + 'T00:00:00') - new Date(s + 'T00:00:00')) / 86_400_000;
    if (diffDays < 0) {
      neoErr.textContent = 'End date must be on or after start date.';
      neoErr.hidden = false;
      return;
    }
    if (diffDays > 7) {
      neoErr.textContent = 'Date range cannot exceed 7 days (NASA API limit).';
      neoErr.hidden = false;
      return;
    }
    loadAsteroids(s, e);
  });
});
