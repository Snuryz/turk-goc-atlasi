// Uygulamanın giriş noktası: veriyi yükler, küreyi kurar, parçaları birbirine bağlar.

import { kureOlustur, noktayaUc } from "./kure.js";
import { devletKatmani } from "./katmanlar/devletler.js";
import { gocKatmani } from "./katmanlar/goc-yollari.js";
import { kavimKatmani } from "./katmanlar/kavimler.js";
import { cografyaKatmani } from "./katmanlar/cografya.js";
import { tarihiBolgeKatmani, bolgeMerkezi } from "./katmanlar/tarihi-bolgeler.js";
import { yazitKatmani } from "./katmanlar/yazitlar.js";
import { savasKatmani, savasGorunurMu } from "./katmanlar/savaslar.js";
import { paneliCiz } from "./panel.js";
import { bolgePaneli } from "./bolge-paneli.js";
import { yazitPaneli } from "./yazit-paneli.js";
import { makalelerPaneli } from "./makaleler-paneli.js";
import { devletPaneli } from "./devlet-paneli.js";
import { savaslarPaneli } from "./savaslar-paneli.js";
import { sozKutusu } from "./soz-kutusu.js";
import { zamanCubugu } from "./zaman-cubugu.js";
import { veriYukle, yildaVarMi, kavimKonumu, TELEFON_SORGUSU, yaziOlcegi } from "./yardimci.js";

// Zamandan bağımsız olan seçimler: zaman çubuğu oynarken seçili kalırlar
const ZAMANSIZ = new Set(["bolge", "yazit"]);

async function baslat() {
  // 1) Veri dosyalarını yükle (public/data klasöründen)
  const [devletler, yollar, kavimler, atayurt, cografya, bolgeler, yazitVerisi, devletDetaylari, kaynaklar, savasVerisi] = await Promise.all([
    veriYukle("/data/devletler.json"),
    veriYukle("/data/goc-yollari.json"),
    veriYukle("/data/kavimler.json"),
    veriYukle("/data/atayurt.json"),
    veriYukle("/data/cografya.json"),
    veriYukle("/data/tarihi-bolgeler.json"),
    veriYukle("/data/yazitlar.json"),
    veriYukle("/data/devlet-detaylari.json"),
    veriYukle("/data/kaynaklar.json"),
    veriYukle("/data/savaslar.json"),
  ]);
  const { yazitlar, kaynaklar: yazitKaynaklari } = yazitVerisi;
  const { savaslar } = savasVerisi;

  // 2) Küreyi ve katmanları oluştur (önce çizilen altta kalır: coğrafya en altta)
  const viewer = kureOlustur("globe");
  const cografyaCizimi = cografyaKatmani(viewer, cografya);
  document.getElementById("cografyaAcik").addEventListener("change", (e) => cografyaCizimi.goster(e.target.checked));
  const cografyaAdlariKutusu = document.getElementById("cografyaAdlari");
  cografyaAdlariKutusu.addEventListener("change", (e) => cografyaCizimi.adlariGoster(e.target.checked));
  const bolgeCizimi = tarihiBolgeKatmani(viewer, bolgeler);
  const devletCizimi = devletKatmani(viewer, devletler);
  const gocCizimi = gocKatmani(viewer, yollar, kavimler);
  const kavimCizimi = kavimKatmani(viewer, kavimler, atayurt, yollar);
  const yazitCizimi = yazitKatmani(viewer, yazitlar);
  const savasCizimi = savasKatmani(viewer, savaslar, devletler);
  // Yazıtlar iki yerden açılıp kapanır: açıklamadaki onay kutusu ve altındaki düğme. İkisi hep aynı durumu gösterir.
  const yazitKutusu = document.getElementById("yazitlarAcik");
  const yazitDugmesi = document.getElementById("yazitDugmesi");
  function yazitlariGoster(acik) {
    yazitKutusu.checked = acik;
    yazitCizimi.goster(acik);
    yazitDugmesi.textContent = acik ? "Yazıtları kapat" : "Yazıtları göster";
  }
  yazitKutusu.addEventListener("change", (e) => yazitlariGoster(e.target.checked));
  yazitDugmesi.addEventListener("click", () => yazitlariGoster(!yazitKutusu.checked));
  // Yazıtlar açılışta kapalı başlar; açıklamadaki kutucuk ya da "Yazıtları göster" düğmesiyle açılır.
  // Listeden bir yazıt seçilince katman kendiliğinden açılır (bkz. sec).
  yazitlariGoster(false);

  // 3) Uygulamanın durumu: hangi yıldayız, ne seçili ({ tur: "devlet" | "kavim" | "bolge" | "yazit", id })
  let yil = 0;
  let secili = null;

  // Zaman çubuğundaki "Haritada göster" düğmeleri: devletler ve göçler açık, savaşlar kapalı başlar.
  // Kapalı katman hem kürede hem bilgi panelindeki listelerde görünmez.
  const katmanlar = { devletler: true, gocler: true, savaslar: false };
  const KATMANLAR = {
    devletler: { dugme: "devletlerAcik", cizim: () => devletCizimi },
    gocler: { dugme: "goclerAcik", cizim: () => gocCizimi },
    savaslar: { dugme: "savaslarAcik", cizim: () => savasCizimi },
  };
  function katmanAc(ad, acik, guncelle = true) {
    katmanlar[ad] = acik;
    document.getElementById(KATMANLAR[ad].dugme).setAttribute("aria-pressed", acik);
    KATMANLAR[ad].cizim().goster(acik);
    // Devletler kapatılınca seçili devletin kartı da kalkar; savaşlar kapatılınca seçili savaşınki
    if (!acik && ((ad === "devletler" && secili?.tur === "devlet") || (ad === "savaslar" && secili?.tur === "savas"))) secili = null;
    if (guncelle) herSeyiGuncelle();
  }
  for (const ad of Object.keys(KATMANLAR)) {
    document.getElementById(KATMANLAR[ad].dugme).addEventListener("click", () => katmanAc(ad, !katmanlar[ad]));
  }

  // Listeden seçim yapılınca:
  //  - orta boy ekranda liste haritanın üstüne açılmışsa (çekmece) kapansın ki harita görünsün,
  //  - telefonda sayfa haritanın altındaki bilgi paneline insin.
  const listedenSec = (tur, id) => {
    sec(tur, id, telefonDuzeni() ? 550 : 0);
    if (telefonDuzeni()) bilgiyeIn();
    else if (bolgelerCekmeceMi()) panelAc("bolgeler", false);
  };
  const bolgeListesi = bolgePaneli({ bolgeler, katman: bolgeCizimi, sec: listedenSec });
  const yazitListesi = yazitPaneli({ yazitlar, sec: listedenSec });
  // Başlıktaki "Makaleler" düğmesiyle açılan pencere; içindeki bir kayda dokununca o kayıt seçilir
  makalelerPaneli({ devletler, kavimler, bolgeler, yazitlar, yazitKaynaklari, kaynaklar, sec: listedenSec });
  // Başlıktaki "Devletler" düğmesi ya da bilgi panelindeki "Ayrıntılı bilgi" düğmesiyle açılan pencere
  const devletPenceresi = devletPaneli({ devletler, veri: devletDetaylari, kaynaklar, sec: listedenSec });
  const ayrintiliDevletler = new Set(Object.keys(devletDetaylari.devletler));
  // Başlıktaki "Savaşlar" düğmesiyle açılan kronolojik savaş listesi. "Haritada göster" denince
  // zaman çubuğu savaşın yılına gelir, savaş katmanı açılır ve küre savaşın yerine uçar.
  const savasPenceresi = savaslarPaneli({
    savaslar, devletler, kaynaklar,
    haritadaGoster: (id) => {
      zaman.yilAyarla(savaslar.find((s) => s.id === id).yil);
      sec("savas", id);
      // Telefonda sayfa haritaya döner; kartı okumak için "Bilgileri oku" düğmesi çıkar
      if (telefonDuzeni()) { kaydir(0); bilgiyeInDugmesi.hidden = false; }
    },
  });
  document.getElementById("card").addEventListener("click", (e) => {
    const dugme = e.target.closest(".devlet-ayrinti");
    if (dugme) devletPenceresi.ac(dugme.dataset.id);
    const savas = e.target.closest(".savas-ayrinti");
    if (savas) savasPenceresi.ac(savas.dataset.id);
  });

  // Telefonda: sayfayı bilgi paneline kaydır; haritadaki "Bilgileri oku" düğmesini gizle
  const bilgiyeInDugmesi = document.getElementById("bilgiyeIn");
  function bilgiyeIn() {
    bilgiyeInDugmesi.hidden = true;
    kaydir(document.getElementById("bilgiPaneli"));
  }
  bilgiyeInDugmesi.addEventListener("click", bilgiyeIn);

  // Bilgi panelindeki "Bu yılda haritada" listesinden bir ada tıklanınca yeni bilgi panelin başında açılır:
  // telefonda sayfa bilgi panelinin başına kayar, geniş ekranda panelin kendisi en üste kayar.
  // Ayrıntılı sayfası olan bir devlete (ör. Asya Hun) tıklanınca Devletler paneli o devletle açılır;
  // harita da arkada o devleti seçer, pencere kapanınca devlet haritada seçili görünür.
  const panelden = (tur, id) => {
    if (tur === "devlet" && ayrintiliDevletler.has(id)) {
      sec(tur, id);
      devletPenceresi.ac(id);
      return;
    }
    sec(tur, id, telefonDuzeni() ? 550 : 0);
    if (telefonDuzeni()) bilgiyeIn();
    else document.getElementById("bilgiPaneli").scrollTo({ top: 0, behavior: "smooth" });
  };

  // Telefonda: harita ekrandan çıkınca (aşağıda okurken) "↑ Harita" düğmesi görünür, dokununca en üste döner
  const haritayaDonDugmesi = document.getElementById("haritayaDon");
  haritayaDonDugmesi.addEventListener("click", () => kaydir(0));
  new IntersectionObserver(([kayit]) => {
    haritayaDonDugmesi.hidden = !telefonDuzeni() || kayit.intersectionRatio > 0.25;
  }, { threshold: [0, 0.25, 0.5] }).observe(document.querySelector(".stage"));

  function herSeyiGuncelle() {
    viewer.scene.requestRender(); // göç okları yıla göre uzar; yıl değişince küreyi yeniden çiz
    devletCizimi.guncelle(yil, secili?.tur === "devlet" ? secili.id : null);
    gocCizimi.guncelle(yil);
    savasCizimi.vurgula(secili?.tur === "savas" ? secili.id : null);
    savasCizimi.guncelle(yil);
    kavimCizimi.guncelle(yil, secili?.tur === "kavim" ? secili.id : null);
    const seciliBolge = secili?.tur === "bolge" ? secili.id : null;
    bolgeCizimi.vurgula(seciliBolge);
    bolgeListesi.isaretle(seciliBolge);
    const seciliYazit = secili?.tur === "yazit" ? secili.id : null;
    yazitCizimi.vurgula(seciliYazit);
    yazitListesi.isaretle(seciliYazit);
    paneliCiz({ devletler, kavimler, yollar, bolgeler, yazitlar, yazitKaynaklari, kaynaklar, ayrintiliDevletler, savaslar, katmanlar, yil, secili, sec: panelden });
  }

  // ucusGecikmesi (ms): haritanın yeni yere uçuşunu geciktirir. Telefonda sayfa kayarken harita
  // ekran dışındadır; uçuşu kaydırma bitince başlatmak kaydırma animasyonunun takılmasını önler.
  function sec(tur, id, ucusGecikmesi = 0) {
    secili = { tur, id };
    if (tur === "yazit") {
      // Yazıt katmanı kapalıysa seçilen yazıt görünsün diye aç
      if (!yazitKutusu.checked) yazitlariGoster(true);
    }
    // Savaş katmanı kapalıysa seçilen savaş görünsün diye aç
    if (tur === "savas" && !katmanlar.savaslar) katmanAc("savaslar", true, false);
    herSeyiGuncelle();
    const uc = () => {
      if (tur === "devlet") noktayaUc(viewer, devletler.find((x) => x.id === id).merkez);
      if (tur === "kavim") noktayaUc(viewer, kavimKonumu(kavimler.find((x) => x.id === id), yil, yollar));
      if (tur === "bolge") noktayaUc(viewer, bolgeMerkezi(bolgeler.find((x) => x.id === id)), 5_000_000);
      if (tur === "yazit") noktayaUc(viewer, yazitlar.find((x) => x.id === id).konum, 2_500_000);
      if (tur === "savas") noktayaUc(viewer, savaslar.find((x) => x.id === id).konum, 3_500_000);
    };
    if (ucusGecikmesi) setTimeout(uc, ucusGecikmesi);
    else uc();
  }

  // 4) Zaman çubuğu her yıl değiştiğinde burası çalışır
  const zaman = zamanCubugu((yeniYil) => {
    yil = yeniYil;
    // Seçili savaş yalnızca haritada göründüğü yıllarda (savaş yılı ve sonraki 50 yıl) seçili kalır;
    // zaman bu aralığın dışına çıkınca seçim kalkar ve aşağıdaki kural o yılın devletini seçer.
    if (secili?.tur === "savas") {
      const savas = savaslar.find((s) => s.id === secili.id);
      if (!savas || !savasGorunurMu(savas, yil)) secili = null;
    }
    // Seçili devlet ya da kavim bu yılda yoksa, o yıldaki son kurulan devleti seç.
    // Tarihî bölgeler ve yazıtlar zamandan bağımsızdır; seçiliyse seçili kalır.
    if (secili?.tur !== "savas" && !ZAMANSIZ.has(secili?.tur)) {
      const liste = secili?.tur === "kavim" ? kavimler : devletler;
      const mevcut = secili && liste.find((x) => x.id === secili.id);
      if (!mevcut || !yildaVarMi(mevcut, yil)) {
        // Devletler kapalıyken kendiliğinden devlet seçilmez
        const son = katmanlar.devletler && devletler.filter((d) => yildaVarMi(d, yil)).pop();
        secili = son ? { tur: "devlet", id: son.id } : null;
      }
    }
    herSeyiGuncelle();
  });

  // 5) Küre üzerinde bir şeye tıklanınca onu seç.
  //    Telefonda haritanın altında "Bilgileri oku ↓" düğmesi çıkar (bilgi paneli haritanın altındadır).
  viewer.screenSpaceEventHandler.setInputAction((tik) => {
    const secilen = viewer.scene.pick(tik.position)?.id;
    const tur = secilen?.savasId ? "savas"
      : secilen?.yazitId ? "yazit"
      : secilen?.kavimId ? "kavim"
      : secilen?.bolgeId ? "bolge"
      : secilen?.devletId ? "devlet"
      : null;
    if (!tur) return;
    sec(tur, secilen.savasId ?? secilen.yazitId ?? secilen.kavimId ?? secilen.bolgeId ?? secilen.devletId);
    if (telefonDuzeni()) bilgiyeInDugmesi.hidden = false;
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 6) Paneller: başlıktaki iki düğme soldaki yazıt/bölge panelini ve sağdaki bilgi panelini açıp kapatır.
  //    Orta boy ekranda bölge paneli haritanın üstüne açılan bir çekmecedir.
  //    Telefonda paneller haritanın altında durur; düğmeler sayfayı o panele kaydırır.
  const PANELLER = {
    bolgeler: { dugme: "bolgePaneliDugmesi", sinif: "bolgeler-kapali", bolum: "bolgeler" },
    bilgi: { dugme: "bilgiPaneliDugmesi", sinif: "panel-kapali", bolum: "bilgiPaneli" },
  };
  function panelAc(ad, acik) {
    const p = PANELLER[ad];
    document.querySelector(".app").classList.toggle(p.sinif, !acik);
    document.getElementById(p.dugme).setAttribute("aria-expanded", acik);
  }
  for (const ad of Object.keys(PANELLER)) {
    const dugme = document.getElementById(PANELLER[ad].dugme);
    dugme.addEventListener("click", () => {
      if (telefonDuzeni()) {
        kaydir(document.getElementById(PANELLER[ad].bolum));
        return;
      }
      panelAc(ad, dugme.getAttribute("aria-expanded") !== "true");
    });
  }

  // Panel genişliği: bilgi panelinin sol kenarındaki tutamak sürüklenerek panel ekranın ortasına doğru büyütülür.
  // Seçilen genişlik tarayıcıda hatırlanır; çift tıklama varsayılana döndürür; klavyede ok tuşlarıyla da ayarlanır.
  // En az PANEL_EN_AZ piksel; küreye en az KURE_EN_AZ piksel bırakılır.
  const PANEL_EN_AZ = 260, KURE_EN_AZ = 320, GENISLIK_ANAHTARI = "bilgiPaneliGenisligi";
  const uygulama = document.querySelector(".app");
  const tutamak = document.getElementById("panelTutamak");
  const solPanelGenisligi = () => document.getElementById("bolgeler").getBoundingClientRect().width;
  const sinirla = (g) => Math.round(Math.max(PANEL_EN_AZ, Math.min(g, innerWidth - solPanelGenisligi() - KURE_EN_AZ)));
  function genislikVer(g, kaydet = true) {
    if (g == null) uygulama.style.removeProperty("--sag-ozel");
    else uygulama.style.setProperty("--sag-ozel", sinirla(g) + "px");
    tutamak.setAttribute("aria-valuenow", Math.round(document.getElementById("bilgiPaneli").getBoundingClientRect().width));
    viewer.scene.requestRender();
    if (!kaydet) return;
    try { g == null ? localStorage.removeItem(GENISLIK_ANAHTARI) : localStorage.setItem(GENISLIK_ANAHTARI, String(sinirla(g))); } catch {}
  }
  try { const kayitli = +localStorage.getItem(GENISLIK_ANAHTARI); if (kayitli) genislikVer(kayitli, false); } catch {}

  tutamak.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    tutamak.setPointerCapture(e.pointerId);
    tutamak.classList.add("surukleniyor");
    uygulama.classList.add("panel-genisletiliyor");
  });
  tutamak.addEventListener("pointermove", (e) => {
    if (!tutamak.hasPointerCapture(e.pointerId)) return;
    genislikVer(innerWidth - e.clientX, false);
  });
  const birak = (e) => {
    if (!tutamak.hasPointerCapture(e.pointerId)) return;
    tutamak.releasePointerCapture(e.pointerId);
    tutamak.classList.remove("surukleniyor");
    uygulama.classList.remove("panel-genisletiliyor");
    genislikVer(innerWidth - e.clientX);
  };
  tutamak.addEventListener("pointerup", birak);
  tutamak.addEventListener("pointercancel", birak);
  tutamak.addEventListener("dblclick", () => genislikVer(null));
  tutamak.addEventListener("keydown", (e) => {
    const simdiki = document.getElementById("bilgiPaneli").getBoundingClientRect().width;
    const adim = e.shiftKey ? 80 : 20;
    if (e.key === "ArrowLeft") genislikVer(simdiki + adim);
    else if (e.key === "ArrowRight") genislikVer(simdiki - adim);
    else return;
    e.preventDefault();
  });
  // Pencere daralınca kayıtlı genişlik küreye yer bırakacak şekilde yeniden sınırlanır
  addEventListener("resize", () => { if (uygulama.style.getPropertyValue("--sag-ozel")) genislikVer(parseFloat(uygulama.style.getPropertyValue("--sag-ozel")), false); });

  // Telefon genişliğinde (600 pikselden dar) harita kalabalıklaşmasın: yazılar küçülür, coğrafya adları kapanır,
  // yazıt ve küçük kavim adları ancak yakınlaşınca görünür. Pencere daraltılıp genişletilince de uygulanır.
  //
  // Telefonda yer adları "önemli adlar" modunda başlar: önemli dağ, nehir ve denizler küçük yazıyla görünür,
  // ayrıntılar yakınlaştıkça gelir. "Tüm konum adlarını göster" düğmesi bütün adları açar.
  const tumAdlarDugmesi = document.getElementById("tumAdlar");
  let tumAdlar = !TELEFON_SORGUSU.matches;

  function adAyarlariniUygula() {
    const telefon = TELEFON_SORGUSU.matches;
    const sadeMod = telefon && !tumAdlar; // telefonda ve "tüm adlar" kapalıyken
    cografyaCizimi.ayrintiModu(!sadeMod, telefon);
    yazitCizimi.telefonModu(sadeMod);
    kavimCizimi.telefonModu(sadeMod);
    tumAdlarDugmesi.setAttribute("aria-pressed", tumAdlar);
    tumAdlarDugmesi.textContent = tumAdlar ? "Sadece önemli adlar" : "Tüm adları göster";
  }

  function telefonAyarlari(telefon) {
    const olcek = yaziOlcegi(telefon);
    for (const varlik of viewer.entities.values) if (varlik.label) varlik.label.scale = olcek;
    tumAdlar = !telefon; // telefona geçince önemli adlarla, bilgisayara geçince bütün adlarla başla
    adAyarlariniUygula();
  }
  telefonAyarlari(TELEFON_SORGUSU.matches);
  TELEFON_SORGUSU.addEventListener("change", (e) => telefonAyarlari(e.matches));

  tumAdlarDugmesi.addEventListener("click", () => {
    tumAdlar = !tumAdlar;
    // Bütün adlar istendiyse coğrafya adları kapalı olsa bile açılsın
    if (tumAdlar && !cografyaAdlariKutusu.checked) {
      cografyaAdlariKutusu.checked = true;
      cografyaCizimi.adlariGoster(true);
    }
    adAyarlariniUygula();
  });

  // Açılışta: orta boy ekranda haritaya yer kalsın diye bölge paneli ve açıklama kutusu kapalı başlar
  if (bolgelerCekmeceMi() && !telefonDuzeni()) panelAc("bolgeler", false);

  // Küre yerine oturduktan biraz sonra köşede bir söz göster. Dosya yüklenemezse uygulama etkilenmez.
  veriYukle("/data/sozler.json")
    .then((sozler) => setTimeout(() => sozKutusu(sozler), 1500))
    .catch(() => {});
}

// Ekran genişliğine göre düzen (style.css ile aynı sınırlar):
//  - 900 pikselden dar: telefon düzeni, paneller haritanın altında, sayfa aşağı kayar
//  - 900–1300 piksel: bölge paneli haritanın üstüne açılan çekmece
const telefonDuzeni = () => innerWidth < 900;

// Sayfayı bir öğenin başına (ya da bir y konumuna) yaklaşık yarım saniyede yumuşakça kaydırır.
// Süre kareye değil zamana bağlıdır: harita uçarken kareler yavaşlasa bile kaydırma zamanında biter.
function kaydir(hedef, sure = 500) {
  const bas = window.scrollY;
  const son = typeof hedef === "number" ? hedef : bas + hedef.getBoundingClientRect().top - 8;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return window.scrollTo(0, son);
  const baslangic = performance.now();
  const yumusat = (x) => 1 - Math.pow(1 - x, 3); // önce hızlı, sona doğru yavaşlayan hareket
  function adim(simdi) {
    const oran = Math.min(1, (simdi - baslangic) / sure);
    window.scrollTo(0, bas + (son - bas) * yumusat(oran));
    if (oran < 1) requestAnimationFrame(adim);
  }
  requestAnimationFrame(adim);
}
const bolgelerCekmeceMi = () => innerWidth < 1300;

baslat().catch((hata) => {
  console.error(hata);
  document.getElementById("card").innerHTML =
    `<p class="eyebrow">Hata</p><p>Uygulama başlatılamadı: ${hata.message}</p>`;
});
