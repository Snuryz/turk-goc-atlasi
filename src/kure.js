// 3B dünya küresini kurar.
// Uydu görüntüsü olarak Cesium'un içinde gelen "Natural Earth II" haritası kullanılır,
// bu yüzden hesap açmaya veya anahtar (token) almaya gerek yoktur.

const DUNYA_YARICAPI = 6_378_137; // metre

export function kureOlustur(kapsayiciId) {
  const viewer = new Cesium.Viewer(kapsayiciId, {
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
      )
    ),
    // Cesium'un hazır düğmelerinden ihtiyacımız olmayanları kapatıyoruz
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    // Küre yalnızca bir şey değişince yeniden çizilir (kamera hareketi, yıl, seçim...).
    // Aksi hâlde hiçbir şey değişmezken bile saniyede 60 kez çizilir; ekran kartı yorulur, bilgisayar ısınıp yavaşlar.
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  // Haritaya bir şey eklendiğinde ya da bir şeyin özelliği (görünürlük, renk, yazı...) değiştiğinde yeniden çiz
  const ciz = () => viewer.scene.requestRender();
  viewer.entities.collectionChanged.addEventListener((_, eklenenler) => {
    for (const e of eklenenler) e.definitionChanged.addEventListener(ciz);
    ciz();
  });

  // Haritanın renklerini canlandır: Natural Earth görüntüsü kendi hâliyle soluk duruyor
  const zemin = viewer.imageryLayers.get(0);
  zemin.saturation = 1.4; // renk doygunluğu (1 = olduğu gibi)
  zemin.contrast = 1.2;
  zemin.brightness = 1.05;
  zemin.gamma = 0.9;
  // Kürenin üzerindeki mavimsi pus (atmosfer) renkleri solduruyor: kapat
  viewer.scene.globe.showGroundAtmosphere = false;

  // Başlangıçta kamerayı Orta Asya'nın üzerine, bütün küre görünecek kadar uzağa konumla.
  // Sayfa açılırken harita alanı henüz son boyutuna gelmemiş olabilir; bu yüzden ilk görüntü
  // çizildikten sonra (alan boyutu kesinleşince) yükseklik bir kez daha hesaplanır.
  const ilkGorunum = () =>
    viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(70, 42, butunDunyaYuksekligi(viewer)) });
  ilkGorunum();
  const birKezCalis = viewer.scene.postRender.addEventListener(() => {
    birKezCalis();
    ilkGorunum();
  });

  return viewer;
}

// Kameranın, küre alanının köşelerinde uzay (siyah boşluk) görünmeden çıkabileceği en büyük yükseklik.
// Kamera dünyaya dik bakarken, ekranın köşesine giden görüş çizgisi dünyaya değmeliyse
// dünyanın kameradan görünen açısal yarıçapı, ekran köşegeninin yarım açısından büyük olmalı.
export function doluEkranYuksekligi(viewer) {
  const tuval = viewer.scene.canvas;
  const enBoy = tuval.clientWidth / Math.max(1, tuval.clientHeight);
  const yarimAci = viewer.camera.frustum.fov / 2; // Cesium bu açıyı uzun kenara uygular
  const tanYatay = enBoy >= 1 ? Math.tan(yarimAci) : Math.tan(yarimAci) * enBoy;
  const tanDikey = enBoy >= 1 ? Math.tan(yarimAci) / enBoy : Math.tan(yarimAci);
  const kosegenAcisi = Math.atan(Math.hypot(tanYatay, tanDikey));
  return (DUNYA_YARICAPI / Math.sin(kosegenAcisi)) * 0.97 - DUNYA_YARICAPI; // %3 pay
}

// Bütün kürenin, ekranın kısa kenarına kenarlarda biraz boşlukla sığdığı yükseklik.
// Kamera dünyaya dik bakarken dünyanın kameradan görünen açısal yarıçapı, kısa kenarın yarım açısından küçük olmalı.
function butunDunyaYuksekligi(viewer) {
  const tuval = viewer.scene.canvas;
  const enBoy = tuval.clientWidth / Math.max(1, tuval.clientHeight);
  const yarimAci = viewer.camera.frustum.fov / 2; // Cesium bu açıyı uzun kenara uygular
  const kisaKenarAcisi = Math.atan(Math.tan(yarimAci) * Math.min(enBoy, 1 / enBoy));
  return DUNYA_YARICAPI / Math.sin(kisaKenarAcisi * 0.85) - DUNYA_YARICAPI; // küre kısa kenarın yaklaşık %85'ini kaplasın
}

// Kamerayı verilen [boylam, enlem] noktasına yumuşakça uçurur.
// Yükseklik verilmezse harita alanını dolduran en uzak yükseklik kullanılır.
export function noktayaUc(viewer, [boylam, enlem], yukseklik) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      boylam, enlem, Math.min(yukseklik ?? Infinity, doluEkranYuksekligi(viewer))
    ),
    duration: 1.5,
  });
}
