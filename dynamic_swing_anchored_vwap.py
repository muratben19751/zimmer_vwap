"""
Dynamic Swing Anchored VWAP (Zeiierman) in Python.

Credit: This is a Python re-implementation spec of the open-source TradingView indicator
"Dynamic Swing Anchored VWAP (Zeiierman)" (https://www.tradingview.com/v/SxgyrEde/),
licensed CC BY-NC-SA 4.0. Keep attribution and non-commercial/share-alike terms in mind.

Dynamic Swing Anchored VWAP is an adaptive price-volume indicator that anchors VWAP
at confirmed swing highs and lows, and continuously adapts its responsiveness using
exponentially decayed volume-weighted price tracking with optional volatility (ATR) adaptation.
"""

from __future__ import annotations

import math
from typing import Optional, Union

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def _calculate_tr(
    high: np.ndarray, low: np.ndarray, close: np.ndarray
) -> np.ndarray:
    """Calculate True Range across all bars (Wilder's TR)."""
    n = len(high)
    tr = np.empty(n, dtype=np.float64)
    if n == 0:
        return tr

    tr[0] = high[0] - low[0]
    for i in range(1, n):
        hl = high[i] - low[i]
        hc = abs(high[i] - close[i - 1])
        lc = abs(low[i] - close[i - 1])
        tr[i] = max(hl, hc, lc)
    return tr


def _calculate_rma(source: np.ndarray, length: int) -> np.ndarray:
    """
    Calculate Wilder's Running Moving Average (RMA / Wilder's Smoothing).

    Formula:
        rma[0] = source[0]
        rma[i] = (1 - alpha) * rma[i-1] + alpha * source[i], where alpha = 1 / length
    """
    n = len(source)
    out = np.empty(n, dtype=np.float64)
    if n == 0:
        return out

    alpha = 1.0 / float(length)
    out[0] = source[0]
    for i in range(1, n):
        out[i] = (1.0 - alpha) * out[i - 1] + alpha * source[i]
    return out


def _alpha_from_apt(apt: float) -> float:
    """
    Compute EWMA smoothing factor (alpha) from APT (Adaptive Price Tracking half-life).

    Formula:
        alpha = 1 - exp(-ln(2) / max(1, apt))
    """
    safe_apt = max(1.0, float(apt))
    return 1.0 - math.exp(-math.log(2.0) / safe_apt)


def dynamic_swing_anchored_vwap(
    df: pd.DataFrame,
    swing_period: int = 50,
    base_apt: float = 20.0,
    use_adapt: bool = False,
    vol_bias: float = 10.0,
) -> pd.DataFrame:
    """
    Calculate Dynamic Swing Anchored VWAP (Zeiierman) faithfully matching Pine Script v6.

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame with columns 'open', 'high', 'low', 'close', 'volume' (case-insensitive)
        indexed by DatetimeIndex (or sequential index), oldest first.
    swing_period : int, default 50
        Lookback period (`prd`) for swing high/low detection (>= 2).
    base_apt : float, default 20.0
        Adaptive Price Tracking base half-life in bars (>= 1.0).
    use_adapt : bool, default False
        Whether to auto-adjust APT by ATR ratio.
    vol_bias : float, default 10.0
        Exponent controlling volatility influence on APT (>= 0.1).

    Returns
    -------
    pd.DataFrame
        Aligned to `df.index` with columns:
        - `dsavwap` : float64, adaptive anchored VWAP series.
        - `dir` : int64, direction (+1 for bullish / swing low anchor, -1 for bearish / swing high anchor).
        - `segment_id` : int64, segment identifier incremented on each re-anchor.
        - `anchor` : bool, True on re-anchor pivot bars.
        - `swing_label` : str, 'HH', 'HL', 'LH', 'LL' at anchor bars, '' elsewhere.
        - `apt` : float64, the per-bar APT half-life value actually used.
    """
    # 1. Parameter Validation
    if swing_period < 2:
        raise ValueError(f"swing_period must be >= 2, got {swing_period}")
    if base_apt < 1.0:
        raise ValueError(f"base_apt must be >= 1.0, got {base_apt}")
    if vol_bias < 0.1:
        raise ValueError(f"vol_bias must be >= 0.1, got {vol_bias}")

    # Standardize column names (case-insensitive)
    col_map = {c.lower(): c for c in df.columns}
    required_cols = ["open", "high", "low", "close", "volume"]
    for col in required_cols:
        if col not in col_map:
            raise KeyError(
                f"Missing required column '{col}' (available: {list(df.columns)})"
            )

    n = len(df)
    if n == 0:
        return pd.DataFrame(
            {
                "dsavwap": pd.Series(dtype=np.float64),
                "dir": pd.Series(dtype=np.int64),
                "segment_id": pd.Series(dtype=np.int64),
                "anchor": pd.Series(dtype=bool),
                "swing_label": pd.Series(dtype=str),
                "apt": pd.Series(dtype=np.float64),
            },
            index=df.index,
        )

    # Extract NumPy arrays (float64)
    high = df[col_map["high"]].to_numpy(dtype=np.float64)
    low = df[col_map["low"]].to_numpy(dtype=np.float64)
    close = df[col_map["close"]].to_numpy(dtype=np.float64)
    volume = df[col_map["volume"]].to_numpy(dtype=np.float64)
    hlc3 = (high + low + close) / 3.0

    # 2. Volatility Adaptation (ATR & APT series)
    apt_series = np.empty(n, dtype=np.float64)
    if use_adapt:
        tr = _calculate_tr(high, low, close)
        atr = _calculate_rma(tr, 50)
        atr_avg = _calculate_rma(atr, 50)

        for i in range(n):
            if atr_avg[i] > 0.0:
                ratio = atr[i] / atr_avg[i]
            else:
                ratio = 1.0
            apt_raw = base_apt / (ratio**vol_bias)
            # Clip between 5.0 and 300.0, round to integer value
            apt_val = float(round(np.clip(apt_raw, 5.0, 300.0)))
            apt_series[i] = apt_val
    else:
        apt_val = float(round(np.clip(base_apt, 5.0, 300.0)))
        apt_series.fill(apt_val)

    # Pre-calculate alpha for each bar's APT
    alpha_series = np.empty(n, dtype=np.float64)
    for i in range(n):
        alpha_series[i] = _alpha_from_apt(apt_series[i])

    # 3. Output series initialization
    dsavwap = np.full(n, np.nan, dtype=np.float64)
    dir_arr = np.empty(n, dtype=np.int64)
    segment_id_arr = np.zeros(n, dtype=np.int64)
    anchor_arr = np.zeros(n, dtype=bool)
    swing_label_arr = np.full(n, "", dtype=object)

    # 4. Bar-by-bar persistent state
    # Swing engine state
    ph: float = high[0]
    pl: float = low[0]
    phL: int = 0
    plL: int = 0
    prev: Optional[float] = None
    current_segment_id: int = 0

    # Initial direction on bar 0
    # dir = +1 if phL > plL else -1 (on bar 0: 0 > 0 is False -> dir = -1)
    current_dir: int = 1 if phL > plL else -1
    dir_prev: int = current_dir

    # VWAP accumulator state
    p: float = hlc3[0] * volume[0]
    vol: float = volume[0]
    dsavwap[0] = (p / vol) if vol > 0.0 else np.nan
    dir_arr[0] = current_dir
    segment_id_arr[0] = current_segment_id
    anchor_arr[0] = False
    swing_label_arr[0] = ""

    # 5. Process bars iteratively
    for b in range(1, n):
        # Keep track of opposite extreme prices before updating with current bar
        ph_prior_bar = ph
        pl_prior_bar = pl

        # Swing (pivot) engine: running extreme over last `swing_period` bars including current
        start_idx = max(0, b - swing_period + 1)
        window_high = high[start_idx : b + 1]
        window_low = low[start_idx : b + 1]

        # Pine: ta.highestbars(high, prd) == 0 (current bar is highest)
        if high[b] >= np.max(window_high):
            ph = high[b]
            phL = b

        # Pine: ta.lowestbars(low, prd) == 0 (current bar is lowest)
        if low[b] <= np.min(window_low):
            pl = low[b]
            plL = b

        current_dir = 1 if phL > plL else -1

        if current_dir == dir_prev:
            # Case A: No direction change - update with current bar
            a = alpha_series[b]
            p = (1.0 - a) * p + a * (hlc3[b] * volume[b])
            vol = (1.0 - a) * vol + a * volume[b]
            dsavwap[b] = (p / vol) if vol > 0.0 else np.nan
            dir_arr[b] = current_dir
            segment_id_arr[b] = current_segment_id
            anchor_arr[b] = False
            swing_label_arr[b] = ""
        else:
            # Case B: Direction flipped -> Re-anchor
            current_segment_id += 1

            # 1. Anchor bar and price
            if current_dir > 0:
                # Upward move: anchor to preceding swing low
                x = plL
                y = pl
            else:
                # Downward move: anchor to preceding swing high
                x = phL
                y = ph

            # 2. Swing label at (x, y)
            if current_dir > 0:
                # Low pivot
                label = "HL" if (prev is not None and y > prev) else "LL"
                prev = ph_prior_bar
            else:
                # High pivot
                label = "HH" if (prev is not None and y > prev) else "LH"
                prev = pl_prior_bar

            # 3. Re-seed state at anchor bar x
            p = y * volume[x]
            vol = volume[x]

            # 4. Recompute forward from anchor bar x to current bar b inclusive
            for i in range(x, b + 1):
                a = alpha_series[i]
                p = (1.0 - a) * p + a * (hlc3[i] * volume[i])
                vol = (1.0 - a) * vol + a * volume[i]
                dsavwap[i] = (p / vol) if vol > 0.0 else np.nan
                dir_arr[i] = current_dir
                segment_id_arr[i] = current_segment_id
                anchor_arr[i] = False
                swing_label_arr[i] = ""

            # Tag anchor bar x
            anchor_arr[x] = True
            swing_label_arr[x] = label

            dir_prev = current_dir

    return pd.DataFrame(
        {
            "dsavwap": dsavwap,
            "dir": dir_arr,
            "segment_id": segment_id_arr,
            "anchor": anchor_arr,
            "swing_label": swing_label_arr,
            "apt": apt_series,
        },
        index=df.index,
    )


def plot_dsavwap(
    df: pd.DataFrame,
    out: pd.DataFrame,
    title: str = "Dynamic Swing Anchored VWAP (Zeiierman)",
    figsize: tuple[int, int] = (14, 8),
    save_path: Optional[str] = None,
    show: bool = False,
) -> tuple[plt.Figure, tuple[plt.Axes, plt.Axes]]:
    """
    Plot candlesticks/price action, DSAVWAP segmented polyline, and swing labels.

    Parameters
    ----------
    df : pd.DataFrame
        Input OHLCV DataFrame.
    out : pd.DataFrame
        Output DataFrame from `dynamic_swing_anchored_vwap`.
    title : str, default 'Dynamic Swing Anchored VWAP (Zeiierman)'
        Plot title.
    figsize : tuple, default (14, 8)
        Figure dimensions (width, height).
    save_path : Optional[str], default None
        File path to save the generated figure.
    show : bool, default False
        Whether to call `plt.show()`.

    Returns
    -------
    tuple[plt.Figure, tuple[plt.Axes, plt.Axes]]
        Matplotlib figure and axes (main_ax, volume_ax).
    """
    col_map = {c.lower(): c for c in df.columns}
    close = df[col_map["close"]].to_numpy()
    high = df[col_map["high"]].to_numpy()
    low = df[col_map["low"]].to_numpy()
    open_p = df[col_map["open"]].to_numpy()
    volume = df[col_map["volume"]].to_numpy()

    fig, (ax_main, ax_vol) = plt.subplots(
        2,
        1,
        figsize=figsize,
        sharex=True,
        gridspec_kw={"height_ratios": [3.5, 1.0], "hspace": 0.08},
    )

    n = len(df)
    x_indices = np.arange(n)

    # 1. Candlestick plotting on main axis
    candle_colors = [
        "#089981" if close[i] >= open_p[i] else "#F23645" for i in range(n)
    ]
    ax_main.vlines(
        x_indices,
        low,
        high,
        colors=candle_colors,
        linewidth=1.0,
        alpha=0.6,
        zorder=1,
    )
    for i in range(n):
        bottom = min(open_p[i], close[i])
        height = max(abs(close[i] - open_p[i]), 0.001)
        ax_main.bar(
            x_indices[i],
            height,
            bottom=bottom,
            color=candle_colors[i],
            width=0.65,
            edgecolor=candle_colors[i],
            alpha=0.7,
            zorder=2,
        )

    # 2. DSAVWAP polyline segmented by segment_id & direction
    dsavwap = out["dsavwap"].to_numpy()
    dir_arr = out["dir"].to_numpy()
    segment_ids = out["segment_id"].unique()

    for seg_id in segment_ids:
        seg_mask = out["segment_id"].to_numpy() == seg_id
        seg_indices = x_indices[seg_mask]
        seg_vwap = dsavwap[seg_mask]
        seg_dir = dir_arr[seg_mask][0] if len(seg_indices) > 0 else 1

        color = "#26a69a" if seg_dir > 0 else "#ef5350"
        ax_main.plot(
            seg_indices,
            seg_vwap,
            color=color,
            linewidth=2.2,
            label=(
                "DSAVWAP (Bullish)"
                if (seg_dir > 0 and seg_id == segment_ids[0])
                else (
                    "DSAVWAP (Bearish)"
                    if (seg_dir < 0 and seg_id == segment_ids[0])
                    else None
                )
            ),
            zorder=4,
        )

    # 3. Annotate Swing Labels (HH, HL, LH, LL)
    anchors = out[out["anchor"]].copy()
    for row_idx, row in anchors.iterrows():
        i = df.index.get_loc(row_idx)
        label_text = row["swing_label"]
        if not label_text:
            continue

        if "H" in label_text:  # High pivot
            y_pos = high[i]
            va_pos = "bottom"
            y_offset = (high.max() - low.min()) * 0.02
            box_col = "#ef5350"
            text_y = y_pos + y_offset
        else:  # Low pivot
            y_pos = low[i]
            va_pos = "top"
            y_offset = -(high.max() - low.min()) * 0.02
            box_col = "#26a69a"
            text_y = y_pos + y_offset

        ax_main.scatter(
            [i],
            [y_pos],
            color=box_col,
            s=40,
            marker="o",
            edgecolors="white",
            linewidth=1.2,
            zorder=5,
        )
        ax_main.annotate(
            label_text,
            (i, text_y),
            textcoords="data",
            ha="center",
            va=va_pos,
            fontsize=8.5,
            fontweight="bold",
            color="white",
            bbox=dict(
                boxstyle="round,pad=0.25",
                facecolor=box_col,
                edgecolor="none",
                alpha=0.9,
            ),
            zorder=6,
        )

    # 4. Volume subplot
    ax_vol.bar(
        x_indices,
        volume,
        color=candle_colors,
        width=0.65,
        alpha=0.45,
        zorder=2,
    )
    ax_vol.set_ylabel("Volume", fontsize=9)
    ax_vol.grid(True, linestyle="--", alpha=0.3)

    # 5. Styling and Formats
    ax_main.set_title(title, fontsize=13, fontweight="bold", pad=12)
    ax_main.set_ylabel("Price", fontsize=10)
    ax_main.grid(True, linestyle="--", alpha=0.3)

    # Format x-axis with date sample ticks
    if isinstance(df.index, pd.DatetimeIndex):
        step = max(1, n // 8)
        tick_locs = x_indices[::step]
        tick_labels = [df.index[k].strftime("%Y-%m-%d") for k in tick_locs]
        ax_vol.set_xticks(tick_locs)
        ax_vol.set_xticklabels(tick_labels, rotation=25, ha="right", fontsize=9)
    else:
        step = max(1, n // 8)
        ax_vol.set_xticks(x_indices[::step])

    ax_vol.set_xlim(-1, n)

    if save_path:
        fig.savefig(save_path, dpi=200, bbox_inches="tight")

    if show:
        plt.show()

    return fig, (ax_main, ax_vol)


# ============================================================================
# Unit Tests (Pytest compatible)
# ============================================================================


def test_constant_price_and_volume():
    """
    Test requirement (a):
    Constant price + constant volume -> VWAP equals price after warm-up.
    """
    n = 100
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    const_price = 150.0
    const_vol = 1000.0

    df = pd.DataFrame(
        {
            "open": np.full(n, const_price),
            "high": np.full(n, const_price),
            "low": np.full(n, const_price),
            "close": np.full(n, const_price),
            "volume": np.full(n, const_vol),
        },
        index=dates,
    )

    out = dynamic_swing_anchored_vwap(df, swing_period=20, base_apt=10.0)

    # Every bar's VWAP should exactly equal the constant price
    np.testing.assert_allclose(
        out["dsavwap"].to_numpy(),
        np.full(n, const_price),
        rtol=1e-7,
        err_msg="VWAP must equal constant price",
    )


def test_synthetic_v_shaped_series():
    """
    Test requirement (b):
    Synthetic V-shaped series -> exactly one re-anchor at the turn, correct LL/HH labeling.
    """
    # Downward leg for 60 bars (100 down to 41), then upward leg for 60 bars (42 up to 101)
    down_prices = np.linspace(100.0, 41.0, 60)
    up_prices = np.linspace(42.0, 101.0, 60)
    prices = np.concatenate([down_prices, up_prices])
    n = len(prices)
    dates = pd.date_range("2026-01-01", periods=n, freq="D")

    df = pd.DataFrame(
        {
            "open": prices,
            "high": prices + 0.5,
            "low": prices - 0.5,
            "close": prices,
            "volume": np.full(n, 500.0),
        },
        index=dates,
    )

    # Run with swing_period=50
    out = dynamic_swing_anchored_vwap(df, swing_period=50)

    # Find re-anchor bars (where anchor is True)
    anchors = out[out["anchor"]]

    # In a clean V-shape, we expect exactly 1 turn / re-anchor from bearish to bullish
    assert (
        len(anchors) == 1
    ), f"Expected exactly 1 re-anchor, got {len(anchors)}"

    # The anchor should be at the trough bar (index 59)
    anchor_idx = df.index.get_loc(anchors.index[0])
    assert (
        anchor_idx == 59
    ), f"Expected anchor at trough bar 59, got {anchor_idx}"

    # Label at trough should be 'LL'
    assert (
        anchors["swing_label"].iloc[0] == "LL"
    ), f"Expected 'LL' label at trough, got {anchors['swing_label'].iloc[0]}"

    # Direction after anchor should be +1 (bullish)
    assert (
        out["dir"].iloc[-1] == 1
    ), f"Expected final direction +1, got {out['dir'].iloc[-1]}"


def test_volatility_spike_adaptation():
    """
    Test requirement (c):
    `use_adapt=True` with a volatility spike -> APT decreases (faster tracking) on spike bars.
    """
    n = 120
    dates = pd.date_range("2026-01-01", periods=n, freq="D")

    # Calm regime for first 80 bars (TR ~ 1.0)
    high = np.full(n, 100.5)
    low = np.full(n, 99.5)
    close = np.full(n, 100.0)
    open_p = np.full(n, 100.0)
    volume = np.full(n, 1000.0)

    # Huge volatility spike from bar 80 to 85 (TR = 30.0)
    for i in range(80, 86):
        high[i] = 115.0
        low[i] = 85.0
        close[i] = 105.0
        open_p[i] = 95.0

    df = pd.DataFrame(
        {
            "open": open_p,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        },
        index=dates,
    )

    base_apt = 20.0
    out = dynamic_swing_anchored_vwap(
        df,
        swing_period=30,
        base_apt=base_apt,
        use_adapt=True,
        vol_bias=10.0,
    )

    # On volatility spike bars, APT should decrease significantly below base_apt
    spike_apt = out["apt"].iloc[82:86].min()
    assert (
        spike_apt < base_apt
    ), f"Expected APT to decrease during volatility spike, got {spike_apt} >= {base_apt}"


def test_zero_volume_bars():
    """Verify that zero volume bars do not cause division by zero or crash."""
    n = 30
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    df = pd.DataFrame(
        {
            "open": np.full(n, 10.0),
            "high": np.full(n, 11.0),
            "low": np.full(n, 9.0),
            "close": np.full(n, 10.0),
            "volume": np.zeros(n),
        },
        index=dates,
    )

    out = dynamic_swing_anchored_vwap(df, swing_period=5)
    assert (
        out["dsavwap"].isna().all()
    ), "All VWAP values must be NaN when volume is 0"


def test_parameter_validation():
    """Verify constraints validation on input parameters."""
    dates = pd.date_range("2026-01-01", periods=10, freq="D")
    df = pd.DataFrame(
        {
            "open": np.full(10, 10.0),
            "high": np.full(10, 11.0),
            "low": np.full(10, 9.0),
            "close": np.full(10, 10.0),
            "volume": np.full(10, 100.0),
        },
        index=dates,
    )

    try:
        dynamic_swing_anchored_vwap(df, swing_period=1)
        assert False, "Expected ValueError for swing_period < 2"
    except ValueError:
        pass

    try:
        dynamic_swing_anchored_vwap(df, base_apt=0.5)
        assert False, "Expected ValueError for base_apt < 1.0"
    except ValueError:
        pass

    try:
        dynamic_swing_anchored_vwap(df, vol_bias=0.05)
        assert False, "Expected ValueError for vol_bias < 0.1"
    except ValueError:
        pass


# ============================================================================
# Demo & CLI
# ============================================================================


def generate_synthetic_market_data(
    n_bars: int = 300, seed: int = 42
) -> pd.DataFrame:
    """Generate realistic OHLCV market data with multiple swing highs/lows."""
    np.random.seed(seed)
    dates = pd.date_range("2026-01-01", periods=n_bars, freq="1h")

    # Multi-frequency wave to produce realistic swings
    t = np.linspace(0, 6 * np.pi, n_bars)
    trend = 0.05 * np.arange(n_bars)
    wave1 = 15.0 * np.sin(t)
    wave2 = 6.0 * np.sin(2.5 * t)
    noise = np.cumsum(np.random.normal(0, 0.4, n_bars))
    base_price = 100.0 + trend + wave1 + wave2 + noise

    # Generate OHLC bars from base price
    open_p = base_price + np.random.uniform(-0.5, 0.5, n_bars)
    close_p = open_p + np.random.normal(0, 1.2, n_bars)
    high_p = np.maximum(open_p, close_p) + np.random.uniform(0.2, 2.0, n_bars)
    low_p = np.minimum(open_p, close_p) - np.random.uniform(0.2, 2.0, n_bars)
    volume = np.random.uniform(1000, 8000, n_bars) * (1.0 + 0.3 * np.sin(t))

    return pd.DataFrame(
        {
            "open": np.round(open_p, 2),
            "high": np.round(high_p, 2),
            "low": np.round(low_p, 2),
            "close": np.round(close_p, 2),
            "volume": np.round(volume, 0),
        },
        index=dates,
    )


if __name__ == "__main__":
    print("=" * 70)
    print("Dynamic Swing Anchored VWAP (Zeiierman) - Python Demo")
    print("=" * 70)

    # 1. Generate synthetic OHLCV data
    df = generate_synthetic_market_data(n_bars=250, seed=101)
    print(f"Generated {len(df)} synthetic OHLCV bars.")

    # 2. Run indicator
    out = dynamic_swing_anchored_vwap(
        df,
        swing_period=30,
        base_apt=20.0,
        use_adapt=True,
        vol_bias=10.0,
    )

    # 3. Print tail of output
    print("\nIndicator Output Tail (Last 10 bars):")
    tail_combined = pd.concat(
        [
            df[["open", "high", "low", "close", "volume"]].tail(10),
            out[["dsavwap", "dir", "segment_id", "anchor", "swing_label", "apt"]].tail(10),
        ],
        axis=1,
    )
    print(tail_combined.to_string())

    # 4. Print identified swing anchors
    anchors = out[out["anchor"]]
    print(f"\nIdentified {len(anchors)} Swing Anchors:")
    for idx, row in anchors.iterrows():
        print(
            f"  Bar: {idx} | Pivot: {row['swing_label']} | "
            f"Dir: {'+1 (Bull)' if row['dir'] > 0 else '-1 (Bear)'} | "
            f"Segment ID: {row['segment_id']} | "
            f"DSAVWAP: {row['dsavwap']:.2f}"
        )

    # 5. Plot and save chart
    chart_file = "/Users/i034216/Documents/myAI_projects/vwap/dsavwap_demo.png"
    plot_dsavwap(
        df,
        out,
        title="Dynamic Swing Anchored VWAP (Zeiierman) - Python Demo",
        save_path=chart_file,
        show=False,
    )
    print(f"\nChart successfully generated and saved to: {chart_file}")
    print("=" * 70)
