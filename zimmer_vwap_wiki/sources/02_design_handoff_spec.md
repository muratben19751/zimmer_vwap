---
source: repo:design_handoff_zimmer_vwap_backtester/readme.md
retrieved: 2026-08-18
type: docs
immutable: true
---

# Design Handoff: Zimmer VWAP Backtester UI & Layout Specification

## 1. Structure & Layout Grid
- **Top Toolbar (48px)**: Logo, Source Selector (NAU Equities & Bybit Crypto, Yahoo, Synthetic), Timeframe Pills (5m, 15m, 1h, 4h, 1D), Date Pickers, Theme Switcher, Run Backtest button.
- **Main Chart View (Flex 1)**: TradingView Lightweight Charts engine with candles, multi-line colored DSA-VWAP curves, $\pm 1\sigma$ and $\pm 2\sigma$ standard deviation bands, volume histogram, swing markers (HH/HL/LH/LL) and trade entry/exit arrows.
- **Strategy Tester Bottom Panel (272px fixed)**:
  - Tab 1: Genel Bakış (3x2 KPI Tiles: Net Profit, Total Trades, Win Rate %, Profit Factor, Max Drawdown %, Sharpe Ratio + Interactive Equity Curve Canvas).
  - Tab 2: Performans Özeti (15-item detailed quantitative breakdown).
  - Tab 3: İşlem Listesi (Full trade execution rows + CSV export).
- **Right Parameters Sidebar (288px)**:
  - Strategy inputs: Swing Length, Band 1 Multiplier, Band 2 Multiplier, Direction (Long/Short/Both), Capital, Size %, Commission %.
- **Status Bar (24px)**: Left: Symbol & range info; Right: Engine status & latency badge.
