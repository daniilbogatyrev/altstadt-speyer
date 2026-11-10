/* Apartment tabs + Smoobu booking engine in #smoobu-widget, in the page language.
   Without IDs in js/smoobu-config.js the preview note stays visible. */
(function () {
  "use strict";
  var cfg = window.SMOOBU || {}, apts = cfg.apartments || {};
  var box = document.getElementById("smoobu"), target = document.getElementById("smoobu-widget"), tabsEl = document.getElementById("utabs");
  if (!box || !target) return;

  var BASE = "https://login.smoobu.com";
  var LANGS = ["de", "en", "fr", "it"];
  var LOCALE = { de: "de-DE", en: "en-GB", fr: "fr-FR", it: "it-IT" };
  var unit = apts[window.SELECTED_UNIT] ? window.SELECTED_UNIT : "superior";
  var scriptLoaded = null, accepted = false; // consent lives only in memory for this page view

  function lang() { return LANGS.indexOf(document.documentElement.lang) > -1 ? document.documentElement.lang : "de"; }
  function t(k) { var d = window.I18N[lang()] || window.I18N.de; return d[k] != null ? d[k] : k; }
  function money(n) { return new Intl.NumberFormat(LOCALE[lang()], { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }

  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = Object.keys(apts).map(function (k) {
      var a = apts[k];
      return '<button type="button" role="tab" class="utab" data-u="' + k + '" aria-selected="' + (k === unit) + '"><span class="utab__name">' + a.name + '</span><span class="utab__price">' + money(a.price) + " / " + t("apt.night.short") + "</span></button>";
    }).join("");
  }

  function loadScript() {
    if (!scriptLoaded) {
      scriptLoaded = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = BASE + "/js/Settings/BookingToolIframe.js";
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return scriptLoaded;
  }

  function render() {
    renderTabs();
    var a = apts[unit];
    target.innerHTML = "";
    box.classList.remove("is-live", "is-gated");
    if (!cfg.userId || !a || !a.id) return;                 // not connected yet: preview note
    if (!accepted) { box.classList.add("is-gated"); return; } // nothing is requested from Smoobu before the click
    var url = BASE + "/" + lang() + "/booking-tool/iframe/" + encodeURIComponent(cfg.userId) + "/" + encodeURIComponent(a.id);
    loadScript().then(function () {
      window.BookingToolIframe.initialize({ url: url, baseUrl: BASE, target: "#smoobu-widget" });
      box.classList.add("is-live");
    }).catch(function () { box.classList.remove("is-live"); });
  }

  if (tabsEl) tabsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-u]");
    if (b && b.getAttribute("data-u") !== unit) { unit = b.getAttribute("data-u"); render(); }
  });
  document.addEventListener("selectunit", function (e) { if (apts[e.detail] && e.detail !== unit) { unit = e.detail; render(); } });
  var loadBtn = document.getElementById("smoobu-load");
  if (loadBtn) loadBtn.addEventListener("click", function () { accepted = true; render(); });
  document.addEventListener("langchange", render);
  render();
})();
