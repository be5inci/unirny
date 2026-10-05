# Öğrenci Kulübü ve Topluluk Platformu (Community Hub)
## Implementation Plan & Task Architecture

Modern, ölçeklenebilir, responsive ve modüler bir öğrenci topluluğu & mentörlük platformu teknik planı.

---

## 1. Mimari ve Teknoloji Yığını

| Katman | Teknoloji / Kütüphane | Açıklama |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router) | Server-side rendering (SSR), optimize sayfa yönlendirmesi ve API rotaları |
| **Dil** | TypeScript | Tip güvenliği ve ölçeklenebilirlik |
| **Stil / UI** | Tailwind CSS + Lucide React | Minimalist, kurumsal ve esnek bileşen stilleri |
| **State & Mock DB** | Repository Pattern + Local/Context Store | Gelecekte Supabase/PostgreSQL'e tek satırda geçişe uygun soyutlanmış servis katmanı |
| **Grafik & Veri** | Recharts / Chart.js | Mentörlük başarı puanı ve zaman serisi analitiği |

---

## 2. Klasör ve Modül Mimarisi

```text
src/
├── app/
│   ├── layout.tsx              # Root Layout, Navbar & Footer
│   ├── page.tsx                # 1. Ana Sayfa (Vitrin, Etkinlikler, Duyurular)
│   ├── profile/
│   │   └── page.tsx            # 2. Üye Ol / Profil Yönetimi
│   ├── matching/
│   │   └── page.tsx            # 3. Eşleştirme & Akıllı Arama
│   ├── groups/
│   │   ├── page.tsx            # 4. Tanışma & Grup Listesi
│   │   └── [id]/page.tsx       # 4. Grup Detayı & Sohbet/Forum Kanalı
│   ├── projects/
│   │   ├── page.tsx            # 5. Projeler Vitrini & Yönetim Sekmeleri
│   │   └── [id]/page.tsx       # 5. Proje Detay & Katılım İstekleri
│   ├── mentorship/
│   │   ├── page.tsx            # 6. Mentör Listesi & CV Profilleri
│   │   └── session/[id]/page.tsx # 6. Aktif Eşleşme, Sohbet & Başarı Grafiği
│   └── city-network/
│       └── page.tsx            # 7. Şehir Ağı & Lokal Görev/Toplantı Panosu
├── components/
│   ├── common/                 # Navbar, Footer, Modal, Badge, Button
│   ├── home/                   # Hero, EventCalendar, Showcase, Announcements
│   ├── matching/               # FilterBar, UserCard, MatchModal
│   ├── projects/               # ProjectCard, ApplicationModal, ManageApplicants
│   ├── mentorship/             # MentorCard, ApplyModal, RatingChart
│   └── city/                   # CitySelector, TaskBoard, MeetupFeed
├── lib/
│   ├── types.ts                # Tüm veri modelleri ve tip tanımları
│   ├── mockData.ts             # Zengin mock veri kümesi
│   └── services/               # Repository desenli veri servisleri
│       ├── userService.ts
│       ├── projectService.ts
│       ├── mentorshipService.ts
│       └── groupService.ts
```

---

## 3. Detaylı Modül Spesifikasyonları

### Modül 1: Ana Sayfa (Landing & Announcements)
- **Hakkımızda / Tanıtım:** Misyon, vizyon, kulüp hedefleri.
- **Etkinlik Takvimi:** Yaklaşan fiziki/çevrimiçi etkinlikler (tarih, mekan, konuşmacı, takvime ekle butonu).
- **Faaliyet Vitrini:** Geçmişte yapılan hackathonlar, seminerler, hayata geçen projelerin başarı kartları.
- **Duyurular Panosu:** Kulüp yönetiminden güncel duyurular (etiket ve önem derecesi ile).

### Modül 2: Üye Ol / Profil Yönetimi
- **Kayıt Formu:**
  - İsim, Soyisim
  - Şehir (Türkiye 81 il dropdown)
  - Üniversite / Meslek Alanı (Bilgisayar Müh., Mimar, Doktor, Tasarımcı vb.)
  - İlgi Alanları (Çoklu tag/etiket seçimi)
  - Tercih Amacı (Proje, Tanışma, Mentörlük)
- **Profil Sayfası:** Bilgileri güncelleme, dahil olunan projeler, üye olunan gruplar ve aktif mentörlük süreçleri.

### Modül 3: Eşleştirme ve Dinamik Arama (Matching Engine)
- **Çoklu Filtre Barı:**
  - Şehir filtresi (Dropdown)
  - Tercih türü filtresi (Proje arkadaşı, Tanışma, Mentörlük)
  - Uzmanlık alanı filtresi (Mühendis, Mimar, Geliştirici vb.)
- **Sonuç Kartları:** İlgili kriterlere göre anlık filtrelenen kullanıcı profilleri; doğrudan mesaj/bağlantı kurma butonu.

### Modül 4: Tanışma & Grup Sohbet Alanı
- **Grup Oluşturma:** Grup adı, kategorisi/amacı (Hackathon, Fikir Fırtınası, Kitap Kulübü vb.), açıklama.
- **Katılım Akışı:** Katılmak isteyen üye uzmanlık alanını belirten bir başvuru notu ile istek gönderir. Grup yöneticisi onayladığında kanala dahil olur.
- **Kanal / Forum Görünümü:** Onaylı üyeler için metin tabanlı mesajlaşma ve fikir tartışma paneli.

### Modül 5: Proje Yönetimi ve İnceleme Modülü
- **Proje Oluşturma:** Başlık, özet, durum etiketi (`Yakında Başlayacak`, `Devam Ediyor`, `Bitti`), aranan roller (örn: Frontend Geliştirici, Mimar), kontenjan.
- **Katılım İstekleri:** Kullanıcılar role özel başvuru yapar; proje sahibi başvuranları inceler, onaylar/reddeder.
- **İki Sekmeli Yapı:**
  - **Sekme 1 (Keşfet):** Tüm topluluk projelerinin listelendiği genel vitrin.
  - **Sekme 2 (Yönetim):** Kullanıcının oluşturduğu veya üyesi olduğu projelerin başvuru takip paneli.

### Modül 6: Mentörlük Sistemi & Başarı Puanlama Algoritması
- **Mentör Profili:** Uzmanlık alanları, biyografi, deneyim ve CV özeti.
- **Başvuru & Özel Sohbet:** Mentörlük talep mesajı gönderilir; kabul edilirse iki kişi arasında 1-e-1 özel kanal açılır.
- **Puanlama ve Otomatik Sonlanma Mantığı:**
  - Mentör periyodik olarak danışana 100 üzerinden puan verir.
  - Puanlar zaman serisi grafiğine yansıtılır (Line/Area chart).
  - **İş Mantığı:** Süreç başladıktan sonraki ilk 5 gün puan ortalaması ne olursa olsun hizmet devam eder (alışma süresi). 5. günün ardından ortalama puan 50'nin altına inerse sistem süreci otomatik kapatır ve sohbeti arşive alır.

### Modül 7: Şehir Ağı (Local Community Network)
- **Şehir Seçimi & Katılım:** Kullanıcı kendi il ağını seçer (örn: Ankara Ağı).
- **Lokal Pano:** Şehir özelinde yüz yüze toplantı yer ve saatleri, yerel görev dağılımları ve o ile özel etkinlik duyuruları.

---

## 4. Uygulama Görev Listesi (Task List)

- [ ] **Aşama 1: Temel Kurulum & Mimarinin Hazırlanması**
  - Next.js 14 App Router, TypeScript ve Tailwind CSS yapılandırması
  - `src/lib/types.ts` ile tüm veri tiplerinin tanımlanması (User, Project, Group, Mentorship, Announcement)
  - Mock servis katmanının (`mockData.ts` ve repository servisleri) oluşturulması
  - Ortak UI bileşenleri (Navbar, Footer, Container, Badge, Button)
- [ ] **Aşama 2: Ana Sayfa & Profil Modülleri**
  - Modül 1: Kulüp vitrini, etkinlik takvimi, faaliyet kartları ve duyurular
  - Modül 2: Kayıt/profil düzenleme formu, tag seçici ve profil paneli
- [ ] **Aşama 3: Eşleştirme & Topluluk Grupları**
  - Modül 3: Şehir, amaç ve uzmanlık filtreli arama motoru
  - Modül 4: Grup kurma, başvuru yapma/onaylama akışı ve sohbet/forum ekranı
- [ ] **Aşama 4: Projeler & Başvuru Yönetimi**
  - Modül 5: İki sekmeli proje panosu, yeni proje açma formu, başvuru onay/red modalı
- [ ] **Aşama 5: Mentörlük & Şehir Ağı**
  - Modül 6: Mentör vitrini, başvuru akışı, puanlama grafiği ve 5 gün / 50 puan kural motoru
  - Modül 7: Şehir bazlı yerel kanallar, fiziki toplantı ve görev panosu
- [ ] **Aşama 6: Test & Parlatma**
  - Responsive mobil uyumluluk kontrolleri
  - UI parlatmaları ve tutarlı renk paleti (Modern Indigo/Slate teması)