// Tarihî kaynaklarda geçen bölgeleri, geçitleri ve yerleri küre üzerine çizer.
// Veri: public/data/tarihi-bolgeler.json
//   tur: "bolge" → kesik çizgili sınır + harfleri aralıklı ad (atlaslardaki gibi)
//   tur: "gecit" → kapı simgesi
//   tur: "yer"   → yıldız simgesi (Orhun Yazıtlarında ve kaynaklarda geçen yerler)
//   tur: "hat"   → kesik çizgili sınır hattı (ör. Roma'nın Tuna–Ren hattı); "hat" bir çizgi listesidir
// Her kayıt ayrı ayrı gösterilip gizlenebilir.

import { YAZI_OLCEGI } from "../yardimci.js";

const RENK = "#fff1c1";        // fildişi: coğrafya ve devlet renklerinden ayrışsın
const SECILI_RENK = "#ffb020"; // seçili bölge
const HAT_RENGI = "#ffb0a0";   // sınır hatları: bölge sınırlarından ayrışsın diye somon rengi
const KOYU = "#0b1119";
// Bölge adları: siyah yazı + açık renkli kontur (her zeminde okunur)
const YAZI = "#000000";
const SECILI_YAZI = "#b54500"; // seçili bölgenin adı koyu turuncu

const svg = (icerik) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${icerik}</svg>`
);
const SIMGELER = {
  gecit: (renk) => svg(`<path d="M4 26V12a10 10 0 0 1 20 0v14h-6V13a4 4 0 0 0-8 0v13z" fill="${renk}" stroke="${KOYU}" stroke-width="2"/>`),
  yer: (renk) => svg(`<path d="M14 2l3.6 7.6 8.2 1-6 5.7 1.6 8.2L14 20.4l-7.4 4.1 1.6-8.2-6-5.7 8.2-1z" fill="${renk}" stroke="${KOYU}" stroke-width="1.6"/>`),
};

const renk = (css, alfa = 1) => Cesium.Color.fromCssColorString(css).withAlpha(alfa);
const koordinatlar = (liste) => Cesium.Cartesian3.fromDegreesArray(liste.flat());

// "MAVERAÜNNEHİR" → "M A V E R A Ü N N E H İ R" (ince boşluklarla)
const aralikliYaz = (s) => s.toLocaleUpperCase("tr").split("").join(" ");

// Bölgenin ortası: etiketin ve kameranın hedefi (hatlarda konum elle verilir)
export function bolgeMerkezi(b) {
  if (b.konum) return b.konum;
  const n = b.sinir.length;
  return [b.sinir.reduce((t, p) => t + p[0], 0) / n, b.sinir.reduce((t, p) => t + p[1], 0) / n];
}

export function tarihiBolgeKatmani(viewer, bolgeler) {
  const kayitlar = new Map();
  let oncekiSecili = null;

  for (const b of bolgeler) {
    // Her bölgenin parçaları bir "kök"e bağlı: kökü gizleyince hepsi gizlenir
    const kok = viewer.entities.add({ show: false });
    const tumu = [];
    const ekle = (tanim, ust = kok) => {
      const e = viewer.entities.add({ parent: ust, ...tanim });
      tumu.push(e);
      return e;
    };
    const parcalar = {};

    if (b.tur === "bolge") {
      parcalar.alan = ekle({
        polygon: { hierarchy: koordinatlar(b.sinir), material: renk(RENK, 0.16), zIndex: 5 },
      });
      parcalar.kenar = ekle({
        polyline: {
          positions: koordinatlar([...b.sinir, b.sinir[0]]),
          width: 3,
          material: new Cesium.PolylineDashMaterialProperty({ color: renk(RENK), dashLength: 14 }),
          clampToGround: true,
          zIndex: 5,
        },
      });
      // Seçilince görünen turuncu sınır. Yere yapışık alanların rengini sonradan değiştirmek
      // Cesium'da çizimi çökertebildiği için vurgu ayrı bir çizgiyle (biraz havada) yapılır.
      parcalar.vurgu = ekle({
        show: false,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(
            [...b.sinir, b.sinir[0]].flatMap(([x, y]) => [x, y, 25_000])
          ),
          width: 4,
          material: renk(SECILI_RENK),
          arcType: Cesium.ArcType.GEODESIC,
        },
      });
    }

    if (b.tur === "hat") {
      for (const cizgi of b.hat) {
        ekle({
          polyline: {
            positions: koordinatlar(cizgi),
            width: 3,
            material: new Cesium.PolylineDashMaterialProperty({ color: renk(HAT_RENGI), dashLength: 18 }),
            clampToGround: true,
            zIndex: 6,
          },
        });
      }
      // Seçilince görünen turuncu çizgiler tek bir üst kayda bağlı: onu açıp kapatmak yeter
      parcalar.vurgu = ekle({ show: false });
      for (const cizgi of b.hat) {
        ekle({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(cizgi.flatMap(([x, y]) => [x, y, 25_000])),
            width: 4,
            material: renk(SECILI_RENK),
            arcType: Cesium.ArcType.GEODESIC,
          },
        }, parcalar.vurgu);
      }
    }

    const [boylam, enlem] = bolgeMerkezi(b);

    // Uzaktan bakınca adlar üst üste binmesin: büyük bölgelerin adı her zaman,
    // küçük bölgelerin ve geçitlerin adı ancak yakınlaşınca görünür (simgeler hep görünür)
    const noktalar = b.sinir ?? b.hat?.flat() ?? [];
    const genislik = noktalar.length
      ? Math.max(...noktalar.map((p) => p[0])) - Math.min(...noktalar.map((p) => p[0]))
      : 0;
    const ortali = b.tur === "bolge" || b.tur === "hat";
    const adMesafesi = genislik >= 12 ? Infinity : genislik >= 6 ? 9e6 : 6e6;

    parcalar.etiket = ekle({
      position: Cesium.Cartesian3.fromDegrees(boylam, enlem),
      billboard: SIMGELER[b.tur] ? { image: SIMGELER[b.tur](RENK), width: 24, height: 24 } : undefined,
      label: {
        text: b.tur === "bolge" ? aralikliYaz(b.ad) : b.ad,
        font: b.tur === "bolge" ? '600 15px "Marcellus", Georgia, serif' : '600 14px "Marcellus", Georgia, serif',
        scale: YAZI_OLCEGI,
        fillColor: renk(YAZI),
        outlineColor: renk("#ffffff", 0.45),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: ortali ? Cesium.HorizontalOrigin.CENTER : Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        pixelOffset: ortali ? Cesium.Cartesian2.ZERO : new Cesium.Cartesian2(16, 0),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, adMesafesi),
        scaleByDistance: new Cesium.NearFarScalar(3e6, 1.1, 1.4e7, 0.75),
      },
    });

    // Tıklanınca hangi bölge olduğunu bilelim (kökün altındaki her çizgi ve alan)
    for (const e of tumu) e.bolgeId = b.id;
    kayitlar.set(b.id, { veri: b, kok, ...parcalar });
  }

  return {
    goster(id, acik) {
      kayitlar.get(id).kok.show = acik;
    },
    gorunurMu(id) {
      return kayitlar.get(id).kok.show;
    },
    // Seçili bölge turuncu renkle vurgulanır. Sadece seçimi değişen bölgelere dokunulur.
    vurgula(seciliId) {
      if (seciliId === oncekiSecili) return;
      for (const id of [oncekiSecili, seciliId]) {
        const k = kayitlar.get(id);
        if (!k) continue;
        const secili = id === seciliId;
        k.etiket.label.fillColor = renk(secili ? SECILI_YAZI : YAZI);
        if (k.etiket.billboard) k.etiket.billboard.image = SIMGELER[k.veri.tur](secili ? SECILI_RENK : RENK);
        if (k.vurgu) k.vurgu.show = secili;
      }
      oncekiSecili = seciliId;
    },
  };
}
