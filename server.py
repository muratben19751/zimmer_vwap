"""
FastAPI Server for Dynamic Swing Anchored VWAP Interactive Web Application & Backtest Terminal.
"""

from __future__ import annotations

import io
import os
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import uvicorn
import yfinance as yf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backtest_engine import run_dsavwap_backtest
from dynamic_swing_anchored_vwap import (
    dynamic_swing_anchored_vwap,
    generate_synthetic_market_data,
)

app = FastAPI(title="Dynamic Swing Anchored VWAP Dashboard & Backtester")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)


class CalculationRequest(BaseModel):
    ticker: Optional[str] = "BTC-USD"
    period: str = "6mo"
    interval: str = "1d"
    swing_period: int = Field(default=50, ge=2)
    base_apt: float = Field(default=20.0, ge=1.0)
    use_adapt: bool = False
    vol_bias: float = Field(default=10.0, ge=0.1)
    use_synthetic: bool = False


class BacktestRequest(BaseModel):
    ticker: Optional[str] = "BTC-USD"
    period: str = "1y"
    interval: str = "1d"
    swing_period: int = Field(default=50, ge=2)
    base_apt: float = Field(default=20.0, ge=1.0)
    use_adapt: bool = False
    vol_bias: float = Field(default=10.0, ge=0.1)
    use_synthetic: bool = False

    # Strategy Parameters
    strategy_type: str = "pivot_flip"  # "pivot_flip", "price_cross", "pullback_bounce"
    trade_mode: str = "long_and_short"  # "long_and_short", "long_only", "short_only"
    initial_capital: float = Field(default=10000.0, ge=100.0)
    position_size_pct: float = Field(default=100.0, ge=1.0, le=100.0)
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    trailing_stop_pct: Optional[float] = None
    commission_pct: float = Field(default=0.05, ge=0.0)
    pullback_threshold_pct: float = Field(default=1.0, ge=0.1)


def _dataframe_to_chart_response(
    df: pd.DataFrame, out: pd.DataFrame, source_label: str
) -> Dict[str, Any]:
    """Convert calculated OHLCV and DSAVWAP DataFrame to frontend chart JSON."""
    col_map = {c.lower(): c for c in df.columns}

    timestamps = []
    for idx in df.index:
        if isinstance(idx, pd.Timestamp):
            timestamps.append(int(idx.timestamp()))
        else:
            try:
                dt = pd.to_datetime(idx)
                timestamps.append(int(dt.timestamp()))
            except Exception:
                timestamps.append(0)

    candles = []
    volumes = []
    vwap_points = []
    anchors = []

    high_arr = df[col_map["high"]].to_numpy(dtype=float)
    low_arr = df[col_map["low"]].to_numpy(dtype=float)
    open_arr = df[col_map["open"]].to_numpy(dtype=float)
    close_arr = df[col_map["close"]].to_numpy(dtype=float)
    vol_arr = df[col_map["volume"]].to_numpy(dtype=float)

    dsavwap_arr = out["dsavwap"].to_numpy(dtype=float)
    dir_arr = out["dir"].to_numpy(dtype=int)
    seg_arr = out["segment_id"].to_numpy(dtype=int)
    anchor_arr = out["anchor"].to_numpy(dtype=bool)
    labels_arr = out["swing_label"].to_numpy(dtype=str)
    apt_arr = out["apt"].to_numpy(dtype=float)

    n = len(df)
    for i in range(n):
        t = timestamps[i]
        c_open = float(open_arr[i])
        c_high = float(high_arr[i])
        c_low = float(low_arr[i])
        c_close = float(close_arr[i])
        c_vol = float(vol_arr[i])
        c_vwap = (
            float(dsavwap_arr[i])
            if not np.isnan(dsavwap_arr[i])
            else None
        )
        c_dir = int(dir_arr[i])
        c_seg = int(seg_arr[i])
        c_apt = float(apt_arr[i])

        candles.append(
            {
                "time": t,
                "open": c_open,
                "high": c_high,
                "low": c_low,
                "close": c_close,
            }
        )

        volumes.append(
            {
                "time": t,
                "value": c_vol,
                "color": (
                    "rgba(8, 153, 129, 0.4)"
                    if c_close >= c_open
                    else "rgba(242, 54, 69, 0.4)"
                ),
            }
        )

        if c_vwap is not None:
            vwap_points.append(
                {
                    "time": t,
                    "value": c_vwap,
                    "dir": c_dir,
                    "segment_id": c_seg,
                    "apt": c_apt,
                }
            )

        if anchor_arr[i]:
            label_text = str(labels_arr[i])
            is_high = "H" in label_text
            anchors.append(
                {
                    "time": t,
                    "bar_index": i,
                    "price": float(high_arr[i] if is_high else low_arr[i]),
                    "label": label_text,
                    "dir": c_dir,
                    "segment_id": c_seg,
                    "position": (
                        "aboveBar" if is_high else "belowBar"
                    ),
                    "color": "#ef5350" if is_high else "#26a69a",
                    "shape": (
                        "arrowDown" if is_high else "arrowUp"
                    ),
                }
            )

    latest_close = float(close_arr[-1]) if n > 0 else 0.0
    latest_vwap = float(dsavwap_arr[-1]) if n > 0 and not np.isnan(dsavwap_arr[-1]) else 0.0
    latest_dir = int(dir_arr[-1]) if n > 0 else 1
    price_change_pct = (
        ((latest_close - float(close_arr[0])) / float(close_arr[0]) * 100.0)
        if n > 0 and float(close_arr[0]) > 0
        else 0.0
    )
    vwap_diff_pct = (
        ((latest_close - latest_vwap) / latest_vwap * 100.0)
        if latest_vwap > 0
        else 0.0
    )

    last_anchor = anchors[-1] if len(anchors) > 0 else None

    return {
        "source": source_label,
        "total_bars": n,
        "candles": candles,
        "volumes": volumes,
        "vwap_points": vwap_points,
        "anchors": anchors,
        "metrics": {
            "latest_close": round(latest_close, 2),
            "latest_vwap": round(latest_vwap, 2),
            "current_dir": latest_dir,
            "regime": "BULLISH" if latest_dir > 0 else "BEARISH",
            "price_change_pct": round(price_change_pct, 2),
            "vwap_diff_pct": round(vwap_diff_pct, 2),
            "last_anchor_label": (
                last_anchor["label"] if last_anchor else "N/A"
            ),
            "last_anchor_price": (
                round(last_anchor["price"], 2) if last_anchor else 0.0
            ),
            "total_segments": (
                int(out["segment_id"].max()) if n > 0 else 0
            ),
            "current_apt": round(float(apt_arr[-1]), 1) if n > 0 else 20.0,
        },
    }


def _fetch_or_generate_df(
    use_synthetic: bool, ticker: Optional[str], period: str, interval: str
) -> tuple[pd.DataFrame, str]:
    if use_synthetic:
        df = generate_synthetic_market_data(n_bars=300, seed=42)
        return df, "Synthetic Market Data (300 Bars)"

    ticker_sym = (ticker or "BTC-USD").strip().upper()
    try:
        data = yf.download(
            ticker_sym,
            period=period,
            interval=interval,
            auto_adjust=True,
            progress=False,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Yahoo Finance data fetch failed: {str(e)}"
        )

    if data is None or data.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for ticker '{ticker_sym}' (period={period}, interval={interval})",
        )

    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [c[0] for c in data.columns]

    col_map = {c.lower(): c for c in data.columns}
    required = ["open", "high", "low", "close", "volume"]
    for r in required:
        if r not in col_map:
            raise HTTPException(
                status_code=400, detail=f"Ticker data missing column '{r}'"
            )

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
    return df, f"{ticker_sym} ({period}, {interval})"


@app.post("/api/calculate")
async def calculate_endpoint(req: CalculationRequest):
    """Fetch ticker or synthetic data and calculate DSAVWAP."""
    try:
        df, source_label = _fetch_or_generate_df(
            req.use_synthetic, req.ticker, req.period, req.interval
        )
        out = dynamic_swing_anchored_vwap(
            df,
            swing_period=req.swing_period,
            base_apt=req.base_apt,
            use_adapt=req.use_adapt,
            vol_bias=req.vol_bias,
        )
        return _dataframe_to_chart_response(df, out, source_label)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Calculation error: {str(e)}"
        )


@app.post("/api/backtest")
async def backtest_endpoint(req: BacktestRequest):
    """Run full strategy backtest on ticker or synthetic data."""
    try:
        df, source_label = _fetch_or_generate_df(
            req.use_synthetic, req.ticker, req.period, req.interval
        )

        out = dynamic_swing_anchored_vwap(
            df,
            swing_period=req.swing_period,
            base_apt=req.base_apt,
            use_adapt=req.use_adapt,
            vol_bias=req.vol_bias,
        )

        # Run Backtest simulation
        bt_result = run_dsavwap_backtest(
            df=df,
            out=out,
            strategy_type=req.strategy_type,
            trade_mode=req.trade_mode,
            initial_capital=req.initial_capital,
            position_size_pct=req.position_size_pct,
            stop_loss_pct=req.stop_loss_pct,
            take_profit_pct=req.take_profit_pct,
            trailing_stop_pct=req.trailing_stop_pct,
            commission_pct=req.commission_pct,
            pullback_threshold_pct=req.pullback_threshold_pct,
        )

        chart_data = _dataframe_to_chart_response(df, out, source_label)

        return {
            "source": source_label,
            "chart": chart_data,
            "backtest": bt_result.to_dict(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Backtest error: {str(e)}"
        )


@app.post("/api/upload")
async def upload_csv_endpoint(
    file: UploadFile = File(...),
    swing_period: int = Form(50),
    base_apt: float = Form(20.0),
    use_adapt: bool = Form(False),
    vol_bias: float = Form(10.0),
):
    """Calculate DSAVWAP from an uploaded CSV file."""
    try:
        contents = await file.read()
        df = pd.read_csv(
            io.BytesIO(contents), index_col=0, parse_dates=True
        )

        col_map = {c.lower(): c for c in df.columns}
        required = ["open", "high", "low", "close", "volume"]
        for r in required:
            if r not in col_map:
                raise HTTPException(
                    status_code=400,
                    detail=f"Uploaded CSV must contain columns: open, high, low, close, volume (found: {list(df.columns)})",
                )

        df = pd.DataFrame(
            {
                "open": df[col_map["open"]],
                "high": df[col_map["high"]],
                "low": df[col_map["low"]],
                "close": df[col_map["close"]],
                "volume": df[col_map["volume"]],
            },
            index=df.index,
        )
        df.dropna(inplace=True)

        out = dynamic_swing_anchored_vwap(
            df,
            swing_period=swing_period,
            base_apt=base_apt,
            use_adapt=use_adapt,
            vol_bias=vol_bias,
        )

        return _dataframe_to_chart_response(df, out, file.filename)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"CSV processing error: {str(e)}"
        )


@app.get("/api/health")
async def health():
    return {"status": "ok", "indicator": "Dynamic Swing Anchored VWAP (Zeiierman)"}


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
