# Zimmer Vwap Wiki — İçerik Kataloğu

Bu sayfa `tools/wiki_tools.py index` tarafından her sayfanın frontmatter'ından yeniden üretilir. Elle düzenlemeyin.

## Kaynaklar (immutable)
- [[01_project_readme|01 Project Readme]]  (`sources/01_project_readme.md`)
- [[02_design_handoff_spec|02 Design Handoff Spec]]  (`sources/02_design_handoff_spec.md`)
- [[03_core_implementation|03 Core Implementation]]  (`sources/03_core_implementation.md`)

## Entities (somut bileşenler)
- [[backtest_engine|Backtest Motoru]] — DSA-VWAP sinyalleri ve bant temasları üzerinde pozisyon, komisyon, risk yönetimi ve performans metriklerini simüle eden motor.  (`wiki/entities/backtest_engine.md`)
- [[dynamic_swing_anchored_vwap|Dynamic Swing Anchored VWAP Modülü]] — Zeiierman DSA-VWAP çekirdek algoritmasını, volatilite uyarlamalı APT ve salınım tabanlı re-anchor matematiğini uygulayan Python motoru.  (`wiki/entities/dynamic_swing_anchored_vwap.md`)
- [[frontend_app|Web Arayüzü ve TradingView Motoru]] — TradingView Lightweight Charts v4, çift modlu görünüm ve 272px Strateji Test Aracı içeren yüksek doğruluklu web ön yüzü.  (`wiki/entities/frontend_app.md`)
- [[nau_data_provider|NAU Veri Sağlayıcı]] — NAU Ekosistemi DuckDB/Parquet depolarından ABD hisseleri ve Bybit kripto verilerini sunan veri sağlayıcı katmanı.  (`wiki/entities/nau_data_provider.md`)
- [[server_api|FastAPI Sunucu ve REST API]] — FastAPI tabanlı REST uç noktalarını ve önbelleksiz statik dosya sunumunu yöneten arka uç sunucusu.  (`wiki/entities/server_api.md`)

## Concepts (soyut fikirler)
- [[adaptive_period_tracking|Adaptif Periyot Takibi (APT)]] — Piyasa oynaklığına (ATR oranına) göre EWMA yarılanma ömrünü dinamik ayarlayarak göstergeyi hızlandıran veya yumuşatan algoritma.  (`wiki/concepts/adaptive_period_tracking.md`)
- [[backtesting_strategy|DSA-VWAP Backtest Stratejileri]] — DSA-VWAP rejim dönüşleri ve standart sapma bantları üzerinde çalışan nicel alım-satım ve risk yönetimi kuralları.  (`wiki/concepts/backtesting_strategy.md`)
- [[dsa_vwap_theory|Dynamic Swing Anchored VWAP Teorisi]] — Geleneksel sabit takvimli VWAP yerine piyasa yapısı salınımlarına dinamik olarak yeniden çapalanan hacim ağırlıklı ortalama fiyat teorisi.  (`wiki/concepts/dsa_vwap_theory.md`)
- [[swing_pivot_detection|Salınım Pivot Tespiti ve Piyasa Yapısı]] — Fiyat serisindeki yerel tepe ve dipleri tespit ederek HH, HL, LH, LL piyasa yapısı etiketlerini üreten algoritma.  (`wiki/concepts/swing_pivot_detection.md`)

## Synthesis (karşılaştırmalar & rehberler)
- [[api_reference|REST API Referansı]] — FastAPI sunucusunun sunduğu tüm REST uç noktalarının istek, parametre ve yanıt şemaları.  (`wiki/synthesis/api_reference.md`)
- [[architecture_overview|Sistem Mimarisi ve Veri Akışı]] — Zimmer VWAP projesinin NAU veri sağlayıcıdan FastAPI motoruna ve TradingView ön yüzüne uzanan uçtan uca mimari haritası.  (`wiki/synthesis/architecture_overview.md`)
- [[module_map|Modül Haritası ve Kod Köprüsü]] — Kaynak kod dosyaları ile wiki sayfaları arasındaki iki yönlü eşleme tablosu ve dosya sorumlulukları.  (`wiki/synthesis/module_map.md`)

## Tutorials (resmi öğreticiler)
- [[tutorial_running_backtest|Backtest Çalıştırma ve Sonuçları Değerlendirme]] — Zimmer VWAP arayüzünde adım adım hisse/kripto seçimi, parametre optimizasyonu ve strateji çalıştırma rehberi.  (`wiki/tutorials/tutorial_running_backtest.md`)
