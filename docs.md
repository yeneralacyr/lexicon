# Minimal Kelime Uygulaması — Teknik Altyapı ve Veri Tasarımı Dokümanı

## 1. Amaç

Bu dokümanın amacı, tamamen **local-first** çalışan, dış bağımlılığı minimum olan, kullanıcı ilerlemesini cihaz üzerinde saklayan bir kelime öğrenme uygulamasının teknik altyapısını tanımlamaktır.

Bu sürümde temel prensipler:

* **Auth yok**
* **Backend yok**
* **AI/API yok**
* **Tüm kelime verisi cihazda**
* **Tüm progress cihazda**
* **Offline çalışır**
* Açılış, arama, tekrar ve oturumlar hızlı hissettirmeli

Bu yaklaşım Expo’nun local-first mimari anlatımıyla da uyumlu: kullanıcı başka bir bilgisayara ya da ağa bağlı olmadan cihaz üstündeki veritabanına doğrudan okuyup yazabilmeli. ([Expo Documentation][1])

---

## 2. Mimari Karar Özeti

## Seçilen yapı

* **Framework:** Expo + React Native + TypeScript
* **Yerel veri katmanı:** `expo-sqlite`
* **Durum yönetimi:** hafif store yapısı
* **Kalıcı kullanıcı verisi:** SQLite
* **Opsiyonel küçük ayarlar/cache:** gerekirse AsyncStorage
* **Kelime veri seti:** uygulama içine gömülü seed veri

## Neden SQLite?

Çünkü bu ürünün verisi basit bir key-value yapısından daha fazlası:

* kelimeler
* cümleler
* progress
* tekrar tarihleri
* oturum kayıtları
* filtreleme ve arama
* istatistikler

Expo’nun SQLite paketi veriyi uygulama yeniden açıldığında da korur ve cihaz üstünde sorgulanabilir veritabanı sağlar. Ayrıca geliştirme sırasında tablo/row incelemek için inspector desteği de vardır. ([Expo Documentation][2])

## AsyncStorage neden ana çözüm değil?

AsyncStorage kalıcı ama **unencrypted key-value storage** olarak tanımlanır. Bu yüzden ana relational veri modeli için değil, küçük ayarlar gibi basit anahtar-değer verileri için daha uygundur. ([react-native-async-storage.github.io][3])

---

## 3. Ürün Seviyesi Teknik Hedefler

## Zorunlu hedefler

1. Uygulama ilk açılışta kelime verisini cihaza yüklemeli
2. Kullanıcının progress’i kalıcı olarak saklanmalı
3. Kullanıcı internet olmasa da uygulamayı tam kullanabilmeli
4. Günlük tekrar listesi otomatik hesaplanmalı
5. Arama hızlı olmalı
6. Oturum akışı bozulmadan devam etmeli
7. Uygulama kapansa bile veri kaybolmamalı

## Teknik olmayan ama önemli hedefler

* yapı sade olmalı
* ileride sync eklenebilmeli
* veri modeli büyümeye açık olmalı
* V1’de gereksiz abstraction olmamalı

---

## 4. Veri Mimarisi Yaklaşımı

Bu uygulamada veri iki ana kategoriye ayrılır:

### A. Statik veri

Uygulamayla birlikte gelen, herkeste aynı olan veri

Örnek:

* kelime id
* english
* turkish
* sentence1..sentence5

### B. Dinamik kullanıcı verisi

Kullanıcının zamanla oluşturduğu veri

Örnek:

* bu kelime öğrenildi mi
* kaç kere görüldü
* ne zaman tekrar edilmeli
* favori mi
* son oturumda ne oldu

Bu ayrım çok önemli. Çünkü:

* **words** tablosu ürün içeriğini temsil eder
* **progress** ve ilişkili tablolar kullanıcı hafızasını temsil eder

---

## 5. Önerilen Klasör Yapısı

```md
src/
  app/
    (screens)
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
    word.ts
    progress.ts
  utils/
    dates.ts
    scoring.ts
    random.ts
assets/
  data/
    oxford_words.json
```

---

## 6. Veritabanı Şeması

Aşağıda V1 için önerdiğim tablo yapısı var.

---

## 6.1 `app_meta`

Uygulama içi teknik metadata tutar.

```sql
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Kullanım amacı

* db_version
* seed_version
* seeded_at
* app_build

---

## 6.2 `words`

Statik kelime verisi.

```sql
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  english TEXT NOT NULL,
  turkish TEXT NOT NULL,
  sentence1 TEXT,
  sentence2 TEXT,
  sentence3 TEXT,
  sentence4 TEXT,
  sentence5 TEXT,
  normalized_english TEXT NOT NULL,
  normalized_turkish TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Açıklama

* `id`: senin veri setindeki benzersiz id
* `english`: kelimenin İngilizce hali
* `turkish`: Türkçe karşılığı
* `sentence1..5`: örnek cümleler
* `normalized_*`: aramada hız ve tutarlılık için lowercase/trimlenmiş alanlar

### Not

İleride şu alanlar eklenebilir:

* `cefr_level`
* `part_of_speech`
* `topic`
* `phonetic`
* `audio_local_path`

Ama V1’de şart değil.

---

## 6.3 `word_progress`

Her kelime için kullanıcının öğrenme durumu.

```sql
CREATE TABLE IF NOT EXISTS word_progress (
  word_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new',
  mastery_level INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  last_reviewed_at TEXT,
  next_due_at TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);
```

### Açıklama

* `status`: `new | learning | review | mastered`
* `mastery_level`: basit seviye puanı
* `ease_factor`: ileride daha akıllı spaced repetition için alan
* `interval_days`: bir sonraki tekrar aralığı
* `repetitions`: art arda başarılı tekrar sayısı
* `lapses`: unutulma / düşüş sayısı
* `seen_count`: toplam görülme sayısı
* `correct_count / wrong_count`: kaba başarı takibi
* `next_due_at`: tekrar tarihi
* `is_favorite`: kullanıcı işaretledi mi
* `is_suspended`: geçici olarak havuzdan çıkarıldı mı

### Neden ayrı tablo?

Çünkü `words` statik, `word_progress` dinamiktir. Bu ayrım bakım ve ileride sync için çok daha temizdir.

---

## 6.4 `sessions`

Her çalışma oturumu için üst kayıt.

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  new_items INTEGER NOT NULL DEFAULT 0,
  review_items INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
);
```

### Örnek `session_type`

* `daily`
* `review_only`
* `new_only`
* `favorites`

---

## 6.5 `session_items`

Bir oturum içinde hangi kelimelerin hangi sırayla işlendiği.

```sql
CREATE TABLE IF NOT EXISTS session_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  prompt_type TEXT NOT NULL,
  selected_sentence_index INTEGER,
  result_rating TEXT,
  answered_at TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);
```

### Açıklama

* `prompt_type`: `recall | mcq_meaning | fill_blank`
* `selected_sentence_index`: hangi örnek cümle kullanıldı
* `result_rating`: `again | hard | good | easy`
* `duration_ms`: opsiyonel analiz

Bu tablo sayesinde:

* oturum yarıda kalırsa devam edebilirsin
* geçmiş oturum istatistikleri çıkarırsın
* hangi soru tipinin daha zor olduğunu görebilirsin

---

## 6.6 `daily_stats`

Gün bazlı özet performans.

```sql
CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  reviewed_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  studied_seconds INTEGER NOT NULL DEFAULT 0
);
```

### Neden ayrı tablo?

İstatistik ekranı ve streak gibi şeyleri sonradan hızlı göstermek için.

---

## 6.7 `app_settings`

Uygulama ayarları.

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Örnek anahtarlar

* `daily_new_limit`
* `daily_review_limit`
* `session_goal_minutes`
* `theme_mode`
* `notifications_enabled`
* `onboarding_completed`

Not: İstersen bu tablo yerine ayarlar AsyncStorage’da da tutulabilir. Ama minimum sistem karmaşıklığı için burada da SQLite kullanmak daha tutarlı olur. AsyncStorage key-value yapısı küçük ayarlar için uygundur, ama tek veri katmanı kullanmak mühendislikte daha temizdir. ([react-native-async-storage.github.io][3])

---

## 7. İndeksler

Arama ve tekrar listesi için index şart.

```sql
CREATE INDEX IF NOT EXISTS idx_words_english ON words(normalized_english);
CREATE INDEX IF NOT EXISTS idx_words_turkish ON words(normalized_turkish);
CREATE INDEX IF NOT EXISTS idx_progress_next_due_at ON word_progress(next_due_at);
CREATE INDEX IF NOT EXISTS idx_progress_status ON word_progress(status);
CREATE INDEX IF NOT EXISTS idx_session_items_session_id ON session_items(session_id);
```

---

## 8. İlk Açılış ve Seed Süreci

## Amaç

Kelime verisini uygulama içine gömüp ilk açılışta veritabanına aktarmak.

## Akış

1. Uygulama açılır
2. SQLite db açılır
3. Tablolar oluşturulur
4. `app_meta` içinden `seed_version` okunur
5. Eğer seed yapılmamışsa:

   * bundled JSON okunur
   * `words` tablosuna toplu insert yapılır
   * `app_meta.seed_version = 1` yazılır
6. Kullanıcı normal akışa alınır

## Seed stratejisi

İki yol var:

### Yol A — JSON’dan ilk açılışta insert

Daha basit

* geliştirmesi kolay
* veri güncellemesi kolay

### Yol B — Önceden hazırlanmış SQLite dosyasını bundle etmek

Daha profesyonel

* ilk açılış daha hızlı olabilir
* büyük veri setinde daha stabil olabilir

V1 için 3000 kelime ölçeğinde **Yol A yeterli**.

---

## 9. Domain Model

Uygulamanın mantıksal veri tipi şu şekilde düşünülebilir:

```ts
type Word = {
  id: number;
  english: string;
  turkish: string;
  sentences: string[];
};

type WordProgress = {
  wordId: number;
  status: 'new' | 'learning' | 'review' | 'mastered';
  masteryLevel: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  lastSeenAt?: string;
  lastReviewedAt?: string;
  nextDueAt?: string;
  isFavorite: boolean;
  isSuspended: boolean;
};

type SessionItem = {
  sessionId: string;
  wordId: number;
  orderIndex: number;
  promptType: 'recall' | 'mcq_meaning' | 'fill_blank';
  selectedSentenceIndex?: number;
  resultRating?: 'again' | 'hard' | 'good' | 'easy';
};
```

---

## 10. Session Motoru Tasarımı

Bu ürünün kalbi session motoru olacak.

## Günlük oturum üretim mantığı

`buildDailySession()` fonksiyonu şu sırayla çalışır:

1. Bugün due olan review kelimeleri çek
2. Kullanıcının günlük limitine göre sırala
3. Yeterli değilse yeni kelimeler ekle
4. Her kelime için uygun prompt tipi ata
5. `sessions` ve `session_items` kayıtlarını oluştur
6. Session ekranına listeyi sırayla ver

## Örnek karar kuralı

* Önce `review`
* Sonra `learning`
* En son `new`

Bu önemli. Çünkü ürün “yeni kelime bombardımanı” değil, “hatırlama motoru” olmalı.

---

## 11. Progress Güncelleme Motoru

Her kelime için kullanıcı bir değerlendirme verir:

* `again`
* `hard`
* `good`
* `easy`

Bu puana göre `word_progress` güncellenir.

## Basit V1 tekrar algoritması

### İlk kez görülen kelime

* status → `learning`
* next_due_at → bugün + 0 veya +1 gün

### Rating mantığı

#### `again`

* interval_days = 0
* repetitions = 0
* lapses + 1
* next_due_at = yakın zaman / ertesi gün
* status = `learning`

#### `hard`

* interval_days = max(1, mevcut_interval * 1.2)
* next_due_at = +1 gün
* status = `learning` veya `review`

#### `good`

* interval_days = 1 → 3 → 7 → 14 → 30 şeklinde ilerler
* repetitions + 1
* status = `review`

#### `easy`

* interval_days daha agresif büyür
* mastery_level + 1
* belli eşiğin üstünde `mastered`

## Önerilen basit kural seti

```md
again -> 0 gün
hard  -> 1 gün
good  -> 3 gün
easy  -> 7 gün
```

Sonraki başarılarla çarpanlı büyüme uygulanır:

```md
1 -> 3 -> 7 -> 14 -> 30 -> 60
```

Bu V1 için yeterince güçlü, yeterince anlaşılır ve teknik olarak kararlı.

---

## 12. Durum Geçişleri

Kelime yaşam döngüsü:

```md
new -> learning -> review -> mastered
```

### Kurallar

* `new`: henüz hiç çalışılmamış
* `learning`: yeni tanışılmış ama oturmamış
* `review`: düzenli tekrar aşamasında
* `mastered`: uzun aralıklarda doğru hatırlanan

### Geri düşme

Kullanıcı unutursa:

```md
mastered -> review
review -> learning
```

Bu geri düşme sistemi çok önemli; yoksa sahte başarı oluşur.

---

## 13. Soru Tipleri ve Veri İlişkisi

Mevcut veri yapınla V1’de üç soru tipi çıkarmak mantıklı:

## A. Recall

* english göster
* kullanıcı anlamı zihninden hatırlasın
* sonra Türkçe açılır
* rating verir

Gereken veri:

* `english`
* `turkish`

## B. Context reveal

* english + bir örnek cümle
* anlamı pekiştirir

Gereken veri:

* `sentence1..5`

## C. Fill in the blank

* seçilen cümlede hedef kelime boş bırakılır
* 4 seçenek sunulur

Gereken veri:

* hedef kelime
* distractor kelimeler

Distractor seçimi için basit kural:

* aynı uzunluk bandındaki rastgele kelimeler
* ya da aynı öğrenme seviyesinden kelimeler

---

## 14. Arama Tasarımı

## Arama türleri

* English ile arama
* Turkish ile arama
* prefix arama
* contains arama

## Teknik yaklaşım

Her kelimenin:

* `normalized_english`
* `normalized_turkish`

alanı tutulur.

Normalize işlemi:

* lowercase
* trim
* Türkçe karakter uyumu gerektiğinde opsiyonel sadeleştirme

Örnek:

* `" Köy "` → `"köy"`
* `"Village"` → `"village"`

## Neden ayrı alan?

Her aramada runtime normalize yapmak yerine veri kaydında normalize etmek daha temiz ve hızlıdır.

---

## 15. State Yönetimi Tasarımı

UI state ile persistent state ayrılmalı.

## Persistent state

SQLite’da durur:

* words
* progress
* sessions
* settings

## In-memory UI state

Store içinde yaşar:

* currentSessionId
* currentCardIndex
* currentWord
* temporary filters
* selected tab
* loading state

## Öneri

Zustand gibi hafif bir store iyi gider ama şart değil. Basit Context + hooks da yeterli olabilir.

Önemli olan:

* SQLite gerçek kaynak olsun
* UI store cache/ekran mantığı için olsun

---

## 16. Repository Katmanı

Doğrudan ekranlardan SQL çalıştırmayacağız.

Önerilen yapı:

### `words.repository.ts`

* `getWordById(id)`
* `searchWords(query, filters)`
* `getNewWords(limit)`

### `progress.repository.ts`

* `getProgress(wordId)`
* `upsertProgress(progress)`
* `getDueWords(date, limit)`
* `getFavoriteWords()`

### `sessions.repository.ts`

* `createSession(payload)`
* `createSessionItems(items)`
* `completeSession(sessionId)`
* `getSessionHistory(limit)`

### `review.engine.ts`

* `buildDailySession()`
* `applyRating(wordId, rating)`
* `calculateNextInterval(currentProgress, rating)`

Bu yapı ileride sync eklense bile korunur.

---

## 17. Migration Stratejisi

İleride tablo alanları değişebilir. Bu yüzden migration mantığı baştan kurulmalı.

## Öneri

`app_meta.db_version` üzerinden ilerle:

* version 1 → ilk sürüm
* version 2 → `cefr_level` eklendi
* version 3 → `audio_path` eklendi

## Basit migration akışı

1. mevcut version oku
2. sırayla eksik migrationları çalıştır
3. version güncelle

Bu küçük bir uygulama için bile önemlidir. Yoksa ileride kullanıcı verisi bozulur.

---

## 18. Yedekleme ve Genişleme Hazırlığı

Bu V1 tamamen local olsa da veri modeli ileride aşağıdakilere açık olmalı:

* export/import
* cihaz değiştirme
* cloud sync
* Supabase’e yedek alma

Bu yüzden her kullanıcı verisini tek tabloda gömmek yerine normalize yapı kurduk.

### İleride çok işe yarayacak kararlar

* `word_id` ana referans
* session geçmişinin ayrı tutulması
* progress’in words’tan ayrı olması
* settings’in ayrı tabloda tutulması

---

## 19. Hata ve Edge Case Yönetimi

## Olası durumlar

### 1. Seed yarım kaldı

Çözüm:

* transaction kullan
* seed başarılı olursa `seed_version` yaz

### 2. Aynı kelimenin progress kaydı yok

Çözüm:

* ilk erişimde default progress oluştur
* ya da left join ile null gelirse `new` kabul et

### 3. Session yarım kaldı

Çözüm:

* `sessions.status = active`
* uygulama açılınca aktif session varsa devam et

### 4. Tarih/saat farkları

Çözüm:

* tarihleri ISO string sakla
* due hesaplarında gün bazlı normalize et

### 5. Veri bozulması

Çözüm:

* kritik güncellemeler transaction içinde çalışsın

---

## 20. Performans Notları

3000 kelime SQLite için çok küçük bir ölçek. Yani doğru index’lerle rahat çalışır.

## Dikkat edilmesi gerekenler

* ilk seed’i toplu insert ile yap
* sürekli tam tablo çekme
* search’te limit kullan
* session item’ları oturum başında topluca hazırla
* cümle seçiminde rastgeleliği memory tarafında yapabilirsin

Expo SQLite’ın veriyi cihaz üstünde kalıcı tuttuğu ve sorgulanabilir DB sunduğu resmi olarak belgeleniyor; bu ölçek için doğru seçim. ([Expo Documentation][2])

---

## 21. V1 İçin Net Teknik Karar Listesi

## Kesin kararlar

* veri katmanı SQLite
* auth yok
* backend yok
* progress lokal kaydedilecek
* kelime verisi seed ile yüklenecek
* günlük session motoru olacak
* basit spaced repetition olacak
* migration sistemi baştan kurulacak

## Şimdilik yapılmayacaklar

* cloud sync
* çok cihaz desteği
* sosyal özellikler
* AI destekli içerik
* ses/TTS
* analytics servisi
* remote config

---

## 22. Örnek Başlangıç Ayarları

```md
daily_new_limit = 10
daily_review_limit = 20
session_goal_minutes = 5
mastered_threshold = 5 başarılı tekrar
default_prompt_mix = recall ağırlıklı
```

---

## 23. Sonuç

Bu ürün için en doğru teknik omurga:

* **Expo**
* **SQLite**
* **local-first veri akışı**
* **statik words + dinamik progress ayrımı**
* **session tabanlı çalışma modeli**
* **basit ama sağlam spaced repetition**

