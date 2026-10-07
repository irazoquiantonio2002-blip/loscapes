/* ==========================================================================
   Los Capes | main.js
   JavaScript nativo, sin dependencias. Cada bloque vive dentro de safe()
   para que un fallo aislado no rompa el resto de la página.

   Índice:
     0. Config y utilidades
     1. Loader
     2. Header: fondo al hacer scroll + barra de progreso
     3. Menú móvil
     4. Texto partido en palabras (headlines)
     5. Revelado al hacer scroll (IntersectionObserver)
     6. Contadores numéricos (precios y promo)
     7. Estado abierto/cerrado (horario real del negocio)
     8. Botones magnéticos + tilt del plato del hero
     9. Carrito (menú, panel lateral y ventana de pedido)
     10. Galería (arrastrar y flechas)
     11. Preguntas frecuentes (altura animada)
     12. Volver arriba
   ========================================================================== */

(function () {
  "use strict";

  var CONFIG = {
    phone: "526683856140",
    timeZone: "America/Mazatlan",
    openHour: 9,
    closeHour: 16,
    closedWeekday: 2 /* martes */
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn) {
    try { fn(); } catch (err) { console.error("[Los Capes]", err); }
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------------
     1. Loader
     ------------------------------------------------------------------------ */
  safe(function loaderModule() {
    var html = document.documentElement;
    html.classList.add("is-loading");

    var numEl = qs("#loader-num");
    var arc = qs(".loader__arc");
    var DURATION = 3000; /* el loader siempre dura 3s exactos, sin importar qué tan rápido cargue la página */

    if (reduceMotion) {
      if (numEl) numEl.textContent = "100";
      if (arc) arc.style.strokeDashoffset = "0";
      html.classList.remove("is-loading");
      return;
    }

    var start = null;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      html.classList.remove("is-loading");
    }

    function tick(ts) {
      if (done) return;
      if (!start) start = ts;
      var elapsed = ts - start;
      var p = Math.min(1, elapsed / DURATION);
      var eased = 1 - Math.pow(1 - p, 2);
      var shown = Math.round(eased * 100);
      if (numEl) numEl.textContent = shown;
      if (arc) arc.style.strokeDashoffset = String(100 - eased * 100);

      if (p >= 1) { finish(); return; }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    /* respaldo: si la pestaña está en segundo plano y rAF se pausa, el
       loader igual se quita a los 3s reales para no bloquear la página */
    setTimeout(function () {
      if (numEl) numEl.textContent = "100";
      if (arc) arc.style.strokeDashoffset = "0";
      finish();
    }, DURATION);
  });

  /* ------------------------------------------------------------------------
     2. Header: fondo al hacer scroll + barra de progreso
     ------------------------------------------------------------------------ */
  safe(function headerModule() {
    var header = qs("#site-header");
    var bar = qs("#scroll-progress");
    if (!header) return;

    var ticking = false;

    function update() {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle("is-scrolled", y > 8);

      if (bar) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var pct = max > 0 ? (y / max) * 100 : 0;
        bar.style.width = pct + "%";
      }
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  });

  /* ------------------------------------------------------------------------
     3. Menú móvil
     ------------------------------------------------------------------------ */
  safe(function mobileMenuModule() {
    var burger = qs("#burger");
    var panel = qs("#mobile-menu");
    var html = document.documentElement;
    if (!burger || !panel) return;

    function open() {
      html.classList.add("menu-open");
      burger.setAttribute("aria-expanded", "true");
      panel.removeAttribute("inert");
      var firstLink = qs("a", panel);
      if (firstLink) firstLink.focus({ preventScroll: true });
    }
    function close() {
      html.classList.remove("menu-open");
      burger.setAttribute("aria-expanded", "false");
      panel.setAttribute("inert", "");
    }

    burger.addEventListener("click", function () {
      html.classList.contains("menu-open") ? close() : open();
    });
    qsa("a", panel).forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && html.classList.contains("menu-open")) close();
    });
  });

  /* ------------------------------------------------------------------------
     4. Texto partido en palabras (headlines con efecto de entrada)
     ------------------------------------------------------------------------ */
  function splitWords(el) {
    if (!el || el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var text = el.textContent;
    el.innerHTML = "";
    text.split(/(\s+)/).forEach(function (chunk) {
      if (chunk.trim() === "") { el.appendChild(document.createTextNode(chunk)); return; }
      var wrap = document.createElement("span");
      wrap.className = "split-word";
      var inner = document.createElement("span");
      inner.textContent = chunk;
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
  }

  safe(function splitTextModule() {
    qsa("[data-split]").forEach(splitWords);

    var hero = qs("[data-hero-split]");
    if (hero) {
      /* conserva el <em> de énfasis: separa por nodos, no solo por texto plano */
      var frag = document.createDocumentFragment();
      Array.prototype.forEach.call(hero.childNodes, function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (chunk) {
            if (chunk.trim() === "") { frag.appendChild(document.createTextNode(chunk)); return; }
            var wrap = document.createElement("span");
            wrap.className = "split-word";
            var inner = document.createElement("span");
            inner.textContent = chunk;
            wrap.appendChild(inner);
            frag.appendChild(wrap);
          });
        } else if (node.nodeType === 1) {
          var wrap2 = document.createElement("span");
          wrap2.className = "split-word";
          var inner2 = document.createElement("span");
          inner2.appendChild(node.cloneNode(true));
          wrap2.appendChild(inner2);
          frag.appendChild(wrap2);
        }
      });
      hero.innerHTML = "";
      hero.appendChild(frag);
      requestAnimationFrame(function () {
        setTimeout(function () { hero.classList.add("is-ready"); }, reduceMotion ? 0 : 420);
      });
    }

    var words = qs("[data-words]");
    if (words && !words.dataset.splitDone) {
      words.dataset.splitDone = "1";
      qsa(".hl", words);
      var html = words.innerHTML;
      var container = document.createElement("div");
      container.innerHTML = html;
      var out = document.createDocumentFragment();

      function wrapTextNode(text) {
        text.split(/(\s+)/).forEach(function (chunk) {
          if (chunk.trim() === "") { out.appendChild(document.createTextNode(chunk)); return; }
          var span = document.createElement("span");
          span.className = "word";
          span.textContent = chunk;
          out.appendChild(span);
        });
      }

      Array.prototype.forEach.call(container.childNodes, function (node) {
        if (node.nodeType === 3) { wrapTextNode(node.textContent); }
        else if (node.nodeType === 1) {
          var span = document.createElement("span");
          span.className = node.className + " word";
          span.textContent = node.textContent;
          out.appendChild(span);
        }
      });
      words.innerHTML = "";
      words.appendChild(out);
    }
  });

  /* ------------------------------------------------------------------------
     5. Revelado al hacer scroll
     ------------------------------------------------------------------------ */
  safe(function revealModule() {
    var targets = qsa("[data-reveal], [data-split], [data-words]");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) { io.observe(el); });
  });

  /* ------------------------------------------------------------------------
     6. Contadores numéricos (precios y promo)
     ------------------------------------------------------------------------ */
  safe(function countModule() {
    var nodes = qsa("[data-count-to]");
    if (!nodes.length) return;

    function animateCount(el) {
      var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      var target = el.querySelector("[data-count-target]") || el;
      if (reduceMotion) { target.textContent = to; return; }
      var start = null;
      var duration = 900;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(eased * to);
        target.textContent = val;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(animateCount);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (el) { io.observe(el); });
  });

  /* ------------------------------------------------------------------------
     7. Estado abierto/cerrado (horario real, zona horaria del negocio)
     ------------------------------------------------------------------------ */
  safe(function statusModule() {
    var chips = qsa("[data-status]");
    var promoChips = qsa("[data-promo]");
    if (!chips.length && !promoChips.length) return;

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
      var weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return {
        weekday: weekdayMap[map.weekday],
        hour: parseInt(map.hour, 10),
        minute: parseInt(map.minute, 10)
      };
    }

    function update() {
      var t = now();
      var isClosedDay = t.weekday === CONFIG.closedWeekday;
      var minutesNow = t.hour * 60 + t.minute;
      var openMin = CONFIG.openHour * 60;
      var closeMin = CONFIG.closeHour * 60;
      var isOpen = !isClosedDay && minutesNow >= openMin && minutesNow < closeMin;

      chips.forEach(function (chip) {
        chip.setAttribute("data-open", isOpen ? "true" : "false");
        var textEl = chip.querySelector("[data-status-text]");
        if (!textEl) return;
        if (isOpen) textEl.textContent = "Abierto ahora, hasta las 16:00";
        else if (isClosedDay) textEl.textContent = "Cerrado hoy, martes de descanso";
        else if (minutesNow < openMin) textEl.textContent = "Cerrado, abrimos hoy a las 9:00";
        else textEl.textContent = "Cerrado, abrimos mañana a las 9:00";
      });

      var isPromoDay = !isClosedDay && t.weekday >= 1 && t.weekday <= 4;
      promoChips.forEach(function (chip) {
        chip.setAttribute("data-active", isPromoDay ? "true" : "false");
        var textEl = chip.querySelector("[data-promo-text]");
        if (textEl) textEl.textContent = isPromoDay ? "Promo activa hoy" : "Lunes a jueves";
      });
    }

    update();
    setInterval(update, 60000);
  });

  /* ------------------------------------------------------------------------
     8. Botones magnéticos + tilt del plato del hero
     ------------------------------------------------------------------------ */
  safe(function magneticModule() {
    if (reduceMotion || matchMedia("(pointer: coarse)").matches) return;

    qsa("[data-magnetic]").forEach(function (btn) {
      var raf = null, tx = 0, ty = 0;
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 14;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 14;
        if (!raf) raf = requestAnimationFrame(function () {
          btn.style.transform = "translate(" + tx + "px," + ty + "px)";
          raf = null;
        });
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "translate(0,0)";
      });
    });

    var plate = qs("[data-tilt]");
    var hero = qs(".hero");
    if (plate && hero) {
      var raf2 = null, rx = 0, ry = 0;
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        ry = px * 10;
        rx = py * -10;
        if (!raf2) raf2 = requestAnimationFrame(function () {
          plate.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
          raf2 = null;
        });
      });
      hero.addEventListener("pointerleave", function () {
        plate.style.transform = "rotateX(0) rotateY(0)";
      });
    }
  });

  /* ------------------------------------------------------------------------
     9. Carrito (menú, panel lateral y ventana de pedido)
     ------------------------------------------------------------------------ */
  safe(function cartModule() {
    var order = {}; /* id -> { name, price, qty, img } */
    var html = document.documentElement;
    var lastFocused = null;

    function money(n) { return "$" + n.toLocaleString("es-MX"); }
    function totalItems() { return Object.keys(order).reduce(function (s, id) { return s + order[id].qty; }, 0); }
    function totalPrice() { return Object.keys(order).reduce(function (s, id) { return s + order[id].qty * order[id].price; }, 0); }

    function setQty(id, meta, qty) {
      qty = Math.max(0, Math.min(20, qty));
      if (qty === 0) { delete order[id]; }
      else { order[id] = { name: meta.name, price: meta.price, img: meta.img, qty: qty }; }
      renderAll();
    }

    /* --- Steppers del menú ------------------------------------------------ */
    var stepperRenders = [];

    function buildStepper(container) {
      var id = container.getAttribute("data-id");
      var meta = {
        name: container.getAttribute("data-name"),
        price: parseInt(container.getAttribute("data-price"), 10),
        img: container.getAttribute("data-img") || ""
      };

      var minus = document.createElement("button");
      minus.type = "button";
      minus.className = "qty__btn qty__minus";
      minus.setAttribute("aria-label", "Quitar " + meta.name);
      minus.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-minus"/></svg>';
      minus.hidden = true;

      var count = document.createElement("span");
      count.className = "qty__count";
      count.textContent = "0";
      count.hidden = true;

      var plus = document.createElement("button");
      plus.type = "button";
      plus.className = "qty__btn qty__add";
      plus.setAttribute("aria-label", "Agregar " + meta.name);
      plus.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-plus"/></svg>';

      function render() {
        var qty = (order[id] && order[id].qty) || 0;
        count.textContent = qty;
        minus.hidden = qty < 1;
        count.hidden = qty < 1;
      }

      plus.addEventListener("click", function () { setQty(id, meta, ((order[id] && order[id].qty) || 0) + 1); });
      minus.addEventListener("click", function () { setQty(id, meta, ((order[id] && order[id].qty) || 0) - 1); });

      container.appendChild(minus);
      container.appendChild(count);
      container.appendChild(plus);
      stepperRenders.push(render);
    }

    qsa(".qty[data-id]").forEach(buildStepper);

    /* --- Header: botón e insignia ----------------------------------------- */
    var cartBtn = qs("#cart-btn");
    var cartBadge = qs("#cart-badge");

    /* --- Panel lateral ------------------------------------------------------ */
    var drawer = qs("#cart-drawer");
    var drawerOverlay = qs("#cart-overlay");
    var drawerList = qs("#cart-drawer-list");
    var drawerEmpty = qs("#cart-drawer-empty");
    var drawerFoot = qs("#cart-drawer-foot");
    var drawerTotal = qs("#cart-drawer-total");
    var cartClose = qs("#cart-close");
    var cartClearBtn = qs("#cart-clear-btn");
    var cartCheckoutBtn = qs("#cart-checkout-btn");

    function buildDrawerRow(id, item) {
      var li = document.createElement("li");
      li.className = "cart-drawer__row";

      var img = document.createElement("img");
      img.src = item.img;
      img.alt = "";
      img.loading = "lazy";
      li.appendChild(img);

      var info = document.createElement("div");
      info.innerHTML = '<p class="cart-drawer__row-name">' + item.name + '</p>' +
        '<p class="cart-drawer__row-price">' + money(item.price) + ' c/u</p>';
      li.appendChild(info);

      var qtyWrap = document.createElement("div");
      qtyWrap.className = "cart-drawer__row-qty";

      var controls = document.createElement("div");
      controls.className = "qty";
      var minus = document.createElement("button");
      minus.type = "button";
      minus.className = "qty__btn qty__minus";
      minus.setAttribute("aria-label", "Quitar " + item.name);
      minus.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-minus"/></svg>';
      minus.addEventListener("click", function () { setQty(id, item, item.qty - 1); });

      var count = document.createElement("span");
      count.className = "qty__count";
      count.textContent = item.qty;

      var plus = document.createElement("button");
      plus.type = "button";
      plus.className = "qty__btn qty__add";
      plus.setAttribute("aria-label", "Agregar " + item.name);
      plus.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-plus"/></svg>';
      plus.addEventListener("click", function () { setQty(id, item, item.qty + 1); });

      controls.appendChild(minus);
      controls.appendChild(count);
      controls.appendChild(plus);

      var lineTotal = document.createElement("p");
      lineTotal.className = "cart-drawer__row-price";
      lineTotal.textContent = money(item.qty * item.price);

      qtyWrap.appendChild(controls);
      qtyWrap.appendChild(lineTotal);
      li.appendChild(qtyWrap);

      return li;
    }

    function renderDrawer() {
      if (!drawerList) return;
      var ids = Object.keys(order);
      drawerList.innerHTML = "";

      if (ids.length === 0) {
        if (drawerEmpty) drawerEmpty.hidden = false;
        if (drawerFoot) drawerFoot.hidden = true;
      } else {
        if (drawerEmpty) drawerEmpty.hidden = true;
        if (drawerFoot) drawerFoot.hidden = false;
        ids.forEach(function (id) { drawerList.appendChild(buildDrawerRow(id, order[id])); });
        if (drawerTotal) drawerTotal.textContent = money(totalPrice());
      }
    }

    function renderBadge() {
      var count = totalItems();
      if (cartBtn) cartBtn.setAttribute("aria-label", "Ver carrito, " + count + " producto" + (count === 1 ? "" : "s"));
      if (!cartBadge) return;
      var was = cartBadge.hidden;
      cartBadge.hidden = count === 0;
      cartBadge.textContent = count;
      if (was && count > 0 && !reduceMotion) {
        cartBadge.classList.remove("is-bumped");
        void cartBadge.offsetWidth;
        cartBadge.classList.add("is-bumped");
      }
    }

    function renderCheckoutSummary() {
      var list = qs("#checkout-summary");
      var total = qs("#checkout-total");
      if (!list) return;
      list.innerHTML = "";
      Object.keys(order).forEach(function (id) {
        var item = order[id];
        var li = document.createElement("li");
        li.innerHTML = "<b>" + item.qty + "&times; " + item.name + "</b><span>" + money(item.qty * item.price) + "</span>";
        list.appendChild(li);
      });
      if (total) total.textContent = money(totalPrice());
    }

    function renderAll() {
      stepperRenders.forEach(function (r) { r(); });
      renderDrawer();
      renderBadge();
      renderCheckoutSummary();
    }

    function openDrawer(trigger) {
      lastFocused = trigger || document.activeElement;
      html.classList.add("cart-open");
      if (drawerOverlay) { drawerOverlay.hidden = false; requestAnimationFrame(function () { drawerOverlay.classList.add("is-visible"); }); }
      if (drawer) { drawer.removeAttribute("inert"); drawer.setAttribute("aria-hidden", "false"); }
      if (cartBtn) cartBtn.setAttribute("aria-expanded", "true");
      if (cartClose) cartClose.focus({ preventScroll: true });
    }
    function closeDrawer() {
      html.classList.remove("cart-open");
      if (drawerOverlay) { drawerOverlay.classList.remove("is-visible"); setTimeout(function () { drawerOverlay.hidden = true; }, 350); }
      if (drawer) { drawer.setAttribute("inert", ""); drawer.setAttribute("aria-hidden", "true"); }
      if (cartBtn) cartBtn.setAttribute("aria-expanded", "false");
      if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
    }

    if (cartBtn) cartBtn.addEventListener("click", function () { openDrawer(cartBtn); });
    if (cartClose) cartClose.addEventListener("click", closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
    qsa("a", drawer).forEach(function (a) { a.addEventListener("click", closeDrawer); });

    if (cartClearBtn) {
      cartClearBtn.addEventListener("click", function () {
        Object.keys(order).forEach(function (id) { delete order[id]; });
        renderAll();
      });
    }

    /* --- Ventana de pedido (checkout) -------------------------------------- */
    var modal = qs("#checkout-modal");
    var modalOverlay = qs("#checkout-overlay");
    var checkoutClose = qs("#checkout-close");
    var form = qs("#order-form");
    var nameField = qs("#f-name");
    var nameErr = qs("#f-name-err");
    var doneEl = qs("#order-done");
    var fallback = qs("#order-fallback");

    function openCheckout() {
      if (totalItems() === 0) return;
      lastFocused = document.activeElement;
      renderCheckoutSummary();
      html.classList.add("checkout-open");
      if (modalOverlay) { modalOverlay.hidden = false; requestAnimationFrame(function () { modalOverlay.classList.add("is-visible"); }); }
      if (modal) { modal.removeAttribute("inert"); modal.setAttribute("aria-hidden", "false"); }
      if (nameField) nameField.focus({ preventScroll: true });
    }
    function closeCheckout() {
      html.classList.remove("checkout-open");
      if (modalOverlay) { modalOverlay.classList.remove("is-visible"); setTimeout(function () { modalOverlay.hidden = true; }, 300); }
      if (modal) { modal.setAttribute("inert", ""); modal.setAttribute("aria-hidden", "true"); }
      if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
    }

    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener("click", function () {
        closeDrawer();
        setTimeout(openCheckout, 260);
      });
    }
    if (checkoutClose) checkoutClose.addEventListener("click", closeCheckout);
    if (modalOverlay) modalOverlay.addEventListener("click", closeCheckout);

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (html.classList.contains("checkout-open")) closeCheckout();
      else if (html.classList.contains("cart-open")) closeDrawer();
    });

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = (nameField.value || "").trim();
        var notes = (qs("#f-notes").value || "").trim();
        var hasName = name.length > 0;

        nameField.closest(".field").setAttribute("data-invalid", String(!hasName));
        if (nameErr) nameErr.hidden = hasName;
        if (!hasName || totalItems() === 0) return;

        var lines = ["Hola, soy " + name + ". Quiero mi pedido de Los Capes (para recoger en el local):"];
        Object.keys(order).forEach(function (id) {
          var item = order[id];
          lines.push("- " + item.qty + "x " + item.name + " (" + money(item.price) + " c/u)");
        });
        lines.push("Total estimado: " + money(totalPrice()));
        if (notes) lines.push("Notas: " + notes);

        var url = "https://wa.me/" + CONFIG.phone + "?text=" + encodeURIComponent(lines.join("\n"));
        if (fallback) fallback.href = url;
        if (doneEl) doneEl.hidden = false;
        window.open(url, "_blank", "noopener");

        setTimeout(function () {
          Object.keys(order).forEach(function (id) { delete order[id]; });
          renderAll();
          form.reset();
          if (doneEl) doneEl.hidden = true;
          closeCheckout();
        }, 2200);
      });
    }

    renderAll();
  });

  /* ------------------------------------------------------------------------
     10. Galería (arrastrar y flechas)
     ------------------------------------------------------------------------ */
  safe(function galleryModule() {
    var track = qs("#gallery-track");
    if (!track) return;

    var prevBtn = qs("[data-gallery-prev]");
    var nextBtn = qs("[data-gallery-next]");
    var step = function () {
      var item = track.querySelector(".gallery__item");
      return item ? item.getBoundingClientRect().width + 18 : 300;
    };

    if (nextBtn) nextBtn.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    if (prevBtn) prevBtn.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });

    var isDown = false, startX = 0, scrollStart = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      isDown = true; moved = false;
      startX = e.clientX;
      scrollStart = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = scrollStart - dx;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
      track.addEventListener(evt, function () { isDown = false; });
    });
    track.addEventListener("click", function (e) { if (moved) e.preventDefault(); }, true);
  });

  /* ------------------------------------------------------------------------
     11. Preguntas frecuentes (altura animada sobre <details> nativo)
     ------------------------------------------------------------------------ */
  safe(function faqModule() {
    var items = qsa(".faq__item");
    if (!items.length || reduceMotion) return;

    items.forEach(function (item) {
      var answer = qs(".faq__answer", item);
      if (!answer) return;

      item.addEventListener("toggle", function () {
        if (item.open) {
          var h = answer.scrollHeight;
          answer.style.transition = "none";
          answer.style.height = "0px";
          /* fuerza un reflow entre los dos cambios de altura, si no el
             navegador puede fusionarlos en el mismo frame y no animar */
          answer.offsetHeight;
          answer.style.transition = "height .35s cubic-bezier(.16,1,.3,1)";
          answer.style.height = h + "px";

          answer.addEventListener("transitionend", function clear() {
            answer.style.height = "";
            answer.style.transition = "";
            answer.removeEventListener("transitionend", clear);
          });
        }
      });
    });
  });

  /* ------------------------------------------------------------------------
     12. Volver arriba
     ------------------------------------------------------------------------ */
  safe(function toTopModule() {
    var btn = qs("#to-top");
    if (!btn) return;
    var ticking = false;

    function update() {
      btn.hidden = window.scrollY < window.innerHeight * 0.8;
      btn.classList.toggle("is-visible", !btn.hidden);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* ------------------------------------------------------------------------
     Año del pie de página
     ------------------------------------------------------------------------ */
  safe(function yearModule() {
    var y = qs("#year");
    if (y) y.textContent = new Date().getFullYear();
  });

})();
