// ── Theme / time ────────────────────────────────────────────────────────
function getLisbonHour() {
  return +new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon', hour: 'numeric', hour12: false
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
  document.body.classList.toggle('day',   h >= 8 && h < 20);
  document.body.classList.toggle('night', !(h >= 8 && h < 20));
}
applyTimeOfDay();
setInterval(applyTimeOfDay, 60_000);
document.getElementById('theme-toggle').addEventListener('click', () => {
  localStorage.setItem('theme', document.body.classList.contains('day') ? 'dark' : 'light');
  applyTimeOfDay();
});

// ── Nav ──────────────────────────────────────────────────────────────────
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
    if (e.key === 'Escape') { menu.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.focus(); }
  });
})();

// ── Shooting stars ───────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars, lastTime;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  class ShootingStar {
    constructor(initial) { this._init(initial); }
    _init(initial) { this.waiting=true; this.elapsed=0; this.progress=0; this.done=false; this.delay=(initial?Math.random()*12:3+Math.random()*10)*1000; this._place(); }
    _place() { this.startX=W*(0.05+Math.random()*0.8); this.startY=H*(0.02+Math.random()*0.35); const deg=22+Math.random()*22; this.angle=deg*Math.PI/180; this.speed=380+Math.random()*420; this.maxTrail=70+Math.random()*160; this.lineWidth=1+Math.random()*1.4; const totalDist=this.maxTrail+Math.max(W,H)*0.25; this.totalDuration=totalDist/this.speed*1000; }
    update(dt) { if(this.done)return; if(this.waiting){this.elapsed+=dt; if(this.elapsed>=this.delay){this.waiting=false;this.elapsed=0;this._place();} return;} this.elapsed+=dt; this.progress=this.elapsed/this.totalDuration; if(this.progress>=1)this.done=true; }
    draw() { if(this.waiting||this.done)return; const dist=(this.elapsed/1000)*this.speed; const headX=this.startX+Math.cos(this.angle)*dist; const headY=this.startY+Math.sin(this.angle)*dist; const p=this.progress; const opacity=p<0.08?p/0.08:p>0.62?Math.max(0,1-(p-0.62)/0.38):1; if(opacity<0.01)return; const trailLen=Math.min(this.maxTrail,dist); const tailX=headX-Math.cos(this.angle)*trailLen; const tailY=headY-Math.sin(this.angle)*trailLen; const grad=ctx.createLinearGradient(tailX,tailY,headX,headY); grad.addColorStop(0,'rgba(200,225,255,0)'); grad.addColorStop(0.45,`rgba(210,232,255,${opacity*0.3})`); grad.addColorStop(0.8,`rgba(240,248,255,${opacity*0.72})`); grad.addColorStop(1,`rgba(255,255,255,${opacity})`); ctx.save(); ctx.beginPath(); ctx.moveTo(tailX,tailY); ctx.lineTo(headX,headY); ctx.strokeStyle=grad; ctx.lineWidth=this.lineWidth; ctx.lineCap='round'; ctx.stroke(); const r=3+this.lineWidth*1.5; const glow=ctx.createRadialGradient(headX,headY,0,headX,headY,r*3.5); glow.addColorStop(0,`rgba(255,255,255,${opacity})`); glow.addColorStop(0.35,`rgba(210,235,255,${opacity*0.55})`); glow.addColorStop(1,'rgba(180,220,255,0)'); ctx.beginPath(); ctx.arc(headX,headY,r*3.5,0,Math.PI*2); ctx.fillStyle=glow; ctx.fill(); ctx.restore(); }
  }
  function loop(ts) { requestAnimationFrame(loop); if(document.body.classList.contains('day')){ctx.clearRect(0,0,W,H);lastTime=ts;return;} const dt=lastTime==null?0:ts-lastTime; lastTime=ts; ctx.clearRect(0,0,W,H); for(const s of stars){s.update(dt);s.draw();if(s.done)s._init(false);} }
  function init() { resize(); stars=Array.from({length:6},()=>new ShootingStar(true)); lastTime=null; requestAnimationFrame(loop); }
  window.addEventListener('resize', resize);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

// ── IPMA constants ───────────────────────────────────────────────────────
const IPMA_BASE = 'https://api.ipma.pt/open-data';
const STORAGE_KEY = 'weather_default_city';
const DEFAULT_ID  = 1110600; // Lisboa
// Mainland Portugal only. If you want islands too, remove this filter.
const MAINLAND_REGION_ID = 1;

const DISTRICT_NAMES = {
  1:'Aveiro',2:'Beja',3:'Braga',4:'Bragança',5:'Castelo Branco',
  6:'Coimbra',7:'Évora',8:'Faro',9:'Guarda',10:'Leiria',
  11:'Lisboa',12:'Portalegre',13:'Porto',14:'Santarém',15:'Setúbal',
  16:'Viana do Castelo',17:'Vila Real',18:'Viseu',
  31:'Madeira',32:'Porto Santo',
  41:'Açores',42:'Açores',43:'Açores',44:'Açores',45:'Açores',
  46:'Açores',47:'Açores',48:'Açores',49:'Açores'
};

const WEATHER_DESC = {
  0:'No information',1:'Clear sky',2:'Partly cloudy',3:'Overcast',
  4:'High cloud',5:'Rain',6:'Light rain',7:'Showers',8:'Drizzle',
  9:'Thunderstorm',10:'Showers',11:'Heavy rain',12:'Intermittent rain',
  13:'Light showers',14:'Heavy showers',15:'Heavy rain/showers',
  19:'Thunderstorm',20:'Hail',21:'Frost',22:'Snow',
  23:'Rain & thunder',24:'Rain & snow',25:'Snow showers',
  26:'Snow showers',27:'Heavy snow',28:'Rain/snow mix',
  29:'Rain/snow',30:'Heavy snow showers',
};

const WIND_DESC = { 1:'Weak', 2:'Moderate', 3:'Strong', 4:'Very strong' };

// ── Weather icons (SVG strings) ──────────────────────────────────────────
const CLOUD  = 'M8,36 Q8,28 15,28 Q15,20 24,20 Q33,20 33,28 Q40,28 40,34 Q40,38 36,38 L12,38 Q8,38 8,36 Z';
const CLOUD2 = 'M5,38 Q5,30 12,30 Q12,22 22,22 Q32,22 32,30 Q40,30 40,36 Q40,42 35,42 L10,42 Q5,42 5,38 Z';

function weatherIcon(code) {
  const c = code;
  // Clear
  if (c === 1) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="10" fill="#FFD85A"/>
    <g stroke="#FFD85A" stroke-width="2.5" stroke-linecap="round">
      <line x1="24" y1="5"  x2="24" y2="10"/><line x1="24" y1="38" x2="24" y2="43"/>
      <line x1="5"  y1="24" x2="10" y2="24"/><line x1="38" y1="24" x2="43" y2="24"/>
      <line x1="9.5"  y1="9.5"  x2="13"   y2="13"/>  <line x1="35"   y1="35"   x2="38.5" y2="38.5"/>
      <line x1="38.5" y1="9.5"  x2="35"   y2="13"/>  <line x1="13"   y1="35"   x2="9.5"  y2="38.5"/>
    </g></svg>`;
  // Partly cloudy
  if (c === 2) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="33" cy="15" r="7" fill="#FFD85A"/>
    <g stroke="#FFD85A" stroke-width="2" stroke-linecap="round" opacity=".75">
      <line x1="33" y1="5"  x2="33" y2="8"/> <line x1="33" y1="22" x2="33" y2="25"/>
      <line x1="23" y1="15" x2="26" y2="15"/><line x1="40" y1="15" x2="43" y2="15"/>
      <line x1="25.9" y1="7.9" x2="28" y2="10"/><line x1="38" y1="20" x2="40.1" y2="22.1"/>
      <line x1="40.1" y1="7.9" x2="38"  y2="10"/><line x1="28"  y1="20" x2="25.9" y2="22.1"/>
    </g>
    <path d="M6,38 Q6,30 13,30 Q13,22 22,22 Q31,22 31,30 Q38,30 38,36 Q38,40 34,40 L10,40 Q6,40 6,38Z" fill="rgba(220,235,255,.82)"/>
  </svg>`;
  // Overcast / high cloud
  if (c === 3 || c === 4) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,30 Q10,23 17,23 Q17,16 26,16 Q35,16 35,23 Q42,23 42,29 Q42,33 38,33 L14,33 Q10,33 10,30Z" fill="rgba(200,218,245,.5)"/>
    <path d="M5,40 Q5,33 12,33 Q12,26 21,26 Q30,26 30,33 Q37,33 37,39 Q37,43 33,43 L9,43 Q5,43 5,40Z" fill="rgba(218,232,252,.78)"/>
  </svg>`;
  // Drizzle
  if (c === 8) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD}" fill="rgba(218,232,252,.78)"/>
    <g stroke="#90C5F8" stroke-width="2" stroke-linecap="round">
      <line x1="16" y1="41" x2="15" y2="46"/><line x1="24" y1="41" x2="23" y2="46"/><line x1="32" y1="41" x2="31" y2="46"/>
    </g></svg>`;
  // Light rain / light showers
  if (c === 6 || c === 13) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD}" fill="rgba(218,232,252,.78)"/>
    <g stroke="#90C5F8" stroke-width="2.2" stroke-linecap="round">
      <line x1="13" y1="41" x2="11" y2="46"/><line x1="20" y1="41" x2="18" y2="46"/>
      <line x1="27" y1="41" x2="25" y2="46"/><line x1="34" y1="41" x2="32" y2="46"/>
    </g></svg>`;
  // Rain / showers / intermittent rain
  if (c === 5 || c === 7 || c === 10 || c === 12) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD}" fill="rgba(195,218,248,.80)"/>
    <g stroke="#6EB5F6" stroke-width="2.4" stroke-linecap="round">
      <line x1="12" y1="40" x2="10" y2="46"/><line x1="19" y1="40" x2="17" y2="46"/>
      <line x1="26" y1="40" x2="24" y2="46"/><line x1="33" y1="40" x2="31" y2="46"/>
      <line x1="15" y1="44" x2="13" y2="48"/><line x1="29" y1="44" x2="27" y2="48"/>
    </g></svg>`;
  // Heavy rain
  if (c === 11 || c === 14 || c === 15) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD2}" fill="rgba(165,195,230,.80)"/>
    <g stroke="#5AABF5" stroke-width="2.6" stroke-linecap="round">
      <line x1="10" y1="44" x2="8"  y2="50"/><line x1="17" y1="44" x2="15" y2="50"/>
      <line x1="24" y1="44" x2="22" y2="50"/><line x1="31" y1="44" x2="29" y2="50"/>
      <line x1="38" y1="44" x2="36" y2="50"/>
    </g></svg>`;
  // Thunderstorm
  if (c === 9 || c === 19 || c === 23) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD2}" fill="rgba(155,180,210,.78)"/>
    <path d="M25,42 L20,50 L26,50 L21,58" stroke="#FFE566" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
  // Hail
  if (c === 20) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD}" fill="rgba(218,232,252,.78)"/>
    <circle cx="14" cy="43" r="2.5" fill="rgba(160,210,255,.85)"/>
    <circle cx="22" cy="46" r="2.5" fill="rgba(160,210,255,.85)"/>
    <circle cx="30" cy="43" r="2.5" fill="rgba(160,210,255,.85)"/>
    <circle cx="38" cy="46" r="2.5" fill="rgba(160,210,255,.85)"/>
  </svg>`;
  // Frost
  if (c === 21) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#C8E0FF" stroke-width="2.2" stroke-linecap="round">
      <line x1="24" y1="6" x2="24" y2="42"/><line x1="6" y1="24" x2="42" y2="24"/>
      <line x1="10.1" y1="10.1" x2="37.9" y2="37.9"/><line x1="37.9" y1="10.1" x2="10.1" y2="37.9"/>
      <line x1="24" y1="12" x2="19" y2="8"/><line x1="24" y1="12" x2="29" y2="8"/>
      <line x1="24" y1="36" x2="19" y2="40"/><line x1="24" y1="36" x2="29" y2="40"/>
      <line x1="12" y1="24" x2="8" y2="19"/><line x1="12" y1="24" x2="8" y2="29"/>
      <line x1="36" y1="24" x2="40" y2="19"/><line x1="36" y1="24" x2="40" y2="29"/>
    </g></svg>`;
  // Snow (all snow-related codes)
  if ([22,24,25,26,27,28,29,30].includes(c)) return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="${CLOUD}" fill="rgba(218,232,252,.78)"/>
    <g stroke="#C8E0FF" stroke-width="2" stroke-linecap="round">
      <line x1="14" y1="40" x2="14" y2="46"/><line x1="11" y1="43" x2="17" y2="43"/>
      <line x1="24" y1="40" x2="24" y2="46"/><line x1="21" y1="43" x2="27" y2="43"/>
      <line x1="34" y1="40" x2="34" y2="46"/><line x1="31" y1="43" x2="37" y2="43"/>
    </g></svg>`;
  // Unknown / no information
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="18" stroke="rgba(247,248,252,.25)" stroke-width="2"/>
    <path d="M18 18a6 6 0 0 1 12 0c0 4-6 5-6 9" stroke="rgba(247,248,252,.4)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <circle cx="24" cy="34" r="1.5" fill="rgba(247,248,252,.4)"/>
  </svg>`;
}

// ── Warning type icon ────────────────────────────────────────────────────
function warningTypeIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('wind')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`;
  if (t.includes('rain') || t.includes('precipitation')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/></svg>`;
  if (t.includes('snow') || t.includes('ice') || t.includes('frost')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  if (t.includes('thunder') || t.includes('storm')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>`;
  if (t.includes('temperature') || t.includes('heat') || t.includes('cold')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`;
  if (t.includes('coast') || t.includes('sea') || t.includes('wave')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0"/><path d="M2 17c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0"/><path d="M2 7c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0"/></svg>`;
  // Generic warning
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function nearestCity(lat, lon, locations) {
  return locations.reduce((best, loc) => {
    const d = haversineKm(lat, lon, +loc.latitude, +loc.longitude);
    return d < best.dist ? { loc, dist: d } : best;
  }, { loc: null, dist: Infinity }).loc;
}
function regionLabel(loc) {
  const d = DISTRICT_NAMES[loc.idDistrito] || 'Portugal';
  return d === loc.local ? 'Portugal' : `${d} · Portugal`;
}
function dayLabel(dateStr, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-GB', { weekday: 'short' });
}
function shortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtWarningTime(str) {
  if (!str) return '—';
  const d = new Date(str.replace(' ', 'T'));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
       + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function showError(container, msg, retryFn) {
  const div = document.createElement('div');
  div.className = 'api-error';
  div.innerHTML = `<p class="error-msg">${esc(msg)}</p><button class="btn-retry">Try again</button>`;
  div.querySelector('.btn-retry').addEventListener('click', retryFn);
  container.innerHTML = '';
  container.appendChild(div);
}

// ── State ────────────────────────────────────────────────────────────────
let allLocations = [];
let currentCity  = null;

// ── Location UI ──────────────────────────────────────────────────────────
function populateCityList(filter = '') {
  const list = document.getElementById('city-list');
  const q = filter.toLowerCase().trim();

  const filtered = q
    ? allLocations.filter(l =>
        l.local.toLowerCase().includes(q) ||
        (DISTRICT_NAMES[l.idDistrito] || '').toLowerCase().includes(q)
      )
    : allLocations;

  if (filtered.length === 0) {
    list.innerHTML = `<li class="city-no-results">No cities match "${esc(filter)}"</li>`;
    return;
  }

  list.innerHTML = filtered.map(l => {
    const isCurrent = currentCity && l.globalIdLocal === currentCity.globalIdLocal;
    return `<li class="city-list-item${isCurrent ? ' selected' : ''}"
      role="option" aria-selected="${isCurrent}"
      data-id="${l.globalIdLocal}">
      <span>${esc(l.local)}</span>
      <span class="city-item-district">${esc(DISTRICT_NAMES[l.idDistrito] || '')}</span>
    </li>`;
  }).join('');

  list.querySelectorAll('.city-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = +item.dataset.id;
      const loc = allLocations.find(l => l.globalIdLocal === id);
      if (loc) selectCity(loc);
      closePicker();
    });
  });
}

function openPicker() {
  const picker = document.getElementById('city-picker');
  const btn    = document.getElementById('change-city-btn');
  picker.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  document.getElementById('city-search').focus();
  populateCityList();
}
function closePicker() {
  const picker = document.getElementById('city-picker');
  const btn    = document.getElementById('change-city-btn');
  picker.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
  document.getElementById('city-search').value = '';
}

function updateLocationDisplay(loc) {
  document.getElementById('city-name').textContent = loc.local;
  document.getElementById('city-region').textContent = regionLabel(loc);
  document.getElementById('forecast-city-name').textContent = loc.local;

  const savedId = localStorage.getItem(STORAGE_KEY);
  const isDefault = savedId === String(loc.globalIdLocal);
  const btn = document.getElementById('set-default-btn');
  btn.textContent = isDefault ? 'Default city' : 'Set as default';
  btn.classList.toggle('is-default', isDefault);
  btn.disabled = isDefault;

  const warningsArea = document.getElementById('warnings-area');
  warningsArea.textContent = `Warning area: ${DISTRICT_NAMES[loc.idDistrito] || loc.local}`;
}

async function selectCity(loc) {
  currentCity = loc;
  updateLocationDisplay(loc);
  await Promise.all([
    loadForecast(loc.globalIdLocal),
    loadWarnings(loc.idAreaAviso)
  ]);
}

// ── Forecast ─────────────────────────────────────────────────────────────
function forecastSkeleton() {
  return `<div class="sk-forecast-grid" aria-hidden="true">${Array(5).fill('<div class="sk sk-forecast-card"></div>').join('')}</div>`;
}

async function loadForecast(globalIdLocal) {
  const grid = document.getElementById('forecast-grid');
  grid.innerHTML = forecastSkeleton();
  try {
    const res  = await fetch(`${IPMA_BASE}/forecast/meteorology/cities/daily/${globalIdLocal}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderForecast(data.data.slice(0, 5), grid);
  } catch (err) {
    showError(grid, `Could not load forecast — ${err.message}`, () => loadForecast(globalIdLocal));
  }
}

function renderForecast(days, grid) {
  grid.innerHTML = days.map((d, i) => {
    const isToday = i === 0;
    const code    = d.idWeatherType;
    const tMax    = d.tMax != null ? `${Math.round(+d.tMax)}°` : '—';
    const tMin    = d.tMin != null ? `${Math.round(+d.tMin)}°` : '—';
    const rain    = d.precipitaProb != null ? `${Math.round(+d.precipitaProb)}%` : '—';
    const rainHigh = d.precipitaProb && +d.precipitaProb >= 50;
    const wind    = d.classWindSpeed;
    const windTxt = WIND_DESC[wind] || '—';
    const windCls = (wind >= 3) ? `wind-${wind}` : '';
    const dir     = d.predWindDir || '';
    const desc    = WEATHER_DESC[code] || 'Unknown';
    return `<div class="forecast-card${isToday ? ' today' : ''}">
      <span class="forecast-day">${esc(dayLabel(d.forecastDate, i))}</span>
      <span class="forecast-date">${esc(shortDate(d.forecastDate))}</span>
      <span class="forecast-icon" aria-label="${esc(desc)}">${weatherIcon(code)}</span>
      <span class="forecast-desc">${esc(desc)}</span>
      <div class="forecast-temps">
        <span class="temp-max">${esc(tMax)}</span>
        <span class="temp-min">${esc(tMin)}</span>
      </div>
      <div class="forecast-meta">
        <div class="meta-row">
          <span class="meta-label">Rain</span>
          <span class="meta-value${rainHigh ? ' rain-high' : ''}">${esc(rain)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Wind</span>
          <span class="meta-value ${esc(windCls)}">${esc(windTxt)}${dir ? ` ${esc(dir)}` : ''}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Warnings ─────────────────────────────────────────────────────────────
function warningSkeleton() {
  return `<div class="sk-warning-list" aria-hidden="true">${Array(2).fill('<div class="sk sk-warning-card"></div>').join('')}</div>`;
}

async function loadWarnings(idAreaAviso) {
  const el = document.getElementById('warnings-content');
  el.innerHTML = warningSkeleton();
  try {
    // Primary: global warnings feed, filter by area
    const res  = await fetch(`${IPMA_BASE}/forecast/warnings/warnings_www.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const now  = new Date();
    const active = Array.isArray(data)
      ? data.filter(w => w.idAreaAviso === idAreaAviso && new Date(w.endTime.replace(' ','T')) > now)
      : [];
    renderWarnings(active, el, idAreaAviso);
  } catch (_) {
    // Fallback: per-area endpoint
    try {
      const res2  = await fetch(`${IPMA_BASE}/districts-islands-warnings/${idAreaAviso}.json`);
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      const data2 = await res2.json();
      const now   = new Date();
      const active = Array.isArray(data2)
        ? data2.filter(w => new Date((w.endTime || '').replace(' ','T')) > now)
        : [];
      renderWarnings(active, el, idAreaAviso);
    } catch (err2) {
      showError(el, `Could not load warnings — ${err2.message}`, () => loadWarnings(idAreaAviso));
    }
  }
}

function renderWarnings(warnings, el, idAreaAviso) {
  const SHOWN_LEVELS = new Set(['red', 'orange', 'yellow']);
  warnings = warnings.filter(w => SHOWN_LEVELS.has((w.awarenessLevelID || '').toLowerCase()));

  if (warnings.length === 0) {
    el.innerHTML = `<div class="no-warnings">
      <div class="no-warnings-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <div>
        <p class="no-warnings-text"><strong>No active warnings</strong>No meteorological warnings for zone ${esc(idAreaAviso)} at this time.</p>
      </div>
    </div>`;
    return;
  }

  // Sort by level severity: red > orange > yellow
  const order = { red: 0, orange: 1, yellow: 2 };
  warnings.sort((a, b) => (order[a.awarenessLevelID] ?? 9) - (order[b.awarenessLevelID] ?? 9));

  el.innerHTML = `<div class="warnings-list">${warnings.map(w => warningCardHTML(w)).join('')}</div>`;
}

function warningCardHTML(w) {
  const level = (w.awarenessLevelID || 'yellow').toLowerCase();
  const type  = w.awarenessTypeName || 'Weather Warning';
  const text  = w.text || '';
  const start = fmtWarningTime(w.startTime);
  const end   = fmtWarningTime(w.endTime);
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  return `<div class="warning-card level-${esc(level)}">
    <div class="warning-type-icon" aria-hidden="true">${warningTypeIcon(type)}</div>
    <div class="warning-body">
      <span class="warning-type">${esc(type)}</span>
      ${text ? `<p class="warning-text">${esc(text)}</p>` : ''}
      <div class="warning-time">
        <span>${esc(start)}</span>
        <span class="warning-time-sep" aria-hidden="true">&#8594;</span>
        <span>${esc(end)}</span>
      </div>
    </div>
    <span class="warning-badge">${esc(levelLabel)}</span>
  </div>`;
}

// ── Init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${IPMA_BASE}/distrits-islands.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    allLocations = Array.isArray(payload.data) ? payload.data : [];

    allLocations = allLocations
      .filter(loc => loc.idRegiao === MAINLAND_REGION_ID)
      .sort((a, b) => a.local.localeCompare(b.local, 'pt'));
  } catch (e) {
    console.error('Failed to load IPMA locations', e);
    showError(
      document.getElementById('forecast-grid'),
      'Could not load city list from IPMA.',
      () => window.location.reload()
    );
    return;
  }

  const savedId = localStorage.getItem(STORAGE_KEY);
  let startCity = allLocations.find(l => l.globalIdLocal === +(savedId || DEFAULT_ID))
               || allLocations.find(l => l.globalIdLocal === DEFAULT_ID);

  if (!savedId && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const nearest = nearestCity(pos.coords.latitude, pos.coords.longitude, allLocations);
        if (nearest) selectCity(nearest);
      },
      () => { /* denied — keep default */ },
      { timeout: 5000, maximumAge: 300_000 }
    );
  }

  await selectCity(startCity);

  const changeCityBtn = document.getElementById('change-city-btn');
  changeCityBtn.addEventListener('click', e => {
    e.stopPropagation();
    const picker = document.getElementById('city-picker');
    picker.hidden ? openPicker() : closePicker();
  });

  document.addEventListener('click', e => {
    const picker = document.getElementById('city-picker');
    const section = document.querySelector('.location-section');
    if (!picker.hidden && !section.contains(e.target)) closePicker();
  });

  document.getElementById('city-search').addEventListener('input', e => {
    populateCityList(e.target.value);
  });

  document.getElementById('city-search').addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePicker();
      document.getElementById('change-city-btn').focus();
    }
  });

  document.getElementById('set-default-btn').addEventListener('click', () => {
    if (!currentCity) return;
    localStorage.setItem(STORAGE_KEY, String(currentCity.globalIdLocal));
    updateLocationDisplay(currentCity);
  });
});
