---
source: repo:README.md
retrieved: 2026-08-18
type: readme
immutable: true
---

# Dynamic Swing Anchored VWAP (Zeiierman) — Python & Interactive Backtester

> **Credit**: Faithful Python 3.11+ re-implementation of the open-source TradingView indicator **"Dynamic Swing Anchored VWAP (Zeiierman)"** ([TradingView script](https://www.tradingview.com/v/SxgyrEde/)), licensed CC BY-NC-SA 4.0. Keep attribution and non-commercial/share-alike terms in mind.

## Overview
Unlike traditional VWAP indicators that remain anchored to static calendar points, **Dynamic Swing Anchored VWAP (DSAVWAP)**:
1. Auto-Detects Market Structure Swings confirmed in real-time.
2. Re-Anchors Dynamically at confirmed swing pivots.
3. Adaptive Price Tracking (APT) using EWMA half-life decay with ATR scaling.
4. Market Structure Labeling (HH, LH, LL, HL).
5. Integrated Strategy Backtester with institutional risk metrics.

## Mathematical Formulation
- **Swing Engine**: `prd` lookback, `ph`/`pl` extremes, direction `dir = +1 if phL > plL else -1`.
- **Volatility Adaptation**: $ATR = \text{RMA}(TR, 50)$, $\text{ratio} = ATR / ATR_{avg}$, $\text{apt} = \text{round}(\text{clip}(\text{base\_apt} / \text{ratio}^{\text{vol\_bias}}, 5.0, 300.0))$.
- **Decayed VWAP Core**:
  - Unchanged direction: $p_b = (1 - \alpha_b) \cdot p_{b-1} + \alpha_b \cdot (\text{hlc3}_b \cdot \text{vol}_b)$, $v_b = (1 - \alpha_b) \cdot v_{b-1} + \alpha_b \cdot \text{vol}_b$.
  - Direction flipped: Re-anchor at $(x, y)$ and forward loop recomputation.
