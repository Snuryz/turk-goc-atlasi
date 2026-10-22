// Eski Türk yazıtlarını, bulundukları yerde dikili taş (bengü taş) simgesiyle küre üzerinde gösterir.
// Veri: public/data/yazitlar.json
// Konumu kaynakta kesin verilmeyen yazıtlar kesik çizgili bir halkayla gösterilir ("yaklaşık konum").

import { YAZI_OLCEGI, TELEFON } from "../yardimci.js";

const TAS = "#e4d8bd";       // taş rengi
const SECILI = "#ffb020";    // seçili yazıt
const KOYU = "#1b140c";

// Dikili taş simgesi: tepesi yuvarlak bir taş, üzerinde runik harfleri andıran çizgiler, altında kaide
function tasSimgesi(renk, yaklasik) {
  const halka = yaklasik
    ? `<circle cx="20" cy="20" r="18" fill="none" stroke="${renk}" stroke-width="2" stroke-dasharray="4 3"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    ${halka}
    <path d="M13 31V12a7 7 0 0 1 14 0v19z" fill="${renk}" stroke="${KOYU}" stroke-width="1.8"/>
    <path d="M17 13v4l2-2M17 20h3l-2 3M22 13l1 3h-2M22 21v4M18 26h4" stroke="${KOYU}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <rect x="10" y="31" width="20" height="4" rx="1" fill="${renk}" stroke="${KOYU}" stroke-width="1.8"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Birbirine çok yakın yazıtların adları uzaktan üst üste binmesin: bunların adı yakınlaşınca görünür
// (seçili yazıtın adı her zaman görünür)
const YAKINDAN_GORUNEN = new Set(["bilgekagan", "karabalgasun", "hoytotamir", "bugut", "tariat"]);
// Telefonda ekran küçük olduğu için bütün yazıt adları ancak yakınlaşınca görünür (taş simgeleri hep görünür)
let telefon = TELEFON; // ekran genişliği değişince telefonModu() ile güncellenir
const adGorunurlugu = (id, secili) =>
  new Cesium.DistanceDisplayCondition(
    0,
    secili ? Infinity
      : telefon ? (YAKINDAN_GORUNEN.has(id) ? 6e5 : 1.2e6)
      : YAKINDAN_GORUNEN.has(id) ? 1.6e6 : Infinity
  );

export function yazitKatmani(viewer, yazitlar) {
  const kok = viewer.entities.add({ id: "yazitlar" });
  const kayitlar = new Map();
  let oncekiSecili = null;

  for (const y of yazitlar) {
    const varlik = viewer.entities.add({
      parent: kok,
      position: Cesium.Cartesian3.fromDegrees(y.konum[0], y.konum[1]),
      billboard: {
        image: tasSimgesi(TAS, !y.konumKesin),
        width: 34,
        height: 34,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      label: {
        text: y.ad,
        font: '600 13px "IBM Plex Sans", "Segoe UI", sans-serif',
        scale: YAZI_OLCEGI,
        fillColor: Cesium.Color.BLACK,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.45),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 4),
        distanceDisplayCondition: adGorunurlugu(y.id, false),
      },
    });
    varlik.yazitId = y.id; // tıklanınca hangi yazıt olduğunu bilelim
    kayitlar.set(y.id, { veri: y, varlik });
  }

  return {
    // Ekran telefon genişliğine geçince ya da çıkınca yazıt adlarının görünme mesafesini güncelle
    telefonModu(acik) {
      telefon = acik;
      for (const [id, k] of kayitlar) k.varlik.label.distanceDisplayCondition = adGorunurlugu(id, id === oncekiSecili);
    },
    goster(acik) {
      kok.show = acik;
    },
    // Seçili yazıt turuncu renkle ve biraz daha büyük gösterilir. Sadece seçimi değişenlere dokunulur.
    vurgula(seciliId) {
      if (seciliId === oncekiSecili) return;
      for (const id of [oncekiSecili, seciliId]) {
        const k = kayitlar.get(id);
        if (!k) continue;
        const secili = id === seciliId;
        k.varlik.billboard.image = tasSimgesi(secili ? SECILI : TAS, !k.veri.konumKesin);
        k.varlik.billboard.width = k.varlik.billboard.height = secili ? 44 : 34;
        k.varlik.label.distanceDisplayCondition = adGorunurlugu(id, secili);
      }
      oncekiSecili = seciliId;
    },
  };
}
