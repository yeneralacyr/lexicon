# Main Flow Frontend Implementation Plan

Tarih: 2026-03-19

Not: `writing-plans` skill bu oturumda mevcut olmadigi icin plan dogrudan hazirlandi.

## Hedef

Ana akis ekranlarini `app_screens` referanslarina maksimum sadakatle React Native + Expo Router uzerinde hayata gecirmek.

## Faz 1: Tasarim altyapisini sabitle

Amac:

- Referanslarla uyumlu ortak tasarim tokenlarini ve shell componentlerini kurmak

Yapilacaklar:

- `Space Grotesk` ve `Inter` fontlarini projeye ekle
- renk tokenlarini referanslardaki tonlara cek
- dot-matrix arka plan componentini olustur
- `TopBar`, `BottomTabBar`, `TechnicalLabel`, `StatusChip`, `IndustrialCard` gibi temel componentleri olustur
- main shell ve immersive shell ayrimini route seviyesinde kur

Beklenen cikti:

- Ekranlarin ortak gorsel dili tek yerden yonetilir hale gelir

## Faz 2: Routing ve shell davranislarini referansa gore yeniden kur

Amac:

- Alt navigation sadece ana gezinmede gorunsun
- odak ekranlari task-based kalsin

Yapilacaklar:

- mevcut `(tabs)` yapisini `/(main)` akisine donustur veya ayni mantikla yeniden adlandir
- splash, onboarding, session, complete, word detail ve settings ekranlarini tabsiz stack akisi icine al
- `today -> session -> complete`
- `library/search -> word detail`
- `settings -> back`

Beklenen cikti:

- route akisi referans davranisi ile uyumlu olur

## Faz 3: Ana akisi ekran ekran uygula

### 3.1 Splash

- referanstaki ortali hero ve ince progress yapisini olustur
- bootstrap state ile bagla

### 3.2 Onboarding

- 5/10/15 secim kartlarini olustur
- secimi settings katmanina yaz
- CTA ile `today`'a gec

### 3.3 Today

- hero karti referans boyutlarina getir
- start session CTA
- review/new alt aksiyonlari
- streak ve learned metrikleri

### 3.4 Session

- kart bazli odakli layout
- kelime, status chip, reveal mantigi
- rating action bar
- sonraki kelime gecisi

### 3.5 Session Complete

- tamamlanma ozeti
- uc metrik paneli
- ana ve ikincil aksiyonlar

### 3.6 Word Detail

- buyuk kelime hero
- status paneli
- contextual usage listesi
- sabit alt action bar

### 3.7 Library

- baslik, filtre chipleri, liste satirlari
- sayfalama veya `load more`

### 3.8 Search

- teknik arama inputu
- instant matches listesi
- bos ve sonuc yok durumlari

### 3.9 Settings

- daily new words secimi
- daily review limit kontrolu
- toggle ve action bloklari

## Faz 4: Canli veri baglantilarini yerlestir

Amac:

- placeholder duzeni bozmadan mevcut SQLite verisini UI'ya baglamak

Yapilacaklar:

- dashboard snapshot ile today ekranini besle
- settings degerlerini onboarding ve settings ekranlarina bagla
- library ve search sonuclarini repository katmanindan cek
- word detail ekranina progress verisi bagla
- session akisini mevcut session servisi ile besle

Beklenen cikti:

- ekranlar sadece statik gorsel degil, gercek veriyle calisir

## Faz 5: Ince ayar, responsive ve kalite turu

Amac:

- referans sadakati ve teknik kaliteyi son kez sabitlemek

Yapilacaklar:

- spacing ve typography ince ayarlari
- mobile ve web export kontrolu
- typecheck
- route export
- ekranlar arasi gecis ve geri davranisi testi

Beklenen cikti:

- ana akis gorsel ve teknik olarak tutarli hale gelir

## Dosya Etki Alani

Buyuk olasilikla degisecek alanlar:

- `src/app`
- `src/components`
- `src/constants`
- `src/store`
- `src/modules/*/*.service*`

Muhtemel yeni dosyalar:

- route group layout dosyalari
- tasarim primitive componentleri
- font ve icon yardimcilari

## Riskler

- Referans HTML birebir web odakli oldugu icin React Native uyarlamasinda bazi spacing farklari olabilir
- Font metrikleri platformlar arasi kucuk fark yaratabilir
- Session ekraninda tam referans hissi icin ek state mantigi gerekebilir

## Basari Kriterleri

- Ana akis referans screenshot'larla ayni hiyerarsiyi verir
- Alt navigation sadece gerekli ekranlarda gorunur
- Session deneyimi task-focused kalir
- Tum ana route'lar calisir
- `typecheck` ve Expo export basarili olur
