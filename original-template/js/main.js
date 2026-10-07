/* ==========================================================================
   La Birriería RM  |  main.js
   JavaScript nativo, sin dependencias. Cada bloque es independiente y se
   ejecuta dentro de safe() para que un fallo no rompa el resto de la página.

   Bloques: loader, header y menú móvil, textos animados, entradas por
   scroll, hero (puntero, imán, partículas), estado abierto/cerrado,
   menú con pedido, formulario a WhatsApp.

   Nada escucha el evento scroll: se usa IntersectionObserver y las
   animaciones ligadas al scroll viven en el CSS (animation-timeline).
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Configuración del negocio (editar aquí)
     ------------------------------------------------------------------------ */
  const CONFIG = {
    businessName: 'La Birriería RM',
    whatsapp: '524427711594',            // 52 + 10 dígitos, sin signos
    timeZone: 'America/Mexico_City',
    open: 9 * 60,                        // 9:00
    close: 15 * 60,                      // 15:00
    openDays: [6, 0],                    // 6 = sábado, 0 = domingo
    storageKey: 'rm-birrieria-pedido-v1',
    maxQty: 20,
  };

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const money = (n) => '$' + n.toLocaleString('es-MX');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = (fn) => { try { fn(); } catch (err) { console.error('[La Birriería RM]', err); } };

  root.classList.add('js', 'is-loading');
  if ('scrollRestoration' in history && !location.hash) {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------------
     1. Loader: progreso simulado que espera a la carga real de la página
     ------------------------------------------------------------------------ */
  function initLoader() {
    const loader = $('#loader');
    const num = $('#loader-num');
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (loader) {
        loader.style.setProperty('--p', '100');
        if (num) num.textContent = '100';
        loader.classList.add('is-done');
      }
      root.classList.remove('is-loading');
      window.setTimeout(() => root.classList.add('is-ready'), reduceMotion.matches ? 0 : 450);
      window.setTimeout(() => loader && loader.remove(), 1500);
    };

    if (!loader) { finish(); return; }

    const MIN = reduceMotion.matches ? 300 : 1800;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    const tick = (now) => {
      if (finished) return;
      const t = Math.min((now - t0) / MIN, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const p = Math.min(eased * 100, loaded ? 100 : 90);
      loader.style.setProperty('--p', p.toFixed(1));
      if (num) num.textContent = String(Math.round(p));
      if (p >= 100) { window.setTimeout(finish, 280); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Tope de seguridad: nunca dejar al usuario esperando
    window.setTimeout(finish, 6000);
  }

  /* ------------------------------------------------------------------------
     2. Header (estado al hacer scroll) y menú móvil
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#site-header');
    const burger = $('#burger');
    const menu = $('#mobile-menu');
    if (!header) return;

    // Centinela: evita escuchar scroll para saber si la página ya bajó
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-stuck', !entry.isIntersecting);
    }).observe(sentinel);

    if (!burger || !menu) return;
    const behind = $$('main, footer, .fab, .cart-pill');

    const setMenu = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.toggleAttribute('inert', !open);
      menu.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      behind.forEach((el) => el.toggleAttribute('inert', open));
    };

    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------------------
     3. Textos animados y entradas por scroll
     ------------------------------------------------------------------------ */
  // Envuelve cada palabra. single = true genera un solo span (para el scroll del CSS)
  function splitWords(el, single = false) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
            if (single) {
              const w = document.createElement('span');
              w.className = 'sw';
              w.textContent = part;
              frag.append(w);
            } else {
              const outer = document.createElement('span');
              const inner = document.createElement('span');
              outer.className = 'w';
              inner.className = 'wi';
              inner.style.setProperty('--i', String(i++));
              inner.textContent = part;
              outer.append(inner);
              frag.append(outer);
            }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  }

  function initText() {
    $$('[data-hero-split], [data-split]').forEach((el) => splitWords(el));
    $$('[data-words]').forEach((el) => splitWords(el, true));

    const targets = $$('[data-reveal], [data-split]');
    if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     4. Hero: inclinación con el puntero, botones con imán, partículas
     ------------------------------------------------------------------------ */
  function initHeroPointer() {
    if (!finePointer.matches || reduceMotion.matches) return;
    const hero = $('#inicio');
    const tilt = $('.hero__tilt');
    if (!hero || !tilt) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      tilt.style.setProperty('--px', x.toFixed(3));
      tilt.style.setProperty('--py', y.toFixed(3));
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width - 0.5;
      y = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(apply); });
  }

  function initMagnetic() {
    if (!finePointer.matches || reduceMotion.matches) return;
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.setProperty('--mx', (dx * 10).toFixed(1) + 'px');
        btn.style.setProperty('--my', (dy * 8).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  // Brasas: motas cálidas que suben despacio por el hero. Se pausa fuera de pantalla.
  function initAmbient() {
    const canvas = $('#hero-canvas');
    const hero = $('#inicio');
    if (!canvas || !hero || reduceMotion.matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let parts = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    const readColor = () => getComputedStyle(root).getPropertyValue('--fx-ember').trim() || '194 35 30';
    let ember = readColor();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { ember = readColor(); });

    const rand = (a, b) => a + Math.random() * (b - a);
    const make = (anywhere) => ({
      x: rand(0, w),
      y: anywhere ? rand(0, h) : h + rand(4, 60),
      r: rand(0.8, 2.1),
      vy: rand(9, 24),
      sway: rand(8, 30),
      freq: rand(0.25, 0.8),
      phase: rand(0, Math.PI * 2),
      a: rand(0.16, 0.42),
    });

    const resize = () => {
      const r = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.round(Math.min(44, Math.max(14, w / 34))) }, () => make(true));
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy * dt;
        p.phase += p.freq * dt;
        if (p.y < -12) Object.assign(p, make(false));
        const x = p.x + Math.sin(p.phase) * p.sway;
        const edge = Math.min(1, p.y / (h * 0.3), (h - p.y + 40) / 80);
        const alpha = p.a * Math.max(edge, 0);
        ctx.fillStyle = `rgb(${ember} / ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
    };

    const run = () => {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    new ResizeObserver(() => { resize(); }).observe(hero);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? run() : stop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : run(); });
    run();
  }

  /* ------------------------------------------------------------------------
     5. Estado abierto / cerrado (hora de México, sin depender del dispositivo)
     ------------------------------------------------------------------------ */
  function initStatus() {
    const nodes = $$('[data-status]');
    if (!nodes.length) return;
    const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });

    const describe = (date = new Date()) => {
      const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
      const day = dayIndex[p.weekday];
      const minutes = (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10);
      if (CONFIG.openDays.includes(day) && minutes >= CONFIG.open && minutes < CONFIG.close) {
        return { open: true, text: 'Abierto ahora, hasta las 15:00' };
      }
      let when = 'el sábado 9:00';
      if (day === 6) when = minutes < CONFIG.open ? 'hoy 9:00' : 'mañana 9:00';
      if (day === 0 && minutes < CONFIG.open) when = 'hoy 9:00';
      return { open: false, text: `Cerrado, abrimos ${when}` };
    };

    const paint = () => {
      const s = describe();
      nodes.forEach((node) => {
        node.dataset.open = String(s.open);
        const label = $('[data-status-text]', node);
        if (label) label.textContent = s.text;
      });
    };
    paint();
    window.setInterval(paint, 60000);
  }

  /* ------------------------------------------------------------------------
     6. Menú: pestañas con indicador, foto que cambia y pedido
     ------------------------------------------------------------------------ */
  function initTabs() {
    const list = $('.tabs');
    if (!list) return;
    const tabs = $$('[role="tab"]', list);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const shots = $$('.menu__shot');

    const moveIndicator = () => {
      const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
      if (!active) return;
      list.style.setProperty('--x', active.offsetLeft + 'px');
      list.style.setProperty('--w', active.offsetWidth + 'px');
    };

    const select = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
        if (shots[i]) shots[i].classList.toggle('is-active', on);
      });
      moveIndicator();
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        const keys = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: last };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select(keys[e.key], true);
      });
    });

    moveIndicator();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
    new ResizeObserver(moveIndicator).observe(list);
  }

  function initOrder() {
    const dishes = $$('.dish');
    if (!dishes.length) return;

    const catalog = new Map();
    dishes.forEach((li) => catalog.set(li.dataset.id, {
      id: li.dataset.id, name: li.dataset.name, price: Number(li.dataset.price), el: li,
    }));

    const listEl = $('#summary-list');
    const emptyEl = $('#summary-empty');
    const totalRow = $('#summary-total-row');
    const totalEl = $('#summary-total');
    const clearBtn = $('#clear-order');
    const pill = $('#cart-pill');
    const pillCount = $('#cart-count');
    const pillTotal = $('#cart-total');
    const orderSection = $('#pedido');

    /* --- estado persistente --- */
    const load = () => {
      try {
        const data = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
        const clean = {};
        Object.entries(data).forEach(([id, q]) => {
          if (catalog.has(id) && Number.isInteger(q) && q > 0) clean[id] = Math.min(q, CONFIG.maxQty);
        });
        return clean;
      } catch { return {}; }
    };
    const save = () => { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(cart)); } catch { /* sin almacenamiento */ } };
    let cart = load();

    const items = () => Array.from(catalog.values())
      .filter((d) => cart[d.id] > 0)
      .map((d) => ({ ...d, qty: cart[d.id], line: cart[d.id] * d.price }));
    const totals = () => items().reduce((acc, i) => ({ count: acc.count + i.qty, total: acc.total + i.line }), { count: 0, total: 0 });

    /* --- controles de cantidad --- */
    const icon = (id) => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
    const stepper = (name) => `
      <div class="qty__stepper" role="group" aria-label="Cantidad de ${esc(name)}">
        <button type="button" data-act="dec" aria-label="Quitar uno de ${esc(name)}">${icon('i-minus')}</button>
        <output aria-live="polite">0</output>
        <button type="button" data-act="inc" aria-label="Agregar uno más de ${esc(name)}">${icon('i-plus')}</button>
      </div>`;

    catalog.forEach((d) => {
      const box = $('.qty', d.el);
      box.innerHTML = `<button class="qty__add" type="button" data-act="inc" aria-label="Agregar ${esc(d.name)} al pedido">${icon('i-plus')}</button>${stepper(d.name)}`;
    });

    const bump = (el) => {
      if (!el || reduceMotion.matches || !el.animate) return;
      el.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    };

    const summaryNodes = new Map();
    const buildSummaryRow = (d) => {
      const li = document.createElement('li');
      li.className = 'sl';
      li.dataset.id = d.id;
      li.innerHTML = `<span class="sl__name">${esc(d.name)}</span><span class="sl__total"></span><div class="qty has">${stepper(d.name)}</div>`;
      return li;
    };

    /* --- pintar todo --- */
    const render = () => {
      const { count, total } = totals();

      catalog.forEach((d) => {
        const q = cart[d.id] || 0;
        const box = $('.qty', d.el);
        box.classList.toggle('has', q > 0);
        $('output', box).textContent = String(q);
      });

      const current = items();
      const ids = new Set(current.map((i) => i.id));
      summaryNodes.forEach((li, id) => { if (!ids.has(id)) { li.remove(); summaryNodes.delete(id); } });
      current.forEach((item, index) => {
        let li = summaryNodes.get(item.id);
        if (!li) { li = buildSummaryRow(item); summaryNodes.set(item.id, li); }
        if (listEl.children[index] !== li) listEl.insertBefore(li, listEl.children[index] || null);
        $('.sl__total', li).textContent = money(item.line);
        $('output', li).textContent = String(item.qty);
      });

      emptyEl.hidden = count > 0;
      totalRow.hidden = count === 0;
      clearBtn.hidden = count === 0;
      totalEl.textContent = money(total);
      pillCount.textContent = String(count);
      pillTotal.textContent = money(total);
      syncPill();
    };

    let orderInView = false;
    const syncPill = () => { pill.classList.toggle('is-visible', totals().count > 0 && !orderInView); };
    if (orderSection) {
      new IntersectionObserver(([entry]) => { orderInView = entry.isIntersecting; syncPill(); }, { threshold: 0.15 }).observe(orderSection);
    }

    const setQty = (id, qty) => {
      const next = Math.max(0, Math.min(CONFIG.maxQty, qty));
      if (next === (cart[id] || 0)) return;
      if (next === 0) delete cart[id]; else cart[id] = next;
      save();
      render();
    };

    /* --- eventos delegados (menú y resumen comparten botones) --- */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const row = btn.closest('[data-id]');
      if (!row || !catalog.has(row.dataset.id)) return;
      const id = row.dataset.id;
      const before = cart[id] || 0;
      const inSummary = Boolean(btn.closest('.sl'));
      setQty(id, before + (btn.dataset.act === 'inc' ? 1 : -1));
      const after = cart[id] || 0;
      bump($('output', row));

      // Mantener el foco en un control visible tras el cambio
      if (inSummary) {
        if (after === 0) {
          const next = $('.sl [data-act="dec"]', listEl) || $('a', emptyEl);
          if (next) next.focus();
        }
      } else if (before === 0 && after > 0) {
        $('.qty__stepper [data-act="inc"]', row).focus();
      } else if (before > 0 && after === 0) {
        $('.qty__add', row).focus();
      }
    });

    clearBtn.addEventListener('click', () => {
      cart = {};
      save();
      render();
      $('a', emptyEl)?.focus();
    });

    render();
    return { items, totals };
  }

  /* ------------------------------------------------------------------------
     7. Formulario: valida y abre WhatsApp con el pedido ya escrito
     ------------------------------------------------------------------------ */
  function initForm(orderApi) {
    const form = $('#order-form');
    if (!form) return;
    const nameEl = $('#f-name');
    const addrEl = $('#f-address');
    const notesEl = $('#f-notes');
    const addrField = $('#address-field');
    const orderErr = $('#order-err');
    const done = $('#order-done');
    const fallback = $('#order-fallback');
    const modeEls = $$('input[name="mode"]', form);

    const mode = () => (modeEls.find((r) => r.checked) || {}).value || 'recoger';

    const setError = (input, errId, message) => {
      const err = document.getElementById(errId);
      if (!err) return;
      err.textContent = message || '';
      err.hidden = !message;
      if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    };
    const clearAll = () => {
      setError(nameEl, 'f-name-err', '');
      setError(addrEl, 'f-address-err', '');
      orderErr.hidden = true;
      orderErr.textContent = '';
      done.hidden = true;
    };

    modeEls.forEach((r) => r.addEventListener('change', () => {
      const delivery = mode() === 'domicilio';
      addrField.hidden = !delivery;
      if (!delivery) setError(addrEl, 'f-address-err', '');
    }));
    nameEl.addEventListener('input', () => setError(nameEl, 'f-name-err', ''));
    addrEl.addEventListener('input', () => setError(addrEl, 'f-address-err', ''));
    notesEl.addEventListener('input', () => { orderErr.hidden = true; });

    const buildMessage = (name, address, notes, order) => {
      const lines = [`Hola, ${CONFIG.businessName}. Quiero hacer un pedido:`, ''];
      if (order.items.length) {
        order.items.forEach((i) => lines.push(`- ${i.qty} x ${i.name} (${money(i.line)})`));
        lines.push('', `Total estimado: ${money(order.totals.total)}`, '');
      }
      lines.push(`Nombre: ${name}`);
      lines.push(`Modalidad: ${mode() === 'domicilio' ? 'Envío a domicilio' : 'Recoger'}`);
      if (mode() === 'domicilio') lines.push(`Dirección: ${address}`);
      if (notes) lines.push(`Comentarios: ${notes}`);
      return lines.join('\n');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearAll();

      const name = nameEl.value.trim();
      const address = addrEl.value.trim();
      const notes = notesEl.value.trim();
      const order = orderApi
        ? { items: orderApi.items(), totals: orderApi.totals() }
        : { items: [], totals: { count: 0, total: 0 } };
      let firstInvalid = null;

      if (name.length < 2) {
        setError(nameEl, 'f-name-err', 'Escribe tu nombre para identificar tu pedido.');
        firstInvalid = firstInvalid || nameEl;
      }
      if (mode() === 'domicilio' && address.length < 6) {
        setError(addrEl, 'f-address-err', 'Escribe tu dirección para el envío.');
        firstInvalid = firstInvalid || addrEl;
      }
      if (!order.items.length && notes.length < 3) {
        orderErr.textContent = 'Agrega algo del menú o escribe tu pedido en los comentarios.';
        orderErr.hidden = false;
        firstInvalid = firstInvalid || notesEl;
      }
      if (firstInvalid) { firstInvalid.focus(); return; }

      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(buildMessage(name, address, notes, order))}`;
      fallback.href = url;
      done.hidden = false;
      const win = window.open(url, '_blank');
      if (win) win.opener = null; else window.location.href = url;
    });
  }

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */
  function boot() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    safe(initText);           // primero: divide los textos antes de mostrar nada
    safe(initHeader);
    safe(initTabs);
    let orderApi = null;
    safe(() => { orderApi = initOrder(); });
    safe(() => initForm(orderApi));
    safe(initStatus);
    safe(initHeroPointer);
    safe(initMagnetic);
    safe(initAmbient);
    safe(initLoader);
  }

  // Si algo falla antes del loader, la página igual se muestra
  window.setTimeout(() => {
    root.classList.remove('is-loading');
    root.classList.add('is-ready');
  }, 8000);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
