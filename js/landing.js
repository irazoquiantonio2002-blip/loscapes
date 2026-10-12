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
    closedWeekday: 2,      /* martes */
    promoWeekdays: [1, 4]  /* lunes y jueves */
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

    function dayNote(weekday) {
      switch (weekday) {
        case 1: return "¡Hoy es lunes: la promo está activa!";
        case 4: return "¡Hoy es jueves: la promo está activa!";
        case 2: return "Hoy descansamos. La promo vuelve el jueves.";
        case 3: return "Mañana es jueves: promo de camarón.";
        default: return "La próxima promo es el lunes.";
      }
    }

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

      var promo = !closedDay && CONFIG.promoWeekdays.indexOf(t.weekday) > -1;
      promoChips.forEach(function (chip) {
        chip.setAttribute("data-active", promo ? "true" : "false");
        var el = qs("[data-promo-text]", chip);
        if (el) el.textContent = promo ? "Promo activa hoy" : "Solo lunes y jueves";
      });
      dayNotes.forEach(function (el) { el.textContent = dayNote(t.weekday); });

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
})();
