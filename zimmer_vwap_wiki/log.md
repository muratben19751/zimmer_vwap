# zimmer_vwap Wiki İşlem Günlüğü (append-only)

Bu dosya, wiki üzerinde yapılan tüm senkronizasyon, ekleme, düzeltme ve analiz işlemlerinin kronolojik kaydını tutar.

## [2026-08-18] — Wiki Bootstrap ve İlk Senkronizasyon (v1.0)
- **Olay:** Karpathy LLM Knowledge Base deseni ile `zimmer_vwap_wiki` deposu kuruldu.
- **Kaynaklar Eklendi (Katman 1):**
  - `sources/01_project_readme.md` (Proje genel dokümantasyonu)
  - `sources/02_design_handoff_spec.md` (Handoff tasarım ve TradingView spesifikasyonları)
  - `sources/03_core_implementation.md` (DSA-VWAP, Backtest motoru ve NAU sağlayıcı kaynak kodu snapshot'ı)
- **Varlıklar (Entities) Oluşturuldu (Katman 2):**
  - `dynamic_swing_anchored_vwap`: DSA-VWAP çekirdek algoritması ve APT motoru
  - `backtest_engine`: Strateji simülasyonu, emir yürütme ve metrik hesaplama
  - `nau_data_provider`: NAU DuckDB/Parquet kataloğu ve Bybit veri entegrasyonu
  - `server_api`: FastAPI REST API ve statik dosya sunucusu
  - `frontend_app`: TradingView Lightweight Charts & Strateji Test Aracı arayüzü
- **Kavramlar (Concepts) Oluşturuldu (Katman 2):**
  - `dsa_vwap_theory`: Dinamik salınım çapalı VWAP matematiği ve re-anchor kuralları
  - `adaptive_period_tracking`: Volatiliteye göre salınım uzunluğunun dinamik uyarlanması
  - `swing_pivot_detection`: Tepe (HH, LH) ve Dip (LL, HL) tespiti algoritması
  - `backtesting_strategy`: VWAP bantları ve ortalamaya dönüş alım-satım stratejisi
- **Sentezler (Synthesis) Oluşturuldu (Katman 2):**
  - `architecture_overview`: Uçtan uca sistem mimarisi ve veri akış diyagramı
  - `module_map`: Modül sorumlulukları ve kaynak kod çapraz referans haritası
  - `api_reference`: FastAPI REST uç noktaları ve istek/yanıt şemaları
- **Tutorials:**
  - `tutorial_running_backtest`: Sıfırdan backtest çalıştırma ve sonuçları yorumlama rehberi
- **Lint Durumu:** İlk geçiş tamamlandı.

## [2026-08-18] — Özellik Güncellemesi: Terminal Varsayılanı, 3 Yıl Aralığı, Buy&Hold, Kum Saati & Pivot Tetikleyicileri
- **İlk Açılış:** Varsayılan görünüm modu `terminal` (Genişletilmiş Terminal) olarak ayarlandı.
- **Tarih Aralığı:** Varsayılan tarih aralığı bugünden geriye 3 yıl (`DEF_DATE_FROM` / `DEF_DATE_TO`) yapıldı.
- **Buy & Hold Benchmark:** Genel Bakış KPI kartlarına, Özkaynak Eğrisi grafiğine (mor kesikli çizgi) ve Performans Özeti tablosuna Buy & Hold getirisi eklendi.
- **Kum Saati Animasyonu:** Hesaplama sırasında dönen kum saati (`⏳`, `hourglass-flip` keyframes) göstergesi üst çubuğa ve butonlara eklendi.
- **Pivot Tetikleyicileri:** Sağ parametre paneline HH, HL, LH, LL onay kutuları eklendi (tümü varsayılan seçili). Seçilen pivotlara göre alım/satım filtrelemesi devreye alındı.
- **Genel Bakış Birleştirmesi:** Genel Bakış (Overview) paneli hem Genişletilmiş Terminal altına hem de Kompakt Backtester altına entegre edildi. NAU QQQ varsayılan sembol olarak bağlandı.
- **Varsayılan Görünüm:** İlk açılış varsayılanı Kompakt Backtester (`handoff`) moduna ayarlandı.



