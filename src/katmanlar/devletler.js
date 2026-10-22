// Devletleri küre üzerine çizer: renkli alan + kenar çizgisi + isim etiketi.
// Sınırlar zamana göre değişir: devletin "sinirlar" listesindeki her aşama, kendi yılından
// bir sonraki aşamanın yılına kadar gösterilir (bkz. yardimci.js → devletAsamasi).
// "sinirlar" yazılmamış devletlerde tek aşama vardır: eski "sinir" alanı.
//
// Akıcılık:
//  - Sınır değişince eski aşama, yenisinin çizimi hazır olana kadar tam renginde ekranda kalır; hazır olunca
//    ikisi tek karede yer değiştirir. Arada boşluk ya da renk solması olmaz. (Solup belirme denendi: iki yarı
//    saydam sınır üst üste binince renk bir an açılıyordu.)
//  - Gösterilen aşamanın bir sonrakinin çizimi arka planda önceden hazırlanır; zaman çizelgesi oynarken
//    yeni aşama çoğu zaman beklemeden gelir.
// Hız ve bellek:
//  - Bir aşamanın çizimi ancak gerektiğinde hazırlanır (Osmanlı'nın tek başına 130'dan fazla aşaması var).
//  - Her devletin son kullanılan birkaç aşaması hafızada tutulur, daha eskileri silinir.
//  - Her aşama Cesium'un "entity" sistemi yerine kendi bağımsız çizim nesneleriyle (primitive) çizilir. Böylece bir
//    aşamayı silmek, göstermek ya da rengini değiştirmek öteki çizimleri etkilemez ve yeniden çizim gerektirmez.

import { yildaVarMi, devletAsamalari, devletAsamasi, YAZI_OLCEGI } from "../yardimci.js";

const koordinatlar = (liste) => Cesium.Cartesian3.fromDegreesArray(liste.flat());

// Alan ve sınırın görünürlüğü: seçili devlet daha koyu ve kalın çizilir.
// Sınır çizgisinin çevresindeki ince koyu kenar, çizginin açık renkli bozkır ve çöl zemininde de seçilmesini sağlar.
const ALAN_SAYDAMLIGI = 0.45;
const SECILI_ALAN_SAYDAMLIGI = 0.65;
const KENAR_KALINLIGI = 3;
const SECILI_KENAR_KALINLIGI = 5;
const KENAR_CERCEVESI = Cesium.Color.fromCssColorString("#0b1119");
const KENAR_CERCEVESI_SAYDAMLIGI = 0.85;
const ETIKET_ZEMINI = Cesium.Color.fromCssColorString("#0b1119");
const ETIKET_ZEMINI_SAYDAMLIGI = 0.75;
// Her devlet için hafızada tutulan en fazla aşama sayısı (görünen, beklenen ve önceden hazırlanan dahil)
const HAFIZA = 5;

const alan = (h) => Math.abs(h.reduce((t, [x1, y1], i) => {
  const [x2, y2] = h[(i + 1) % h.length];
  return t + x1 * y2 - x2 * y1;
}, 0)) / 2;

function icindeMi([x, y], halka) {
  let ic = false;
  for (let i = 0, j = halka.length - 1; i < halka.length; j = i++) {
    const [xi, yi] = halka[i], [xj, yj] = halka[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic;
  }
  return ic;
}

// Aşamanın adının duracağı yer: en büyük parçanın ağırlık merkezi; merkez parçanın dışına düşerse devletin merkezi
function etiketNoktasi(asama, d) {
  if (!d.sinirlar) return d.merkez;
  const buyuk = asama.parcalar.reduce((a, b) => (alan(a) >= alan(b) ? a : b));
  const n = buyuk.length;
  const nokta = [buyuk.reduce((t, p) => t + p[0], 0) / n, buyuk.reduce((t, p) => t + p[1], 0) / n];
  return icindeMi(nokta, buyuk) ? nokta : d.merkez;
}

export function devletKatmani(viewer, devletler) {
  const sahne = viewer.scene;
  const etiketler = sahne.primitives.add(new Cesium.LabelCollection());

  // Bir devletin yıkıldığı yıl başka bir devlet kuruluyorsa (ör. 744: Göktürk → Uygur), o yıl haritada
  // yalnızca yeni devlet çizilir; iki sınır aynı topraklarda üst üste binmez.
  const kurulusYillari = new Set(devletler.map((d) => d.baslangic));
  const haritadaMi = (d, yil) => yildaVarMi(d, yil) && !(yil === d.bitis && kurulusYillari.has(yil));

  // ---------- Bir aşamanın çizimi ----------

  // Kenar çizgisi; kalın olanı devlet ilk seçildiğinde bir kez hazırlanır
  function kenarCizgisi(c, kalinlik) {
    return sahne.groundPrimitives.add(new Cesium.GroundPolylinePrimitive({
      geometryInstances: c.parcalar.map((halka, i) => new Cesium.GeometryInstance({
        geometry: new Cesium.GroundPolylineGeometry({ positions: koordinatlar(halka), width: kalinlik, loop: true }),
        id: c.kimlikler[i],
      })),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: Cesium.Material.fromType("PolylineOutline", {
          color: c.renk.withAlpha(0), outlineColor: KENAR_CERCEVESI.withAlpha(0), outlineWidth: 1,
        }),
      }),
      show: false,
    }));
  }

  // Bir aşamanın çizimini hazırlar (başlangıçta görünmez). Boş aşamada (devletin bağımsız olmadığı yıllar)
  // hiçbir şey çizilmez.
  function asamaCiz(kayit, asama) {
    const { veri: d, renk } = kayit;
    const c = { renk, parcalar: asama.parcalar, secili: false, opaklik: 0 };
    if (!asama.parcalar.length) return c;
    // Tıklanınca hangi devlete ait olduğunu bilelim (her parçanın kendi kimliği var)
    c.kimlikler = asama.parcalar.map((_, i) => ({ devletId: d.id, parca: i }));
    c.alan = sahne.groundPrimitives.add(new Cesium.GroundPrimitive({
      geometryInstances: asama.parcalar.map((halka, i) => new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({ polygonHierarchy: new Cesium.PolygonHierarchy(koordinatlar(halka)) }),
        id: c.kimlikler[i],
        attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(renk.withAlpha(0)) },
      })),
      appearance: new Cesium.PerInstanceColorAppearance({ flat: true, translucent: true }),
      show: false,
    }));
    c.kenar = kenarCizgisi(c, KENAR_KALINLIGI);
    const [x, y] = etiketNoktasi(asama, d);
    c.etiket = etiketler.add({
      position: Cesium.Cartesian3.fromDegrees(x, y),
      text: d.ad,
      font: '18px "Marcellus", Georgia, serif',
      scale: YAZI_OLCEGI,
      fillColor: Cesium.Color.WHITE.withAlpha(0),
      // Koyu zemin: coğrafya adlarının arasında devlet adı kolayca seçilsin
      showBackground: true,
      backgroundColor: ETIKET_ZEMINI.withAlpha(0),
      backgroundPadding: new Cesium.Cartesian2(8, 5),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      id: { devletId: d.id },
      show: false,
    });
    return c;
  }

  const hazirMi = (c) => !c.alan || (c.alan.ready && c.kenar.ready);

  // Aşamanın o anki saydamlığını (c.opaklik: 0 görünmez, 1 tam görünür) ve seçim durumunu çizime uygular.
  // Yalnızca renk ve saydamlık değişir; çizim yeniden hazırlanmaz.
  function gorunumUygula(c) {
    if (!c.alan) return;
    const o = c.opaklik;
    const gorunur = o > 0.001;
    c.alan.show = gorunur;
    c.etiket.show = gorunur;
    c.kenar.show = gorunur && !(c.secili && c.kalinKenar?.ready);
    if (c.kalinKenar) c.kalinKenar.show = gorunur && c.secili;
    if (c.alan.ready) {
      const renk = Cesium.ColorGeometryInstanceAttribute.toValue(c.renk.withAlpha((c.secili ? SECILI_ALAN_SAYDAMLIGI : ALAN_SAYDAMLIGI) * o));
      for (const id of c.kimlikler) c.alan.getGeometryInstanceAttributes(id).color = renk;
    }
    for (const k of [c.kenar, c.kalinKenar]) {
      if (!k) continue;
      k.appearance.material.uniforms.color = c.renk.withAlpha(o);
      k.appearance.material.uniforms.outlineColor = KENAR_CERCEVESI.withAlpha(KENAR_CERCEVESI_SAYDAMLIGI * o);
    }
    c.etiket.fillColor = Cesium.Color.WHITE.withAlpha(o);
    c.etiket.backgroundColor = ETIKET_ZEMINI.withAlpha(ETIKET_ZEMINI_SAYDAMLIGI * o);
  }

  function sil(c) {
    c.silindi = true;
    if (!c.alan) return;
    sahne.groundPrimitives.remove(c.alan);
    sahne.groundPrimitives.remove(c.kenar);
    if (c.kalinKenar) sahne.groundPrimitives.remove(c.kalinKenar);
    etiketler.remove(c.etiket);
  }

  // ---------- Hafıza ----------

  // Hafızadaki aşamayı getir, yoksa hazırla. kullan: en son kullanılan olarak işaretle
  // (önceden hazırlanan aşama işaretlenmez, hafıza dolarsa ilk o silinir).
  function asamaGetir(kayit, asama, kullan = true) {
    let c = kayit.hafiza.get(asama);
    if (!c) {
      c = asamaCiz(kayit, asama);
      kayit.hafiza.set(asama, c);
      yerAc(kayit);
    } else if (kullan) {
      kayit.hafiza.delete(asama); // en sona taşı: en son kullanılan
      kayit.hafiza.set(asama, c);
    }
    return c;
  }

  // Hafıza dolduysa en uzun süredir kullanılmayan aşamaları sil (görünen ve beklenen hariç)
  function yerAc(kayit) {
    for (const [asama, c] of kayit.hafiza) {
      if (kayit.hafiza.size <= HAFIZA) break;
      if (c === kayit.gorunen || c === kayit.hedef) continue;
      sil(c);
      kayit.hafiza.delete(asama);
    }
  }

  // ---------- Aşama değiştirme ----------

  // İstenen aşama (hedef) hazırsa eskisiyle tek karede yer değiştirir; hazır değilse eskisi ekranda kalır
  function gecisDene(k) {
    if (k.hedef === k.gorunen) return;
    if (k.hedef && !hazirMi(k.hedef)) return;
    if (k.gorunen) { k.gorunen.opaklik = 0; gorunumUygula(k.gorunen); }
    k.gorunen = k.hedef;
    if (k.gorunen) { k.gorunen.opaklik = 1; gorunumUygula(k.gorunen); }
    sahne.requestRender();
  }

  const kayitlar = devletler.map((d) => ({
    veri: d,
    asamalar: devletAsamalari(d),
    renk: Cesium.Color.fromCssColorString(d.renk),
    hafiza: new Map(), // aşama → çizim (eklenme sırası = kullanım sırası)
    gorunen: null, // ekranda görünen aşama
    hedef: null, // görünmesi istenen aşama; çizimi hazır olunca görünene geçer
  }));

  // Hazırlanmakta olan çizimler bitene kadar her karenin ardından yeni bir kare istenir
  // (küre yalnızca bir şey değişince çizilir); biten hedef aşamalara geçilir.
  sahne.postRender.addEventListener(() => {
    let bekleyen = false;
    for (const k of kayitlar) {
      gecisDene(k);
      if (k.hedef !== k.gorunen) bekleyen = true;
      for (const c of k.hafiza.values()) {
        if (c.alan && !c.renkHazir && c.alan.ready) { c.renkHazir = true; gorunumUygula(c); }
        if (c.alan && !hazirMi(c)) bekleyen = true;
        if (c.kalinKenar && !c.kalinHazir && c.kalinKenar.ready) { c.kalinHazir = true; gorunumUygula(c); }
        if (c.kalinKenar && !c.kalinKenar.ready) bekleyen = true;
      }
    }
    if (bekleyen) sahne.requestRender();
  });

  return {
    // Yıl veya seçim değişince çağrılır: hangi devletin hangi aşaması görünecek, hangisi vurgulanacak
    guncelle(yil, seciliId) {
      for (const k of kayitlar) {
        const asama = haritadaMi(k.veri, yil) ? devletAsamasi(k.veri, yil) : null;
        k.hedef = asama ? asamaGetir(k, asama) : null;

        // Bir sonraki aşamayı önceden hazırla (zaman çizelgesi ileri oynarken beklemesin)
        if (asama) {
          const sonraki = k.asamalar[k.asamalar.indexOf(asama) + 1];
          if (sonraki && haritadaMi(k.veri, sonraki.yil)) asamaGetir(k, sonraki, false);
        }

        // Seçim: seçili devletin görünen ve beklenen aşaması koyu ve kalın çizilir
        const secili = k.veri.id === seciliId;
        for (const c of k.hafiza.values()) {
          const bu = secili && (c === k.hedef || c === k.gorunen);
          if (c.secili === bu) continue;
          c.secili = bu;
          if (bu && c.alan && !c.kalinKenar) {
            c.kalinKenar = kenarCizgisi(c, SECILI_KENAR_KALINLIGI);
            c.kalinHazir = false;
          }
          gorunumUygula(c);
        }
        gecisDene(k);
      }
      sahne.requestRender();
    },
  };
}
