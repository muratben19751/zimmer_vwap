# Handoff: Zimmer VWAP Backtester

## Overview
TradingView tarzı, koyu/açık temalı bir **strateji backtest arayüzü**. Strateji: **Dynamic Swing Anchored VWAP** — VWAP her onaylanmış swing dip/tepe noktasına yeniden çapalanır; fiyat dip-çapalı VWAP'ı yukarı kestiğinde uzun, tepe-çapalı VWAP'ı aşağı kestiğinde kısa pozisyon açılır. Çıkış: ±2σ hedef, ∓1σ stop veya ters sinyal.

Ana sürüm **Light** temadır. `arsiv/` altında Koyu (TradingView) ve Terminal (mono + amber) varyantları vardır.

## About the Design Files
Bu paketteki dosyalar **HTML ile hazırlanmış tasarım referanslarıdır** — amaçlanan görünümü ve davranışı gösteren prototiplerdir, doğrudan üretime kopyalanacak kod değildir. Görev: bu tasarımları hedef kod tabanının mevcut ortamında (React, Vue, Qt, native vb.) o ortamın yerleşik kalıpları ve kütüphaneleriyle **yeniden üretmektir**. Ortam yoksa projeye en uygun framework seçilip orada uygulanmalıdır. Kullanıcının mevcut `zimmer_vwap` Python/yerel projesine entegre edilecekse, grafik katmanı için lightweight-charts veya eşdeğeri kullanılabilir; hesap motoru `engine.js` referans alınarak porte edilmelidir.

## Fidelity
**High-fidelity (hifi)**: Renkler, tipografi, boşluklar ve etkileşimler nihaidir. Geliştirici UI'ı piksel hassasiyetinde, kendi kod tabanının kütüphaneleriyle yeniden üretmelidir. Veri katmanı sentetiktir (demo) — gerçek OHLCV verisiyle değiştirilmelidir.

## Screens / Views

### Tek ekran: Backtester (masaüstü, tam viewport)
Dikey flex: **Üst araç çubuğu (48px) → Ana satır (flex:1) → Durum çubuğu (26px)**.
Ana satır: **Grafik sütunu (flex:1)** + **Sağ parametre paneli (288px, sabit)**.
Grafik sütunu: **Grafik canvas'ı (flex:1)** + **Strateji Test Aracı alt paneli (272px, sabit)**.

#### 1. Üst araç çubuğu
- Yükseklik 48px, padding 0 12px, gap 12px, arka plan `#f7f8fb`, alt kenarlık 1px `#e0e3eb`.
- Logo: 28×28px, radius 6px, arka plan `#2962ff`, beyaz "Z" (700, 15px).
- Başlık: "Zimmer VWAP" (700, 13px, `#131722`) + alt satır "Dynamic Swing Anchored VWAP · Backtester" (10px, `#6f737f`).
- Dikey ayraç: 1×24px `#e0e3eb`.
- **Sembol seçici** (select): BTCUSDT / ETHUSDT / SOLUSDT / XAUUSD / EURUSD. Arka plan `#ffffff`, kenarlık 1px `#e0e3eb`, radius 4px, padding 6px 8px, 13px 600.
- **Zaman dilimi segmenti**: 5m · 15m · 1h · 4h · 1D. Kap: kenarlık 1px `#e0e3eb`, radius 4px, padding 2px. Buton: padding 4px 9px, radius 3px, 12px 600; aktif: arka plan `#e0e3eb`, metin `#131722`; pasif: transparan, `#6f737f`.
- **Tarih aralığı**: "Aralık" etiketi (11px `#6f737f`) + iki `date` input (11px) + "→".
- Sağda: "Son çalıştırma: HH:MM:SS" (11px `#6f737f`) + **"▶ Backtest Çalıştır"** butonu: arka plan `#2962ff`, hover `#1e53e5`, beyaz 12px 700, padding 8px 16px, radius 4px.

#### 2. Grafik alanı (canvas)
- Arka plan `#ffffff`. Sağda 62px fiyat ekseni, altta 24px zaman ekseni; eksen ayırıcı çizgiler `#e0e3eb`, grid `#eef0f5`, eksen yazıları 10px `#6f737f`.
- **Mumlar**: yükseliş `#089981`, düşüş `#f23645`; gövde genişliği bar aralığının %70'i (1–11px), fitiller 1px.
- **Hacim**: alt %15 bant; renkler `rgba(8,153,129,.28)` / `rgba(242,54,69,.28)`.
- **VWAP**: 1.6px çizgi; dip çapalıysa `#089981`, tepe çapalıysa `#f23645`. Her yeni çapada çizgi kırılır (segment).
- **Bantlar**: ±1σ düz çizgi `rgba(41,98,255,.4)`, ±2σ kesikli (4,4) `rgba(41,98,255,.25)`, ±1σ arası dolgu `rgba(41,98,255,.07)`.
- **Çapa işaretleri**: swing pivotunda 10px elmas, çapa rengiyle.
- **İşlem işaretleri**: uzun giriş — barın altında yukarı üçgen `#089981`; kısa giriş — barın üstünde aşağı üçgen `#f23645`; çıkış — 6×6px gri kare `#50535e`; giriş→çıkış kesikli bağlantı (3,3), kârda `rgba(8,153,129,.55)` zararda `rgba(242,54,69,.55)`.
- **Crosshair**: kesikli (4,4) `#758696`; fiyat/zaman etiketleri koyu kutu `#363a45`, beyaz 10px metin.
- **Lejant** (sol üst): satır 1 "SYMBOL · TF · Zimmer VWAP Stratejisi" (700 12px `#131722`); satır 2 A/Y/D/K değerleri (11px, mum rengiyle); satır 3 VWAP değeri + çapa türü ve zamanı + ±1σ değerleri.

#### 3. Strateji Test Aracı (alt panel, 272px)
- Sekme çubuğu 34px, arka plan `#f7f8fb`, alt kenarlık `#e0e3eb`. Başlık "Strateji Test Aracı" (700 12px). Sekmeler: **Genel Bakış / Performans Özeti / İşlem Listesi (n)** — aktif: `#2962ff` metin + 2px alt çizgi; pasif `#6f737f`.
- **Genel Bakış**: solda 452px genişlikte 3×2 metrik kartları (arka plan `#f7f8fb`, kenarlık `#e0e3eb`, radius 6px, padding 10px 12px; etiket 10px uppercase `#6f737f`; değer 17px 700 monospace; alt bilgi 10px). Kartlar: Net Kar, Toplam İşlem, Kazanma Oranı, Profit Factor, Maks. Düşüş, Sharpe Oranı. Sağda **özkaynak eğrisi** canvas'ı: `#2962ff` 1.6px çizgi + dikeyde şeffaflaşan mavi dolgu; başlangıç sermayesi kesikli referans çizgisi.
- **Performans Özeti**: 3 sütunlu grid (gap 0 40px); her satır etiket (12px `#50535e`) + değer (12px 600 monospace, renkli), alt kenarlık `#eef0f5`. 15 kalem: Net Kar, Brüt Kar, Brüt Zarar, Profit Factor, Toplam Komisyon, Ortalama İşlem, Toplam/Kazanan/Kaybeden İşlem, Kazanma Oranı, Uzun/Kısa İşlem, Maks. Düşüş ($/%), Sharpe.
- **İşlem Listesi**: grid kolonları `32px 48px minmax(90px,1fr) 84px minmax(90px,1fr) 84px 96px 92px 60px 92px`; başlık sticky, 10px uppercase; satırlar 12px monospace, hover arka planı `#f7f8fb`, `white-space:nowrap`. Kolonlar: # / Yön / Giriş Zamanı / Giriş / Çıkış Zamanı / Çıkış / Neden / K/Z ($) / K/Z % / Kümülatif. Uzun `#089981`, Kısa `#f23645`; K/Z işaretli (+/−$).

#### 4. Sağ parametre paneli (288px)
- Arka plan `#f7f8fb`, sol kenarlık `#e0e3eb`, dikey scroll.
- Bölüm başlıkları: "STRATEJİ PARAMETRELERİ", "EMİR AYARLARI" (10px 700, letter-spacing .6px, `#6f737f`).
- Satır: etiket (12px `#50535e`) + sağda 84px number input (monospace, sağa hizalı). Alanlar: Swing Uzunluğu (bar), Bant 1 · σ çarpanı, Bant 2 · σ çarpanı, İşlem Yönü (select: Uzun+Kısa / Sadece Uzun / Sadece Kısa), Sermaye ($), Pozisyon (%), Komisyon (%).
- Butonlar: **Uygula** (mavi, dolgun, flex:1) + **Varsayılan** (hayalet, kenarlıklı).
- Altta strateji mantığını anlatan bilgi kutusu (11px, kenarlıklı, radius 6px).

#### 5. Durum çubuğu (26px)
Sol: "SYMBOL · TF · n bar · başlangıç → bitiş". Sağ: "Kaydırma: sürükle · Yakınlaştırma: tekerlek" ve turuncu (`#ff9800`) "Sentetik örnek veri — demo" uyarısı.

## Interactions & Behavior
- **Sembol / zaman dilimi / tarih değişimi** → veri yeniden üretilir, backtest anında yeniden koşar.
- **Uygula** → formdaki parametreler doğrulanıp (min/max clamp) uygulanır, backtest yeniden koşar. **Varsayılan** → `len:8, m1:1, m2:2, dir:both, capital:100000, sizePct:20, commPct:0.05`.
- **Grafik**: tekerlek = imleç konumu merkezli zoom (adım ×1.2 / ×0.85, min 25 bar); sürükleme = pan (bar bazında, sınırlarda clamp); mousemove = crosshair + lejant güncellemesi; mouseleave = crosshair kapanır.
- Varsayılan görünüm: son 170 bar.
- Sekmeler anlık geçiş, animasyon yok. Buton hover'ları yukarıda belirtildi.
- Canvas'lar DPR (devicePixelRatio) ölçekli çizilmeli; ResizeObserver ile yeniden çizim.

## State Management
- `symbol, tf, dateFrom, dateTo` — veri seçimi; değişimde yeniden hesap.
- `params` (uygulanmış) / `form` (taslak) — Uygula ile senkronlanır.
- `tab` — alt panel sekmesi (ov/pf/tr).
- `view {s,e}` — görünür bar aralığı (zoom/pan; render state, re-render tetiklemez).
- `hover` — crosshair konumu (render state).
- Türetilmiş: `data, swings, vwap, trades, equity, metrics` — her koşuda yeniden hesaplanır.
- Veri kaynağı: `engine.js` içindeki sentetik üretici; üretimde gerçek OHLCV beslemesiyle değiştirilecek.

## Hesap Motoru (engine.js — porte edilecek referans)
- `computeSwings(data,len)`: i barı, [i−len, i+len] penceresinin en yükseği/düşüğü ise pivot; **i+len'de onaylanır** (repaint yok).
- `computeVWAP(data,swings,m1,m2)`: onaylanan her pivotta VWAP toplamları pivot barından itibaren sıfırdan hesaplanır; tipik fiyat (H+L+C)/3, hacim ağırlıklı; σ = √(Σtp²v/Σv − vwap²); bantlar vwap ± σ·m1/m2.
- `backtest`: pozisyon boyutu = nakit × sizePct% / fiyat; komisyon her iki yönde notional × commPct%; equity her bar mark-to-market; açık pozisyon listede "Açık" olarak gösterilir.
- `metrics`: Net Kar ($/%), Profit Factor, Kazanma Oranı, Maks. Düşüş (peak-trough, $/%), Sharpe (bar getirilerinden, zaman dilimine göre yıllıklandırma: 5m=105120 … 1D=365 bar/yıl), Ortalama İşlem, Brüt Kar/Zarar, Uzun/Kısa sayıları.

## Design Tokens (Light — ana tema)
**Renkler**
- Arka plan: `#ffffff` · Panel: `#f7f8fb` · Kenarlık: `#e0e3eb` · Grid/satır ayracı: `#eef0f5`
- Metin güçlü: `#131722` · Metin: `#24293a` · İkincil: `#50535e` · Sönük: `#6f737f`
- Vurgu (mavi): `#2962ff` (hover `#1e53e5`) · Yükseliş: `#089981` · Düşüş: `#f23645`
- Crosshair etiketi: `#363a45` (metin `#ffffff`) · Crosshair çizgisi: `#758696` · Uyarı: `#ff9800`
- Bant dolgusu: `rgba(41,98,255,.07)`; bant çizgileri `rgba(41,98,255,.4)` / `.25`

**Koyu varyant** (arsiv/Koyu): bg `#131722`, panel `#1e222d`, kenarlık `#2a2e39`, grid `#1c2030`, metin `#d1d4dc`/`#f0f3fa`, sönük `#787b86`.
**Terminal varyant** (arsiv/Terminal): bg `#0b0e14`, panel `#121722`, kenarlık `#1f2735`, vurgu amber `#f7a600` (hover `#d98f00`), tüm arayüz monospace; metrikler araç çubuğunun altında 38px yatay şerit, Genel Bakış sekmesi tam genişlik özkaynak eğrisi.

**Tipografi**
- UI: `-apple-system, 'Segoe UI', 'Trebuchet MS', sans-serif` (Terminal: `ui-monospace, 'SF Mono', Menlo, monospace`)
- Sayılar/tablolar: `ui-monospace, 'SF Mono', Menlo, monospace`
- Ölçek: 9–10px (eksen/etiket), 11px (yardımcı), 12px (gövde/buton), 13px (başlık/select), 15px (logo), 17px (metrik değeri)

**Boşluk/biçim**: radius 3–6px; padding'ler 4–12px aralığında; gölge kullanılmaz — ayrım 1px kenarlıklarla.

## Assets
Harici asset yok; logo saf CSS (mavi kare + "Z"). Tüm grafikler runtime'da canvas ile çizilir.

## Files
- `Zimmer VWAP Backtester.dc.html` — ana sürüm (Light): arayüz + grafik/özkaynak çizimi + etkileşimler
- `engine.js` — veri üretimi, swing/VWAP/backtest/metrik hesapları (tek doğruluk kaynağı)
- `arsiv/Zimmer VWAP Backtester - Koyu.dc.html` — koyu TradingView varyantı
- `arsiv/Zimmer VWAP Backtester - Terminal.dc.html` — terminal varyantı
