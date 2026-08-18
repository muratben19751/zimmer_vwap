---
title: FastAPI Sunucu ve REST API
type: entity
summary: FastAPI tabanlı REST uç noktalarını ve önbelleksiz statik dosya sunumunu yöneten arka uç sunucusu.
status: draft
sources:
  - sources/03_core_implementation.md
related:
  - api_reference
  - nau_data_provider
  - dynamic_swing_anchored_vwap
last_updated: 2026-08-18
---

# FastAPI Sunucu ve REST API

`server.py`, uygulamanın arka uç REST API hizmetini ve web arayüzü sunumunu yönetir.

## Temel Bileşenler
- **`NoCacheStaticFiles`**: `StaticFiles` sınıfından türetilerek tüm JS/CSS/HTML varlıkları için `Cache-Control: no-cache, no-store, must-revalidate` başlıklarını zorlar; tarayıcı önbellek kilitlenmelerini önler.
- **`POST /api/calculate`**: DSA-VWAP, hacim, pivot çapaları, segmentler ve metrikleri tek bir JSON çağrısında döndürür.
- **`GET /api/nau/catalog`**: NAU hisse ve kripto sembol kataloğunu listeler.
- **`GET /api/nau/bars`**: Seçilen sembol için ham OHLCV barlarını döndürür.

Uç nokta şemaları için [[api_reference]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[architecture_overview]]
- [[module_map]]
- [[nau_data_provider]]
<!-- BACKLINKS:END -->
