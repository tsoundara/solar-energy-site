// ════════════════════════════════════
// SCROLL REVEAL + ACTIVE NAV
// ════════════════════════════════════
const sections  = ['hero','sunlight','cells','inverter','storage','grid'];
const sideLinks = document.querySelectorAll('.side-link');

const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.chapter').forEach(s => revObs.observe(s));

function updateNav() {
  let cur = sections[0];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 240) cur = id;
  });
  sideLinks.forEach(a => a.classList.toggle('active', a.dataset.section === cur));
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ════════════════════════════════════
// PHOTON RAIN — CLOUD AT MIDPOINT
// ════════════════════════════════════
(function () {
  const stage        = document.getElementById('photonStage');
  const canvas       = document.getElementById('photonCanvas');
  const cloudSVG     = document.getElementById('cloudLayer');
  const slider       = document.getElementById('cloudSlider');
  const cloudVal     = document.getElementById('cloudVal');
  const pStatCloud   = document.getElementById('pStatCloud');
  const pStatPhotons = document.getElementById('pStatPhotons');
  const pStatOutput  = document.getElementById('pStatOutput');
  const pStatCond    = document.getElementById('pStatCond');
  const pPowerFill   = document.getElementById('pPowerFill');
  const noteEl       = document.getElementById('photonNote');
  if (!stage) return;

  const ctx = canvas.getContext('2d');
  let cloudCover = 0;
  let photons = [];

  const lightImg = new Image();
  lightImg.src = 'visuals/light.svg';

  const CLOUD_ZONE = 0.5; // midpoint of stage

  // Panel hit zone — wide band covering the bottom ~30% of the canvas.
  // We intentionally use a generous range so photons don't slip through
  // regardless of CSS perspective offset.
  const PANEL_HIT_START = 0.68; // photon enters panel zone here
  const PANEL_HIT_END   = 0.96; // catches everything above ground
  const NUM_PANELS      = 3;
  const CELLS_PER_ROW   = 4;
  const CELLS_PER_COL   = 6;

  // Fixed cloud positions — evenly distributed, no erratic shuffling
  // Each cloud is a cluster of overlapping ellipses for a natural puff shape
  const CLOUD_PUFFS = [
    // [cx, cy, rx, ry] — all as fractions of W/H
    // cluster 1 — left
    { cx:0.04, cy:0.50, rx:0.07, ry:0.04 },
    { cx:0.10, cy:0.48, rx:0.09, ry:0.05 },
    { cx:0.17, cy:0.51, rx:0.08, ry:0.045 },
    { cx:0.13, cy:0.46, rx:0.06, ry:0.038 },
    // cluster 2 — left-centre
    { cx:0.26, cy:0.49, rx:0.08, ry:0.044 },
    { cx:0.33, cy:0.47, rx:0.10, ry:0.055 },
    { cx:0.40, cy:0.50, rx:0.08, ry:0.042 },
    { cx:0.36, cy:0.45, rx:0.06, ry:0.036 },
    // cluster 3 — centre
    { cx:0.48, cy:0.51, rx:0.09, ry:0.050 },
    { cx:0.55, cy:0.48, rx:0.10, ry:0.056 },
    { cx:0.62, cy:0.51, rx:0.08, ry:0.044 },
    { cx:0.57, cy:0.45, rx:0.06, ry:0.036 },
    // cluster 4 — right-centre
    { cx:0.70, cy:0.49, rx:0.08, ry:0.044 },
    { cx:0.77, cy:0.47, rx:0.09, ry:0.050 },
    { cx:0.83, cy:0.50, rx:0.07, ry:0.040 },
    { cx:0.78, cy:0.45, rx:0.06, ry:0.034 },
    // cluster 5 — right edge (fills gap near 100%)
    { cx:0.89, cy:0.50, rx:0.07, ry:0.042 },
    { cx:0.95, cy:0.48, rx:0.07, ry:0.040 },
    { cx:0.92, cy:0.45, rx:0.05, ry:0.032 },
    { cx:0.99, cy:0.51, rx:0.05, ry:0.035 },
  ];

  function drawClouds(W, H, cover) {
    cloudSVG.setAttribute('width',  W);
    cloudSVG.setAttribute('height', H);
    cloudSVG.style.width  = W + 'px';
    cloudSVG.style.height = H + 'px';
    cloudSVG.innerHTML = '';
    if (cover === 0) return;

    const visible = Math.max(1, Math.round(cover / 100 * CLOUD_PUFFS.length));
    const opacity = 0.38 + (cover / 100) * 0.45;

    for (let i = 0; i < visible; i++) {
      const c = CLOUD_PUFFS[i];
      const imgW = c.rx * W * 2.2;
      const imgH = imgW * 0.55;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      el.setAttribute('href', 'visuals/cloud.svg');
      el.setAttribute('x', c.cx * W - imgW / 2);
      el.setAttribute('y', c.cy * H - imgH / 2);
      el.setAttribute('width',  imgW);
      el.setAttribute('height', imgH);
      el.setAttribute('opacity', opacity);
      cloudSVG.appendChild(el);
    }
  }

  function spawnPhoton(W) {
    return {
      x: Math.random() * W,
      y: -8,
      vy: 3.5 + Math.random() * 2.5,   // faster fall so they don't pile up
      vx: (Math.random() - 0.5) * 0.8,
      r: 2 + Math.random() * 1.5,
      alpha: 0.85 + Math.random() * 0.15,
      blocked: Math.random() < (cloudCover / 100)
    };
  }

  // Flash a random cell on one of the 3 panel faces
  function flashCell(panelIdx) {
    const pid = panelIdx !== undefined ? panelIdx : Math.floor(Math.random() * NUM_PANELS);
    const cellIdx = Math.floor(Math.random() * (CELLS_PER_ROW * CELLS_PER_COL));
    const cellId = `pc${pid}_${cellIdx}`;
    const cell = document.getElementById(cellId);
    if (cell) {
      cell.classList.add('flash');
      setTimeout(() => cell.classList.remove('flash'), 200);
    }
  }

  function tick() {
    const W = canvas.width  = stage.offsetWidth;
    const H = canvas.height = stage.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#070B14');
    sky.addColorStop(CLOUD_ZONE - 0.05, '#0C1420');
    sky.addColorStop(1, '#09100F');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Sun glow
    const sunG = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, W * 0.45);
    sunG.addColorStop(0, 'rgba(232,200,74,0.14)');
    sunG.addColorStop(1, 'rgba(232,200,74,0)');
    ctx.fillStyle = sunG; ctx.fillRect(0, 0, W, H);

    const cloudY = H * CLOUD_ZONE;

    // Always spawn at full rate — cloud cover only affects whether they get through
    photons.push(spawnPhoton(W));
    if (Math.random() < 0.4) photons.push(spawnPhoton(W)); // occasional double spawn for density

    // Update + draw photons
    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      p.x += p.vx;
      p.y += p.vy;

      // Remove blocked photons at cloud layer
      if (p.blocked && p.y >= cloudY) {
        photons.splice(i, 1);
        continue;
      }

      // Hit detection: generous band at bottom of canvas.
      // Any unblocked photon entering this zone hits a panel cell.
      if (!p.blocked && p.y >= H * PANEL_HIT_START) {
        // Pick which panel based on x position (full width, no gaps between)
        const pi      = Math.min(NUM_PANELS - 1, Math.floor(p.x / W * NUM_PANELS));
        const cellCol = Math.min(CELLS_PER_ROW - 1, Math.floor((p.x / W * NUM_PANELS - pi) * CELLS_PER_ROW));
        const cellRow = Math.min(CELLS_PER_COL - 1, Math.floor(Math.random() * CELLS_PER_COL));
        const cellIdx = cellRow * CELLS_PER_ROW + cellCol;
        const cellEl  = document.getElementById(`pc${pi}_${cellIdx}`);
        if (cellEl) {
          cellEl.classList.add('flash');
          setTimeout(() => cellEl.classList.remove('flash'), 200);
        }
        photons.splice(i, 1);
        continue;
      }

      // Off screen
      if (p.y > H + 10 || p.x < -10 || p.x > W + 10) {
        photons.splice(i, 1);
        continue;
      }

      // Draw photon as light.svg icon
      const size = p.r * 7;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (lightImg.complete && lightImg.naturalWidth) {
        ctx.drawImage(lightImg, p.x - size / 2, p.y - size / 2, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,140,${p.alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }

    if (photons.length > 400) photons.splice(0, photons.length - 400);
    requestAnimationFrame(tick);
  }

  function update(val) {
    cloudCover = +val;
    const pass = Math.max(0, 1 - cloudCover / 100);
    const pct  = Math.round(pass * 100);
    cloudVal.textContent     = cloudCover + '%';
    pStatCloud.textContent   = cloudCover + '%';
    pStatPhotons.textContent = pct + '%';
    pStatOutput.textContent  = pct + '%';
    pPowerFill.style.width   = pct + '%';
    pPowerFill.style.background = pct > 60 ? 'var(--yellow)' : pct > 25 ? '#C8A030' : 'var(--gray)';
    [pStatPhotons, pStatOutput, pStatCond].forEach(el => el.classList.toggle('low', cloudCover > 60));

    let cond, note;
    if      (cloudCover === 0)  { cond = 'Clear';         note = 'Full sun — photons travel unobstructed and hit panels across the full array.'; }
    else if (cloudCover <= 25)  { cond = 'Mostly Clear';  note = 'Light cloud at the midpoint. Most photons break through — output stays strong.'; }
    else if (cloudCover <= 50)  { cond = 'Partly Cloudy'; note = 'Cloud bank at the midzone blocking roughly half the photon stream.'; }
    else if (cloudCover <= 75)  { cond = 'Overcast';      note = 'Heavy cloud. Most photons are stopped before reaching the panels — power drops sharply.'; }
    else                        { cond = 'Dense Cloud';   note = 'Near-total blockage. This is exactly why battery storage is critical.'; }
    pStatCond.textContent = cond;
    noteEl.textContent    = note;
    drawClouds(stage.offsetWidth, stage.offsetHeight, cloudCover);
  }

  slider.addEventListener('input', () => update(slider.value));
  update(0);
  tick();
  window.addEventListener('resize', () => drawClouds(stage.offsetWidth, stage.offsetHeight, cloudCover));
})();

// ════════════════════════════════════
// CH2 — SOLAR CELL LAYER JOURNEY
// ════════════════════════════════════
(function () {
  const stage   = document.getElementById('journeyStage');
  const canvas  = document.getElementById('journeyCanvas');
  const slider  = document.getElementById('journeySlider');
  const nameEl  = document.getElementById('journeyLayerName');
  const descEl  = document.getElementById('journeyLayerDesc');
  const depthEl = document.getElementById('journeyDepth');
  if (!stage) return;

  const ctx = canvas.getContext('2d');
  let animT = 0, currentProgress = 0, targetProgress = 0;
  let animParticles = [], lastLayerId = '';

  const LAYERS = [
    { id:'sun',      name:'Sunlight',               depth:'Entry point', heightFrac:0.10,
      color:'rgba(255,243,176,0.08)', labelColor:'#FFF3B0',
      desc:'This is a tiny burst of sunlight called a photon. Think of it like a small ball of energy fired from the sun. It has just enough punch to knock something loose inside the panel.' },
    { id:'glass',    name:'Glass Cover',             depth:'Outermost layer',        heightFrac:0.10,
      color:'rgba(56,189,248,0.09)', labelColor:'#7DD3FC',
      desc:'The first thing sunlight hits is a tough piece of glass — like a window, but built to last decades outdoors. It lets almost all the light through while protecting everything underneath.' },
    { id:'ar',       name:'Anti-Reflective Coating', depth:'Thinner than a hair',       heightFrac:0.07,
      color:'rgba(167,139,250,0.11)', labelColor:'#C4B5FD',
      desc:'Without this invisible coating, most of the sunlight would just bounce off the panel like light off a mirror. This layer stops that from happening and lets the light sink in.' },
    { id:'ntype',    name:'N-Type Silicon',          depth:'Just under the surface',        heightFrac:0.14,
      color:'rgba(56,189,248,0.13)', labelColor:'#38BDF8',
      desc:'This is silicon — the same material computer chips are made from. This top half is packed with extra tiny particles called electrons, just waiting to be knocked loose.' },
    { id:'junction', name:'P-N Junction',            depth:'The critical boundary',         heightFrac:0.08,
      color:'rgba(232,200,74,0.20)', labelColor:'#E8C84A',
      desc:'This is the moment everything happens. The sunlight smashes into an atom and knocks an electron free — like a cue ball hitting a snooker ball. The electron is now moving, and moving electrons are electricity.' },
    { id:'ptype',    name:'P-Type Silicon',          depth:'Middle of the cell',        heightFrac:0.18,
      color:'rgba(251,146,60,0.13)', labelColor:'#FB923C',
      desc:'The bottom half of the silicon pushes the freed electron in one direction and lets the gap it left behind drift the other way. This separation is what keeps the electricity flowing in one direction.' },
    { id:'contact',  name:'Back Metal Contact',      depth:'Bottom of the cell',        heightFrac:0.10,
      color:'rgba(52,211,153,0.11)', labelColor:'#34D399',
      desc:'This is a metal plate at the very bottom. It catches all the electrons that have made the journey through the cell and sends them out into a wire — like a drain collecting water.' },
    { id:'dc',       name:'Direct Current (DC)',     depth:'Leaving the cell',        heightFrac:0.13,
      color:'rgba(232,200,74,0.07)', labelColor:'#E8C84A',
      desc:'The electrons are now flowing through a wire as electricity. This is called direct current — it flows in one direction, like water down a pipe. One cell doesn’t produce much, but hundreds of them together power your home.' },
  ];

  function getLayerBands(H) {
    const bands = []; let y = 0;
    for (const l of LAYERS) { const h = l.heightFrac * H; bands.push({ y, h }); y += h; }
    return bands;
  }

  function layerIdx(p) { return Math.min(LAYERS.length - 1, Math.floor(p * LAYERS.length)); }
  function photonY(p, H) { return p * H * 0.95 + 4; }

  function spawnJunctionParticles(px, py) {
    animParticles = [];
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI/2 + (Math.random()-0.5)*0.8;
      const speed = 2 + Math.random()*2;
      animParticles.push({ type:'electron', x:px, y:py, vx:Math.cos(angle-0.6)*speed, vy:Math.sin(angle-0.6)*speed, alpha:1, r:4, life:70 });
      animParticles.push({ type:'hole',     x:px, y:py, vx:Math.cos(angle+0.6)*speed, vy:Math.sin(angle+0.6)*speed*0.5, alpha:1, r:4, life:70 });
    }
  }

  function spawnCurrentParticles(W, H) {
    animParticles = [];
    for (let i = 0; i < 8; i++) {
      animParticles.push({ type:'current', x:W*0.08 + i*W*0.11, y:H*0.97, vx:2.5, vy:0, alpha:1, r:3, life:120+i*8 });
    }
  }

  function draw(W, H) {
    ctx.clearRect(0, 0, W, H);
    const bands = getLayerBands(H);
    const prog  = currentProgress;
    const li    = layerIdx(prog);
    const pY    = photonY(prog, H);
    const pX    = W * 0.5;

    // ── DRAW LAYER BANDS ──
    LAYERS.forEach((l, i) => {
      const b = bands[i];
      const active = i === li;
      const past   = i < li;

      // base fill
      ctx.fillStyle = l.color;
      ctx.fillRect(0, b.y, W, b.h);

      // active boost
      if (active) {
        ctx.fillStyle = l.color.replace(')', ',1)').replace('rgba(', 'rgba(').replace(/,\s*[\d.]+\)$/, ', 0.32)');
        ctx.fillRect(0, b.y, W, b.h);
        // glow edge
        const eg = ctx.createLinearGradient(0, b.y, 0, b.y+8);
        eg.addColorStop(0, l.labelColor + '55');
        eg.addColorStop(1, 'transparent');
        ctx.fillStyle = eg; ctx.fillRect(0, b.y, W, 8);
      }

      // separator line
      ctx.strokeStyle = active ? l.labelColor + '55' : 'rgba(242,239,233,0.06)';
      ctx.lineWidth   = active ? 1.5 : 0.5;
      ctx.beginPath(); ctx.moveTo(0, b.y); ctx.lineTo(W, b.y); ctx.stroke();

      // left label
      ctx.fillStyle = active ? l.labelColor : (past ? 'rgba(242,239,233,0.30)' : 'rgba(242,239,233,0.14)');
      ctx.font = `${active ? 600 : 400} ${active ? 11 : 10}px Barlow, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(l.name.toUpperCase(), 14, b.y + b.h*0.5 + 4);

      // depth right
      if (active) {
        ctx.fillStyle = 'rgba(242,239,233,0.3)';
        ctx.font = '400 10px Barlow, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(l.depth, W - 14, b.y + b.h*0.5 + 4);
        ctx.textAlign = 'left';
      }
    });

    // ── PHOTON TRAIL ──
    for (let t = 30; t >= 0; t--) {
      const ty = pY - t * 4;
      if (ty < 0) continue;
      const ta = (1 - t/30) * 0.3;
      ctx.beginPath(); ctx.arc(pX, ty, 3, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,243,176,${ta})`; ctx.fill();
    }

    // photon glow
    const g = ctx.createRadialGradient(pX, pY, 0, pX, pY, 24);
    g.addColorStop(0, 'rgba(255,250,200,0.75)');
    g.addColorStop(0.4, 'rgba(232,200,74,0.35)');
    g.addColorStop(1, 'rgba(232,200,74,0)');
    ctx.beginPath(); ctx.arc(pX, pY, 24, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();

    // photon core
    ctx.beginPath(); ctx.arc(pX, pY, 5, 0, Math.PI*2);
    ctx.fillStyle = '#FFFDE0'; ctx.fill();

    // ── TRIGGER LAYER PARTICLES ──
    const currentId = LAYERS[li].id;
    if (currentId === 'junction' && lastLayerId !== 'junction') {
      spawnJunctionParticles(pX, pY);
    } else if (currentId === 'dc' && lastLayerId !== 'dc') {
      spawnCurrentParticles(W, H);
    }
    lastLayerId = currentId;

    // ── DRAW PARTICLES ──
    for (let i = animParticles.length - 1; i >= 0; i--) {
      const p = animParticles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      p.alpha = Math.max(0, p.life / 70);
      if (p.life <= 0) { animParticles.splice(i, 1); continue; }

      if (p.type === 'electron') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(56,189,248,${p.alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*2.8, 0, Math.PI*2);
        ctx.fillStyle = `rgba(56,189,248,${p.alpha*0.18})`; ctx.fill();
      }
      if (p.type === 'hole') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(251,146,60,${p.alpha})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*2.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(251,146,60,${p.alpha*0.12})`; ctx.fill();
      }
      if (p.type === 'current') {
        if (p.x > W - 10) { animParticles.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(232,200,74,${p.alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*2.2, 0, Math.PI*2);
        ctx.fillStyle = `rgba(232,200,74,${p.alpha*0.18})`; ctx.fill();
      }
    }

    // DC wire at output
    if (prog > 0.80) {
      const wa = Math.min(1, (prog - 0.80) / 0.08);
      const wireY = H * 0.975;
      ctx.strokeStyle = `rgba(232,200,74,${wa*0.65})`;
      ctx.lineWidth = 2; ctx.setLineDash([6,4]);
      ctx.beginPath(); ctx.moveTo(W*0.08, wireY); ctx.lineTo(W*0.92, wireY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(232,200,74,${wa*0.45})`;
      ctx.font = '500 10px Barlow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DC OUTPUT WIRE', W*0.5, wireY - 7);
      ctx.textAlign = 'left';
    }

    animT += 0.02;
  }

  function updateInfo(prog) {
    const l = LAYERS[layerIdx(prog)];
    nameEl.textContent  = l.name;
    descEl.textContent  = l.desc;
    depthEl.textContent = l.depth;
  }

  function tick() {
    const W = canvas.width  = stage.offsetWidth;
    const H = canvas.height = stage.offsetHeight;
    currentProgress += (targetProgress - currentProgress) * 0.10;
    draw(W, H);
    requestAnimationFrame(tick);
  }

  slider.addEventListener('input', () => {
    targetProgress = slider.value / 1000;
    updateInfo(targetProgress);
  });

  updateInfo(0);
  tick();
})();




// ════════════════════════════════════
// CH5 — DAY IN THE LIFE TIMELINE
// ════════════════════════════════════
(function () {
  const stage   = document.getElementById('gridStage');
  const canvas  = document.getElementById('gridCanvas');
  const hint    = document.getElementById('timelineDragHint');
  const tlTime     = document.getElementById('tlTime');
  const tlSolar    = document.getElementById('tlSolar');
  const tlUsage    = document.getElementById('tlUsage');
  const tlFlow     = document.getElementById('tlFlow');
  const tlCreds    = document.getElementById('tlCredits');
  const noteEl     = document.getElementById('gridNote');
  const explainer  = document.getElementById('tlExplainer');
  const tlIcon     = document.getElementById('tlIcon');
  const tlStatus   = document.getElementById('tlStatus');
  const tlNet      = document.getElementById('tlNet');
  if (!stage) return;

  const ctx = canvas.getContext('2d');

  // t = 0 → midnight start, t = 1 → midnight end (full 24h)
  let timeT = 0.5; // start at noon
  let dragging = false, startX = 0, startT = 0.5;
  let hasDragged = false;

  // ── DATA CURVES ──
  // Solar: bell curve, rises ~6am (t=0.25), peaks noon (t=0.5), sets ~8pm (t=0.833)
  function solarKW(t) {
    if (t < 0.25 || t > 0.833) return 0;
    const norm = (t - 0.25) / (0.833 - 0.25);
    return Math.max(0, Math.sin(norm * Math.PI) * 7.2);
  }

  // Home usage: higher morning & evening, lower midday
  function usageKW(t) {
    const h = t * 24; // hour of day
    if (h < 5)  return 0.8;
    if (h < 8)  return 3.2;
    if (h < 17) return 1.6;
    if (h < 22) return 3.8;
    return 1.2;
  }

  // Time string from t
  function timeStr(t) {
    const totalMin = Math.round(t * 24 * 60) % (24 * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const ap = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ap}`;
  }

  // Cumulative net export up to time t (kWh)
  function creditsUpTo(t) {
    let total = 0;
    const steps = 200;
    for (let i = 0; i < steps; i++) {
      const ti = (i / steps) * t;
      const net = solarKW(ti) - usageKW(ti);
      if (net > 0) total += net * (t / steps);
    }
    return total;
  }

  // Sky colour for time of day
  function skyColor(t) {
    const h = t * 24;
    if (h < 5  || h > 22) return ['#03040A', '#08060F'];
    if (h < 6)  return ['#0D0818', '#2A1020'];
    if (h < 7)  return ['#1A0E28', '#6B2A20'];
    if (h < 8)  return ['#0E1830', '#4A6080'];
    if (h < 18) return ['#060E1A', '#0A1828'];
    if (h < 19) return ['#0E1830', '#4A6080'];
    if (h < 20) return ['#1A0E28', '#6B2A20'];
    if (h < 21) return ['#0D0818', '#2A1020'];
    return ['#03040A', '#08060F'];
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function draw() {
    canvas.width  = stage.offsetWidth;
    canvas.height = stage.offsetHeight;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // ── LAYOUT ──
    const chartTop    = 44;      // top of chart area
    const chartBot    = H - 52;  // bottom of chart area
    const chartH      = chartBot - chartTop;
    const chartLeft   = 42;
    const chartRight  = W - 20;
    const chartW      = chartRight - chartLeft;
    const maxKW       = 8;       // max Y value

    function xFromT(t)  { return chartLeft + t * chartW; }
    function yFromKW(k) { return chartBot - (k / maxKW) * chartH; }

    // ── SKY GRADIENT (top strip above chart) ──
    const [skyTop, skyBot] = skyColor(timeT);
    const skyG = ctx.createLinearGradient(0, 0, 0, chartTop + 4);
    skyG.addColorStop(0, skyTop); skyG.addColorStop(1, skyBot);
    ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, chartTop + 4);

    // ── CHART BACKGROUND ──
    ctx.fillStyle = '#06080E'; ctx.fillRect(0, chartTop, W, H - chartTop);

    // ── HORIZONTAL GRID LINES ──
    ctx.strokeStyle = 'rgba(242,239,233,0.05)'; ctx.lineWidth = 1;
    [0, 2, 4, 6, 8].forEach(kw => {
      const y = yFromKW(kw);
      ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
      ctx.fillStyle = 'rgba(242,239,233,0.18)';
      ctx.font = '400 9px Barlow, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(kw + ' kW', chartLeft - 6, y + 3);
    });
    ctx.textAlign = 'left';

    // ── FILL AREAS ──
    // Build solar and usage paths first
    const STEPS = 300;

    // Export fill (solar > usage) — green
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBot);
    for (let i = 0; i <= STEPS; i++) {
      const t  = i / STEPS;
      const s  = solarKW(t);
      const u  = usageKW(t);
      const y  = yFromKW(Math.min(s, u));
      i === 0 ? ctx.moveTo(xFromT(t), y) : ctx.lineTo(xFromT(t), y);
    }
    // close along solar curve backward then usage forward — just fill between curves
    // Simpler: draw two separate fills
    ctx.closePath();

    // Export region (solar - usage where solar > usage)
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const s = solarKW(t), u = usageKW(t);
      if (s > u) { i === 0 || solarKW((i-1)/STEPS) <= usageKW((i-1)/STEPS) ? ctx.moveTo(xFromT(t), yFromKW(s)) : ctx.lineTo(xFromT(t), yFromKW(s)); }
    }
    for (let i = STEPS; i >= 0; i--) {
      const t = i / STEPS;
      const s = solarKW(t), u = usageKW(t);
      if (s > u) ctx.lineTo(xFromT(t), yFromKW(u));
    }
    ctx.closePath();
    const exportFill = ctx.createLinearGradient(0, yFromKW(maxKW), 0, chartBot);
    exportFill.addColorStop(0, 'rgba(52,211,153,0.28)');
    exportFill.addColorStop(1, 'rgba(52,211,153,0.04)');
    ctx.fillStyle = exportFill; ctx.fill();

    // Import region (usage > solar) — blue
    ctx.beginPath();
    let importStarted = false;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const s = solarKW(t), u = usageKW(t);
      if (u > s) {
        const x = xFromT(t);
        if (!importStarted) { ctx.moveTo(x, yFromKW(u)); importStarted = true; }
        else ctx.lineTo(x, yFromKW(u));
      } else if (importStarted) {
        importStarted = false; ctx.closePath();
      }
    }
    if (importStarted) ctx.closePath();
    // Redo cleanly as full region
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const u = usageKW(t), s = solarKW(t);
      const top = Math.max(u, s === 0 ? u : Math.min(u, s));
      if (u >= s) {
        const x = xFromT(t);
        i === 0 ? ctx.moveTo(x, yFromKW(u)) : ctx.lineTo(x, yFromKW(u));
      }
    }
    for (let i = STEPS; i >= 0; i--) {
      const t = i / STEPS;
      const u = usageKW(t), s = solarKW(t);
      if (u >= s) ctx.lineTo(xFromT(t), yFromKW(s));
    }
    ctx.closePath();
    const importFill = ctx.createLinearGradient(0, yFromKW(maxKW), 0, chartBot);
    importFill.addColorStop(0, 'rgba(56,189,248,0.22)');
    importFill.addColorStop(1, 'rgba(56,189,248,0.03)');
    ctx.fillStyle = importFill; ctx.fill();

    // ── SOLAR CURVE ──
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const x = xFromT(t), y = yFromKW(solarKW(t));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(232,200,74,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();

    // ── USAGE LINE ──
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const x = xFromT(t), y = yFromKW(usageKW(t));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(242,239,233,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]); ctx.stroke();
    ctx.setLineDash([]);

    // ── LEGEND ──
    ctx.font = '500 10px Barlow, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,200,74,0.75)';
    ctx.fillRect(chartLeft, 10, 14, 3); ctx.fillText('Solar output', chartLeft + 18, 16);
    ctx.fillStyle = 'rgba(242,239,233,0.4)';
    ctx.fillRect(chartLeft + 110, 10, 14, 3); ctx.fillText('Home usage', chartLeft + 128, 16);
    ctx.fillStyle = 'rgba(52,211,153,0.65)';
    ctx.fillRect(chartLeft + 218, 8, 10, 10); ctx.fillText('Exporting', chartLeft + 232, 16);
    ctx.fillStyle = 'rgba(56,189,248,0.55)';
    ctx.fillRect(chartLeft + 298, 8, 10, 10); ctx.fillText('Importing', chartLeft + 312, 16);

    // ── TIME AXIS ──
    ctx.fillStyle = 'rgba(242,239,233,0.2)'; ctx.font = '400 9px Barlow, sans-serif';
    ['12am','3am','6am','9am','12pm','3pm','6pm','9pm','12am'].forEach((label, i) => {
      const t = i / 8;
      const x = xFromT(t);
      ctx.textAlign = 'center'; ctx.fillText(label, x, chartBot + 14);
      ctx.strokeStyle = 'rgba(242,239,233,0.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, chartTop); ctx.lineTo(x, chartBot); ctx.stroke();
    });

    // ── SUN ──
    const sunX = xFromT(timeT);
    const sunH = solarKW(timeT);
    const sunVisible = sunH > 0.1;
    const sunY = sunVisible
      ? lerp(chartTop + 8, yFromKW(sunH) - 20, sunH / maxKW)
      : chartTop + 6;
    const sunR = 12 + sunH * 1.2;

    if (sunVisible) {
      const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.5);
      sg.addColorStop(0, `rgba(232,200,74,${0.25 + sunH/maxKW*0.3})`);
      sg.addColorStop(1, 'rgba(232,200,74,0)');
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR*2.5, 0, Math.PI*2);
      ctx.fillStyle = sg; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2);
    ctx.fillStyle = sunVisible
      ? `radial-gradient(circle, #FFF3B0, #E8C84A)`
      : 'rgba(242,239,233,0.12)';
    // fallback solid fill
    const sunFill = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    sunFill.addColorStop(0, sunVisible ? '#FFF3B0' : '#1A1A2A');
    sunFill.addColorStop(1, sunVisible ? '#E8C84A' : '#0A0A14');
    ctx.fillStyle = sunFill; ctx.fill();

    // ── MARKER LINE ──
    ctx.strokeStyle = 'rgba(242,239,233,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(sunX, chartTop); ctx.lineTo(sunX, chartBot); ctx.stroke();
    ctx.setLineDash([]);

    // marker dot on solar curve
    ctx.beginPath(); ctx.arc(sunX, yFromKW(sunH), 5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(232,200,74,0.95)'; ctx.fill();
    ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.5; ctx.stroke();

    // marker dot on usage curve
    ctx.beginPath(); ctx.arc(sunX, yFromKW(usageKW(timeT)), 5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(242,239,233,0.8)'; ctx.fill();
    ctx.strokeStyle = '#0A0A0A'; ctx.lineWidth = 1.5; ctx.stroke();

    // ── UPDATE INFO ──
    const s = solarKW(timeT), u = usageKW(timeT);
    const exp = s > u;
    tlTime.textContent  = timeStr(timeT);
    tlSolar.textContent = s.toFixed(1) + ' kW';
    tlUsage.textContent = u.toFixed(1) + ' kW';
    tlFlow.textContent  = s < 0.1 ? 'No solar' : exp ? 'Exporting' : 'Importing';
    tlFlow.style.color  = s < 0.1 ? 'var(--gray)' : exp ? '#34D399' : '#38BDF8';
    const creds = creditsUpTo(timeT);
    tlCreds.textContent = creds > 0 ? '+' + creds.toFixed(1) + ' kWh' : '0.0 kWh';
    tlCreds.style.color = creds > 0 ? '#34D399' : 'var(--gray)';

    // ── EXPLAINER BLOCK ──
    const net = s - u;
    let icon, status, explanation, stateClass, netColor;

    if (s < 0.1) {
      icon        = '🌙';
      status      = 'No solar — drawing from the grid';
      explanation = 'The sun is down and your panels aren’t producing anything. Your home is running entirely on electricity from the utility grid. This is normal every night, and exactly why battery storage helps — a charged battery can cover this gap without touching the grid.';
      stateClass  = 'nosolar';
      netColor    = '#9CA3AF';
    } else if (exp) {
      const surplus = (s - u).toFixed(1);
      icon        = '⚡';
      status      = 'Exporting surplus to the grid';
      explanation = `Right now your panels are making ${s.toFixed(1)} kW of electricity but your home only needs ${u.toFixed(1)} kW. The extra ${surplus} kW has nowhere to go inside your house — so it flows outward along the power line to the utility grid. Your meter runs backward and you earn a credit for every unit you send out. This is called net metering.`;
      stateClass  = 'exporting';
      netColor    = '#34D399';
    } else {
      const gap = (u - s).toFixed(1);
      icon        = '🔌';
      status      = 'Importing — panels not covering demand';
      explanation = `Your panels are producing ${s.toFixed(1)} kW but your home is currently using ${u.toFixed(1)} kW. There’s a ${gap} kW shortfall. The grid automatically makes up the difference — you don’t notice anything, your lights stay on. But you are buying that gap at your normal electricity rate.`;
      stateClass  = 'importing';
      netColor    = '#38BDF8';
    }

    if (noteEl)    noteEl.textContent    = explanation;
    if (tlStatus)  tlStatus.textContent  = status;
    if (tlIcon)    tlIcon.textContent    = icon;
    if (tlNet) {
      tlNet.textContent  = (net >= 0 ? '+' : '') + net.toFixed(1) + ' kW';
      tlNet.style.color  = netColor;
    }
    if (explainer) {
      explainer.className = 'tl-explainer ' + stateClass;
    }
  }

  // ── DRAG INTERACTION ──
  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    startX = e.clientX;
    startT = timeT;
    canvas.setPointerCapture(e.pointerId);
    if (!hasDragged) { hasDragged = true; if (hint) hint.classList.add('hidden'); }
  });

  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const W  = stage.offsetWidth - 62; // chartW approx
    timeT = Math.max(0, Math.min(1, startT + dx / W));
    draw();
  });

  window.addEventListener('pointerup', () => { dragging = false; });

  function tick() { draw(); requestAnimationFrame(tick); }
  tick();
})();
