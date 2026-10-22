// "Devletler" penceresi: her devlet için ayrıntılı bilgi (özet, kronoloji, konular, kaynaklar).
// Veri: public/data/devlet-detaylari.json. Ayrıntısı henüz eklenmemiş devletler listede soluk görünür.
// Başlıktaki "Devletler" düğmesiyle ya da bilgi panelindeki "Ayrıntılı bilgi" düğmesiyle açılır.

import { yilYazisi } from "./yardimci.js";
import { konularHtml, kullanilanKaynaklar, kaynakcaHtml } from "./konular.js";

// Sayfa: özet, kronoloji, konu başlıkları (her başlığın altında kaynağın türüne göre gruplanmış bilgiler) ve kaynakça.
function ayrintiHtml(devlet, detay, kaynaklar) {
  const ids = kullanilanKaynaklar(detay.konular);
  return `
    <header class="devlet-baslik">
      <p class="eyebrow">Devlet</p>
      <h2>${devlet.ad}</h2>
      <div class="years">${yilYazisi(devlet.baslangic)} – ${yilYazisi(devlet.bitis)}</div>
      <p class="devlet-ozet">${detay.ozet}</p>
      <button class="makale-linki devlet-haritada" data-id="${devlet.id}">Haritada göster ↗</button>
    </header>

    <nav class="devlet-icindekiler" aria-label="İçindekiler">
      <p class="eyebrow">İçindekiler</p>
      <ol>
        <li><a href="#kronoloji">Kronoloji</a></li>
        ${detay.konular.map((k, i) => `<li><a href="#konu-${i}">${k.baslik}</a></li>`).join("")}
        <li><a href="#devlet-kaynaklari">Kaynaklar</a></li>
      </ol>
    </nav>

    <section id="kronoloji" class="devlet-bolumu">
      <h3>Kronoloji</h3>
      <dl class="kronoloji">
        ${detay.kronoloji.map((k) => `<dt>${k.yil}</dt><dd>${k.olay}</dd>`).join("")}
      </dl>
    </section>

    <div class="devlet-bolumu konular">${konularHtml(detay.konular, kaynaklar, { capa: "konu" })}</div>

    <section id="devlet-kaynaklari" class="devlet-bolumu">
      <h3>Kaynaklar</h3>
      ${detay.tarihNotu ? `<p class="devlet-tarih-notu">${detay.tarihNotu}</p>` : ""}
      <ol class="devlet-kaynak-listesi">${kaynakcaHtml(ids, kaynaklar)}</ol>
    </section>`;
}

export function devletPaneli({ devletler, veri, kaynaklar, sec }) {
  const pencere = document.getElementById("devletlerPenceresi");
  const liste = document.getElementById("devletListesi");
  const icerik = document.getElementById("devletIcerigi");
  const detaylar = veri.devletler;

  // Kronolojik sıralı liste; ayrıntısı olanlar işaretli
  const sirali = [...devletler].sort((a, b) => a.baslangic - b.baslangic);
  liste.innerHTML = sirali.map((d) => `
    <button class="devlet-satiri ${detaylar[d.id] ? "" : "bos"}" data-id="${d.id}">
      <i style="background:${d.renk}"></i>
      <span class="devlet-adi">${d.ad}</span>
      <span class="yazit-tarihi">${yilYazisi(d.baslangic)}</span>
    </button>`).join("");

  function goster(id) {
    const devlet = devletler.find((d) => d.id === id);
    if (!devlet) return;
    liste.querySelectorAll(".devlet-satiri").forEach((s) => s.classList.toggle("on", s.dataset.id === id));
    icerik.innerHTML = detaylar[id]
      ? ayrintiHtml(devlet, detaylar[id], kaynaklar)
      : `<header class="devlet-baslik">
           <p class="eyebrow">Devlet</p><h2>${devlet.ad}</h2>
           <div class="years">${yilYazisi(devlet.baslangic)} – ${yilYazisi(devlet.bitis)}</div>
           <p class="devlet-ozet">${devlet.aciklama}</p>
           <p class="not">Bu devletin ayrıntılı bilgileri henüz eklenmedi.</p>
         </header>`;
    icerik.scrollTop = 0;
  }

  // Açma: belirli bir devletle ya da (başlıktaki düğmeden) ilk ayrıntılı devletle
  function ac(id) {
    goster(id ?? sirali.find((d) => detaylar[d.id])?.id ?? sirali[0].id);
    if (!pencere.open) pencere.showModal();
  }

  document.getElementById("devletlerDugmesi").addEventListener("click", () => ac());
  document.getElementById("devletlerKapat").addEventListener("click", () => pencere.close());
  pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });
  liste.addEventListener("click", (e) => {
    const satir = e.target.closest(".devlet-satiri");
    if (satir) goster(satir.dataset.id);
  });
  icerik.addEventListener("click", (e) => {
    // İçindekiler bağlantıları pencerenin içinde kaydırsın (sayfa adresini değiştirmeden)
    const baglanti = e.target.closest(".devlet-icindekiler a");
    if (baglanti) {
      e.preventDefault();
      icerik.querySelector(baglanti.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const harita = e.target.closest(".devlet-haritada");
    if (harita) { pencere.close(); sec("devlet", harita.dataset.id); }
  });

  return { ac, ayrintiVarMi: (id) => !!detaylar[id] };
}
