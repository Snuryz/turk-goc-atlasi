// Natural Earth (https://www.naturalearthdata.com) verisinden public/data/cografya.json dosyasını üretir.
// Sadece veriyi yeniden üretmek gerektiğinde kullanılır; uygulamanın çalışması için gerekmez.
//
// Kullanım:
//   node araclar/cografya-verisi-hazirla.js <natural-earth-klasoru> public/data/cografya.json
//
// Klasörde şu dosyalar olmalı (github.com/nvkelso/natural-earth-vector → geojson/):
//   ne_10m_geography_regions_polys.geojson
//   ne_10m_rivers_lake_centerlines.geojson
//   ne_50m_lakes.geojson

import fs from "node:fs";
import path from "node:path";

const [kaynak, hedef] = process.argv.slice(2);
const oku = (ad) => JSON.parse(fs.readFileSync(path.join(kaynak, ad), "utf8")).features;

// ---------- Yardımcılar ----------

const yuvarla = (n) => Math.round(n * 100) / 100;

// Birbirine çok yakın noktaları atarak çizgiyi sadeleştirir (dosya küçük kalsın)
function sadelestir(noktalar, esik = 0.12) {
  const sonuc = [noktalar[0]];
  for (const n of noktalar.slice(1, -1)) {
    const s = sonuc[sonuc.length - 1];
    if (Math.hypot(n[0] - s[0], n[1] - s[1]) >= esik) sonuc.push(n);
  }
  sonuc.push(noktalar[noktalar.length - 1]);
  return sonuc.map(([x, y]) => [yuvarla(x), yuvarla(y)]);
}

// Poligonun ağırlık merkezi (etiketin konacağı yer)
function merkez(halka) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < halka.length - 1; i++) {
    const [x1, y1] = halka[i], [x2, y2] = halka[i + 1];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) return halka[0];
  return [yuvarla(cx / (3 * a)), yuvarla(cy / (3 * a))];
}

const alan = (halka) => Math.abs(halka.reduce((t, [x1, y1], i) => {
  const [x2, y2] = halka[(i + 1) % halka.length];
  return t + x1 * y2 - x2 * y1;
}, 0)) / 2;

// "DOĞU SAYAN DAĞLARI" → "Doğu Sayan Dağları"
// Türkçe kelimelerde I → ı olur, yabancı adlarda (TIBESTI) I → i kalır.
const TURKCE_KELIMELER = new Set(["dağları", "sıradağı", "sıradağları", "platosu", "çölü", "havzası", "ovası", "yaylası", "doğu", "batı", "kuzey", "güney", "orta", "yukarı", "küçük", "büyük"]);
const buyukHarfle = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
function kucukHarfle(kelime) {
  const tr = kelime.toLocaleLowerCase("tr");
  return TURKCE_KELIMELER.has(tr) ? tr : kelime.replaceAll("İ", "i").toLocaleLowerCase("en");
}
function duzelt(ad) {
  if (ad === ad.toLocaleUpperCase("tr")) {
    return ad.split(" ").map((k) => k.split("-").map((p) => buyukHarfle(kucukHarfle(p))).join("-")).join(" ");
  }
  return ad.replace(/ (çölü|yaylası|ovası|dağları|platosu|havzası|stepleri)\b/g, (k) => " " + buyukHarfle(k.trim()));
}

// ---------- Dağlar, çöller, platolar, ovalar ----------

const TURLER = {
  "Range/mtn": "dag",
  Desert: "col",
  Plateau: "plato",
  Plain: "ova",
  Lowland: "ova",
  Basin: "havza",
  Depression: "havza",
  Valley: "vadi",
};

// Natural Earth adı → uygulamada görünecek ad (tarihî adlar dahil)
const BOLGE_ADLARI = {
  "PONTIC STEPPE": "Deşt-i Kıpçak",
  "KAZAKH STEPPE": "Kazak Bozkırı",
  "KAZAKH UPLAND": "Kazak Yaylası",
  "TURAN LOWLAND": "Turan Ovası",
  "Alföld": "Macar Ovası (Alföld)",
  "BETPAQDALA DESERT": "Betpak-Dala Çölü",
  "ALTUN MTS.": "Altın Dağ",
  "Hentiyn Mts.": "Kentey Dağları",
  "Hangayn Mts.": "Hangay Dağları",
  "Kavir Desert": "Deşt-i Kevir",
  "LUT DESERT": "Deşt-i Lut",
  "Junggar Basin": "Cungarya Havzası",
  "Ustyurt Plateau": "Üstyurt Platosu",
  "DECCAN PLATEAU": "Dekken Platosu",
  "THAR DESERT": "Tar Çölü",
  "TIAN SHAN": "Tanrı Dağları (Tiyanşan)",
  "TAKLIMAKAN DESERT": "Taklamakan Çölü",
  "GARAGUM DESERT": "Karakum Çölü",
  "QIZILQUM DESERT": "Kızılkum Çölü",
  "CASPIAN DEPRESSION": "Hazar Çöküntüsü",
  "Tannu-Ola Ra.": "Tannu-Ola Dağları",
  "Kopet Dag Mts .": "Kopet Dağları",
};
const DISARIDA = new Set(["PENÍNSULA IBÉRICA", "PUNJAB", "Calabria", "Jabal Nafüsah"]);

// Türk tarihinin geçtiği çekirdek bölge: burada daha küçük yerler de gösterilir
const cekirdekte = ([x, y]) => x > 25 && x < 120 && y > 33 && y < 56;
const genisAlanda = ([x, y]) => x > -12 && x < 140 && y > 12 && y < 70;

const bolgeler = [];
for (const f of oku("ne_10m_geography_regions_polys.geojson")) {
  const p = f.properties;
  const tur = TURLER[p.FEATURECLA];
  if (!tur || DISARIDA.has(p.NAME) || !f.geometry) continue;

  const parcalar = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const halkalar = parcalar
    .map((poligon) => sadelestir(poligon[0])) // sadece dış sınır
    .filter((h) => h.length >= 4 && alan(h) > 0.05);
  if (!halkalar.length) continue;

  const enBuyuk = halkalar.reduce((a, b) => (alan(a) > alan(b) ? a : b));
  const etiket = merkez(enBuyuk);
  if (!genisAlanda(etiket)) continue;
  if (p.SCALERANK > 5 || (p.SCALERANK === 5 && !cekirdekte(etiket))) continue;

  bolgeler.push({
    ad: BOLGE_ADLARI[p.NAME] ?? duzelt(p.NAME_TR || p.NAME),
    tur,
    onem: p.SCALERANK,
    etiket,
    poligonlar: halkalar,
  });
}

// ---------- Nehirler ----------

// Natural Earth adı → [görünecek ad, önem (1: uzaktan da görünür, 2: yakınlaşınca)]
const NEHIRLER = {
  Volga: ["İtil (Volga)", 1],
  Ural: ["Yayık (Ural)", 1],
  Danube: ["Tuna", 1], Donau: ["Tuna", 1],
  // Natural Earth'te Drava'nın aşağı boyu "Mur" adıyla, Tisa'nın Macaristan'daki kısmı adsız geçer.
  // Bu iki parça cografya.json'a elle eklendi; betik yeniden çalıştırılırsa ayrıca eklenmeleri gerekir.
  Rhein: ["Ren", 1], Rhin: ["Ren", 1], Rhine: ["Ren", 1], Nederrijn: ["Ren", 1], Waal: ["Ren", 1],
  Sava: ["Sava", 2], Drau: ["Drava", 2], Tisa: ["Tisa", 2],
  Dnipro: ["Özü (Dinyeper)", 1], Dnepre: ["Özü (Dinyeper)", 1],
  Dniester: ["Turla (Dinyester)", 2],
  Don: ["Ten (Don)", 1],
  Kuban: ["Kuban", 2],
  Kama: ["Kama", 2],
  "Amu  Darya": ["Ceyhun (Amu Derya)", 1], Panj: ["Ceyhun (Amu Derya)", 1], Pamir: ["Ceyhun (Amu Derya)", 1],
  "Syr  Darya": ["Seyhun (Sir Derya)", 1], Naryn: ["Seyhun (Sir Derya)", 1],
  Zarafshon: ["Zerefşan", 2],
  Tarim: ["Tarım", 2], Yarkant: ["Yarkent", 2], Aksu: ["Aksu", 2],
  Ile: ["İli", 2],
  Ertis: ["İrtiş", 1], Ertix: ["İrtiş", 1], Irtysh: ["İrtiş", 1],
  Ishim: ["İşim", 2], Esil: ["İşim", 2],
  Tobol: ["Tobol", 2],
  Ob: ["Obi", 1], Katun: ["Katun", 2], Biya: ["Biya", 2],
  Yenisey: ["Yenisey (Kem)", 1], "Verkhniy Yenisey": ["Yenisey (Kem)", 1], "Malyy Yenisey": ["Yenisey (Kem)", 1],
  "Bol’shoy Yenisey": ["Yenisey (Kem)", 1], "Kyzyl-Khem": ["Yenisey (Kem)", 1],
  Selenga: ["Selenga", 1], Ideriyn: ["Selenga", 1],
  Orhon: ["Orhun", 1],
  Herlen: ["Kerülen", 2],
  Onon: ["Onon", 2],
  Amur: ["Amur", 2], "Heilong Jiang": ["Amur", 2], Shilka: ["Amur", 2],
  Huang: ["Sarı Irmak (Huang He)", 1],
  "Xar Moron": ["Şira Muren", 2],
  Euphrates: ["Fırat", 1], Firat: ["Fırat", 1], "Al Furat": ["Fırat", 1],
  Tigris: ["Dicle", 1], Dicle: ["Dicle", 1],
  "Shatt al Arab": ["Şattülarap", 2],
  Murat: ["Murat", 2],
  "Kiz?lirmak": ["Kızılırmak", 1], "Kızılırmak": ["Kızılırmak", 1],
  Sakarya: ["Sakarya", 2],
  Ceyhan: ["Ceyhan", 2],
  "Byk Menderes": ["Büyük Menderes", 2],
  Aras: ["Aras", 2],
  Kura: ["Kura", 2],
  Atrek: ["Atrek", 2],
  Helmand: ["Hilmend", 2],
  Indus: ["İndus (Sind)", 1],
  Ganges: ["Ganj", 1],
  Nile: ["Nil", 1],
  Yangtze: ["Yangçe", 1], "Chang Jiang": ["Yangçe", 1], Jinsha: ["Yangçe", 1],
};

const nehirGruplari = new Map();
for (const f of oku("ne_10m_rivers_lake_centerlines.geojson")) {
  const tanim = NEHIRLER[f.properties.name];
  if (!tanim || !f.geometry) continue;
  const [ad, onem] = tanim;
  const cizgiler = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
  if (!genisAlanda(cizgiler[0][0])) continue;
  if (!nehirGruplari.has(ad)) nehirGruplari.set(ad, { ad, onem, cizgiler: [] });
  for (const c of cizgiler) if (c.length >= 2) nehirGruplari.get(ad).cizgiler.push(sadelestir(c, 0.08));
}
const nehirler = [...nehirGruplari.values()].map((n) => {
  const enUzun = n.cizgiler.reduce((a, b) => (a.length > b.length ? a : b));
  return { ...n, etiket: enUzun[Math.floor(enUzun.length / 2)] };
});

// ---------- Denizler ve göller (sadece adları) ----------

const sular = [
  { ad: "Karadeniz", tur: "deniz", onem: 1, konum: [34, 43.3] },
  { ad: "Hazar Denizi", tur: "deniz", onem: 1, konum: [51, 41.8] },
  { ad: "Akdeniz", tur: "deniz", onem: 1, konum: [18, 34.5] },
  { ad: "Ege Denizi", tur: "deniz", onem: 2, konum: [25, 38.8] },
  { ad: "Azak Denizi", tur: "deniz", onem: 2, konum: [36.5, 46.1] },
  { ad: "Kızıldeniz", tur: "deniz", onem: 1, konum: [38.5, 21] },
  { ad: "Basra Körfezi", tur: "deniz", onem: 1, konum: [51.5, 27] },
  { ad: "Umman Denizi", tur: "deniz", onem: 1, konum: [63, 17] },
  { ad: "Baltık Denizi", tur: "deniz", onem: 1, konum: [19.5, 57.5] },
  { ad: "Sarı Deniz", tur: "deniz", onem: 1, konum: [123.5, 36] },
  { ad: "Japon Denizi", tur: "deniz", onem: 1, konum: [134, 40.5] },
  { ad: "Aral Gölü", tur: "gol", onem: 1, konum: [59.6, 45.2] }, // Natural Earth'te bugünkü küçülmüş hâli var; tarihî konumu elle verildi
];
const GOLLER = {
  "Lake Balkhash": ["Balkaş Gölü", 1],
  "Lake Baikal": ["Baykal Gölü", 1],
  "Issyk-Kul": ["Issık Göl", 2],
  "Lake Van": ["Van Gölü", 2],
  "Lake Urmia": ["Urmiye Gölü", 2],
  "Lake Zaysan": ["Zaysan Gölü", 2],
  "Khövsgöl Nuur": ["Hövsgöl Gölü", 2],
};
for (const f of oku("ne_50m_lakes.geojson")) {
  const tanim = GOLLER[f.properties.name_en] ?? GOLLER[f.properties.name];
  if (!tanim) continue;
  const halka = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
  sular.push({ ad: tanim[0], tur: "gol", onem: tanim[1], konum: merkez(halka) });
}

// ---------- Kaydet ----------

const veri = { kaynak: "Natural Earth (kamu malı)", bolgeler, nehirler, sular };
fs.writeFileSync(hedef, JSON.stringify(veri));
console.log(`${bolgeler.length} bölge, ${nehirler.length} nehir, ${sular.length} deniz/göl → ${hedef}`);
console.log("Bulunamayan göller:", Object.values(GOLLER).map((g) => g[0]).filter((a) => !sular.some((s) => s.ad === a)).join(", ") || "yok");
