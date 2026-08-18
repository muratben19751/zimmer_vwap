---
title: REST API Referansı
type: synthesis
summary: FastAPI sunucusunun sunduğu tüm REST uç noktalarının istek, parametre ve yanıt şemaları.
status: draft
sources:
  - sources/03_core_implementation.md
related:
  - server_api
  - nau_data_provider
last_updated: 2026-08-18
---

# REST API Referansı

## 1. `POST /api/calculate`
DSA-VWAP hesaplaması ve piyasa verisini döndürür.

### İstek Gövdesi (JSON)
```json
{
  "data_source": "nau",
  "nau_symbol": "NVDA",
  "nau_category": "equity",
  "nau_source": "equity_catalog",
  "nau_timeframe": "1h",
  "nau_limit_bars": 1000,
  "swing_period": 50,
  "base_apt": 20.0,
  "use_adapt": true,
  "vol_bias": 10.0
}
```

### Yanıt Yapısı
- `source`: Sembol ve bar bilgisi metni (örn: `NAU Equity: NVDA (1h, 1000 Barlar)`)
- `candles`: TradingView uyumlu `{time, open, high, low, close}` listesi
- `volumes`: `{time, value, color}` listesi
- `vwap_points`: `{time, value, dir, segment_id, apt}` listesi
- `anchors`: `{time, position, color, shape, label, price}` pivot listesi
- `metrics`: Son fiyat, VWAP farkı, rejim ve son çapa özeti

## 2. `GET /api/nau/catalog`
Mevcut NAU hisselerini (`equities`) ve Bybit kripto çiftlerini (`bybit`) bar sayılarıyla listeler.

## 3. `GET /api/nau/bars`
Seçilen sembol için doğrudan OHLCV barlarını döndürür.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[server_api]]
<!-- BACKLINKS:END -->
