// Savaşları, yapıldıkları yerde çapraz kılıç simgesiyle küre üzerinde gösterir.
// Veri: public/data/savaslar.json. Katman açılışta kapalıdır; zaman çubuğundaki "Savaşlar" düğmesiyle açılır.
// Bir savaş, yapıldığı yıldan GORUNME_SURESI yıl sonrasına kadar haritada kalır ve bu sürede giderek solar
// (biten göç oklarında olduğu gibi). Yeri kaynaklarda kesin verilmeyen savaşlar kesik çizgili halkayla gösterilir.
// Simgenin halkası, savaşan Türk devletinin renginde çizilir.

import { YAZI_OLCEGI } from "../yardimci.js";

export const GORUNME_SURESI = 50;
const SECILI = "#ffb020"; // seçili savaşın halkası
const KOYU = "#141a22";

// Savaş bu yılda haritada mı? (yapıldığı yıldan GORUNME_SURESI yıl sonrasına kadar)
export const savasGorunurMu = (s, yil) => yil >= s.yil && yil <= s.yil + GORUNME_SURESI;

// Çapraz iki kılıç: koyu yuvarlak zemin, devlet renginde halka
function kilicSimgesi(renk, yaklasik) {
  const kilic = (aci) => `<g transform="rotate(${aci} 20 20)">
      <path d="M20 5.5l2.1 3.2V24h-4.2V8.7z" fill="#ece7dc" stroke="${KOYU}" stroke-width=".9"/>
      <rect x="14.6" y="23.6" width="10.8" height="2.4" rx="1" fill="#e3b04b" stroke="${KOYU}" stroke-width=".8"/>
      <rect x="18.9" y="26" width="2.2" height="5" fill="#8a5a2b" stroke="${KOYU}" stroke-width=".7"/>
      <circle cx="20" cy="32.3" r="1.7" fill="#e3b04b" stroke="${KOYU}" stroke-width=".7"/>
    </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="17.5" fill="${KOYU}" fill-opacity=".82" stroke="${renk}" stroke-width="2.6"
      ${yaklasik ? `stroke-dasharray="5 3"` : ""}/>
    ${kilic(-45)}${kilic(45)}
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function savasKatmani(viewer, savaslar, devletler) {
  const kok = viewer.entities.add({ id: "savaslar", show: false });
  const renkler = Object.fromEntries(devletler.map((d) => [d.id, d.renk]));
  const kayitlar = new Map();
  let oncekiSecili = null;

  for (const s of savaslar) {
    // Halkanın rengi: taraflardan ilk Türk devletinin rengi
    const renk = renkler[s.taraflar.find((t) => t.devlet)?.devlet] ?? "#e3b04b";
    const varlik = viewer.entities.add({
      parent: kok,
      position: Cesium.Cartesian3.fromDegrees(s.konum[0], s.konum[1]),
      show: false,
      billboard: {
        image: kilicSimgesi(renk, !s.konumKesin),
        width: 32,
        height: 32,
        color: Cesium.Color.WHITE,
      },
      label: {
        text: s.ad,
        font: '600 12px "IBM Plex Sans", "Segoe UI", sans-serif',
        scale: YAZI_OLCEGI,
        fillColor: Cesium.Color.fromCssColorString("#f3e3c0"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        // Ad simgenin üstünde durur; devlet adları alanın ortasında olduğu için üst üste binmezler
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        // Küre bütünüyle görünürken adlar kalabalık etmesin; biraz yakınlaşınca görünür
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 9e6),
      },
    });
    varlik.savasId = s.id; // tıklanınca hangi savaş olduğunu bilelim
    kayitlar.set(s.id, { veri: s, varlik, renk, saydamlik: 1 });
  }

  return {
    goster(acik) {
      kok.show = acik;
      viewer.scene.requestRender();
    },
    // Yıl değişince: savaş yılından sonraki GORUNME_SURESI yıl boyunca görünür, en fazla yarı saydama kadar solar.
    guncelle(yil) {
      for (const [id, k] of kayitlar) {
        const secili = id === oncekiSecili;
        const gorunur = savasGorunurMu(k.veri, yil);
        k.varlik.show = gorunur;
        if (!gorunur) continue;
        const gecen = Math.max(0, yil - k.veri.yil);
        const saydamlik = secili ? 1 : 1 - 0.5 * Math.min(1, gecen / GORUNME_SURESI);
        if (Math.abs(saydamlik - k.saydamlik) > 0.02) {
          k.varlik.billboard.color = Cesium.Color.WHITE.withAlpha(saydamlik);
          k.varlik.label.fillColor = Cesium.Color.fromCssColorString("#f3e3c0").withAlpha(saydamlik);
          k.varlik.label.outlineColor = Cesium.Color.BLACK.withAlpha(saydamlik);
          k.saydamlik = saydamlik;
        }
      }
    },
    // Seçili savaş turuncu halkayla, biraz daha büyük ve adı her uzaklıktan görünür şekilde çizilir
    vurgula(seciliId) {
      if (seciliId === oncekiSecili) return;
      for (const id of [oncekiSecili, seciliId]) {
        const k = kayitlar.get(id);
        if (!k) continue;
        const secili = id === seciliId;
        k.varlik.billboard.image = kilicSimgesi(secili ? SECILI : k.renk, !k.veri.konumKesin);
        k.varlik.billboard.width = k.varlik.billboard.height = secili ? 42 : 32;
        k.varlik.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, secili ? Infinity : 9e6);
      }
      oncekiSecili = seciliId;
    },
  };
}
