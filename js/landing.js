/* ==========================================================================
   Los Capes | landing.js
   Comportamiento de las páginas de aterrizaje (hoy: tacos de camarón).
   Mejora progresiva: sin JS la página se ve completa; con JS se suman la
   aparición al hacer scroll, contadores, inclinación de tarjetas, estado
   "abierto ahora" y el aviso de la promo del día.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  /* Avisa al script del <head> que esto cargó: si no llega, ese script quita
     la clase "js" y todo el contenido queda visible. */
  html.classList.add("lp-ready");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function safe(fn) { try { fn(); } catch (e) { /* un módulo roto no debe romper la página */ } }

  /* Mismos valores que el sitio principal (js/main.js) */
  var CONFIG = {
    timeZone: "America/Mazatlan",
    openHour: 9,
    closeHour: 16,
    closedWeekdays: [2, 3],  /* martes y miércoles */
    promoWeekdays: [1, 4]    /* lunes y jueves */
  };

  /* ------------------------------------------------------------------------
     Año del pie de página
     ------------------------------------------------------------------------ */
  safe(function () {
    var year = qs("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------------
     Menú móvil
     ------------------------------------------------------------------------ */
  safe(function () {
    var burger = qs("#burger");
    var panel = qs("#mobile-menu");
    if (!burger || !panel) return;

    function open() {
      html.classList.add("menu-open", "is-locked");
      panel.removeAttribute("inert");
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Cerrar menú");
    }
    function close() {
      if (!html.classList.contains("menu-open")) return;
      html.classList.remove("menu-open", "is-locked");
      panel.setAttribute("inert", "");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Abrir menú");
    }
    burger.addEventListener("click", function () {
      if (html.classList.contains("menu-open")) close(); else open();
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && html.classList.contains("menu-open")) { close(); burger.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1024) close(); });
  });

  /* ------------------------------------------------------------------------
     Títulos partidos en palabras (el texto no cambia, solo se envuelve)
     ------------------------------------------------------------------------ */
  function splitNode(node, counter) {
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          var outer = document.createElement("span");
          outer.className = "sw";
          var inner = document.createElement("span");
          inner.className = "sw__in";
          inner.textContent = part;
          inner.style.setProperty("--wi", counter.i++);
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
      } else if (child.nodeType === 1) {
        var clone = child.cloneNode(false);
        clone.appendChild(splitNode(child, counter));
        frag.appendChild(clone);
      }
    });
    return frag;
  }

  safe(function () {
    if (reduceMotion) return;
    qsa("[data-split]").forEach(function (el) {
      var counter = { i: 0 };
      var frag = splitNode(el, counter);
      el.textContent = "";
      el.appendChild(frag);
    });
  });

  /* ------------------------------------------------------------------------
     Aparición al hacer scroll
     ------------------------------------------------------------------------ */
  safe(function () {
    var targets = qsa("[data-reveal], [data-split]");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      targets.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  });

  /* ------------------------------------------------------------------------
     Contadores (el HTML ya trae el valor final; esto solo lo anima)
     ------------------------------------------------------------------------ */
  safe(function () {
    var nodes = qsa("[data-count-to]");
    if (!nodes.length || reduceMotion || !("IntersectionObserver" in window)) return;

    function animate(el) {
      var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      var dur = 1300;
      var start = performance.now();
      el.textContent = "0";
      (function step(now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(2, -10 * p);
        el.textContent = String(Math.round(to * (p === 1 ? 1 : eased)));
        if (p < 1) requestAnimationFrame(step);
      })(start);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (el) { io.observe(el); });
  });

  /* ------------------------------------------------------------------------
     Horario en vivo, promo del día y semana
     ------------------------------------------------------------------------ */
  safe(function () {
    var chips = qsa("[data-status]");
    var promoChips = qsa("[data-promo]");
    var dayNotes = qsa("[data-daynote]");
    var clock = qs("#local-clock");
    var weekItems = qsa("[data-week] li");

    function now() {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.timeZone, weekday: "short", hour: "numeric", minute: "numeric", hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { weekday: weekdays[map.weekday], hour: parseInt(map.hour, 10) % 24, minute: parseInt(map.minute, 10) };
    }

    function dayNote(weekday, minutes) {
      var beforeOpen = minutes < CONFIG.openHour * 60;
      var afterClose = minutes >= CONFIG.closeHour * 60;
      switch (weekday) {
        case 1:
        case 4:
          if (afterClose) return weekday === 1 ? "Hoy ya cerramos. La próxima promo es el jueves." : "Hoy ya cerramos. La próxima promo es el lunes.";
          if (beforeOpen) return "Hoy es día de promo: abrimos a las 9:00.";
          return weekday === 1 ? "¡Hoy es lunes: la promo está activa!" : "¡Hoy es jueves: la promo está activa!";
        case 2: return "Hoy descansamos. La promo vuelve el jueves.";
        case 3: return "Hoy descansamos. Mañana jueves hay promo.";
        default: return "La próxima promo es el lunes.";
      }
    }

    var DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

    function isClosedDay(weekday) {
      return CONFIG.closedWeekdays.indexOf(weekday) > -1;
    }

    /* Cuándo vuelve a abrir: "mañana" o "el jueves", saltando los días de descanso */
    function nextOpenLabel(weekday) {
      for (var d = 1; d <= 7; d++) {
        var day = (weekday + d) % 7;
        if (!isClosedDay(day)) return d === 1 ? "mañana" : "el " + DAY_NAMES[day];
      }
      return "mañana";
    }

    function update() {
      var t = now();
      var minutes = t.hour * 60 + t.minute;
      var openMin = CONFIG.openHour * 60;
      var closeMin = CONFIG.closeHour * 60;
      var closedDay = isClosedDay(t.weekday);
      var isOpen = !closedDay && minutes >= openMin && minutes < closeMin;

      var text;
      if (isOpen) {
        var left = closeMin - minutes;
        text = left <= 45 ? "Abierto · cerramos en " + left + " min" : "Abierto ahora · hasta las 16:00";
      } else if (closedDay) {
        text = "Hoy descansamos · abrimos " + nextOpenLabel(t.weekday) + " 9:00";
      } else if (minutes < openMin) {
        text = "Cerrado · abrimos hoy a las 9:00";
      } else {
        text = "Cerrado · abrimos " + nextOpenLabel(t.weekday) + " 9:00";
      }

      chips.forEach(function (chip) {
        chip.setAttribute("data-open", isOpen ? "true" : "false");
        var el = qs("[data-status-text]", chip);
        if (el) el.textContent = text;
      });

      var promo = !closedDay && CONFIG.promoWeekdays.indexOf(t.weekday) > -1;
      promoChips.forEach(function (chip) {
        chip.setAttribute("data-active", promo ? "true" : "false");
        var el = qs("[data-promo-text]", chip);
        if (el) el.textContent = promo ? "Promo activa hoy" : "Solo lunes y jueves";
      });
      dayNotes.forEach(function (el) { el.textContent = dayNote(t.weekday, minutes); });

      if (clock) clock.textContent = (t.hour < 10 ? "0" : "") + t.hour + ":" + (t.minute < 10 ? "0" : "") + t.minute;
      weekItems.forEach(function (li) {
        li.classList.toggle("is-today", parseInt(li.getAttribute("data-day"), 10) === t.weekday);
      });
    }

    update();
    setInterval(update, 30000);
  });

  /* ------------------------------------------------------------------------
     Tarjetas: brillo que sigue al puntero e inclinación suave (solo ratón)
     ------------------------------------------------------------------------ */
  safe(function () {
    if (!finePointer || reduceMotion) return;

    qsa("[data-spot]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--sx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        el.style.setProperty("--sy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
    });

    qsa("[data-tilt]").forEach(function (el) {
      var raf = 0;
      el.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(900px) rotateX(" + (-py * 5).toFixed(2) + "deg) rotateY(" + (px * 6).toFixed(2) + "deg)";
        });
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  });

  /* ------------------------------------------------------------------------
     Calculadora "¿Cuánto gastas?" (solo en la página de tacos económicos)
     Cada renglón del ticket trae sus datos en el HTML (data-id, data-price,
     data-name). La promo 2×$65 se aplica a los tacos de camarón sencillos
     (data-promo) los lunes y jueves; un interruptor permite simular esos días.
     Los ejemplos con data-load llenan la cuenta con un toque.
     ------------------------------------------------------------------------ */
  safe(function () {
    var root = qs("[data-calc]");
    if (!root) return;

    var PROMO_PAIR = 65;
    var WA = "https://wa.me/526682452744";
    var lines = qsa("[data-id]", root);
    var qty = {};
    lines.forEach(function (li) { qty[li.getAttribute("data-id")] = 0; });

    var elSub = qs("[data-sub]", root);
    var elDisc = qs("[data-disc]", root);
    var rowDisc = qs("[data-disc-row]", root);
    var elTotal = qs("[data-total]", root);
    var elNote = qs("[data-calc-note]", root);
    var elWa = qs("[data-calc-wa]", root);
    var toggle = qs("[data-promo-toggle]", root);
    var toggleText = qs("[data-promo-toggle-text]", root);

    function realPromoDay() {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, weekday: "short" }).formatToParts(new Date());
      var w = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts[0].value];
      return CONFIG.promoWeekdays.indexOf(w) > -1;
    }
    var promoOn = realPromoDay();

    function money(n) { return "$" + n; }

    function render() {
      var sub = 0;
      var promoUnits = 0;
      var chosen = [];

      lines.forEach(function (li) {
        var id = li.getAttribute("data-id");
        var q = qty[id];
        var price = parseInt(li.getAttribute("data-price"), 10);
        var on = q > 0;
        li.classList.toggle("is-on", on);
        qs("[data-qty]", li).textContent = String(q);
        var dec = qs("[data-act=\"dec\"]", li);
        if (dec) dec.disabled = !on;
        if (on) {
          sub += q * price;
          chosen.push(q + " " + li.getAttribute(q === 1 ? "data-name" : "data-plural"));
        }
        if (li.hasAttribute("data-promo")) promoUnits += q;
      });

      var pairs = Math.floor(promoUnits / 2);
      var disc = promoOn ? pairs * (2 * 40 - PROMO_PAIR) : 0;
      var total = sub - disc;

      elSub.textContent = money(sub);
      elDisc.textContent = "-" + money(disc);
      rowDisc.hidden = disc === 0;
      elTotal.textContent = money(total);

      if (toggle) {
        toggle.setAttribute("aria-checked", promoOn ? "true" : "false");
        if (toggleText) toggleText.textContent = promoOn ? "Promo activa (lunes o jueves)" : "Simular lunes o jueves";
      }

      if (disc > 0) elNote.textContent = "¡La promo te ahorra " + money(disc) + "!";
      else if (promoOn && promoUnits === 1) elNote.textContent = "Agrega otro taco de camarón sencillo y la promo se aplica.";
      else if (!promoOn && promoUnits >= 2) elNote.textContent = "Lunes y jueves estos tacos te costarían menos con la promo.";
      else elNote.textContent = "Pago en efectivo. Para llevar: empaque $5 por plato.";

      var msg;
      if (chosen.length) {
        msg = "Hola Los Capes, quiero hacer este pedido:\n- " + chosen.join("\n- ") +
          "\nTotal estimado: " + money(total) + (disc ? " (con promo 2×$65)" : "") + ". Pago en efectivo.";
      } else {
        msg = "Hola Los Capes, quiero hacer un pedido.";
      }
      elWa.href = WA + "?text=" + encodeURIComponent(msg);
      elWa.classList.toggle("is-empty", chosen.length === 0);
    }

    root.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-act]");
      if (btn) {
        var li = btn.closest("[data-id]");
        var id = li.getAttribute("data-id");
        var next = qty[id] + (btn.getAttribute("data-act") === "inc" ? 1 : -1);
        qty[id] = Math.max(0, Math.min(20, next));
        render();
        return;
      }
      if (e.target.closest && e.target.closest("[data-promo-toggle]")) { promoOn = !promoOn; render(); return; }
      if (e.target.closest && e.target.closest("[data-calc-reset]")) {
        Object.keys(qty).forEach(function (k) { qty[k] = 0; });
        render();
      }
    });

    /* Ejemplos: llenan la cuenta con un toque y llevan al ticket */
    qsa("[data-load]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Object.keys(qty).forEach(function (k) { qty[k] = 0; });
        btn.getAttribute("data-load").split(",").forEach(function (pair) {
          var kv = pair.split(":");
          if (qty.hasOwnProperty(kv[0])) qty[kv[0]] = parseInt(kv[1], 10) || 0;
        });
        var p = btn.getAttribute("data-promo");
        if (p) promoOn = p === "on";
        render();
        root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      });
    });

    render();
  });
})();
