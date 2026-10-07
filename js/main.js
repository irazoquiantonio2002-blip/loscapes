/* ==========================================================================
   Los Capes | main.js
   JavaScript nativo. Lenis (scroll suave) se carga de forma diferida solo en
   escritorio; si no carga, todo funciona con el scroll nativo.

   Cada módulo vive dentro de safe() para que un fallo aislado no rompa el
   resto de la página.

   Índice
     0.  Configuración, utilidades y bus de scroll
     1.  Loader
     2.  Scroll suave (Lenis) y anclas
     3.  Header: estado, ocultar al bajar, progreso, píldora de navegación
     4.  Menú móvil
     5.  Texto partido (letras del hero y palabras de títulos)
     6.  Revelado al hacer scroll + texto "scramble"
     7.  Contadores
     8.  Hero: burbujas de aceite y migajas doradas (canvas) + parallax
     9.  Hero: salida con scroll
     10. (sección eliminada)
     11. Parallax de imágenes y palabra del footer
     12. Proceso: scroll horizontal fijado (escritorio)
     13. Ticker con inclinación según velocidad
     14. Tilt 3D, spotlight y botones magnéticos
     15. Cursor personalizado
     16. Horario en vivo (estado, reloj, semana, promo)
     17. Pedido: carrito, panel, formulario → WhatsApp
     18. Galería: visor de fotos
     19. Preguntas frecuentes (altura animada)
     20. Volver arriba, burbuja de WhatsApp y año
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     0. Configuración, utilidades y bus de scroll
     ------------------------------------------------------------------------ */
  var CONFIG = {
    phone: "526682452744",
    timeZone: "America/Mazatlan",
    openHour: 9,
    closeHour: 16,
    closedWeekday: 2,          /* martes */
    promoWeekdays: [1, 4],       /* promo 2×$65: solo lunes y jueves */
    promoPairPrice: 65,
    headerOffset: 84,
    storageKey: "loscapes-order-v2"
  };

  /* Catálogo. "promo: true" marca los tacos que entran en el 2×$65 (solo camarón sencillo).
     Las bebidas no tienen foto: se muestran con icono y color propio. */
  var PRODUCTS = {
    "camaron":       { name: "Taco de camarón capeado", short: "Taco de camarón", price: 40, group: "taco", promo: true, img: "img/gallery-1.jpg" },
    "camaron-queso": { name: "Taco de camarón relleno de queso", short: "Camarón relleno de queso", price: 45, group: "taco", promo: false, img: "img/taco-camaron.jpg" },
    "pescado":       { name: "Taco de pescado capeado", short: "Taco de pescado", price: 35, group: "taco", promo: false, img: "img/gallery-2.jpg" },
    "pescado-queso": { name: "Taco de pescado relleno de queso", short: "Pescado relleno de queso", price: 40, group: "taco", promo: false, img: "img/taco-pescado.jpg" },
    "limonada":      { name: "Limonada mineral", short: "Limonada mineral", price: 30, group: "drink", icon: "i-lemon", tone: "lime" },
    "uvola":         { name: "Uvola", short: "Uvola", price: 30, group: "drink", icon: "i-bottle", tone: "grape" },
    "coca":          { name: "Coca-Cola", short: "Coca-Cola", price: 25, group: "drink", icon: "i-can", tone: "red" }
  };

  /* Miniatura de un producto: foto para tacos, icono de color para bebidas */
  function productThumb(p, cls) {
    if (p.img) return '<img class="' + cls + '__thumb" src="' + p.img + '" alt="" width="64" height="64" loading="lazy" decoding="async">';
    return '<span class="' + cls + '__icon drink--' + p.tone + '" aria-hidden="true"><svg class="i"><use href="#' + p.icon + '"/></svg></span>';
  }

  var html = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Estado compartido entre módulos */
  var App = {
    lenis: null,
    loaded: false,
    heroShift: 0,
    locks: {},
    lock: function (key) {
      App.locks[key] = true;
      html.classList.add("is-locked");
      if (App.lenis) App.lenis.stop();
    },
    unlock: function (key) {
      delete App.locks[key];
      if (Object.keys(App.locks).length) return;
      html.classList.remove("is-locked");
      if (App.lenis) App.lenis.start();
    },
    closeMenu: function () {},
    closeDrawer: function () {},
    isPromoDay: function () { return false; }
  };

  function safe(fn) {
    try { fn(); } catch (err) { if (window.console) console.error("[Los Capes]", err); }
  }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function money(n) { return "$" + n.toLocaleString("es-MX"); }
  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function onLoaded(fn) {
    if (App.loaded) fn();
    else document.addEventListener("lc:loaded", fn, { once: true });
  }

  /* Un solo listener de scroll y de resize; cada módulo se suscribe. */
  var scrollSubs = [];
  var resizeSubs = [];
  var scrollQueued = false;

  function onScroll(fn) { scrollSubs.push(fn); }
  function onResize(fn) { resizeSubs.push(fn); }
  function runScroll() {
    scrollQueued = false;
    var y = window.scrollY || window.pageYOffset;
    for (var i = 0; i < scrollSubs.length; i++) safe(function () { scrollSubs[i](y); });
  }
  window.addEventListener("scroll", function () {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(runScroll); }
  }, { passive: true });
  window.addEventListener("resize", debounce(function () {
    resizeSubs.forEach(function (fn) { safe(fn); });
    runScroll();
  }, 150));

  /* ------------------------------------------------------------------------
     1. Loader
     ------------------------------------------------------------------------ */
  safe(function loaderModule() {
    var loader = qs("#loader");

    function done() {
      if (App.loaded) return;
      App.loaded = true;
      html.classList.add("is-loaded");
      html.classList.remove("is-loading");
      if (loader) loader.setAttribute("aria-hidden", "true");
      document.dispatchEvent(new Event("lc:loaded"));
      runScroll();
    }

    if (!loader) { done(); return; }

    var numEl = qs("#loader-num");
    var arc = qs("#loader-arc");
    var bar = qs("#loader-bar");
    var label = qs("#loader-label");
    var labels = ["Preparando todo", "Capeando al momento", "Armando tu pedido", "Listo para ti"];

    /* Las visitas repetidas en la misma sesión ven un loader más corto */
    var repeat = false;
    try {
      repeat = sessionStorage.getItem("loscapes-visited") === "1";
      sessionStorage.setItem("loscapes-visited", "1");
    } catch (e) { /* almacenamiento bloqueado: se usa la duración completa */ }

    var minTime = reduceMotion ? 250 : (repeat ? 700 : 1550);
    var pageReady = document.readyState === "complete";
    var start = performance.now();
    var shown = 0;
    var labelIndex = -1;

    window.addEventListener("load", function () { pageReady = true; });
    setTimeout(function () { pageReady = true; }, 900); /* tope: no esperamos a imágenes lentas */

    function setLabel(i) {
      if (i === labelIndex || !label) return;
      labelIndex = i;
      label.textContent = labels[i];
      label.classList.remove("is-swap");
      void label.offsetWidth;
      label.classList.add("is-swap");
    }

    function render(v) {
      var n = Math.round(v);
      if (numEl) numEl.textContent = n < 10 ? "0" + n : String(n);
      if (arc) arc.style.strokeDashoffset = String(100 - v);
      if (bar) bar.style.transform = "scaleX(" + (v / 100) + ")";
      setLabel(Math.min(labels.length - 1, Math.floor(v / 100 * labels.length)));
    }

    var last = 0;
    function tick(now) {
      var timeP = clamp((now - start) / minTime, 0, 1);
      var target = (pageReady ? timeP : Math.min(timeP, 0.88)) * 100;
      /* El avance depende del tiempo (no de los cuadros), así dura igual en cualquier equipo */
      var dt = last ? Math.min(now - last, 100) : 16.7;
      last = now;
      shown += (target - shown) * (1 - Math.pow(0.91, dt / 16.7));
      if (target >= 100 && shown > 99.3) shown = 100;
      render(shown);
      if (shown >= 100) {
        if (label) label.textContent = "¡Listo!";
        setTimeout(done, reduceMotion ? 0 : 280);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  /* ------------------------------------------------------------------------
     2. Scroll suave (Lenis) y anclas
     ------------------------------------------------------------------------ */
  safe(function smoothScrollModule() {
    function initLenis() {
      if (!window.Lenis || App.lenis) return;
      var lenis = new window.Lenis({
        duration: 1.25,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        wheelMultiplier: 0.95
      });
      App.lenis = lenis;
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (Object.keys(App.locks).length) lenis.stop();
    }

    /* Solo escritorio con mouse: en táctil el scroll nativo ya es suave. */
    if (!reduceMotion && finePointer) {
      onLoaded(function () {
        var s = document.createElement("script");
        s.src = "https://unpkg.com/lenis@1.1.13/dist/lenis.min.js";
        s.async = true;
        s.onload = function () { safe(initLenis); };
        document.head.appendChild(s);
      });
    }

    App.scrollTo = function (target) {
      var top = 0;
      if (target && target.id !== "inicio") {
        /* La sección fijada del proceso se alinea exacto al borde superior */
        var offset = target.id === "proceso" && html.classList.contains("has-hscroll") ? 0 : CONFIG.headerOffset;
        top = target.getBoundingClientRect().top + (window.scrollY || 0) - offset;
      }
      if (App.lenis) App.lenis.scrollTo(top, { duration: 1.4 });
      else window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    };

    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var hash = a.getAttribute("href");
      if (hash.length < 2) return;
      var target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      App.closeMenu();
      App.closeDrawer();
      requestAnimationFrame(function () { App.scrollTo(target); });
      if (history.replaceState) history.replaceState(null, "", hash);
    });
  });

  /* ------------------------------------------------------------------------
     3. Header
     ------------------------------------------------------------------------ */
  safe(function headerModule() {
    var header = qs("#header");
    var progress = qs("#scroll-progress");
    var toTop = qs("#to-top");
    if (!header) return;

    var lastY = 0;
    onScroll(function (y) {
      header.classList.toggle("is-scrolled", y > 24);

      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(y / max, 0, 1) : 0;
      if (progress) progress.style.setProperty("--progress", p.toFixed(4));
      if (toTop) toTop.style.setProperty("--progress", p.toFixed(4));

      if (!html.classList.contains("menu-open")) {
        if (y > lastY + 6 && y > 420) header.classList.add("is-hidden");
        else if (y < lastY - 6 || y < 420) header.classList.remove("is-hidden");
      }
      lastY = y;
    });

    /* Píldora que sigue al enlace activo / en hover */
    var nav = qs(".nav");
    var links = qsa(".nav__link");
    if (!nav || !links.length) return;

    var active = null;
    function movePill(link) {
      if (!link) { nav.style.setProperty("--pill-o", "0"); return; }
      nav.style.setProperty("--pill-x", link.offsetLeft + "px");
      nav.style.setProperty("--pill-w", link.offsetWidth + "px");
      nav.style.setProperty("--pill-o", "1");
    }
    links.forEach(function (l) { l.addEventListener("mouseenter", function () { movePill(l); }); });
    nav.addEventListener("mouseleave", function () { movePill(active); });

    if (!("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (l) { map[l.getAttribute("href").slice(1)] = l; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
          link.classList.add("is-active");
          link.setAttribute("aria-current", "true");
          active = link;
          movePill(link);
        } else if (active === link) {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
          active = null;
          movePill(null);
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  });

  /* ------------------------------------------------------------------------
     4. Menú móvil
     ------------------------------------------------------------------------ */
  safe(function mobileMenuModule() {
    var burger = qs("#burger");
    var panel = qs("#mobile-menu");
    if (!burger || !panel) return;

    function open() {
      html.classList.add("menu-open");
      panel.removeAttribute("inert");
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Cerrar menú");
      App.lock("menu");
    }
    function close() {
      if (!html.classList.contains("menu-open")) return;
      html.classList.remove("menu-open");
      panel.setAttribute("inert", "");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Abrir menú");
      App.unlock("menu");
    }
    App.closeMenu = close;

    burger.addEventListener("click", function () {
      if (html.classList.contains("menu-open")) close(); else open();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && html.classList.contains("menu-open")) { close(); burger.focus(); }
    });
    onResize(function () { if (window.innerWidth >= 1024) close(); });
  });

  /* ------------------------------------------------------------------------
     5. Texto partido
     ------------------------------------------------------------------------ */
  /* Recorre los nodos y envuelve palabras/letras conservando <em>, <strong>, etc. */
  function splitNode(node, opts, counter) {
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          frag.appendChild(opts.word(part, counter));
        });
      } else if (child.nodeType === 1) {
        var clone = child.cloneNode(false);
        clone.appendChild(splitNode(child, opts, counter));
        frag.appendChild(clone);
      }
    });
    return frag;
  }

  safe(function heroCharsModule() {
    qsa("[data-hero-chars]").forEach(function (el) {
      var text = el.textContent.trim();
      var counter = { i: 0 };
      var visual = document.createElement("span");
      visual.setAttribute("aria-hidden", "true");
      visual.appendChild(splitNode(el, {
        word: function (word, c) {
          var w = document.createElement("span");
          w.className = "word";
          Array.prototype.forEach.call(word, function (ch) {
            var s = document.createElement("span");
            s.className = "char";
            s.textContent = ch;
            s.style.setProperty("--ci", c.i++);
            w.appendChild(s);
          });
          return w;
        }
      }, counter));
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = text;
      el.textContent = "";
      el.appendChild(sr);
      el.appendChild(visual);
    });
  });

  safe(function splitWordsModule() {
    qsa("[data-split]").forEach(function (el) {
      var counter = { i: 0 };
      var frag = splitNode(el, {
        word: function (word, c) {
          var outer = document.createElement("span");
          outer.className = "sw";
          var inner = document.createElement("span");
          inner.className = "sw__in";
          inner.textContent = word;
          inner.style.setProperty("--wi", c.i++);
          outer.appendChild(inner);
          return outer;
        }
      }, counter);
      el.textContent = "";
      el.appendChild(frag);
    });
  });

  /* ------------------------------------------------------------------------
     6. Revelado al hacer scroll + texto "scramble"
     ------------------------------------------------------------------------ */
  function scramble(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node, textNode = null;
    while ((node = walker.nextNode())) { if (node.textContent.trim()) textNode = node; }
    if (!textNode || reduceMotion) return;

    var final = textNode.textContent;
    var glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+";
    var duration = 750;
    var start = performance.now();

    function frame(now) {
      var p = clamp((now - start) / duration, 0, 1);
      var out = "";
      for (var i = 0; i < final.length; i++) {
        var ch = final[i];
        if (ch === " " || p > i / final.length + 0.15) out += ch;
        else out += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      textNode.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else textNode.textContent = final;
    }
    requestAnimationFrame(frame);
  }

  safe(function revealModule() {
    var targets = qsa("[data-reveal], [data-split], [data-scramble]");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-in");
        if (el.hasAttribute("data-scramble")) scramble(el);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    /* Se observa después del loader para que las animaciones se vean */
    onLoaded(function () { targets.forEach(function (el) { io.observe(el); }); });
  });

  /* ------------------------------------------------------------------------
     7. Contadores
     ------------------------------------------------------------------------ */
  safe(function countModule() {
    var nodes = qsa("[data-count-to]");
    if (!nodes.length || reduceMotion || !("IntersectionObserver" in window)) return;

    function animate(el, delay) {
      var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      var dur = 1400;
      setTimeout(function () {
        var start = performance.now();
        function step(now) {
          var p = clamp((now - start) / dur, 0, 1);
          var eased = 1 - Math.pow(2, -10 * p);
          el.textContent = String(Math.round(to * (p === 1 ? 1 : eased)));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, delay || 0);
    }

    nodes.forEach(function (el) { el.textContent = "0"; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var inHero = !!entry.target.closest(".hero");
        animate(entry.target, inHero ? 1500 : 150);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    onLoaded(function () { nodes.forEach(function (el) { io.observe(el); }); });
  });

  /* ------------------------------------------------------------------------
     8. Hero: burbujas de aceite y migajas doradas de capeado (canvas)
        + parallax del puntero
     ------------------------------------------------------------------------ */
  safe(function heroCanvasModule() {
    var hero = qs(".hero");
    var canvas = qs("#hero-canvas");
    if (!hero || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");

    var W = 0, H = 0, dpr = 1;
    var parts = [];
    var pointer = { x: -9999, y: -9999, nx: 0, ny: 0, tx: 0, ty: 0, active: false };
    var running = false;
    var inView = true;

    var GOLDS = ["242, 169, 59", "226, 140, 22", "255, 205, 110"];
    var TEAL = "26, 135, 149";

    /* Cada partícula es una burbuja (aro) o una migaja dorada (polígono irregular) */
    function spawn(p, initial) {
      p.bubble = Math.random() < 0.38;
      p.x = Math.random() * W;
      p.y = initial ? Math.random() * H : H + 20 + Math.random() * 80;
      p.r = p.bubble ? 2.5 + Math.random() * 7 : 1.6 + Math.random() * 3.2;
      p.vy = -(p.bubble ? 0.3 + Math.random() * 0.6 : 0.15 + Math.random() * 0.4);
      p.vx = (Math.random() - 0.5) * 0.15;
      p.ph = Math.random() * Math.PI * 2;
      p.rot = Math.random() * Math.PI;
      p.vr = (Math.random() - 0.5) * 0.03;
      p.col = p.bubble ? (Math.random() < 0.55 ? TEAL : GOLDS[0]) : GOLDS[Math.floor(Math.random() * GOLDS.length)];
      p.a = 0.3 + Math.random() * 0.5;
      /* Forma de la migaja: 5 vértices con radio aleatorio */
      p.shape = [];
      for (var k = 0; k < 5; k++) p.shape.push(0.6 + Math.random() * 0.5);
      return p;
    }

    function build() {
      var count = clamp(Math.round((W * H) / 15000), 24, 95);
      parts = [];
      for (var i = 0; i < count; i++) parts.push(spawn({}, true));
    }

    function resize() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.ph += 0.02;
        p.x += p.vx + Math.sin(p.ph) * 0.28;
        p.y += p.vy;
        p.rot += p.vr;

        if (pointer.active) {
          var dx = p.x - pointer.x, dy = p.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            var f = (1 - d2 / 14000) * 1.8;
            var d = Math.sqrt(d2) || 1;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
        if (p.y < -20) spawn(p, false);

        /* Se desvanecen al acercarse a la parte de arriba, como si se esfumaran */
        var fade = clamp(p.y / (H * 0.3), 0, 1);
        var alpha = p.a * fade;

        if (p.bubble) {
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = "rgba(" + p.col + "," + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(255, 255, 255," + (alpha * 0.9).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = "rgba(" + p.col + "," + alpha.toFixed(3) + ")";
          ctx.beginPath();
          for (var k = 0; k < 5; k++) {
            var ang = (k / 5) * Math.PI * 2;
            var rr = p.r * p.shape[k];
            if (k === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
            else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    function updatePointerVars() {
      pointer.nx = lerp(pointer.nx, pointer.tx, 0.06);
      pointer.ny = lerp(pointer.ny, pointer.ty, 0.06);
      hero.style.setProperty("--rx", pointer.nx.toFixed(3));
      hero.style.setProperty("--ry", pointer.ny.toFixed(3));
    }

    function frame() {
      if (!running) return;
      updatePointerVars();
      draw();
      requestAnimationFrame(frame);
    }
    function start() { if (running || reduceMotion) return; running = true; requestAnimationFrame(frame); }
    function stop() { running = false; }

    resize();
    onResize(resize);

    if (reduceMotion) { draw(); return; }

    if (finePointer) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.tx = clamp((pointer.x / r.width) * 2 - 1, -1, 1);
        pointer.ty = clamp((pointer.y / r.height) * 2 - 1, -1, 1);
        pointer.active = true;
        hero.style.setProperty("--spot-x", pointer.x + "px");
        hero.style.setProperty("--spot-y", pointer.y + "px");
      });
      hero.addEventListener("pointerleave", function () {
        pointer.active = false;
        pointer.tx = 0;
        pointer.ty = 0;
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !document.hidden) start(); else stop();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (inView) start();
    });
    start();
  });

  /* ------------------------------------------------------------------------
     9. Hero: salida con scroll
     ------------------------------------------------------------------------ */
  safe(function heroScrubModule() {
    var hero = qs(".hero");
    var inner = qs("[data-hero-scrub]");
    var cue = qs(".hero__scroll");
    if (!hero || !inner || reduceMotion) return;

    onScroll(function (y) {
      var h = hero.offsetHeight;
      if (y > h * 1.1) return;
      var p = clamp(y / (h * 0.9), 0, 1);
      var shift = p * 140;
      App.heroShift = shift;
      inner.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0) scale(" + (1 - p * 0.06).toFixed(4) + ")";
      inner.style.opacity = String(clamp(1 - p * 1.15, 0, 1));
      /* El indicador "Desliza" desaparece en cuanto empieza el scroll */
      if (cue) {
        var fade = clamp(1 - y / 120, 0, 1);
        cue.style.opacity = fade.toFixed(3);
        cue.style.visibility = fade === 0 ? "hidden" : "";
      }
    });
  });

  /* ------------------------------------------------------------------------
     11. Parallax de imágenes y palabra del footer
     ------------------------------------------------------------------------ */
  safe(function parallaxModule() {
    if (reduceMotion) return;
    var imgs = qsa("[data-parallax-img]");
    var visible = [];

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var idx = visible.indexOf(e.target);
          if (e.isIntersecting && idx === -1) visible.push(e.target);
          if (!e.isIntersecting && idx > -1) visible.splice(idx, 1);
        });
      }, { rootMargin: "10% 0px" });
      imgs.forEach(function (img) { io.observe(img); });
    }

    var word = qs(".footer__word span");

    onScroll(function () {
      var vh = window.innerHeight;
      visible.forEach(function (img) {
        var box = img.parentElement.getBoundingClientRect();
        var off = (box.top + box.height / 2 - vh / 2) / vh;
        img.style.setProperty("--py", (-off * box.height * 0.12).toFixed(1) + "px");
      });
      if (word) {
        var r = word.parentElement.getBoundingClientRect();
        var p = clamp((vh - r.top) / (vh * 0.6), 0, 1);
        word.style.setProperty("--fy", ((1 - p) * 40).toFixed(1) + "%");
      }
    });
  });

  /* ------------------------------------------------------------------------
     12. Proceso: scroll horizontal fijado (solo escritorio)
     ------------------------------------------------------------------------ */
  safe(function processModule() {
    var section = qs("#proceso");
    var track = qs("#process-track");
    var meter = qs("#process-meter");
    if (!section || !track) return;

    var enabled = false;
    var dist = 0;

    function setup() {
      var want = window.innerWidth >= 1024 && !reduceMotion;
      if (want !== enabled) {
        enabled = want;
        html.classList.toggle("has-hscroll", want);
        if (!want) { section.style.height = ""; track.style.transform = ""; }
      }
      if (!enabled) return;
      track.style.transform = "translate3d(0,0,0)";
      dist = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = (window.innerHeight + dist) + "px";
      update();
    }

    function update() {
      if (!enabled || !dist) return;
      var rect = section.getBoundingClientRect();
      var p = clamp(-rect.top / dist, 0, 1);
      track.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px,0,0)";
      if (meter) meter.parentElement.style.setProperty("--p", p.toFixed(4));
    }

    setup();
    onResize(setup);
    onScroll(update);
    window.addEventListener("load", setup);
  });

  /* ------------------------------------------------------------------------
     13. Ticker con inclinación según la velocidad del scroll
     ------------------------------------------------------------------------ */
  safe(function tickerModule() {
    var rows = qsa("[data-ticker]");
    if (!rows.length || reduceMotion) return;

    var skew = 0, target = 0, lastY = window.scrollY, raf = null;

    function loop() {
      skew = lerp(skew, target, 0.12);
      target *= 0.88;
      var val = Math.abs(skew) < 0.02 ? 0 : skew;
      rows.forEach(function (r) { r.style.setProperty("--skew", val.toFixed(2) + "deg"); });
      if (Math.abs(skew) > 0.02 || Math.abs(target) > 0.02) raf = requestAnimationFrame(loop);
      else raf = null;
    }

    onScroll(function (y) {
      var v = y - lastY;
      lastY = y;
      target = clamp(v * -0.22, -9, 9);
      if (!raf) raf = requestAnimationFrame(loop);
    });
  });

  /* ------------------------------------------------------------------------
     14. Tilt 3D, spotlight y botones magnéticos (solo puntero fino)
     ------------------------------------------------------------------------ */
  safe(function pointerFxModule() {
    if (!finePointer || reduceMotion) return;

    qsa("[data-spot]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--sx", (e.clientX - r.left) + "px");
        el.style.setProperty("--sy", (e.clientY - r.top) + "px");
      });
    });

    qsa("[data-tilt]").forEach(function (el) {
      var raf = null;
      el.addEventListener("pointermove", function (e) {
        if (!el.classList.contains("is-in")) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.transition = "transform .25s ease-out, border-color .4s";
          el.style.transform = "perspective(1000px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateY(-6px)";
        });
      });
      el.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf);
        el.style.transition = "transform .9s cubic-bezier(.16,1,.3,1), border-color .4s";
        el.style.transform = "";
      });
    });

    qsa("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        btn.style.translate = (dx * 0.22).toFixed(1) + "px " + (dy * 0.32).toFixed(1) + "px";
      });
      btn.addEventListener("pointerleave", function () { btn.style.translate = ""; });
    });
  });

  /* ------------------------------------------------------------------------
     15. Cursor personalizado
     ------------------------------------------------------------------------ */
  safe(function cursorModule() {
    var cursor = qs(".cursor");
    if (!cursor || !finePointer || reduceMotion) return;
    var ring = qs(".cursor__ring", cursor);
    var dot = qs(".cursor__dot", cursor);
    var label = qs(".cursor__label", cursor);
    html.classList.add("has-cursor");

    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      cursor.classList.remove("is-hidden");
    }, { passive: true });
    document.addEventListener("pointerleave", function () { cursor.classList.add("is-hidden"); });

    document.addEventListener("pointerover", function (e) {
      var t = e.target;
      var labelled = t.closest && t.closest("[data-cursor]");
      var interactive = t.closest && t.closest("a, button, summary, label, input, select, textarea");
      if (labelled) {
        label.textContent = labelled.getAttribute("data-cursor");
        cursor.classList.add("is-label");
        cursor.classList.remove("is-hover");
      } else {
        cursor.classList.remove("is-label");
        cursor.classList.toggle("is-hover", !!interactive);
      }
    });

    (function loop() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
  });

  /* ------------------------------------------------------------------------
     16. Horario en vivo
     ------------------------------------------------------------------------ */
  safe(function scheduleModule() {
    var chips = qsa("[data-status]");
    var promoChips = qsa("[data-promo]");
    var clock = qs("#local-clock");
    var weekItems = qsa("#week li");

    function now() {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.timeZone,
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return {
        weekday: weekdays[map.weekday],
        hour: parseInt(map.hour, 10) % 24,
        minute: parseInt(map.minute, 10)
      };
    }

    App.isPromoDay = function () {
      var t = now();
      return t.weekday !== CONFIG.closedWeekday && CONFIG.promoWeekdays.indexOf(t.weekday) > -1;
    };

    function update() {
      var t = now();
      var minutes = t.hour * 60 + t.minute;
      var openMin = CONFIG.openHour * 60;
      var closeMin = CONFIG.closeHour * 60;
      var closedDay = t.weekday === CONFIG.closedWeekday;
      var isOpen = !closedDay && minutes >= openMin && minutes < closeMin;
      var tomorrowClosed = (t.weekday + 1) % 7 === CONFIG.closedWeekday;

      var text;
      if (isOpen) {
        var left = closeMin - minutes;
        text = left <= 45 ? "Abierto · cerramos en " + left + " min" : "Abierto ahora · hasta las 16:00";
      } else if (closedDay) {
        text = "Hoy descansamos · mañana 9:00";
      } else if (minutes < openMin) {
        text = "Cerrado · abrimos hoy a las 9:00";
      } else {
        text = tomorrowClosed ? "Cerrado · abrimos el miércoles 9:00" : "Cerrado · abrimos mañana 9:00";
      }

      chips.forEach(function (chip) {
        chip.setAttribute("data-open", isOpen ? "true" : "false");
        var el = qs("[data-status-text]", chip);
        if (el) el.textContent = text;
      });

      var promo = App.isPromoDay();
      promoChips.forEach(function (chip) {
        chip.setAttribute("data-active", promo ? "true" : "false");
        var el = qs("[data-promo-text]", chip);
        if (el) el.textContent = promo ? "Promo activa hoy" : "Solo lunes y jueves";
      });

      if (clock) clock.textContent = (t.hour < 10 ? "0" : "") + t.hour + ":" + (t.minute < 10 ? "0" : "") + t.minute;
      weekItems.forEach(function (li) {
        li.classList.toggle("is-today", parseInt(li.getAttribute("data-day"), 10) === t.weekday);
      });
    }

    update();
    setInterval(update, 30000);
  });

  /* ------------------------------------------------------------------------
     17. Pedido: carrito, panel lateral y formulario → WhatsApp
     ------------------------------------------------------------------------ */
  safe(function orderModule() {
    var order = {};
    var renderers = [];

    /* Carga el pedido guardado (si el almacenamiento está disponible) */
    try {
      var saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "{}");
      Object.keys(saved).forEach(function (id) {
        var q = parseInt(saved[id], 10);
        if (PRODUCTS[id] && q > 0) order[id] = Math.min(q, 99);
      });
    } catch (e) { order = {}; }

    function save() {
      try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(order)); } catch (e) { /* sin almacenamiento */ }
    }

    function count() {
      return Object.keys(order).reduce(function (s, id) { return s + order[id]; }, 0);
    }

    function calc() {
      var sub = 0;
      var units = []; /* precios unitarios de los tacos que entran en la promo */
      Object.keys(order).forEach(function (id) {
        var p = PRODUCTS[id];
        sub += order[id] * p.price;
        if (p.promo) for (var k = 0; k < order[id]; k++) units.push(p.price);
      });
      var promoDay = App.isPromoDay();
      var promo = 0;
      if (promoDay) {
        /* Se emparejan de mayor a menor precio para que el cliente ahorre lo máximo */
        units.sort(function (a, b) { return b - a; });
        for (var i = 0; i + 1 < units.length; i += 2) {
          promo += Math.max(0, units[i] + units[i + 1] - CONFIG.promoPairPrice);
        }
      }
      return { sub: sub, tacos: units.length, promo: promo, promoDay: promoDay, total: sub - promo };
    }

    /* ---- Toast ---- */
    var toastEl = qs("#toast");
    var toastTimer;
    function toast(msg) {
      if (!toastEl) return;
      toastEl.innerHTML = '<span class="toast__ico" aria-hidden="true"><svg class="i"><use href="#i-check"/></svg></span><span></span>';
      toastEl.lastChild.textContent = msg;
      requestAnimationFrame(function () { toastEl.classList.add("is-visible"); });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2400);
    }

    var cartBtn = qs("#cart-btn");
    var fabCart = qs("#fab-cart");
    var fabBadge = qs("#fab-cart-badge");
    var fabPill = qs("#fab-cart-pill");
    var fabTotal = qs("#fab-cart-total");

    /* Pequeño rebote en ambos carritos (header y flotante) al agregar */
    function bump() {
      [cartBtn, fabCart].forEach(function (el) {
        if (!el) return;
        el.classList.remove("is-bump");
        void el.offsetWidth;
        el.classList.add("is-bump");
      });
    }

    function setQty(id, qty, opts) {
      var prev = order[id] || 0;
      qty = clamp(qty, 0, 99);
      if (qty === 0) delete order[id]; else order[id] = qty;
      save();
      renderAll();
      if (opts && opts.feedback && qty > prev) {
        bump();
        toast("Agregado: " + PRODUCTS[id].short);
      }
    }

    /* ---- Stepper reutilizable ---- */
    function buildStepper(el) {
      var id = el.getAttribute("data-stepper");
      var p = PRODUCTS[id];
      if (!p) return null;
      var compact = el.hasAttribute("data-compact");

      el.innerHTML =
        (compact ? "" :
          '<button type="button" class="stepper__add" aria-label="Agregar ' + p.short + ' a mi pedido">' +
            '<span>Agregar</span><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg>' +
          '</button>') +
        '<div class="stepper__ctrl" role="group" aria-label="Cantidad de ' + p.short + '">' +
          '<button type="button" class="stepper__btn" data-act="dec" aria-label="Quitar un ' + p.short + '"><svg class="i" aria-hidden="true"><use href="#i-minus"/></svg></button>' +
          '<output class="stepper__qty">0</output>' +
          '<button type="button" class="stepper__btn" data-act="inc" aria-label="Agregar un ' + p.short + '"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></button>' +
        '</div>';

      var add = qs(".stepper__add", el);
      var ctrl = qs(".stepper__ctrl", el);
      var out = qs(".stepper__qty", el);
      var inc = qs('[data-act="inc"]', el);
      var last = -1;

      if (add) add.addEventListener("click", function () {
        setQty(id, (order[id] || 0) + 1, { feedback: true });
        inc.focus();
      });
      inc.addEventListener("click", function () { setQty(id, (order[id] || 0) + 1, { feedback: !compact }); });
      qs('[data-act="dec"]', el).addEventListener("click", function () {
        var next = (order[id] || 0) - 1;
        setQty(id, next);
        if (next <= 0 && add) add.focus();
      });

      function render() {
        var q = order[id] || 0;
        el.setAttribute("data-qty", q);
        if (add) { add.hidden = q > 0; ctrl.hidden = q === 0; }
        if (q !== last) {
          out.textContent = q;
          if (last !== -1) { out.classList.remove("is-tick"); void out.offsetWidth; out.classList.add("is-tick"); }
          last = q;
        }
      }
      return render;
    }

    qsa("[data-stepper]").forEach(function (el) {
      var r = buildStepper(el);
      if (r) renderers.push(r);
    });

    /* ---- Panel lateral ---- */
    var drawer = qs("#cart-drawer");
    var overlay = qs("#cart-overlay");
    var list = qs("#cart-list");
    var empty = qs("#cart-empty");
    var foot = qs("#cart-foot");
    var closeBtn = qs("#cart-close");
    var badge = qs("#cart-badge");
    var rows = {};
    var lastTrigger = null;

    function buildRow(id) {
      var p = PRODUCTS[id];
      var li = document.createElement("li");
      li.className = "drawer-item";
      li.innerHTML =
        productThumb(p, "drawer-item") +
        '<div><div class="drawer-item__top"><p class="drawer-item__name"></p><p class="drawer-item__price"></p></div>' +
        '<p class="drawer-item__unit"></p>' +
        '<div class="stepper stepper--sm" data-stepper="' + id + '" data-compact></div></div>';
      qs(".drawer-item__name", li).textContent = p.name;
      qs(".drawer-item__unit", li).textContent = money(p.price) + " c/u";
      var stepRender = buildStepper(qs(".stepper", li));
      var price = qs(".drawer-item__price", li);
      return {
        li: li,
        render: function () {
          stepRender();
          price.textContent = money((order[id] || 0) * p.price);
        }
      };
    }

    function renderDrawer() {
      if (!list) return;
      Object.keys(PRODUCTS).forEach(function (id) {
        var has = (order[id] || 0) > 0;
        if (has && !rows[id]) {
          rows[id] = buildRow(id);
          list.appendChild(rows[id].li);
        }
        if (!has && rows[id]) {
          var hadFocus = rows[id].li.contains(document.activeElement);
          list.removeChild(rows[id].li);
          delete rows[id];
          if (hadFocus && closeBtn) closeBtn.focus();
        }
        if (rows[id]) rows[id].render();
      });
      var n = count();
      if (empty) empty.hidden = n > 0;
      if (foot) foot.hidden = n === 0;
      list.hidden = n === 0;
    }

    function renderTotals() {
      var c = calc();
      qsa("[data-total]").forEach(function (el) { el.textContent = money(c.total); });
      qsa("[data-promo-line]").forEach(function (el) { el.hidden = c.promo === 0; });
      qsa("[data-promo-amount]").forEach(function (el) { el.textContent = "-" + money(c.promo); });
      var hint;
      if (!c.promoDay) hint = "Promo 2×$65 en tacos de camarón, válida únicamente lunes y jueves.";
      else if (c.tacos === 0) hint = "Hoy es día de promo (solo lunes y jueves): 2 tacos de camarón por $65.";
      else if (c.tacos % 2 === 1) hint = "Agrega 1 taco de camarón más y el par te sale en $65.";
      else hint = "Promo de hoy aplicada a tus tacos de camarón.";
      qsa("[data-promo-hint]").forEach(function (el) { el.textContent = hint; });
    }

    function renderBadge() {
      var n = count();
      var label = "Ver mi pedido, " + n + (n === 1 ? " producto" : " productos");
      if (badge) { badge.hidden = n === 0; badge.textContent = n; }
      if (cartBtn) cartBtn.setAttribute("aria-label", label);
      /* Carrito flotante: contador y total visibles en cuanto hay productos */
      if (fabBadge) { fabBadge.hidden = n === 0; fabBadge.textContent = n; }
      if (fabPill) fabPill.hidden = n === 0;
      if (fabTotal) fabTotal.textContent = money(calc().total);
      if (fabCart) {
        fabCart.setAttribute("aria-label", n ? label + ", total " + money(calc().total) : label);
        fabCart.classList.toggle("has-items", n > 0);
      }
    }

    function renderAll() {
      renderers.forEach(function (r) { r(); });
      renderDrawer();
      renderTotals();
      renderBadge();
    }

    function openDrawer(trigger) {
      if (!drawer) return;
      lastTrigger = trigger || document.activeElement;
      html.classList.add("cart-open");
      drawer.removeAttribute("inert");
      drawer.setAttribute("aria-hidden", "false");
      if (cartBtn) cartBtn.setAttribute("aria-expanded", "true");
      if (overlay) { overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add("is-visible"); }); }
      App.lock("drawer");
      setTimeout(function () { if (closeBtn) closeBtn.focus({ preventScroll: true }); }, 60);
    }

    function closeDrawer(restoreFocus) {
      if (!html.classList.contains("cart-open")) return;
      html.classList.remove("cart-open");
      drawer.setAttribute("inert", "");
      drawer.setAttribute("aria-hidden", "true");
      if (cartBtn) cartBtn.setAttribute("aria-expanded", "false");
      if (overlay) { overlay.classList.remove("is-visible"); setTimeout(function () { overlay.hidden = true; }, 400); }
      App.unlock("drawer");
      if (restoreFocus && lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
    }
    App.closeDrawer = function () { closeDrawer(false); };

    if (cartBtn) cartBtn.addEventListener("click", function () { openDrawer(cartBtn); });
    if (fabCart) fabCart.addEventListener("click", function () { openDrawer(fabCart); });
    if (closeBtn) closeBtn.addEventListener("click", function () { closeDrawer(true); });
    if (overlay) overlay.addEventListener("click", function () { closeDrawer(true); });

    document.addEventListener("keydown", function (e) {
      if (!html.classList.contains("cart-open")) return;
      if (e.key === "Escape") { closeDrawer(true); return; }
      if (e.key !== "Tab") return;
      /* Mantiene el foco dentro del panel */
      var focusables = qsa("button:not([hidden]), a[href], input, [tabindex]:not([tabindex='-1'])", drawer)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var clearBtn = qs("#cart-clear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      order = {};
      save();
      renderAll();
      if (closeBtn) closeBtn.focus();
    });

    /* Combo 2×$65 */
    qsa("[data-add-combo]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        order.camaron = (order.camaron || 0) + 2;
        save();
        renderAll();
        bump();
        setTimeout(function () { openDrawer(btn); }, 300);
      });
    });

    /* ---- Ventana de pedido (comanda) ----
       Flujo: menú → carrito → "Hacer pedido" → datos → WhatsApp con folio. */
    var checkout = qs("#checkout");
    var checkoutOverlay = qs("#checkout-overlay");
    var checkoutScroll = qs(".checkout__scroll");
    var checkoutBtn = qs("#cart-checkout");
    var checkoutClose = qs("#checkout-close");
    var checkoutEdit = qs("#checkout-edit");
    var summary = qs("#checkout-summary");
    var shipNote = qs("#checkout-ship-note");
    var form = qs("#order-form");
    var done = qs("#order-done");
    var fallback = qs("#order-fallback");
    var again = qs("#order-again");
    var folioEl = qs("#order-folio");
    var deliveryBox = qs("#delivery-fields");
    var dineBox = qs("#dinein-fields");
    var modeGroup = qs("#f-mode-group");
    var timeLabel = qs("#f-time-label");

    function val(sel) {
      var el = qs(sel);
      return el ? (el.value || "").trim() : "";
    }

    function getMode() {
      var r = form ? qs('input[name="mode"]:checked', form) : null;
      return r ? r.value : "";
    }

    /* Marca o limpia el error de un campo (o del grupo de opciones) */
    function setError(el, errEl, show) {
      if (!el) return;
      var isInput = el.classList.contains("field__input");
      var host = isInput ? el.closest(".field") : el;
      host.setAttribute("data-invalid", show ? "true" : "false");
      if (isInput) el.setAttribute("aria-invalid", show ? "true" : "false");
      if (errEl) errEl.hidden = !show;
    }

    function renderSummary() {
      if (!summary) return;
      summary.innerHTML = "";
      Object.keys(PRODUCTS).forEach(function (id) {
        if (!order[id]) return;
        var li = document.createElement("li");
        li.innerHTML = '<span class="summary__qty"></span><span class="summary__name"></span><span class="summary__price"></span>';
        li.children[0].textContent = order[id] + "×";
        li.children[1].textContent = PRODUCTS[id].name;
        li.children[2].textContent = money(order[id] * PRODUCTS[id].price);
        summary.appendChild(li);
      });
    }

    /* Muestra u oculta los campos de domicilio según la opción elegida */
    function updateMode() {
      var mode = getMode();
      if (deliveryBox) deliveryBox.hidden = mode !== "domicilio";
      if (dineBox) dineBox.hidden = mode !== "mesa";
      if (shipNote) shipNote.hidden = mode !== "domicilio";
      if (timeLabel) {
        timeLabel.textContent = mode === "recoger" ? "¿A qué hora pasas?" :
          mode === "mesa" ? "¿A qué hora llegas?" :
          mode === "domicilio" ? "¿Para cuándo lo quieres?" : "¿Para cuándo?";
      }
      if (mode) setError(modeGroup, qs("#f-mode-err"), false);
    }

    function openCheckout() {
      if (!checkout || !form || count() === 0) return;
      renderSummary();
      renderTotals();
      form.hidden = false;
      if (done) done.hidden = true;
      html.classList.add("checkout-open");
      checkout.removeAttribute("inert");
      checkout.setAttribute("aria-hidden", "false");
      if (checkoutOverlay) {
        checkoutOverlay.hidden = false;
        requestAnimationFrame(function () { checkoutOverlay.classList.add("is-visible"); });
      }
      App.lock("checkout");
      if (checkoutScroll) checkoutScroll.scrollTop = 0;
      setTimeout(function () {
        var first = qs('input[name="mode"]:checked', form) || qs('input[name="mode"]', form);
        if (first) first.focus({ preventScroll: true });
      }, 350);
    }

    function closeCheckout(focusCart) {
      if (!html.classList.contains("checkout-open")) return;
      html.classList.remove("checkout-open");
      checkout.setAttribute("inert", "");
      checkout.setAttribute("aria-hidden", "true");
      if (checkoutOverlay) {
        checkoutOverlay.classList.remove("is-visible");
        setTimeout(function () { checkoutOverlay.hidden = true; }, 400);
      }
      App.unlock("checkout");
      if (focusCart && cartBtn) cartBtn.focus({ preventScroll: true });
    }

    if (checkoutBtn) checkoutBtn.addEventListener("click", function () {
      closeDrawer(false);
      setTimeout(openCheckout, 260);
    });
    if (checkoutClose) checkoutClose.addEventListener("click", function () { closeCheckout(true); });
    if (checkoutOverlay) checkoutOverlay.addEventListener("click", function () { closeCheckout(true); });
    /* Clic en el área vacía alrededor del ticket = cerrar */
    if (checkoutScroll) checkoutScroll.addEventListener("click", function (e) {
      if (e.target === checkoutScroll) closeCheckout(true);
    });
    if (checkoutEdit) checkoutEdit.addEventListener("click", function () {
      closeCheckout(false);
      setTimeout(function () { openDrawer(cartBtn); }, 260);
    });

    document.addEventListener("keydown", function (e) {
      if (!html.classList.contains("checkout-open")) return;
      if (e.key === "Escape") { closeCheckout(true); return; }
      if (e.key !== "Tab") return;
      /* Mantiene el foco dentro de la comanda */
      var focusables = qsa("button, a[href], input, select, textarea", checkout)
        .filter(function (el) { return el.offsetParent !== null && !el.disabled; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* Folio corto para llevar el control: día+mes y 4 caracteres aleatorios */
    function makeFolio() {
      var d = new Date();
      var p = function (n) { return (n < 10 ? "0" : "") + n; };
      return "LC-" + p(d.getDate()) + p(d.getMonth() + 1) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    if (form) {
      qsa('input[name="mode"]', form).forEach(function (r) { r.addEventListener("change", updateMode); });
      qsa(".field__input", form).forEach(function (input) {
        input.addEventListener("input", function () {
          if (input.value.trim()) {
            var errId = input.getAttribute("aria-describedby");
            setError(input, errId ? document.getElementById(errId) : null, false);
          }
        });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (count() === 0) { closeCheckout(false); openDrawer(cartBtn); return; }

        var mode = getMode();
        var name = val("#f-name");
        var phoneRaw = val("#f-phone");
        var phone = phoneRaw.replace(/\D/g, "");
        var street = val("#f-street");
        var colonia = val("#f-colonia");
        var ref = val("#f-ref");
        var cash = val("#f-cash").replace(/[^\d.]/g, "");
        var time = val("#f-time");
        var people = val("#f-people").replace(/[^\d]/g, "");
        var notes = val("#f-notes");

        /* Validación: se marca todo lo que falta y se lleva al primer error */
        var firstBad = null;
        function check(ok, el, errSel) {
          setError(el, qs(errSel), !ok);
          if (!ok && !firstBad) firstBad = el;
        }
        check(!!mode, modeGroup, "#f-mode-err");
        check(name.length >= 2, qs("#f-name"), "#f-name-err");
        check(phone.length >= 10, qs("#f-phone"), "#f-phone-err");
        if (mode === "domicilio") {
          check(!!street, qs("#f-street"), "#f-street-err");
          check(!!colonia, qs("#f-colonia"), "#f-colonia-err");
        }
        if (firstBad) {
          var target = firstBad.classList.contains("field__input") ? firstBad : qs("input", firstBad);
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
          return;
        }

        var c = calc();
        var folio = makeFolio();
        var isDelivery = mode === "domicilio";
        var lines = [
          "*NUEVO PEDIDO · LOS CAPES*",
          "Folio: " + folio,
          "Tipo: " + (isDelivery ? "PEDIDO A DOMICILIO" : mode === "mesa" ? "COMER EN EL LOCAL" : "RECOGER EN SUCURSAL"),
          "",
          "*Cliente*",
          "Nombre: " + name,
          "Teléfono: " + phoneRaw
        ];
        if (isDelivery) {
          lines.push("Dirección: " + street + ", Col. " + colonia);
          if (ref) lines.push("Referencias: " + ref);
        }
        lines.push((isDelivery ? "Para cuándo: " : mode === "mesa" ? "Llega a las: " : "Pasa a recoger: ") + time);
        if (mode === "mesa" && people) lines.push("Personas: " + people);
        lines.push("");
        lines.push("*Pedido*");
        Object.keys(PRODUCTS).forEach(function (id) {
          if (!order[id]) return;
          lines.push("• " + order[id] + " × " + PRODUCTS[id].name + " — " + money(order[id] * PRODUCTS[id].price));
        });
        if (c.promo > 0) lines.push("Promo 2×$65 (lunes y jueves): -" + money(c.promo));
        lines.push("*Total estimado: " + money(c.total) + (isDelivery ? " + envío*" : "*"));
        lines.push("Pago: Efectivo" + (isDelivery && cash ? " · paga con " + money(parseFloat(cash) || 0) : ""));
        if (notes) lines.push("Comentarios: " + notes);

        var url = "https://wa.me/" + CONFIG.phone + "?text=" + encodeURIComponent(lines.join("\n"));
        if (fallback) fallback.href = url;
        if (folioEl) folioEl.textContent = folio;
        window.open(url, "_blank", "noopener");

        form.hidden = true;
        if (done) {
          done.hidden = false;
          var title = qs(".form-done__title", done);
          if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); }
        }
        if (checkoutScroll) checkoutScroll.scrollTop = 0;
      });
    }

    /* "Hacer otro pedido": vacía el carrito, limpia la comanda y cierra */
    if (again && form) {
      again.addEventListener("click", function () {
        order = {};
        save();
        renderAll();
        form.reset();
        updateMode();
        closeCheckout(false);
      });
    }

    renderAll();
    /* El estado de promo depende de la hora: se recalcula cada minuto */
    setInterval(renderTotals, 60000);
  });

  /* ------------------------------------------------------------------------
     18. Galería: visor de fotos
     ------------------------------------------------------------------------ */
  safe(function lightboxModule() {
    var dialog = qs("#lightbox");
    var buttons = qsa("[data-lightbox]");
    if (!dialog || !buttons.length || typeof dialog.showModal !== "function") return;

    var img = qs("#lightbox-img");
    var cap = qs("#lightbox-cap");
    var items = buttons.map(function (b) {
      var im = qs("img", b);
      var fc = b.parentElement.querySelector("figcaption");
      return { src: im.getAttribute("src"), alt: im.getAttribute("alt"), cap: fc ? fc.textContent : "" };
    });
    var index = 0;
    var opener = null;

    function show(i) {
      index = (i + items.length) % items.length;
      img.src = items[index].src;
      img.alt = items[index].alt;
      cap.textContent = items[index].cap + " · " + (index + 1) + "/" + items.length;
      img.style.animation = "none";
      void img.offsetWidth;
      img.style.animation = "";
    }
    function open(i) {
      opener = document.activeElement;
      show(i);
      dialog.showModal();
      App.lock("lightbox");
      requestAnimationFrame(function () { dialog.classList.add("is-visible"); });
    }
    function close() {
      dialog.classList.remove("is-visible");
      setTimeout(function () {
        if (dialog.open) dialog.close();
        App.unlock("lightbox");
        if (opener && opener.focus) opener.focus({ preventScroll: true });
      }, 300);
    }

    buttons.forEach(function (b, i) { b.addEventListener("click", function () { open(i); }); });
    qs("[data-lb-close]", dialog).addEventListener("click", close);
    qs("[data-lb-prev]", dialog).addEventListener("click", function () { show(index - 1); });
    qs("[data-lb-next]", dialog).addEventListener("click", function () { show(index + 1); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  });

  /* ------------------------------------------------------------------------
     19. Preguntas frecuentes (abrir y cerrar con altura animada)
     ------------------------------------------------------------------------ */
  safe(function faqModule() {
    if (reduceMotion) return;
    qsa(".faq__item").forEach(function (item) {
      var summary = qs("summary", item);
      var answer = qs(".faq__answer", item);
      if (!summary || !answer) return;
      var animating = false;

      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (animating) return;
        animating = true;

        if (item.open) {
          answer.style.height = answer.scrollHeight + "px";
          void answer.offsetHeight;
          answer.style.transition = "height .45s cubic-bezier(.16,1,.3,1)";
          answer.style.height = "0px";
          setTimeout(function () {
            item.open = false;
            answer.style.height = "";
            answer.style.transition = "";
            animating = false;
          }, 450);
        } else {
          /* Cierra el resto (acordeón exclusivo) */
          qsa(".faq__item[open]").forEach(function (other) { if (other !== item) other.open = false; });
          item.open = true;
          var h = answer.scrollHeight;
          answer.style.height = "0px";
          void answer.offsetHeight;
          answer.style.transition = "height .5s cubic-bezier(.16,1,.3,1)";
          answer.style.height = h + "px";
          setTimeout(function () {
            answer.style.height = "";
            answer.style.transition = "";
            animating = false;
          }, 500);
        }
      });
    });
  });

  /* ------------------------------------------------------------------------
     20. Volver arriba, burbuja de WhatsApp y año
     ------------------------------------------------------------------------ */
  safe(function floatingModule() {
    var toTop = qs("#to-top");
    if (toTop) {
      onScroll(function (y) { toTop.classList.toggle("is-visible", y > 700); });
      toTop.addEventListener("click", function () { App.scrollTo(null); });
    }

    var fab = qs(".fab");
    if (fab && finePointer && !reduceMotion) {
      onLoaded(function () {
        setTimeout(function () {
          fab.classList.add("show-tip");
          setTimeout(function () { fab.classList.remove("show-tip"); }, 4500);
        }, 6000);
      });
    }

    var year = qs("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  });

  runScroll();
})();
