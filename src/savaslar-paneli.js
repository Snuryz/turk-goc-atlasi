// "Savaşlar" penceresi: ayrıntılı sayfası olan devletlerin savaşları, kronolojik sırayla.
// Veri: public/data/savaslar.json. Solda yüzyıllara ayrılmış liste (devlete göre süzülebilir),
// sağda seçili savaşın tarafları, sonucu ve kaynaklara göre gruplanmış bilgileri.
// "Haritada göster" düğmesi pencereyi kapatır, zaman çubuğunu savaşın yılına getirir ve küreyi oraya uçurur.

import { konularHtml, kullanilanKaynaklar, kaynakcaHtml } from "./konular.js";
import { yilYazisi } from "./yardimci.js";

// Yüzyıl başlığı: -209 → "MÖ 3. yüzyıl", 451 → "5. yüzyıl"
const yuzyil = (yil) => (yil < 0 ? `MÖ ${Math.floor((-yil - 1) / 100) + 1}. yüzyıl` : `${Math.floor((yil - 1) / 100) + 1}. yüzyıl`);

// Listedeki kısa yıl: "710-711" gibi kısa yazılar olduğu gibi, uzunlar ("20 Haziran 451") yalnızca yıl olarak
const kisaYil = (s) => {
  const y = s.yilYazi.split(" (")[0];
  return y.length <= 9 ? y : yilYazisi(s.yil).replace("MS ", "");
};

const renkBul = (devletler, id) => devletler.find((d) => d.id === id)?.renk ?? "#e3b04b";
const turkTarafi = (s) => s.taraflar.find((t) => t.devlet)?.devlet;

// Taraflar (kazanan işaretli) ve sonuç: hem bu pencerede hem bilgi panelindeki kartta kullanılır
export function savasOzetiHtml(s, devletler) {
  const taraf = (t, i) => `
    <div class="savas-tarafi ${s.kazanan === i ? "kazanan" : ""}">
      ${t.devlet ? `<i style="background:${renkBul(devletler, t.devlet)}"></i>` : ""}
      <span>${t.ad}</span>
      ${s.kazanan === i ? `<b class="kazandi">Kazandı</b>` : ""}
    </div>`;
  return `
    <div class="savas-taraflari">
      ${taraf(s.taraflar[0], 0)}
      <span class="karsi" aria-label="karşı">⚔</span>
      ${taraf(s.taraflar[1], 1)}
    </div>
    ${s.sebep ? `<p class="savas-sonucu"><strong>Sebep:</strong> ${s.sebep}</p>` : ""}
    <p class="savas-sonucu"><strong>Sonuç:</strong> ${s.sonuc}</p>
    <p class="not"><strong>${s.konumKesin ? "Yeri" : "Yaklaşık konum"}:</strong> ${s.konumNotu}</p>`;
}

// Kaynaklara göre gruplanmış bilgiler (konular.js biçiminde): Sebepleri, Savaşın seyri, Sonucu.
// Eski biçimdeki kayıtlar (yalnızca "gorusler") tek bir "Kaynaklarda" başlığı altında gösterilir.
export const savasKonulari = (s) => s.konular ?? [{ baslik: "Kaynaklarda", gorusler: s.gorusler ?? [] }];

function ayrintiHtml(s, devletler, kaynaklar) {
  const konular = savasKonulari(s);
  return `
    <header class="devlet-baslik">
      <p class="eyebrow">Savaş</p>
      <h2>${s.ad}</h2>
      <div class="years">${s.yilYazi}</div>
      ${savasOzetiHtml(s, devletler)}
      <button class="makale-linki savas-haritada" data-id="${s.id}">Haritada göster ↗</button>
    </header>
    <div class="devlet-bolumu konular">${konularHtml(konular, kaynaklar)}</div>
    <section class="devlet-bolumu">
      <h3>Kaynaklar</h3>
      <ol class="devlet-kaynak-listesi">${kaynakcaHtml(kullanilanKaynaklar(konular), kaynaklar)}</ol>
    </section>`;
}

export function savaslarPaneli({ savaslar, devletler, kaynaklar, haritadaGoster }) {
  const pencere = document.getElementById("savaslarPenceresi");
  const suzgec = document.getElementById("savasSuzgeci");
  const liste = document.getElementById("savasListesi");
  const icerik = document.getElementById("savasIcerigi");

  // Kronolojik sıra (aynı yıldakiler dosyadaki sırasıyla)
  const sirali = savaslar.map((s, i) => [s, i]).sort((a, b) => a[0].yil - b[0].yil || a[1] - b[1]).map(([s]) => s);
  let suzulen = null; // seçili devlet kimliği (null = hepsi)
  let seciliId = null;

  // Süzgeç düğmeleri: savaşı olan devletler, kuruluş sırasıyla
  const savasanlar = devletler
    .filter((d) => savaslar.some((s) => s.taraflar.some((t) => t.devlet === d.id)))
    .sort((a, b) => a.baslangic - b.baslangic);
  suzgec.innerHTML = `<button class="chip on" data-id="">Hepsi (${savaslar.length})</button>` +
    savasanlar.map((d) => {
      const adet = savaslar.filter((s) => s.taraflar.some((t) => t.devlet === d.id)).length;
      return `<button class="chip" data-id="${d.id}"><i style="background:${d.renk}"></i>${d.ad} (${adet})</button>`;
    }).join("");

  function listeyiCiz() {
    const gorunen = sirali.filter((s) => !suzulen || s.taraflar.some((t) => t.devlet === suzulen));
    let sonYuzyil = null;
    liste.innerHTML = gorunen.map((s) => {
      const baslik = yuzyil(s.yil) !== sonYuzyil ? `<p class="savas-yuzyili">${(sonYuzyil = yuzyil(s.yil))}</p>` : "";
      return `${baslik}
        <button class="savas-satiri ${s.id === seciliId ? "on" : ""}" data-id="${s.id}">
          <span class="savas-yili">${kisaYil(s)}</span>
          <span class="savas-adi"><i style="background:${renkBul(devletler, turkTarafi(s))}"></i>${s.ad}</span>
          <span class="savas-karsilik">${s.taraflar.map((t) => t.ad.split(" (")[0]).join(" – ")}</span>
        </button>`;
    }).join("");
  }

  function goster(id) {
    const s = savaslar.find((x) => x.id === id);
    if (!s) return;
    seciliId = id;
    liste.querySelectorAll(".savas-satiri").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
    icerik.innerHTML = ayrintiHtml(s, devletler, kaynaklar);
    icerik.scrollTop = 0;
  }

  // Açma: belirli bir savaşla ya da (başlıktaki düğmeden) son seçilenle / ilk savaşla
  function ac(id) {
    if (id && suzulen && !savaslar.find((s) => s.id === id)?.taraflar.some((t) => t.devlet === suzulen)) {
      suzulen = null;
      suzgec.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.id === ""));
    }
    listeyiCiz();
    goster(id ?? seciliId ?? sirali[0].id);
    if (!pencere.open) pencere.showModal();
    liste.querySelector(".savas-satiri.on")?.scrollIntoView({ block: "nearest" });
  }

  document.getElementById("savaslarDugmesi").addEventListener("click", () => ac());
  document.getElementById("savaslarKapat").addEventListener("click", () => pencere.close());
  pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });
  suzgec.addEventListener("click", (e) => {
    const dugme = e.target.closest(".chip");
    if (!dugme) return;
    suzulen = dugme.dataset.id || null;
    suzgec.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === dugme));
    listeyiCiz();
    liste.scrollTop = 0;
  });
  liste.addEventListener("click", (e) => {
    const satir = e.target.closest(".savas-satiri");
    if (satir) goster(satir.dataset.id);
  });
  icerik.addEventListener("click", (e) => {
    const dugme = e.target.closest(".savas-haritada");
    if (dugme) { pencere.close(); haritadaGoster(dugme.dataset.id); }
  });

  return { ac };
}
