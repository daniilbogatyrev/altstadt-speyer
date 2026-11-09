(function () {
  "use strict";

  var LANGS = ["de", "en", "fr", "it"];
  var BOOKING_BASE = "https://www.booking.com/hotel/de/altstadt-speyer.";
  var BOOKING_QUERY = "?group_adults=2&group_children=0&no_rooms=1";
  var STORE_KEY = "altstadt-speyer-lang";
  var dict = null;
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function t(k) { return (dict && dict[k]) || k; }
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
      if (v != null) el.textContent = v;
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

    root.innerHTML =
      '<div class="slider__track">' + photos.map(function (p, i) {
        return '<button type="button" class="slider__slide" data-lb="room-' + cat + '" data-lb-src="' + p.src + '">' +
          '<img src="' + p.src + '" alt="" ' + (i === 0 ? "" : 'loading="lazy" ') + 'width="' + p.w + '" height="' + p.h + '"></button>';
      }).join("") + "</div>" +
      (n > 1 ? '<button type="button" class="round round--prev" data-i18n-aria="lb.prev" aria-label="Zurück">‹</button>' +
               '<button type="button" class="round round--next" data-i18n-aria="lb.next" aria-label="Weiter">›</button>' : "") +
      '<span class="slider__count"></span><span class="slider__bar"><span></span></span>';

    var track = root.querySelector(".slider__track");
    var count = root.querySelector(".slider__count");
    var bar = root.querySelector(".slider__bar span");
    var slides = $$(".slider__slide", root);

    function go(i) {
      idx = (i + n) % n;
      track.style.transform = "translateX(" + (-idx * 100) + "%)";
      count.textContent = pad(idx + 1) + " / " + pad(n);
      bar.style.width = ((idx + 1) / n * 100) + "%";
      slides.forEach(function (s, k) { s.tabIndex = k === idx ? 0 : -1; s.setAttribute("aria-hidden", k === idx ? "false" : "true"); });
      var next = slides[(idx + 1) % n];
      if (next) { var im = next.querySelector("img"); if (im.loading === "lazy") im.loading = "eager"; }
    }

    var prev = root.querySelector(".round--prev"), nextBtn = root.querySelector(".round--next");
    if (prev) prev.addEventListener("click", function () { go(idx - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(idx + 1); });

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
    // a swipe should not open the lightbox
    root.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);

    this.relabel = function () {
      slides.forEach(function (s, k) { s.setAttribute("aria-label", t("cat." + cat) + " — " + t("photo") + " " + (k + 1)); s.setAttribute("data-lb-cat", t("cat." + cat)); });
      slides.forEach(function (s) { s.querySelector("img").alt = s.getAttribute("aria-label"); });
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
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- init ---------- */
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
