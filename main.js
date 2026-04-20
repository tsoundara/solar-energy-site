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
      const ch = cw * CLOUD_AR;
      const el = document.createElementNS(NS, 'use');
      el.setAttribute('href', '#cloud-shape');
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
