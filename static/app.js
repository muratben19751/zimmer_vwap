/**
 * Zimmer VWAP — Dynamic Swing Anchored VWAP Backtester & Terminal
 * Unified High-Fidelity Application Powered by TradingView Lightweight Charts
 */

import * as Engine from "./engine.js";

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // 1. Constants & State
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

  const HARDCODED_EQUITIES = [
    { symbol: "NVDA", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "AAPL", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "TSLA", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "AMD", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "AMZN", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "MSFT", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "GOOGL", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "META", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "SPY", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "QQQ", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "QQQC", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "QQQQ", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "IWM", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "HOOD", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "IBM", venue: "NASDAQ", total_bars: 58988 },
    { symbol: "AA", venue: "NASDAQ", total_bars: 58988 },
  ];

  const HARDCODED_BYBIT = [
    { symbol: "BTCUSDT", category: "linear" },
    { symbol: "ETHUSDT", category: "linear" },
    { symbol: "SOLUSDT", category: "linear" },
    { symbol: "DOGEUSDT", category: "linear" },
    { symbol: "BTCUSDT", category: "spot" },
    { symbol: "ETHUSDT", category: "spot" },
    { symbol: "SOLUSDT", category: "spot" },
    { symbol: "BTCUSDT", category: "inverse" },
    { symbol: "ETHUSDT", category: "inverse" },
    { symbol: "SOLUSDT", category: "inverse" },
  ];

  const state = {
    viewMode: localStorage.getItem("zvwap_view_mode") || "handoff",
    theme: localStorage.getItem("zvwap_theme") || "light",
    
    // Handoff state
    symbol: "nau:equity:AA",
    tf: "1h",
    dateFrom: "",
    dateTo: "",
    handoffTab: "overview",
    params: { ...DEF_PARAMS },
    nauCatalog: null,

    // Terminal state
    terminalSource: "nau",
    terminalNauCategory: "equity",
    terminalData: null,
    terminalInspectorTab: "anchors",
  };

  let renderState = {
    data: [],
    vw: [],
    swings: [],
    trades: [],
    equity: [],
    met: null,
  };

  // TradingView Lightweight Charts instances
  let handoffLwChart = null;
  let handoffCandleSeries = null;
  let handoffVolumeSeries = null;
  let handoffVwapSeriesList = [];

  let termLwChart = null;
  let termCandleSeries = null;
  let termVolumeSeries = null;
  let termVwapSeriesMap = new Map();

  // --------------------------------------------------------------------------
  // 2. DOM Elements
  // --------------------------------------------------------------------------
  const htmlEl = document.documentElement;

  const btnViewHandoff = document.getElementById("btnViewHandoff");
  const btnViewTerminal = document.getElementById("btnViewTerminal");
  const viewHandoff = document.getElementById("viewHandoff");
  const viewTerminal = document.getElementById("viewTerminal");
  const handoffTopControls = document.getElementById("handoffTopControls");
  const themeSelect = document.getElementById("themeSelect");

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
  const handoffChartTitle = document.getElementById("handoffChartTitle");
  const handoffLwChartContainer = document.getElementById("handoffLwChartContainer");

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
  const termTabInspectorBacktest = document.getElementById("termTabInspectorBacktest");
  const termBacktestSummaryBar = document.getElementById("termBacktestSummaryBar");
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

  function ft2(t) {
    if (!t) return "";
    const d = new Date(t);
    const dd = `${d.getUTCDate()} ${MO[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
    return `${dd} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
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
      bandLine1: cs.getPropertyValue("--band-line1").trim() || "rgba(41,98,255,0.45)",
      bandLine2: cs.getPropertyValue("--band-line2").trim() || "rgba(41,98,255,0.25)",
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

      if (!handoffLwChart) {
        initHandoffLightweightChart();
      }
      setTimeout(() => {
        resizeHandoffChart();
        drawEquity();
      }, 50);
      loadHandoffData();
    } else {
      btnViewTerminal.classList.add("active");
      btnViewHandoff.classList.remove("active");
      viewHandoff.style.display = "none";
      viewTerminal.style.display = "flex";
      handoffTopControls.style.display = "none";
      btnRunBacktest.style.display = "none";

      if (!termLwChart) {
        initTerminalLightweightChart();
      }
      setTimeout(() => {
        if (termLwChart && termChartContainer) {
          termLwChart.applyOptions({
            width: termChartContainer.clientWidth || 800,
            height: termChartContainer.clientHeight || 420,
          });
        }
      }, 50);
      loadTerminalData();
    }
  }

  function resizeHandoffChart() {
    if (handoffLwChart && handoffLwChartContainer) {
      const w = handoffLwChartContainer.clientWidth;
      const h = handoffLwChartContainer.clientHeight;
      if (w > 20 && h > 20) {
        handoffLwChart.applyOptions({ width: w, height: h });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. NAU Catalog & Data Loading
  // --------------------------------------------------------------------------
  async function fetchNauCatalog() {
    try {
      const res = await fetch("/api/nau/catalog");
      if (!res.ok) throw new Error("Catalog fetch failed");
      const cat = await res.json();
      state.nauCatalog = cat;

      // Populate Handoff Optgroups
      if (nauEquitiesGroup) {
        nauEquitiesGroup.innerHTML = "";
        (cat.equities || HARDCODED_EQUITIES).forEach((eq) => {
          const opt = document.createElement("option");
          opt.value = `nau:equity:${eq.symbol}`;
          const countStr = eq.total_bars != null ? ` (${Number(eq.total_bars).toLocaleString()} Bar)` : "";
          opt.textContent = `${eq.symbol} — ${eq.venue || "NASDAQ"}${countStr}`;
          nauEquitiesGroup.appendChild(opt);
        });
      }

      if (nauBybitGroup) {
        nauBybitGroup.innerHTML = "";
        (cat.bybit || HARDCODED_BYBIT).forEach((by) => {
          const opt = document.createElement("option");
          opt.value = `nau:bybit:${by.symbol}:${by.category || "linear"}`;
          opt.textContent = `${by.symbol} [${(by.category || "LINEAR").toUpperCase()}]`;
          nauBybitGroup.appendChild(opt);
        });
      }

      updateTerminalSymbolSelect(cat);
    } catch (e) {
      console.warn("NAU Catalog fetch hatası, varsayılanlar yükleniyor:", e);
      updateTerminalSymbolSelect(null);
    }
  }

  function updateTerminalSymbolSelect(cat = state.nauCatalog) {
    if (!termNauSymbolSelect) return;
    termNauSymbolSelect.innerHTML = "";

    if (state.terminalNauCategory === "equity") {
      const list = (cat && cat.equities && cat.equities.length) ? cat.equities : HARDCODED_EQUITIES;
      list.forEach((eq) => {
        const opt = document.createElement("option");
        opt.value = eq.symbol;
        const countStr = eq.total_bars != null ? ` (${Number(eq.total_bars).toLocaleString()} Bar)` : "";
        opt.textContent = `${eq.symbol} — ${eq.venue || "NASDAQ"}${countStr}`;
        termNauSymbolSelect.appendChild(opt);
      });
      if (list.length > 0) {
        termNauSymbolSelect.value = list[0].symbol;
      }
    } else {
      const list = (cat && cat.bybit && cat.bybit.length) ? cat.bybit : HARDCODED_BYBIT;
      list.forEach((by) => {
        const opt = document.createElement("option");
        opt.value = `${by.symbol}:${by.category || "linear"}`;
        opt.textContent = `${by.symbol} [${(by.category || "LINEAR").toUpperCase()}]`;
        termNauSymbolSelect.appendChild(opt);
      });
      if (list.length > 0) {
        termNauSymbolSelect.value = `${list[0].symbol}:${list[0].category || "linear"}`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Kompakt Backtester Controller (with TradingView Lightweight Charts)
  // --------------------------------------------------------------------------
  function initHandoffLightweightChart() {
    const container = document.getElementById("handoffLwChartContainer");
    if (!container || !window.LightweightCharts) return;

    if (handoffLwChart) {
      try {
        handoffLwChart.remove();
      } catch (e) {}
      handoffLwChart = null;
    }

    const colors = getThemeColors();
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 400;

    handoffLwChart = LightweightCharts.createChart(container, {
      width: w,
      height: h,
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
        secondsVisible: false,
      },
    });

    handoffCandleSeries = handoffLwChart.addCandlestickSeries({
      upColor: colors.bull,
      downColor: colors.bear,
      borderVisible: false,
      wickUpColor: colors.bull,
      wickDownColor: colors.bear,
    });

    handoffVolumeSeries = handoffLwChart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    handoffVolumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    window.addEventListener("resize", () => resizeHandoffChart());
  }

  async function loadHandoffData() {
    if (ranLabel) ranLabel.textContent = "Hesaplanıyor…";
    let apiData = null;

    let payload = {
      swing_period: state.params.len * 5 || 50,
      base_apt: 20.0,
      use_adapt: true,
      vol_bias: 10.0,
    };

    if (state.symbol.startsWith("nau:")) {
      const parts = state.symbol.split(":");
      const type = parts[1];
      const sym = parts[2];
      const category = parts[3] || "linear";

      payload.data_source = "nau";
      payload.nau_symbol = sym;
      payload.nau_category = category;
      payload.nau_source = type === "equity" ? "equity_catalog" : "bybit";
      payload.nau_timeframe = state.tf;
      payload.nau_limit_bars = 1000;
    } else if (state.symbol.includes("USD") || state.symbol.includes("EUR")) {
      payload.data_source = "synthetic";
      payload.use_synthetic = true;
    } else {
      payload.data_source = "yahoo";
      payload.ticker = state.symbol;
      payload.period = "6mo";
      payload.interval = state.tf === "1D" ? "1d" : "1h";
    }

    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        apiData = await res.json();
      }
    } catch (err) {
      console.warn("API calculate error:", err);
    }

    if (!apiData || !apiData.candles || apiData.candles.length === 0) {
      const cleanSym = state.symbol.replace(/^nau:[^:]+:/, "").split(":")[0] || "BTCUSDT";
      const rawBars = Engine.genData(cleanSym, state.tf, 420);
      const swings = Engine.computeSwings(rawBars, state.params.len);
      const vw = Engine.computeVWAP(rawBars, swings, state.params.m1, state.params.m2);
      apiData = {
        source: `Demo: ${cleanSym} (${state.tf})`,
        candles: rawBars.map((b) => ({ time: Math.floor(b.t / 1000), open: b.o, high: b.h, low: b.l, close: b.c })),
        volumes: rawBars.map((b) => ({ time: Math.floor(b.t / 1000), value: b.v, color: b.c >= b.o ? "rgba(8,153,129,0.35)" : "rgba(242,54,69,0.35)" })),
        vwap_points: vw.filter(Boolean).map((w, i) => ({ time: Math.floor(rawBars[i].t / 1000), value: w.v, dir: w.aType === "L" ? 1 : -1, segment_id: w.aI })),
        anchors: swings.map((sw) => ({ time: Math.floor(rawBars[sw.index].t / 1000), position: sw.type === "H" ? "aboveBar" : "belowBar", color: sw.type === "H" ? "#f23645" : "#089981", shape: sw.type === "H" ? "arrowDown" : "arrowUp", label: sw.label })),
      };
    }

    if (handoffChartTitle) {
      handoffChartTitle.textContent = `${apiData.source} — Dynamic Swing Anchored VWAP`;
    }

    const rawBars = (apiData.candles || []).map((c, i) => ({
      t: c.time * 1000,
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: apiData.volumes && apiData.volumes[i] ? apiData.volumes[i].value : 1000,
    }));

    const swings = Engine.computeSwings(rawBars, state.params.len);
    const vw = Engine.computeVWAP(rawBars, swings, state.params.m1, state.params.m2);
    const bt = Engine.backtest(rawBars, vw, state.params);
    const met = Engine.metrics(bt.trades, bt.equity, state.params.capital, state.tf);
    met.comm = bt.commTotal;

    renderState.data = rawBars;
    renderState.vw = vw;
    renderState.swings = swings;
    renderState.trades = bt.trades;
    renderState.equity = bt.equity;
    renderState.met = met;

    if (ranLabel) {
      ranLabel.textContent = `Son çalıştırma: ${new Date().toLocaleTimeString("tr-TR")}`;
    }

    if (statusLeft) {
      statusLeft.textContent = `${apiData.source} · ${rawBars.length} bar`;
    }

    renderHandoffLightweightChart(apiData, rawBars, bt.trades);
    renderKpiTiles(met);
    renderPerformanceSummary(met);
    renderTradesTable(bt.trades, rawBars);
    drawEquity();
  }

  function renderHandoffLightweightChart(apiData, data, trades) {
    if (!handoffLwChart) initHandoffLightweightChart();
    if (!handoffLwChart) return;

    const container = document.getElementById("handoffLwChartContainer");
    if (container && container.clientWidth && container.clientHeight) {
      handoffLwChart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    }

    // 1. Candles & Volume
    if (apiData.candles && apiData.candles.length) {
      handoffCandleSeries.setData(apiData.candles);
    }
    if (apiData.volumes && apiData.volumes.length) {
      handoffVolumeSeries.setData(apiData.volumes);
    }

    // 2. Clear old VWAP line series
    handoffVwapSeriesList.forEach((s) => {
      try {
        handoffLwChart.removeSeries(s);
      } catch (e) {}
    });
    handoffVwapSeriesList = [];

    // 3. Segment VWAP Lines directly from backend algorithm
    const segmentMap = new Map();
    for (const pt of (apiData.vwap_points || [])) {
      if (!segmentMap.has(pt.segment_id)) {
        segmentMap.set(pt.segment_id, { dir: pt.dir, points: [] });
      }
      segmentMap.get(pt.segment_id).points.push({ time: pt.time, value: pt.value });
    }

    for (const [, seg] of segmentMap) {
      const color = seg.dir > 0 ? "#089981" : "#f23645";
      const lineSeries = handoffLwChart.addLineSeries({
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(seg.points);
      handoffVwapSeriesList.push(lineSeries);
    }

    // 4. Markers for Swings & Trade Signals
    const markers = [];

    // Swing Pivot Markers from backend
    (apiData.anchors || []).forEach((a) => {
      if (a.time) {
        markers.push({
          time: a.time,
          position: a.position || (a.label.includes("H") ? "aboveBar" : "belowBar"),
          color: a.color || (a.label.includes("H") ? "#f23645" : "#089981"),
          shape: a.shape || (a.label.includes("H") ? "arrowDown" : "arrowUp"),
          text: a.label,
          size: 1.1,
        });
      }
    });

    // Trade Markers
    (trades || []).forEach((t) => {
      if (data[t.ei]) {
        const isLong = t.side === "L";
        const tTime = Math.floor(data[t.ei].t / 1000);
        if (tTime) {
          markers.push({
            time: tTime,
            position: isLong ? "belowBar" : "aboveBar",
            color: isLong ? "#089981" : "#f23645",
            shape: isLong ? "arrowUp" : "arrowDown",
            text: isLong ? "BUY" : "SELL",
            size: 1.4,
          });
        }
      }
      if (t.xi != null && data[t.xi]) {
        const xTime = Math.floor(data[t.xi].t / 1000);
        if (xTime) {
          markers.push({
            time: xTime,
            position: t.side === "L" ? "aboveBar" : "belowBar",
            color: "#758696",
            shape: "circle",
            text: "EXIT",
            size: 0.9,
          });
        }
      }
    });

    markers.sort((a, b) => a.time - b.time);
    handoffCandleSeries.setMarkers(markers);
    handoffLwChart.timeScale().fitContent();
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
    const span = hi - lo;
    const step = span / 4;
    for (let t = lo; t <= hi; t += step) {
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
  // 7. Terminal Controller
  // --------------------------------------------------------------------------
  function initTerminalLightweightChart() {
    const container = document.getElementById("termChartContainer");
    if (!container || !window.LightweightCharts) return;

    if (termLwChart) {
      try {
        termLwChart.remove();
      } catch (e) {}
      termLwChart = null;
    }

    const colors = getThemeColors();
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 420;

    termLwChart = LightweightCharts.createChart(container, {
      width: w,
      height: h,
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

    termCandleSeries = termLwChart.addCandlestickSeries({
      upColor: colors.bull,
      downColor: colors.bear,
      borderVisible: false,
      wickUpColor: colors.bull,
      wickDownColor: colors.bear,
    });

    termVolumeSeries = termLwChart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    termVolumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    window.addEventListener("resize", () => {
      if (termLwChart && container) {
        termLwChart.applyOptions({
          width: container.clientWidth || 800,
          height: container.clientHeight || 420,
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
    if (!termLwChart) initTerminalLightweightChart();
    if (!termLwChart) return;

    if (termChartTitle) {
      termChartTitle.textContent = `${data.source} — Dynamic Swing Anchored VWAP`;
    }

    termCandleSeries.setData(data.candles);
    termVolumeSeries.setData(data.volumes);

    for (const [, s] of termVwapSeriesMap) {
      termLwChart.removeSeries(s);
    }
    termVwapSeriesMap.clear();

    const segmentMap = new Map();
    for (const pt of data.vwap_points) {
      if (!segmentMap.has(pt.segment_id)) {
        segmentMap.set(pt.segment_id, { dir: pt.dir, points: [] });
      }
      segmentMap.get(pt.segment_id).points.push({ time: pt.time, value: pt.value });
    }

    for (const [segId, seg] of segmentMap) {
      const color = seg.dir > 0 ? "#089981" : "#f23645";
      const lineSeries = termLwChart.addLineSeries({
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(seg.points);
      termVwapSeriesMap.set(segId, lineSeries);
    }

    const markers = (data.anchors || []).map((a) => ({
      time: a.time,
      position: a.position,
      color: a.color,
      shape: a.shape,
      text: a.label,
      size: 1.2,
    }));
    termCandleSeries.setMarkers(markers);
    termLwChart.timeScale().fitContent();

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
      if (termBacktestSummaryBar) termBacktestSummaryBar.style.display = "none";
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
    } else if (state.terminalInspectorTab === "bars") {
      if (termBacktestSummaryBar) termBacktestSummaryBar.style.display = "none";
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
    } else if (state.terminalInspectorTab === "backtest") {
      const rawBars = (data.candles || []).map((c, i) => ({
        t: c.time * 1000,
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: data.volumes && data.volumes[i] ? data.volumes[i].value : 1000,
      }));

      const swings = Engine.computeSwings(rawBars, state.params.len);
      const vw = Engine.computeVWAP(rawBars, swings, state.params.m1, state.params.m2);
      const bt = Engine.backtest(rawBars, vw, state.params);
      const met = Engine.metrics(bt.trades, bt.equity, state.params.capital, "1h");

      if (termBacktestSummaryBar) {
        termBacktestSummaryBar.style.display = "flex";
        termBacktestSummaryBar.innerHTML = `
          <div><strong style="color:var(--text-muted)">Net K/Z:</strong> <span class="${met.net >= 0 ? 'bull-text' : 'bear-text'}" style="font-weight:700">${fm(met.net)} (${met.netPct >= 0 ? '+' : ''}${met.netPct.toFixed(2)}%)</span></div>
          <div><strong style="color:var(--text-muted)">Kazanma:</strong> <span style="font-weight:700">${met.winRate.toFixed(1)}%</span> (${met.wins}K / ${met.losses}Z)</div>
          <div><strong style="color:var(--text-muted)">Profit Factor:</strong> <span style="font-weight:700">${isFinite(met.pf) ? met.pf.toFixed(2) : '∞'}</span></div>
          <div><strong style="color:var(--text-muted)">Maks Düşüş:</strong> <span class="bear-text" style="font-weight:700">−${met.mddPct.toFixed(2)}%</span></div>
          <div><strong style="color:var(--text-muted)">Toplam:</strong> <span style="font-weight:700">${bt.trades.length} İşlem</span></div>
        `;
      }

      termTableHead.innerHTML = `
        <tr>
          <th>#</th>
          <th>Yön</th>
          <th>Giriş Zamanı</th>
          <th>Giriş ($)</th>
          <th>Çıkış Zamanı</th>
          <th>Çıkış ($)</th>
          <th>Neden</th>
          <th>Net K/Z ($)</th>
          <th>Getiri (%)</th>
          <th>Kümülatif ($)</th>
        </tr>
      `;
      termInspectorCount.textContent = `${bt.trades.length} İşlem`;

      let cum = 0;
      termTableBody.innerHTML = bt.trades.map((t, i) => {
        cum += t.pnl;
        const isLong = t.side === "L";
        const isWin = t.pnl >= 0;
        const pos = "bull-text", neg = "bear-text";
        return `
          <tr>
            <td>${i + 1}</td>
            <td><strong class="${isLong ? pos : neg}">${isLong ? "UZUN" : "KISA"}</strong></td>
            <td>${rawBars[t.ei] ? new Date(rawBars[t.ei].t).toLocaleString() : "—"}</td>
            <td>${fp(t.entry)}</td>
            <td>${t.xi != null && rawBars[t.xi] ? new Date(rawBars[t.xi].t).toLocaleString() : "—"}</td>
            <td>${t.exit != null ? fp(t.exit) : "—"}</td>
            <td style="font-family:var(--font-ui)">${t.reason}</td>
            <td><strong class="${isWin ? pos : neg}">${fm(t.pnl)}</strong></td>
            <td class="${isWin ? pos : neg}">${t.pnlPct != null ? (t.pnlPct >= 0 ? "+" : "") + t.pnlPct.toFixed(2) + "%" : "—"}</td>
            <td>${fm(cum)}</td>
          </tr>
        `;
      }).join("") || `<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">İşlem sinyali oluşmadı.</td></tr>`;
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
      
      const c = getThemeColors();
      if (handoffLwChart) {
        handoffLwChart.applyOptions({
          layout: { background: { type: "solid", color: c.bgApp }, textColor: c.textMain },
          grid: { vertLines: { color: c.borderSubtle }, horzLines: { color: c.borderSubtle } },
        });
      }
      if (termLwChart) {
        termLwChart.applyOptions({
          layout: { background: { type: "solid", color: c.bgApp }, textColor: c.textMain },
          grid: { vertLines: { color: c.borderSubtle }, horzLines: { color: c.borderSubtle } },
        });
      }
      drawEquity();
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
        if (id === "overview") drawEquity();
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
      if (termTabInspectorBacktest) termTabInspectorBacktest.classList.remove("active");
      state.terminalInspectorTab = "anchors";
      if (state.terminalData) renderTerminalInspectorTable(state.terminalData);
    });

    termTabInspectorBars.addEventListener("click", () => {
      termTabInspectorBars.classList.add("active");
      termTabInspectorAnchors.classList.remove("active");
      if (termTabInspectorBacktest) termTabInspectorBacktest.classList.remove("active");
      state.terminalInspectorTab = "bars";
      if (state.terminalData) renderTerminalInspectorTable(state.terminalData);
    });

    if (termTabInspectorBacktest) {
      termTabInspectorBacktest.addEventListener("click", () => {
        termTabInspectorBacktest.classList.add("active");
        termTabInspectorAnchors.classList.remove("active");
        termTabInspectorBars.classList.remove("active");
        state.terminalInspectorTab = "backtest";
        if (state.terminalData) renderTerminalInspectorTable(state.terminalData);
      });
    }

    const ro = new ResizeObserver(() => {
      resizeHandoffChart();
      drawEquity();
    });
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
