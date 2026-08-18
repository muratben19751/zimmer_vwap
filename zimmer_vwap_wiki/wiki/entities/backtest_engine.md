---
title: Backtest Motoru
type: entity
summary: DSA-VWAP sinyalleri ve bant temasları üzerinde pozisyon, komisyon, risk yönetimi ve performans metriklerini simüle eden motor.
status: draft
sources:
  - sources/01_project_readme.md
  - sources/03_core_implementation.md
related:
  - backtesting_strategy
  - dynamic_swing_anchored_vwap
last_updated: 2026-08-18
---

# Backtest Motoru

`backtest_engine.py` modülü (ve istemci tarafındaki `static/engine.js` aynası), DSA-VWAP rejimleri ve standart sapma bantları üzerinde nicel alım-satım stratejilerini geriye dönük test eder.

## Desteklenen Mantıklar
- **Rejim / Pivot Dönüşü**: Yön boğaya döndüğünde Uzun, ayıya döndüğünde Kısa pozisyon açma.
- **Bant Ortalamaya Dönüş**: Fiyat $\pm 1\sigma$ veya $\pm 2\sigma$ bantlarına değdiğinde dönüş yönünde işlem.
- **Risk Yönetimi**: Sabit yüzde Stop Loss, Take Profit, Trailing Stop ve komisyon hesaplaması.

## Çıktı Metrikleri
- Net Kar ($ ve %)
- Kazanma Oranı (Win Rate %)
- Profit Factor
- Maksimum Düşüş (Max Drawdown $ ve %)
- Yıllıklandırılmış Sharpe ve Sortino Oranları

Strateji ayrıntıları için [[backtesting_strategy]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[backtesting_strategy]]
- [[module_map]]
<!-- BACKLINKS:END -->
