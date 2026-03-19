# Session Swipe Card Design

Tarih: 2026-03-19

## Hedef

Bu dokuman, `session/[sessionId]` ekranini mevcut buton-agirlikli reveal/rating duzeninden cikarip Tinder benzeri swipe-card deneyimine donusturur.

Amac:

- session deneyimini daha dogal ve akici hale getirmek
- mevcut local-first SQLite rating modelini korumak
- `design.md` ve `app_screens/session_card_view` referansina sadik kalmak

## Referanslar

- `app_screens/stitch_minimal_kelime_uygulamas_prd/session_card_view/code.html`
- `app_screens/stitch_minimal_kelime_uygulamas_prd/session_card_view/screen.png`
- `design.md`

## Guncel Teknik Kaynaklar

Gesture ve motion tarafindaki teknik yon, Context7 ile resmi Software Mansion dokumanlari uzerinden dogrulandi.

Gesture tarafinda kullanilacak yon:

- `GestureDetector`
- `Gesture.Tap()`
- `Gesture.Pan()`
- gerekirse `Gesture.Exclusive()`

Kaynaklar:

- https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-2
- https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/gesture-composition
- https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/tap-gesture

Motion tarafinda kullanilacak yon:

- `useSharedValue`
- `useAnimatedStyle`
- `withTiming`
- `withSpring`
- `interpolate`
- `runOnJS`

Kaynaklar:

- https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started
- https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/applying-modifiers
- https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/animating-styles-and-props

Not:

- Reanimated kurulum notunda `react-native-worklets/plugin` vurgulanir.
- Expo starter template hattinda bu plugin varsayilan olarak bulunur; yine de uygulama asamasinda mevcut config kontrol edilmelidir.

## Tasarim Ilkeleri

Session ekraninin yeni hali su hissi vermelidir:

- odakli
- mekanik
- sessiz
- hizli ama aceleci degil
- fiziksel kart hissine yakin

Korunacak referans ogeleri:

- ustte close butonu
- ortada ilerleme sayaci
- altta ince progress line
- dot-matrix arka plan
- buyuk tipografi
- monokrom yuzeyler

Eklenen yeni his:

- tek kart uzerinde karar verme
- kart destesi derinligi
- hareketle gelen fiziksel geri bildirim

## Interaction Model

### Genel akis

- Kullanici session ekranina girer.
- Orta alanda buyuk bir study card gorur.
- Kartin on yuzunde sadece kelime ve teknik etiket vardir.
- Kullanici karta dokunur ve kart flip olur.
- Arka yuzde anlam ve ornek cumleler gorunur.
- Kullanici kaydirarak rating verir ya da `Hard` butonuna basar.
- Kart ekrandan ayrilir, bir sonraki kart one gelir.

### Gesture esleme

Onaylanan rating eslemesi:

- sola swipe = `again`
- saga swipe = `good`
- yukari swipe = `easy`
- kart arkasindaki kucuk ikincil buton = `hard`

Bu esleme ile:

- ana kararlar gesture ile verilir
- mevcut 4 rating modeli korunur
- ergonomik olmayan asagi swipe ihtiyaci ortadan kalkar

### Reveal kurali

- kart on yuzdeyken swipe rating devre disidir
- once flip, sonra karar
- boylece kullanici anlami gormeden puan vermemis olur

## Bilesen Mimarisi

### `SessionScreen`

Sorumluluklar:

- session verisini yuklemek
- aktif karti secmek
- submit kilidini yonetmek
- session finalize etmek
- hata durumlarini gostermek

### `StudyCardStack`

Sorumluluklar:

- aktif karti ve arka preview kartini gostermek
- swipe threshold ve cikis yonunu yonetmek
- yeni kartin stack icinde one gelmesini saglamak

### `StudyCard`

Sorumluluklar:

- front ve back yuzlerini tasimak
- flip animasyonunu gostermek
- kart icerik hiyerarsisini korumak

### `SwipeAffordance`

Sorumluluklar:

- sola kaydirirken `AGAIN`
- saga kaydirirken `GOOD`
- yukari kaydirirken `EASY`

Bu feedback yazisal ve teknik gorunur; renkli buyuk badge kullanilmaz.

### `HardAction`

Sorumluluklar:

- kart arkasi acikken `hard` rating'ini sunmak
- ana gesture akisini bozmadan ikincil karar vermek

## Ekran Kompozisyonu

### Ust bolum

Referanstaki gibi korunur:

- sol: close
- orta: `7 / 18`
- alt: ince line progress

### Orta study canvas

- onde aktif kart
- arkada hafif kuculmus ikinci kart
- ucuncu katman cok hafif ton farki ile derinlik hissi verebilir

### Kart on yuzu

- dev Ingilizce kelime
- kucuk teknik label veya chip
- alt tarafta kucuk reveal ipucu

### Kart arka yuzu

- Turkce anlam
- 1 ana ornek cumle
- varsa diger ornekler ikinci seviye listede
- alt bantta kucuk `Hard` aksiyonu

## Motion Tasarimi

### Flip

- Y ekseninde kontrollu donus
- asiri 3D ya da parlak efekt yok
- kisa ve net `withTiming`

### Swipe

- kullanici karti suruklerken kart hafif doner
- threshold asilmadiysa `withSpring` ile yerine doner
- threshold asildiysa kart ilgili yone ucar

### Stack gecisi

- aktif kart ciktiktan sonra arka kart olceklenip one gelir
- yeni kart sessizce stack'e eklenir

### Veri yazma zamani

- DB write hareketin basinda degil, cikis animasyonu kabul edildikten sonra tetiklenir
- submit sonrasi gesture gecici olarak kilitlenir
- bu karar UI akiciligi ile veri dogrulugunu dengeler

## Veri ve Durum Kurallari

### Korunacak davranislar

- mevcut `applySessionRating` kullanilmaya devam eder
- `durationMs` olcmeye devam eder
- `session_items.result_rating` ve `daily_stats` yazimi korunur
- session complete akisi bozulmaz

### Yeni UI state'leri

- `isRevealed`
- `isAnimatingOut`
- `swipeDirectionPreview`
- `submitError`

Bu state'ler yalnizca UI davranisi icindir; SQLite verisinin yerine gecmez.

## Hata ve Dayaniklilik

- submit sirasinda cift swipe engellenir
- DB write basarisiz olursa kart state'i geri doner
- inline hata mesaji gosterilir
- active session DB'de tutuldugu icin app kapatilip acildiginda resume devam eder
- ornek cumle yoksa kart arkasi yine calisir

## Responsive Davranis

- mobil birinci sinif vatandas olacak
- tablet/genis ekranda kart ortalanir ve maksimum genislik sinirlanir
- buyuk basliklar referans hiyerarsisini bozmadan buyuyebilir

## Basari Kriterleri

- session deneyimi Tinder benzeri swipe akisi verir
- referanstaki monokrom ve endustriyel dil korunur
- `again / good / easy / hard` ratingleri dogru veriye gider
- flip + swipe akisi session progress mantigini bozmaz
- uygulama kapatilip acildiginda active session devam eder
