// ── PROGRESS BAR ──
window.addEventListener('scroll', () => {
  const h = document.body.scrollHeight - window.innerHeight;
  document.getElementById('progress').style.width = (h > 0 ? window.scrollY / h * 100 : 0) + '%';
  updateNav();
});

// ── SCROLL REVEAL ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.chapter').forEach(s => observer.observe(s));

// ── ACTIVE NAV ──
const sections = ['sunlight', 'cells', 'inverter', 'storage', 'grid'];
const navLinks = document.querySelectorAll('.nav-steps a');

function updateNav() {
  let current = sections[0];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 200) current = id;
  });
  navLinks.forEach(a => {
    a.classList.toggle('active', a.dataset.section === current);
  });
}

// ── PHOTON RAIN INTERACTIVE ──
(function () {
  const NS           = 'http://www.w3.org/2000/svg';
  const stage        = document.getElementById('photonStage');
  const svgEl        = document.getElementById('photonSVG');
  const cloudSVG     = document.getElementById('cloudLayer');
  const panel        = document.getElementById('photonPanel');
  const slider       = document.getElementById('cloudSlider');
  const cloudVal     = document.getElementById('cloudVal');
  const pStatCloud   = document.getElementById('pStatCloud');
  const pStatPhotons = document.getElementById('pStatPhotons');
  const pStatOutput  = document.getElementById('pStatOutput');
  const pStatCond    = document.getElementById('pStatCond');
  const pPowerFill   = document.getElementById('pPowerFill');
  const noteEl       = document.getElementById('photonNote');

  if (!stage) return;

  let cloudCover = 0;
  let photons = [];
  let W = stage.offsetWidth;
  let H = stage.offsetHeight;

  const ICON_HALF = 10;   // half of 20px icon
  const CLOUD_BTM = 120 * 0.35;
  const CLOUD_AR  = 40 / 68; // cloud symbol viewBox aspect ratio

  const CLOUD_SYMBOLS = ['#cloud-shape-1','#cloud-shape-2','#cloud-shape-3','#cloud-shape-4'];

  // ── SVG element pools ──
  const freePhotons = [];
  function getPhotonEl() {
    if (freePhotons.length) {
      const el = freePhotons.pop();
      el.style.display = '';
      return el;
    }
    const el = document.createElementNS(NS, 'use');
    el.setAttribute('href', '#photon-shape');
    el.setAttribute('width', ICON_HALF * 2);
    el.setAttribute('height', ICON_HALF * 2);
    el.setAttribute('filter', 'url(#photon-glow)');
    svgEl.appendChild(el);
    return el;
  }
  function releasePhotonEl(el) {
    el.style.display = 'none';
    freePhotons.push(el);
  }

  const freeCircles = [];
  function getCircleEl() {
    if (freeCircles.length) {
      const el = freeCircles.pop();
      el.style.display = '';
      return el;
    }
    const el = document.createElementNS(NS, 'circle');
    svgEl.appendChild(el);
    return el;
  }
  function releaseCircleEl(el) {
    el.style.display = 'none';
    freeCircles.push(el);
  }

  const cloudDefs = [
    { cx: 0.18, cy: 0.28, scale: 0.28 },
    { cx: 0.30, cy: 0.18, scale: 0.22 },
    { cx: 0.50, cy: 0.22, scale: 0.36 },
    { cx: 0.64, cy: 0.14, scale: 0.24 },
    { cx: 0.78, cy: 0.26, scale: 0.30 },
    { cx: 0.90, cy: 0.17, scale: 0.20 }
  ];

  function drawClouds(cover) {
    cloudSVG.setAttribute('width', W);
    cloudSVG.innerHTML = '';
    const visible = Math.round(cover / 100 * cloudDefs.length);
    for (let i = 0; i < visible; i++) {
      const c = cloudDefs[i];
      const opacity = 0.55 + (cover / 100) * 0.35;
      const cw = c.scale * W;
      const ch = cw * 0.6;
      const el = document.createElementNS(NS, 'use');
      el.setAttribute('href', CLOUD_SYMBOLS[i % CLOUD_SYMBOLS.length]);
      el.setAttribute('x', c.cx * W - cw / 2);
      el.setAttribute('y', c.cy * 120 - ch / 2);
      el.setAttribute('width', cw);
      el.setAttribute('height', ch);
      el.setAttribute('opacity', opacity);
      cloudSVG.appendChild(el);
    }
  }

  function spawnPhoton() {
    const blocked = Math.random() > (1 - cloudCover / 100);
    const el = blocked ? getCircleEl() : getPhotonEl();
    return {
      x: Math.random() * W,
      y: -ICON_HALF,
      vy: 1.8 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.6,
      r: 2 + Math.random() * 1.5,
      alpha: 0.7 + Math.random() * 0.3,
      blocked,
      el
    };
  }

  function panelY() { return H - 56 - 8; }

  function tick() {
    const rate = Math.round(1 + (1 - cloudCover / 100) * 5);
    for (let i = 0; i < rate; i++) photons.push(spawnPhoton());

    const pY = panelY();
    const pX = W / 2;
    const pHalfW = 80;
    let hitCount = 0;

    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.blocked && p.y > CLOUD_BTM) {
        p.alpha -= 0.06;
        if (p.alpha <= 0) {
          releaseCircleEl(p.el);
          photons.splice(i, 1);
          continue;
        }
      }

      if (!p.blocked && p.y >= pY - 10 && p.y <= pY + 10 &&
          p.x >= pX - pHalfW && p.x <= pX + pHalfW) {
        hitCount++;
        releasePhotonEl(p.el);
        photons.splice(i, 1);
        continue;
      }

      if (p.y > H + 10 || p.x < -20 || p.x > W + 20) {
        p.blocked ? releaseCircleEl(p.el) : releasePhotonEl(p.el);
        photons.splice(i, 1);
        continue;
      }

      if (p.blocked) {
        p.el.setAttribute('cx', p.x);
        p.el.setAttribute('cy', p.y);
        p.el.setAttribute('r', p.r);
        p.el.setAttribute('fill', `rgba(200,200,220,${(p.alpha * 0.5).toFixed(2)})`);
      } else {
        p.el.setAttribute('x', p.x - ICON_HALF);
        p.el.setAttribute('y', p.y - ICON_HALF);
        p.el.setAttribute('opacity', p.alpha.toFixed(2));
      }
    }

    if (photons.length > 400) {
      const excess = photons.splice(0, photons.length - 400);
      excess.forEach(p => p.blocked ? releaseCircleEl(p.el) : releasePhotonEl(p.el));
    }

    panel.classList.toggle('lit', hitCount > 0);
    requestAnimationFrame(tick);
  }

  function update(val) {
    cloudCover = +val;
    const passRate = Math.max(0, 1 - cloudCover / 100);
    const pct = Math.round(passRate * 100);

    cloudVal.textContent     = cloudCover + '%';
    pStatCloud.textContent   = cloudCover + '%';
    pStatPhotons.textContent = pct + '%';
    pStatOutput.textContent  = pct + '%';
    pPowerFill.style.width   = pct + '%';
    pPowerFill.style.background = pct > 60 ? 'var(--yellow)' : pct > 25 ? '#C8A030' : 'var(--gray)';

    let cond, note;
    if      (cloudCover === 0)  { cond = 'Clear';         note = 'Full sun — photons travel unobstructed from the sun straight to the panel.'; }
    else if (cloudCover <= 25)  { cond = 'Mostly Clear';  note = 'Light cloud. Most photons still reach the panel — output remains high.'; }
    else if (cloudCover <= 50)  { cond = 'Partly Cloudy'; note = 'Significant scattering. Clouds absorb and redirect photons before they reach silicon.'; }
    else if (cloudCover <= 75)  { cond = 'Overcast';      note = 'Heavy cloud cover. Most photons are blocked — diffuse light only reaches the panel.'; }
    else                        { cond = 'Dense Cloud';   note = 'Near-total blockage. This is where battery storage becomes essential to keep your home running.'; }

    pStatCond.textContent = cond;
    noteEl.textContent    = note;

    [pStatPhotons, pStatOutput, pStatCond].forEach(el => {
      el.classList.toggle('low', cloudCover > 60);
    });

    drawClouds(cloudCover);
  }

  slider.addEventListener('input', () => update(slider.value));
  window.addEventListener('resize', () => {
    W = stage.offsetWidth;
    H = stage.offsetHeight;
    drawClouds(cloudCover);
  });

  update(0);
  requestAnimationFrame(tick);
})();

// ── ELECTRON PINBALL INTERACTIVE ──
(function () {
  const NS        = 'http://www.w3.org/2000/svg';
  const ICON_HALF = 10;

  const stage   = document.getElementById('pinballStage');
  const canvas  = document.getElementById('pinballCanvas');
  const svgEl   = document.getElementById('pinballSVG');
  const noteEl  = document.getElementById('pinballNote');
  if (!stage) return;

  const ctx = canvas.getContext('2d');
  let fired = 0, freed = 0;
  let particles = [];
  let atoms = [];
  let animT = 0;

  // Photon SVG element pool — reuses <use href="#photon-shape"> elements
  const freePhotons = [];
  function getPhotonEl() {
    if (freePhotons.length) {
      const el = freePhotons.pop();
      el.style.display = '';
      return el;
    }
    const el = document.createElementNS(NS, 'use');
    el.setAttribute('href', '#photon-shape');
    el.setAttribute('width', ICON_HALF * 2);
    el.setAttribute('height', ICON_HALF * 2);
    el.setAttribute('filter', 'url(#photon-glow)');
    svgEl.appendChild(el);
    return el;
  }
  function releasePhotonEl(el) {
    el.style.display = 'none';
    freePhotons.push(el);
  }

  function buildAtoms(W, H) {
    atoms = [];
    const cols = 9, rows = 7;
    const padX = W * 0.06, padY = H * 0.1;
    const spacX = (W - padX * 2) / (cols - 1);
    const spacY = (H - padY * 2) / (rows - 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        atoms.push({
          x: padX + c * spacX + (Math.random() - 0.5) * spacX * 0.25,
          y: padY + r * spacY + (Math.random() - 0.5) * spacY * 0.2,
          r: 6 + Math.random() * 3,
          lit: false, litTimer: 0,
          energetic: Math.random() > 0.4
        });
      }
    }
  }

  function spawnPhoton(clickX) {
    fired++;
    document.getElementById('pbFired').textContent = fired;
    noteEl.textContent = 'Photon entering silicon lattice…';
    const el = getPhotonEl();
    particles.push({
      type: 'photon', x: clickX, y: 0,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 3.5 + Math.random() * 2,
      r: 4, alpha: 1, bounces: 0,
      maxBounces: 2 + Math.floor(Math.random() * 3),
      el
    });
  }

  function spawnElectron(x, y) {
    freed++;
    document.getElementById('pbFreed').textContent = freed;
    document.getElementById('pbCurrent').textContent = (freed * 1.4).toFixed(0) + ' mA';
    document.getElementById('pbVoltage').textContent = Math.min(0.65, freed * 0.05).toFixed(2) + ' V';
    noteEl.textContent = 'Electron freed! Electric field drives it toward the wire — current flows.';
    particles.push({
      type: 'electron', x, y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2.8 + Math.random() * 1.5,
      r: 3.5, alpha: 1
    });
  }

  function tick() {
    const W = canvas.width  = stage.offsetWidth;
    const H = canvas.height = stage.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    if (atoms.length === 0) buildAtoms(W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0A0E18'); bg.addColorStop(0.5, '#0D1420'); bg.addColorStop(1, '#0A0C14');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(56,189,248,0.05)'; ctx.fillRect(0, 0, W, H * 0.5);
    ctx.fillStyle = 'rgba(251,146,60,0.05)'; ctx.fillRect(0, H * 0.5, W, H * 0.5);

    ctx.font = '500 10px Barlow, sans-serif';
    ctx.fillStyle = 'rgba(56,189,248,0.3)'; ctx.fillText('N-TYPE SILICON', 14, 22);
    ctx.fillStyle = 'rgba(251,146,60,0.3)'; ctx.fillText('P-TYPE SILICON', 14, H * 0.5 + 22);

    ctx.strokeStyle = 'rgba(232,200,74,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,200,74,0.35)'; ctx.fillText('P-N JUNCTION', W / 2 - 36, H * 0.5 - 6);

    ctx.strokeStyle = 'rgba(52,211,153,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H - 10); ctx.lineTo(W, H - 10); ctx.stroke();
    ctx.fillStyle = 'rgba(52,211,153,0.25)'; ctx.fillText('CURRENT COLLECTOR WIRE', 14, H - 16);

    atoms.forEach(a => {
      if (a.litTimer > 0) { a.litTimer--; if (a.litTimer === 0) a.lit = false; }
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = a.lit ? 'rgba(232,200,74,0.9)' : (a.y < H * 0.5 ? 'rgba(56,189,248,0.55)' : 'rgba(251,146,60,0.55)');
      ctx.fill();
      if (!a.lit) {
        const angle = animT * 1.8 + a.x * 0.05;
        ctx.beginPath(); ctx.arc(a.x + Math.cos(angle) * (a.r + 5), a.y + Math.sin(angle) * (a.r + 5), 1.5, 0, Math.PI * 2);
        ctx.fillStyle = a.y < H * 0.5 ? 'rgba(56,189,248,0.75)' : 'rgba(251,146,60,0.75)'; ctx.fill();
      }
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;

      if (p.type === 'photon') {
        let hit = false;
        for (const a of atoms) {
          const dx = p.x - a.x, dy = p.y - a.y;
          if (Math.sqrt(dx * dx + dy * dy) < a.r + p.r) {
            a.lit = true; a.litTimer = 22;
            if (p.bounces < p.maxBounces) {
              p.vx = (Math.random() - 0.5) * 3;
              p.vy = Math.abs(p.vy) * (Math.random() > 0.3 ? 1 : -0.5) + 1;
              p.bounces++;
            } else {
              if (a.energetic) spawnElectron(a.x, a.y);
              releasePhotonEl(p.el);
              particles.splice(i, 1); hit = true;
            }
            break;
          }
        }
        if (hit) continue;
        p.el.setAttribute('x', p.x - ICON_HALF);
        p.el.setAttribute('y', p.y - ICON_HALF);
        p.el.setAttribute('opacity', p.alpha.toFixed(2));
      }

      if (p.type === 'electron') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${p.alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${p.alpha * 0.15})`; ctx.fill();
        if (p.y > H - 14) p.alpha -= 0.07;
      }

      if (p.alpha <= 0 || p.y > H + 10 || p.y < -20) {
        if (p.type === 'photon') releasePhotonEl(p.el);
        particles.splice(i, 1);
      }
    }

    if (particles.length > 300) {
      const excess = particles.splice(0, particles.length - 300);
      excess.forEach(p => { if (p.type === 'photon') releasePhotonEl(p.el); });
    }
    animT += 0.02;
    requestAnimationFrame(tick);
  }

  stage.addEventListener('click', e => {
    const rect = stage.getBoundingClientRect();
    spawnPhoton(e.clientX - rect.left);
  });

  tick();
})();

// ── TOP-DOWN MAP INTERACTIVE ──
(function () {
  const NS     = 'http://www.w3.org/2000/svg';
  const canvas = document.getElementById('mapCanvas');
  const mapSVG = document.getElementById('mapSVG');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let solar = 80;
  let arrows = [];

  const HOUSES = [
    { x: .15, y: .25 }, { x: .35, y: .25 }, { x: .55, y: .25 }, { x: .75, y: .25 },
    { x: .15, y: .65 }, { x: .35, y: .65 }, { x: .55, y: .65 }, { x: .75, y: .65 }
  ];
  const SUBSTATION = { x: .50, y: .47 };
  const HOUSE_SZ = 14;

  // 8 permanent <use> elements — swap between house-lit-shape and house-dim-shape
  const houseEls = HOUSES.map(() => {
    const el = document.createElementNS(NS, 'use');
    el.setAttribute('width', HOUSE_SZ * 2);
    el.setAttribute('height', HOUSE_SZ * 2);
    mapSVG.appendChild(el);
    return el;
  });

  function updateHouseIcons(W, H) {
    HOUSES.forEach((h, i) => {
      const lit = solar > 10 + i * 10;
      houseEls[i].setAttribute('href', lit ? '#house-lit-shape' : '#house-dim-shape');
      houseEls[i].setAttribute('x', h.x * W - HOUSE_SZ);
      houseEls[i].setAttribute('y', h.y * H - HOUSE_SZ);
    });
  }

  function spawnArrow(hi) {
    const h = HOUSES[hi];
    arrows.push({ hx: h.x, hy: h.y, t: 0, speed: 0.014 + Math.random() * 0.008 });
  }

  function draw() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#07090E'; ctx.fillRect(0, 0, W, H);

    // roads
    ctx.strokeStyle = 'rgba(240,237,230,0.07)'; ctx.lineWidth = 8;
    [0.27, 0.47, 0.70].forEach(y => {
      ctx.beginPath(); ctx.moveTo(0, H * y); ctx.lineTo(W, H * y); ctx.stroke();
    });
    [0.10, 0.25, 0.45, 0.65, 0.85].forEach(x => {
      ctx.beginPath(); ctx.moveTo(W * x, 0); ctx.lineTo(W * x, H); ctx.stroke();
    });

    // road labels
    ctx.fillStyle = 'rgba(240,237,230,0.08)'; ctx.font = '500 9px Barlow, sans-serif';
    ctx.fillText('SOLAR AVE', W * 0.11, H * 0.26);
    ctx.fillText('GRID RD',   W * 0.11, H * 0.46);

    // house labels — bodies are SVG <use> elements
    ctx.font = '500 8px Barlow, sans-serif'; ctx.textAlign = 'center';
    HOUSES.forEach((h, i) => {
      const hx = h.x * W, hy = h.y * H;
      ctx.fillStyle = 'rgba(240,237,230,0.3)';
      ctx.fillText('H-0' + (i + 1), hx, hy + HOUSE_SZ + 10);
      if (Math.random() < 0.02 * (solar / 100)) spawnArrow(i);
    });
    ctx.textAlign = 'left';

    // substation
    const sx = SUBSTATION.x * W, sy = SUBSTATION.y * H;
    ctx.fillStyle   = 'rgba(232,200,74,0.12)';
    ctx.strokeStyle = 'rgba(232,200,74,0.6)'; ctx.lineWidth = 1.5;
    ctx.fillRect(sx - 20, sy - 20, 40, 40); ctx.strokeRect(sx - 20, sy - 20, 40, 40);
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 24);
    glow.addColorStop(0, 'rgba(232,200,74,0.2)'); glow.addColorStop(1, 'rgba(232,200,74,0)');
    ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    ctx.fillStyle = 'rgba(232,200,74,0.7)'; ctx.font = 'bold 9px Barlow, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('SUB', sx, sy + 3);
    ctx.fillStyle = 'rgba(232,200,74,0.35)'; ctx.font = '500 8px Barlow, sans-serif';
    ctx.fillText('SUBSTATION', sx, sy + 30); ctx.textAlign = 'left';

    // update SVG house icons to match current dimensions and solar level
    updateHouseIcons(W, H);

    // animated energy pulses
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i]; a.t += a.speed;
      if (a.t >= 1) { arrows.splice(i, 1); continue; }
      const ax    = a.hx * W + (sx - a.hx * W) * a.t;
      const ay    = a.hy * H + (sy - a.hy * H) * a.t;
      const alpha = Math.sin(a.t * Math.PI) * 0.9;
      ctx.beginPath(); ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,200,74,${alpha})`; ctx.fill();
      ctx.beginPath(); ctx.arc(ax, ay, 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,200,74,${alpha * 0.15})`; ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  function update(v) {
    solar = +v;
    document.getElementById('mapVal').textContent = v + '%';
    document.getElementById('mapR1').textContent  = v + '%';
    const active = HOUSES.filter((_, i) => solar > 10 + i * 10).length;
    document.getElementById('mapR2').textContent  = active;
    const load = (active * (solar / 100) * 1.5).toFixed(0);
    document.getElementById('mapR3').textContent  = (solar > 40 ? '−' : '+') + (+load) + ' kW';
    document.getElementById('mapNote').textContent = solar > 60
      ? 'Arrows flowing toward the substation — homes exporting surplus solar to the grid.'
      : solar > 25 ? 'Mixed flow — some homes exporting, others drawing from the grid.'
      : 'Minimal solar — neighbourhood drawing from the substation.';
  }

  document.getElementById('mapSlider').addEventListener('input', e => update(e.target.value));
  update(80);
  draw();
})();
