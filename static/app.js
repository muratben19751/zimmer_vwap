/**
 * Zimmer VWAP Backtester — Production Controller & Interactive Canvas Renderer
 * Faithful implementation of Handoff design specification.
 */

import * as Engine from "./engine.js";

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // 1. State & Constants
  // --------------------------------------------------------------------------
  const MO = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const DEF_PARAMS = {
    len: 8,
    m1: 1.0,
    m2: 2.0,
    dir: "both",
    capital: 100000,
    sizePct: 20,
    commPct: 0.05,
  };

  const state = {
    source: "synthetic", // "nau" | "synthetic" | "yahoo"
    symbol: "BTCUSDT",
    tf: "1h",
    dateFrom: "",
    dateTo: "",
    tab: "overview", // "overview" | "perf" | "trades"
    theme: localStorage.getItem("zvwap_theme") || "light",
    params: { ...DEF_PARAMS },
    form: { ...DEF_PARAMS },
    ranAt: null,
    nauCatalog: null,
  };

  let renderState = {
    data: [],
    vw: [],
    trades: [],
    equity: [],
    met: null,
    view: { s: 0, e: 0 },
    hover: null,
    dragging: false,
    dragX: 0,
    dragView: { s: 0, e: 0 },
    rafId: 0,
  };

  // --------------------------------------------------------------------------
  // 2. DOM Elements
  // --------------------------------------------------------------------------
  const htmlEl = document.documentElement;
  const sourceSelect = document.getElementById("sourceSelect");
  const symbolSelect = document.getElementById("symbolSelect");
  const nauEquitiesGroup = document.getElementById("nauEquitiesGroup");
  const nauBybitGroup = document.getElementById("nauBybitGroup");
  const tfSegment = document.getElementById("tfSegment");
  const dateFromInput = document.getElementById("dateFrom");
  const dateToInput = document.getElementById("dateTo");
  const themeSelect = document.getElementById("themeSelect");
  const ranLabel = document.getElementById("ranLabel");
  const btnRunBacktest = document.getElementById("btnRunBacktest");

  const chartWrap = document.getElementById("chartWrap");
  const chartCanvas = document.getElementById("chartCanvas");

  const tabBtnOverview = document.getElementById("tabBtnOverview");
  const tabBtnPerf = document.getElementById("tabBtnPerf");
  const tabBtnTrades = document.getElementById("tabBtnTrades");
  const contentOverview = document.getElementById("contentOverview");
  const contentPerf = document.getElementById("contentPerf");
  const contentTrades = document.getElementById("contentTrades");
  const kpiTilesContainer = document.getElementById("kpiTilesContainer");
  const equityWrap = document.getElementById("equityWrap");
  const equityCanvas = document.getElementById("equityCanvas");
  const perfGridContainer = document.getElementById("perfGridContainer");
  const tradesRowsContainer = document.getElementById("tradesRowsContainer");
  const btnExportCsv = document.getElementById("btnExportCsv");

  const paramLen = document.getElementById("paramLen");
  const paramM1 = document.getElementById("paramM1");
  const paramM2 = document.getElementById("paramM2");
  const paramDir = document.getElementById("paramDir");
  const paramCapital = document.getElementById("paramCapital");
  const paramSizePct = document.getElementById("paramSizePct");
  const paramCommPct = document.getElementById("paramCommPct");
  const btnApplyParams = document.getElementById("btnApplyParams");
  const btnResetParams = document.getElementById("btnResetParams");

  const statusLeft = document.getElementById("statusLeft");
  const statusBadge = document.getElementById("statusBadge");

  // --------------------------------------------------------------------------
  // 3. Formatting Helpers
  // --------------------------------------------------------------------------
  function getDecimals(symbol) {
    if (Engine.SYMBOLS[symbol]) return Engine.SYMBOLS[symbol].dec;
    if (symbol.includes("EUR") || symbol.includes("GBP")) return 5;
    if (symbol.includes("USD") && (symbol.includes("BTC") || symbol.includes("ETH"))) return 2;
    return 2;
  }

  function fp(v, sym = state.symbol) {
    if (v == null || isNaN(v)) return "—";
    const dec = getDecimals(sym);
    return Number(v).toLocaleString("en-US", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  }

  function fm(v) {
    if (v == null || isNaN(v)) return "—";
    const n = Number(v);
    const sign = n < 0 ? "−" : "+";
    return `${sign}$${Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function ft(t, tf = state.tf) {
    if (!t) return "";
    const d = new Date(t);
    const dd = `${d.getUTCDate()} ${MO[d.getUTCMonth()]}`;
    if (tf === "1D") return dd;
    return `${dd} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }

  function ft2(t, tf = state.tf) {
    if (!t) return "";
    const d = new Date(t);
    const dd = `${d.getUTCDate()} ${MO[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
    if (tf === "1D") return dd;
    return `${dd} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }

  function niceTicks(min, max, n) {
    const span = max - min;
    if (span <= 0) return [];
    const step0 = span / Math.max(2, n);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      out.push(v);
    }
    return out;
  }

  function getThemeColors() {
    const cs = getComputedStyle(htmlEl);
    return {
      bgApp: cs.getPropertyValue("--bg-app").trim() || "#ffffff",
      bgPanel: cs.getPropertyValue("--bg-panel").trim() || "#f7f8fb",
      border: cs.getPropertyValue("--border").trim() || "#e0e3eb",
      borderSubtle: cs.getPropertyValue("--border-subtle").trim() || "#eef0f5",
      textStrong: cs.getPropertyValue("--text-strong").trim() || "#131722",
      textMain: cs.getPropertyValue("--text-main").trim() || "#24293a",
      textSecondary: cs.getPropertyValue("--text-secondary").trim() || "#50535e",
      textMuted: cs.getPropertyValue("--text-muted").trim() || "#6f737f",
      accent: cs.getPropertyValue("--accent").trim() || "#2962ff",
      bull: cs.getPropertyValue("--bull").trim() || "#089981",
      bear: cs.getPropertyValue("--bear").trim() || "#f23645",
      bandFill: cs.getPropertyValue("--band-fill").trim() || "rgba(41,98,255,0.07)",
      bandLine1: cs.getPropertyValue("--band-line1").trim() || "rgba(41,98,255,0.4)",
      bandLine2: cs.getPropertyValue("--band-line2").trim() || "rgba(41,98,255,0.25)",
      crosshairLine: cs.getPropertyValue("--crosshair-line").trim() || "#758696",
      crosshairTagBg: cs.getPropertyValue("--crosshair-tag-bg").trim() || "#363a45",
      crosshairTagText: cs.getPropertyValue("--crosshair-tag-text").trim() || "#ffffff",
    };
  }

  // --------------------------------------------------------------------------
  // 4. Data Loading & Calculation
  // --------------------------------------------------------------------------
  async function fetchNauCatalog() {
    try {
      const res = await fetch("/api/nau/catalog");
      if (!res.ok) return;
      const cat = await res.json();
      state.nauCatalog = cat;

      nauEquitiesGroup.innerHTML = "";
      (cat.equities || []).forEach((eq) => {
        const opt = document.createElement("option");
        opt.value = `nau:equity:${eq.symbol}`;
        opt.textContent = `${eq.symbol} — (${eq.exchange}, ${eq.total_bars.toLocaleString()} Bar)`;
        nauEquitiesGroup.appendChild(opt);
      });

      nauBybitGroup.innerHTML = "";
      (cat.bybit || []).forEach((by) => {
        const opt = document.createElement("option");
        opt.value = `nau:bybit:${by.symbol}:${by.category}:${by.timeframe}`;
        opt.textContent = `${by.symbol} [${by.category.toUpperCase()}] — (${by.timeframe}, ${by.total_bars.toLocaleString()} Bar)`;
        nauBybitGroup.appendChild(opt);
      });
    } catch (e) {
      console.warn("NAU katalog yüklenemedi:", e);
    }
  }

  async function loadDataAndCompute() {
    ranLabel.textContent = "Hesaplanıyor…";
    let rawBars = [];

    // Case 1: NAU Symbol
    if (state.symbol.startsWith("nau:")) {
      const parts = state.symbol.split(":");
      const type = parts[1]; // "equity" | "bybit"
      const sym = parts[2];
      const category = parts[3] || "linear";

      try {
        const payload = {
          data_source: "nau",
          nau_symbol: sym,
          nau_category: category,
          nau_source: type === "equity" ? "equity_catalog" : "bybit",
          nau_timeframe: state.tf,
          nau_limit_bars: 1500,
          swing_period: state.params.len * 5,
        };

        const res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const resData = await res.json();
          rawBars = (resData.candles || []).map((c, i) => ({
            t: c.time * 1000,
            o: c.open,
            h: c.high,
            l: c.low,
            c: c.close,
            v: resData.volumes[i] ? resData.volumes[i].value : 1000,
          }));
          statusBadge.textContent = `${resData.source} — Canlı Veri`;
          statusBadge.className = "status-badge-demo bull-text";
        }
      } catch (err) {
        console.error("NAU API hatası:", err);
      }
    }

    // Fallback or Synthetic
    if (!rawBars || rawBars.length === 0) {
      const cleanSym = state.symbol.replace(/^nau:[^:]+:/, "").split(":")[0] || "BTCUSDT";
      rawBars = Engine.genData(cleanSym, state.tf, 420);
      statusBadge.textContent = "Sentetik örnek veri — demo";
      statusBadge.className = "status-badge-demo";
    }

    // Date Filtering
    let data = rawBars;
    if (state.dateFrom) {
      const tFrom = Date.parse(state.dateFrom);
      if (!isNaN(tFrom)) data = data.filter((b) => b.t >= tFrom);
    }
    if (state.dateTo) {
      const tTo = Date.parse(state.dateTo);
      if (!isNaN(tTo)) data = data.filter((b) => b.t <= tTo + 86400000);
    }
    if (data.length < 40) data = rawBars;

    // Calculations via Engine
    const swings = Engine.computeSwings(data, state.params.len);
    const vw = Engine.computeVWAP(data, swings, state.params.m1, state.params.m2);
    const bt = Engine.backtest(data, vw, state.params);
    const met = Engine.metrics(bt.trades, bt.equity, state.params.capital, state.tf);
    met.comm = bt.commTotal;

    const n = data.length;
    renderState.data = data;
    renderState.vw = vw;
    renderState.trades = bt.trades;
    renderState.equity = bt.equity;
    renderState.met = met;
    renderState.view = { s: Math.max(0, n - 170), e: n };

    state.ranAt = Date.now();
    ranLabel.textContent = `Son çalıştırma: ${new Date(state.ranAt).toLocaleTimeString("tr-TR")}`;

    // Update Status Bar Left
    const cleanName = state.symbol.replace(/^nau:[^:]+:/, "");
    statusLeft.textContent = `${cleanName} · ${state.tf} · ${data.length} bar · ${ft2(data[0].t)} → ${ft2(data[data.length - 1].t)}`;

    // Render UI Panels
    renderKpiTiles(met);
    renderPerformanceSummary(met);
    renderTradesTable(bt.trades, data);

    requestDraw();
  }

  // --------------------------------------------------------------------------
  // 5. Drawing & Canvas Rendering
  // --------------------------------------------------------------------------
  function requestDraw() {
    if (renderState.rafId) return;
    renderState.rafId = requestAnimationFrame(() => {
      renderState.rafId = 0;
      drawChart();
      drawEquity();
    });
  }

  function drawChart() {
    const cv = chartCanvas;
    const { data, vw, trades, view, hover } = renderState;
    if (!cv || !data.length || !view.e) return;

    const wrap = chartWrap;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (W < 60 || H < 60) return;

    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = getThemeColors();
    g.fillStyle = colors.bgApp;
    g.fillRect(0, 0, W, H);

    const AX = 62;
    const TB = 24;
    const pw = W - AX;
    const ph = H - TB;
    const v0 = view.s;
    const v1 = view.e;
    const n = v1 - v0;

    // Price Bounds
    let lo = 1e18;
    let hi = -1e18;
    let maxV = 0;
    for (let i = v0; i < v1; i++) {
      const b = data[i];
      if (b.l < lo) lo = b.l;
      if (b.h > hi) hi = b.h;
      if (b.v > maxV) maxV = b.v;
      const w = vw[i];
      if (w) {
        if (w.l2 < lo) lo = w.l2;
        if (w.u2 > hi) hi = w.u2;
      }
    }
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad;
    hi += pad;

    const x = (i) => ((i - v0 + 0.5) * pw) / n;
    const y = (p) => ph * (1 - (p - lo) / (hi - lo));
    const font = getComputedStyle(htmlEl).fontFamily || "-apple-system, Segoe UI, sans-serif";

    // 1. Grid & Price Axis Ticks
    g.font = `10px ${font}`;
    g.textBaseline = "middle";
    const ticks = niceTicks(lo + pad * 0.4, hi - pad * 0.4, ph / 56);
    for (const t of ticks) {
      const yy = y(t);
      g.strokeStyle = colors.borderSubtle;
      g.beginPath();
      g.moveTo(0, yy);
      g.lineTo(pw, yy);
      g.stroke();

      g.fillStyle = colors.textMuted;
      g.textAlign = "left";
      g.fillText(fp(t), pw + 6, yy);
    }

    // 2. Time Axis Grid & Labels
    const every = Math.max(1, Math.round(92 / (pw / n)));
    g.textAlign = "center";
    g.textBaseline = "top";
    for (let i = v0; i < v1; i++) {
      if (i % every !== 0) continue;
      const xx = x(i);
      g.strokeStyle = colors.borderSubtle;
      g.beginPath();
      g.moveTo(xx, 0);
      g.lineTo(xx, ph);
      g.stroke();

      g.fillStyle = colors.textMuted;
      g.fillText(ft(data[i].t), xx, ph + 7);
    }

    // 3. Volume Bars (Bottom 15%)
    const vh = ph * 0.15;
    const bw2 = Math.max(1, (pw / n) * 0.7);
    for (let i = v0; i < v1; i++) {
      const b = data[i];
      g.fillStyle = b.c >= b.o ? "rgba(8,153,129,0.28)" : "rgba(242,54,69,0.28)";
      const h2 = (b.v / maxV) * vh;
      g.fillRect(x(i) - bw2 / 2, ph - h2, bw2, h2);
    }

    // 4. DSAVWAP Bands & Curves (grouped into segments by anchor)
    const segs = [];
    let seg = [];
    let curAnchor = null;
    for (let i = v0; i < v1; i++) {
      const w = vw[i];
      if (!w) {
        if (seg.length) {
          segs.push(seg);
          seg = [];
        }
        curAnchor = null;
        continue;
      }
      if (curAnchor !== null && w.aI !== curAnchor && seg.length) {
        segs.push(seg);
        seg = [];
      }
      curAnchor = w.aI;
      seg.push([i, w]);
    }
    if (seg.length) segs.push(seg);

    for (const s of segs) {
      if (s.length > 1) {
        // Shaded Band Fill between +1σ and -1σ
        g.beginPath();
        s.forEach(([i, w], k) => {
          k ? g.lineTo(x(i), y(w.u1)) : g.moveTo(x(i), y(w.u1));
        });
        for (let k = s.length - 1; k >= 0; k--) {
          g.lineTo(x(s[k][0]), y(s[k][1].l1));
        }
        g.closePath();
        g.fillStyle = colors.bandFill;
        g.fill();

        // ±1σ solid and ±2σ dashed lines
        const drawBandLine = (key, strokeStyle, dash) => {
          g.beginPath();
          s.forEach(([i, w], k) => {
            k ? g.lineTo(x(i), y(w[key])) : g.moveTo(x(i), y(w[key]));
          });
          g.strokeStyle = strokeStyle;
          g.lineWidth = 1;
          g.setLineDash(dash);
          g.stroke();
          g.setLineDash([]);
        };

        drawBandLine("u1", colors.bandLine1, []);
        drawBandLine("l1", colors.bandLine1, []);
        drawBandLine("u2", colors.bandLine2, [4, 4]);
        drawBandLine("l2", colors.bandLine2, [4, 4]);
      }

      // DSAVWAP Center Line
      g.beginPath();
      s.forEach(([i, w], k) => {
        k ? g.lineTo(x(i), y(w.v)) : g.moveTo(x(i), y(w.v));
      });
      g.strokeStyle = s[0][1].aType === "L" ? colors.bull : colors.bear;
      g.lineWidth = 1.6;
      g.stroke();
      g.lineWidth = 1;

      // Anchor Diamond Marker
      const aI = s[0][1].aI;
      if (aI >= v0 && aI < v1) {
        const ap = s[0][1].aType === "L" ? data[aI].l : data[aI].h;
        const ax = x(aI);
        const ay = y(ap) + (s[0][1].aType === "L" ? 8 : -8);
        g.beginPath();
        g.moveTo(ax, ay - 5);
        g.lineTo(ax + 5, ay);
        g.lineTo(ax, ay + 5);
        g.lineTo(ax - 5, ay);
        g.closePath();
        g.fillStyle = s[0][1].aType === "L" ? colors.bull : colors.bear;
        g.fill();
      }
    }

    // 5. Candlesticks
    const bw = Math.max(1, Math.min(11, (pw / n) * 0.7));
    for (let i = v0; i < v1; i++) {
      const b = data[i];
      const up = b.c >= b.o;
      const col = up ? colors.bull : colors.bear;
      const xx = x(i);

      // Wicks
      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(xx, y(b.h));
      g.lineTo(xx, y(b.l));
      g.stroke();

      // Body
      g.fillStyle = col;
      g.fillRect(xx - bw / 2, Math.min(y(b.o), y(b.c)), bw, Math.max(1, Math.abs(y(b.o) - y(b.c))));
    }

    // 6. Trade Markers (Triangles, Exit Squares & Connection Lines)
    const drawTriangle = (xx, yy, upDir, col) => {
      g.beginPath();
      if (upDir) {
        g.moveTo(xx, yy - 5);
        g.lineTo(xx + 5, yy + 4);
        g.lineTo(xx - 5, yy + 4);
      } else {
        g.moveTo(xx, yy + 5);
        g.lineTo(xx + 5, yy - 4);
        g.lineTo(xx - 5, yy - 4);
      }
      g.closePath();
      g.fillStyle = col;
      g.fill();
    };

    for (const t of trades) {
      const inEntry = t.ei >= v0 && t.ei < v1;
      const inExit = t.xi != null && t.xi >= v0 && t.xi < v1;

      // Dashed trade line
      if (inEntry && t.xi != null && (inExit || t.xi >= v1)) {
        g.beginPath();
        g.moveTo(x(t.ei), y(t.entry));
        g.lineTo(x(Math.min(t.xi, v1 - 1)), y(t.exit ?? t.entry));
        g.strokeStyle = t.pnl >= 0 ? "rgba(8,153,129,0.55)" : "rgba(242,54,69,0.55)";
        g.setLineDash([3, 3]);
        g.stroke();
        g.setLineDash([]);
      }

      // Entry Marker
      if (inEntry) {
        if (t.side === "L") {
          drawTriangle(x(t.ei), y(data[t.ei].l) + 12, true, colors.bull);
        } else {
          drawTriangle(x(t.ei), y(data[t.ei].h) - 12, false, colors.bear);
        }
      }

      // Exit Marker
      if (inExit) {
        const xx = x(t.xi);
        const yy = t.side === "L" ? y(data[t.xi].h) - 10 : y(data[t.xi].l) + 10;
        g.fillStyle = "#50535e";
        g.fillRect(xx - 3, yy - 3, 6, 6);
      }
    }

    // 7. Crosshair & Dynamic Values
    let hb = v1 - 1;
    if (hover && hover.mx < pw && hover.my < ph) {
      hb = Math.max(v0, Math.min(v1 - 1, Math.round((hover.mx / pw) * n + v0 - 0.5)));
      const cx = x(hb);
      const cy = hover.my;

      g.strokeStyle = colors.crosshairLine;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(cx, 0);
      g.lineTo(cx, ph);
      g.moveTo(0, cy);
      g.lineTo(pw, cy);
      g.stroke();
      g.setLineDash([]);

      // Price Tag on Right Axis
      const pv = lo + (1 - cy / ph) * (hi - lo);
      g.fillStyle = colors.crosshairTagBg;
      g.fillRect(pw, cy - 9, AX, 18);
      g.fillStyle = colors.crosshairTagText;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.font = `10px ${font}`;
      g.fillText(fp(pv), pw + 6, cy);

      // Time Tag on Bottom Axis
      const tl = ft2(data[hb].t);
      const tw = g.measureText(tl).width + 14;
      g.fillStyle = colors.crosshairTagBg;
      g.fillRect(cx - tw / 2, ph, tw, TB - 2);
      g.fillStyle = colors.crosshairTagText;
      g.textAlign = "center";
      g.fillText(tl, cx, ph + 11);
    }

    // 8. Legend (Top-Left)
    const B = data[hb];
    const Wv = vw[hb];
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.font = `700 12px ${font}`;
    g.fillStyle = colors.textStrong;
    const cleanSym = state.symbol.replace(/^nau:[^:]+:/, "");
    g.fillText(`${cleanSym} · ${state.tf} · Zimmer VWAP Stratejisi`, 10, 20);

    g.font = `11px ${font}`;
    let lx = 10;
    const cc = B.c >= B.o ? colors.bull : colors.bear;
    [
      ["A", B.o],
      ["Y", B.h],
      ["D", B.l],
      ["K", B.c],
    ].forEach(([k, val]) => {
      g.fillStyle = colors.textMuted;
      g.fillText(k, lx, 38);
      lx += g.measureText(k).width + 3;
      g.fillStyle = cc;
      const s = fp(val);
      g.fillText(s, lx, 38);
      lx += g.measureText(s).width + 10;
    });

    if (Wv) {
      g.fillStyle = Wv.aType === "L" ? colors.bull : colors.bear;
      g.fillText(
        `VWAP ${fp(Wv.v)}  ·  Çapa: ${Wv.aType === "L" ? "Swing Dip" : "Swing Tepe"} (${ft(data[Wv.aI].t)})`,
        10,
        54
      );
      g.fillStyle = colors.textMuted;
      g.fillText(
        `+1σ ${fp(Wv.u1)}   −1σ ${fp(Wv.l1)}   ±2σ bantları kesikli`,
        10,
        69
      );
    }

    // 9. Axis Border Lines
    g.strokeStyle = colors.border;
    g.beginPath();
    g.moveTo(pw + 0.5, 0);
    g.lineTo(pw + 0.5, H);
    g.moveTo(0, ph + 0.5);
    g.lineTo(W, ph + 0.5);
    g.stroke();
  }

  function drawEquity() {
    const cv = equityCanvas;
    const { equity } = renderState;
    if (!cv || !equity || !equity.length || state.tab !== "overview") return;

    const wrap = equityWrap;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (W < 40 || H < 40) return;

    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = getThemeColors();
    g.fillStyle = colors.bgApp;
    g.fillRect(0, 0, W, H);

    const AX = 70;
    const PT = 22;
    const PB = 8;
    const pw = W - AX;
    const ph = H - PT - PB;

    let lo = Infinity;
    let hi = -Infinity;
    for (const e of equity) {
      if (e.v < lo) lo = e.v;
      if (e.v > hi) hi = e.v;
    }
    const cap = state.params.capital;
    lo = Math.min(lo, cap);
    hi = Math.max(hi, cap);
    const pad = (hi - lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;

    const x = (i) => (i / (equity.length - 1)) * pw;
    const y = (v) => PT + ph * (1 - (v - lo) / (hi - lo));
    const font = getComputedStyle(htmlEl).fontFamily || "-apple-system, Segoe UI, sans-serif";

    // Horizontal Ticks
    g.font = `10px ${font}`;
    g.textBaseline = "middle";
    for (const t of niceTicks(lo, hi, ph / 44)) {
      const yy = y(t);
      g.strokeStyle = colors.borderSubtle;
      g.beginPath();
      g.moveTo(0, yy);
      g.lineTo(pw, yy);
      g.stroke();

      g.fillStyle = colors.textMuted;
      g.textAlign = "left";
      g.fillText(`$${Math.round(t).toLocaleString("en-US")}`, pw + 6, yy);
    }

    // Capital Baseline (dashed)
    g.strokeStyle = colors.textMuted;
    g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(0, y(cap));
    g.lineTo(pw, y(cap));
    g.stroke();
    g.setLineDash([]);

    // Gradient Area Fill
    const grad = g.createLinearGradient(0, PT, 0, PT + ph);
    grad.addColorStop(0, "rgba(41, 98, 255, 0.28)");
    grad.addColorStop(1, "rgba(41, 98, 255, 0)");
    g.beginPath();
    equity.forEach((e, i) => {
      i ? g.lineTo(x(i), y(e.v)) : g.moveTo(x(i), y(e.v));
    });
    g.lineTo(pw, PT + ph);
    g.lineTo(0, PT + ph);
    g.closePath();
    g.fillStyle = grad;
    g.fill();

    // Equity Line
    g.beginPath();
    equity.forEach((e, i) => {
      i ? g.lineTo(x(i), y(e.v)) : g.moveTo(x(i), y(e.v));
    });
    g.strokeStyle = colors.accent;
    g.lineWidth = 1.6;
    g.stroke();
    g.lineWidth = 1;

    // Header Label
    g.font = `700 11px ${font}`;
    g.fillStyle = colors.textSecondary;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillText("Özkaynak Eğrisi", 10, 15);

    const last = equity[equity.length - 1].v;
    g.fillStyle = last >= cap ? colors.bull : colors.bear;
    g.fillText(fm(last - cap), 110, 15);
  }

  // --------------------------------------------------------------------------
  // 6. Strategy Tester Views
  // --------------------------------------------------------------------------
  function renderKpiTiles(m) {
    if (!m) return;
    const pos = "bull-text";
    const neg = "bear-text";

    const tiles = [
      {
        l: "Net Kar",
        v: fm(m.net),
        s: `${m.netPct >= 0 ? "+" : ""}${m.netPct.toFixed(2)}%`,
        c: m.net >= 0 ? pos : neg,
      },
      {
        l: "Toplam İşlem",
        v: String(m.total),
        s: `${m.wins} kazanç / ${m.losses} kayıp`,
        c: "",
      },
      {
        l: "Kazanma Oranı",
        v: `${m.winRate.toFixed(1)}%`,
        s: "kapalı işlemler",
        c: m.winRate >= 50 ? pos : neg,
      },
      {
        l: "Profit Factor",
        v: isFinite(m.pf) ? m.pf.toFixed(2) : "∞",
        s: "brüt kar / brüt zarar",
        c: m.pf >= 1 ? pos : neg,
      },
      {
        l: "Maks. Düşüş",
        v: `−${m.mddPct.toFixed(2)}%`,
        s: fm(-m.mdd),
        c: neg,
      },
      {
        l: "Sharpe Oranı",
        v: m.sharpe.toFixed(2),
        s: "yıllıklandırılmış",
        c: m.sharpe >= 1 ? pos : "",
      },
    ];

    kpiTilesContainer.innerHTML = tiles
      .map(
        (t) => `
      <div class="metric-tile">
        <div class="metric-tile-label">${t.l}</div>
        <div class="metric-tile-value ${t.c}">${t.v}</div>
        <div class="metric-tile-sub">${t.s}</div>
      </div>
    `
      )
      .join("");
  }

  function renderPerformanceSummary(m) {
    if (!m) return;
    const pos = "bull-text";
    const neg = "bear-text";
    const col = (v) => (v >= 0 ? pos : neg);

    const items = [
      ["Net Kar", fm(m.net), col(m.net)],
      ["Brüt Kar", fm(m.gp), pos],
      ["Brüt Zarar", fm(-m.gl), neg],
      ["Profit Factor", isFinite(m.pf) ? m.pf.toFixed(2) : "∞", m.pf >= 1 ? pos : neg],
      ["Toplam Komisyon", fm(-m.comm), ""],
      ["Ortalama İşlem", fm(m.avg), col(m.avg)],
      ["Toplam İşlem", String(m.total), ""],
      ["Kazanan İşlem", String(m.wins), pos],
      ["Kaybeden İşlem", String(m.losses), neg],
      ["Kazanma Oranı", `${m.winRate.toFixed(1)}%`, m.winRate >= 50 ? pos : neg],
      ["Uzun İşlem", String(m.longs), ""],
      ["Kısa İşlem", String(m.shorts), ""],
      ["Maks. Düşüş ($)", fm(-m.mdd), neg],
      ["Maks. Düşüş (%)", `−${m.mddPct.toFixed(2)}%`, neg],
      ["Sharpe Oranı", m.sharpe.toFixed(2), m.sharpe >= 1 ? pos : ""],
    ];

    perfGridContainer.innerHTML = items
      .map(
        ([label, val, cls]) => `
      <div class="perf-row">
        <span class="perf-label">${label}</span>
        <span class="perf-value ${cls}">${val}</span>
      </div>
    `
      )
      .join("");
  }

  function renderTradesTable(trades, data) {
    const pos = "bull-text";
    const neg = "bear-text";
    let cum = 0;

    tabBtnTrades.textContent = `İşlem Listesi (${trades.length})`;

    tradesRowsContainer.innerHTML = trades
      .map((t, i) => {
        cum += t.pnl;
        const isLong = t.side === "L";
        const isWin = t.pnl >= 0;
        const entryTime = data[t.ei] ? ft2(data[t.ei].t) : "—";
        const exitTime = t.xi != null && data[t.xi] ? ft2(data[t.xi].t) : "—";

        return `
        <div class="trade-row">
          <span style="color: var(--text-muted)">${i + 1}</span>
          <span style="font-weight: 700;" class="${isLong ? pos : neg}">${isLong ? "Uzun" : "Kısa"}</span>
          <span style="color: var(--text-secondary)">${entryTime}</span>
          <span class="align-right">${fp(t.entry)}</span>
          <span class="pad-l-16" style="color: var(--text-secondary)">${exitTime}</span>
          <span class="align-right">${t.exit != null ? fp(t.exit) : "—"}</span>
          <span class="pad-l-16" style="color: var(--text-muted); font-family: var(--font-ui);">${t.reason}</span>
          <span class="align-right ${isWin ? pos : neg}" style="font-weight: 600;">${fm(t.pnl)}</span>
          <span class="align-right ${isWin ? pos : neg}">${t.pnlPct != null ? (t.pnlPct >= 0 ? "+" : "") + t.pnlPct.toFixed(2) + "%" : "—"}</span>
          <span class="align-right" style="color: var(--text-secondary)">${fm(cum)}</span>
        </div>
      `;
      })
      .join("");
  }

  // --------------------------------------------------------------------------
  // 7. Pan & Zoom Event Handlers
  // --------------------------------------------------------------------------
  function pan(cx) {
    const el = chartCanvas;
    const { data, dragView, dragX } = renderState;
    if (!el || !data.length) return;
    const r = el.getBoundingClientRect();
    const perBar = (r.width - 62) / (dragView.e - dragView.s);
    const bars = Math.round((cx - dragX) / perBar);
    if (!bars) return;

    const n = data.length;
    const len = dragView.e - dragView.s;
    const s = Math.max(0, Math.min(n - len, dragView.s - bars));
    renderState.view = { s, e: s + len };
    requestDraw();
  }

  function setupInteractions() {
    // Wheel Zoom
    chartCanvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const { data, view } = renderState;
        if (!data.length || !view.e) return;
        const r = chartCanvas.getBoundingClientRect();
        const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width - 62)));
        const N = data.length;
        const len = view.e - view.s;
        const nl = Math.max(25, Math.min(N, Math.round(len * (e.deltaY > 0 ? 1.2 : 0.85))));
        const c = view.s + len * fx;
        let s = Math.round(c - nl * fx);
        s = Math.max(0, Math.min(N - nl, s));
        renderState.view = { s, e: s + nl };
        requestDraw();
      },
      { passive: false }
    );

    // Mouse Move (Crosshair & Pan)
    chartCanvas.addEventListener("mousemove", (e) => {
      const r = chartCanvas.getBoundingClientRect();
      renderState.hover = { mx: e.clientX - r.left, my: e.clientY - r.top };
      if (renderState.dragging) {
        pan(e.clientX);
      } else {
        requestDraw();
      }
    });

    chartCanvas.addEventListener("mouseleave", () => {
      renderState.hover = null;
      requestDraw();
    });

    chartCanvas.addEventListener("mousedown", (e) => {
      renderState.dragging = true;
      renderState.dragX = e.clientX;
      renderState.dragView = { ...renderState.view };
      e.preventDefault();
    });

    window.addEventListener("mouseup", () => {
      if (renderState.dragging) {
        renderState.dragging = false;
        requestDraw();
      }
    });

    // Resize Observer
    const ro = new ResizeObserver(() => requestDraw());
    ro.observe(chartWrap);
    ro.observe(equityWrap);
  }

  // --------------------------------------------------------------------------
  // 8. Event Listeners & UI Binding
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Source & Symbol Change
    sourceSelect.addEventListener("change", () => {
      state.source = sourceSelect.value;
      if (state.source === "nau") {
        if (nauEquitiesGroup.firstChild) {
          symbolSelect.value = nauEquitiesGroup.firstChild.value;
        }
      } else {
        symbolSelect.value = "BTCUSDT";
      }
      state.symbol = symbolSelect.value;
      loadDataAndCompute();
    });

    symbolSelect.addEventListener("change", () => {
      state.symbol = symbolSelect.value;
      loadDataAndCompute();
    });

    // Timeframe Segment Buttons
    tfSegment.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        tfSegment.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.tf = btn.dataset.tf;
        loadDataAndCompute();
      });
    });

    // Date Range
    dateFromInput.addEventListener("change", () => {
      state.dateFrom = dateFromInput.value;
      loadDataAndCompute();
    });
    dateToInput.addEventListener("change", () => {
      state.dateTo = dateToInput.value;
      loadDataAndCompute();
    });

    // Run Button
    btnRunBacktest.addEventListener("click", () => {
      loadDataAndCompute();
    });

    // Strategy Tester Tabs
    const tabs = [
      { btn: tabBtnOverview, content: contentOverview, id: "overview" },
      { btn: tabBtnPerf, content: contentPerf, id: "perf" },
      { btn: tabBtnTrades, content: contentTrades, id: "trades" },
    ];

    tabs.forEach(({ btn, content, id }) => {
      btn.addEventListener("click", () => {
        tabs.forEach((t) => {
          t.btn.classList.remove("active");
          t.content.classList.remove("active");
        });
        btn.classList.add("active");
        content.classList.add("active");
        state.tab = id;
        requestDraw();
      });
    });

    // Parameter Controls
    btnApplyParams.addEventListener("click", () => {
      state.params = {
        len: Math.max(2, Math.round(parseFloat(paramLen.value) || DEF_PARAMS.len)),
        m1: parseFloat(paramM1.value) || DEF_PARAMS.m1,
        m2: parseFloat(paramM2.value) || DEF_PARAMS.m2,
        dir: paramDir.value || DEF_PARAMS.dir,
        capital: Math.max(100, parseFloat(paramCapital.value) || DEF_PARAMS.capital),
        sizePct: Math.min(100, Math.max(1, parseFloat(paramSizePct.value) || DEF_PARAMS.sizePct)),
        commPct: Math.max(0, parseFloat(paramCommPct.value) || DEF_PARAMS.commPct),
      };
      loadDataAndCompute();
    });

    btnResetParams.addEventListener("click", () => {
      state.params = { ...DEF_PARAMS };
      paramLen.value = DEF_PARAMS.len;
      paramM1.value = DEF_PARAMS.m1;
      paramM2.value = DEF_PARAMS.m2;
      paramDir.value = DEF_PARAMS.dir;
      paramCapital.value = DEF_PARAMS.capital;
      paramSizePct.value = DEF_PARAMS.sizePct;
      paramCommPct.value = DEF_PARAMS.commPct;
      loadDataAndCompute();
    });

    // Theme Switcher
    themeSelect.value = state.theme;
    htmlEl.setAttribute("data-theme", state.theme);
    themeSelect.addEventListener("change", () => {
      state.theme = themeSelect.value;
      htmlEl.setAttribute("data-theme", state.theme);
      localStorage.setItem("zvwap_theme", state.theme);
      requestDraw();
    });

    // Export CSV
    btnExportCsv.addEventListener("click", () => {
      const { trades, data } = renderState;
      if (!trades || !trades.length) {
        alert("Dışa aktarılacak işlem bulunamadı.");
        return;
      }
      let csv = "#,Yön,Giriş Zamanı,Giriş Fiyatı,Çıkış Zamanı,Çıkış Fiyatı,Neden,Net PnL ($),Getiri (%),Kümülatif PnL ($)\n";
      let cum = 0;
      trades.forEach((t, i) => {
        cum += t.pnl;
        const eTime = data[t.ei] ? new Date(data[t.ei].t).toISOString() : "";
        const xTime = t.xi != null && data[t.xi] ? new Date(data[t.xi].t).toISOString() : "";
        csv += `${i + 1},${t.side},${eTime},${t.entry},${xTime},${t.exit || ""},"${t.reason}",${t.pnl.toFixed(2)},${t.pnlPct != null ? t.pnlPct.toFixed(2) : ""},${cum.toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zvwap_trades_${state.symbol}_${state.tf}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // --------------------------------------------------------------------------
  // 9. Initialization
  // --------------------------------------------------------------------------
  async function init() {
    setupInteractions();
    setupEventListeners();
    await fetchNauCatalog();
    await loadDataAndCompute();
  }

  // Bootstrap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
