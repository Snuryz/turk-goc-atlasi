// Göç yollarını ok olarak çizer. Ok, göç eden kavimin renginde ve zaman ilerledikçe
// başlangıçtan varış noktasına doğru uzar. Göç bittikten sonra ok yarı saydama kadar solar
// ve SOLMA_SURESI yıl sonra kaybolur; böylece harita karışmaz.

import { yildaVarMi, yolUzerindeNokta, YAZI_OLCEGI } from "../yardimci.js";

const VARSAYILAN_RENK = "#e3b04b"; // kavimi bulunamayan yollar için
const KONTUR = Cesium.Color.fromCssColorString("#0b1119");
const YUKSEKLIK = 60_000; // metre; çizgi yere gömülmesin diye biraz havada
const KALINLIK = 18;      // okun kalınlığı (piksel)
export const SOLMA_SURESI = 150; // yıl

// Rotadaki köşe noktalarının arasını doldurur, böylece ok yumuşak uzar
function yogunlastir(yol, adim = 20) {
  const sonuc = [];
  for (let i = 0; i < yol.length - 1; i++) {
    const [b1, e1] = yol[i];
    const [b2, e2] = yol[i + 1];
    for (let j = 0; j < adim; j++) {
      const t = j / adim;
      sonuc.push([b1 + (b2 - b1) * t, e1 + (e2 - e1) * t]);
    }
  }
  sonuc.push(yol[yol.length - 1]);
  return sonuc;
}

// Göçün o yıla kadar ne kadarının tamamlandığı (0–1)
const ilerleme = (g, yil) => Math.min(1, Math.max(0, (yil - g.baslangic) / Math.max(1, g.bitis - g.baslangic)));

export function gocKatmani(viewer, yollar, kavimler) {
  let yil = 0;

  const kayitlar = yollar.map((g) => {
    const kavim = kavimler.find((k) => k.id === g.kavim);
    const renk = Cesium.Color.fromCssColorString(kavim?.renk ?? VARSAYILAN_RENK);
    const noktalar = yogunlastir(g.yol).map(([boylam, enlem]) =>
      Cesium.Cartesian3.fromDegrees(boylam, enlem, YUKSEKLIK)
    );

    // CallbackProperty: Cesium her karede bu fonksiyonu çağırıp okun o anki uzunluğunu sorar.
    // Uzunluk değişmediyse önceki dizi geri verilir (her karede yeni dizi üretmemek için).
    let sonN = 0, sonDizi = null;
    const konumlar = new Cesium.CallbackProperty(() => {
      const n = Math.max(2, Math.round(ilerleme(g, yil) * (noktalar.length - 1)) + 1);
      if (n !== sonN) { sonN = n; sonDizi = noktalar.slice(0, n); }
      return sonDizi;
    }, false);

    // 1) Altta koyu ve biraz daha kalın bir ok: renkli okun etrafında kontur gibi görünür
    const kontur = viewer.entities.add({
      polyline: {
        positions: konumlar,
        width: KALINLIK + 6,
        material: new Cesium.PolylineArrowMaterialProperty(KONTUR.withAlpha(0.7)),
        arcType: Cesium.ArcType.NONE,
      },
    });

    // 2) Üstte kavimin renginde asıl ok
    const ok = viewer.entities.add({
      polyline: {
        positions: konumlar,
        width: KALINLIK,
        material: new Cesium.PolylineArrowMaterialProperty(renk),
        arcType: Cesium.ArcType.NONE,
      },
    });

    // 3) Okun ucunda kavimin adı (kavimin kendi noktası o sırada görünmüyorsa)
    const etiket = viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        const [boylam, enlem] = yolUzerindeNokta(g.yol, ilerleme(g, yil));
        return Cesium.Cartesian3.fromDegrees(boylam, enlem, YUKSEKLIK);
      }, false),
      label: {
        text: kavim?.ad ?? g.ad,
        font: '600 13px "IBM Plex Sans", "Segoe UI", sans-serif',
        scale: YAZI_OLCEGI,
        fillColor: renk,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(12, -12),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      },
    });

    return { veri: g, kavim, renk, kontur, ok, etiket, sonSaydamlik: 1 };
  });

  return {
    guncelle(yeniYil) {
      yil = yeniYil;
      for (const k of kayitlar) {
        const { baslangic, bitis } = k.veri;
        const gorunur = yil >= baslangic && yil <= bitis + SOLMA_SURESI;
        k.ok.show = k.kontur.show = gorunur;

        // Göç sürerken ve kavimin kendi noktası görünmüyorken okun ucuna adını yaz
        k.etiket.show = yil >= baslangic && yil <= bitis && !(k.kavim && yildaVarMi(k.kavim, yil));
        if (!gorunur) continue;

        // Bitmiş göçler yavaşça solsun, ama en fazla yarı saydama kadar
        const saydamlik = yil <= bitis ? 1 : 1 - 0.5 * ((yil - bitis) / SOLMA_SURESI);
        if (Math.abs(saydamlik - k.sonSaydamlik) > 0.02) {
          k.ok.polyline.material = new Cesium.PolylineArrowMaterialProperty(k.renk.withAlpha(saydamlik));
          k.kontur.polyline.material = new Cesium.PolylineArrowMaterialProperty(KONTUR.withAlpha(0.7 * saydamlik));
          k.sonSaydamlik = saydamlik;
        }
      }
    },
  };
}
