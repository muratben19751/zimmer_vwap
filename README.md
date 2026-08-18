# Dynamic Swing Anchored VWAP (Zeiierman) — Python Port

> **Credit**: Faithful Python 3.11+ re-implementation of the open-source TradingView indicator **"Dynamic Swing Anchored VWAP (Zeiierman)"** ([TradingView script](https://www.tradingview.com/v/SxgyrEde/)), licensed CC BY-NC-SA 4.0. Keep attribution and non-commercial/share-alike terms in mind.

---

## 📌 Overview

Unlike traditional VWAP indicators that remain anchored to static calendar points (e.g., daily session, weekly open) and drift away over time, **Dynamic Swing Anchored VWAP (DSAVWAP)**:

1. **Auto-Detects Market Structure Swings**: Confirms swing highs and lows in real-time without right-side confirmation delay.
2. **Re-Anchors Dynamically**: Resets and re-seeds VWAP calculation at the confirmed swing pivot, recomputing forward to reflect current market participants' volume-weighted average price.
3. **Adaptive Price Tracking (APT)**: Uses EWMA half-life decay with optional ATR-based volatility scaling (speeds up during high volatility, smooths during quiet consolidation).
4. **Market Structure Labeling**: Identifies and tags structural pivot points (`HH` = Higher High, `LH` = Lower High, `LL` = Lower Low, `HL` = Higher Low).

---

## 🚀 Quickstart

### 1. Installation

```bash
# Clone or navigate to the repository
cd /Users/i034216/Documents/myAI_projects/vwap

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Basic Python Usage

```python
import pandas as pd
from dynamic_swing_anchored_vwap import dynamic_swing_anchored_vwap, plot_dsavwap

# Load DataFrame with columns: open, high, low, close, volume
df = pd.read_csv("your_data.csv", index_col=0, parse_dates=True)

# Run DSAVWAP
out = dynamic_swing_anchored_vwap(
    df,
    swing_period=50,   # Lookback for swing extreme detection (prd)
    base_apt=20.0,     # Base half-life in bars
    use_adapt=True,    # Auto-adjust APT by ATR volatility ratio
    vol_bias=10.0      # Volatility sensitivity exponent
)

# Plot Candlesticks + DSAVWAP + Swing Badges
plot_dsavwap(df, out, title="BTC-USD Dynamic Swing Anchored VWAP", save_path="chart.png")
```

### 3. CLI Runner

You can run the indicator directly from the terminal for live Yahoo Finance symbols, CSV files, or simulation:

```bash
# Run on live Bitcoin daily data
python main.py --ticker BTC-USD --period 1y --interval 1d --use-adapt --plot btc_chart.png

# Run on NVIDIA hourly data
python main.py --ticker NVDA --period 1mo --interval 1h --use-adapt

# Run on custom CSV data
python main.py --csv my_data.csv --output-csv results.csv --plot my_chart.png

# Run on synthetic market data
python main.py
```

---

## 🧮 Mathematical Details

### 1. Swing Engine
- Persistent state: `ph`, `pl` (highest high, lowest low), `phL`, `plL` (bar indices).
- On each bar `b`:
  - `high[b] == max(high[b-prd+1 : b+1])` $\rightarrow$ `ph = high[b]`, `phL = b`.
  - `low[b] == min(low[b-prd+1 : b+1])` $\rightarrow$ `pl = low[b]`, `plL = b`.
  - Direction: `dir = +1 if phL > plL else -1`.

### 2. Volatility Adaptation
- $TR = \max(H - L, |H - C_{prev}|, |L - C_{prev}|)$
- $ATR = \text{RMA}(TR, 50)$ (Wilder's smoothing)
- $ATR_{avg} = \text{RMA}(ATR, 50)$
- $\text{ratio} = ATR / ATR_{avg}$
- $\text{apt}_{raw} = \text{base\_apt} / \text{ratio}^{\text{vol\_bias}}$ if `use_adapt` else `base_apt`
- $\text{apt} = \text{round}(\text{clip}(\text{apt}_{raw}, 5.0, 300.0))$
- $\alpha(\text{apt}) = 1 - \exp\left(-\frac{\ln(2)}{\max(1, \text{apt})}\right)$

### 3. Decayed VWAP Core
- **No Direction Change (`dir == dir_prev`)**:
  $$p_b = (1 - \alpha_b) \cdot p_{b-1} + \alpha_b \cdot (\text{hlc3}_b \cdot \text{vol}_b)$$
  $$v_b = (1 - \alpha_b) \cdot v_{b-1} + \alpha_b \cdot \text{vol}_b$$
  $$\text{DSAVWAP}_b = p_b / v_b$$

- **Direction Flipped (`dir != dir_prev`)**:
  1. Anchor at $x = \text{plL}, y = \text{pl}$ (if `dir > 0`) or $x = \text{phL}, y = \text{ph}$ (if `dir < 0`).
  2. Swing label tagged at $(x, y)$: `LL`/`HL` or `LH`/`HH`.
  3. Re-seed state at anchor: $p = y \cdot \text{vol}_x$, $v = \text{vol}_x$.
  4. Forward recomputation loop from $i = x$ to $b$ inclusive.

---

## 📊 Output Schema

The function returns a `pd.DataFrame` indexed identical to `df`:

| Column | Type | Description |
|---|---|---|
| `dsavwap` | `float64` | The Adaptive Anchored VWAP series |
| `dir` | `int64` | `+1` (bullish / low-anchored) or `-1` (bearish / high-anchored) |
| `segment_id` | `int64` | Incrementing integer ID per re-anchor |
| `anchor` | `bool` | `True` on anchor pivot bars, `False` elsewhere |
| `swing_label` | `str` | `'HH'`, `'HL'`, `'LH'`, `'LL'` on anchor bars, `''` elsewhere |
| `apt` | `float64` | Per-bar Adaptive Price Tracking half-life value |

---

## 🧪 Testing

Run the full pytest suite:

```bash
pytest dynamic_swing_anchored_vwap.py -v
```

Includes test cases for:
- [x] Constant price + constant volume consistency.
- [x] Synthetic V-shaped reversal and `LL`/`HH` turn verification.
- [x] Volatility spike adaptation and APT reduction.
- [x] Zero-volume bar protection against division by zero.
- [x] Strict parameter boundary validation.
