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
document.querySelectorAll('.chapter').forEach(s => {
  s.classList.add('will-animate');
  observer.observe(s);
});

// ── ACTIVE NAV ──
const sections = ['sunlight','cells','inverter','storage','grid'];
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
function initPhotonInteractive(sid) {
  const sfx = '-' + sid;
  const stage    = document.getElementById('photonStage'  + sfx);
  const canvas   = document.getElementById('photonCanvas' + sfx);
  const cloudSVG = document.getElementById('cloudLayer'   + sfx);
  const panel    = document.getElementById('photonPanel'  + sfx);
  const slider   = document.getElementById('cloudSlider'  + sfx);
  const cloudVal = document.getElementById('cloudVal'     + sfx);
  const pStatCloud   = document.getElementById('pStatCloud'   + sfx);
  const pStatPhotons = document.getElementById('pStatPhotons' + sfx);
  const pStatOutput  = document.getElementById('pStatOutput'  + sfx);
  const pStatCond    = document.getElementById('pStatCond'    + sfx);
  const pPowerFill   = document.getElementById('pPowerFill'   + sfx);
  const noteEl       = document.getElementById('photonNote'   + sfx);

  if (!stage) return;

  const ctx = canvas.getContext('2d');
  let cloudCover = 0;
  let photons = [];

  const cloudDefs = [
    { cx: 0.18, cy: 0.28, rx: 0.13, ry: 0.07 },
    { cx: 0.28, cy: 0.20, rx: 0.10, ry: 0.06 },
    { cx: 0.50, cy: 0.22, rx: 0.16, ry: 0.08 },
    { cx: 0.62, cy: 0.15, rx: 0.11, ry: 0.06 },
    { cx: 0.78, cy: 0.25, rx: 0.14, ry: 0.07 },
    { cx: 0.88, cy: 0.18, rx: 0.09, ry: 0.05 }
  ];

  function drawClouds(W, cover) {
    cloudSVG.setAttribute('width', W);
    cloudSVG.innerHTML = '';
    const visible = Math.round(cover / 100 * cloudDefs.length);
    for (let i = 0; i < visible; i++) {
      const c = cloudDefs[i];
      const opacity = 0.55 + (cover / 100) * 0.35;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      el.setAttribute('cx', c.cx * W);
      el.setAttribute('cy', c.cy * 120);
      el.setAttribute('rx', c.rx * W);
      el.setAttribute('ry', c.ry * 120);
      el.setAttribute('fill', `rgba(180,180,190,${opacity})`);
      cloudSVG.appendChild(el);
    }
  }

  function spawnPhoton(W) {
    const passChance = 1 - cloudCover / 100;
    return {
      x: Math.random() * W,
      y: -6,
      vy: 1.8 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.6,
      r: 2 + Math.random() * 1.5,
      alpha: 0.7 + Math.random() * 0.3,
      blocked: Math.random() > passChance
    };
  }

  function panelY(H) { return H - 56 - 8; }

  function tick() {
    const W = canvas.width  = stage.offsetWidth;
    const H = canvas.height = stage.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    const rate = Math.round(1 + (1 - cloudCover / 100) * 5);
    for (let i = 0; i < rate; i++) photons.push(spawnPhoton(W));

    const pY = panelY(H);
    const pX = W / 2;
    const pHalfW = 80;
    let hitCount = 0;

    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.blocked) {
        const cloudBottom = 120 * 0.35;
        if (p.y > cloudBottom) {
          p.alpha -= 0.06;
          if (p.alpha <= 0) { photons.splice(i, 1); continue; }
        }
      }

      if (!p.blocked && p.y >= pY - 10 && p.y <= pY + 10 && p.x >= pX - pHalfW && p.x <= pX + pHalfW) {
        hitCount++;
        photons.splice(i, 1);
        continue;
      }

      if (p.y > H || p.x < -10 || p.x > W + 10) {
        photons.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.blocked
        ? `rgba(200,200,220,${p.alpha * 0.5})`
        : `rgba(255,240,140,${p.alpha})`;
      ctx.fill();

      if (!p.blocked) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,200,74,${p.alpha * 0.12})`;
        ctx.fill();
      }
    }

    if (photons.length > 400) photons.splice(0, photons.length - 400);
    if (hitCount > 0) { panel.classList.add('lit'); } else { panel.classList.remove('lit'); }

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

    drawClouds(stage.offsetWidth, cloudCover);
  }

  slider.addEventListener('input', () => update(slider.value));
  update(0);
  tick();
  window.addEventListener('resize', () => drawClouds(stage.offsetWidth, cloudCover));
}

['sunlight', 'cells', 'inverter', 'storage', 'grid'].forEach(initPhotonInteractive);
