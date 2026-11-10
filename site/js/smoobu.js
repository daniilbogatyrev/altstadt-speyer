/* Loads the Smoobu booking engine into #smoobu-widget, in the page language.
   Without IDs in js/smoobu-config.js the preview note stays visible. */
(function () {
  "use strict";
  var cfg = window.SMOOBU || {};
  var box = document.getElementById("smoobu");
  var target = document.getElementById("smoobu-widget");
  if (!box || !target || !cfg.userId) return;

  var BASE = "https://login.smoobu.com";
  var LANGS = ["de", "en", "fr", "it"];
  var scriptLoaded = null;

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
    var lang = LANGS.indexOf(document.documentElement.lang) > -1 ? document.documentElement.lang : "de";
    var url = BASE + "/" + lang + "/booking-tool/iframe/" + encodeURIComponent(cfg.userId) + (cfg.apartmentId ? "/" + encodeURIComponent(cfg.apartmentId) : "");
    loadScript().then(function () {
      target.innerHTML = "";
      window.BookingToolIframe.initialize({ url: url, baseUrl: BASE, target: "#smoobu-widget" });
      box.classList.add("is-live");
    }).catch(function () { box.classList.remove("is-live"); });
  }

  render();
  document.addEventListener("langchange", render);
})();
