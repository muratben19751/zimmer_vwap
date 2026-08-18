---
title: Web Arayüzü ve TradingView Motoru
type: entity
summary: TradingView Lightweight Charts v4, çift modlu görünüm ve 272px Strateji Test Aracı içeren yüksek doğruluklu web ön yüzü.
status: draft
sources:
  - sources/02_design_handoff_spec.md
  - sources/03_core_implementation.md
related:
  - architecture_overview
  - backtesting_strategy
last_updated: 2026-08-18
---

# Web Arayüzü ve TradingView Motoru

`static/` altındaki `index.html`, `app.js`, `engine.js` ve `style.css` dosyalarından oluşan istemci katmanıdır.

## Temel Bölümler
1. **Üst Araç Çubuğu (48px)**: Sembol seçici (NAU ABD Hisseleri ve Bybit Kripto), 5m-1D zaman dilimleri, tarih filtresi, tema seçici (Açık, Koyu, Terminal).
2. **Ana Grafik Alanı**: TradingView Lightweight Charts (v4.1) kütüphanesi ile akıcı mumlar, hacim histogramı, yeşil/kırmızı DSA-VWAP segmentleri ve `HH, HL, LH, LL` pivot okları.
3. **Strateji Test Aracı (272px)**:
   - **Genel Bakış**: 3×2 KPI kartları ve dinamik DPR Özkaynak Eğrisi (Equity Curve).
   - **Performans Özeti**: 15 kalemlik kurumsal performans raporu.
   - **İşlem Listesi**: Giriş/çıkış fiyatları, net K/Z ve CSV dışa aktarımı.
4. **Sağ Parametre Paneli (288px)**: Salınım uzunluğu, standart sapma çarpanları, sermaye ve komisyon ayarları.

Mimari detaylar için [[architecture_overview]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[architecture_overview]]
- [[module_map]]
<!-- BACKLINKS:END -->
