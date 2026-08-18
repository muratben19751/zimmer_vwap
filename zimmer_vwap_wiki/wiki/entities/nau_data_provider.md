---
title: NAU Veri Sağlayıcı
type: entity
summary: NAU Ekosistemi DuckDB/Parquet depolarından ABD hisseleri ve Bybit kripto verilerini sunan veri sağlayıcı katmanı.
status: draft
sources:
  - sources/03_core_implementation.md
related:
  - server_api
  - architecture_overview
last_updated: 2026-08-18
---

# NAU Veri Sağlayıcı

`nau_data_provider.py` modülü, `C:/myAI_Projects/shared_data` ve yerel NAU DuckDB/Parquet dizinlerini otomatik tarar.

## Özellikleri
- **Katalog Keşfi**: 16 adet ABD hisse senedi (`NVDA`, `AAPL`, `TSLA`, `AA` vb.) ve 10 Bybit kripto parite (`BTCUSDT`, `ETHUSDT`, `SOLUSDT` - Linear/Spot/Inverse) kataloğunu bar sayılarıyla birlikte döndürür.
- **Dirençli Yedekleme**: DuckDB veya disk bağlantısı geçici olarak kapalı olsa bile `HARDCODED_EQUITIES` ve `HARDCODED_BYBIT` listeleriyle kesintisiz çalışmayı garanti eder.
- **Bar Dönüşümü**: Parquet/DuckDB kayıtlarını saniyeler içinde TradingView standartlarında `{time, open, high, low, close, volume}` listelerine dönüştürür.

API entegrasyonu için [[server_api]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[architecture_overview]]
- [[module_map]]
<!-- BACKLINKS:END -->
