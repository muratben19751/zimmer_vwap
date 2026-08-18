/* ==========================================================================
   DSAVWAP (Zeiierman) — Interactive Frontend Application Logic
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
  let currentData = null;
  let currentTab = "tab-ticker";
  let uploadedFile = null;

  // DOM Elements
  const container = document.getElementById("tvChartContainer");
  const chartLoader = document.getElementById("chartLoader");
  const chartHeaderTitle = document.getElementById("chartHeaderTitle");
  const currentTickerName = document.getElementById("currentTickerName");
  const currentTickerResolution = document.getElementById("currentTickerResolution");

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

  // Buttons
  const btnRecalculate = document.getElementById("btnRecalculate");
  const btnSearchTicker = document.getElementById("btnSearchTicker");
  const btnGenerateSynthetic = document.getElementById("btnGenerateSynthetic");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnThemeToggle = document.getElementById("btnThemeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const btnResetZoom = document.getElementById("btnResetZoom");

  // CSV
  const csvDropzone = document.getElementById("csvDropzone");
  const csvFileInput = document.getElementById("csvFileInput");
  const btnSelectFile = document.getElementById("btnSelectFile");
  const selectedFileName = document.getElementById("selectedFileName");

  // Metrics
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

  // Tables
  const countAnchors = document.getElementById("countAnchors");
  const anchorsTableBody = document.getElementById("anchorsTableBody");
  const barsTableBody = document.getElementById("barsTableBody");

  // --------------------------------------------------------------------------
  // 1. Chart Initialization (TradingView Lightweight Charts)
  // --------------------------------------------------------------------------
  function initChart() {
    if (!window.LightweightCharts) {
      console.error("LightweightCharts library not loaded");
      return;
    }

    if (chart) {
      chart.remove();
      chart = null;
    }

    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const bg = isDark ? "#161b22" : "#ffffff";
    const textColor = isDark ? "#8b949e" : "#57606a";
    const gridColor = isDark ? "#21262d" : "#edf0f2";

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
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Candlestick Series
    candleSeries = chart.addCandlestickSeries({
      upColor: "#089981",
      downColor: "#f23645",
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    // Volume Series (Overlay at bottom)
    volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    vwapSeriesMap.clear();

    // Auto resize
    window.addEventListener("resize", handleResize);
  }

  function handleResize() {
    if (chart && container) {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. Data Fetching & Rendering
  // --------------------------------------------------------------------------
  async function loadData() {
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

        res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
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
      renderDashboard(data);

    } catch (err) {
      alert("Hata: " + err.message);
      console.error(err);
    } finally {
      chartLoader.classList.remove("active");
    }
  }

  function renderDashboard(data) {
    if (!chart) initChart();

    // 1. Update Header & Titles
    chartHeaderTitle.textContent = `${data.source} — Dynamic Swing Anchored VWAP`;
    currentTickerName.textContent = (currentTab === "tab-ticker" ? tickerInput.value.toUpperCase() : (currentTab === "tab-csv" ? "CSV" : "Simülasyon"));
    currentTickerResolution.textContent = `${periodSelect.value} · ${intervalSelect.value}`;

    // 2. Set Candles & Volume
    candleSeries.setData(data.candles);
    volumeSeries.setData(data.volumes);

    // 3. Clear old VWAP line series
    for (const [, s] of vwapSeriesMap) {
      chart.removeSeries(s);
    }
    vwapSeriesMap.clear();

    // Group VWAP points by segment_id
    const segmentMap = new Map();
    for (const pt of data.vwap_points) {
      if (!segmentMap.has(pt.segment_id)) {
        segmentMap.set(pt.segment_id, {
          dir: pt.dir,
          points: [],
        });
      }
      segmentMap.get(pt.segment_id).points.push({
        time: pt.time,
        value: pt.value,
      });
    }

    // Create line series for each segment with appropriate color
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

    // 4. Set Markers (Swing Labels HH, HL, LH, LL)
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

    // 5. Update Metrics Cards
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

    // 6. Populate Tables
    countAnchors.textContent = data.anchors.length;
    renderAnchorsTable(data.anchors);
    renderBarsTable(data);
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

  // --------------------------------------------------------------------------
  // 3. Event Listeners & Controls
  // --------------------------------------------------------------------------

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
      loadData();
    });
  });

  // Search & Recalculate
  btnSearchTicker.addEventListener("click", loadData);
  btnRecalculate.addEventListener("click", loadData);
  tickerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadData();
  });

  periodSelect.addEventListener("change", loadData);
  intervalSelect.addEventListener("change", loadData);

  btnGenerateSynthetic.addEventListener("click", () => {
    currentTab = "tab-synthetic";
    loadData();
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
      loadData();
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
      loadData();
    }
  });

  // Inspector Tabs (Bottom)
  document.querySelectorAll(".inspector-tabs .insp-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
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

  // Theme Toggle
  btnThemeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);

    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", nextTheme === "light" ? "moon" : "sun");
      if (window.lucide) window.lucide.createIcons();
    }

    if (chart) {
      const isDark = nextTheme !== "light";
      chart.applyOptions({
        layout: {
          background: { color: isDark ? "#161b22" : "#ffffff" },
          textColor: isDark ? "#8b949e" : "#57606a",
        },
        grid: {
          vertLines: { color: isDark ? "#21262d" : "#edf0f2" },
          horzLines: { color: isDark ? "#21262d" : "#edf0f2" },
        },
      });
    }
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

  // Initial Load
  initChart();
  loadData();
});
