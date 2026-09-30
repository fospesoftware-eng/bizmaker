/* ═══════════════════════════════════════════════════════════
   BIZMAKER — interaction & motion engine
   Brand objects only · scroll parallax · 3D tilt · diagrams
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, n) => a + (b - a) * n;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────── BRAND MEDIA FALLBACKS ─────────── */
  // While cinematic imagery is loading/unavailable, host containers receive
  // a brand-grade emerald + bronze treatment with a faint crest watermark.
  const MEDIA_HOST_SEL = ".hero__bg,.land__bg,.panel__media,.tile__media,.card__media,.insight__media,.mega-col__featureimg";
  const markFallback = img => {
    const host = img.closest?.(MEDIA_HOST_SEL);
    if (host && !host.classList.contains("is-fallback")) host.classList.add("is-fallback");
  };
  document.addEventListener("error", e => {
    const t = e.target;
    if (t && t.tagName === "IMG" && t.closest?.(MEDIA_HOST_SEL)) markFallback(t);
  }, true);
  $$(MEDIA_HOST_SEL).forEach(host => {
    $$("img", host).forEach(img => {
      if (img.complete && img.naturalWidth === 0) markFallback(img);
      else img.addEventListener("error", () => markFallback(img), { once: true });
    });
  });

  /* ─────────── THEME ─────────── */
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("bizmaker-theme");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  $("#themeToggle")?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("bizmaker-theme", next);
  });

  /* ─────────── HERO INTRO ─────────── */
  const body = document.body;
  const heroEl = $("#hero");
  const heroIntro = () => {
    heroEl?.classList.add("hero--in");
    $$(".hero [data-reveal]").forEach((el, i) => setTimeout(() => el.classList.add("in"), 120 + i * 130));
    $(".hero__title")?.classList.add("in");
  };
  if (document.readyState === "complete") setTimeout(heroIntro, 60);
  else window.addEventListener("load", () => setTimeout(heroIntro, 60));

  /* ─────────── HEADER / PROGRESS ─────────── */
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header.classList.toggle("scrolled", y > 40);
      const h = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
      parallaxFrame(y);
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ─────────── SCROLL PARALLAX ─────────── */
  const pxBg = $$("[data-parallax-bg]");
  const pxSlow = $$("[data-parallax-slow]");
  const heroSceneEl = $("#heroScene");
  const heroInnerEl = $(".hero__inner");
  function parallaxFrame(y) {
    pxBg.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const prog = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.translate = `0 ${(-prog * 70).toFixed(1)}px`;
    });
    pxSlow.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const prog = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.translate = `0 ${(-prog * 46).toFixed(1)}px`;
    });
    // hero cinematic scroll-out
    if (heroEl && !reduced) {
      const hr = heroEl.getBoundingClientRect();
      if (hr.bottom > 0 && hr.top < innerHeight) {
        const p = Math.min(1.6, -hr.top / innerHeight);
        if (heroSceneEl) {
          heroSceneEl.style.transform = `translate3d(${(p * 46).toFixed(1)}px, ${(p * 130).toFixed(1)}px, 0) rotateX(${(p * 5).toFixed(2)}deg) rotateY(${(-p * 3).toFixed(2)}deg)`;
          heroSceneEl.style.opacity = Math.max(0, 1 - p * 1.15).toFixed(3);
        }
        if (heroInnerEl) {
          heroInnerEl.style.translate = `0 ${(-p * 78).toFixed(1)}px`;
          heroInnerEl.style.opacity = Math.max(0, 1 - p * 1.45).toFixed(3);
        }
      }
    }
  }
  onScroll();

  /* ─────────── HERO SCENE DEPTH PARALLAX ─────────── */
  const scene = $("#heroScene");
  if (heroEl && scene && !reduced) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    heroEl.addEventListener("pointermove", e => {
      const r = heroEl.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - .5;
      my = (e.clientY - r.top) / r.height - .5;
    }, { passive: true });
    heroEl.addEventListener("pointerleave", () => { mx = 0; my = 0; });
    setTimeout(() => { if (heroEl.classList.contains("hero--in")) scene.style.transition = "none"; }, 2000);
    (function loop() {
      cx = lerp(cx, mx, .045); cy = lerp(cy, my, .045);
      scene.querySelectorAll("[data-depth]").forEach(el => {
        const d = parseFloat(el.dataset.depth);
        el.style.translate = `${(-cx * d).toFixed(2)}px ${(-cy * d).toFixed(2)}px`;
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ─────────── HERO GOLD DUST (cursor-aware) ─────────── */
  (function heroParticles() {
    const canvas = $("#heroParticles");
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1, particles = [], raf = null, running = false;

    // cursor state
    let mxP = -9999, myP = -9999;
    heroEl.addEventListener("pointermove", e => {
      const r = canvas.getBoundingClientRect();
      mxP = e.clientX - r.left;
      myP = e.clientY - r.top;
    }, { passive: true });
    heroEl.addEventListener("pointerleave", () => { mxP = -9999; myP = -9999; });

    // one pre-rendered glow sprite keeps each frame cheap (drawImage only)
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 48;
    const sctx = sprite.getContext("2d");
    const sg = sctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    sg.addColorStop(0, "rgba(255,244,218,1)");
    sg.addColorStop(.28, "rgba(232,205,158,.85)");
    sg.addColorStop(.62, "rgba(196,154,108,.28)");
    sg.addColorStop(1, "rgba(196,154,108,0)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 48, 48);

    const N = innerWidth < 960 ? 30 : 52;
    function seed(p, randomY) {
      p.x = Math.random() * W;
      p.y = randomY ? Math.random() * H : H + 12;
      p.r = .5 + Math.pow(Math.random(), 1.7) * 1.9;
      p.vx = (Math.random() - .5) * .12;
      p.vy = -(0.05 + Math.random() * .22);
      p.ph = Math.random() * Math.PI * 2;
      p.ps = .6 + Math.random() * 1.5;
      p.a = .25 + Math.random() * .6;
    }
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.75);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: N }, () => {
        const p = {}; seed(p, true); return p;
      });
    }
    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      const influenceR = 140;
      for (const p of particles) {
        // gentle cursor attraction within 140px radius
        if (mxP > -9000 && myP > -9000) {
          const dx = mxP - p.x, dy = myP - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < influenceR * influenceR) {
            const f = (1 - Math.sqrt(d2) / influenceR) * .08;
            p.vx += dx * f * .01;
            p.vy += dy * f * .01;
          }
        }
        // viscous damping on x to prevent runaway
        p.vx *= .985; p.vy = Math.max(p.vy, -.5);

        p.x += p.vx; p.y += p.vy; p.ph += .012 * p.ps;
        if (p.y < -14 || p.x < -20 || p.x > W + 20) seed(p, false);
        const tw = .55 + .45 * Math.sin(p.ph);
        ctx.globalAlpha = p.a * tw;
        const s = p.r * 5.2;
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    start();
    addEventListener("resize", resize, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(en => en[0].isIntersecting ? start() : stop(), { threshold: 0 })
        .observe(heroEl);
    }
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  })();

  /* ─────────── 3D TILT ─────────── */
  if (!reduced) {
    const tiltEls = $$("[data-tilt]");
    tiltEls.forEach(card => {
      let raf; let active = false;
      // wait for CSS entrance to complete before JS takes over
      setTimeout(() => { active = true; card.style.transition = "none"; }, 1300);
      card.addEventListener("pointermove", e => {
        if (!active) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(1400px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
        });
      });
      card.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        if (active) card.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
      });
    });

    // orbit scene gentle tilt
    const orbitScene = $("#orbitScene");
    const orbit = $("#orbit");
    if (orbit && orbitScene) {
      orbit.addEventListener("mousemove", e => {
        const r = orbit.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        orbitScene.style.transform =
          `perspective(900px) rotateX(${(10 - py * 14).toFixed(2)}deg) rotateY(${(px * 16).toFixed(2)}deg)`;
      });
      orbit.addEventListener("mouseleave", () => { orbitScene.style.transform = ""; });
    }
  }

  /* ─────────── LIVE DUBAI TOP 10 MARKET DECK (hero crest) ─────────── */
  (function () {
    const btn = $("#medallionBtn");
    const stage = btn ? btn.closest(".hero__stage3d") : null;
    const deck = $("#marketDeck");
    const viewport = $("#marketViewport");
    const track = $("#marketTrack");
    if (!btn || !stage || !deck || !viewport || !track) return;

    /* ranked by average land price (AED / sqft) — Dubai top 10 land areas */
    const IMG = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?image_size=square_hd&prompt=";
    const listings = [
      { name: "Palm Jumeirah", avg: 3500, trend: 8.2,
        spark: [12,14,13,17,19,21,25],
        q: "aerial view of Palm Jumeirah island with luxury villas, fronds and turquoise Arabian gulf sea at golden hour, Dubai, photorealistic" },
      { name: "Emirates Hills", avg: 3200, trend: 5.6,
        spark: [18,19,17,20,22,21,24],
        q: "luxury mansions with pools and landscaped gardens around a lake in Emirates Hills, Dubai, golden afternoon light, photorealistic" },
      { name: "Jumeirah Bay Island", avg: 3000, trend: 11.3,
        spark: [10,12,11,14,18,22,27],
        q: "exclusive waterfront villas and yachts on Jumeirah Bay Island with Dubai skyline, sunset, photorealistic aerial view" },
      { name: "Dubai Hills Estate", avg: 2400, trend: 6.1,
        spark: [16,17,19,18,21,23,25],
        q: "elegant villas beside manicured golf course fairways and palm trees, Dubai Hills Estate, warm evening light, photorealistic" },
      { name: "Dubai Marina", avg: 2200, trend: -2.4,
        spark: [24,25,23,22,21,22,21],
        q: "illuminated glass skyscraper towers along the marina canal with yachts, Dubai Marina at night, photorealistic" },
      { name: "Downtown Dubai", avg: 2100, trend: 3.8,
        spark: [20,19,21,22,21,23,24],
        q: "Burj Khalifa and dancing fountains surrounded by luxury towers, Downtown Dubai at blue hour, photorealistic" },
      { name: "Business Bay", avg: 1800, trend: 4.2,
        spark: [17,18,17,19,20,21,22],
        q: "modern glass towers overlooking Dubai Water Canal with footbridge, Business Bay at dusk, photorealistic" },
      { name: "Dubai Creek Harbour", avg: 1600, trend: 9.7,
        spark: [11,12,13,15,18,21,24],
        q: "modern waterfront towers and skyline along Dubai Creek at twilight, Dubai Creek Harbour, photorealistic" },
      { name: "Jumeirah Village Circle", avg: 950, trend: -1.8,
        spark: [22,23,22,21,22,21,21],
        q: "residential townhouses and parks in Jumeirah Village Circle, Dubai, warm afternoon sun, photorealistic" },
      { name: "Dubai Silicon Oasis", avg: 720, trend: 2.1,
        spark: [19,20,19,20,21,21,22],
        q: "modern tech park buildings and green boulevards in Dubai Silicon Oasis, midday, photorealistic aerial" }
    ];

    const fallback = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#1b5740"/><stop offset="1" stop-color="#072118"/></linearGradient></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/>' +
      '<path d="M30 150V95l28-22 28 22v55zM100 150V72l34-26 34 26v78z" fill="none" stroke="#d8b898" stroke-width="3" opacity=".75"/>' +
      '<rect width="200" height="200" fill="none" stroke="rgba(216,184,152,.5)" stroke-width="4"/></svg>'
    );

    const nf = n => n.toLocaleString("en-US");
    /* mini sparkline SVG from a value array, colored by trend sign */
    const sparkSVG = (pts, up) => {
      const w = 38, h = 14, pad = 1;
      const min = Math.min(...pts), max = Math.max(...pts);
      const span = max - min || 1;
      const d = pts.map((v, i) => {
        const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
        const y = (h - pad) - ((v - min) / span) * (h - pad * 2);
        return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
      }).join(" ");
      const col = up ? "#7fe6b0" : "#ff8a7a";
      return `<svg class="listing__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    };
    const rowHTML = (l, i) => {
      const up = l.trend >= 0;
      const arrow = up ? "▲" : "▼";
      const cls = up ? "up" : "down";
      return `
      <article class="listing">
        <span class="listing__rank">${String(i + 1).padStart(2, "0")}</span>
        <span class="listing__thumb"><img src="${IMG + encodeURIComponent(l.q)}" alt="${l.name}, Dubai land"
          loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,${fallback}'"></span>
        <div class="listing__body">
          <span class="listing__type">LAND</span>
          <h4>${l.name}</h4>
          <p class="listing__loc">Dubai · UAE</p>
          <div class="listing__meta">
            <span class="listing__area"><svg viewBox="0 0 12 12"><path d="M1 6.5L6 2l5 4.5M2.6 5.6V10.4h6.8V5.6" fill="none" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg>AED ${nf(l.avg)}/sqft</span>
            <span class="listing__trend listing__trend--${cls}">${arrow} ${Math.abs(l.trend).toFixed(1)}% ${sparkSVG(l.spark, up)}</span>
          </div>
        </div>
      </article>`;
    };

    const oneSet = listings.map(rowHTML).join("");
    track.innerHTML = reduced ? oneSet : oneSet + oneSet; /* duplicate for seamless loop */

    /* ticker stats (in-card header no longer shows them — keep computed if needed) */
    const totalVal = listings.reduce((a, l) => a + l.price, 0);
    const avgArea = Math.round(listings.reduce((a, l) => a + l.sqft, 0) / listings.length / 10) * 10;
    const $mkValue = $("#mkValue"), $mkArea = $("#mkArea");
    if ($mkValue) $mkValue.textContent = `AED ${totalVal.toFixed(1)}M`;
    if ($mkArea) $mkArea.textContent = `${nf(avgArea)} SQFT`;

    /* ── seamless top → bottom auto-scroll ── */
    const SPEED = 26; /* px per second */
    let isOpen = false, paused = false, raf = 0, y = 0, last = 0;

    function frame(t) {
      if (!isOpen) return;
      if (!last) last = t;
      const dt = Math.min((t - last) / 1000, .1);
      last = t;
      if (!paused && !document.hidden && !reduced) {
        y += SPEED * dt;
        const half = track.scrollHeight / 2;
        if (half && y >= half) y -= half;
        viewport.scrollTop = y;
      }
      raf = requestAnimationFrame(frame);
    }
    viewport.addEventListener("pointerenter", () => { paused = true; });
    viewport.addEventListener("pointerleave", () => { paused = false; });

    function staggerRows() {
      deck.classList.add("market--rows");
      track.querySelectorAll(".listing").forEach((el, i) => {
        el.classList.remove("in");
        void el.offsetWidth; /* restart entrance */
        el.style.transitionDelay = ((i % 10) * 55) + "ms";
        el.classList.add("in");
      });
    }

    function openMarket() {
      isOpen = true;
      stage.classList.add("is-open");
      deck.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
      setTimeout(staggerRows, 160);
    }
    function closeMarket() {
      if (!isOpen) return;
      isOpen = false;
      cancelAnimationFrame(raf);
      stage.classList.remove("is-open");
      deck.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
      y = 0; viewport.scrollTop = 0;
      setTimeout(() => deck.classList.remove("market--rows"), 500);
    }
    btn.addEventListener("click", () => (isOpen ? closeMarket() : openMarket()));
    const closeBtn = $("#marketClose");
    if (closeBtn) closeBtn.addEventListener("click", e => { e.stopPropagation(); closeMarket(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMarket(); });

    /* auto-open the live feed card when the markets section scrolls into view */
    const marketsSection = deck.closest(".hero--markets");
    if (marketsSection && "IntersectionObserver" in window) {
      const reveal = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) { openMarket(); reveal.disconnect(); }
        });
      }, { threshold: 0.2 });
      reveal.observe(marketsSection);
    } else {
      setTimeout(openMarket, 900);
    }
  })();

  /* ─────────── REVEALS ─────────── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add("in", "in-view");
        io.unobserve(en.target);
      }
    });
  }, { threshold: .14, rootMargin: "0px 0px -6% 0px" });

  $$("[data-reveal], [data-reveal-lines]").forEach((el, i, all) => {
    // gentle stagger among same-parent reveals
    const sibs = $$(":scope > *", el.parentElement).filter(n => n.hasAttribute("data-reveal"));
    const idx = sibs.indexOf(el);
    if (idx > 0 && idx < 5) el.style.transitionDelay = `${idx * 90}ms`;
    io.observe(el);
  });
  // group in-view triggers for diagram animations
  ["#pillars", "#chain", "#orbit", ".network"].forEach(sel => {
    const el = $(sel);
    if (el) io.observe(el);
  });

  /* ─────────── MEGA MENUS ─────────── */
  const items = $$(".has-mega");
  let openItem = null, closeTimer;
  function closeMega() {
    openItem?.classList.remove("open");
    const m = $(".mega.open"); m?.classList.remove("open");
    openItem = null;
  }
  function openMega(item) {
    clearTimeout(closeTimer);
    if (openItem === item) return;
    closeMega();
    openItem = item;
    item.classList.add("open");
    $(`#mega-${item.dataset.menu}`)?.classList.add("open");
  }
  items.forEach(item => {
    const panel = $(`#mega-${item.dataset.menu}`);
    item.addEventListener("mouseenter", () => {
      if (innerWidth > 1100) openMega(item);
    });
    item.addEventListener("mouseleave", () => {
      if (innerWidth > 1100) closeTimer = setTimeout(closeMega, 140);
    });
    panel?.addEventListener("mouseenter", () => clearTimeout(closeTimer));
    panel?.addEventListener("mouseleave", () => { closeTimer = setTimeout(closeMega, 140); });
    $("button", item).addEventListener("click", e => {
      e.stopPropagation();
      openItem === item ? closeMega() : openMega(item);
    });
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".has-mega, .mega")) closeMega();
  });
  $$(".mega a").forEach(a => a.addEventListener("click", closeMega));

  /* ─────────── MOBILE DRAWER ─────────── */
  const burger = $("#burger");
  const drawer = $("#drawer");
  const setDrawer = on => {
    drawer.classList.toggle("open", on);
    drawer.setAttribute("aria-hidden", String(!on));
    root.classList.toggle("lux-lock", on);
  };
  burger?.addEventListener("click", () => setDrawer(!drawer.classList.contains("open")));
  $$(".drawer a").forEach(a => a.addEventListener("click", () => setDrawer(false)));

  /* ─────────── OPPORTUNITIES RAIL (drag) ─────────── */
  const rail = $("#rail");
  const railWrap = $(".railwrap");
  const railProgress = $("#railProgress");
  const railHint = $("#railHint");
  if (rail && railWrap) {
    let down = false, startX = 0, startScroll = 0, moved = false;
    railWrap.addEventListener("pointerdown", e => {
      down = true; moved = false;
      startX = e.clientX; startScroll = rail.scrollLeft;
      rail.classList.add("dragging");
      rail.setPointerCapture(e.pointerId);
    });
    railWrap.addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) { moved = true; railWrap.classList.add("dragging"); }
      rail.scrollLeft = startScroll - dx;
    });
    const endDrag = () => {
      down = false;
      rail.classList.remove("dragging");
      railWrap.classList.remove("dragging");
      if (moved && railHint) railHint.style.opacity = "0";
    };
    railWrap.addEventListener("pointerup", endDrag);
    railWrap.addEventListener("pointercancel", endDrag);
    rail.addEventListener("scroll", () => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (railProgress) railProgress.style.width = `${max > 0 ? rail.scrollLeft / max * 100 : 0}%`;
    }, { passive: true });
    // prevent click-through after drag
    rail.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }

  /* ─────────── ORBIT DIAGRAM ─────────── */
  const orbitNodes = $$("#orbitNodes .orbit-node");
  const spokesWrap = $(".orbit__spokes");
  if (orbitNodes.length) {
    const R = 43.2; // % from centre
    orbitNodes.forEach(node => {
      const a = parseFloat(node.dataset.angle) * Math.PI / 180 - Math.PI / 2;
      const x = Math.cos(a) * R;
      const y = Math.sin(a) * R;
      node.style.left = `calc(50% + ${x.toFixed(2)}%)`;
      node.style.top  = `calc(50% + ${y.toFixed(2)}%)`;
      node.style.transform = "translate(-50%, -50%)";
    });
    // spokes
    if (spokesWrap) {
      for (let i = 0; i < 12; i++) {
        const s = document.createElement("span");
        s.style.transform = `rotate(${i * 30}deg)`;
        s.style.position = "absolute";
        s.style.left = "50%"; s.style.top = "50%";
        s.style.width = "43%"; s.style.height = "1px";
        s.style.transformOrigin = "left center";
        s.style.background = "linear-gradient(90deg, rgba(196,154,108,.22), transparent)";
        spokesWrap.appendChild(s);
      }
    }
    // sequential activation pulse
    if (!reduced) {
      let k = 0;
      setInterval(() => {
        orbitNodes.forEach(n => n.classList.remove("is-active"));
        orbitNodes[k % orbitNodes.length].classList.add("is-active");
        k++;
      }, 1600);
    }
  }

  /* ─────────── NETWORK DOT FIELD ─────────── */
  const netDots = $("#netDots");
  if (netDots) {
    const NS = "http://www.w3.org/2000/svg";
    const W = 620, H = 560, gap = 30;
    const hubs = [[330,300],[170,90],[250,120],[130,190],[400,110],[90,240],[520,70],[560,250],[520,380],[280,370]];
    let html = "";
    for (let yy = 14; yy < H; yy += gap) {
      for (let xx = 14; xx < W; xx += gap) {
        let near = false;
        for (const [hx, hy] of hubs) {
          if (Math.hypot(xx - hx, yy - hy) < 66) { near = true; break; }
        }
        const chance = near ? .55 : .13;
        if (Math.random() < chance) {
          const r = near ? 1.5 : 1;
          const o = near ? .4 : .22;
          const tw = Math.random() < .18 ? ` class="dot-tw"` : "";
          html += `<circle cx="${xx + (Math.random()*8-4)}" cy="${yy + (Math.random()*8-4)}" r="${r}" opacity="${o}"${tw}/>`;
        }
      }
    }
    netDots.innerHTML = html;
  }

  /* ─────────── NETWORK NODE ENTRANCE WRAPPERS
     CSS transform on the <g> would override its SVG translate attribute and
     collapse all nodes to (0,0); scale an inner wrapper instead. ─────────── */
  $$("#netNodes .node").forEach(node => {
    const NS = "http://www.w3.org/2000/svg";
    const inner = document.createElementNS(NS, "g");
    inner.setAttribute("class", "node__in");
    while (node.firstChild) inner.appendChild(node.firstChild);
    node.appendChild(inner);
  });

  /* ─────────── SVG DRAW ANIMATIONS (normalised path length) ─────────── */
  $$("#chainPath, #netArcs path").forEach(p => p.setAttribute("pathLength", "1"));

  /* ─────────── NETWORK TIER ↔ MAP REGION FOCUS ─────────── */
  const netMap = $("#networkMap");
  if (netMap) {
    $$(".network__tiers .tier").forEach(tier => {
      const cls = `is-region--${tier.dataset.region}`;
      tier.addEventListener("pointerenter", () => netMap.classList.add(cls));
      tier.addEventListener("pointerleave", () => netMap.classList.remove(cls));
    });
  }

  /* ─────────── SMOOTH OFFSET FOR ANCHORS (header height) ─────────── */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - (innerWidth > 1100 ? 68 : 0);
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    });
  });
})();
