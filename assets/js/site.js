document.getElementById('yr').textContent = new Date().getFullYear();

// Header: tucks away while scrolling down, comes back on the way up; opens as a menu on small screens
const header = document.querySelector('header'), navToggle = document.querySelector('.nav-toggle');
const setMenu = open => {
  header.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (open) header.classList.remove('tuck');
};
navToggle.addEventListener('click', () => setMenu(!header.classList.contains('open')));
header.querySelectorAll('.nav ul a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && header.classList.contains('open')) { setMenu(false); navToggle.focus(); } });
let lastY = scrollY, headTick = false;
const syncHeader = () => {
  headTick = false;
  const y = scrollY;
  header.classList.toggle('stuck', y > 40);
  if (!header.classList.contains('open')) {
    if (y > lastY + 4 && y > 320) header.classList.add('tuck');
    else if (y < lastY - 4 || y <= 320) header.classList.remove('tuck');
  }
  if (Math.abs(y - lastY) > 4) lastY = y;
};
addEventListener('scroll', () => { if (!headTick) { headTick = true; requestAnimationFrame(syncHeader); } }, { passive: true });
syncHeader();

// Content eases in as it reaches the screen
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.sd-head, .svc-row, .sw-card, .faq-item, .ph-grid, .ph-state, .fit-card, .logo-row, .ft-top').forEach(el => {
    const i = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--d', `${Math.min(i, 3) * .07}s`);
    el.classList.add('rv');
    io.observe(el);
  });
}

// FAQ accordion: one answer open at a time
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item'), open = !item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(o => { o.classList.remove('open'); o.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
    item.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
});

// Services list: a project card follows the cursor while a row is hovered
const peek = document.querySelector('.svc-peek');
if (peek && matchMedia('(hover: hover)').matches) {
  const pics = [...peek.querySelectorAll('img')];
  let x = 0, y = 0, tx = 0, ty = 0, rot = 0, live = false;
  const glide = () => {
    const dx = tx - x;
    x += dx * .14; y += (ty - y) * .14;
    rot += (Math.max(-10, Math.min(10, dx * .08)) - rot) * .15;
    peek.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) rotate(${rot.toFixed(2)}deg)`;
    if (live || Math.abs(dx) > .5) requestAnimationFrame(glide);
  };
  // sit just right of the cursor so the hovered name stays readable; flip left near the screen edge
  const aim = e => { const w = peek.offsetWidth; tx = e.clientX + 28 + w > innerWidth - 16 ? e.clientX - 28 - w : e.clientX + 28; ty = e.clientY; };
  document.querySelectorAll('.svc-row a').forEach(a => {
    a.addEventListener('pointerenter', e => {
      aim(e);
      if (!live) { x = tx; y = ty; live = true; requestAnimationFrame(glide); }
      pics.forEach((img, i) => img.classList.toggle('on', i === +a.dataset.peek));
      peek.classList.add('on');
    });
    a.addEventListener('pointermove', aim);
  });
  document.querySelector('.svc-list').addEventListener('pointerleave', () => {
    live = false;
    peek.classList.remove('on');
    pics.forEach(img => img.classList.remove('on'));
  });
}

// Let's Talk badge: hide it while the footer is on screen
const badge = document.querySelector('.hx-badge'), foot = document.querySelector('footer');
if (badge && foot && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => badge.classList.toggle('away', e.isIntersecting)).observe(foot);
}

// Why the name: pinned title, stacking keywords, and a marker that sweeps the text as you scroll
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('.nm-grid').forEach(nmGrid => {
  const WINDOW = 14, BRAKE = 70;                     // letters in the marker; px over which pinned items slow down
  const splitLetters = p => {
    const letters = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      for (const ch of n.nodeValue) {
        const s = document.createElement('span');
        s.className = 'z';
        s.textContent = ch;
        frag.appendChild(s);
        letters.push(s);
      }
      n.replaceWith(frag);
    });
    // keep the words readable for screen readers once they are split into letters
    const links = p.querySelectorAll('a');
    let target = p;
    if (links.length) links.forEach(a => a.setAttribute('aria-label', a.textContent));
    else {
      const text = p.textContent;
      target = document.createElement('span');
      target.setAttribute('aria-hidden', 'true');
      target.append(...p.childNodes);
      p.append(Object.assign(document.createElement('span'), { className: 'sr', textContent: text }), target);
    }
    walk(target);
    return letters;
  };
  const rows = [...nmGrid.querySelectorAll('.nm-slot')].map(slot => {
    const text = slot.querySelector('.nm-text');
    return { slot, text, letters: splitLetters(text), lo: 0, hi: -1 };
  });
  const keys = [...nmGrid.querySelectorAll('.nm-key')];
  const pinned = [nmGrid.querySelector('.nm-label'), ...keys, ...rows.map(r => r.text)];
  let parts = [], solo = false, nmTick = false;
  const nmMeasure = () => {
    solo = getComputedStyle(rows[0].text).position !== 'sticky';
    nmGrid.style.setProperty('--lh', `${pinned[0].offsetHeight}px`);
    parts = solo ? [] : pinned.map(el => {
      const box = el.parentElement, cs = getComputedStyle(box);
      return { el, start: box.getBoundingClientRect().top + scrollY + parseFloat(cs.paddingTop), stop: parseFloat(getComputedStyle(el).top) || 0 };
    });
    pinned.forEach(el => { el.style.transform = ''; });
    rows.forEach(r => {
      r.top = r.slot.getBoundingClientRect().top + scrollY;
      r.travel = r.slot.offsetHeight - r.text.offsetHeight;
      r.stop = parseFloat(getComputedStyle(r.text).top) || 0;
    });
  };
  const setWindow = (r, lo, hi) => {
    lo = Math.max(lo, 0); hi = Math.min(hi, r.letters.length - 1);
    if (lo > hi) { lo = 0; hi = -1; }
    if (lo === r.lo && hi === r.hi) return;
    for (let i = r.lo; i <= r.hi; i++) if (i < lo || i > hi) r.letters[i].classList.remove('is-hot');
    for (let i = lo; i <= hi; i++) if (i < r.lo || i > r.hi) r.letters[i].classList.add('is-hot');
    r.lo = lo; r.hi = hi;
  };
  const nmUpdate = () => {
    nmTick = false;
    const y = scrollY;
    parts.forEach(p => {                             // ease into the pin instead of stopping dead
      const gap = p.start - y - p.stop, q = gap / BRAKE;
      const extra = Math.abs(q) > 30 ? 0 : BRAKE * Math.log(1 + Math.exp(q)) - Math.max(gap, 0);
      p.el.style.transform = extra > .1 ? `translateY(${extra.toFixed(1)}px)` : '';
    });
    let current = -1;
    rows.forEach((r, i) => {
      if (solo) return setWindow(r, 0, -1);
      const t = r.travel > 0 ? Math.min(Math.max((r.stop - (r.top - y)) / r.travel, 0), 1) : 0;
      const front = Math.floor(t * (r.letters.length + 2 * WINDOW)) - WINDOW;
      setWindow(r, front - WINDOW + 1, front);
      if (r.top - y <= innerHeight * .5 && r.top + r.slot.offsetHeight - y > 0) current = i;
    });
    keys.forEach((k, i) => k.classList.toggle('is-on', i === current));
  };
  const nmKick = () => { if (!nmTick) { nmTick = true; requestAnimationFrame(nmUpdate); } };
  nmMeasure(); nmUpdate();
  addEventListener('scroll', nmKick, { passive: true });
  addEventListener('resize', () => { nmMeasure(); nmUpdate(); });
  document.fonts.ready.then(() => { nmMeasure(); nmUpdate(); });
});

// Section counter: shows which section is in view and how far through it you are
const secCount = document.getElementById('secCount');
if (secCount) {
  const secs = [...document.querySelectorAll('[data-sec]')];
  const numBox = secCount.querySelector('.num'), bar = secCount.querySelector('.bar i');
  const pad = n => String(n).padStart(2, '0');
  secCount.querySelector('.total').textContent = pad(secs.length);
  numBox.innerHTML = secs.map((_, i) => `<span>${pad(i + 1)}</span>`).join('');
  const digits = [...numBox.children];
  let cur = -1, ticking = false;
  const update = () => {
    ticking = false;
    const mid = innerHeight / 2;
    let i = 0;
    secs.forEach((el, k) => { if (el.getBoundingClientRect().top <= mid) i = k; });
    if (i !== cur) {
      cur = i;
      digits.forEach(d => d.style.transform = `translateY(${-100 * i}%)`);
    }
    // progress runs from this section's top to the next one's (or the page end)
    const start = i ? secs[i].getBoundingClientRect().top + scrollY : mid;   // first section starts empty at the very top
    const end = secs[i + 1] ? secs[i + 1].getBoundingClientRect().top + scrollY : document.documentElement.scrollHeight - innerHeight + mid;
    const p = Math.min(Math.max((scrollY + mid - start) / Math.max(end - start, 1), 0), 1);
    bar.style.transform = `scaleY(${p.toFixed(3)})`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

// Homepage hero: animate the dotted globe and let its pupils follow the pointer.
const heroGlobe = document.getElementById('globe');
const globeWrap = document.getElementById('globe-wrap');
if (heroGlobe && globeWrap) {
  const ctx = heroGlobe.getContext('2d');
  if (ctx) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let width = 0, height = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = globeWrap.clientWidth;
      height = globeWrap.clientHeight;
      heroGlobe.width = Math.round(width * dpr);
      heroGlobe.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const small = innerWidth < 700;
    const fibPoints = (count, radius, yellowEvery) => {
      const points = [], golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i, yellow = yellowEvery && i % yellowEvery === 0;
        points.push({
          x: Math.cos(theta) * r * radius, y: y * radius, z: Math.sin(theta) * r * radius,
          yellow, size: yellow ? 1.9 : 1.35
        });
      }
      return points;
    };
    const cloudPoints = (count, spread) => {
      const points = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = spread * (.62 + Math.random() * .55);
        points.push({
          x: Math.cos(angle) * radius, y: (Math.random() - .5) * spread * .5, z: Math.sin(angle) * radius,
          yellow: Math.random() > .45, size: 1.1
        });
      }
      return points;
    };
    const spherePoints = fibPoints(small ? 2100 : 3400, 1, 6);
    const dustPoints = cloudPoints(small ? 260 : 480, 1.12);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [[-1,goldenRatio,0],[1,goldenRatio,0],[-1,-goldenRatio,0],[1,-goldenRatio,0],[0,-1,goldenRatio],[0,1,goldenRatio],[0,-1,-goldenRatio],[0,1,-goldenRatio],[goldenRatio,0,-1],[goldenRatio,0,1],[-goldenRatio,0,-1],[-goldenRatio,0,1]];
    const vertices = rawVertices.map(v => {
      const length = Math.hypot(v[0], v[1], v[2]);
      return v.map(value => value / length * .58);
    });
    const edges = [];
    for (let a = 0; a < vertices.length; a++) {
      for (let b = a + 1; b < vertices.length; b++) {
        if (Math.hypot(vertices[a][0] - vertices[b][0], vertices[a][1] - vertices[b][1], vertices[a][2] - vertices[b][2]) < .75) edges.push([a, b]);
      }
    }

    let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    if (finePointer) {
      const heroEl = document.querySelector('.hero') || document.getElementById('hx-art') || document;
      heroEl.addEventListener('mousemove', event => {
        targetX = (event.clientX / innerWidth - .5) * 2;
        targetY = (event.clientY / innerHeight - .5) * 2;
      });
    }

    const camera = 3.4;
    const project = (x, y, z, scale, centerX, centerY) => {
      const perspective = camera / (camera - z);
      return [centerX + x * scale * perspective, centerY + y * scale * perspective, perspective];
    };
    const rotate = (x, y, z, angleX, angleY) => {
      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
      return [x1, y * cosX - z1 * sinX, y * sinX + z1 * cosX];
    };
    const drawPoints = (points, angleX, angleY, scale, centerX, centerY, alphaMultiplier) => {
      points.forEach(point => {
        const rotated = rotate(point.x, point.y, point.z, angleX, angleY);
        const projected = project(rotated[0], rotated[1], rotated[2], scale, centerX, centerY);
        const depth = (rotated[2] + 1.6) / 3.2;
        const alpha = (.16 + depth * .84) * alphaMultiplier;
        const size = point.size * projected[2] * (.7 + depth * .6);
        ctx.fillStyle = point.yellow
          ? `rgba(150,150,150,${alpha.toFixed(3)})`
          : `rgba(88,88,88,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(projected[0], projected[1], size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    let start = null;
    const frame = timestamp => {
      requestAnimationFrame(frame);
      if (!start) start = timestamp;
      const time = (timestamp - start) / 1000;
      mouseX += (targetX - mouseX) * .045;
      mouseY += (targetY - mouseY) * .045;
      const scale = Math.min(width, height) * .44 * (1 + Math.sin(time * .8) * .012);
      const centerX = width / 2, centerY = height / 2;
      const angleY = time * (reduced ? .03 : .16) + mouseX * .6;
      const angleX = Math.sin(time * .25) * .14 + mouseY * .4;
      ctx.clearRect(0, 0, width, height);
      drawPoints(dustPoints, angleX * .7, angleY * .55, scale, centerX, centerY, .5);

      const projectedVertices = vertices.map(vertex => {
        const rotated = rotate(vertex[0], vertex[1], vertex[2], angleX + time * .05, -angleY * 1.35);
        return project(rotated[0], rotated[1], rotated[2], scale, centerX, centerY);
      });
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(112,112,112,0.05)';
      ctx.beginPath();
      edges.forEach(edge => {
        ctx.moveTo(projectedVertices[edge[0]][0], projectedVertices[edge[0]][1]);
        ctx.lineTo(projectedVertices[edge[1]][0], projectedVertices[edge[1]][1]);
      });
      ctx.stroke();
      drawPoints(spherePoints, angleX, angleY, scale, centerX, centerY, 1);
    };
    requestAnimationFrame(frame);
  }
}

const glasses = document.getElementById('glasses');
if (glasses && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const pupils = [...glasses.querySelectorAll('.pupil')];
  let pointerX = 0, pointerY = 0, eyeFrame = null;
  const movePupils = () => {
    eyeFrame = null;
    const rect = glasses.getBoundingClientRect();
    if (!rect.width) return;
    const scaleX = 470 / rect.width, scaleY = 267 / rect.height;
    pupils.forEach(pupil => {
      const centerX = rect.left + parseFloat(pupil.dataset.px) / scaleX;
      const centerY = rect.top + parseFloat(pupil.dataset.py) / scaleY;
      const dx = pointerX - centerX, dy = pointerY - centerY;
      const distance = Math.hypot(dx, dy) || 1;
      const offset = Math.min(11, distance / 14);
      pupil.setAttribute('transform', `translate(${(dx / distance * offset).toFixed(2)} ${(dy / distance * offset).toFixed(2)})`);
    });
  };
  document.addEventListener('mousemove', event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!eyeFrame) eyeFrame = requestAnimationFrame(movePupils);
  }, { passive: true });
}

// Hero glasses: pupils follow the pointer and the eyes blink now and then.
// Once the hero scrolls away, a small copy follows the cursor around the site.
const specs = document.getElementById('hxSpecs');
if (specs) {
  const REACH = 19;                                   // lens radius minus pupil radius, minus the frame
  const rig = svg => {
    const eyes = [...svg.querySelectorAll('.eye')].map(g => ({ look: g.querySelector('.look'), ...Object.fromEntries(['cx', 'cy', 'px', 'py'].map(k => [k, +g.dataset[k]])) }));
    const lids = svg.querySelectorAll('.lid'), bridge = svg.querySelector('.bridge');
    return {
      lookAt(x, y) {                                  // x, y in viewBox units
        eyes.forEach(e => {
          const a = Math.atan2(y - e.cy, x - e.cx), d = Math.min(REACH, Math.hypot(x - e.cx, y - e.cy) / 6);
          e.look.style.transform = `translate(${(e.cx + Math.cos(a) * d - e.px).toFixed(1)}px, ${(e.cy + Math.sin(a) * d - e.py).toFixed(1)}px)`;
        });
      },
      toBox(cx, cy) {
        const r = svg.getBoundingClientRect();
        return [(cx - r.left) / r.width * 470, (cy - r.top) / r.height * 267];
      },
      blink(twice) {
        const opts = { duration: 240, iterations: twice ? 2 : 1, easing: 'ease-in-out' };
        lids.forEach(l => l.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)', offset: .45 }, { transform: 'scaleY(1)' }], opts));
        bridge.animate([{ transform: 'none' }, { transform: 'translateY(3px)', offset: .45 }, { transform: 'none' }], opts);
      }
    };
  };

  const hero = rig(specs);
  const rigs = [hero];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;

  // the follower: a copy of the hero glasses, eased towards the cursor
  let buddy = null;
  if (canHover && !reduce) {
    const copy = specs.cloneNode(true);
    ['id', 'role', 'aria-label'].forEach(a => copy.removeAttribute(a));
    copy.setAttribute('aria-hidden', 'true');
    const box = document.createElement('div');
    box.className = 'buddy';
    box.appendChild(copy);
    document.body.appendChild(box);
    buddy = { box, ...rig(copy), x: -200, y: -200, tx: -200, ty: -200, tilt: 0, inside: false, running: false };
    rigs.push(buddy);
  }
  const heroEl = document.querySelector('.hero');
  const buddyWanted = () => buddy && buddy.inside && heroEl.getBoundingClientRect().bottom < 80;
  const step = () => {
    const b = buddy;
    const dx = b.tx - b.x, dy = b.ty - b.y;
    b.x += dx * .16; b.y += dy * .16;
    b.tilt += (Math.max(-18, Math.min(18, dx * .35)) - b.tilt) * .2;   // leans into the direction of travel
    b.box.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) rotate(${b.tilt.toFixed(1)}deg)`;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(b.tilt) > .3 || b.box.classList.contains('on')) requestAnimationFrame(step);
    else b.running = false;
  };
  const syncBuddy = () => {
    if (!buddy) return;
    const want = buddyWanted();
    if (want && !buddy.box.classList.contains('on')) {        // appear right by the cursor, not across the page
      buddy.x = buddy.tx; buddy.y = buddy.ty;
    }
    buddy.box.classList.toggle('on', want);
    if (want && !buddy.running) { buddy.running = true; requestAnimationFrame(step); }
  };

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (buddy) { buddy.inside = true; buddy.tx = e.clientX + 18; buddy.ty = e.clientY + 22; }
    rigs.forEach(r => r.lookAt(...r.toBox(e.clientX, e.clientY)));
    syncBuddy();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (buddy) { buddy.inside = false; syncBuddy(); } });
  addEventListener('scroll', syncBuddy, { passive: true });

  specs.addEventListener('pointerenter', () => hero.blink(true));
  specs.addEventListener('click', () => hero.blink(true));
  if (!reduce) {
    (function loop() { setTimeout(() => { if (!document.hidden) { const t = Math.random() < .25; rigs.forEach(r => r.blink(t)); } loop(); }, 2200 + Math.random() * 3200); })();
    // on touch screens there is no cursor, so let the eyes wander
    if (!canHover) {
      const spots = [[90, 60], [400, 90], [380, 260], [60, 240], [235, 140]];
      let i = 0;
      setInterval(() => hero.lookAt(...spots[i++ % spots.length]), 1800);
    }
  }
}

// Statement: pin the card and turn the lines of one sentence away while the next turns in
const stSec = document.querySelector('.statement');
if (stSec) {
  const paras = [...stSec.querySelectorAll('[data-st]')];
  const card = stSec.querySelector('.st-card');
  const draws = stSec.querySelectorAll('.st-art .draw'), fills = stSec.querySelectorAll('.st-art .fillin');
  const lineGroups = stSec.querySelectorAll('.st-art .guides, .st-art .construct, .st-art .sketch, .st-art .handles, .st-art .nodes'), outline = stSec.querySelector('.st-art .outline');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  let lines = [];

  // split each sentence into its rendered lines
  const split = () => {
    lines = paras.map(p => {
      const text = p.dataset.text || (p.dataset.text = p.textContent.trim());
      p.innerHTML = text.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
      const rows = [];
      p.querySelectorAll('.w').forEach(w => {
        const last = rows[rows.length - 1];
        if (last && Math.abs(last.top - w.offsetTop) < 4) last.words.push(w.textContent);
        else rows.push({ top: w.offsetTop, words: [w.textContent] });
      });
      p.innerHTML = `<span class="sr">${text}</span>` +
        rows.map(r => `<span class="ln" aria-hidden="true">${r.words.join(' ')}</span>`).join('');
      return [...p.querySelectorAll('.ln')];
    });
  };

  // k: 0 = resting, 1 = fully turned away; dir -1 exits left, +1 waits on the right
  const turn = (el, k, dir) => {
    const w = card.clientWidth * .45;
    el.style.transform = k <= 0 ? 'none'
      : `translate3d(${dir * w * Math.min(1, k * 1.35)}px, 0, ${-780 * k * k}px) rotateY(${dir * 105 * k}deg)`;
  };

  const update = () => {
    const r = stSec.getBoundingClientRect();
    const pin = stSec.querySelector('.st-pin'), pinTop = (innerHeight - pin.offsetHeight) / 2;
    const p = clamp((pinTop - r.top) / (stSec.offsetHeight - pin.offsetHeight));
    const draw = clamp((innerHeight - r.top) / (innerHeight * .9));
    draws.forEach(s => s.style.strokeDashoffset = 1 - ease(draw));

    const [out, inn] = lines;
    out.forEach((el, i) => {
      const s = .14 + i * (.2 / Math.max(out.length - 1, 1));
      turn(el, ease(clamp((p - s) / .26)), -1);
    });
    inn.forEach((el, i) => {
      const s = .34 + i * (.2 / Math.max(inn.length - 1, 1));
      turn(el, 1 - ease(clamp((p - s) / .26)), 1);
    });

    // the square and circle flood with tone as the sentence changes
    const m = ease(clamp((p - .1) / .6));
    fills.forEach(f => f.style.strokeDasharray = `${m} 1`);
    // once filled, the construction lines clear away and only the soft shapes stay behind the text
    const clear = ease(clamp((p - .55) / .25));
    lineGroups.forEach(g => g.style.opacity = 1 - clear);
    outline.style.opacity = 1 - clear * .7;
  };

  let ticking = false;
  const onScrollSt = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  document.fonts.ready.then(() => {
    split();
    if (reduce) {
      paras[1].closest('.st-text').hidden = true;
      draws.forEach(s => s.style.strokeDashoffset = 0);
      fills.forEach(f => f.style.strokeDasharray = '1 0');
      lineGroups.forEach(g => g.style.opacity = 0);
      outline.style.opacity = .3;
      return;
    }
    update();
    addEventListener('scroll', onScrollSt, { passive: true });
    addEventListener('resize', () => { split(); update(); });
  });
}

// Showcase flattens as it scrolls into view
const sc = document.getElementById('showcase');
const onScroll = () => {
  const r = sc.getBoundingClientRect();
  const p = Math.min(Math.max(1 - r.top / window.innerHeight, 0), 1);
  sc.style.transform = `rotateX(${18 - 18 * p}deg) scale(${0.92 + 0.08 * p})`;
};
if (sc && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
