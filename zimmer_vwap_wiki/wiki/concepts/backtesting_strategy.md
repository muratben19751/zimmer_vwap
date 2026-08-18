---
title: DSA-VWAP Backtest Stratejileri
type: concept
summary: DSA-VWAP rejim dönüşleri ve standart sapma bantları üzerinde çalışan nicel alım-satım ve risk yönetimi kuralları.
status: draft
sources:
  - sources/01_project_readme.md
  - sources/02_design_handoff_spec.md
related:
  - backtest_engine
  - frontend_app
last_updated: 2026-08-18
---

# DSA-VWAP Backtest Stratejileri

## Strateji Tipleri
1. **Rejim / Pivot Dönüşü (Pivot Flip)**:
   - Ayıdan Boğaya geçişte (`dir` -1'den +1'e döndüğünde) Alış (Long).
   - Boğadan Ayıya geçişte (`dir` +1'den -1'e döndüğünde) Satış (Short).
2. **Bant Ortalamaya Dönüş (Band Mean Reversion)**:
   - Fiyat alt banda ($\text{VWAP} - m_2 \cdot \sigma$) dokunduğunda Long açılışı.
   - Fiyat üst banda ($\text{VWAP} + m_2 \cdot \sigma$) dokunduğunda Short açılışı.
   - Kar alımı orta VWAP çizgisine dönüldüğünde tetiklenir.
3. **Seçilebilir Pivot Tetikleyicileri (HH, HL, LH, LL)**:
   - Kullanıcı stratejinin yalnızca belirli piyasa yapısı pivotlarında (örneğin sadece `HL` ve `LL` diplerinde veya `HH` ve `LH` tepelerinde) işlem açmasını seçebilir.

## Risk Yönetimi ve Kıyaslama
- **Pozisyon Büyüklüğü**: Toplam sermayenin yüzde cinsinden (`sizePct`, varsayılan %20) bir kısmı ile işlem açılır.
- **Komisyon Modeli**: Her işlemde alış ve satışta varsayılan %0.05 oranında komisyon kesilir.
- **Buy & Hold Kıyaslaması (Benchmark)**: Strateji özkaynak eğrisi, aynı dönemdeki Al ve Tut (Buy & Hold) getirisiyle görsel ve sayısal olarak kıyaslanır.
- **Performans Ölçümü**: Sermaye eğrisi üzerinden Maksimum Düşüş (MDD), Sharpe Oranı, Kazanma Oranı ve Kar Faktörü hesaplanır.

Uygulama ayrıntıları için [[backtest_engine]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[backtest_engine]]
- [[tutorial_running_backtest]]
<!-- BACKLINKS:END -->
