(function () {
  "use strict";

  var LANGS = ["de", "en", "fr", "it"];
  var BOOKING_BASE = "https://www.booking.com/hotel/de/altstadt-speyer.";
  var BOOKING_QUERY = "?group_adults=2&group_children=0&no_rooms=1";
  var STORE_KEY = "altstadt-speyer-lang";

  function store(get, val) {
    try {
      if (get) return localStorage.getItem(STORE_KEY);
      localStorage.setItem(STORE_KEY, val);
    } catch (e) { return null; }
  }

  function detectLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.indexOf(q) > -1) return q;
    var s = store(true);
    if (s && LANGS.indexOf(s) > -1) return s;
    var nav = (navigator.languages || [navigator.language || "de"]);
    for (var i = 0; i < nav.length; i++) {
      var code = String(nav[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(code) > -1) return code;
    }
    return "de";
  }

  function apply(lang) {
    var dict = window.I18N[lang];
    if (!dict) return;
    document.documentElement.lang = lang;
    document.title = dict._title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", dict._desc);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v != null) el.textContent = v;
    });

    var href = BOOKING_BASE + dict._booking + ".html" + BOOKING_QUERY;
    document.querySelectorAll(".js-book").forEach(function (a) { a.href = href; });

    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-current", b.getAttribute("data-lang") === lang ? "true" : "false");
    });
  }

  function switchLang(lang) {
    if (lang === document.documentElement.lang) return;
    store(false, lang);
    var url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return apply(lang);
    document.body.classList.add("is-switching");
    setTimeout(function () {
      apply(lang);
      document.body.classList.remove("is-switching");
    }, 250);
  }

  // init language (no transition)
  apply(detectLang());
  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { switchLang(b.getAttribute("data-lang")); });
  });

  // missing photos → keep Swiss placeholder
  document.querySelectorAll(".ph img").forEach(function (img) {
    function miss() { img.closest(".ph").classList.add("is-missing"); }
    if (img.complete && img.naturalWidth === 0) miss();
    img.addEventListener("error", miss);
  });

  // reveal on scroll, staggered per parent
  var items = document.querySelectorAll(".reveal");
  var groups = new Map();
  items.forEach(function (el) {
    var p = el.parentElement;
    var n = groups.get(p) || 0;
    el.style.setProperty("--d", Math.min(n * 80, 480) + "ms");
    groups.set(p, n + 1);
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  // header rule on scroll
  var header = document.querySelector(".header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // live clock in Speyer
  var clock = document.getElementById("clock");
  var fmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  function tick() { clock.textContent = fmt.format(new Date()); }
  tick();
  setInterval(tick, 15000);

  document.getElementById("year").textContent = new Date().getFullYear();

  // grid overlay: press G
  document.addEventListener("keydown", function (e) {
    if ((e.key === "g" || e.key === "G") && !e.metaKey && !e.ctrlKey && !/input|textarea/i.test(e.target.tagName)) {
      document.body.classList.toggle("show-grid");
    }
  });
})();
