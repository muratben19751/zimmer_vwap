---
title: Dynamic Swing Anchored VWAP Teorisi
type: concept
summary: Geleneksel sabit takvimli VWAP yerine piyasa yapısı salınımlarına dinamik olarak yeniden çapalanan hacim ağırlıklı ortalama fiyat teorisi.
status: draft
sources:
  - sources/01_project_readme.md
related:
  - dynamic_swing_anchored_vwap
  - adaptive_period_tracking
  - swing_pivot_detection
last_updated: 2026-08-18
---

# Dynamic Swing Anchored VWAP Teorisi

Geleneksel VWAP göstergeleri gün başlangıcı, hafta açılışı gibi keyfi takvim saatlerine sabitlenir. Bu durum seans ilerledikçe veya trend oluştukça göstergenin piyasa yapısından kopmasına yol açar.

## Temel İlkeler
1. **Piyasa Yapısı Çapası**: Çapa, takvim saatine değil piyasanın oluşturduğu gerçek tepe (`ph`) veya dip (`pl`) salınım noktasına konur.
2. **Re-Anchor Mekanizması**: Yön boğadan ayıya geçtiğinde en son yüksek tepeye, ayıdan boğaya geçtiğinde en son alçak dipe sıfırlanarak ileriye doğru yeniden hesaplanır.
3. **Eksponansiyel Sönümlenme (Decay)**: Eski barların etkisi $\alpha$ sönümlenme katsayısı ile yumuşatılır:
   $$p_b = (1 - \alpha_b) \cdot p_{b-1} + \alpha_b \cdot (\text{hlc3}_b \cdot \text{vol}_b)$$
   $$v_b = (1 - \alpha_b) \cdot v_{b-1} + \alpha_b \cdot \text{vol}_b$$
   $$\text{DSAVWAP}_b = p_b / v_b$$

Detaylı adaptasyon için [[adaptive_period_tracking]] sayfasına bakın.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[dynamic_swing_anchored_vwap]]
<!-- BACKLINKS:END -->
