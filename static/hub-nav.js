/* Muratben Control Tower — yüzen başlatıcı (düzeni bozmaz) */
(function () {
  if (window.__hubNavLoaded) return; window.__hubNavLoaded = true;
  var HUB = "https://hub.muratben.com";
  var DEFAULT_PROJECTS = [
    {"id":"sistem1","name":"System 1","accent":"#26c6da","url":"https://pano.muratben.com/"},
    {"id":"breakout","name":"Breakout","accent":"#ef5350","url":"https://break.muratben.com/"},
    {"id":"vp","name":"Volume Profile","accent":"#ff9800","url":"https://vp.muratben.com/"},
    {"id":"sispython","name":"SISPYTHON","accent":"#3ddc97","url":"https://sispython.muratben.com/"},
    {"id":"tradermsg","name":"TraderMsg","accent":"#a371f7","url":"http://127.0.0.1:8787/"},
    {"id":"xwatch","name":"X Watch","accent":"#1d9bf0","url":"https://twit.muratben.com/"},
    {"id":"qlab","name":"QLAB","accent":"#f5b942","url":"https://noncry.muratben.com/"},
    {"id":"zvwap","name":"DSAVWAP (Zeiierman)","accent":"#089981","url":"https://zvwap.muratben.com/"}
  ];
  var here = location.hostname;
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) {
    try {
      var parsed = new URL(String(u));
      return /^https?:$/.test(parsed.protocol) ? parsed.href : HUB;
    } catch (e) { return HUB; }
  }
  function hostOf(u) {
    try { return new URL(safeUrl(u)).hostname; } catch (e) { return ""; }
  }
  function safeColor(c) {
    c = String(c || "").trim();
    return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/i.test(c) ? c : "#98a6b8";
  }

  var css = document.createElement("style");
  css.textContent = [
    "#hubFab{position:fixed;right:16px;bottom:16px;z-index:2147483600;",
    "font:600 13px/1 -apple-system,'Segoe UI',Roboto,Arial,sans-serif}",
    "#hubFab .btn{display:flex;align-items:center;gap:7px;cursor:pointer;",
    "background:rgba(12,14,18,.95);color:#ff9800;border:1px solid #2a3142;",
    "border-radius:999px;padding:9px 14px;box-shadow:0 6px 22px rgba(0,0,0,.5);",
    "backdrop-filter:blur(8px);user-select:none}",
    "#hubFab .btn:hover{border-color:#ff9800}",
    "#hubFab .btn .led{width:7px;height:7px;border-radius:50%;background:#ff9800;box-shadow:0 0 8px #ff9800}",
    "#hubFab .menu{position:absolute;right:0;bottom:48px;min-width:210px;display:none;",
    "background:rgba(16,20,29,.98);border:1px solid #2a3142;border-radius:12px;",
    "padding:6px;box-shadow:0 10px 34px rgba(0,0,0,.55);backdrop-filter:blur(10px)}",
    "#hubFab.open .menu{display:block}",
    "#hubFab .menu a{display:flex;align-items:center;gap:9px;text-decoration:none;",
    "color:#e6e8ee;padding:9px 10px;border-radius:8px;white-space:nowrap}",
    "#hubFab .menu a:hover{background:#1a1f2b}",
    "#hubFab .menu a.active{background:#1a1f2b;color:#ff9800}",
    "#hubFab .menu a .dot{width:8px;height:8px;border-radius:50%;flex:none}",
    "#hubFab .menu .home{color:#ff9800;font-weight:700;border-bottom:1px solid #222838;border-radius:8px 8px 0 0}"
  ].join("");
  document.head.appendChild(css);

  var wrap = document.createElement("div");
  wrap.id = "hubFab";

  function buildMenu(projects) {
    var menu = '<a class="home" href="' + HUB + '"><span class="dot" style="background:#ff9800"></span>◤ Control Tower</a>';
    (projects || DEFAULT_PROJECTS).forEach(function (p) {
      var href = safeUrl(p.url);
      var host = hostOf(href);
      var active = here === host ? " active" : "";
      menu += '<a class="' + active.trim() + '" href="' + esc(href) + '">' +
              '<span class="dot" style="background:' + safeColor(p.accent) + '"></span>' + esc(p.name) + "</a>";
    });
    return menu;
  }

  wrap.innerHTML =
    '<div class="menu">' + buildMenu(DEFAULT_PROJECTS) + "</div>" +
    '<div class="btn"><span class="led"></span>Control Tower ▾</div>';
  (document.body || document.documentElement).appendChild(wrap);

  var menuEl = wrap.querySelector(".menu");
  var apiUrl = (here === "hub.muratben.com" || here === "localhost" || here === "127.0.0.1") ? "/api/projects" : HUB + "/api/projects";
  if (typeof fetch === "function") {
    fetch(apiUrl).then(function (r) { return r.json(); }).then(function (data) {
      if (Array.isArray(data) && data.length > 0 && menuEl) {
        menuEl.innerHTML = buildMenu(data);
      }
    }).catch(function () {});
  }

  wrap.querySelector(".btn").addEventListener("click", function (e) {
    e.stopPropagation(); wrap.classList.toggle("open");
  });
  document.addEventListener("click", function () { wrap.classList.remove("open"); });
})();
