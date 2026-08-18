---
title: Adaptif Periyot Takibi (APT)
type: concept
summary: Piyasa oynaklığına (ATR oranına) göre EWMA yarılanma ömrünü dinamik ayarlayarak göstergeyi hızlandıran veya yumuşatan algoritma.
status: draft
sources:
  - sources/01_project_readme.md
related:
  - dsa_vwap_theory
  - dynamic_swing_anchored_vwap
last_updated: 2026-08-18
---

# Adaptif Periyot Takibi (APT)

Adaptif Periyot Takibi (Adaptive Price Tracking), DSA-VWAP'ın sabit bir periyot yerine anlık piyasa oynaklığına göre tepki vermesini sağlar.

## Matematiksel Formülasyon
- **Gerçek Aralık (True Range)**: $TR = \max(H - L, |H - C_{prev}|, |L - C_{prev}|)$
- **Oynaklık Oranı**: $ATR = \text{RMA}(TR, 50)$, $ATR_{avg} = \text{RMA}(ATR, 50)$, $\text{ratio} = ATR / ATR_{avg}$
- **APT Hesaplama**:
  $$\text{apt}_{raw} = \frac{\text{base\_apt}}{\text{ratio}^{\text{vol\_bias}}}$$
  $$\text{apt} = \text{round}(\text{clip}(\text{apt}_{raw}, 5.0, 300.0))$$
- **Alfa Katsayısı**:
  $$\alpha(\text{apt}) = 1 - \exp\left(-\frac{\ln(2)}{\max(1, \text{apt})}\right)$$

Yüksek volatilite dönemlerinde $\text{ratio} > 1$ olur, $\text{apt}$ küçülür ve gösterge hızlı tepki verir; sakin konsolidasyon dönemlerinde ise $\text{apt}$ büyüyerek pürüzsüzleşir.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[dsa_vwap_theory]]
- [[dynamic_swing_anchored_vwap]]
<!-- BACKLINKS:END -->
