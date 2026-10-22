// Dağları, çölleri, platoları, ovaları, nehirleri, denizleri ve gölleri küre üzerine çizer.
// Veri: public/data/cografya.json (araclar/cografya-verisi-hazirla.js ile üretilir)

import { TELEFON, YAZI_OLCEGI } from "../yardimci.js";

// Her yer şekli türünün dolgu rengi
const TURLER = {
  dag:   { alan: "#8b5a3c", alfa: 0.4 },
  col:   { alan: "#e0b45e", alfa: 0.38 },
  plato: { alan: "#a88a5c", alfa: 0.22 },
  ova:   { alan: "#9fb560", alfa: 0.25 },
  havza: { alan: "#b9a35f", alfa: 0.22 },
  vadi:  { alan: "#6fae5f", alfa: 0.35 },
};
const NEHIR_RENGI = "#4fa8e8";

// Coğrafya adları: tam siyah yazı + çok ince, yarı saydam açık kontur (koyu zeminde de seçilsin diye)
const YAZI = "#000000";
const YAZI_KONTURU = "#ffffff";

// Bir yerin adı, kamera bu yükseklikten (metre) daha alçaktayken görünür. Anahtar: yerin önemi (1 en önemli).
// İki mod var:
//  - TUM: bütün yer adları; büyük ve orta yerler hemen, küçükler biraz yakınlaşınca (bilgisayardaki varsayılan)
//  - ONEMLI: telefonda varsayılan; açılışta yalnızca önemli dağ, nehir ve denizler, ayrıntılar yakınlaştıkça
const GORUNME_MESAFESI = {
  TUM:    { 1: 30e6, 2: 9e6, 3: 6e6, 4: 4e6, 5: 2.8e6 },
  ONEMLI: { 1: 30e6, 2: 6e6, 3: 3e6, 4: 1.6e6, 5: 1e6 },
};
// Telefonda coğrafya adları diğer adlardan da biraz küçük yazılır
const COGRAFYA_TELEFON_OLCEGI = 0.72;

const renk = (css, alfa = 1) => Cesium.Color.fromCssColorString(css).withAlpha(alfa);
const koordinatlar = (liste) => Cesium.Cartesian3.fromDegreesArray(liste.flat());
const mesafe = (mod, onem) => new Cesium.DistanceDisplayCondition(0, GORUNME_MESAFESI[mod][onem] ?? GORUNME_MESAFESI[mod][5]);

function etiket(ad, konum, { font, onem }) {
  return {
    position: Cesium.Cartesian3.fromDegrees(konum[0], konum[1]),
    label: {
      text: ad,
      font,
      scale: TELEFON ? COGRAFYA_TELEFON_OLCEGI : YAZI_OLCEGI,
      fillColor: renk(YAZI),
      outlineColor: renk(YAZI_KONTURU, 0.45),
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition: mesafe(TELEFON ? "ONEMLI" : "TUM", onem),
      scaleByDistance: new Cesium.NearFarScalar(2e6, 1.1, 1.6e7, 0.85), // uzaklaştıkça yazı biraz küçülsün
    },
  };
}

export function cografyaKatmani(viewer, { bolgeler, nehirler, sular }) {
  // Tüm coğrafya öğeleri "kok"e bağlıdır; adlar ayrıca "adKok"e bağlıdır.
  // Böylece hem bütün coğrafya hem de sadece adlar ayrı ayrı gizlenebilir.
  const kok = viewer.entities.add({ id: "cografya" });
  const adKok = viewer.entities.add({ id: "cografya-adlari", parent: kok });
  const ekle = (tanim) => viewer.entities.add({ parent: kok, ...tanim });
  // Adlar, mod değişince görünme mesafeleri yeniden hesaplanabilsin diye önemleriyle birlikte saklanır
  const adlar = [];
  const adEkle = (ad, konum, ayar) => adlar.push({ varlik: viewer.entities.add({ parent: adKok, ...etiket(ad, konum, ayar) }), onem: ayar.onem });

  // 1) Bölgeler: önce renkli alanlar, sonra adlar
  for (const b of bolgeler) {
    const t = TURLER[b.tur];
    for (const halka of b.poligonlar) {
      ekle({
        polygon: { hierarchy: koordinatlar(halka), material: renk(t.alan, t.alfa), zIndex: 0 },
      });
    }
    // Haritacılık geleneği: dağ adları büyük harfle, çöl adları eğik yazılır
    const ad = b.tur === "dag" ? b.ad.toLocaleUpperCase("tr") : b.ad;
    const font = b.tur === "dag" ? '600 13px "IBM Plex Sans", sans-serif'
               : b.tur === "col" ? 'italic 600 14px "IBM Plex Sans", sans-serif'
               : '600 13px "IBM Plex Sans", sans-serif';
    adEkle(ad, b.etiket, { font, onem: b.onem });
  }

  // 2) Nehirler: mavi çizgiler + eğik yazılmış adlar (büyük nehirler önemli sayılır)
  for (const n of nehirler) {
    for (const cizgi of n.cizgiler) {
      ekle({
        polyline: {
          positions: koordinatlar(cizgi),
          width: n.onem === 1 ? 2.5 : 1.6,
          material: renk(NEHIR_RENGI, 0.9),
          clampToGround: true,
          zIndex: 1,
        },
      });
    }
    adEkle(n.ad, n.etiket, { font: 'italic bold 13px Georgia, serif', onem: n.onem === 1 ? 2 : 4 });
  }

  // 3) Denizler ve göller: sadece adları
  for (const s of sular) {
    adEkle(s.ad, s.konum, {
      font: s.tur === "deniz" ? 'italic bold 16px Georgia, serif' : 'italic bold 13px Georgia, serif',
      onem: s.tur === "deniz" ? s.onem : s.onem + 1,
    });
  }

  return {
    goster(acik) { kok.show = acik; },
    adlariGoster(acik) { adKok.show = acik; },
    // tum = true: bütün yer adları; false: yalnızca önemli yerler, ayrıntılar yakınlaştıkça
    // telefon: coğrafya adlarının yazı boyutu (telefonda biraz daha küçük)
    ayrintiModu(tum, telefon) {
      const mod = tum ? "TUM" : "ONEMLI";
      for (const a of adlar) {
        a.varlik.label.distanceDisplayCondition = mesafe(mod, a.onem);
        a.varlik.label.scale = telefon ? COGRAFYA_TELEFON_OLCEGI : 1;
      }
    },
  };
}
