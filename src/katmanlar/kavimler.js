// Kavimleri (kendi renginde nokta) ve atayurdu (altın nokta) küre üzerine çizer.
// Kavimin noktası, "yurtlar" listesine göre zaman içinde yer değiştirir.

import { yildaVarMi, kavimKonumu, YAZI_OLCEGI, TELEFON } from "../yardimci.js";

// Önemi düşük (onem: 2) kavimlerin adı ancak yakınlaşınca görünür; telefonda daha da yakınlaşınca
const kucukKavimAdMesafesi = (telefon) => (telefon ? 3.5e6 : 7e6);
const KUCUK_KAVIM_AD_MESAFESI = kucukKavimAdMesafesi(TELEFON);

const SIYAH = Cesium.Color.BLACK;
const BEYAZ = Cesium.Color.WHITE;

function noktaEkle(viewer, ad, [boylam, enlem], renk, boyut, gorunmeMesafesi = Infinity) {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(boylam, enlem),
    point: { pixelSize: boyut, color: renk, outlineColor: SIYAH, outlineWidth: 1 },
    label: {
      text: ad,
      font: '500 13px "IBM Plex Sans", "Segoe UI", sans-serif',
      scale: YAZI_OLCEGI,
      fillColor: renk,
      outlineColor: SIYAH,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      pixelOffset: new Cesium.Cartesian2(9, -8),
      // Önemi düşük kavimlerin adı ancak yakınlaşınca görünür (nokta her zaman görünür)
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, gorunmeMesafesi),
    },
  });
}

export function kavimKatmani(viewer, kavimler, atayurt, yollar) {
  const altin = Cesium.Color.fromCssColorString("#e3b04b");

  // Atayurt her zaman görünür
  for (const a of atayurt) noktaEkle(viewer, a.ad, a.konum, altin, 11);

  const kayitlar = kavimler.map((k) => {
    const renk = Cesium.Color.fromCssColorString(k.renk);
    const boyut = k.onem === 1 ? 8 : 6;
    const varlik = noktaEkle(viewer, k.ad, k.yurtlar[0][1], renk, boyut, k.onem === 1 ? Infinity : KUCUK_KAVIM_AD_MESAFESI);
    varlik.kavimId = k.id; // tıklanınca hangi kavim olduğunu bilelim
    return { veri: k, varlik, boyut, onem: k.onem, sonKonum: null };
  });

  // Bazı kavimler aynı anda birden çok bölgede yaşadı (ör. İskitlerin doğu kolu Sakalar).
  // Bunlar "ekKonumlar" ile ayrı nokta olarak çizilir; tıklanınca aynı kavim seçilir.
  const ekler = kavimler.flatMap((k) =>
    (k.ekKonumlar ?? []).map((ek) => {
      const renk = Cesium.Color.fromCssColorString(k.renk);
      const boyut = k.onem === 1 ? 8 : 6;
      const varlik = noktaEkle(viewer, ek.ad, ek.konum, renk, boyut, k.onem === 1 ? Infinity : KUCUK_KAVIM_AD_MESAFESI);
      varlik.kavimId = k.id;
      return { veri: ek, kavimId: k.id, varlik, boyut, onem: k.onem };
    })
  );

  // Seçili kavim büyük ve beyaz çerçeveli görünsün
  function vurgula(varlik, boyut, secili) {
    varlik.point.pixelSize = secili ? 14 : boyut;
    varlik.point.outlineColor = secili ? BEYAZ : SIYAH;
    varlik.point.outlineWidth = secili ? 3 : 1;
  }

  return {
    // Ekran telefon genişliğine geçince ya da çıkınca küçük kavimlerin ad mesafesini güncelle
    telefonModu(telefon) {
      for (const k of [...kayitlar, ...ekler]) {
        if (k.onem === 1) continue;
        k.varlik.label.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, kucukKavimAdMesafesi(telefon));
      }
    },
    guncelle(yil, seciliId) {
      for (const e of ekler) {
        e.varlik.show = yildaVarMi(e.veri, yil);
        vurgula(e.varlik, e.boyut, e.kavimId === seciliId);
      }
      for (const k of kayitlar) {
        k.varlik.show = yildaVarMi(k.veri, yil);
        if (!k.varlik.show) continue;

        // Yeri değiştiyse noktayı taşı (göç sırasında her yıl biraz ilerler)
        const konum = kavimKonumu(k.veri, yil, yollar);
        if (String(konum) !== String(k.sonKonum)) {
          k.varlik.position = Cesium.Cartesian3.fromDegrees(konum[0], konum[1]);
          k.sonKonum = konum;
        }

        vurgula(k.varlik, k.boyut, k.veri.id === seciliId);
      }
    },
  };
}
