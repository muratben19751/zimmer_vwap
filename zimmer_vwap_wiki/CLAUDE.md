# zimmer_vwap Wiki — Schema (CLAUDE.md)

Bu wiki, Karpathy'nin **"LLM Knowledge Base / LLM Wiki Pattern"** yaklaşımına göre kurulmuştur (bkz. https://karpathy.bearblog.dev/llm-knowledge-bases/ ve https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). Amaç: **zimmer_vwap** projesi (Zeiierman Dynamic Swing Anchored VWAP, FastAPI hesaplama motoru, NAU veri sağlayıcı ve TradingView Lightweight Charts tabanlı hibrit backtest arayüzü) hakkında bilinen her şeyi, bir LLM ajanının **hem okuyabileceği hem de bakımını yapabileceği** düz-metin bir bilgi tabanında canlı tutmak. Kullanıcı wiki'yi doğrudan düzenlemez — sorular sorar, çıktılar üretir, boşlukları raporlar; LLM sayfaları yazar/günceller.

## Katmanlı Yapı

    zimmer_vwap_wiki/
    ├── CLAUDE.md              # Schema — bu dosya
    ├── index.md               # Kategorik katalog (üretilen, elle düzenlenmez)
    ├── log.md                 # Append-only işlem günlüğü
    ├── sources/               # Katman 1 — Ham, değiştirilmez kaynak snapshot'ları
    ├── wiki/                  # Katman 2 — LLM'in sahibi olduğu sentezlenmiş sayfalar
    │   ├── entities/          # Somut şeyler: bileşenler, modüller, veri kaynakları
    │   ├── concepts/          # Soyut fikirler: mimari desenler, iş akışları
    │   ├── synthesis/         # Sentez: karşılaştırmalar, tavsiyeler, rehberler
    │   └── tutorials/         # Öğreticilerin/kılavuzların sentezleri
    ├── lint/                  # Health-check raporları (YYYY-MM-DD_health.md)
    ├── tools/                 # wiki_tools.py — CLI: index, backlinks, lint, search, stub, resolve
    └── .obsidian/             # (opsiyonel) Obsidian workspace — frontend olarak kullanılabilir

### Katman 1 — `sources/`
- **Sadece okunur.** LLM asla düzenlemez.
- Her dosya frontmatter içermeli: `source`, `retrieved`, `type`, `immutable: true`.
- URL değişse bile içerik korunur; yeni sürüm ayrı dosya olarak eklenir (`05_...`).

### Katman 2 — `wiki/`
- LLM tam sahibidir.
- **Zorunlu frontmatter:** `title`, `type`, `summary`, `sources`, `last_updated`.
- **Opsiyonel:** `status: stub | draft | frozen`, `key_concepts`, `related`.
- Sayfalar arası bağ **bare-name wikilink** biçiminde: `[[core_module]]`, `[[core_module|Çekirdek Modül]]`.

### Katman 3 — Bu dosya (`CLAUDE.md`)
- Şemayı, adlandırma kurallarını ve iş akışlarını tanımlar.

## Frontmatter Referansı

    ---
    title: DynamicSwingAnchoredVWAP
    type: entity
    summary: >-
      Zeiierman DSA-VWAP çekirdek algoritmasını ve salınım tespit mekanizmasını uygulayan Python modülü.
    status: draft
    sources:
      - sources/01_project_readme.md
    related:
      - architecture_overview
      - dsa_vwap_theory
    last_updated: 2026-08-18
    ---

- **`summary` alanı zorunlu.** `tools/wiki_tools.py index` katalog satırlarını buradan üretir.
- **`sources` her zaman Layer 1 kaynak izlenebilirliği içindir.** Yalnızca `sources/*.md` snapshot dosyaları ve URL'ler kabul edilir.
- **`related` opsiyoneldir**; kavramsal komşu wiki sayfalarına referanslar burada tutulur.

## Adlandırma Kuralları

- `entities/` — `snake_case` isimler: `dynamic_swing_anchored_vwap.md`, `backtest_engine.md`, `server_api.md`, `nau_data_provider.md`, `frontend_app.md`
- `concepts/` — Kısa fikir adı: `dsa_vwap_theory.md`, `adaptive_period_tracking.md`, `swing_pivot_detection.md`, `backtesting_strategy.md`
- `synthesis/` — Açıklayıcı başlık: `architecture_overview.md`, `module_map.md`, `api_reference.md`
- `tutorials/` — `tutorial_<slug>.md`
- **Bare slug'lar globalde eşsiz olmalı** — wikilink çözümlemesi stem üzerinden yapılıyor.

## Backlinks

- Her `wiki/` sayfasının sonunda otomatik oluşturulan bir bölüm bulunur:

      <!-- BACKLINKS:BEGIN -->
      ## Referenced by
      - [[architecture_overview]]
      <!-- BACKLINKS:END -->

- Bu bölüm `tools/wiki_tools.py backlinks` çağrısı ile idempotent şekilde yeniden yazılır. **Elle düzenlemeyin.**

## Temel Operasyonlar

### Ingest (Yeni kaynak ekleme)
1. Kaynağı `sources/NN_slug.md` olarak indir, frontmatter ile.
2. Yeni fikir/varlıkları çıkar → ilgili wiki sayfalarını güncelle veya `tools/wiki_tools.py stub <slug> <kind> "Title"` ile stub oluştur.
3. Her sayfanın `summary`, `sources`, `last_updated` alanlarını yenile.
4. `python tools/wiki_tools.py backlinks && python tools/wiki_tools.py index` çalıştır.
5. Çelişkiler + yeni gap'ler `log.md`'ye append.

### Query (Sorgu)
1. `python tools/wiki_tools.py search "query"` ile kaba sıralama al.
2. `python tools/wiki_tools.py show <slug>` veya `resolve <slug>` ile sayfaya git.
3. Cevapta citation kullan (`(kaynak: sources/01_project_readme.md)`).
4. Sentezleri `synthesis/`'e yeni sayfa olarak dosyala; `summary` ve `sources` doldur; backlinks/index tazele.

### Lint (Periyodik sağlık kontrolü)
- `python tools/wiki_tools.py lint` → konsol raporu.
- `python tools/wiki_tools.py lint --write --date=YYYY-MM-DD` → `lint/YYYY-MM-DD_health.md` yazar.

## Konu Sınırları (Scope)

Bu wiki **zimmer_vwap** projesinin kendisi hakkındadır:
- **Zeiierman Dynamic Swing Anchored VWAP (DSA-VWAP)** algoritması, adaptif periyot takibi (APT), salınım (swing HH/HL/LH/LL) tespiti ve re-anchor matematiği.
- **Backtest Motoru**: Bant çaprazlamaları, filtreler, emir yürütme, sermaye, komisyon, risk yönetimi ve performans metrikleri (Net Kar, Sharpe, Win Rate, Max DD).
- **Veri Entegrasyonu**: NAU ekosistemi (US hisseleri ve Bybit kripto verisi), Yahoo Finance ve Sentetik veri sağlayıcıları.
- **FastAPI Backend & Mimari**: REST API (`/api/calculate`, `/api/nau/catalog`, `/api/nau/bars`), no-cache sunucu yapısı, PM2 yönetimi.
- **TradingView Lightweight Charts & Handoff Arayüzü**: Hibrit Kompakt Backtester ve Genişletilmiş Terminal görünümleri, Strateji Test panelleri.
- Projeye ait olmayan genel finansal teori kapsam dışıdır.

## Sürüm Notu

Sürüme özgü iddialar ilgili sürüm etiketiyle işaretlenmelidir. `sources/` içindeki `retrieved` tarihi 180 günden eskise sayfa `status: stale` olarak işaretlenmeli.
