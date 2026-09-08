/* =============================================================================
   DIGITALVERSE — scrollytelling engine + 3D brain
   Vanilla JS, no dependencies. One rAF loop drives every scroll-linked effect;
   the hero brain runs its own loop and pauses when it leaves the screen.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // must match the 1024px tablet breakpoint in style.css: below it the pinned
// sections are laid out as normal flow and the scroll engine must not drive them
var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --------------------------------------------------------- scroll ticker */
  var readers = [];
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      var vh = window.innerHeight;
      for (var i = 0; i < readers.length; i++) readers[i](y, vh);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  var measurers = [];
  function measure() { for (var i = 0; i < measurers.length; i++) measurers[i](); }
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });

  /* ------------------------------------------------------------- progress */
  (function () {
    var fill = $('.progress__fill');
    if (!fill) return;
    readers.push(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      fill.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    });
  })();

  /* ------------------------------------------------------------ navigation */
  (function () {
    var nav = $('.nav');
    readers.push(function (y) { nav.classList.toggle('is-stuck', y > 24); });

    var burger = $('.burger');
    var menu = $('.mobile-menu');
    if (burger) {
      burger.addEventListener('click', function () {
        document.body.classList.toggle('menu-open');
        burger.setAttribute('aria-expanded', document.body.classList.contains('menu-open'));
      });
      $$('a', menu).forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('menu-open');
          burger.setAttribute('aria-expanded', 'false');
        });
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') document.body.classList.remove('menu-open');
    });
  })();

  /* -------------------------------------------------------- reveal on view */
  (function () {
    var items = $$('[data-rise]');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* =========================================================================
     HERO — the DIGITALVERSE mark rebuilt as a rotating 3D network
     The node/edge graph below is traced from the real logo, so the shape the
     visitor sees spinning is literally the brand mark with depth added.
     ====================================================================== */
  var BRAIN_N=[[50.93,23.92,10.38],[69.48,43.71,9.55],[25.77,18.76,9.28],[91.96,43.09,8.04],[34.43,51.96,7.35],[18.35,41.44,6.87],[50.1,46.19,6.25],[19.59,58.76,6.25],[31.96,68.66,6.25],[38.14,6.19,5.77],[68.25,9.28,5.15],[71.34,24.12,5.15],[81.65,57.53,5.15],[34.02,35.67,4.95],[46.6,62.89,4.95],[83.92,18.97,4.4],[90.72,27.22,4.4],[9.9,26.6,4.33],[4.12,37.32,4.12],[57.73,3.71,3.71],[81.03,32.37,3.71],[70.72,60.62,3.51],[26.6,79.18,3.3],[6.6,51.34,3.23],[61.44,59.18,2.89]];
  var BRAIN_E=[[0,1],[0,9],[0,13],[1,3],[1,6],[1,11],[2,13],[2,17],[3,12],[3,20],[4,5],[4,14],[4,18],[5,14],[5,18],[5,23],[6,24],[7,8],[7,23],[8,22],[8,23],[9,19],[10,11],[10,15],[12,21],[14,24],[16,20]];

  (function () {
    var cv = document.getElementById('brain');
    if (!cv) return;
    var ctx = cv.getContext('2d', { alpha: true });

    var CX = 50, CY = 41.25;    // centre of the traced mark
    var DEPTH = 15;             // half-thickness of the volume
    var FOCAL = 260;            // focal length, in mark units

    var P = [], edges = [], adj = [], signals = [], nodePos = [];

    /* --------------------------------------------------------------------
       The cloud is sampled off the traced logo: motes strung along each rod
       and scattered over each node's shell. Sampling surfaces rather than
       volume is what keeps the brain's outline readable.
       ----------------------------------------------------------------- */
    function build(budget) {
      P = []; edges = []; adj = []; signals = []; nodePos = [];

      var ROD = 1.6;                                  // half-width of a rod
      var N2 = BRAIN_N.map(function (n) { return { x: n[0] - CX, y: n[1] - CY, r: n[2] }; });

      function segDist(px, py, ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        var L2 = dx * dx + dy * dy;
        var t = L2 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
        var qx = ax + dx * t - px, qy = ay + dy * t - py;
        return Math.sqrt(qx * qx + qy * qy);
      }
      // is (x,y) strictly inside the union of discs and rods that form the mark?
      function inside(x, y, m) {
        for (var i = 0; i < N2.length; i++) {
          var n = N2[i], ddx = x - n.x, ddy = y - n.y;
          if (Math.sqrt(ddx * ddx + ddy * ddy) < n.r - m) return true;
        }
        for (var e = 0; e < BRAIN_E.length; e++) {
          var A = N2[BRAIN_E[e][0]], B = N2[BRAIN_E[e][1]];
          if (segDist(x, y, A.x, A.y, B.x, B.y) < ROD - m) return true;
        }
        return false;
      }

      /* -- the silhouette: points on the union's boundary only ------------
         Sampling the outline rather than every disc's surface is what makes
         the brain readable once it is turned into a particle field. */
      var outline = [];
      N2.forEach(function (n) {
        var steps = Math.max(40, Math.round(n.r * 16));
        for (var i = 0; i < steps; i++) {
          var a = (i / steps) * 6.2832;
          var x = n.x + Math.cos(a) * n.r, y = n.y + Math.sin(a) * n.r;
          if (!inside(x, y, 0.42)) outline.push([x, y]);
        }
      });
      BRAIN_E.forEach(function (e) {
        var A = N2[e[0]], B = N2[e[1]];
        var dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
        var nx = -dy / L, ny = dx / L;
        for (var t = 0; t < L; t += 0.55) {
          var cx0 = A.x + dx * (t / L), cy0 = A.y + dy * (t / L);
          [1, -1].forEach(function (sgn) {
            var x = cx0 + nx * ROD * sgn, y = cy0 + ny * ROD * sgn;
            if (!inside(x, y, 0.42)) outline.push([x, y]);
          });
        }
      });

      // thin the outline to a fixed budget — the sweep above is much denser
      // on the big discs than on the small ones
      if (outline.length > budget) {
        var step = outline.length / budget, thinned = [];
        for (var oi = 0; oi < outline.length; oi += step) thinned.push(outline[oi | 0]);
        outline = thinned;
      }

      /* -- interior fill, so each disc reads as a lit orb, not a ring ----- */
      var fill = [];
      var guard = 0;
      while (fill.length < Math.round(budget * 0.6) && guard < 60000) {
        guard++;
        var fx = (Math.random() - 0.5) * 108, fy = (Math.random() - 0.5) * 92;
        if (inside(fx, fy, 0.7)) fill.push([fx, fy]);
      }

      function mote(x, y, z, s, b) {
        P.push({ x: x, y: y, z: z, s: s, b: b,
                 ox: 0, oy: 0, vx: 0, vy: 0,
                 tw: Math.random() * 6.2832, ts: 0.7 + Math.random() * 1.6, ex: 0 });
      }

      // extrude the flat silhouette into a lens: each z slice is the outline
      // scaled toward the centre, so the front view still reads as the logo
      var slices = [
        { L: 0,     keep: 1.0,  s: [0.26, 0.5],  b: [0.72, 1.0] },
        { L: -0.5,  keep: 0.45, s: [0.22, 0.42], b: [0.5, 0.78] },
        { L: 0.5,   keep: 0.45, s: [0.22, 0.42], b: [0.5, 0.78] },
        { L: -0.88, keep: 0.22, s: [0.18, 0.34], b: [0.34, 0.55] },
        { L: 0.88,  keep: 0.22, s: [0.18, 0.34], b: [0.34, 0.55] }
      ];
      slices.forEach(function (sl) {
        var f = Math.sqrt(1 - 0.82 * sl.L * sl.L);
        var z = sl.L * DEPTH;
        outline.forEach(function (o) {
          if (Math.random() > sl.keep) return;
          mote(o[0] * f + (Math.random() - 0.5) * 0.7,
               o[1] * f + (Math.random() - 0.5) * 0.7,
               z + (Math.random() - 0.5) * 2.4,
               sl.s[0] + Math.random() * (sl.s[1] - sl.s[0]),
               sl.b[0] + Math.random() * (sl.b[1] - sl.b[0]));
        });
      });
      fill.forEach(function (o) {
        var L = (Math.random() * 2 - 1);
        var f = Math.sqrt(1 - 0.82 * L * L);
        mote(o[0] * f, o[1] * f, L * DEPTH,
             0.12 + Math.random() * 0.16, 0.26 + Math.random() * 0.32);
      });

      // a thin halo so the object sits in space rather than on it
      for (var h = 0; h < 90; h++) {
        var a2 = Math.random() * 6.2832, b2 = Math.acos(2 * Math.random() - 1);
        var R2 = 42 + Math.pow(Math.random(), 0.9) * 30;
        mote(Math.sin(b2) * Math.cos(a2) * R2 * 1.1,
             Math.sin(b2) * Math.sin(a2) * R2 * 0.78,
             Math.cos(b2) * R2 * 0.7,
             0.08 + Math.random() * 0.14,
             0.07 + Math.random() * 0.14);
      }

      /* -- the rod graph, kept for the travelling signals ----------------- */
      var layers = [-1, 0, 1], index = [];
      layers.forEach(function (L) {
        var f = Math.sqrt(1 - 0.82 * L * L), z = L * DEPTH, row = [];
        N2.forEach(function (n) {
          row.push(nodePos.length);
          nodePos.push({ x: n.x * f, y: n.y * f, z: z, r: n.r * f });
        });
        index.push(row);
      });
      layers.forEach(function (L, li) {
        BRAIN_E.forEach(function (e) { edges.push({ a: index[li][e[0]], b: index[li][e[1]] }); });
      });
      N2.forEach(function (n, i) {
        edges.push({ a: index[0][i], b: index[1][i] });
        edges.push({ a: index[1][i], b: index[2][i] });
      });
      nodePos.forEach(function () { adj.push([]); });
      edges.forEach(function (e, i) { adj[e.a].push(i); adj[e.b].push(i); });

      // flight-in start, kept well inside the focal plane
      P.forEach(function (p, i) {
        var a3 = Math.random() * 6.2832, b3 = Math.acos(2 * Math.random() - 1);
        var R3 = 110 + Math.random() * 70;
        p.sx = Math.sin(b3) * Math.cos(a3) * R3;
        p.sy = Math.sin(b3) * Math.sin(a3) * R3;
        p.sz = Math.cos(b3) * R3;
        p.delay = (i % 40) * 0.011 + Math.random() * 0.14;
      });

      for (var k = 0; k < 11; k++) {
        signals.push({ e: (Math.random() * edges.length) | 0, t: Math.random(),
                       dir: Math.random() < 0.5 ? 1 : -1, v: 0.007 + Math.random() * 0.009 });
      }
    }

    /* --------------------------------------------- additive mote sprites */
    var BUCKETS = 6, dot = [], core = null, SPR = 40;
    function buildSprites() {
      dot = [];
      for (var i = 0; i < BUCKETS; i++) {
        var k = i / (BUCKETS - 1);                    // 0 = far/deep, 1 = near/hot
        var c = document.createElement('canvas');
        c.width = c.height = SPR;
        var g = c.getContext('2d');
        var mid = mix([124, 17, 21], [236, 50, 55], Math.min(1, k * 1.5));
        var hot = mix([196, 34, 39], [255, 232, 233], k);
        var gr = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
        gr.addColorStop(0, 'rgba(' + rgbv(hot) + ',1)');
        gr.addColorStop(0.26, 'rgba(' + rgbv(hot) + ',.92)');
        gr.addColorStop(0.46, 'rgba(' + rgbv(mid) + ',.42)');
        gr.addColorStop(1, 'rgba(' + rgbv(mid) + ',0)');
        g.fillStyle = gr; g.fillRect(0, 0, SPR, SPR);
        dot.push(c);
      }
      var cc = document.createElement('canvas');
      cc.width = cc.height = 256;
      var cg = cc.getContext('2d');
      var cgr = cg.createRadialGradient(128, 128, 0, 128, 128, 128);
      cgr.addColorStop(0, 'rgba(255,214,215,.5)');
      cgr.addColorStop(0.22, 'rgba(236,50,55,.24)');
      cgr.addColorStop(0.6, 'rgba(180,26,31,.07)');
      cgr.addColorStop(1, 'rgba(140,18,22,0)');
      cg.fillStyle = cgr; cg.fillRect(0, 0, 256, 256);
      core = cc;
    }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function rgbv(c) { return (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0); }

    /* ------------------------------------------------------------ sizing */
    var W = 0, H = 0, dpr = 1, unit = 1, count = 0;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.offsetWidth; H = cv.offsetHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      unit = Math.min(W / 132, H / 116);
      var want = clamp(Math.round(W * H / 700), 360, 900);
      if (Math.abs(want - count) > 120) { count = want; build(count); }
    }

    /* ------------------------------------------------------------- state */
    var spin = 0, tiltX = 0, tiltY = 0, wantX = 0, wantY = 0;
    var intro = reduced ? 1 : 0, t0 = 0, scrollP = 0, running = true;
    var ptr = { x: -9e9, y: -9e9, on: false };
    var RAD = 150, RAD2 = RAD * RAD;

    if (mqFine.matches) {
      window.addEventListener('pointermove', function (e) {
        wantY = (e.clientX / window.innerWidth - 0.5) * 1.0;
        wantX = (e.clientY / window.innerHeight - 0.5) * -0.45;
        var r = cv.getBoundingClientRect();
        ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
        ptr.on = ptr.x > -RAD && ptr.x < r.width + RAD && ptr.y > -RAD && ptr.y < r.height + RAD;
      }, { passive: true });
      window.addEventListener('pointerleave', function () { ptr.on = false; });
    }

    var np = [];
    function frame(now) {
      if (!running) return;
      if (!t0) t0 = now;
      if (!reduced) {
        intro = clamp((now - t0) / 2100, 0, 1);
        spin = Math.sin((now - t0) * 0.00024) * 0.42 + scrollP * 1.5;
      }
      tiltY = lerp(tiltY, wantY, 0.05);
      tiltX = lerp(tiltX, wantX, 0.05);

      var ay = spin + tiltY, ax = tiltX + 0.05;
      var cy_ = Math.cos(ay), sy_ = Math.sin(ay), cx_ = Math.cos(ax), sx_ = Math.sin(ax);
      var ox = W / 2, oy = H / 2 - scrollP * H * 0.12;
      var u = unit * (1 + scrollP * 0.1);
      var tsec = now * 0.001;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // core bloom, breathing with the network
      var pulse = 0.72 + Math.sin(tsec * 0.9) * 0.12;
      var cr = Math.min(W, H) * 0.3;
      ctx.globalAlpha = pulse * intro;
      ctx.drawImage(core, ox - cr, oy - cr, cr * 2, cr * 2);

      // node positions, needed by the signals
      for (var n = 0; n < nodePos.length; n++) {
        var q = nodePos[n];
        var qx1 = q.x * cy_ + q.z * sy_, qz1 = -q.x * sy_ + q.z * cy_;
        var qy2 = q.y * cx_ - qz1 * sx_, qz2 = q.y * sx_ + qz1 * cx_;
        var qs = FOCAL / Math.max(FOCAL - qz2, 60);
        var t = np[n] || (np[n] = {});
        t.x = ox + qx1 * u * qs; t.y = oy + qy2 * u * qs; t.s = qs;
      }

      /* --- motes ------------------------------------------------------- */
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var X = p.x, Y = p.y, Z = p.z, fade = 1;
        if (intro < 1) {
          var it = clamp((intro - p.delay) / (1 - p.delay || 1), 0, 1);
          fade = 1 - Math.pow(1 - it, 4);
          X = lerp(p.sx, p.x, fade); Y = lerp(p.sy, p.y, fade); Z = lerp(p.sz, p.z, fade);
        }
        var x1 = X * cy_ + Z * sy_, z1 = -X * sy_ + Z * cy_;
        var y2 = Y * cx_ - z1 * sx_, z2 = Y * sx_ + z1 * cx_;
        var sc = FOCAL / Math.max(FOCAL - z2, 60);
        var sxp = ox + x1 * u * sc, syp = oy + y2 * u * sc;

        // cursor pushes motes aside, then a spring pulls them home
        if (ptr.on && !reduced) {
          var dx = sxp + p.ox - ptr.x, dy = syp + p.oy - ptr.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < RAD2 && d2 > 0.01) {
            var d = Math.sqrt(d2), f = (1 - d / RAD);
            var push = f * f * 5.2;
            p.vx += (dx / d) * push; p.vy += (dy / d) * push;
            p.ex = Math.min(1, p.ex + f * 0.16);
          }
        }
        p.vx = (p.vx - p.ox * 0.052) * 0.86;
        p.vy = (p.vy - p.oy * 0.052) * 0.86;
        p.ox += p.vx; p.oy += p.vy;
        p.ex *= 0.94;

        var depth = clamp((sc - 0.72) / 0.72, 0, 1);
        var twk = reduced ? 1 : 0.72 + 0.28 * Math.sin(tsec * p.ts + p.tw);
        var bright = clamp(p.b * (0.6 + depth * 0.7) * twk + p.ex * 0.9, 0, 1);
        if (bright < 0.02) continue;

        var rad = p.s * u * sc * (2.5 + p.ex * 1.5);
        if (rad < 0.4) continue;
        var bi = clamp(Math.round((depth * 0.92 + p.ex * 0.4) * (BUCKETS - 1)), 0, BUCKETS - 1);
        ctx.globalAlpha = bright * fade;
        ctx.drawImage(dot[bi], sxp + p.ox - rad, syp + p.oy - rad, rad * 2, rad * 2);
      }

      /* --- signals firing along the rods -------------------------------- */
      if (!reduced) {
        for (var si = 0; si < signals.length; si++) {
          var g = signals[si], e = edges[g.e];
          g.t += g.v * g.dir;
          if (g.t > 1 || g.t < 0) {
            var at = g.t > 1 ? e.b : e.a;
            var opts = adj[at];
            var ne = opts[(Math.random() * opts.length) | 0];
            g.e = ne; g.dir = edges[ne].a === at ? 1 : -1; g.t = edges[ne].a === at ? 0 : 1;
            e = edges[ne];
          }
          var A = np[e.a], B = np[e.b];
          if (!A || !B) continue;
          var tt = clamp(g.t, 0, 1);
          var hx = A.x + (B.x - A.x) * tt, hy = A.y + (B.y - A.y) * tt;
          var t2 = clamp(tt - 0.3 * g.dir, 0, 1);
          var lg = ctx.createLinearGradient(A.x + (B.x - A.x) * t2, A.y + (B.y - A.y) * t2, hx, hy);
          lg.addColorStop(0, 'rgba(236,50,55,0)');
          lg.addColorStop(1, 'rgba(255,190,192,.45)');
          ctx.globalAlpha = intro;
          ctx.strokeStyle = lg;
          ctx.lineWidth = Math.max(1, unit * 0.3);
          ctx.beginPath();
          ctx.moveTo(A.x + (B.x - A.x) * t2, A.y + (B.y - A.y) * t2);
          ctx.lineTo(hx, hy); ctx.stroke();
          var hr = Math.max(4, unit * 1.5);
          ctx.globalAlpha = 0.75 * intro;
          ctx.drawImage(dot[BUCKETS - 1], hx - hr, hy - hr, hr * 2, hr * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(frame);
    }

    measurers.push(resize);
    buildSprites(); resize();
    readers.push(function (y, vh) { scrollP = clamp(y / vh, 0, 1); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        running = vis;
      }, { threshold: 0 }).observe(cv);
    }
    requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------- hero: parallax */
  (function () {
    // The headline is set to fill the measure on one line. Character widths
    // change with the loaded font and the language, so fit it by measurement
    // instead of trusting a hand-tuned clamp.
    var title = $('.hero__title');
    if (title) {
      var line = $('.hero__line', title);
      function fit() {
        title.style.fontSize = '';
        if (!line) return;
        var avail = title.clientWidth;
        var natural = line.scrollWidth;
        if (!avail || !natural) return;
        if (natural > avail) {
          var base = parseFloat(getComputedStyle(title).fontSize);
          title.style.fontSize = (base * (avail / natural) * 0.995).toFixed(2) + 'px';
        }
      }
      measurers.push(fit);
      fit();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      window.addEventListener('load', fit);
    }

    var inner = $('.hero__inner');
    if (!inner || reduced) return;
    readers.push(function (y, vh) {
      if (y > vh * 1.25) return;
      var p = clamp(y / (vh * 0.9), 0, 1);
      inner.style.transform = 'translate3d(0,' + (p * 60).toFixed(1) + 'px,0)';
      inner.style.opacity = String(1 - p * 1.05);
    });
  })();

  /* --------------------------------------------------- ACT 1 · Точка А */
  (function () {
    var track = $('.pointa__track');
    if (!track) return;
    var pains = $$('.pain');
    var out = $('.pointa__out');
    var ghost = $('.pointa__ghost');
    var top = 0, span = 1;

    function m() {
      var r = track.getBoundingClientRect();
      top = r.top + window.pageYOffset;
      span = Math.max(track.offsetHeight - window.innerHeight, 1);
    }
    measurers.push(m); m();

    readers.push(function (y) {
      if (!mqDesktop.matches) return;
      var p = clamp((y - top) / span, 0, 1);
      var n = pains.length;
      var seg = 1 / (n + 0.6);
      pains.forEach(function (el, i) {
        el.classList.toggle('is-live', p >= i * seg - seg * 0.35);
        el.classList.toggle('is-struck', p >= i * seg + seg * 0.5);
      });
      if (out) out.classList.toggle('is-live', p >= n * seg - seg * 0.15);
      if (ghost) ghost.style.transform =
        'translate(-50%,-50%) scale(' + (1 + p * 0.25).toFixed(3) + ')';
    });
  })();

  /* ------------------------------------------ ACT 2 · экосистема (h-scroll) */
  (function () {
    var track = $('.eco__track');
    var rail = $('.eco__rail');
    var bar = $('.eco__bar i');
    if (!track || !rail) return;
    var panels = $$('.eco__panel', rail);
    var top = 0, span = 1, dist = 0;

    function m() {
      if (!mqDesktop.matches) {
        track.style.height = '';
        rail.style.transform = '';
        panels.forEach(function (p) { p.classList.add('is-near'); p.style.transform = ''; });
        return;
      }
      track.style.height = (panels.length * 100) + 'vh';
      var r = track.getBoundingClientRect();
      top = r.top + window.pageYOffset;
      span = Math.max(track.offsetHeight - window.innerHeight, 1);
      dist = Math.max(rail.scrollWidth - window.innerWidth, 0);
    }
    measurers.push(m); m();

    readers.push(function (y) {
      if (!mqDesktop.matches) return;
      var p = clamp((y - top) / span, 0, 1);
      rail.style.transform = 'translate3d(' + (-dist * p).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';

      var mid = window.innerWidth / 2;
      panels.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var c = (r.left + r.right) / 2;
        var off = clamp((c - mid) / window.innerWidth, -1, 1);
        el.classList.toggle('is-near', Math.abs(off) < 0.22);
        // panels swing away in depth as they leave the middle of the stage
        el.style.transform = 'perspective(1400px) rotateY(' + (-off * 26).toFixed(2) + 'deg) ' +
                             'scale(' + (1 - Math.abs(off) * 0.13).toFixed(3) + ')';
      });
    });
  })();

  /* ------------------------------------------------------------- counters */
  (function () {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var dur = 1400, t0 = performance.now();
      (function step(t) {
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.firstChild.nodeValue = Math.round(to * e).toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    if (reduced || !('IntersectionObserver' in window)) {
      nums.forEach(function (el) {
        el.firstChild.nodeValue = parseFloat(el.getAttribute('data-count')).toLocaleString('ru-RU');
      });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* -------------------------------------------- ACT 4 · кейсы, sticky ROI */
  (function () {
    var cases = $$('.case');
    if (!cases.length) return;
    var roi = $('.stage__roi b');
    var profit = $('.stage__profit .js-profit');
    var invest = $('.stage__profit .js-x');
    var name = $('.stage__tag em');
    var note = $('.stage__note');
    var current = -1;

    // each target keeps its own rAF handle — a shared one would let the second
    // call cancel the first number mid-count
    function animateTo(el, to, prefix, group) {
      var t0 = performance.now(), dur = 900;
      function step(t) {
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        var v = Math.round(to * e);
        el.textContent = (prefix || '') + (group ? v.toLocaleString('ru-RU') : String(v));
        if (p < 1) el._anim = requestAnimationFrame(step);
      }
      if (el._anim) cancelAnimationFrame(el._anim);
      el._anim = requestAnimationFrame(step);
    }

    function show(i) {
      if (i === current) return;
      current = i;
      var el = cases[i];
      cases.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      // ROI is never grouped — "8 150%" wrapped and broke the stage layout
      if (roi) animateTo(roi, parseFloat(el.dataset.roi), '', false);
      if (profit) animateTo(profit, parseFloat(el.dataset.profit), '$', true);
      if (invest) invest.textContent = el.dataset.x;
      if (name) name.textContent = el.dataset.name;
      if (note) note.textContent = el.dataset.note;
    }

    // pick whichever card is closest to the middle of the viewport — an
    // IntersectionObserver band let the stage disagree with the visible card
    readers.push(function (y, vh) {
      var mid = vh * (mqDesktop.matches ? 0.5 : 0.62);
      var best = -1, bd = Infinity;
      for (var i = 0; i < cases.length; i++) {
        var r = cases[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0) show(best);
    });
    show(0);
  })();

  /* ---------------------------------------------- 3D tilt on pointer hover */
  (function () {
    if (reduced || !mqFine.matches) return;
    $$('[data-tilt]').forEach(function (el) {
      var raf = null, tx = 0, ty = 0;
      function apply() {
        raf = null;
        el.style.transform = 'perspective(900px) rotateX(' + ty.toFixed(2) + 'deg) rotateY(' +
                             tx.toFixed(2) + 'deg) translateZ(6px)';
      }
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 9;
        ty = ((e.clientY - r.top) / r.height - 0.5) * -7;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        el.style.transform = '';
      });
    });
  })();

  /* ------------------------------------------------------------------ FAQ */
  (function () {
    $$('.qa__q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qa = btn.closest('.qa');
        var open = qa.classList.contains('is-open');
        $$('.qa').forEach(function (o) {
          o.classList.remove('is-open');
          $('.qa__q', o).setAttribute('aria-expanded', 'false');
        });
        if (!open) { qa.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  })();

  /* --------------------------------------------------------- chapters rail */
  (function () {
    var rail = $('.chapters');
    if (!rail) return;
    var btns = $$('button', rail);
    var targets = btns.map(function (b) { return document.getElementById(b.dataset.go); });

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.dataset.go);
        if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 40, behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    var navLinks = $$('.nav__links a');
    readers.push(function (y, vh) {
      rail.classList.toggle('is-on', y > vh * 0.7);
      var active = 0;
      targets.forEach(function (t, i) {
        if (t && t.getBoundingClientRect().top <= vh * 0.45) active = i;
      });
      btns.forEach(function (b, i) { b.classList.toggle('is-active', i === active); });
      var id = btns[active] && btns[active].dataset.go;
      navLinks.forEach(function (a) {
        a.classList.toggle('is-current', a.getAttribute('href') === '#' + id);
      });
    });
  })();

  /* ----------------------------------------------------------------- form */
  (function () {
    var form = $('.form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Статическая демо-версия: подключите свой endpoint / CRM здесь.
      form.classList.add('is-sent');
    });
  })();

  /* smooth anchors that respect the fixed header */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var t = document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      window.scrollTo({
        top: t.getBoundingClientRect().top + window.pageYOffset - 50,
        behavior: reduced ? 'auto' : 'smooth'
      });
    });
  });

  measure();
  onScroll();
  window.addEventListener('load', function () { measure(); onScroll(); });
})();
