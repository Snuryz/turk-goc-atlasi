# Türk Göç Atlası

Türk devletlerini, göç yollarını ve kavimleri 3B dünya küresi üzerinde zaman çizelgesiyle gösteren web uygulaması.

## Çalıştırma

Terminalde proje klasöründe:

```
npm install      # sadece ilk seferde: gerekli paketleri indirir
npm run dev      # uygulamayı başlatır
```

Sonra tarayıcıda **http://localhost:5173** adresini açın. Dosyalarda değişiklik yapıp kaydettiğinizde sayfa kendiliğinden yenilenir. Durdurmak için terminalde `Ctrl + C`.

## Klasör yapısı

```
index.html                  Sayfanın iskeleti (başlık, küre alanı, panel, zaman çubuğu)
public/data/                VERİLER: tarih bilgisi buraya eklenir
  devletler.json
  goc-yollari.json
  kavimler.json
  atayurt.json
src/
  main.js                   Giriş noktası: veriyi yükler, parçaları birbirine bağlar
  kure.js                   3B küreyi kurar, kamerayı uçurur
  katmanlar/
    devletler.js            Devlet alanlarını ve isimlerini çizer
    goc-yollari.js          Göç oklarını çizer
    kavimler.js             Kavim ve atayurt noktalarını çizer
  panel.js                  Sağdaki bilgi paneli
  zaman-cubugu.js           Alttaki yıl kaydırıcısı ve ▶ düğmesi
  yardimci.js               Küçük ortak fonksiyonlar
  style.css                 Renkler ve yerleşim
```

## Veri ekleme

Koordinatlar her zaman **[boylam, enlem]** sırasıyla yazılır (önce doğu-batı, sonra kuzey-güney). Örneğin Ankara `[32.85, 39.93]`. MÖ yıllar eksi sayı olarak yazılır (MÖ 220 → `-220`).

### Yeni devlet (`public/data/devletler.json`)

```json
{
  "id": "harezm",
  "ad": "Harezmşahlar",
  "baslangic": 1077,
  "bitis": 1231,
  "baskent": "Gürgenç",
  "kurucu": "Anuş Tegin",
  "renk": "#7a9fd1",
  "merkez": [60, 41],
  "aciklama": "Kısa açıklama...",
  "sinir": [[55, 44], [64, 44], [66, 38], [56, 37]]
}
```

- `id`: Benzersiz, Türkçe karakter ve boşluk içermeyen kısa ad.
- `merkez`: İsim etiketinin duracağı yer.
- `sinir`: Sınırın köşe noktaları (temsili). Yalnızca `sinirlar` yazılmamış devletlerde kullanılır.
- `sinirlar` (isteğe bağlı): Zamanla değişen sınır. Her aşama `{ "yil", "not", "parcalar" }` biçimindedir; `parcalar` bir ya da birkaç kapalı alandır (ör. Osmanlı'nın Anadolu-Balkan ve Kuzey Afrika parçaları). Haritada, zaman çizelgesindeki yıla eşit ya da ondan küçük olan son aşama gösterilir; `not` devletin kartında "Haritadaki sınır" satırında görünür.

**Sınırların kaynağı:** Sınırlar açık veri setlerinden alındı ve sadeleştirildi; hepsi yaklaşıktır.

- [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (Seshat Global History Databank, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)): Türkiye Cumhuriyeti dışındaki bütün devletler. Art arda gelen ve sınırı birebir aynı olan aşamalar birleştirildi. Veri setinde boş kalan yıllarda bir önceki sınır gösterilir; kartta bu belirtilir.
- II. Göktürk (Kutluk) Kağanlığı (682-745) Cliopatria’da olmadığı için sınırı bu uygulama için elle çizildi: Ötüken merkezli çekirdek alanı gösteren temsili bir alandır. 744’te Uygur Kağanlığı kurulduğu için 744-745 arasında Göktürk sınırı çizilmez; 631-681 arasında (Çin hâkimiyeti) de doğuda Göktürk sınırı yoktur.
- [Natural Earth](https://www.naturalearthdata.com) (kamu malı): Türkiye Cumhuriyeti. 1939’dan itibaren bugünkü sınır, 1923-1939 arası bugünkü sınırdan Hatay ili çıkarılarak.

Aynı yılda iki devletin sınırı üst üste binmesin diye bazı aşamalardan komşunun alanı çıkarıldı (Büyük Selçuklu 1085-1093, Anadolu Selçuklu 1299-1304, Ak Hunlar 561-567, I. Göktürk 582-586); kartta bu yazar. Bir devletin yıkıldığı yıl yerine yenisi kuruluyorsa (ör. 840: Uygur → Karahanlı) o yıl haritada yalnızca yeni devlet çizilir.

Hız için bir aşamanın çizimi ancak o aşama ilk kez göründüğünde hazırlanır ve her devletin yalnızca son birkaç aşaması hafızada tutulur (bkz. [src/katmanlar/devletler.js](src/katmanlar/devletler.js)).

### Yeni göç yolu (`public/data/goc-yollari.json`)

```json
{ "id": "uygur-turfan", "kavim": "uygur", "ad": "Uygurların Turfan'a göçü", "baslangic": 840, "bitis": 850,
  "yol": [[102.7, 47.4], [96, 45], [89.2, 42.9]] }
```

- `yol`: Başlangıçtan varışa doğru sıralanmış noktalar. Ok `baslangic` yılında çıkar, `bitis` yılında hedefe ulaşır, sonraki 150 yıl içinde yavaşça solar.
- `kavim`: Göç eden kavimin `id`'si. Göç sürerken o kavimin noktası okun ucunda ilerler.

### Yeni kavim (`public/data/kavimler.json`)

```json
{ "id": "nogay", "ad": "Nogaylar", "kol": "kipcak", "baslangic": 1390, "bitis": null, "onem": 1,
  "yurtlar": [[1390, [52, 47.5]], [1700, [45, 44.8]]],
  "aciklama": "Kısa açıklama..." }
```

- `kol`: Dil kolu. Şunlardan biri olmalı: `oguz`, `kipcak`, `karluk`, `ogur`, `sibirya`, `halac`, `eski`. Renkleri [src/kollar.js](src/kollar.js) dosyasında.
- `bitis`: Topluluk bugün de yaşıyorsa `null` yazılır; panelde "günümüz" olarak görünür.
- `yurtlar`: `[yıl, [boylam, enlem]]` listesi. Kavim, o yıldan itibaren o noktada gösterilir.
- `onem`: `1` ise adı her zaman görünür, `2` ise ancak yakınlaşınca.

### Yeni tarihî bölge (`public/data/tarihi-bolgeler.json`)

```json
{ "id": "sogd", "ad": "Soğd", "grup": "Orta Asya", "tur": "bolge",
  "digerAdlar": "Sogdiana", "kaynak": "Arap coğrafyacıları",
  "aciklama": "Kısa açıklama...",
  "sinir": [[65.5, 39.0], [67.5, 39.0], [68.0, 40.0], [66.0, 40.3]] }
```

- `tur`: `bolge` (sınırı çizilir), `gecit` (kapı simgesi), `yer` (yıldız simgesi) veya `hat` (kesik çizgili sınır hattı, ör. Tuna–Ren Hattı).
- `bolge` için `sinir`, `gecit` ve `yer` için `konum: [boylam, enlem]` yazılır. `hat` için `hat` (çizgi listesi: `[[[x, y], [x, y], ...], ...]`) ve adın duracağı `konum` yazılır.
- `grup`: Soldaki panelde hangi başlığın altında listeleneceği. Yeni bir grup adı yazarsanız yeni başlık açılır.
- `turAdi` (isteğe bağlı): Kartın üstündeki yazı. `yer` kayıtlarında varsayılan "Orhun Yazıtlarında geçen yer"dir; başka bir yer için (ör. "Savaş yeri") bunu yazın.
- `konumNotu` (isteğe bağlı): Yeri kesin bilinmeyen kayıtlarda kartta "Yaklaşık konum" kutusunda gösterilir.

### Kaynaklı bilgiler (`konular`) ve kaynak listesi (`public/data/kaynaklar.json`)

Devlet, kavim ve bölge kayıtlarına ve Devletler penceresindeki sayfalara (`devlet-detaylari.json`) kaynaklı bilgi `konular` alanıyla eklenir. Her konunun bir başlığı ve görüşleri vardır; görüşler kaynağın türüne göre gruplanarak gösterilir:

```json
"konular": [
  { "baslik": "Kökeni ve dili",
    "gorusler": [
      { "grup": "uluslararasi", "metin": "...", "kaynaklar": ["iranica-iskitler"] },
      { "grup": "turk", "metin": "...", "kaynaklar": ["durmus-iskit|s. 234", "ders-oatt"] }
    ] }
]
```

- `grup`: `ana` (dönemin kaynakları: Herodot, Shiji...), `uluslararasi`, `turk` (Türk akademisyenler: ansiklopedi maddeleri, kitap bölümleri ve doğrulanmış ders notları) ya da `makale`.
- `kaynaklar`: `kaynaklar.json` dosyasındaki kimlikler. Sayfa numarası `|` ile eklenir: `"durmus-2017|s. 39"`.
- Ders notları (`ders-oatt`) tek başına kaynak gösterilmez; yalnızca bilgiyi doğrulayan yayınla birlikte yazılır ve görüş `turk` grubuna konur.
- Yeni bir kaynak `kaynaklar.json` dosyasına `kunye`, `kisa`, `url` ve `grup` alanlarıyla eklenir. Makaleler penceresi bu listeden kendiliğinden dolar.
- Makalelerin PDF'leri sitede tutulmaz, yalnızca bağlantıları verilir. (Bir PDF eklenecekse `pdf`, `lisans` ve `lisansUrl` alanları hâlâ çalışır; ama lisansı ticari olmayan kullanımla sınırlı ya da değişikliğe kapalı olan PDF'ler eklenmemelidir.)

## Lisanslar ve telif

Uygulama içinde **Makaleler** penceresinin en altında harita verilerinin kaynakları ve lisansları listelenir. Kısaca:

- Devlet sınırları: Cliopatria (Seshat Global History Databank), CC BY 4.0. Sadeleştirildi ve bazı aşamalardan komşu alan çıkarıldı; II. Göktürk sınırı uygulamaya özgü temsili çizimdir.
- Coğrafya, Türkiye sınırı ve harita görüntüsü: Natural Earth (kamu malı). CesiumJS: Apache 2.0. Yazı tipleri: SIL Open Font License.
- Açılıştaki sözler yalnızca telif süresi dolmuş baskılardan çevrilir.
- Bilgi metinleri kaynaklardaki bilgilerden yararlanılarak özgün olarak yazılır; kitap ya da makale cümleleri kopyalanmaz.

### Açılıştaki söz kutusu (`public/data/sozler.json`)

Uygulama açılınca haritanın köşesinde bu dosyadan rastgele seçilen bir söz kısa süre görünür. Yalnızca kaynağı kesin sözler eklenir: `{ "metin": "...", "kim": "kişi, eser, tarih", "kaynak": "hangi baskıdan çevrildiği", "url": "..." }`. Kutunun ekranda kalma süresi [src/soz-kutusu.js](src/soz-kutusu.js) dosyasının başındaki `SURE_MS` değeridir.

## Coğrafya (dağlar, çöller, nehirler)

Dağlar, çöller, ovalar, nehirler, denizler ve göller `public/data/cografya.json` dosyasından çizilir. Renkler ve yazı tipleri [src/katmanlar/cografya.js](src/katmanlar/cografya.js) dosyasının başındaki `TURLER` tablosunda tanımlı. Haritadaki **Coğrafya** kutucuğuyla bu katman açılıp kapatılabilir.

Bu dosya [Natural Earth](https://www.naturalearthdata.com) verisinden (kamu malı) `araclar/cografya-verisi-hazirla.js` betiğiyle üretildi. Bir adı değiştirmek için iki yol var:

- **Kolay yol:** `cografya.json` içinde adı bulup değiştirin.
- **Kalıcı yol:** Betikteki `BOLGE_ADLARI` veya `NEHIRLER` tablosuna ekleyip betiği yeniden çalıştırın. Bu yol için Natural Earth dosyalarını indirmeniz gerekir; betiğin başında hangi dosyalar olduğu yazıyor.

Her yerin bir `onem` değeri var (1 en önemli). Önemi düşük yerlerin adı ancak yakınlaşınca görünür.

## Yayınlama

`npm run build` komutu `dist/` klasörünü üretir. Bu klasör Netlify veya GitHub Pages gibi ücretsiz servislerde yayınlanabilir.
