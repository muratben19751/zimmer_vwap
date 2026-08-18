---
title: Salınım Pivot Tespiti ve Piyasa Yapısı
type: concept
summary: Fiyat serisindeki yerel tepe ve dipleri tespit ederek HH, HL, LH, LL piyasa yapısı etiketlerini üreten algoritma.
status: draft
sources:
  - sources/01_project_readme.md
related:
  - dsa_vwap_theory
  - dynamic_swing_anchored_vwap
last_updated: 2026-08-18
---

# Salınım Pivot Tespiti ve Piyasa Yapısı

Salınım Motoru, `prd` (swing period) geriye bakış penceresi içinde yerel uç noktaları takip eder:

## Pivot Etiketleri
- **HH (Higher High)**: Önceki tepe seviyesinden daha yüksekte oluşan tepe.
- **LH (Lower High)**: Önceki tepeden daha alçakta kalan tepe (ayı yapısı).
- **LL (Lower Low)**: Önceki dip seviyesinden daha aşağı inen dip.
- **HL (Higher Low)**: Önceki dipten daha yukarıda oluşan dip (boğa yapısı).

## Yön Belirleme Kuralı
- `phL`: En yüksek tepenin bar indeksi.
- `plL`: En düşük dibin bar indeksi.
- Eğer `phL > plL` ise yön **Boğa (`dir = +1`)**, değilse yön **Ayı (`dir = -1`)** olarak belirlenir.

<!-- BACKLINKS:BEGIN -->
## Referenced by

- [[dynamic_swing_anchored_vwap]]
<!-- BACKLINKS:END -->
