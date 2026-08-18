---
title: Sistem Mimarisi ve Veri Akışı
type: synthesis
summary: Zimmer VWAP projesinin NAU veri sağlayıcıdan FastAPI motoruna ve TradingView ön yüzüne uzanan uçtan uca mimari haritası.
status: draft
sources:
  - sources/01_project_readme.md
  - sources/02_design_handoff_spec.md
  - sources/03_core_implementation.md
related:
  - module_map
  - api_reference
  - frontend_app
  - server_api
last_updated: 2026-08-18
---

# Sistem Mimarisi ve Veri Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                    NAU Veri Ekosistemi                      │
│     (16 ABD Hissesi NASDAQ/NYSE + 10 Bybit Kripto)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ DuckDB / Parquet
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Arka Uç Sunucusu                    │
│   • nau_data_provider.py (Katalog & Bar Sağlayıcı)         │
│   • dynamic_swing_anchored_vwap.py (DSA-VWAP Motoru)       │
│   • backtest_engine.py (Python Backtest Motoru)             │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST JSON (/api/calculate)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Web Arayüzü (TradingView Engine)                │
│   • Lightweight Charts v4.1 (Mumlar, Hacim, Segmentler)    │
│   • Strateji Test Aracı (Özkaynak Eğrisi, 15 Metrik, CSV)  │
│   • Sağ Parametre Kontrol Paneli (288px)                   │
└─────────────────────────────────────────────────────────────┘
```

## Temel Bileşenler
- [[nau_data_provider]]: Ham piyasa verisini sağlar.
- [[dynamic_swing_anchored_vwap]]: Algoritmik hesaplamaları yürütür.
- [[server_api]]: Veri ve hesaplamayı JSON olarak sunar.
- [[frontend_app]]: Kullanıcıya TradingView kalitesinde etkileşim sağlar.
- [[module_map]]: Kod dosyaları ile doküman haritası.
- [[tutorial_running_backtest]]: Adım adım kullanım kılavuzu.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[frontend_app]]
<!-- BACKLINKS:END -->
