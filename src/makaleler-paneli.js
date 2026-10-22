// "Makaleler" penceresi: uygulamada kullanılan bütün makaleleri tek listede toplar.
// Sitenin içinde PDF'i duran makale varsa önce onlar, sonra dış bağlantılar gelir; en altta harita verilerinin lisansları.
// Her makalenin altında uygulamada geçtiği kayıtlar listelenir; birine dokununca o kayıt seçilir.

import { kullanilanKaynaklar } from "./konular.js";

const TUR_ADLARI = { devlet: "Devlet", kavim: "Kavim", bolge: "Bölge", yazit: "Yazıt" };

// Bütün kayıtları tarayıp makaleleri topla (aynı makale bir kez listelenir).
// Dönemin kaynakları (Herodot, Shiji...) ve ders notları bu listeye girmez.
const LISTEDISI = new Set(["ana", "ders"]);

function makaleleriTopla({ devletler, kavimler, bolgeler, yazitlar, yazitKaynaklari, kaynaklar }) {
  const makaleler = new Map();

  function ekle(kaynak, kayit, tur) {
    const anahtar = kaynak.url || kaynak.kunye;
    if (!makaleler.has(anahtar)) makaleler.set(anahtar, { ...kaynak, kayitlar: [] });
    const m = makaleler.get(anahtar);
    // Aynı makalenin PDF ve lisans bilgisi bir notta varsa makaleye de ekle
    for (const alan of ["pdf", "lisans", "lisansUrl"]) if (kaynak[alan] && !m[alan]) m[alan] = kaynak[alan];
    if (!m.kayitlar.some((k) => k.tur === tur && k.id === kayit.id)) m.kayitlar.push({ tur, id: kayit.id, ad: kayit.ad });
  }

  // 1) Devlet, kavim ve bölge kayıtlarının konularında geçen kaynaklar
  for (const [liste, tur] of [[devletler, "devlet"], [kavimler, "kavim"], [bolgeler, "bolge"]]) {
    for (const kayit of liste) {
      for (const id of kullanilanKaynaklar(kayit.konular)) {
        const k = kaynaklar[id];
        if (k && !LISTEDISI.has(k.grup)) ekle(k, kayit, tur);
      }
    }
  }
  // 2) Yazıtların kaynakları
  for (const y of yazitlar) {
    for (const id of y.kaynaklar) if (yazitKaynaklari[id]) ekle(yazitKaynaklari[id], y, "yazit");
  }

  // Alfabetik sıra; künyenin başındaki tırnak gibi işaretler yok sayılır
  const sade = (m) => m.kunye.replace(/^[^\p{L}]+/u, "");
  const sirala = (a, b) => sade(a).localeCompare(sade(b), "tr");
  const hepsi = [...makaleler.values()];
  return {
    pdfler: hepsi.filter((m) => m.pdf).sort(sirala),
    baglantilar: hepsi.filter((m) => !m.pdf).sort(sirala),
  };
}

// Harita verilerinin kaynakları ve lisansları. Cliopatria'nın CC BY 4.0 lisansı, kaynağın, lisansın ve
// yapılan değişikliklerin kullanıcıya görünür biçimde belirtilmesini ister; bu bölüm bunun için var.
const dis = (href, yazi) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${yazi}</a>`;
const LISANSLAR = `
    <section class="lisanslar">
      <p class="eyebrow">Harita verileri ve lisanslar</p>
      <ul>
        <li><strong>Devlet sınırları:</strong> ${dis("https://github.com/Seshat-Global-History-Databank/cliopatria", "Cliopatria")} (Seshat Global History Databank), ${dis("https://creativecommons.org/licenses/by/4.0/deed.tr", "CC BY 4.0")}. Sınırlar sadeleştirildi; aynı yılda üst üste binmesinler diye bazı aşamalardan komşu devletin alanı çıkarıldı. II. Göktürk Kağanlığı'nın sınırı bu uygulama için çizilmiş temsili bir alandır.</li>
        <li><strong>Türkiye sınırı, dağlar, çöller, nehirler ve harita görüntüsü:</strong> ${dis("https://www.naturalearthdata.com", "Natural Earth")} (kamu malı).</li>
        <li><strong>3B küre:</strong> ${dis("https://cesium.com/platform/cesiumjs/", "CesiumJS")} (Apache 2.0). <strong>Yazı tipleri:</strong> Google Fonts (SIL Open Font License).</li>
        <li><strong>Açılıştaki sözler:</strong> telif süresi dolmuş eski baskılardan Türkçeye çevrildi.</li>
        <li><strong>Bilgi metinleri:</strong> kaynaklardaki bilgilerden yararlanılarak özgün olarak yazıldı; her bilginin altında kaynağı gösterilir.</li>
      </ul>
    </section>`;

function makaleKarti(m) {
  const disLink = (href, yazi) => `<a class="makale-linki" href="${href}" target="_blank" rel="noopener noreferrer">${yazi}</a>`;
  const dugmeler = [
    m.pdf ? `<a class="makale-linki" href="${m.pdf}" download>PDF indir ↓</a>` : "",
    m.url ? disLink(m.url, m.pdf ? "Makale sayfası ↗" : "Makaleyi aç ↗") : "",
  ].join("");
  return `<article class="makale-karti">
      <p class="makale-kunyesi">${m.kunye}</p>
      ${dugmeler ? `<div class="makale-dugmeleri">${dugmeler}</div>` : `<p class="makale-lisansi">Bu makalenin çevrimiçi bağlantısı yok.</p>`}
      ${m.lisans ? `<p class="makale-lisansi">PDF, <a href="${m.lisansUrl}" target="_blank" rel="noopener noreferrer">${m.lisans}</a> lisansı altında, yazarı ve kaynağı belirtilerek değiştirilmeden paylaşılmıştır.</p>` : ""}
      <p class="makale-geciyor">Uygulamada geçtiği yerler:</p>
      <div class="chips">${m.kayitlar.map((k) =>
        `<button class="chip" data-tur="${k.tur}" data-id="${k.id}" title="${TUR_ADLARI[k.tur]}">${k.ad}</button>`).join("")}</div>
    </article>`;
}

export function makalelerPaneli({ devletler, kavimler, bolgeler, yazitlar, yazitKaynaklari, kaynaklar, sec }) {
  const pencere = document.getElementById("makalelerPenceresi");
  const icerik = document.getElementById("makaleListesi");
  const { pdfler, baglantilar } = makaleleriTopla({ devletler, kavimler, bolgeler, yazitlar, yazitKaynaklari, kaynaklar });

  icerik.innerHTML = `
    ${pdfler.length ? `<section>
      <p class="eyebrow">İndirilebilir PDF'ler (${pdfler.length})</p>
      ${pdfler.map(makaleKarti).join("")}
    </section>` : ""}
    <section>
      <p class="eyebrow">Bağlantılar (${baglantilar.length})</p>
      ${baglantilar.map(makaleKarti).join("")}
    </section>
    ${LISANSLAR}`;

  document.getElementById("makalelerDugmesi").addEventListener("click", () => pencere.showModal());
  document.getElementById("makalelerKapat").addEventListener("click", () => pencere.close());
  // Pencerenin dışına (karartılmış alana) tıklayınca kapansın
  pencere.addEventListener("click", (e) => { if (e.target === pencere) pencere.close(); });
  // Bir kayda dokununca pencere kapanır ve o kayıt seçilir
  icerik.addEventListener("click", (e) => {
    const dugme = e.target.closest(".chip");
    if (!dugme) return;
    pencere.close();
    sec(dugme.dataset.tur, dugme.dataset.id);
  });

  return { sayi: pdfler.length + baglantilar.length };
}
