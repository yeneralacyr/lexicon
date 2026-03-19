# Lexicon 👋

**Lexicon**, İngilizce kelime dağarcığınızı geliştirmek için tasarlanmış, **minimalist** ve **odak odaklı** bir mobil uygulamadır.

Bu uygulama, karmaşık özelliklerden ve dikkat dağıtıcı unsurlardan arındırılmış, sadece öğrenmeye odaklanan "sessiz" bir araç olma vizyonuyla geliştirilmiştir.

## 🎯 Temel Özellikler

-   **Local-First Mimari:** Tüm verileriniz (kelimeler, ilerleme, ayarlar) doğrudan cihazınızda saklanır. İnternet bağlantısı gerektirmez, backend veya login süreçleriyle vakit kaybetmezsiniz.
-   **Minimalist Tasarım:** "Nothing Phone" estetiğinden ilham alan, monokrom ağırlıklı, temiz ve modern bir kullanıcı arayüzü.
-   **Akıllı Tekrar Sistemi:** Spaced Repetition (Aralıklı Tekrar) mantığıyla çalışan günlük oturumlar sayesinde kelimeleri unutmadan kalıcı hafızaya aktarın.
-   **SQLite Altyapısı:** Veri tutarlılığı ve yüksek performans için Expo-SQLite kullanılmıştır.
-   **Favoriler & Arama:** Öğrenmek istediğiniz kelimeleri favorilere ekleyin veya kapsamlı arama özelliğiyle istediğiniz kelimeye anında ulaşın.

## 🛠️ Teknik Altyapı

-   **Framework:** [Expo](https://expo.dev) & [React Native](https://reactnative.dev)
-   **Dil:** [TypeScript](https://www.typescriptlang.org)
-   **Veritabanı:** `expo-sqlite` (Yerel veri saklama)
-   **Durum Yönetimi:** `zustand` (Hafif ve hızlı state management)
-   **Tasarım:** Özel tasarım sistemi (Monochrome, Space Grotesk/Inter fontları)

## 🚀 Başlarken

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Uygulamayı Başlatın

```bash
npx expo start
```

Buradan sonra:
- **Android Emulator** için `a` tuşuna basın.
- **iOS Simulator** için `i` tuşuna basın.
- **Expo Go** uygulamasıyla fiziksel cihazınızda test edin.

## 🎨 Tasarım Felsefesi

Lexicon, bir oyun gibi sizi sürekli bildirimlerle rahatsız eden bir uygulama değildir. Bunun yerine, her gün açıp 5 dakikanızı ayıracağınız, endüstriyel ve şık bir araçtır.

-   Büyük ve cesur tipografi.
-   Gereksiz ikon kalabalığından uzak duruş.
-   Sert ama temiz hizalamalar.
-   Nefes alan beyaz boşluklar.

---

Geliştiren: [yeneralacyr](https://github.com/yeneralacyr)
