/**
 * Zimmer VWAP — Hybrid Application Controller
 * Seamlessly manages Dual Interfaces:
 *   1. Handoff Strategy Tester (High-DPI Canvas + Bands + Strategy Tester Panel)
 *   2. Extended Financial Terminal (Lightweight Charts + Extended Sidebar & Inspector)
 */

import * as Engine from "./engine.js";

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // 1. App State
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
    viewMode: localStorage.getItem("zvwap_view_mode") || "handoff", // "handoff" | "terminal"
    theme: localStorage.getItem("zvwap_theme") || "light",
    
    // Handoff state
    symbol: "BTCUSDT",
    tf: "1h",
    dateFrom: "",
    dateTo: "",
    handoffTab: "overview", // "overview" | "perf" | "trades"
    params: { ...DEF_PARAMS },

    // Terminal state
    terminalSource: "nau", // "nau" | "ticker" | "csv" | "sim"
    terminalNauCategory: "equity",
    terminalData: null,
    terminalInspectorTab: "anchors",
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

  // Lightweight Charts instances
  let lwChart = null;
  let lwCandleSeries = null;
  let lwVolumeSeries = null;
  let lwVwapSeriesMap = new Map();

  // --------------------------------------------------------------------------
  // 2. DOM Elements
  // --------------------------------------------------------------------------
  const htmlEl = document.documentElement;

  // View Switcher Elements
  const btnViewHandoff = document.getElementById("btnViewHandoff");
  const btnViewTerminal = document.getElementById("btnViewTerminal");
  const viewHandoff = document.getElementById("viewHandoff");
  const viewTerminal = document.getElementById("viewTerminal");
  const handoffTopControls = document.getElementById("handoffTopControls");
  const themeSelect = document.getElementById("themeSelect");

  // Handoff Elements
  const sourceSelect = document.getElementById("sourceSelect");
  const symbolSelect = document.getElementById("symbolSelect");
  const nauEquitiesGroup = document.getElementById("nauEquitiesGroup");
  const nauBybitGroup = document.getElementById("nauBybitGroup");
  const tfSegment = document.getElementById("tfSegment");
  const dateFromInput = document.getElementById("dateFrom");
  const dateToInput = document.getElementById("dateTo");
  const btnRunBacktest = document.getElementById("btnRunBacktest");
  const ranLabel = document.getElementById("ranLabel");

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

  // Terminal Elements
  const termTabNau = document.getElementById("termTabNau");
  const termTabTicker = document.getElementById("termTabTicker");
  const termTabCsv = document.getElementById("termTabCsv");
  const termTabSim = document.getElementById("termTabSim");
  const termFormNau = document.getElementById("termFormNau");
  const termFormTicker = document.getElementById("termFormTicker");
  const termPillEquity = document.getElementById("termPillEquity");
  const termPillBybit = document.getElementById("termPillBybit");
  const termNauSymbolSelect = document.getElementById("termNauSymbolSelect");
  const termNauTfSelect = document.getElementById("termNauTfSelect");
  const termNauLimitSelect = document.getElementById("termNauLimitSelect");
  const termTickerInput = document.getElementById("termTickerInput");
  const termPeriodSelect = document.getElementById("termPeriodSelect");
  const termIntervalSelect = document.getElementById("termIntervalSelect");

  const termPrdSlider = document.getElementById("termPrdSlider");
  const termPrdVal = document.getElementById("termPrdVal");
  const termAptSlider = document.getElementById("termAptSlider");
  const termAptVal = document.getElementById("termAptVal");
  const termUseAdapt = document.getElementById("termUseAdapt");
  const termBtnCalculate = document.getElementById("termBtnCalculate");

  const termKpiPrice = document.getElementById("termKpiPrice");
  const termKpiPriceChange = document.getElementById("termKpiPriceChange");
  const termKpiVwap = document.getElementById("termKpiVwap");
  const termKpiVwapDiff = document.getElementById("termKpiVwapDiff");
  const termKpiRegime = document.getElementById("termKpiRegime");
  const termKpiRegimeSub = document.getElementById("termKpiRegimeSub");
  const termKpiAnchor = document.getElementById("termKpiAnchor");
  const termKpiAnchorPrice = document.getElementById("termKpiAnchorPrice");

  const termChartContainer = document.getElementById("termChartContainer");
  const termChartTitle = document.getElementById("termChartTitle");
  const termTabInspectorAnchors = document.getElementById("termTabInspectorAnchors");
  const termTabInspectorBars = document.getElementById("termTabInspectorBars");
  const termInspectorCount = document.getElementById("termInspectorCount");
  const termTableHead = document.getElementById("termTableHead");
  const termTableBody = document.getElementById("termTableBody");

  // --------------------------------------------------------------------------
  // 3. Formatting & Colors
  // --------------------------------------------------------------------------
  function getDecimals(symbol) {
    if (Engine.SYMBOLS[symbol]) return Engine.SYMBOLS[symbol].dec;
    if (symbol.includes("EUR") || symbol.includes("GBP")) return 5;
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
  // 4. View Switcher Logic
  // --------------------------------------------------------------------------
  function setViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem("zvwap_view_mode", mode);

    if (mode === "handoff") {
      btnViewHandoff.classList.add("active");
      btnViewTerminal.classList.remove("active");
      viewHandoff.style.display = "flex";
      viewTerminal.style.display = "none";
      handoffTopControls.style.display = "flex";
      btnRunBacktest.style.display = "flex";
      requestDraw();
    } else {
      btnViewTerminal.classList.add("active");
      btnViewHandoff.classList.remove("active");
      viewHandoff.style.display = "none";
      viewTerminal.style.display = "flex";
      handoffTopControls.style.display = "none";
      btnRunBacktest.style.display = "none";

      if (!lwChart) {
        initLightweightChart();
      }
      loadTerminalData();
    }
  }

  // --------------------------------------------------------------------------
  // 5. NAU Catalog & Data Loading
  // --------------------------------------------------------------------------
  async function fetchNauCatalog() {
    try {
      const res = await fetch("/api/nau/catalog");
      if (!res.ok) return;
      const cat = await res.json();
      state.nauCatalog = cat;

      // Populate Handoff Optgroups
      if (nauEquitiesGroup) {
        nauEquitiesGroup.innerHTML = "";
        (cat.equities || []).forEach((eq) => {
          const opt = document.createElement("option");
          opt.value = `nau:equity:${eq.symbol}`;
          opt.textContent = `${eq.symbol} — (${eq.exchange}, ${eq.total_bars.toLocaleString()} Bar)`;
          nauEquitiesGroup.appendChild(opt);
        });
      }

      if (nauBybitGroup) {
        nauBybitGroup.innerHTML = "";
        (cat.bybit || []).forEach((by) => {
          const opt = document.createElement("option");
          opt.value = `nau:bybit:${by.symbol}:${by.category}:${by.timeframe}`;
          opt.textContent = `${by.symbol} [${by.category.toUpperCase()}] — (${by.timeframe}, ${by.total_bars.toLocaleString()} Bar)`;
          nauBybitGroup.appendChild(opt);
        });
      }

      // Populate Terminal Selectors
      updateTerminalSymbolSelect(cat);
    } catch (e) {
      console.warn("NAU Catalog fetch hatası:", e);
    }
  }

  function updateTerminalSymbolSelect(cat = state.nauCatalog) {
    if (!termNauSymbolSelect || !cat) return;
    termNauSymbolSelect.innerHTML = "";
    if (state.terminalNauCategory === "equity") {
      (cat.equities || []).forEach((eq) => {
        const opt = document.createElement("option");
        opt.value = eq.symbol;
        opt.textContent = `${eq.symbol} — (${eq.exchange}, ${eq.total_bars.toLocaleString()} Bar)`;
        termNauSymbolSelect.appendChild(opt);
      });
      if (cat.equities && cat.equities.length > 0) {
        termNauSymbolSelect.value = cat.equities[0].symbol;
      }
    } else {
      (cat.bybit || []).forEach((by) => {
        const opt = document.createElement("option");
        opt.value = `${by.symbol}:${by.category}`;
        opt.textContent = `${by.symbol} [${by.category.toUpperCase()}] — (${by.timeframe})`;
        termNauSymbolSelect.appendChild(opt);
      });
      if (cat.bybit && cat.bybit.length > 0) {
        termNauSymbolSelect.value = `${cat.bybit[0].symbol}:${cat.bybit[0].category}`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Handoff Strategy Tester Controller
  // --------------------------------------------------------------------------
  async function loadHandoffData() {
    if (ranLabel) ranLabel.textContent = "Hesaplanıyor…";
    let rawBars = [];

    // NAU Symbol check
    if (state.symbol.startsWith("nau:")) {
      const parts = state.symbol.split(":");
      const type = parts[1];
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
          if (statusBadge) {
            statusBadge.textContent = `${resData.source} — Canlı Veri`;
            statusBadge.className = "status-badge-demo bull-text";
          }
        }
      } catch (err) {
        console.error("NAU API Hatası:", err);
      }
    }

    if (!rawBars || rawBars.length === 0) {
      const cleanSym = state.symbol.replace(/^nau:[^:]+:/, "").split(":")[0] || "BTCUSDT";
      rawBars = Engine.genData(cleanSym, state.tf, 420);
      if (statusBadge) {
        statusBadge.textContent = "Sentetik örnek veri — demo";
        statusBadge.className = "status-badge-demo";
      }
    }

    // Date Filters
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

    // Run Engine Calculations
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

    if (ranLabel) {
      ranLabel.textContent = `Son çalıştırma: ${new Date().toLocaleTimeString("tr-TR")}`;
    }

    if (statusLeft) {
      const cleanName = state.symbol.replace(/^nau:[^:]+:/, "");
      statusLeft.textContent = `${cleanName} · ${state.tf} · ${data.length} bar · ${ft2(data[0].t)} → ${ft2(data[data.length - 1].t)}`;
    }

    renderKpiTiles(met);
    renderPerformanceSummary(met);
    renderTradesTable(bt.trades, data);

    requestDraw();
  }

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
    if (!cv || !data.length || !view.e || state.viewMode !== "handoff") return;

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

    let lo = 1e18, hi = -1e18, maxV = 0;
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

    // Grid & Price Ticks
    g.font = `10px ${font}`;
    g.textBaseline = "middle";
    for (const t of niceTicks(lo + pad * 0.4, hi - pad * 0.4, ph / 56)) {
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

    // Time Ticks
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

    // Volume Bars
    const vh = ph * 0.15;
    const bw2 = Math.max(1, (pw / n) * 0.7);
    for (let i = v0; i < v1; i++) {
      const b = data[i];
      g.fillStyle = b.c >= b.o ? "rgba(8,153,129,0.28)" : "rgba(242,54,69,0.28)";
      const h2 = (b.v / maxV) * vh;
      g.fillRect(x(i) - bw2 / 2, ph - h2, bw2, h2);
    }

    // DSAVWAP Bands & Curves
    const segs = [];
    let seg = [];
    let curAnchor = null;
    for (let i = v0; i < v1; i++) {
      const w = vw[i];
      if (!w) {
        if (seg.length) { segs.push(seg); seg = []; }
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

      g.beginPath();
      s.forEach(([i, w], k) => {
        k ? g.lineTo(x(i), y(w.v)) : g.moveTo(x(i), y(w.v));
      });
      g.strokeStyle = s[0][1].aType === "L" ? colors.bull : colors.bear;
      g.lineWidth = 1.6;
      g.stroke();
      g.lineWidth = 1;

      // Anchor diamond
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

    // Candlesticks
    const bw = Math.max(1, Math.min(11, (pw / n) * 0.7));
    for (let i = v0; i < v1; i++) {
      const b = data[i];
      const up = b.c >= b.o;
      const col = up ? colors.bull : colors.bear;
      const xx = x(i);

      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(xx, y(b.h));
      g.lineTo(xx, y(b.l));
      g.stroke();

      g.fillStyle = col;
      g.fillRect(xx - bw / 2, Math.min(y(b.o), y(b.c)), bw, Math.max(1, Math.abs(y(b.o) - y(b.c))));
    }

    // Trade Markers
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

      if (inEntry && t.xi != null && (inExit || t.xi >= v1)) {
        g.beginPath();
        g.moveTo(x(t.ei), y(t.entry));
        g.lineTo(x(Math.min(t.xi, v1 - 1)), y(t.exit ?? t.entry));
        g.strokeStyle = t.pnl >= 0 ? "rgba(8,153,129,0.55)" : "rgba(242,54,69,0.55)";
        g.setLineDash([3, 3]);
        g.stroke();
        g.setLineDash([]);
      }

      if (inEntry) {
        if (t.side === "L") drawTriangle(x(t.ei), y(data[t.ei].l) + 12, true, colors.bull);
        else drawTriangle(x(t.ei), y(data[t.ei].h) - 12, false, colors.bear);
      }

      if (inExit) {
        const xx = x(t.xi);
        const yy = t.side === "L" ? y(data[t.xi].h) - 10 : y(data[t.xi].l) + 10;
        g.fillStyle = "#50535e";
        g.fillRect(xx - 3, yy - 3, 6, 6);
      }
    }

    // Crosshair
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

      const pv = lo + (1 - cy / ph) * (hi - lo);
      g.fillStyle = colors.crosshairTagBg;
      g.fillRect(pw, cy - 9, AX, 18);
      g.fillStyle = colors.crosshairTagText;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.font = `10px ${font}`;
      g.fillText(fp(pv), pw + 6, cy);

      const tl = ft2(data[hb].t);
      const tw = g.measureText(tl).width + 14;
      g.fillStyle = colors.crosshairTagBg;
      g.fillRect(cx - tw / 2, ph, tw, TB - 2);
      g.fillStyle = colors.crosshairTagText;
      g.textAlign = "center";
      g.fillText(tl, cx, ph + 11);
    }

    // Legend
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
      g.fillText(`VWAP ${fp(Wv.v)}  ·  Çapa: ${Wv.aType === "L" ? "Swing Dip" : "Swing Tepe"} (${ft(data[Wv.aI].t)})`, 10, 54);
      g.fillStyle = colors.textMuted;
      g.fillText(`+1σ ${fp(Wv.u1)}   −1σ ${fp(Wv.l1)}   ±2σ bantları kesikli`, 10, 69);
    }

    // Border
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
    if (!cv || !equity || !equity.length || state.handoffTab !== "overview" || state.viewMode !== "handoff") return;

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

    const AX = 70, PT = 22, PB = 8, pw = W - AX, ph = H - PT - PB;
    let lo = Infinity, hi = -Infinity;
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

    g.strokeStyle = colors.textMuted;
    g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(0, y(cap));
    g.lineTo(pw, y(cap));
    g.stroke();
    g.setLineDash([]);

    const grad = g.createLinearGradient(0, PT, 0, PT + ph);
    grad.addColorStop(0, "rgba(41, 98, 255, 0.28)");
    grad.addColorStop(1, "rgba(41, 98, 255, 0)");
    g.beginPath();
    equity.forEach((e, i) => { i ? g.lineTo(x(i), y(e.v)) : g.moveTo(x(i), y(e.v)); });
    g.lineTo(pw, PT + ph);
    g.lineTo(0, PT + ph);
    g.closePath();
    g.fillStyle = grad;
    g.fill();

    g.beginPath();
    equity.forEach((e, i) => { i ? g.lineTo(x(i), y(e.v)) : g.moveTo(x(i), y(e.v)); });
    g.strokeStyle = colors.accent;
    g.lineWidth = 1.6;
    g.stroke();
    g.lineWidth = 1;

    g.font = `700 11px ${font}`;
    g.fillStyle = colors.textSecondary;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillText("Özkaynak Eğrisi", 10, 15);

    const last = equity[equity.length - 1].v;
    g.fillStyle = last >= cap ? colors.bull : colors.bear;
    g.fillText(fm(last - cap), 110, 15);
  }

  function renderKpiTiles(m) {
    if (!m || !kpiTilesContainer) return;
    const pos = "bull-text", neg = "bear-text";
    const tiles = [
      { l: "Net Kar", v: fm(m.net), s: `${m.netPct >= 0 ? "+" : ""}${m.netPct.toFixed(2)}%`, c: m.net >= 0 ? pos : neg },
      { l: "Toplam İşlem", v: String(m.total), s: `${m.wins} kazanç / ${m.losses} kayıp`, c: "" },
      { l: "Kazanma Oranı", v: `${m.winRate.toFixed(1)}%`, s: "kapalı işlemler", c: m.winRate >= 50 ? pos : neg },
      { l: "Profit Factor", v: isFinite(m.pf) ? m.pf.toFixed(2) : "∞", s: "brüt kar / brüt zarar", c: m.pf >= 1 ? pos : neg },
      { l: "Maks. Düşüş", v: `−${m.mddPct.toFixed(2)}%`, s: fm(-m.mdd), c: neg },
      { l: "Sharpe Oranı", v: m.sharpe.toFixed(2), s: "yıllıklandırılmış", c: m.sharpe >= 1 ? pos : "" },
    ];

    kpiTilesContainer.innerHTML = tiles.map((t) => `
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px;">
        <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.3px; text-transform: uppercase;">${t.l}</div>
        <div style="font-size: 17px; font-weight: 700; font-family: var(--font-mono); margin-top: 4px;" class="${t.c}">${t.v}</div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${t.s}</div>
      </div>
    `).join("");
  }

  function renderPerformanceSummary(m) {
    if (!m || !perfGridContainer) return;
    const pos = "bull-text", neg = "bear-text";
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

    perfGridContainer.innerHTML = items.map(([label, val, cls]) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-secondary); font-size: 12px;">${label}</span>
        <span style="font-family: var(--font-mono); font-size: 12px; font-weight: 600;" class="${cls}">${val}</span>
      </div>
    `).join("");
  }

  function renderTradesTable(trades, data) {
    if (!tradesRowsContainer) return;
    const pos = "bull-text", neg = "bear-text";
    let cum = 0;

    if (tabBtnTrades) tabBtnTrades.textContent = `İşlem Listesi (${trades.length})`;

    tradesRowsContainer.innerHTML = trades.map((t, i) => {
      cum += t.pnl;
      const isLong = t.side === "L";
      const isWin = t.pnl >= 0;
      const entryTime = data[t.ei] ? ft2(data[t.ei].t) : "—";
      const exitTime = t.xi != null && data[t.xi] ? ft2(data[t.xi].t) : "—";

      return `
        <div style="display: grid; grid-template-columns: 32px 48px minmax(90px, 1fr) 84px minmax(90px, 1fr) 84px 96px 92px 60px 92px; white-space: nowrap; overflow: hidden; padding: 6px 12px; font-size: 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono);">
          <span style="color: var(--text-muted);">${i + 1}</span>
          <span style="font-weight: 700;" class="${isLong ? pos : neg}">${isLong ? "Uzun" : "Kısa"}</span>
          <span style="color: var(--text-secondary);">${entryTime}</span>
          <span style="text-align: right;">${fp(t.entry)}</span>
          <span style="padding-left: 16px; color: var(--text-secondary);">${exitTime}</span>
          <span style="text-align: right;">${t.exit != null ? fp(t.exit) : "—"}</span>
          <span style="padding-left: 16px; color: var(--text-muted); font-family: var(--font-ui);">${t.reason}</span>
          <span style="text-align: right; font-weight: 600;" class="${isWin ? pos : neg}">${fm(t.pnl)}</span>
          <span style="text-align: right;" class="${isWin ? pos : neg}">${t.pnlPct != null ? (t.pnlPct >= 0 ? "+" : "") + t.pnlPct.toFixed(2) + "%" : "—"}</span>
          <span style="text-align: right; color: var(--text-secondary);">${fm(cum)}</span>
        </div>
      `;
    }).join("");
  }

  // --------------------------------------------------------------------------
  // 7. Terminal (Lightweight Charts) Controller
  // --------------------------------------------------------------------------
  function initLightweightChart() {
    if (!termChartContainer || !window.LightweightCharts) return;

    const colors = getThemeColors();
    lwChart = LightweightCharts.createChart(termChartContainer, {
      width: termChartContainer.clientWidth || 800,
      height: termChartContainer.clientHeight || 420,
      layout: {
        background: { type: "solid", color: colors.bgApp },
        textColor: colors.textMain,
        fontFamily: getComputedStyle(htmlEl).fontFamily || "-apple-system, Segoe UI, sans-serif",
      },
      grid: {
        vertLines: { color: colors.borderSubtle },
        horzLines: { color: colors.borderSubtle },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: colors.border,
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
      },
    });

    lwCandleSeries = lwChart.addCandlestickSeries({
      upColor: colors.bull,
      downColor: colors.bear,
      borderVisible: false,
      wickUpColor: colors.bull,
      wickDownColor: colors.bear,
    });

    lwVolumeSeries = lwChart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    lwVolumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    window.addEventListener("resize", () => {
      if (lwChart && termChartContainer) {
        lwChart.applyOptions({
          width: termChartContainer.clientWidth,
          height: termChartContainer.clientHeight,
        });
      }
    });
  }

  async function loadTerminalData() {
    let payload = {
      swing_period: parseInt(termPrdSlider.value) || 50,
      base_apt: parseFloat(termAptSlider.value) || 20,
      use_adapt: termUseAdapt.checked,
      vol_bias: 10.0,
    };

    if (state.terminalSource === "nau") {
      payload.data_source = "nau";
      const symVal = termNauSymbolSelect.value || "NVDA";
      if (state.terminalNauCategory === "equity") {
        payload.nau_symbol = symVal;
        payload.nau_source = "equity_catalog";
        payload.nau_category = "equity";
      } else {
        const [s, cat] = symVal.split(":");
        payload.nau_symbol = s;
        payload.nau_category = cat || "linear";
        payload.nau_source = "bybit";
      }
      payload.nau_timeframe = termNauTfSelect.value || "1h";
      payload.nau_limit_bars = parseInt(termNauLimitSelect.value) || 1000;
    } else if (state.terminalSource === "ticker") {
      payload.data_source = "yahoo";
      payload.ticker = termTickerInput.value.trim() || "BTC-USD";
      payload.period = termPeriodSelect.value;
      payload.interval = termIntervalSelect.value;
    } else {
      payload.data_source = "synthetic";
      payload.use_synthetic = true;
    }

    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Terminal veri yüklenemedi");
      const data = await res.json();
      state.terminalData = data;
      renderTerminalDashboard(data);
    } catch (err) {
      console.error("Terminal hatası:", err);
    }
  }

  function renderTerminalDashboard(data) {
    if (!lwChart) initLightweightChart();
    if (!lwChart) return;

    termChartTitle.textContent = `${data.source} — Dynamic Swing Anchored VWAP`;

    lwCandleSeries.setData(data.candles);
    lwVolumeSeries.setData(data.volumes);

    // Remove previous VWAP lines
    for (const [, s] of lwVwapSeriesMap) {
      lwChart.removeSeries(s);
    }
    lwVwapSeriesMap.clear();

    // Map segments
    const segmentMap = new Map();
    for (const pt of data.vwap_points) {
      if (!segmentMap.has(pt.segment_id)) {
        segmentMap.set(pt.segment_id, { dir: pt.dir, points: [] });
      }
      segmentMap.get(pt.segment_id).points.push({ time: pt.time, value: pt.value });
    }

    for (const [segId, seg] of segmentMap) {
      const color = seg.dir > 0 ? "#089981" : "#f23645";
      const lineSeries = lwChart.addLineSeries({
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(seg.points);
      lwVwapSeriesMap.set(segId, lineSeries);
    }

    const markers = (data.anchors || []).map((a) => ({
      time: a.time,
      position: a.position,
      color: a.color,
      shape: a.shape,
      text: a.label,
      size: 1.2,
    }));
    lwCandleSeries.setMarkers(markers);
    lwChart.timeScale().fitContent();

    // KPI Banner
    const m = data.metrics;
    termKpiPrice.textContent = `$${m.latest_close.toLocaleString()}`;
    termKpiPriceChange.textContent = `${m.price_change_pct >= 0 ? "+" : ""}${m.price_change_pct}%`;
    termKpiPriceChange.className = `kpi-card-sub ${m.price_change_pct >= 0 ? "bull-text" : "bear-text"}`;

    termKpiVwap.textContent = `$${m.latest_vwap.toLocaleString()}`;
    termKpiVwapDiff.textContent = `${m.vwap_diff_pct >= 0 ? "+" : ""}${m.vwap_diff_pct}% Fark`;
    termKpiVwapDiff.className = `kpi-card-sub ${m.vwap_diff_pct >= 0 ? "bull-text" : "bear-text"}`;

    termKpiRegime.textContent = m.regime === "BULLISH" ? "BOĞA / YÜKSELİŞ" : "AYI / DÜŞÜŞ";
    termKpiRegime.className = `kpi-card-val ${m.current_dir > 0 ? "bull-text" : "bear-text"}`;
    termKpiRegimeSub.textContent = m.current_dir > 0 ? "Re-Anchor: Dip Pivot" : "Re-Anchor: Tepe Pivot";

    termKpiAnchor.textContent = m.last_anchor_label;
    termKpiAnchorPrice.textContent = `$${m.last_anchor_price.toLocaleString()}`;

    renderTerminalInspectorTable(data);
  }

  function renderTerminalInspectorTable(data) {
    if (!termTableBody) return;
    if (state.terminalInspectorTab === "anchors") {
      termTableHead.innerHTML = `
        <tr>
          <th>Tür</th>
          <th>Çapa Fiyatı</th>
          <th>Tarih</th>
          <th>Bar İndeksi</th>
          <th>Segment</th>
          <th>Yön</th>
        </tr>
      `;
      termInspectorCount.textContent = `${data.anchors.length} Çapa`;
      termTableBody.innerHTML = (data.anchors || []).slice().reverse().map((a) => {
        const isHigh = a.label.includes("H");
        return `
          <tr>
            <td><span class="badge-pivot ${isHigh ? "badge-high" : "badge-low"}">${a.label}</span></td>
            <td><strong>$${a.price.toLocaleString()}</strong></td>
            <td>${new Date(a.time * 1000).toLocaleString()}</td>
            <td>#${a.bar_index}</td>
            <td>#${a.segment_id}</td>
            <td><span class="regime-tag ${a.dir > 0 ? "bull" : "bear"}">${a.dir > 0 ? "BOĞA" : "AYI"}</span></td>
          </tr>
        `;
      }).join("");
    } else {
      termTableHead.innerHTML = `
        <tr>
          <th>Tarih</th>
          <th>Açılış</th>
          <th>Yüksek</th>
          <th>Düşük</th>
          <th>Kapanış</th>
          <th>Hacim</th>
        </tr>
      `;
      const candles = (data.candles || []).slice(-100).reverse();
      termInspectorCount.textContent = `${candles.length} Bar`;
      termTableBody.innerHTML = candles.map((c) => `
        <tr>
          <td>${new Date(c.time * 1000).toLocaleString()}</td>
          <td>$${c.open.toFixed(2)}</td>
          <td>$${c.high.toFixed(2)}</td>
          <td>$${c.low.toFixed(2)}</td>
          <td><strong>$${c.close.toFixed(2)}</strong></td>
          <td>${c.close.toLocaleString()}</td>
        </tr>
      `).join("");
    }
  }

  // --------------------------------------------------------------------------
  // 8. Event Listeners & Binding
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // 1. View Switcher
    btnViewHandoff.addEventListener("click", () => setViewMode("handoff"));
    btnViewTerminal.addEventListener("click", () => setViewMode("terminal"));

    // 2. Theme Switcher
    themeSelect.value = state.theme;
    htmlEl.setAttribute("data-theme", state.theme);
    themeSelect.addEventListener("change", () => {
      state.theme = themeSelect.value;
      htmlEl.setAttribute("data-theme", state.theme);
      localStorage.setItem("zvwap_theme", state.theme);
      requestDraw();
      if (lwChart) {
        const c = getThemeColors();
        lwChart.applyOptions({
          layout: { background: { type: "solid", color: c.bgApp }, textColor: c.textMain },
          grid: { vertLines: { color: c.borderSubtle }, horzLines: { color: c.borderSubtle } },
        });
      }
    });

    // 3. Handoff Top Toolbar
    sourceSelect.addEventListener("change", () => {
      if (sourceSelect.value === "nau") {
        if (nauEquitiesGroup.firstChild) symbolSelect.value = nauEquitiesGroup.firstChild.value;
      } else {
        symbolSelect.value = "BTCUSDT";
      }
      state.symbol = symbolSelect.value;
      loadHandoffData();
    });

    symbolSelect.addEventListener("change", () => {
      state.symbol = symbolSelect.value;
      loadHandoffData();
    });

    tfSegment.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        tfSegment.querySelectorAll(".seg-btn").forEach((b) => {
          b.classList.remove("active");
          b.style.background = "transparent";
          b.style.color = "var(--text-muted)";
        });
        btn.classList.add("active");
        btn.style.background = "var(--border)";
        btn.style.color = "var(--text-strong)";
        state.tf = btn.dataset.tf;
        loadHandoffData();
      });
    });

    dateFromInput.addEventListener("change", () => {
      state.dateFrom = dateFromInput.value;
      loadHandoffData();
    });
    dateToInput.addEventListener("change", () => {
      state.dateTo = dateToInput.value;
      loadHandoffData();
    });
    btnRunBacktest.addEventListener("click", () => loadHandoffData());

    // Handoff Tester Tabs
    const handoffTabs = [
      { btn: tabBtnOverview, content: contentOverview, id: "overview" },
      { btn: tabBtnPerf, content: contentPerf, id: "perf" },
      { btn: tabBtnTrades, content: contentTrades, id: "trades" },
    ];
    handoffTabs.forEach(({ btn, content, id }) => {
      btn.addEventListener("click", () => {
        handoffTabs.forEach((t) => {
          t.btn.classList.remove("active");
          t.btn.style.color = "var(--text-muted)";
          t.btn.style.borderBottom = "2px solid transparent";
          t.content.style.display = "none";
        });
        btn.classList.add("active");
        btn.style.color = "var(--accent)";
        btn.style.borderBottom = "2px solid var(--accent)";
        content.style.display = id === "perf" ? "block" : "flex";
        state.handoffTab = id;
        requestDraw();
      });
    });

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
      loadHandoffData();
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
      loadHandoffData();
    });

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

    // 4. Terminal View Event Listeners
    const termSourceTabs = [
      { btn: termTabNau, form: termFormNau, id: "nau" },
      { btn: termTabTicker, form: termFormTicker, id: "ticker" },
      { btn: termTabCsv, form: null, id: "csv" },
      { btn: termTabSim, form: null, id: "sim" },
    ];
    termSourceTabs.forEach(({ btn, form, id }) => {
      btn.addEventListener("click", () => {
        termSourceTabs.forEach((t) => {
          t.btn.classList.remove("active");
          if (t.form) t.form.style.display = "none";
        });
        btn.classList.add("active");
        if (form) form.style.display = "flex";
        state.terminalSource = id;
      });
    });

    termPillEquity.addEventListener("click", () => {
      termPillEquity.classList.add("active");
      termPillBybit.classList.remove("active");
      state.terminalNauCategory = "equity";
      updateTerminalSymbolSelect(state.nauCatalog);
      loadTerminalData();
    });

    termPillBybit.addEventListener("click", () => {
      termPillBybit.classList.add("active");
      termPillEquity.classList.remove("active");
      state.terminalNauCategory = "bybit";
      updateTerminalSymbolSelect(state.nauCatalog);
      loadTerminalData();
    });

    termNauSymbolSelect.addEventListener("change", () => loadTerminalData());
    termNauTfSelect.addEventListener("change", () => loadTerminalData());
    termNauLimitSelect.addEventListener("change", () => loadTerminalData());

    termPrdSlider.addEventListener("input", () => { termPrdVal.textContent = termPrdSlider.value; });
    termAptSlider.addEventListener("input", () => { termAptVal.textContent = termAptSlider.value; });
    termBtnCalculate.addEventListener("click", () => loadTerminalData());

    termTabInspectorAnchors.addEventListener("click", () => {
      termTabInspectorAnchors.classList.add("active");
      termTabInspectorBars.classList.remove("active");
      state.terminalInspectorTab = "anchors";
      if (state.terminalData) renderTerminalInspectorTable(state.terminalData);
    });

    termTabInspectorBars.addEventListener("click", () => {
      termTabInspectorBars.classList.add("active");
      termTabInspectorAnchors.classList.remove("active");
      state.terminalInspectorTab = "bars";
      if (state.terminalData) renderTerminalInspectorTable(state.terminalData);
    });

    // 5. Canvas Interactions (Zoom & Pan)
    chartCanvas.addEventListener("wheel", (e) => {
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
    }, { passive: false });

    chartCanvas.addEventListener("mousemove", (e) => {
      const r = chartCanvas.getBoundingClientRect();
      renderState.hover = { mx: e.clientX - r.left, my: e.clientY - r.top };
      if (renderState.dragging) {
        const el = chartCanvas;
        const { data, dragView, dragX } = renderState;
        if (!el || !data.length) return;
        const rect = el.getBoundingClientRect();
        const perBar = (rect.width - 62) / (dragView.e - dragView.s);
        const bars = Math.round((e.clientX - dragX) / perBar);
        if (bars) {
          const n = data.length;
          const len = dragView.e - dragView.s;
          const s = Math.max(0, Math.min(n - len, dragView.s - bars));
          renderState.view = { s, e: s + len };
        }
      }
      requestDraw();
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

    const ro = new ResizeObserver(() => requestDraw());
    ro.observe(chartWrap);
    ro.observe(equityWrap);
  }

  // --------------------------------------------------------------------------
  // 9. Bootstrap
  // --------------------------------------------------------------------------
  async function init() {
    setupEventListeners();
    await fetchNauCatalog();
    setViewMode(state.viewMode);
    if (state.viewMode === "handoff") {
      await loadHandoffData();
    } else {
      await loadTerminalData();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
