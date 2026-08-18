---
title: Backtest Çalıştırma ve Sonuçları Değerlendirme
type: tutorial
summary: Zimmer VWAP arayüzünde adım adım hisse/kripto seçimi, parametre optimizasyonu ve strateji çalıştırma rehberi.
status: draft
sources:
  - sources/01_project_readme.md
  - sources/02_design_handoff_spec.md
related:
  - backtesting_strategy
  - frontend_app
last_updated: 2026-08-18
---

# Backtest Çalıştırma ve Sonuçları Değerlendirme

Bu öğretici, Zimmer VWAP arayüzünde canlı veya sentetik veriler üzerinde backtest çalıştırma adımlarını anlatır.

## 1. Sembol ve Zaman Dilimi Seçimi
1. Üst araç çubuğundaki sembol açılır kutusundan bir ABD Hissesi (örn: `NAU: NVDA`) veya Bybit kripto paritesi (örn: `BTCUSDT`) seçin.
2. Zaman dilimi butonlarından `1h` veya `1D` seçin.

## 2. Strateji Parametrelerinin Ayarlanması
Sağ paneldeki parametreleri stratejinize göre düzenleyin:
- **Salınım Uzunluğu (Swing Len)**: Varsayılan `8` (daha hassas pivotlar için küçültün, ana trendler için büyütün).
- **Bant Çarpanları**: $\pm 1\sigma$ ve $\pm 2\sigma$.
- **Sermaye ve Pozisyon**: Başlangıç sermayesi ($100,000) ve işlem başına risk oranı (%20).
- **Komisyon**: %0.05.

## 3. Çalıştırma ve Analiz
1. **"▶ Backtest Çalıştır"** butonuna tıklayın.
2. Alt paneldeki **Genel Bakış** sekmesinde Özkaynak Eğrisini ve Net Kar, Sharpe, Kazanma Oranı metriklerini inceleyin.
3. **Performans Özeti** sekmesinden brüt kar/zarar ve işlem sayılarına bakın.
4. **İşlem Listesi** sekmesinden tüm alım-satım noktalarını tek tek kontrol edip gerekirse **"⬇ CSV İndir"** butonuyla raporu indirin.

Detaylı strateji kuralları için [[backtesting_strategy]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[architecture_overview]]
<!-- BACKLINKS:END -->
