/* ==========================================================================
   DSAVWAP (Zeiierman) — Interactive Frontend & Backtest Application Logic
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

  let equityChart = null;
  let equitySeries = null;
  let benchmarkSeries = null;

  let currentMode = "chart"; // "chart" or "backtest"
  let currentTab = "tab-ticker"; // "tab-ticker", "tab-csv", "tab-synthetic"
  let currentData = null;
  let currentBacktestData = null;
  let uploadedFile = null;

  // DOM Elements
  const container = document.getElementById("tvChartContainer");
  const equityContainer = document.getElementById("tvEquityChartContainer");
  const chartLoader = document.getElementById("chartLoader");
  const btChartLoader = document.getElementById("btChartLoader");
  const chartHeaderTitle = document.getElementById("chartHeaderTitle");
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

  // Inputs
  const tickerInput = document.getElementById("tickerInput");
  const periodSelect = document.getElementById("periodSelect");
  const intervalSelect = document.getElementById("intervalSelect");
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
    if (!window.LightweightCharts) return;
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
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: "#089981",
      downColor: "#f23645",
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    vwapSeriesMap.clear();
  }

  function initEquityChart() {
    if (!window.LightweightCharts || !equityContainer) return;
    if (equityChart) {
      equityChart.remove();
      equityChart = null;
    }

    const { bg, textColor, gridColor } = getThemeColors();

    equityChart = window.LightweightCharts.createChart(equityContainer, {
      width: equityContainer.clientWidth,
      height: equityContainer.clientHeight,
      layout: {
        background: { color: bg },
        textColor: textColor,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Equity curve (Green area)
    equitySeries = equityChart.addAreaSeries({
      topColor: "rgba(8, 153, 129, 0.4)",
      bottomColor: "rgba(8, 153, 129, 0.0)",
      lineColor: "#089981",
      lineWidth: 2.5,
      priceLineVisible: true,
    });

    // Benchmark curve (Blue line)
    benchmarkSeries = equityChart.addLineSeries({
      color: "#2962ff",
      lineWidth: 2,
      lineStyle: window.LightweightCharts.LineStyle.Dotted,
      priceLineVisible: false,
    });
  }

  function handleResize() {
    if (chart && container) {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    }
    if (equityChart && equityContainer) {
      equityChart.applyOptions({ width: equityContainer.clientWidth, height: equityContainer.clientHeight });
    }
  }

  window.addEventListener("resize", handleResize);

  // --------------------------------------------------------------------------
  // 2. Data Fetching & Execution
  // --------------------------------------------------------------------------
  async function executeAction() {
    if (currentMode === "backtest") {
      await runBacktest();
    } else {
      await loadChartData();
    }
  }

  async function loadChartData() {
    chartLoader.classList.add("active");

    const payload = {
      swing_period: parseInt(swingPeriodRange.value),
      base_apt: parseFloat(baseAptRange.value),
      use_adapt: useAdaptToggle.checked,
      vol_bias: parseFloat(volBiasRange.value),
    };

    try {
      let res;
      if (currentTab === "tab-csv" && uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("swing_period", payload.swing_period);
        formData.append("base_apt", payload.base_apt);
        formData.append("use_adapt", payload.use_adapt);
        formData.append("vol_bias", payload.vol_bias);

        res = await fetch("/api/upload", { method: "POST", body: formData });
      } else if (currentTab === "tab-synthetic") {
        payload.use_synthetic = true;
        res = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
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
    btChartLoader.classList.add("active");

    const payload = {
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

    if (currentTab === "tab-synthetic") {
      payload.use_synthetic = true;
    } else {
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
      btChartLoader.classList.remove("active");
    }
  }

  // --------------------------------------------------------------------------
  // 3. Render Functions
  // --------------------------------------------------------------------------
  function renderChartDashboard(data) {
    if (!chart) initChart();

    chartHeaderTitle.textContent = `${data.source} — Dynamic Swing Anchored VWAP`;
    currentTickerName.textContent = (currentTab === "tab-ticker" ? tickerInput.value.toUpperCase() : (currentTab === "tab-csv" ? "CSV" : "Simülasyon"));
    currentTickerResolution.textContent = `${periodSelect.value} · ${intervalSelect.value}`;

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
    metricPriceChange.className = `metric-sub ${m.price_change_pct >= 0 ? "text-bull" : "text-bear"}`;

    metricVwap.textContent = `$${m.latest_vwap.toLocaleString()}`;
    metricVwapDiff.textContent = `${m.vwap_diff_pct >= 0 ? "+" : ""}${m.vwap_diff_pct}% Fark`;
    metricVwapDiff.className = `metric-sub ${m.vwap_diff_pct >= 0 ? "text-bull" : "text-bear"}`;

    metricRegime.textContent = m.regime;
    metricRegime.className = `metric-badge ${m.current_dir < 0 ? "bearish" : ""}`;
    metricRegimeSub.textContent = `Trend Yönü: ${m.current_dir > 0 ? "+1 (Boğa)" : "-1 (Ayı)"}`;

    metricPivotBadge.textContent = m.last_anchor_label;
    metricPivotBadge.className = `pivot-badge ${m.last_anchor_label.includes("H") ? "high" : ""}`;
    metricPivotPrice.textContent = `$${m.last_anchor_price.toLocaleString()}`;
    metricTotalSegments.textContent = `Toplam Segment: ${m.total_segments}`;
    metricApt.textContent = `${m.current_apt} bar`;

    countAnchors.textContent = data.anchors.length;
    renderAnchorsTable(data.anchors);
    renderBarsTable(data);
  }

  function renderBacktestDashboard(data) {
    if (!equityChart) initEquityChart();

    const bt = data.backtest;
    btEquityChartTitle.textContent = `${data.source} — Equity Curve vs Buy & Hold (${bt.total_trades} İşlem)`;
    currentTickerName.textContent = (currentTab === "tab-ticker" ? tickerInput.value.toUpperCase() : (currentTab === "tab-csv" ? "CSV" : "Simülasyon"));
    currentTickerResolution.textContent = `${periodSelect.value} · ${intervalSelect.value}`;

    // KPI Cards
    const isProfit = bt.net_profit >= 0;
    btNetProfit.textContent = `$${bt.net_profit.toLocaleString()} (${isProfit ? "+" : ""}${bt.net_profit_pct}%)`;
    btNetProfit.className = `metric-value font-mono ${isProfit ? "text-bull" : "text-bear"}`;
    btBenchmarkReturn.textContent = `Buy & Hold: ${bt.benchmark_return_pct >= 0 ? "+" : ""}${bt.benchmark_return_pct}%`;

    btWinRate.textContent = `${bt.win_rate_pct}%`;
    btWinRate.className = `metric-value font-mono ${bt.win_rate_pct >= 50 ? "text-bull" : "text-bear"}`;
    btTradesCount.textContent = `${bt.winning_trades} Kazanan / ${bt.losing_trades} Kaybeden (${bt.total_trades} Toplam)`;

    btProfitFactor.textContent = bt.profit_factor >= 999 ? "∞" : bt.profit_factor.toFixed(2);
    btWinLossRatio.textContent = `Kazanç/Kayıp Oranı: ${bt.win_loss_ratio.toFixed(2)}`;

    btMaxDrawdown.textContent = `-${bt.max_drawdown_pct}%`;
    btMaxDrawdownUsd.textContent = `Düşüş Tutarı: -$${bt.max_drawdown_usd.toLocaleString()}`;

    btSharpeSortino.textContent = `${bt.sharpe_ratio.toFixed(2)} / ${bt.sortino_ratio.toFixed(2)}`;
    btAvgTrade.textContent = `Ort. İşlem: ${bt.avg_trade_pnl_pct >= 0 ? "+" : ""}${bt.avg_trade_pnl_pct}%`;

    // Equity Curve Chart
    const eqData = bt.equity_curve.map((e) => ({ time: e.time, value: e.equity }));
    const benchData = bt.equity_curve.map((e) => ({ time: e.time, value: e.benchmark }));

    equitySeries.setData(eqData);
    benchmarkSeries.setData(benchData);
    equityChart.timeScale().fitContent();

    // Trade Log Table
    countTrades.textContent = bt.trades.length;
    renderTradesTable(bt.trades);
  }

  function renderAnchorsTable(anchors) {
    if (!anchors || anchors.length === 0) {
      anchorsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Re-anchor pivot noktası bulunamadı.</td></tr>';
      return;
    }

    anchorsTableBody.innerHTML = anchors
      .map((a) => {
        const dateStr = new Date(a.time * 1000).toLocaleString("tr-TR");
        const dirClass = a.dir > 0 ? "text-bull" : "text-bear";
        const dirLabel = a.dir > 0 ? "+1 (Boğa / Dip Anchor)" : "-1 (Ayı / Tepe Anchor)";
        const desc = a.label === "HH" ? "Yüksek Tepe (Higher High)" :
                     a.label === "LH" ? "Düşük Tepe (Lower High)" :
                     a.label === "LL" ? "Düşük Dip (Lower Low)" : "Yüksek Dip (Higher Low)";

        return `
          <tr>
            <td>${dateStr}</td>
            <td><span class="badge-mini ${a.label.includes('H') ? 'badge-hh' : 'badge-ll'}">${a.label}</span></td>
            <td><strong>$${a.price.toLocaleString()}</strong></td>
            <td class="${dirClass}">${dirLabel}</td>
            <td>${a.segment_id}</td>
            <td class="text-muted">${desc}</td>
          </tr>
        `;
      })
      .reverse()
      .join("");
  }

  function renderBarsTable(data) {
    const candles = data.candles || [];
    const vwaps = data.vwap_points || [];
    const vwapLookup = new Map(vwaps.map((v) => [v.time, v]));
    const recentCandles = candles.slice(-50).reverse();

    barsTableBody.innerHTML = recentCandles
      .map((c) => {
        const dateStr = new Date(c.time * 1000).toLocaleDateString("tr-TR");
        const v = vwapLookup.get(c.time);
        const vwapVal = v ? `$${v.value.toFixed(2)}` : "-";
        const dirVal = v ? (v.dir > 0 ? '<span class="text-bull">+1</span>' : '<span class="text-bear">-1</span>') : "-";
        const segVal = v ? v.segment_id : "-";
        const aptVal = v ? `${v.apt}` : "-";

        return `
          <tr>
            <td>${dateStr}</td>
            <td>${c.open.toFixed(2)}</td>
            <td>${c.high.toFixed(2)}</td>
            <td>${c.low.toFixed(2)}</td>
            <td><strong>${c.close.toFixed(2)}</strong></td>
            <td>${c.close >= c.open ? '<span class="text-bull">▲</span>' : '<span class="text-bear">▼</span>'}</td>
            <td class="font-mono text-bull">${vwapVal}</td>
            <td>${dirVal}</td>
            <td>${segVal}</td>
            <td>${aptVal}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderTradesTable(trades) {
    if (!trades || trades.length === 0) {
      tradesTableBody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">İşlem gerçekleşmedi.</td></tr>';
      return;
    }

    tradesTableBody.innerHTML = trades
      .map((t) => {
        const entryStr = new Date(t.entry_time * 1000).toLocaleDateString("tr-TR");
        const exitStr = new Date(t.exit_time * 1000).toLocaleDateString("tr-TR");
        const isWin = t.pnl > 0;
        const dirBadge = t.direction === "LONG" ? '<span class="badge-trade long">LONG</span>' : '<span class="badge-trade short">SHORT</span>';
        const pnlClass = isWin ? "text-bull" : "text-bear";

        return `
          <tr>
            <td>${t.trade_id}</td>
            <td>${entryStr}</td>
            <td>${exitStr}</td>
            <td>${dirBadge}</td>
            <td>$${t.entry_price.toLocaleString()}</td>
            <td>$${t.exit_price.toLocaleString()}</td>
            <td>${t.size}</td>
            <td class="${pnlClass}">$${t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString()}</td>
            <td class="${pnlClass}">${t.pnl_pct >= 0 ? "+" : ""}${t.pnl_pct}%</td>
            <td>$${t.commission}</td>
            <td><span class="badge-mini" style="background: var(--bg-hover); color: var(--text-secondary);">${t.exit_reason}</span></td>
            <td>${t.bars_held}</td>
          </tr>
        `;
      })
      .reverse()
      .join("");
  }

  // --------------------------------------------------------------------------
  // 4. Mode Switcher & Event Listeners
  // --------------------------------------------------------------------------
  btnModeChart.addEventListener("click", () => {
    currentMode = "chart";
    btnModeChart.classList.add("active");
    btnModeBacktest.classList.remove("active");
    viewChart.classList.add("active");
    viewBacktest.classList.remove("active");
    backtestSettingsGroup.style.display = "none";
    btnRecalculateText.textContent = "Hesapla ve Güncelle";

    setTimeout(() => {
      if (!chart) initChart();
      if (currentData) renderChartDashboard(currentData);
      else loadChartData();
    }, 50);
  });

  btnModeBacktest.addEventListener("click", () => {
    currentMode = "backtest";
    btnModeBacktest.classList.add("active");
    btnModeChart.classList.remove("active");
    viewBacktest.classList.add("active");
    viewChart.classList.remove("active");
    backtestSettingsGroup.style.display = "block";
    btnRecalculateText.textContent = "Backtest'i Başlat";

    setTimeout(() => {
      if (!equityChart) initEquityChart();
      if (currentBacktestData) renderBacktestDashboard(currentBacktestData);
      else runBacktest();
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
    });
  });

  // Quick Chips
  document.querySelectorAll(".quick-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".quick-chips .chip").forEach((c) => c.classList.remove("active"));
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

  // Reset Zoom
  btnResetZoom.addEventListener("click", () => {
    if (chart) chart.timeScale().fitContent();
  });

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
    link.setAttribute("download", `dsavwap_${currentTickerName.textContent.toLowerCase()}.csv`);
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
      link.setAttribute("download", `dsavwap_backtest_trades_${currentTickerName.textContent.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Initial Load
  initChart();
  loadChartData();
});
