(function () {
  "use strict";

  var LANGS = ["de", "en", "fr", "it"];
  var BOOKING_BASE = "https://www.booking.com/hotel/de/altstadt-speyer.";
  var BOOKING_QUERY = "?group_adults=2&group_children=0&no_rooms=1";
  var STORE_KEY = "altstadt-speyer-lang";
  var dict = null;
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function t(k) { return (dict && dict[k]) || k; }
  // legal pages exist in German and English: German visitors get German, everyone else English
  function legalLinks() {
    var suffix = document.documentElement.lang === "de" ? "" : "-en";
    $$("[data-legal]").forEach(function (a) { a.setAttribute("href", a.getAttribute("data-legal") + suffix + ".html"); });
  }
  // {score} / {count} in texts come from js/reviews-config.js
  function fill(v) {
    var r = window.REVIEWS || {}, score = String(r.score || "");
    if (document.documentElement.lang === "en") score = score.replace(",", ".");
    return String(v).replace(/\{score\}/g, score).replace(/\{count\}/g, r.count || "");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function store(val) {
    try {
      if (val === undefined) return localStorage.getItem(STORE_KEY);
      localStorage.setItem(STORE_KEY, val);
    } catch (e) { return null; }
  }

  /* ---------- language ---------- */
  function detectLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.indexOf(q) > -1) return q;
    var s = store();
    if (s && LANGS.indexOf(s) > -1) return s;
    var nav = navigator.languages || [navigator.language || "de"];
    for (var i = 0; i < nav.length; i++) {
      var code = String(nav[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(code) > -1) return code;
    }
    return "de";
  }

  function apply(lang) {
    dict = window.I18N[lang];
    if (!dict) return;
    document.documentElement.lang = lang;
    document.title = dict._title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", dict._desc);

    $$("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v != null) el.textContent = fill(v);
    });
    $$("[data-rv=score]").forEach(function (el) { el.textContent = fill("{score}"); });
    $$("[data-i18n-html]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-html")];
      if (v != null) el.innerHTML = v; // our own strings only
    });
    $$("[data-i18n-aria]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-aria")];
      if (v != null) el.setAttribute("aria-label", v);
    });

    var href = BOOKING_BASE + dict._booking + ".html" + BOOKING_QUERY;
    $$(".js-book").forEach(function (a) { a.href = href; });

    $$("button[data-lang]").forEach(function (b) {
      b.setAttribute("aria-current", b.getAttribute("data-lang") === lang ? "true" : "false");
    });

    sliders.forEach(function (s) { s.relabel(); });
    syncThemeBtn();
    legalLinks();
    document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  }

  function switchLang(lang) {
    if (lang === document.documentElement.lang) return;
    store(lang);
    var url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    if (reduceMotion) return apply(lang);
    document.body.classList.add("is-switching");
    setTimeout(function () { apply(lang); document.body.classList.remove("is-switching"); }, 300);
  }

  /* ---------- sliders (rooms) ---------- */
  var sliders = [];

  function Slider(root) {
    var cat = root.getAttribute("data-cat");
    var photos = (window.PHOTOS && window.PHOTOS[cat]) || [];
    var n = photos.length, idx = 0;

    root.innerHTML = photos.map(function (p, i) {
        return '<button type="button" class="slider__slide" data-lb="room-' + cat + '" data-lb-src="' + p.src + '">' +
          '<img src="' + p.src + '" alt="" ' + (i === 0 ? "" : 'loading="lazy" ') + 'width="' + p.w + '" height="' + p.h + '"></button>';
      }).join("") +
      (n > 1 ? '<button type="button" class="round round--prev" data-i18n-aria="lb.prev" aria-label="Zurück">‹</button>' +
               '<button type="button" class="round round--next" data-i18n-aria="lb.next" aria-label="Weiter">›</button>' +
               '<div class="slider__dots">' + photos.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-label="' + (i + 1) + '"></button>'; }).join("") + '</div>' : "");

    var slides = $$(".slider__slide", root);
    var dots = $$(".slider__dots button", root);

    function go(i) {
      idx = (i + n) % n;
      slides.forEach(function (s, k) {
        var on = k === idx;
        s.classList.toggle("is-active", on);
        s.tabIndex = on ? 0 : -1;
        s.setAttribute("aria-hidden", on ? "false" : "true");
      });
      dots.forEach(function (d, k) { d.setAttribute("aria-current", k === idx ? "true" : "false"); });
      var nx = slides[(idx + 1) % n];
      if (nx) { var im = nx.querySelector("img"); if (im.loading === "lazy") im.loading = "eager"; }
    }
    this.go = go;
    this.cat = cat;
    this.current = function () { return slides[idx]; };

    var prev = root.querySelector(".round--prev"), nextBtn = root.querySelector(".round--next");
    if (prev) prev.addEventListener("click", function () { go(idx - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(idx + 1); });
    dots.forEach(function (d) { d.addEventListener("click", function () { go(+d.getAttribute("data-i")); }); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(idx + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(idx - 1); e.preventDefault(); }
    });

    var x0 = null, moved = false;
    root.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; moved = false; }, { passive: true });
    root.addEventListener("touchmove", function (e) { if (x0 !== null && Math.abs(e.touches[0].clientX - x0) > 10) moved = true; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
    root.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);

    this.relabel = function () {
      slides.forEach(function (s, k) {
        var label = t("cat." + cat) + " — " + t("photo") + " " + (k + 1);
        s.setAttribute("aria-label", label);
        s.setAttribute("data-lb-cat", t("cat." + cat));
        s.querySelector("img").alt = label;
      });
    };
    go(0);
  }

  $$(".slider[data-cat]").forEach(function (el) { sliders.push(new Slider(el)); });

  /* ---------- lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbCount = document.getElementById("lb-count");
  var lbCat = document.getElementById("lb-cat");
  var group = [], pos = 0, lastFocus = null;

  function captionOf(el) {
    if (el.getAttribute("data-lb-cat")) return el.getAttribute("data-lb-cat");
    var step = el.closest(".step");
    if (step) return step.querySelector(".step__title").textContent;
    var c = el.querySelector("figcaption");
    return c ? c.textContent : "";
  }
  function show(i) {
    pos = (i + group.length) % group.length;
    var el = group[pos];
    lbImg.src = el.getAttribute("data-lb-src");
    lbImg.alt = captionOf(el);
    lbCat.textContent = captionOf(el);
    lbCount.textContent = pad(pos + 1) + " / " + pad(group.length);
    [1, -1].forEach(function (d) { var nb = group[(pos + d + group.length) % group.length]; if (nb) { var im = new Image(); im.src = nb.getAttribute("data-lb-src"); } });
    lb.classList.toggle("is-single", group.length < 2);
  }
  function openLb(el) {
    group = $$('[data-lb="' + el.getAttribute("data-lb") + '"]');
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.documentElement.classList.add("lb-open");
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    show(group.indexOf(el));
    document.getElementById("lb-close").focus();
  }
  function closeLb() {
    lb.classList.remove("is-open");
    document.documentElement.classList.remove("lb-open");
    setTimeout(function () { lb.hidden = true; lbImg.removeAttribute("src"); }, 300);
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-lb]");
    if (el && !lb.contains(el)) { e.preventDefault(); openLb(el); }
  });
  $$("figure[data-lb]").forEach(function (f) {
    f.tabIndex = 0; f.setAttribute("role", "button");
    f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(f); } });
  });
  document.getElementById("lb-close").addEventListener("click", closeLb);
  document.getElementById("lb-prev").addEventListener("click", function () { show(pos - 1); });
  document.getElementById("lb-next").addEventListener("click", function () { show(pos + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lightbox__stage")) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowRight") show(pos + 1);
    else if (e.key === "ArrowLeft") show(pos - 1);
    else if (e.key === "Tab") {
      var f = $$("button", lb).filter(function (b) { return b.offsetParent !== null; });
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

  $$(".js-all").forEach(function (b) {
    b.addEventListener("click", function () {
      var sl = sliders.filter(function (x) { return x.cat === b.getAttribute("data-cat"); })[0];
      if (sl) openLb(sl.current());
    });
  });

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.documentElement.classList.toggle("lb-open", open);
    if (open) { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add("is-open"); }); }
    else { menu.classList.remove("is-open"); setTimeout(function () { menu.hidden = true; }, 400); }
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) setMenu(false); });

  /* ---------- header on scroll ---------- */
  var header = document.getElementById("header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 4); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- theme (light / dark) ---------- */
  var THEME_KEY = "altstadt-theme";
  var themeBtn = document.getElementById("theme");
  function storedTheme() { try { var v = localStorage.getItem(THEME_KEY); return v === "light" || v === "dark" ? v : null; } catch (e) { return null; } }
  function currentTheme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function syncThemeBtn() {
    if (!themeBtn) return;
    var dark = currentTheme() === "dark";
    themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
    var label = t(dark ? "theme.light" : "theme.dark");
    themeBtn.setAttribute("aria-label", label);
    themeBtn.title = label;
  }
  function applyTheme(theme, animate) {
    var root = document.documentElement;
    if (animate && !reduceMotion) { root.classList.add("theme-anim"); setTimeout(function () { root.classList.remove("theme-anim"); }, 450); }
    root.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "dark" ? "#0E1524" : "#FFFFFF");
    syncThemeBtn();
    document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next, true);
  });
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var onSystem = function (e) { if (!storedTheme()) applyTheme(e.matches ? "dark" : "light", true); };
    if (mq.addEventListener) mq.addEventListener("change", onSystem);
  }

  /* ---------- reviews (google link, quotes) + apartment preselection ---------- */
  (function () {
    var r = window.REVIEWS || {};
    var g = document.getElementById("rv-google");
    if (g && r.googleUrl) { g.href = r.googleUrl; g.hidden = false; }
    var q = document.getElementById("rv-quotes");
    if (q && r.quotes && r.quotes.length) {
      r.quotes.forEach(function (x) {
        var li = document.createElement("li"), bq = document.createElement("blockquote"), c = document.createElement("cite");
        bq.textContent = "„" + x.text + "“";
        c.textContent = [x.author, x.date].filter(Boolean).join(" · ") + " · Booking.com";
        li.appendChild(bq); li.appendChild(c); q.appendChild(li);
      });
    }
  })();
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-unit]");
    if (!a) return;
    window.SELECTED_UNIT = a.getAttribute("data-unit");
    document.dispatchEvent(new CustomEvent("selectunit", { detail: window.SELECTED_UNIT }));
  });

  /* ---------- init ---------- */
  applyTheme(currentTheme(), false);
  apply(detectLang());
  $$("button[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { switchLang(b.getAttribute("data-lang")); });
  });

  // reveal on scroll, staggered per parent
  var items = $$(".reveal");
  var groups = new Map();
  items.forEach(function (el) {
    var p = el.parentElement, k = groups.get(p) || 0;
    el.style.setProperty("--d", Math.min(k * 110, 550) + "ms");
    groups.set(p, k + 1);
  });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  // test helper: #lb-<cat>-<n> opens the lightbox on that room photo
  var m = location.hash.match(/^#lb-(\w+)-(\d+)$/);
  if (m) setTimeout(function () { var s = $$('[data-lb="room-' + m[1] + '"]')[+m[2] - 1]; if (s) openLb(s); }, 300);
})();
