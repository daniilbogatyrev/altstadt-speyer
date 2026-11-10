/* Availability calendar + booking request form. Talks to the Worker API (/api/*). */
(function () {
  "use strict";

  var root = document.getElementById("bk");
  if (!root) return;

  var $ = function (id) { return document.getElementById(id); };
  var monthsEl = $("cal-months"), hintEl = $("cal-hint"), priceEl = $("bk-price");
  var form = $("bform"), errEl = $("bk-error"), submitBtn = $("bk-submit"), doneEl = $("bk-done");
  var LOCALE = { de: "de-DE", en: "en-GB", fr: "fr-FR", it: "it-IT" };

  var cfg = null, busy = [], today = null, unit = "superior";
  function U() { return cfg.units[unit]; }
  var view = null;                 // first day of the left month, "YYYY-MM-01"
  var checkin = null, checkout = null, quote = null;
  var turnstileId = null, turnstileKey = "", quoteSeq = 0;

  function lang() { return document.documentElement.lang || "de"; }
  function t(key, vars) {
    var d = (window.I18N[lang()] || window.I18N.de);
    var s = d[key] != null ? d[key] : key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }
  function money(cents) { var whole = cents % 100 === 0; return new Intl.NumberFormat(LOCALE[lang()], { style: "currency", currency: "EUR", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100); }

  /* ---- date helpers on "YYYY-MM-DD" strings (UTC, no timezone drift) ---- */
  function toDate(s) { return new Date(s + "T00:00:00Z"); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function addMonths(s, n) { var d = toDate(s); d.setUTCMonth(d.getUTCMonth() + n, 1); return iso(d); }
  function nights(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
  function fmtDay(s) { return new Intl.DateTimeFormat(LOCALE[lang()], { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(toDate(s)); }

  function nightBusy(day) { return busy.some(function (r) { return r.start <= day && day < r.end; }); }
  /** Last possible checkout day for a given checkin (first busy night ends the range). */
  function maxCheckout(ci) {
    var d = ci;
    for (var i = 0; i < U().max_nights; i++) { if (nightBusy(d)) break; d = addDays(d, 1); }
    return d;
  }
  var lastDay = function () { return addDays(today, Math.round(cfg.max_months_ahead * 30.5)); };

  /* ---- render ---- */
  function monthHtml(first) {
    var d0 = toDate(first), y = d0.getUTCFullYear(), m = d0.getUTCMonth();
    var title = new Intl.DateTimeFormat(LOCALE[lang()], { month: "long", year: "numeric", timeZone: "UTC" }).format(d0);
    var wd = [];
    for (var i = 0; i < 7; i++) wd.push(new Intl.DateTimeFormat(LOCALE[lang()], { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i)))); // 2024-01-01 = Monday
    var lead = (d0.getUTCDay() + 6) % 7;
    var days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var limit = checkin && !checkout ? maxCheckout(checkin) : null;
    var cells = "";
    for (var k = 0; k < lead; k++) cells += "<span></span>";
    for (var n = 1; n <= days; n++) {
      var day = iso(new Date(Date.UTC(y, m, n)));
      var cls = ["cal__day"], off = false, isBusy = nightBusy(day);
      if (day < today || day > lastDay()) off = true;
      else if (limit) {                       // choosing checkout
        if (day > limit) off = true;
        else if (day < checkin && isBusy) off = true;
      } else if (isBusy) off = true;
      if (isBusy && !(limit && day === limit && day > checkin)) cls.push("is-busy");
      if (off) cls.push("is-off");
      if (day === checkin) cls.push("is-start");
      if (day === checkout) cls.push("is-end");
      if (checkin && checkout && day > checkin && day < checkout) cls.push("is-between");
      if (day === today) cls.push("is-today");
      cells += '<button type="button" class="' + cls.join(" ") + '" data-day="' + day + '"' + (off ? " disabled" : "") + ' aria-label="' + fmtDay(day) + (isBusy ? " – " + t("bk.busy") : "") + '">' + n + "</button>";
    }
    return '<div class="cal__month"><p class="cal__title">' + title + '</p><div class="cal__wd">' + wd.map(function (w) { return "<span>" + w + "</span>"; }).join("") + '</div><div class="cal__grid">' + cells + "</div></div>";
  }

  function render() {
    if (!cfg) return;
    monthsEl.innerHTML = monthHtml(view) + monthHtml(addMonths(view, 1));
    $("cal-prev").disabled = view <= today.slice(0, 8) + "01";
    $("cal-next").disabled = addMonths(view, 2) > lastDay();
    $("bk-in").textContent = checkin ? fmtDay(checkin) : "–";
    $("bk-out").textContent = checkout ? fmtDay(checkout) : "–";
    $("bk-reset").hidden = !checkin;
    if (!checkin) hint(t("bk.h.in"));
    else if (!checkout) hint(t("bk.h.out", { n: U().min_nights }));
    renderPrice();
  }
  function hint(text, warn) { hintEl.textContent = text; hintEl.classList.toggle("is-warn", !!warn); }

  function renderPrice() {
    var u = U();
    if (!quote) { priceEl.innerHTML = '<p class="muted">' + t("bk.from", { p: money(u.nightly_cents), n: u.min_nights }) + "</p>"; return; }
    var rows = quote.lines.map(function (l) {
      return "<div><span>" + l.nights + " × " + money(l.nightly_cents) + " (" + t(l.nights === 1 ? "bk.night" : "bk.nights") + ")</span><span>" + money(l.nights * l.nightly_cents) + "</span></div>";
    }).join("");
    var extra = quote.extra_guests > 0 && quote.extra_cents > 0 ? "<div><span>" + t("bk.extra", { n: quote.extra_guests }) + "</span><span>" + money(quote.extra_cents) + "</span></div>" : "";
    priceEl.innerHTML = rows + extra + "<div><span>" + t("bk.cleaning") + "</span><span>" + money(quote.cleaning_cents) + '</span></div><div class="bform__total"><span>' + t("bk.total") + "</span><span>" + money(quote.total_cents) + "</span></div>";
  }

  function loadQuote() {
    quote = null; renderPrice();
    if (!checkin || !checkout) return;
    var seq = ++quoteSeq;
    fetch("/api/quote?checkin=" + checkin + "&checkout=" + checkout + "&guests=" + $("bk-guests").value + "&unit=" + unit)
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (seq !== quoteSeq) return;
        if (res.ok) { quote = res.j; hint(t("bk.h.ok", { n: quote.nights })); }
        else { hint(errorText(res.j), true); if (res.j.error === "unavailable") { checkin = checkout = null; refresh(); } }
        renderPrice();
      }).catch(function () {});
  }

  function errorText(j) {
    var key = "bk.e." + (j && j.error || "server");
    var s = t(key, { n: (j && j.min_nights) || (cfg && U().min_nights) || "", g: (j && j.max_guests) || (cfg && U().max_guests) || "" });
    return s === key ? t("bk.e.server") : s;
  }

  /* ---- interaction ---- */
  monthsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-day]");
    if (!b || b.disabled) return;
    var day = b.getAttribute("data-day");
    if (!checkin || checkout || day <= checkin) {
      if (nightBusy(day)) return;
      checkin = day; checkout = null; quote = null;
    } else {
      if (nights(checkin, day) < U().min_nights) { hint(t("bk.e.min_nights", { n: U().min_nights }), true); return; }
      checkout = day;
    }
    showError("");
    render();
    if (checkout) loadQuote();
  });
  $("cal-prev").addEventListener("click", function () { view = addMonths(view, -1); render(); });
  $("cal-next").addEventListener("click", function () { view = addMonths(view, 1); render(); });
  $("bk-reset").addEventListener("click", function () { checkin = checkout = quote = null; render(); });
  $("bk-guests").addEventListener("change", loadQuote);

  function showError(text) { errEl.textContent = text; errEl.hidden = !text; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    if (!checkin || !checkout) { showError(t("bk.e.dates")); $("cal").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var f = new FormData(form);
    var payload = {
      unit: unit, checkin: checkin, checkout: checkout, guests: Number(f.get("guests")),
      name: f.get("name"), email: f.get("email"), phone: f.get("phone"), message: f.get("message"),
      website: f.get("website"), consent: f.get("consent") === "on", lang: lang(),
      turnstile: window.turnstile && turnstileId !== null ? window.turnstile.getResponse(turnstileId) : "",
    };
    submitBtn.disabled = true;
    submitBtn.firstElementChild.textContent = t("bk.sending");
    fetch("/api/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw res.j;
        form.hidden = true; doneEl.hidden = false;
        $("bk-done-id").textContent = U().name + " · " + t("bk.ok.id", { id: res.j.id, p: money(res.j.total_cents) });
        doneEl.focus();
        checkin = checkout = quote = null;
        refresh();
      })
      .catch(function (j) {
        showError(errorText(j));
        if (window.turnstile && turnstileId !== null) window.turnstile.reset(turnstileId);
        if (j && j.error === "unavailable") { checkin = checkout = quote = null; refresh(); }
      })
      .then(function () { submitBtn.disabled = false; submitBtn.firstElementChild.textContent = t("bk.submit"); });
  });

  /* ---- apartments ---- */
  function renderTabs() {
    var el = $("utabs");
    if (!el || !cfg) return;
    el.innerHTML = Object.keys(cfg.units).map(function (k) {
      var u = cfg.units[k];
      return '<button type="button" role="tab" class="utab" data-u="' + k + '" aria-selected="' + (k === unit) + '"><span class="utab__name">' + u.name + '</span><span class="utab__price">' + money(u.nightly_cents) + " / " + t("apt.night.short") + "</span></button>";
    }).join("");
  }
  function fillPrices() {
    if (!cfg) return;
    var min = Math.min.apply(null, Object.keys(cfg.units).map(function (k) { return cfg.units[k].nightly_cents; }));
    Array.prototype.forEach.call(document.querySelectorAll("[data-price]"), function (el) {
      var k = el.getAttribute("data-price"), c = k === "min" ? min : (cfg.units[k] && cfg.units[k].nightly_cents);
      if (c) el.textContent = money(c);
    });
  }
  function setUnit(k) {
    if (!cfg || !cfg.units[k]) return Promise.resolve();
    unit = k; checkin = checkout = quote = null;
    var u = U(), sel = $("bk-guests"); sel.innerHTML = "";
    for (var g = 1; g <= u.max_guests; g++) sel.insertAdjacentHTML("beforeend", "<option" + (g === Math.min(u.base_guests, u.max_guests) ? " selected" : "") + ">" + g + "</option>");
    form.hidden = false; doneEl.hidden = true; showError("");
    renderTabs();
    return refresh();
  }
  $("utabs").addEventListener("click", function (e) { var b = e.target.closest("[data-u]"); if (b && b.getAttribute("data-u") !== unit) setUnit(b.getAttribute("data-u")); });
  document.addEventListener("selectunit", function (e) { if (e.detail !== unit) setUnit(e.detail); });

  /* ---- data ---- */
  function refresh() {
    return fetch("/api/availability?unit=" + unit).then(function (r) { return r.json(); }).then(function (a) { busy = a.busy; today = a.today; render(); });
  }
  function initTurnstile(key) {
    if (!key) return;
    window.__bkTurnstile = function () { turnstileKey = key; turnstileId = window.turnstile.render("#bk-turnstile", { sitekey: key, language: lang(), theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light" }); };
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__bkTurnstile";
    s.async = true; document.head.appendChild(s);
  }

  fetch("/api/config").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (c) {
    cfg = c; today = c.today; view = today.slice(0, 8) + "01";
    fillPrices();
    initTurnstile(c.turnstile_site_key);
    return setUnit(c.units[window.SELECTED_UNIT] ? window.SELECTED_UNIT : "superior");
  }).catch(function () {
    // No booking backend reachable: keep the page useful.
    root.classList.add("is-offline");
    monthsEl.innerHTML = '<p class="muted">' + t("bk.offline") + "</p>";
    form.hidden = true;
  });

  document.addEventListener("themechange", function () {
    if (window.turnstile && turnstileId !== null) { window.turnstile.remove(turnstileId); turnstileId = window.turnstile.render("#bk-turnstile", { sitekey: turnstileKey, language: lang(), theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light" }); }
  });

  document.addEventListener("langchange", function () {
    if (root.classList.contains("is-offline")) { monthsEl.innerHTML = '<p class="muted">' + t("bk.offline") + "</p>"; return; }
    fillPrices(); renderTabs();
    render();
    if (quote) hint(t("bk.h.ok", { n: quote.nights }));
    submitBtn.firstElementChild.textContent = t("bk.submit");
  });
})();
