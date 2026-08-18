/* ==========================================================================
   DSAVWAP (Zeiierman) — Interactive Frontend & Backtest Application Logic
   With Full Support for NAU Project Local Data Provider (Catalog & Bybit)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // State
  let chart = null;
  let candleSeries = null;
  let volumeSeries = null;
  let vwapSeriesMap = new Map(); // segment_id -> lineSeries

  // Backtest Trades Chart (Candles + DSAVWAP + Trade Entry/Exit Markers)
  let btTradesChart = null;
  let btCandleSeries = null;
  let btVolumeSeries = null;
  let btVwapSeriesMap = new Map();

  // Equity Chart
  let equityChart = null;
  let equitySeries = null;
  let benchmarkSeries = null;

  let currentMode = "chart"; // "chart" or "backtest"
  let currentBtChartTab = "paneBtTrades"; // "paneBtTrades" or "paneBtEquity"
  let currentTab = "tab-nau"; // "tab-nau" (default), "tab-ticker", "tab-csv", "tab-synthetic"
  let currentData = null;
  let currentBacktestData = null;
  let uploadedFile = null;

  // NAU Catalog State
  let nauCatalog = null;
  let nauCategory = "equity"; // "equity" or "bybit"

  // DOM Elements
  const container = document.getElementById("tvChartContainer");
  const btTradesContainer = document.getElementById("tvBtTradesChartContainer");
  const equityContainer = document.getElementById("tvEquityChartContainer");

  const chartLoader = document.getElementById("chartLoader");
  const btChartLoader = document.getElementById("btChartLoader");
  const btTradesChartLoader = document.getElementById("btTradesChartLoader");

  const chartHeaderTitle = document.getElementById("chartHeaderTitle");
  const btTradesChartTitle = document.getElementById("btTradesChartTitle");
  const btEquityChartTitle = document.getElementById("btEquityChartTitle");
  const currentTickerName = document.getElementById("currentTickerName");
  const currentTickerResolution = document.getElementById("currentTickerResolution");

  // Mode Switcher
  const btnModeChart = document.getElementById("btnModeChart");
  const btnModeBacktest = document.getElementById("btnModeBacktest");
  const viewChart = document.getElementById("viewChart");
  const viewBacktest = document.getElementById("viewBacktest");
  const backtestSettingsGroup = document.getElementById("backtestSettingsGroup");
  const btnRecalculateText = document.getElementById("btnRecalculateText");

  // Backtest Chart Tabs
  const btnBtTabTrades = document.getElementById("btnBtTabTrades");
  const btnBtTabEquity = document.getElementById("btnBtTabEquity");
  const paneBtTrades = document.getElementById("paneBtTrades");
  const paneBtEquity = document.getElementById("paneBtEquity");

  // NAU Controls
  const btnNauCatEquity = document.getElementById("btnNauCatEquity");
  const btnNauCatBybit = document.getElementById("btnNauCatBybit");
  const nauSymbolSelect = document.getElementById("nauSymbolSelect");
  const nauQuickChips = document.getElementById("nauQuickChips");
  const nauTimeframeSelect = document.getElementById("nauTimeframeSelect");
  const nauLimitBarsSelect = document.getElementById("nauLimitBarsSelect");
  const nauMetaTitle = document.getElementById("nauMetaTitle");
  const nauMetaBadge = document.getElementById("nauMetaBadge");
  const nauMetaDesc = document.getElementById("nauMetaDesc");

  // Yahoo Inputs
  const tickerInput = document.getElementById("tickerInput");
  const periodSelect = document.getElementById("periodSelect");
  const intervalSelect = document.getElementById("intervalSelect");

  // DSAVWAP Param Sliders
  const swingPeriodRange = document.getElementById("swingPeriodRange");
  const valSwingPeriod = document.getElementById("valSwingPeriod");
  const baseAptRange = document.getElementById("baseAptRange");
  const valBaseApt = document.getElementById("valBaseApt");
  const useAdaptToggle = document.getElementById("useAdaptToggle");
  const volBiasRange = document.getElementById("volBiasRange");
  const valVolBias = document.getElementById("valVolBias");
  const volBiasGroup = document.getElementById("volBiasGroup");

  // Backtest Inputs
  const btStrategyType = document.getElementById("btStrategyType");
  const btTradeMode = document.getElementById("btTradeMode");
  const btInitialCapital = document.getElementById("btInitialCapital");
  const btCommission = document.getElementById("btCommission");
  const btStopLoss = document.getElementById("btStopLoss");
  const btTakeProfit = document.getElementById("btTakeProfit");
  const btTrailingStop = document.getElementById("btTrailingStop");

  // Buttons
  const btnRecalculate = document.getElementById("btnRecalculate");
  const btnSearchTicker = document.getElementById("btnSearchTicker");
  const btnGenerateSynthetic = document.getElementById("btnGenerateSynthetic");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnExportTradesCsv = document.getElementById("btnExportTradesCsv");
  const btnThemeToggle = document.getElementById("btnThemeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const btnResetZoom = document.getElementById("btnResetZoom");
  const btnResetBtTradesZoom = document.getElementById("btnResetBtTradesZoom");
  const btnResetEquityZoom = document.getElementById("btnResetEquityZoom");

  // CSV
  const csvDropzone = document.getElementById("csvDropzone");
  const csvFileInput = document.getElementById("csvFileInput");
  const btnSelectFile = document.getElementById("btnSelectFile");
  const selectedFileName = document.getElementById("selectedFileName");

  // Chart Metrics
  const metricPrice = document.getElementById("metricPrice");
  const metricPriceChange = document.getElementById("metricPriceChange");
  const metricVwap = document.getElementById("metricVwap");
  const metricVwapDiff = document.getElementById("metricVwapDiff");
  const metricRegime = document.getElementById("metricRegime");
  const metricRegimeSub = document.getElementById("metricRegimeSub");
  const metricPivotBadge = document.getElementById("metricPivotBadge");
  const metricPivotPrice = document.getElementById("metricPivotPrice");
  const metricTotalSegments = document.getElementById("metricTotalSegments");
  const metricApt = document.getElementById("metricApt");

  // Backtest Metrics
  const btNetProfit = document.getElementById("btNetProfit");
  const btBenchmarkReturn = document.getElementById("btBenchmarkReturn");
  const btWinRate = document.getElementById("btWinRate");
  const btTradesCount = document.getElementById("btTradesCount");
  const btProfitFactor = document.getElementById("btProfitFactor");
  const btWinLossRatio = document.getElementById("btWinLossRatio");
  const btMaxDrawdown = document.getElementById("btMaxDrawdown");
  const btMaxDrawdownUsd = document.getElementById("btMaxDrawdownUsd");
  const btSharpeSortino = document.getElementById("btSharpeSortino");
  const btAvgTrade = document.getElementById("btAvgTrade");

  // Tables
  const countAnchors = document.getElementById("countAnchors");
  const countTrades = document.getElementById("countTrades");
  const anchorsTableBody = document.getElementById("anchorsTableBody");
  const barsTableBody = document.getElementById("barsTableBody");
  const tradesTableBody = document.getElementById("tradesTableBody");

  // --------------------------------------------------------------------------
  // 1. Chart Initializations
  // --------------------------------------------------------------------------
  function getThemeColors() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return {
      bg: isDark ? "#161b22" : "#ffffff",
      textColor: isDark ? "#8b949e" : "#57606a",
      gridColor: isDark ? "#21262d" : "#edf0f2",
    };
  }

  function initChart() {
    if (!window.LightweightCharts || !container) return;
    if (chart) {
      chart.remove();
      chart = null;
    }

    const { bg, textColor, gridColor } = getThemeColors();

    chart = window.LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: bg },
        textColor: textColor,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: gridColor,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: "#089981",
      downColor: "#f23645",
      borderUpColor: "#089981",
      borderDownColor: "#f23645",
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    window.addEventListener("resize", () => {
      if (chart && container) {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
      if (btTradesChart && btTradesContainer) {
        btTradesChart.applyOptions({ width: btTradesContainer.clientWidth, height: btTradesContainer.clientHeight });
      }
      if (equityChart && equityContainer) {
        equityChart.applyOptions({ width: equityContainer.clientWidth, height: equityContainer.clientHeight });
      }
    });
  }

  function initBtTradesChart() {
    if (!window.LightweightCharts || !btTradesContainer) return;
    if (btTradesChart) {
      btTradesChart.remove();
      btTradesChart = null;
    }

    const { bg, textColor, gridColor } = getThemeColors();

    btTradesChart = window.LightweightCharts.createChart(btTradesContainer, {
      width: btTradesContainer.clientWidth || 800,
      height: btTradesContainer.clientHeight || 450,
      layout: {
        background: { color: bg },
        textColor: textColor,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: gridColor,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    btCandleSeries = btTradesChart.addCandlestickSeries({
      upColor: "#089981",
      downColor: "#f23645",
      borderUpColor: "#089981",
      borderDownColor: "#f23645",
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    btVolumeSeries = btTradesChart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
  }

  function initEquityChart() {
    if (!window.LightweightCharts || !equityContainer) return;
    if (equityChart) {
      equityChart.remove();
      equityChart = null;
    }

    const { bg, textColor, gridColor } = getThemeColors();

    equityChart = window.LightweightCharts.createChart(equityContainer, {
      width: equityContainer.clientWidth || 800,
      height: equityContainer.clientHeight || 450,
      layout: {
        background: { color: bg },
        textColor: textColor,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: gridColor,
        autoScale: true,
      },
    });

    equitySeries = equityChart.addLineSeries({
      color: "#2962ff",
      lineWidth: 2,
      title: "DSAVWAP Stratejisi ($)",
    });

    benchmarkSeries = equityChart.addLineSeries({
      color: "#8b949e",
      lineWidth: 1,
      lineStyle: 2,
      title: "Al ve Tut ($)",
    });
  }

  // --------------------------------------------------------------------------
  // 2. NAU Catalog Discovery & UI Rendering
  // --------------------------------------------------------------------------
  async function fetchNauCatalog() {
    try {
      const res = await fetch("/api/nau/catalog");
      if (!res.ok) throw new Error("NAU katalog bilgisi alınamadı");
      nauCatalog = await res.json();
      renderNauControls();
    } catch (err) {
      console.warn("NAU Catalog error:", err);
      if (nauMetaDesc) {
        nauMetaDesc.textContent = "NAU katalog verisi okunamadı: " + err.message;
      }
    }
  }

  function renderNauControls() {
    if (!nauCatalog) return;

    const list = nauCategory === "equity" ? nauCatalog.equities : nauCatalog.bybit;
    if (!list || list.length === 0) {
      nauSymbolSelect.innerHTML = `<option value="">Veri bulunamadı</option>`;
      return;
    }

    // Save previous selection if exists in new list
    const prevSym = nauSymbolSelect.value;
    let selectedItem = list[0];

    // Populate Symbol Select Dropdown
    nauSymbolSelect.innerHTML = "";
    list.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.symbol;
      if (nauCategory === "equity") {
        opt.textContent = `${item.symbol} — (${item.venue || 'NASDAQ'}, ${item.total_bars ? item.total_bars.toLocaleString() + ' Bar' : 'Arşiv'})`;
      } else {
        opt.textContent = `${item.name || item.symbol} — (${item.category.toUpperCase()})`;
      }
      if (item.symbol === prevSym || (nauCategory === "equity" && item.symbol === "NVDA") || (nauCategory === "bybit" && item.symbol === "BTCUSDT")) {
        opt.selected = true;
        selectedItem = item;
      }
      nauSymbolSelect.appendChild(opt);
    });

    // Populate Quick Chips
    nauQuickChips.innerHTML = "";
    const popularSymbols = nauCategory === "equity" 
      ? ["NVDA", "AAPL", "QQQC", "SPY", "TSLA", "AMD", "MSFT", "AMZN"]
      : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT"];

    popularSymbols.forEach((sym) => {
      const exists = list.some((it) => it.symbol === sym);
      if (exists) {
        const chip = document.createElement("span");
        chip.className = `chip ${sym === selectedItem.symbol ? "active" : ""}`;
        chip.textContent = sym.replace("USDT", "");
        chip.dataset.symbol = sym;
        chip.addEventListener("click", () => {
          document.querySelectorAll("#nauQuickChips .chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          nauSymbolSelect.value = sym;
          updateNauTimeframes();
          executeAction();
        });
        nauQuickChips.appendChild(chip);
      }
    });

    updateNauTimeframes();
  }

  function updateNauTimeframes() {
    if (!nauCatalog) return;
    const list = nauCategory === "equity" ? nauCatalog.equities : nauCatalog.bybit;
    const sym = nauSymbolSelect.value;
    const item = list.find((it) => it.symbol === sym) || list[0];

    if (!item) return;

    // Available Timeframes
    const availableTfs = item.timeframes || ["1d", "1h", "15m", "5m", "1m"];
    const currentTf = nauTimeframeSelect.value;

    nauTimeframeSelect.innerHTML = "";
    const tfLabels = {
      "1m": "1 Dakika (1m)",
      "5m": "5 Dakika (5m)",
      "15m": "15 Dakika (15m)",
      "30m": "30 Dakika (30m)",
      "1h": "1 Saat (1h)",
      "4h": "4 Saat (4h)",
      "1d": "1 Gün (1d)",
      "1wk": "1 Hafta (1wk)",
    };

    availableTfs.forEach((tf) => {
      const opt = document.createElement("option");
      opt.value = tf;
      opt.textContent = tfLabels[tf] || tf;
      if (tf === currentTf || (tf === "1h" && !availableTfs.includes(currentTf)) || (tf === "1d" && !availableTfs.includes(currentTf))) {
        opt.selected = true;
      }
      nauTimeframeSelect.appendChild(opt);
    });

    // Update Metadata Card
    if (nauCategory === "equity") {
      nauMetaTitle.textContent = `${item.symbol} (${item.venue || 'NASDAQ'})`;
      nauMetaBadge.textContent = item.adjusted ? "Split-Adjusted" : "Unadjusted";
      nauMetaBadge.style.color = item.adjusted ? "#089981" : "#f23645";
      nauMetaDesc.innerHTML = `<strong>Tarih:</strong> ${item.first_date || 'N/A'} → ${item.last_date || 'N/A'}<br>` +
                              `<strong>Toplam Bar:</strong> ${item.total_bars ? item.total_bars.toLocaleString() : 'N/A'}<br>` +
                              `<strong>Not:</strong> ${item.note || 'Massive / Polygon'}`;
    } else {
      nauMetaTitle.textContent = `${item.symbol} [${(item.category || 'LINEAR').toUpperCase()}]`;
      nauMetaBadge.textContent = "Bybit Kline Cache";
      nauMetaBadge.style.color = "#58a6ff";
      nauMetaDesc.innerHTML = `<strong>Kaynak:</strong> Bybit v5 Kline Arşivi<br>` +
                              `<strong>Kategori:</strong> ${item.category}<br>` +
                              `<strong>Zaman Dilimleri:</strong> ${item.timeframes.join(', ')}`;
    }
  }

  // NAU Category Toggle
  btnNauCatEquity.addEventListener("click", () => {
    nauCategory = "equity";
    btnNauCatEquity.classList.add("active");
    btnNauCatBybit.classList.remove("active");
    renderNauControls();
    executeAction();
  });

  btnNauCatBybit.addEventListener("click", () => {
    nauCategory = "bybit";
    btnNauCatBybit.classList.add("active");
    btnNauCatEquity.classList.remove("active");
    renderNauControls();
    executeAction();
  });

  nauSymbolSelect.addEventListener("change", () => {
    updateNauTimeframes();
    document.querySelectorAll("#nauQuickChips .chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.symbol === nauSymbolSelect.value);
    });
    executeAction();
  });

  nauTimeframeSelect.addEventListener("change", executeAction);
  nauLimitBarsSelect.addEventListener("change", executeAction);

  // --------------------------------------------------------------------------
  // 3. Calculation & Backtest Triggers
  // --------------------------------------------------------------------------
  function executeAction() {
    if (currentMode === "chart") {
      loadChartData();
    } else {
      runBacktest();
    }
  }

  async function loadChartData() {
    chartLoader.classList.add("active");

    const payload = {
      data_source: "nau",
      swing_period: parseInt(swingPeriodRange.value),
      base_apt: parseFloat(baseAptRange.value),
      use_adapt: useAdaptToggle.checked,
      vol_bias: parseFloat(volBiasRange.value),
    };

    try {
      let res;
      if (currentTab === "tab-nau") {
        payload.data_source = "nau";
        payload.nau_symbol = nauSymbolSelect.value || "NVDA";
        payload.nau_timeframe = nauTimeframeSelect.value || "1d";
        payload.nau_category = nauCategory;
        payload.nau_source = nauCategory === "equity" ? "equity_catalog" : "bybit";
        payload.nau_limit_bars = parseInt(nauLimitBarsSelect.value) || 1000;
        payload.use_synthetic = false;

        res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      } else if (currentTab === "tab-csv" && uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("swing_period", payload.swing_period);
        formData.append("base_apt", payload.base_apt);
        formData.append("use_adapt", payload.use_adapt);
        formData.append("vol_bias", payload.vol_bias);

        res = await fetch("/api/upload", { method: "POST", body: formData });

      } else if (currentTab === "tab-synthetic") {
        payload.data_source = "synthetic";
        payload.use_synthetic = true;
        res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      } else {
        // Live Yahoo Ticker
        payload.data_source = "yahoo";
        payload.ticker = tickerInput.value.trim() || "BTC-USD";
        payload.period = periodSelect.value;
        payload.interval = intervalSelect.value;
        payload.use_synthetic = false;

        res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Veri yüklenirken hata oluştu");
      }

      const data = await res.json();
      currentData = data;
      renderChartDashboard(data);

    } catch (err) {
      alert("Hata: " + err.message);
      console.error(err);
    } finally {
      chartLoader.classList.remove("active");
    }
  }

  async function runBacktest() {
    if (btChartLoader) btChartLoader.classList.add("active");
    if (btTradesChartLoader) btTradesChartLoader.classList.add("active");

    const payload = {
      data_source: "nau",
      swing_period: parseInt(swingPeriodRange.value),
      base_apt: parseFloat(baseAptRange.value),
      use_adapt: useAdaptToggle.checked,
      vol_bias: parseFloat(volBiasRange.value),
      strategy_type: btStrategyType.value,
      trade_mode: btTradeMode.value,
      initial_capital: parseFloat(btInitialCapital.value) || 10000.0,
      position_size_pct: 100.0,
      stop_loss_pct: btStopLoss.value ? parseFloat(btStopLoss.value) : null,
      take_profit_pct: btTakeProfit.value ? parseFloat(btTakeProfit.value) : null,
      trailing_stop_pct: btTrailingStop.value ? parseFloat(btTrailingStop.value) : null,
      commission_pct: parseFloat(btCommission.value) || 0.05,
      pullback_threshold_pct: 1.0,
    };

    if (currentTab === "tab-nau") {
      payload.data_source = "nau";
      payload.nau_symbol = nauSymbolSelect.value || "NVDA";
      payload.nau_timeframe = nauTimeframeSelect.value || "1d";
      payload.nau_category = nauCategory;
      payload.nau_source = nauCategory === "equity" ? "equity_catalog" : "bybit";
      payload.nau_limit_bars = parseInt(nauLimitBarsSelect.value) || 2500;
      payload.use_synthetic = false;
    } else if (currentTab === "tab-synthetic") {
      payload.data_source = "synthetic";
      payload.use_synthetic = true;
    } else {
      payload.data_source = "yahoo";
      payload.ticker = tickerInput.value.trim() || "BTC-USD";
      payload.period = periodSelect.value;
      payload.interval = intervalSelect.value;
      payload.use_synthetic = false;
    }

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Backtest çalıştırılırken hata oluştu");
      }

      const data = await res.json();
      currentBacktestData = data;
      renderBacktestDashboard(data);

    } catch (err) {
      alert("Backtest Hatası: " + err.message);
      console.error(err);
    } finally {
      if (btChartLoader) btChartLoader.classList.remove("active");
      if (btTradesChartLoader) btTradesChartLoader.classList.remove("active");
    }
  }

  // --------------------------------------------------------------------------
  // 4. Render Functions
  // --------------------------------------------------------------------------
  function renderChartDashboard(data) {
    if (!chart) initChart();

    chartHeaderTitle.textContent = `${data.source} — Dynamic Swing Anchored VWAP`;
    
    if (currentTab === "tab-nau") {
      currentTickerName.textContent = `NAU · ${nauSymbolSelect.value || 'NVDA'}`;
      currentTickerResolution.textContent = `${nauTimeframeSelect.value} · ${data.total_bars} Bar`;
    } else if (currentTab === "tab-ticker") {
      currentTickerName.textContent = tickerInput.value.toUpperCase();
      currentTickerResolution.textContent = `${periodSelect.value} · ${intervalSelect.value}`;
    } else if (currentTab === "tab-csv") {
      currentTickerName.textContent = "CSV Dosyası";
      currentTickerResolution.textContent = `${data.total_bars} Bar`;
    } else {
      currentTickerName.textContent = "Simülasyon";
      currentTickerResolution.textContent = "300 Bar";
    }

    candleSeries.setData(data.candles);
    volumeSeries.setData(data.volumes);

    for (const [, s] of vwapSeriesMap) {
      chart.removeSeries(s);
    }
    vwapSeriesMap.clear();

    const segmentMap = new Map();
    for (const pt of data.vwap_points) {
      if (!segmentMap.has(pt.segment_id)) {
        segmentMap.set(pt.segment_id, { dir: pt.dir, points: [] });
      }
      segmentMap.get(pt.segment_id).points.push({ time: pt.time, value: pt.value });
    }

    for (const [segId, seg] of segmentMap) {
      const color = seg.dir > 0 ? "#089981" : "#f23645";
      const lineSeries = chart.addLineSeries({
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(seg.points);
      vwapSeriesMap.set(segId, lineSeries);
    }

    const markers = data.anchors.map((a) => ({
      time: a.time,
      position: a.position,
      color: a.color,
      shape: a.shape,
      text: a.label,
      size: 1.2,
    }));
    candleSeries.setMarkers(markers);

    chart.timeScale().fitContent();

    // Metrics
    const m = data.metrics;
    metricPrice.textContent = `$${m.latest_close.toLocaleString()}`;
    metricPriceChange.textContent = `${m.price_change_pct >= 0 ? "+" : ""}${m.price_change_pct}%`;
    metricPriceChange.className = `metric-sub ${m.price_change_pct >= 0 ? "bullish" : "bearish"}`;

    metricVwap.textContent = `$${m.latest_vwap.toLocaleString()}`;
    metricVwapDiff.textContent = `${m.vwap_diff_pct >= 0 ? "+" : ""}${m.vwap_diff_pct}% Fark`;
    metricVwapDiff.className = `metric-sub ${m.vwap_diff_pct >= 0 ? "bullish" : "bearish"}`;

    metricRegime.textContent = m.regime === "BULLISH" ? "BOĞA / YÜKSELİŞ" : "AYI / DÜŞÜŞ";
    metricRegime.className = `metric-value ${m.current_dir > 0 ? "bullish" : "bearish"}`;
    metricRegimeSub.textContent = m.current_dir > 0 ? "Re-Anchor: Dip Pivot" : "Re-Anchor: Tepe Pivot";

    metricPivotBadge.textContent = m.last_anchor_label;
    metricPivotBadge.className = `badge-pivot ${m.last_anchor_label.includes("H") ? "badge-high" : "badge-low"}`;
    metricPivotPrice.textContent = `$${m.last_anchor_price.toLocaleString()}`;

    metricTotalSegments.textContent = m.total_segments;
    metricApt.textContent = `${m.current_apt} Bar`;

    // Populate Inspector Tables
    countAnchors.textContent = `${data.anchors.length} Adet`;
    anchorsTableBody.innerHTML = "";
    data.anchors.slice().reverse().forEach((a) => {
      const row = document.createElement("tr");
      const dtStr = new Date(a.time * 1000).toLocaleString();
      const isHigh = a.label.includes("H");
      row.innerHTML = `
        <td><span class="badge-pivot ${isHigh ? "badge-high" : "badge-low"}">${a.label}</span></td>
        <td><strong>$${a.price.toLocaleString()}</strong></td>
        <td>${dtStr}</td>
        <td>#${a.bar_index}</td>
        <td>#${a.segment_id}</td>
        <td><span class="regime-tag ${a.dir > 0 ? "bull" : "bear"}">${a.dir > 0 ? "BOĞA" : "AYI"}</span></td>
      `;
      anchorsTableBody.appendChild(row);
    });

    barsTableBody.innerHTML = "";
    const nBars = data.candles.length;
    const vwapLookup = new Map(data.vwap_points.map((v) => [v.time, v]));
    for (let i = nBars - 1; i >= Math.max(0, nBars - 100); i--) {
      const c = data.candles[i];
      const dtStr = new Date(c.time * 1000).toLocaleString();
      const v = vwapLookup.get(c.time);
      const vwapVal = v ? `$${v.value.toFixed(2)}` : "—";
      const dirTag = v ? (v.dir > 0 ? '<span class="regime-tag bull">BOĞA</span>' : '<span class="regime-tag bear">AYI</span>') : "—";
      const aptVal = v ? v.apt : "—";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dtStr}</td>
        <td>$${c.open.toFixed(2)}</td>
        <td>$${c.high.toFixed(2)}</td>
        <td>$${c.low.toFixed(2)}</td>
        <td><strong>$${c.close.toFixed(2)}</strong></td>
        <td>${data.volumes[i].value.toLocaleString()}</td>
        <td><strong style="color: ${v && v.dir > 0 ? '#089981' : '#f23645'}">${vwapVal}</strong></td>
        <td>${dirTag}</td>
        <td>${aptVal}</td>
      `;
      barsTableBody.appendChild(row);
    }
  }

  function renderBacktestDashboard(data) {
    if (!btTradesChart) initBtTradesChart();
    if (!equityChart) initEquityChart();

    const chartData = data.chart;
    const bt = data.backtest;

    btTradesChartTitle.textContent = `${data.source} — DSAVWAP İşlem Giriş & Çıkış Noktaları`;
    btEquityChartTitle.textContent = `${data.source} — Portföy Getiri Eğrisi vs Al & Tut Benchmark`;

    // Render Candlesticks and DSAVWAP on Trades Chart
    btCandleSeries.setData(chartData.candles);
    btVolumeSeries.setData(chartData.volumes);

    for (const [, s] of btVwapSeriesMap) {
      btTradesChart.removeSeries(s);
    }
    btVwapSeriesMap.clear();

    const segmentMap = new Map();
    for (const pt of chartData.vwap_points) {
      if (!segmentMap.has(pt.segment_id)) {
        segmentMap.set(pt.segment_id, { dir: pt.dir, points: [] });
      }
      segmentMap.get(pt.segment_id).points.push({ time: pt.time, value: pt.value });
    }

    for (const [segId, seg] of segmentMap) {
      const color = seg.dir > 0 ? "#089981" : "#f23645";
      const lineSeries = btTradesChart.addLineSeries({
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(seg.points);
      btVwapSeriesMap.set(segId, lineSeries);
    }

    // Safe formatting helpers
    const n = (v, d = 2) => (v != null && !isNaN(Number(v)) ? Number(v).toFixed(d) : "0.00");
    const loc = (v, d = 2) => (v != null && !isNaN(Number(v)) ? Number(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "0.00");

    // Trade Entry & Exit Markers
    const tradeMarkers = [];
    (bt.trades || []).forEach((t) => {
      const isLong = t.direction === "LONG";
      const isWin = Number(t.pnl || 0) >= 0;
      const pnlPct = Number(t.pnl_pct || 0);

      tradeMarkers.push({
        time: t.entry_time,
        position: isLong ? "belowBar" : "aboveBar",
        color: isLong ? "#089981" : "#f23645",
        shape: isLong ? "arrowUp" : "arrowDown",
        text: `GİRİŞ: ${t.direction}`,
        size: 1.3,
      });

      tradeMarkers.push({
        time: t.exit_time,
        position: isLong ? "aboveBar" : "belowBar",
        color: isWin ? "#089981" : "#f23645",
        shape: "circle",
        text: `ÇIKIŞ: ${isWin ? '+' : ''}${n(pnlPct, 1)}% (${t.exit_reason || ''})`,
        size: 1.1,
      });
    });

    tradeMarkers.sort((a, b) => a.time - b.time);
    btCandleSeries.setMarkers(tradeMarkers);
    btTradesChart.timeScale().fitContent();

    // Render Equity Curves
    if (bt.equity_curve && bt.equity_curve.length > 0) {
      equitySeries.setData(
        bt.equity_curve.map((e) => ({ time: e.time, value: e.equity }))
      );
      benchmarkSeries.setData(
        bt.equity_curve.map((e) => ({ time: e.time, value: e.benchmark }))
      );
      equityChart.timeScale().fitContent();
    }

    // Backtest KPI Cards
    const netProfit = Number(bt.net_profit || 0);
    const netProfitPct = Number(bt.net_profit_pct || 0);
    const isProfit = netProfit >= 0;
    btNetProfit.textContent = `${isProfit ? "+" : ""}$${loc(netProfit, 2)} (${isProfit ? "+" : ""}${n(netProfitPct, 2)}%)`;
    btNetProfit.className = `metric-value ${isProfit ? "bullish" : "bearish"}`;

    const bchReturn = Number(bt.benchmark_return_pct || 0);
    const isBchProfit = bchReturn >= 0;
    btBenchmarkReturn.textContent = `${isBchProfit ? "+" : ""}${n(bchReturn, 2)}% Al & Tut`;
    btBenchmarkReturn.className = `metric-sub ${isBchProfit ? "bullish" : "bearish"}`;

    btWinRate.textContent = `${n(bt.win_rate_pct, 1)}%`;
    btTradesCount.textContent = `${bt.total_trades || 0} İşlem (${bt.winning_trades || 0} Kazanç / ${bt.losing_trades || 0} Kayıp)`;

    const pf = Number(bt.profit_factor || 0);
    btProfitFactor.textContent = pf > 0 ? (pf >= 999 ? "∞ (Kayıpsız)" : n(pf, 2)) : "0.00";
    btWinLossRatio.textContent = `Kazanç/Kayıp: ${n(bt.win_loss_ratio, 2)}`;

    btMaxDrawdown.textContent = `-${n(bt.max_drawdown_pct, 2)}%`;
    btMaxDrawdownUsd.textContent = `-$${loc(bt.max_drawdown_usd, 2)}`;

    btSharpeSortino.textContent = `${n(bt.sharpe_ratio, 2)} / ${n(bt.sortino_ratio, 2)}`;
    const avgTradePct = Number(bt.avg_trade_pnl_pct || 0);
    btAvgTrade.textContent = `${avgTradePct >= 0 ? "+" : ""}${n(avgTradePct, 2)}% Ort. İşlem`;

    // Populate Backtest Trades Table
    countTrades.textContent = `${bt.total_trades || 0} İşlem`;
    tradesTableBody.innerHTML = "";
    (bt.trades || []).slice().reverse().forEach((t) => {
      const row = document.createElement("tr");
      const isWin = Number(t.pnl || 0) >= 0;
      const isLong = t.direction === "LONG";
      const entryDt = t.entry_time ? new Date(t.entry_time * 1000).toLocaleString() : "—";
      const exitDt = t.exit_time ? new Date(t.exit_time * 1000).toLocaleString() : "—";

      row.innerHTML = `
        <td>#${t.trade_id || ''}</td>
        <td><span class="regime-tag ${isLong ? "bull" : "bear"}">${t.direction || ''}</span></td>
        <td>${entryDt}</td>
        <td><strong>$${loc(t.entry_price, 2)}</strong></td>
        <td>${exitDt}</td>
        <td><strong>$${loc(t.exit_price, 2)}</strong></td>
        <td class="${isWin ? "bullish" : "bearish"}"><strong>${isWin ? "+" : ""}$${loc(t.pnl, 2)}</strong></td>
        <td class="${isWin ? "bullish" : "bearish"}"><strong>${isWin ? "+" : ""}${n(t.pnl_pct, 2)}%</strong></td>
        <td><span class="badge-tag">${t.exit_reason || ''}</span></td>
        <td>${t.bars_held || 0} bar</td>
      `;
      tradesTableBody.appendChild(row);
    });
  }

  // --------------------------------------------------------------------------
  // 5. UI Event Handlers
  // --------------------------------------------------------------------------

  // Mode Switcher (Chart vs Backtest)
  btnModeChart.addEventListener("click", () => {
    currentMode = "chart";
    btnModeChart.classList.add("active");
    btnModeBacktest.classList.remove("active");
    viewChart.classList.add("active");
    viewBacktest.classList.remove("active");
    backtestSettingsGroup.style.display = "none";
    btnRecalculateText.textContent = "Hesapla ve Grafiği Güncelle";

    setTimeout(() => {
      if (chart && container) {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
        chart.timeScale().fitContent();
      }
    }, 50);
  });

  btnModeBacktest.addEventListener("click", () => {
    currentMode = "backtest";
    btnModeBacktest.classList.add("active");
    btnModeChart.classList.remove("active");
    viewBacktest.classList.add("active");
    viewChart.classList.remove("active");
    backtestSettingsGroup.style.display = "block";
    btnRecalculateText.textContent = "Strateji Backtestini Çalıştır";

    setTimeout(() => {
      if (currentBtChartTab === "paneBtTrades" && btTradesChart && btTradesContainer) {
        btTradesChart.applyOptions({ width: btTradesContainer.clientWidth, height: btTradesContainer.clientHeight });
        btTradesChart.timeScale().fitContent();
      } else if (currentBtChartTab === "paneBtEquity" && equityChart && equityContainer) {
        equityChart.applyOptions({ width: equityContainer.clientWidth, height: equityContainer.clientHeight });
        equityChart.timeScale().fitContent();
      }
    }, 50);

    if (!currentBacktestData) {
      runBacktest();
    }
  });

  // Backtest Chart Tabs (Trades Chart vs Equity Curve)
  btnBtTabTrades.addEventListener("click", () => {
    currentBtChartTab = "paneBtTrades";
    btnBtTabTrades.classList.add("active");
    btnBtTabEquity.classList.remove("active");
    paneBtTrades.classList.add("active");
    paneBtEquity.classList.remove("active");

    setTimeout(() => {
      if (btTradesChart && btTradesContainer) {
        btTradesChart.applyOptions({ width: btTradesContainer.clientWidth, height: btTradesContainer.clientHeight });
        btTradesChart.timeScale().fitContent();
      }
    }, 50);
  });

  btnBtTabEquity.addEventListener("click", () => {
    currentBtChartTab = "paneBtEquity";
    btnBtTabEquity.classList.add("active");
    btnBtTabTrades.classList.remove("active");
    paneBtEquity.classList.add("active");
    paneBtTrades.classList.remove("active");

    setTimeout(() => {
      if (equityChart && equityContainer) {
        equityChart.applyOptions({ width: equityContainer.clientWidth, height: equityContainer.clientHeight });
        equityChart.timeScale().fitContent();
      }
    }, 50);
  });

  // Sliders binding
  swingPeriodRange.addEventListener("input", () => {
    valSwingPeriod.textContent = swingPeriodRange.value;
  });

  baseAptRange.addEventListener("input", () => {
    valBaseApt.textContent = baseAptRange.value;
  });

  volBiasRange.addEventListener("input", () => {
    valVolBias.textContent = parseFloat(volBiasRange.value).toFixed(1);
  });

  useAdaptToggle.addEventListener("change", () => {
    if (useAdaptToggle.checked) {
      volBiasRange.removeAttribute("disabled");
      volBiasGroup.style.opacity = "1";
    } else {
      volBiasRange.setAttribute("disabled", "true");
      volBiasGroup.style.opacity = "0.5";
    }
  });

  // Source Tabs
  document.querySelectorAll(".source-tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".source-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      document.getElementById(currentTab).classList.add("active");
      executeAction();
    });
  });

  // Quick Chips in Live Ticker tab
  document.querySelectorAll("#tab-ticker .quick-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#tab-ticker .quick-chips .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      tickerInput.value = chip.dataset.symbol;
      executeAction();
    });
  });

  // Search & Recalculate
  btnSearchTicker.addEventListener("click", executeAction);
  btnRecalculate.addEventListener("click", executeAction);
  tickerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") executeAction();
  });

  periodSelect.addEventListener("change", executeAction);
  intervalSelect.addEventListener("change", executeAction);

  btnGenerateSynthetic.addEventListener("click", () => {
    currentTab = "tab-synthetic";
    executeAction();
  });

  // CSV Drag and Drop
  csvDropzone.addEventListener("click", () => csvFileInput.click());
  btnSelectFile.addEventListener("click", (e) => {
    e.stopPropagation();
    csvFileInput.click();
  });

  csvFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      uploadedFile = e.target.files[0];
      selectedFileName.textContent = `Seçilen: ${uploadedFile.name}`;
      executeAction();
    }
  });

  csvDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    csvDropzone.classList.add("dragover");
  });

  csvDropzone.addEventListener("dragleave", () => {
    csvDropzone.classList.remove("dragover");
  });

  csvDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    csvDropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      uploadedFile = e.dataTransfer.files[0];
      selectedFileName.textContent = `Seçilen: ${uploadedFile.name}`;
      executeAction();
    }
  });

  // Inspector Tabs (Bottom)
  document.querySelectorAll(".inspector-tabs .insp-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!tab.dataset.target) return;
      document.querySelectorAll(".inspector-tabs .insp-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".insp-pane").forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  // Reset Zoom Buttons
  btnResetZoom.addEventListener("click", () => {
    if (chart) chart.timeScale().fitContent();
  });

  if (btnResetBtTradesZoom) {
    btnResetBtTradesZoom.addEventListener("click", () => {
      if (btTradesChart) btTradesChart.timeScale().fitContent();
    });
  }

  if (btnResetEquityZoom) {
    btnResetEquityZoom.addEventListener("click", () => {
      if (equityChart) equityChart.timeScale().fitContent();
    });
  }

  // Theme Toggle
  btnThemeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);

    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", nextTheme === "light" ? "moon" : "sun");
      if (window.lucide) window.lucide.createIcons();
    }

    const isDark = nextTheme !== "light";
    const colors = {
      layout: {
        background: { color: isDark ? "#161b22" : "#ffffff" },
        textColor: isDark ? "#8b949e" : "#57606a",
      },
      grid: {
        vertLines: { color: isDark ? "#21262d" : "#edf0f2" },
        horzLines: { color: isDark ? "#21262d" : "#edf0f2" },
      },
    };

    if (chart) chart.applyOptions(colors);
    if (btTradesChart) btTradesChart.applyOptions(colors);
    if (equityChart) equityChart.applyOptions(colors);
  });

  // Export CSV
  btnExportCsv.addEventListener("click", () => {
    if (!currentData || !currentData.candles) {
      alert("Henüz dışa aktarılacak veri yok");
      return;
    }

    const candles = currentData.candles;
    const vwaps = currentData.vwap_points || [];
    const vwapLookup = new Map(vwaps.map((v) => [v.time, v]));

    let csvContent = "datetime,open,high,low,close,volume,dsavwap,dir,segment_id,apt\n";

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const dt = new Date(c.time * 1000).toISOString();
      const v = vwapLookup.get(c.time);
      const vwapVal = v ? v.value : "";
      const dirVal = v ? v.dir : "";
      const segVal = v ? v.segment_id : "";
      const aptVal = v ? v.apt : "";
      const volVal = currentData.volumes[i] ? currentData.volumes[i].value : 0;

      csvContent += `${dt},${c.open},${c.high},${c.low},${c.close},${volVal},${vwapVal},${dirVal},${segVal},${aptVal}\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dsavwap_${currentTickerName.textContent.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Export Trades CSV
  if (btnExportTradesCsv) {
    btnExportTradesCsv.addEventListener("click", () => {
      if (!currentBacktestData || !currentBacktestData.backtest || !currentBacktestData.backtest.trades) {
        alert("Henüz dışa aktarılacak backtest işlemi yok");
        return;
      }

      const trades = currentBacktestData.backtest.trades;
      let csvContent = "trade_id,entry_time,exit_time,direction,entry_price,exit_price,size,pnl_usd,pnl_pct,commission,exit_reason,bars_held\n";

      for (const t of trades) {
        const entryStr = new Date(t.entry_time * 1000).toISOString();
        const exitStr = new Date(t.exit_time * 1000).toISOString();
        csvContent += `${t.trade_id},${entryStr},${exitStr},${t.direction},${t.entry_price},${t.exit_price},${t.size},${t.pnl},${t.pnl_pct},${t.commission},${t.exit_reason},${t.bars_held}\n`;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `dsavwap_backtest_trades_${currentTickerName.textContent.toLowerCase().replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Initial Load: Discover NAU Catalog and Render First Chart
  initChart();
  fetchNauCatalog().then(() => {
    loadChartData();
  });
});
