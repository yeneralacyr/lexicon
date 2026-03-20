# Session Swipe Card Implementation Plan

Tarih: 2026-03-19

Not: `writing-plans` skill bu oturumda mevcut olmadigi icin plan dogrudan hazirlandi.

## Hedef

`src/app/session/[sessionId].tsx` ekranini, gercek SQLite rating akisini koruyarak swipe-card ve flip-card deneyimine donusturmek.

## Faz 1: Teknik zemin kontrolu

Amac:

- Gesture ve Reanimated altyapisinin bu akis icin hazir oldugunu netlestirmek

Yapilacaklar:

- Expo config ve Babel tarafinda Reanimated worklets altyapisini kontrol et
- gerekirse eksik kurulum notlarini ekle
- mevcut session ekraninda kullanilan state ve submit akisini daralt

Beklenen cikti:

- gesture ve animation implementasyonu icin temiz baslangic noktasi

## Faz 2: Session ekranini kart stack mimarisine ayir

Amac:

- mevcut tek parca ekran kodunu daha moduler hale getirmek

Yapilacaklar:

- `SessionScreen` icinde veri yukleme ve submit mantigini koru
- `StudyCardStack` componentini olustur
- `StudyCard` componentini olustur
- gerekirse `SwipeAffordance` ve `HardAction` yardimci componentlerini ekle

Beklenen cikti:

- UI animasyonu ve veri mantigi birbirinden ayrilir

## Faz 3: Flip davranisini uygula

Amac:

- reveal aksiyonunu butondan fiziksel kart donusune cevirmek

Yapilacaklar:

- kart on ve arka yuzunu ayir
- `Gesture.Tap()` ile flip davranisini bagla
- `withTiming` ile kontrollu donus animasyonu ekle
- reveal oncesi ve sonrasi icerik hiyerarsisini yerlestir

Beklenen cikti:

- kullanici karta dokunarak anlama gecer

## Faz 4: Swipe rating akisini uygula

Amac:

- `again / good / easy` kararlarini gesture ile vermek

Yapilacaklar:

- `Gesture.Pan()` ile yatay ve dikey hareketleri izle
- threshold mantigini tanimla
- sola `again`, saga `good`, yukari `easy` eslemesini uygula
- threshold asilmadiysa karti `withSpring` ile geri getir
- kabul edilen swipe yonunde karti ekrandan cikar
- `runOnJS` ile mevcut rating submit akisini tetikle

Beklenen cikti:

- rating akisi fiziksel kart hissiyle calisir

## Faz 5: `Hard` aksiyonunu kart arkasina tasi

Amac:

- dorduncu rating secenegini gesture ergonomisini bozmadan korumak

Yapilacaklar:

- kart arkasi alt bandina kucuk secondary action ekle
- sadece arka yuzde gorunur yap
- mevcut `handleRating('hard')` yoluna bagla
- submit sirasinda butonu kilitle

Beklenen cikti:

- `hard` kaybolmadan sade interaction korunur

## Faz 6: Stack ve preview katmanlarini ekle

Amac:

- session ekranina kart destesi hissi kazandirmak

Yapilacaklar:

- ikinci karti preview olarak arkada goster
- hafif scale ve translate ile derinlik ver
- aktif kart ayrildiginda arka karti one cek

Beklenen cikti:

- ekran tek kart degil, surekli akan bir deste gibi hissedilir

## Faz 7: Hata ve submit dayanikliligini guclendir

Amac:

- animasyon ile veri yazimi arasinda tutarlilik saglamak

Yapilacaklar:

- submit sirasinda gesture ve butonlari kilitle
- DB write basarisiz olursa karti geri state'e al
- kisa inline hata mesaji ekle
- cift submit korumasini koru

Beklenen cikti:

- animasyonlu deneyim veri hatalarinda bile bozulmaz

## Faz 8: Gorsel sadakat turu

Amac:

- referans ekran ile yeni interaction modelini ayni gorsel dilde birlestirmek

Yapilacaklar:

- buyuk tipografi oranlarini ayarla
- kart kenar radius ve border tonlarini referansa yaklastir
- dot-matrix ve teknik etiket yogunlugunu dengele
- gereksiz renkli affordance kullanma

Beklenen cikti:

- Tinder mekanigi var ama dating-app estetigi yok

## Faz 9: Dogrulama

Yapilacaklar:

- `npm run typecheck`
- `npx expo export --platform web`
- cihazda session akisi testi
- swipe direction -> DB rating esleme testi
- active session resume testi
- session complete gecisi testi

Basari kosullari:

- flip akici calisir
- swipe esikleri yanlis tetiklenmez
- `again / good / easy / hard` dogru ratinglere gider
- mevcut prod-readiness persistence mantigi bozulmaz
