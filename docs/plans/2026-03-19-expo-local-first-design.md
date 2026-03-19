# Expo Local-First Kelime Uygulamasi Tasarimi

Tarih: 2026-03-19

## Hedef

Bu tasarim, `docs.md` ve ekran PRD'sindeki yonu koruyarak uygulamanin ilk teknik iskeletini tanimlar:

- Expo SDK 55
- Expo Router tabanli navigasyon
- TypeScript
- `expo-sqlite` ile kalici local-first veri katmani
- Bundled JSON dosyasindan ilk acilista seed
- Backend, auth ve Redis olmadan V1

## Mimari Ozet

Uygulama dosya tabanli route yapisi icin Expo Router kullanir. Kalici veri icin tek gercek kaynak SQLite olur. UI state ile persistent state ayrilir:

- SQLite: `words`, `word_progress`, `sessions`, `session_items`, `daily_stats`, `app_settings`, `app_meta`
- In-memory store: aktif oturum, filtreler, gecici ekran state'i

Bootstrap sirasinda:

1. SQLite veritabani acilir
2. Migration'lar calisir
3. `app_meta.seed_version` kontrol edilir
4. Seed eksikse bundled JSON transaction ile `words` tablosuna yazilir
5. Uygulama normal route akisina gecer

## Dosya Dizini

```text
app/
  _layout.tsx
  index.tsx
  (tabs)/
    _layout.tsx
    today.tsx
    library.tsx
    search.tsx
    settings.tsx
  session/
    [sessionId].tsx
    complete.tsx
  word/
    [wordId].tsx
  onboarding/
    index.tsx
src/
  components/
  db/
    index.ts
    migrations.ts
    seed.ts
    queries.ts
    schema.ts
  modules/
    words/
      words.repository.ts
      words.service.ts
    progress/
      progress.repository.ts
      progress.service.ts
    sessions/
      sessions.repository.ts
      sessions.service.ts
    review/
      review.engine.ts
      review.types.ts
  store/
    sessionStore.ts
    settingsStore.ts
  types/
    db.ts
    progress.ts
    session.ts
    word.ts
  utils/
    dates.ts
    normalize.ts
    random.ts
assets/
  data/
    words.json
  fonts/
```

## Bagimliliklar

Temel kurulum:

- `expo`
- `react`
- `react-native`
- `expo-router`
- `expo-sqlite`
- `expo-splash-screen`
- `expo-status-bar`
- `expo-system-ui`
- `react-native-safe-area-context`
- `react-native-screens`

Uygulama seviyesi destek:

- `zustand`
- `zod`
- `dayjs`

Opsiyonel ama ertelenenler:

- AsyncStorage
- ORM katmani
- Remote sync altyapisi

## Veri Akisi

### Ilk acilis

- Splash ekraninda bootstrap baslar
- DB acilir ve migration kontrol edilir
- Gerekirse JSON seed edilir
- Onboarding tamamlanmissa `today` ekranina, degilse `onboarding` ekranina gidilir

### Gunluk kullanim

- Today ekraninda due ve yeni kelime sayisi hesaplanir
- Session motoru session kaydini ve session item listesini uretir
- Kullanici rating verdikce progress transaction ile guncellenir
- Session sonunda oturum kaydi kapanir ve ozet ekrani gosterilir

## Hata Yonetimi

- Seed her zaman transaction ile calisir
- Seed ancak basariyla tamamlanirsa `seed_version` yazilir
- Aktif session yarim kalirsa `sessions.status = active` sayesinde kaldigi yerden devam eder
- Progress kaydi yoksa varsayilan `new` davranisi uygulanir
- Tarih alanlari ISO string olarak saklanir

## Performans Kararlari

- JSON ilk acilista toplu insert ile yazilir
- Arama icin normalize alanlar ve index kullanilir
- Session item listesi oturum basinda hazirlanir
- Liste ekranlarinda limit ve sayfalama mantigi korunur

## Testleme Yaklasimi

- Unit test: review motoru, tarih hesaplari, normalize yardimcilari
- Repository test: migration, seed, temel sorgular
- Manuel test: ilk acilis, offline kullanim, yarim kalan session, arama hizi

## Kabul Edilen Kararlar

- Redis kullanilmayacak
- Birkac saniyelik ilk seed kabul edilebilir
- V1 sade tutulacak, prebuilt SQLite asset sonraya birakilacak
- Expo Router varsayilan navigasyon omurgasi olacak
