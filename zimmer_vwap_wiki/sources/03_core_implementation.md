---
source: repo:dynamic_swing_anchored_vwap.py,backtest_engine.py,nau_data_provider.py,server.py
retrieved: 2026-08-18
type: api
immutable: true
---

# Core Implementation Summary

## 1. `dynamic_swing_anchored_vwap.py`
- Main function: `dynamic_swing_anchored_vwap(df, swing_period=50, base_apt=20.0, use_adapt=True, vol_bias=10.0) -> pd.DataFrame`
- Forward recomputing anchor reset algorithm when `phL` vs `plL` flips.
- Returns DataFrame with `dsavwap`, `dir`, `segment_id`, `anchor`, `swing_label`, `apt`.

## 2. `backtest_engine.py`
- Strategy simulator: `run_dsavwap_backtest(...)` and client-side JavaScript mirroring in `static/engine.js`.
- Tracks position state, execution fills, commission deduction, stop-loss / take-profit, PnL calculations, equity series, and risk metrics.

## 3. `nau_data_provider.py`
- Discovers and queries NAU ecosystem catalogs (`C:/myAI_Projects/shared_data` and DuckDB/Parquet stores).
- Serves 16 NASDAQ/NYSE US equities (`NVDA`, `AAPL`, `TSLA`, `AA`, etc.) and Bybit Linear/Spot/Inverse crypto pairs.

## 4. `server.py`
- FastAPI server running on port 8000 with endpoints:
  - `POST /api/calculate`: Computes candles, volumes, vwap_points, anchors, metrics, backtest signals.
  - `GET /api/nau/catalog`: Returns available equities and cryptos with bar counts.
  - `GET /api/nau/bars`: Returns raw OHLCV bars.
- `NoCacheStaticFiles` Starlette subclass delivering instant front-end updates with `Cache-Control: no-cache`.
