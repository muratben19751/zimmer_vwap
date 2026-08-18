"""
Command-Line Interface (CLI) runner for Dynamic Swing Anchored VWAP (Zeiierman).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

from dynamic_swing_anchored_vwap import (
    dynamic_swing_anchored_vwap,
    generate_synthetic_market_data,
    plot_dsavwap,
)


def load_ticker_data(ticker: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    """Download OHLCV data for a ticker using yfinance."""
    try:
        import yfinance as yf
    except ImportError:
        print("Error: yfinance is not installed. Run `pip install yfinance` to download ticker data.")
        sys.exit(1)

    print(f"Fetching '{ticker}' data ({period}, interval: {interval})...")
    data = yf.download(ticker, period=period, interval=interval, auto_adjust=True, progress=False)
    if data.empty:
        raise ValueError(f"No data returned for ticker '{ticker}'")

    # Handle multi-level columns if returned by yfinance
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [c[0] for c in data.columns]

    # Normalize column names
    col_map = {c.lower(): c for c in data.columns}
    df = pd.DataFrame(
        {
            "open": data[col_map["open"]],
            "high": data[col_map["high"]],
            "low": data[col_map["low"]],
            "close": data[col_map["close"]],
            "volume": data[col_map["volume"]],
        },
        index=data.index,
    )
    df.dropna(inplace=True)
    return df


def load_csv_data(filepath: str) -> pd.DataFrame:
    """Load OHLCV data from a CSV file."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {filepath}")

    df = pd.read_csv(filepath, index_col=0, parse_dates=True)
    return df


def main():
    parser = argparse.ArgumentParser(
        description="Dynamic Swing Anchored VWAP (Zeiierman) CLI Tool",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--ticker",
        type=str,
        default=None,
        help="Yahoo Finance ticker symbol (e.g. BTC-USD, NVDA, AAPL, SPY)",
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to CSV file with OHLCV data",
    )
    parser.add_argument(
        "--period",
        type=str,
        default="6mo",
        help="Time period for Yahoo Finance data (e.g. 1mo, 3mo, 6mo, 1y, 2y)",
    )
    parser.add_argument(
        "--interval",
        type=str,
        default="1d",
        help="Bar interval (e.g. 1h, 1d, 1wk)",
    )
    parser.add_argument(
        "--swing-period",
        type=int,
        default=50,
        help="Lookback period (prd) for swing extreme detection (>= 2)",
    )
    parser.add_argument(
        "--base-apt",
        type=float,
        default=20.0,
        help="Adaptive Price Tracking base half-life in bars (>= 1.0)",
    )
    parser.add_argument(
        "--use-adapt",
        action="store_true",
        default=False,
        help="Auto-adjust APT half-life by ATR volatility ratio",
    )
    parser.add_argument(
        "--vol-bias",
        type=float,
        default=10.0,
        help="Exponent controlling volatility influence on APT (>= 0.1)",
    )
    parser.add_argument(
        "--output-csv",
        type=str,
        default=None,
        help="Optional path to save indicator results to CSV",
    )
    parser.add_argument(
        "--plot",
        type=str,
        default="dsavwap_chart.png",
        help="Output image path for candlestick & DSAVWAP chart",
    )
    parser.add_argument(
        "--no-plot",
        action="store_true",
        help="Disable chart generation",
    )

    args = parser.parse_args()

    # 1. Load Data
    if args.ticker:
        df = load_ticker_data(args.ticker, period=args.period, interval=args.interval)
        source_name = f"{args.ticker} ({args.period})"
    elif args.csv:
        df = load_csv_data(args.csv)
        source_name = Path(args.csv).name
    else:
        print("No --ticker or --csv specified. Using 300 bars of synthetic market data.")
        df = generate_synthetic_market_data(n_bars=300, seed=42)
        source_name = "Synthetic Market Data"

    print(f"Loaded {len(df)} bars from {source_name}.")

    # 2. Run Dynamic Swing Anchored VWAP
    print("\nCalculating Dynamic Swing Anchored VWAP...")
    out = dynamic_swing_anchored_vwap(
        df,
        swing_period=args.swing_period,
        base_apt=args.base_apt,
        use_adapt=args.use_adapt,
        vol_bias=args.vol_bias,
    )

    # 3. Print Summary
    anchors = out[out["anchor"]]
    print(f"Identified {len(anchors)} Swing Anchors / Re-anchors:")
    for idx, row in anchors.iterrows():
        dir_str = "Bull (+1)" if row["dir"] > 0 else "Bear (-1)"
        print(f"  {str(idx)[:19]} | Pivot: {row['swing_label']:>2} | Dir: {dir_str} | Seg: {row['segment_id']:>2} | VWAP: {row['dsavwap']:.2f}")

    print("\nRecent Indicator Values:")
    display_df = pd.concat([df[["open", "high", "low", "close", "volume"]].tail(5), out[["dsavwap", "dir", "segment_id", "anchor", "swing_label", "apt"]].tail(5)], axis=1)
    print(display_df.to_string())

    # 4. Save CSV if requested
    if args.output_csv:
        combined = pd.concat([df, out], axis=1)
        combined.to_csv(args.output_csv)
        print(f"\nSaved results to CSV: {args.output_csv}")

    # 5. Plot
    if not args.no_plot and args.plot:
        plot_dsavwap(
            df,
            out,
            title=f"Dynamic Swing Anchored VWAP — {source_name}",
            save_path=args.plot,
            show=False,
        )
        print(f"Chart saved to: {args.plot}")


if __name__ == "__main__":
    main()
