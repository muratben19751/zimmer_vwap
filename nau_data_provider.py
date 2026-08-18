"""
NAU Data Provider for Dynamic Swing Anchored VWAP (Zeiierman).
Seamlessly loads and caches data from the local NAU project (Nautilus Trader Equity Catalog and Bybit Parquet cache).

Wiki References:
- Bkz: [[nau_data_provider]] (Varlık Dokümantasyonu)
- Bkz: [[architecture_overview]] (Sistem Mimarisi)
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# NAU Cache and Catalog roots
NAU_CACHE_DIR = Path.home() / ".cache" / "nautilus_web_app"
EQUITY_CATALOG_DIR = NAU_CACHE_DIR / "equity_catalog"
BYBIT_CACHE_DIR = NAU_CACHE_DIR / "bybit"
EXTERNAL_CACHE_DIR = NAU_CACHE_DIR / "external"
BTC_MAX_PARQUET = NAU_CACHE_DIR / "btc_usd_max.parquet"


def to_nautilus_tf(tf: str) -> str:
    """Map any timeframe input to Nautilus catalog folder name component."""
    t = tf.strip().upper()
    mapping = {
        "1M": "1-MINUTE",
        "1-M": "1-MINUTE",
        "1-MINUTE": "1-MINUTE",
        "1MIN": "1-MINUTE",
        "5M": "5-MINUTE",
        "5-M": "5-MINUTE",
        "5-MINUTE": "5-MINUTE",
        "5MIN": "5-MINUTE",
        "15M": "15-MINUTE",
        "15-M": "15-MINUTE",
        "15-MINUTE": "15-MINUTE",
        "15MIN": "15-MINUTE",
        "30M": "30-MINUTE",
        "30-MINUTE": "30-MINUTE",
        "1H": "1-HOUR",
        "60M": "1-HOUR",
        "1-H": "1-HOUR",
        "1-HOUR": "1-HOUR",
        "4H": "4-HOUR",
        "240M": "4-HOUR",
        "4-H": "4-HOUR",
        "4-HOUR": "4-HOUR",
        "1D": "1-DAY",
        "D": "1-DAY",
        "1-D": "1-DAY",
        "1-DAY": "1-DAY",
        "1WK": "1-WEEK",
        "1-WEEK": "1-WEEK",
    }
    return mapping.get(t, "1-DAY")


def to_bybit_tf(tf: str) -> str:
    """Map any timeframe input to Bybit filename suffix."""
    t = tf.strip().lower()
    mapping = {
        "1m": "1m",
        "1-minute": "1m",
        "5m": "5m",
        "5-minute": "5m",
        "15m": "15m",
        "15-minute": "15m",
        "30m": "30m",
        "30-minute": "30m",
        "1h": "60m",
        "60m": "60m",
        "1-hour": "60m",
        "4h": "240m",
        "240m": "240m",
        "4-hour": "240m",
        "1d": "1d",
        "d": "1d",
        "1-day": "1d",
        "1wk": "1wk",
        "1-week": "1wk",
    }
    return mapping.get(t, "1d")


def to_std_display_tf(tf: str) -> str:
    """Map to clean UI display string (e.g. 1m, 5m, 15m, 1h, 4h, 1d)."""
    t = tf.strip().upper()
    mapping = {
        "1-MINUTE": "1m",
        "1M": "1m",
        "5-MINUTE": "5m",
        "5M": "5m",
        "15-MINUTE": "15m",
        "15M": "15m",
        "30-MINUTE": "30m",
        "30M": "30m",
        "1-HOUR": "1h",
        "1H": "1h",
        "60M": "1h",
        "4-HOUR": "4h",
        "4H": "4h",
        "240M": "4h",
        "1-DAY": "1d",
        "1D": "1d",
        "D": "1d",
        "1-WEEK": "1wk",
        "1WK": "1wk",
    }
    return mapping.get(t, tf.lower())


INTERVAL_ORDER = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk"]


def _get_equity_manifest() -> Dict[str, Any]:
    """Read the _manifest.json from the equity catalog."""
    manifest_path = EQUITY_CATALOG_DIR / "_manifest.json"
    if manifest_path.exists():
        try:
            return json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as e:
            log.warning("Failed to parse NAU equity manifest: %s", e)
    return {}


def discover_nau_symbols() -> Dict[str, Any]:
    """
    Discover all available symbols and timeframes across NAU sources.
    Returns:
        Dict containing categorized symbol lists with metadata.
    """
    manifest = _get_equity_manifest()
    
    # 1. Equity Catalog symbols
    equity_symbols: List[Dict[str, Any]] = []
    equity_bar_dir = EQUITY_CATALOG_DIR / "data" / "bar"
    
    if equity_bar_dir.exists():
        equity_map: Dict[str, Dict[str, Any]] = {}
        for d in sorted(equity_bar_dir.iterdir()):
            if not d.is_dir():
                continue
            parts = d.name.rsplit("-", 4)
            if len(parts) != 5:
                continue
            raw_sym = parts[0].split(".")[0]
            tf_raw = f"{parts[1]}-{parts[2]}"
            tf_display = to_std_display_tf(tf_raw)
            
            if raw_sym not in equity_map:
                meta = manifest.get(raw_sym, {})
                equity_map[raw_sym] = {
                    "symbol": raw_sym,
                    "name": raw_sym,
                    "source": "equity_catalog",
                    "venue": meta.get("venue", "NASDAQ"),
                    "timeframes": set(),
                    "total_bars": meta.get("bars", 0),
                    "first_date": meta.get("first", ""),
                    "last_date": meta.get("last", ""),
                    "adjusted": meta.get("split_adjusted", True),
                    "note": meta.get("note", "Polygon / Massive Tick Aggregates"),
                }
            equity_map[raw_sym]["timeframes"].add(tf_display)
            
        for sym, item in sorted(equity_map.items()):
            item["timeframes"] = sorted(
                list(item["timeframes"]),
                key=lambda x: INTERVAL_ORDER.index(x) if x in INTERVAL_ORDER else 99
            )
            equity_symbols.append(item)

    # 2. Bybit Cache symbols
    bybit_symbols: List[Dict[str, Any]] = []
    if BYBIT_CACHE_DIR.exists():
        bybit_map: Dict[str, Dict[str, Any]] = {}
        for f in sorted(BYBIT_CACHE_DIR.glob("*.parquet")):
            parts = f.stem.split("_")
            if len(parts) != 3:
                continue
            cat, sym, tf_code = parts
            tf_display = to_std_display_tf(tf_code)
            
            key = f"{sym}_{cat}"
            if key not in bybit_map:
                bybit_map[key] = {
                    "symbol": sym,
                    "name": f"{sym} ({cat.upper()})",
                    "source": "bybit",
                    "category": cat,
                    "timeframes": set(),
                    "note": f"Bybit v5 Kline Archive ({cat})",
                }
            bybit_map[key]["timeframes"].add(tf_display)
            
        for key, item in sorted(bybit_map.items()):
            item["timeframes"] = sorted(
                list(item["timeframes"]),
                key=lambda x: INTERVAL_ORDER.index(x) if x in INTERVAL_ORDER else 99
            )
            bybit_symbols.append(item)

    return {
        "status": "ok",
        "nau_root": str(NAU_CACHE_DIR),
        "equities": equity_symbols,
        "bybit": bybit_symbols,
        "total_equities": len(equity_symbols),
        "total_bybit": len(bybit_symbols),
    }


def load_nau_bars(
    symbol: str,
    timeframe: str = "1d",
    source: Optional[str] = None,
    category: Optional[str] = "linear",
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit_bars: Optional[int] = None,
) -> Tuple[pd.DataFrame, str]:
    """
    Load OHLCV bars from NAU project data archives.
    
    Parameters:
        symbol: Ticker symbol (e.g. 'NVDA', 'AAPL', 'QQQC', 'BTCUSDT')
        timeframe: Timeframe string (e.g. '1d', '1h', '15m', '5m', '1m', '4h')
        source: Optional explicit source ('equity_catalog' or 'bybit')
        category: For bybit ('linear', 'spot', 'inverse')
        start: Optional start datetime
        end: Optional end datetime
        limit_bars: Optional limit for the most recent N bars
        
    Returns:
        Tuple of (pd.DataFrame with [open, high, low, close, volume] and UTC DatetimeIndex, source_label)
    """
    sym = symbol.strip().upper()
    display_tf = to_std_display_tf(timeframe)
    
    # 1. Check Equity Catalog if requested or if symbol is not explicitly a crypto pair
    is_explicit_crypto = source == "bybit" or sym.endswith("USDT") or sym in ("BTC", "ETH", "SOL", "DOGE")
    
    if not is_explicit_crypto or source == "equity_catalog":
        tf_nautilus = to_nautilus_tf(timeframe)
        bar_dir_name = f"{sym}.NASDAQ-{tf_nautilus}-LAST-EXTERNAL"
        target_dir = EQUITY_CATALOG_DIR / "data" / "bar" / bar_dir_name
        
        if target_dir.exists():
            from nautilus_trader.persistence.catalog import ParquetDataCatalog
            cat = ParquetDataCatalog(str(EQUITY_CATALOG_DIR))
            bars = cat.bars(bar_types=[bar_dir_name])
            if not bars:
                raise ValueError(f"No bars found in NAU Equity Catalog for {bar_dir_name}")
                
            dt_index = pd.to_datetime([b.ts_event for b in bars], unit="ns", utc=True)
            df = pd.DataFrame(
                {
                    "open": [float(b.open) for b in bars],
                    "high": [float(b.high) for b in bars],
                    "low": [float(b.low) for b in bars],
                    "close": [float(b.close) for b in bars],
                    "volume": [float(b.volume) for b in bars],
                },
                index=dt_index,
            )
            df.index.name = "timestamp"
            df = df[~df.index.duplicated(keep="last")].sort_index()
            
            # Apply date filters
            if start is not None:
                st_ts = pd.Timestamp(start).tz_convert("UTC") if start.tzinfo else pd.Timestamp(start, tz="UTC")
                df = df[df.index >= st_ts]
            if end is not None:
                end_ts = pd.Timestamp(end).tz_convert("UTC") if end.tzinfo else pd.Timestamp(end, tz="UTC")
                df = df[df.index <= end_ts]
                
            if limit_bars is not None and limit_bars > 0 and len(df) > limit_bars:
                df = df.iloc[-limit_bars:]
                
            return df, f"NAU Equity: {sym} ({display_tf}, {len(df)} Barlar)"
            
        elif source == "equity_catalog":
            raise FileNotFoundError(f"NAU Equity directory not found: {bar_dir_name}")

    # 2. Load from Bybit Cache
    bybit_sym = sym if sym.endswith("USDT") else f"{sym}USDT"
    bybit_cat = (category or "linear").lower()
    bybit_tf = to_bybit_tf(timeframe)
    
    bybit_file = BYBIT_CACHE_DIR / f"{bybit_cat}_{bybit_sym}_{bybit_tf}.parquet"
    if not bybit_file.exists():
        # Check alternate categories or fallbacks
        alt_files = list(BYBIT_CACHE_DIR.glob(f"*_{bybit_sym}_{bybit_tf}.parquet"))
        if alt_files:
            bybit_file = alt_files[0]
            bybit_cat = bybit_file.stem.split("_")[0]
        else:
            # Check BTC max
            if "BTC" in sym and BTC_MAX_PARQUET.exists() and bybit_tf == "1d":
                df = pd.read_parquet(BTC_MAX_PARQUET)
                if limit_bars is not None and limit_bars > 0 and len(df) > limit_bars:
                    df = df.iloc[-limit_bars:]
                return df, f"NAU BTC Max Archive (1d, {len(df)} Barlar)"
                
            avail_tf = [to_std_display_tf(f.stem.split('_')[2]) for f in BYBIT_CACHE_DIR.glob(f'*_{bybit_sym}_*.parquet')]
            raise FileNotFoundError(
                f"NAU Bybit file not found for {bybit_sym} ({display_tf}). "
                f"Available timeframes: {avail_tf}"
            )
            
    df = pd.read_parquet(bybit_file)
    df = df[~df.index.duplicated(keep="last")].sort_index()
    
    # Apply date filters
    if start is not None:
        st_ts = pd.Timestamp(start).tz_convert("UTC") if start.tzinfo else pd.Timestamp(start, tz="UTC")
        df = df[df.index >= st_ts]
    if end is not None:
        end_ts = pd.Timestamp(end).tz_convert("UTC") if end.tzinfo else pd.Timestamp(end, tz="UTC")
        df = df[df.index <= end_ts]
        
    if limit_bars is not None and limit_bars > 0 and len(df) > limit_bars:
        df = df.iloc[-limit_bars:]
        
    return df, f"NAU Bybit: {bybit_sym} [{bybit_cat.upper()}] ({display_tf}, {len(df)} Barlar)"
