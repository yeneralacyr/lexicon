# Main Flow Frontend Design

Tarih: 2026-03-19

## Hedef

Bu dokuman, `app_screens` klasorundeki referanslara ve `design.md` tanimina sadik kalarak Lexicon uygulamasinin ana akis ekranlarini tanimlar.

Bu iterasyonun kapsami:

- Splash
- Onboarding
- Today
- Session
- Session Complete
- Word Detail
- Library
- Search
- Settings

Ek ekranlar bu fazin disindadir:

- favorites
- difficult_words
- progress_charts
- weekly_summary
- streak_details

## Referans Kaynaklar

Ana akis ekranlari dogrudan su referanslara baglanir:

- `app_screens/stitch_minimal_kelime_uygulamas_prd/splash_screen`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/onboarding`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/today_dashboard`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/session_card_view`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/session_complete`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/word_detail`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/library_refined`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/search`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/settings`

Gorsel kimlik ek kaynagi:

- `app_screens/stitch_minimal_kelime_uygulamas_prd/glyph_industrial/DESIGN.md`

## Tasarim Ilkeleri

### Gorsel yon

Uygulama su hissi vermelidir:

- sessiz
- odakli
- modern
- hafif premium
- endustriyel ama yumusak degil

Referans sadakati icin ana kurallar:

- Kirik beyaz zemin
- Siyah agirlikli tipografi
- Dot-matrix arka plan dokusu
- Buyuk ve cesur basliklar
- Fazla yumusak olmayan koseler
- Renk kullaniminda asiri tutumluluk

### Tipografi

- Basliklar: `Space Grotesk` karakterinde, buyuk, sikisik ve mimari hissiyatli
- Govde metinleri: `Inter` karakterinde, okunakli ve sakin
- Teknik etiketler: kucuk, uppercase, genis tracking ile

### Yuzey ve ayirim mantigi

- Ayirimlar mumkun oldugunca yuzey tonlariyla yapilir
- Border kullanimi zayif ve yardimci duzeyde kalir
- Kartlar duz, temiz ve endustriyel hissedilir
- Gerekmedikce golge kullanilmaz

### Hareket

- Acilista hafif fade/translate
- Session gecislerinde kisa ve fonksiyonel animasyon
- Dikkat dagitan efektlerden kacinilir

## Routing Tasarimi

Uygulama iki farkli shell davranisina ayrilir:

### 1. Main shell

Alt tab bar gorunen ana gezinme alani:

- `/(main)/today`
- `/(main)/library`
- `/(main)/search`

### 2. Immersive shell

Odakli ve task-based ekranlar:

- `/`
- `/onboarding`
- `/session/[sessionId]`
- `/session/complete`
- `/word/[wordId]`
- `/settings`

## Akis

1. `/`
   Splash ekrani acilir.
2. Bootstrap tamamlanir.
3. Onboarding tamamlanmadiysa `/onboarding`, tamamlandiysa `/(main)/today` acilir.
4. `/(main)/today` ekranindan session baslatilirsa `/session/[sessionId]` acilir.
5. Session bitince `/session/complete` acilir.
6. Library ve Search ekranlarindan secilen kelime `/word/[wordId]` ekranina gider.
7. Settings ekrani stack ekranidir ve geri aksiyonuyla doner.

## Ekran Bazli Tasarim

### Splash

Referans: `splash_screen`

Korunacak ogeler:

- Ortalanmis dev `LEXICON`
- Teknik seri metni
- Ince alt cizgi
- Alt tarafta loading progress cizgisi
- Cok dusuk opaklikli dot-matrix

Davranis:

- Kisa gorunur
- Bootstrap bittiginde otomatik route gecisi olur

### Onboarding

Referans: `onboarding`

Korunacak ogeler:

- Ustte 3 parcali progress cizgisi
- Buyuk baslik
- 5 / 10 / 15 secim kartlari
- Secili kartin tam siyah gorunmesi
- Altta tam genis siyah CTA

Davranis:

- Gunluk hedef secimi yapilir
- `daily_new_limit` kaydedilir
- CTA ile `/(main)/today` acilir

### Today

Referans: `today_dashboard`

Korunacak ogeler:

- Ustte minimal bar ve ortalanmis marka
- Merkezde buyuk sayili hero kart
- Siyah tam genis `Start Session` butonu
- Alt tarafta iki metrik blok
- Alt tab bar

Canli veri:

- due count
- daily new count
- tahmini sure
- streak
- learned total

### Session

Referans: `session_card_view`

Korunacak ogeler:

- Ustte close aksiyonu ve progress sayaci
- Ortada dev kelime
- Kucuk status chip
- `Show meaning` benzeri primer reveal aksiyonu
- Alt tarafta teknik yardimci metin

Canli veri:

- aktif kelime
- toplam kart / aktif index
- anlam gorunurlugu
- rating aksiyonlari

Bu ekran tab barsiz olur.

### Session Complete

Referans: `session_complete`

Korunacak ogeler:

- Buyuk tamamlanma mesaji
- Uc metrik paneli
- Altta primary ve secondary action
- Teknik alt etiketler

Canli veri:

- tamamlanan toplam
- review sayisi
- new sayisi
- yarina kalan due

### Word Detail

Referans: `word_detail`

Korunacak ogeler:

- Buyuk kelime basligi
- Daha sakin turkce karsilik
- Ust teknik giris etiketi
- Status / last seen / next review bloklari
- Ornek cumle kartlari
- Alt sabit aksiyon bari

Canli veri:

- kelime
- ceviri
- durum
- tekrar tarihleri
- tum ornek cumleler

### Library

Referans: `library_refined`

Korunacak ogeler:

- Buyuk `LIBRARY` basligi
- Ust sayac satiri
- Filtre chip seti
- Dikey listelenmis kelime satirlari
- Altta `Load More Entries`
- Alt tab bar

Canli veri:

- toplam kelime
- learned toplam
- filtreli kelime listesi
- durum chip'leri

### Search

Referans: `search`

Korunacak ogeler:

- Teknik stil input
- Buyuk yazili arama alani
- Instant matches basligi
- Sonuc kartlari
- Alt teknik durum satiri
- Alt tab bar

Canli veri:

- query
- sonuc sayisi
- arama sonucu kartlari

### Settings

Referans: `settings`

Korunacak ogeler:

- Buyuk `SETTINGS` basligi
- Sol cizgili teknik header
- Gunun hedefleri icin segmented secimler
- Review limit kontrol blogu
- Notifications ve theme blogu
- Export ve reset aksiyonlari
- Teknik footer metrikleri

Canli veri:

- daily new limit
- daily review limit
- notifications toggle
- build metadata

Bu ekran tab barsiz olur.

## Ortak Component Stratejisi

Referansa sadik kalirken tekrar kullanilabilir temel parcalar:

- `TopBar`
- `BottomTabBar`
- `DotMatrixBackground`
- `IndustrialCard`
- `TechnicalLabel`
- `StatusChip`
- `PrimaryButton`
- `SecondaryButton`
- `WordRow`
- `MetricPanel`
- `ActionFooterBar`

Kural:

- Bir parca en az iki ekranda tekrar etmiyorsa zorla soyutlanmaz
- Referans duzen bozuluyorsa lokal composition tercih edilir

## Responsive Davranis

- Mobil birincildir
- Tablet ve webde icerik genisler ama ortalanmis kolon duzenini korur
- Hero ve kelime basliklari buyuyebilir ama referans oranlari bozulmaz
- Session her genislikte merkez odakli kalir
- Bottom tab sadece main shell ekranlarinda gorunur

## Hata ve Bos Durumlar

- `today`: veri yoksa layout bozulmadan fallback kart
- `search`: query bos veya sonuc yok durumlari sakin bos alanla ele alinir
- `library`: filtre sonucu bossa liste yerlesimi korunur
- `session`: session bulunamazsa `today`'a geri yonlendirilir
- `word detail`: kayit yoksa minimal not-found paneli gosterilir

## Dogrulama

Teknik dogrulama:

- route akisi
- typecheck
- Expo bundle/export

Gorsel dogrulama:

- spacing
- tipografi buyuklukleri
- CTA boyutlari
- tab bar oranlari
- referans ekranlarla ana hiyerarsi uyumu

## Kapsam Karari

Bu faz sadece ana akisi hedefler.

Sonraki fazda eklenecek ekranlar:

- favorites
- difficult_words
- progress charts
- weekly summary
- streak details
