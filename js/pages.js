/* ==========================================================================
   Los Capes | pages.js
   JS mínimo para las páginas de guía: menú móvil y año del pie de página.
   Las páginas funcionan sin JS; esto solo habilita el botón de menú.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var burger = document.getElementById("burger");
  var panel = document.getElementById("mobile-menu");

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

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

  /* Si el enlace apunta a esta misma página, se cierra el menú al tocarlo */
  panel.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a")) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && html.classList.contains("menu-open")) { close(); burger.focus(); }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) close();
  });
})();
