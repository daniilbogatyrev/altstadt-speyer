(function () {
  "use strict";

  var LANGS = ["de", "en", "fr", "it"];
  var BOOKING_BASE = "https://www.booking.com/hotel/de/altstadt-speyer.";
  var BOOKING_QUERY = "?group_adults=2&group_children=0&no_rooms=1";
  var STORE_KEY = "altstadt-speyer-lang";
  var currentDict = null;
  var renderAlbum = null;
  function t(k) { return (currentDict && currentDict[k]) || k; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

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

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-aria")];
      if (v != null) el.setAttribute("aria-label", v);
    });

    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-current", b.getAttribute("data-lang") === lang ? "true" : "false");
    });

    currentDict = dict;
    if (typeof renderAlbum === "function") renderAlbum();
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


  // ---------- album (all photos, filterable) ----------
  var CATS = ["wohnen", "schlafen", "bad", "hof"];
  var albumEl = document.getElementById("album");
  var filtersEl = document.getElementById("filters");
  var countEl = document.getElementById("album-count");
  var activeCat = "all";
  var ALL = [];
  CATS.forEach(function (c) {
    (window.PHOTOS[c] || []).forEach(function (p, i) { ALL.push({ cat: c, i: i + 1, src: p.src, thumb: p.thumb, w: p.w, h: p.h }); });
  });

  renderAlbum = function () {
    if (!albumEl) return;
    // filters
    var cats = ["all"].concat(CATS);
    filtersEl.innerHTML = cats.map(function (c) {
      var n = c === "all" ? ALL.length : window.PHOTOS[c].length;
      return '<button type="button" role="tab" data-cat="' + c + '" aria-selected="' + (c === activeCat) + '">' +
        t("cat." + c) + ' <span class="mono">' + n + '</span></button>';
    }).join("");
    // tiles
    var list = ALL.filter(function (p) { return activeCat === "all" || p.cat === activeCat; });
    countEl.textContent = pad(list.length);
    albumEl.innerHTML = list.map(function (p, idx) {
      var shape = p.w / p.h > 1.6 ? "wide" : (p.h > p.w ? "tall" : "std");
      var label = t("cat." + p.cat) + " — " + t("photo") + " " + p.i;
      return '<li class="album__item album__item--' + shape + '">' +
        '<button type="button" class="album__btn" data-lb="album" data-lb-src="' + p.src + '" data-lb-cat="' + t("cat." + p.cat) + '" aria-label="' + label + '">' +
        '<img src="' + p.thumb + '" alt="' + label + '" loading="lazy" width="' + p.w + '" height="' + p.h + '">' +
        '<span class="album__n mono">' + pad(idx + 1) + '/' + pad(list.length) + '</span>' +
        '</button></li>';
    }).join("");
  };

  if (filtersEl) filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]");
    if (!b || b.getAttribute("data-cat") === activeCat) return;
    activeCat = b.getAttribute("data-cat");
    albumEl.classList.add("is-fading");
    setTimeout(function () { renderAlbum(); albumEl.classList.remove("is-fading"); }, 200);
  });

  // ---------- lightbox ----------
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCount = document.getElementById("lb-count");
  var lbCat = document.getElementById("lb-cat");
  var group = [], pos = 0, lastFocus = null;

  function captionOf(el) {
    if (el.getAttribute("data-lb-cat")) return el.getAttribute("data-lb-cat");
    var c = el.querySelector("figcaption [data-i18n], figcaption[data-i18n]") || el.closest(".step") && el.closest(".step").querySelector(".step__title");
    return c ? c.textContent : "";
  }
  function show(i) {
    pos = (i + group.length) % group.length;
    var el = group[pos];
    lbImg.src = el.getAttribute("data-lb-src");
    lbImg.alt = captionOf(el);
    lbCat.textContent = captionOf(el);
    lbCount.textContent = pad(pos + 1) + " / " + pad(group.length);
    [1, -1].forEach(function (d) { var n = group[(pos + d + group.length) % group.length]; if (n) { var im = new Image(); im.src = n.getAttribute("data-lb-src"); } });
    lb.classList.toggle("is-single", group.length < 2);
  }
  function open(el) {
    var g = el.getAttribute("data-lb");
    group = Array.prototype.slice.call(document.querySelectorAll('[data-lb="' + g + '"]'));
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.documentElement.classList.add("lb-open");
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    show(group.indexOf(el));
    document.getElementById("lb-close").focus();
  }
  function close() {
    lb.classList.remove("is-open");
    document.documentElement.classList.remove("lb-open");
    setTimeout(function () { lb.hidden = true; lbImg.removeAttribute("src"); }, 250);
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-lb]");
    if (el && !lb.contains(el)) { e.preventDefault(); open(el); }
  });
  document.querySelectorAll("figure[data-lb]").forEach(function (f) {
    f.setAttribute("tabindex", "0"); f.setAttribute("role", "button");
    f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(f); } });
  });
  document.getElementById("lb-close").addEventListener("click", close);
  document.getElementById("lb-prev").addEventListener("click", function () { show(pos - 1); });
  document.getElementById("lb-next").addEventListener("click", function () { show(pos + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lightbox__stage")) close(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(pos + 1);
    else if (e.key === "ArrowLeft") show(pos - 1);
    else if (e.key === "Tab") { // focus trap
      var f = Array.prototype.slice.call(lb.querySelectorAll("button")).filter(function (b) { return b.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
  }, { passive: true });
  // test helper: #photo-N opens album photo N
  var m = location.hash.match(/^#photo-(\d+)$/);
  if (m) setTimeout(function () { var b = document.querySelectorAll('#album [data-lb]')[+m[1] - 1]; if (b) open(b); }, 300);

  // init language (no transition)
  apply(detectLang());
  document.querySelectorAll("button[data-lang]").forEach(function (b) {
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
