---
title: Modül Haritası ve Kod Köprüsü
type: synthesis
summary: Kaynak kod dosyaları ile wiki sayfaları arasındaki iki yönlü eşleme tablosu ve dosya sorumlulukları.
status: draft
sources:
  - sources/03_core_implementation.md
related:
  - architecture_overview
  - api_reference
last_updated: 2026-08-18
---

# Modül Haritası ve Kod Köprüsü

| Dosya Yolu | Sorumluluk | İlgili Wiki Sayfası |
|---|---|---|
| `dynamic_swing_anchored_vwap.py` | DSA-VWAP çekirdek algoritması, APT ve salınım tespiti | [[dynamic_swing_anchored_vwap]] |
| `backtest_engine.py` | Strateji simülasyonu, emir takibi ve risk metrikleri | [[backtest_engine]] |
| `nau_data_provider.py` | NAU veri kataloğu ve DuckDB/Parquet bar okuyucu | [[nau_data_provider]] |
| `server.py` | FastAPI sunucu, REST API ve no-cache statik dağıtım | [[server_api]] |
| `static/app.js` | Frontend denetleyicisi, TradingView entegrasyonu ve olaylar | [[frontend_app]] |
| `static/engine.js` | İstemci tarafı DSA-VWAP ve backtest hesaplama motoru | [[backtest_engine]] |
| `static/index.html` | Çift modlu web kullanıcı arayüzü iskeleti | [[frontend_app]] |
| `static/style.css` | TradingView temalı CSS tasarım sistemi | [[frontend_app]] |

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[architecture_overview]]
<!-- BACKLINKS:END -->
