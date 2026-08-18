---
title: Dynamic Swing Anchored VWAP Modülü
type: entity
summary: Zeiierman DSA-VWAP çekirdek algoritmasını, volatilite uyarlamalı APT ve salınım tabanlı re-anchor matematiğini uygulayan Python motoru.
status: draft
sources:
  - sources/01_project_readme.md
  - sources/03_core_implementation.md
related:
  - dsa_vwap_theory
  - adaptive_period_tracking
  - swing_pivot_detection
last_updated: 2026-08-18
---

# Dynamic Swing Anchored VWAP Modülü

Bu modül (`dynamic_swing_anchored_vwap.py`), TradingView platformundaki Zeiierman DSA-VWAP indikatörünün Python 3.11+ re-implementasyonudur.

## Temel Görevleri
1. **Salınım Uç Noktalarını Tespiti**: Gecikmesiz salınım tepe (`ph`) ve dip (`pl`) tespiti.
2. **Dinamik Çapalanma (Re-Anchoring)**: Piyasa yapısı yön değiştirdiğinde (`dir != dir_prev`) hesaplama başlangıcını tepe/dip noktasına sıfırlar ve ileriye doğru yeniden hesaplar.
3. **Volatilite Uyarlamalı Ağırlıklandırma (APT)**: ATR oranına göre EWMA yarılanma ömrünü dinamik ölçekler.

## Ana Fonksiyon
```python
def dynamic_swing_anchored_vwap(
    df: pd.DataFrame,
    swing_period: int = 50,
    base_apt: float = 20.0,
    use_adapt: bool = True,
    vol_bias: float = 10.0
) -> pd.DataFrame
```

Daha fazla teorik arka plan için [[dsa_vwap_theory]], [[adaptive_period_tracking]] ve [[swing_pivot_detection]] sayfalarına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[architecture_overview]]
- [[module_map]]
<!-- BACKLINKS:END -->
