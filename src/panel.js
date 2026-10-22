// Sağdaki bilgi panelini doldurur.

import { yildaVarMi, yilYazisi, devletAsamasi } from "./yardimci.js";
import { KOLLAR } from "./kollar.js";
import { SOLMA_SURESI } from "./katmanlar/goc-yollari.js";
import { konularHtml, kullanilanKaynaklar, kaynakcaHtml } from "./konular.js";

const yillar = (k) => `${yilYazisi(k.baslangic)} – ${yilYazisi(k.bitis)}`;
const renkNoktasi = (renk) => `<i style="background:${renk}"></i>`;

// Kaydın bilgileri: konu başlıkları altında, kaynağın türüne göre gruplanmış (bkz. konular.js).
// Kartın sonunda kullanılan kaynakların tam künyesi açılır bir listede durur.
function bilgiler(kayit, kaynaklar) {
  const konular = kayit.konular ?? [];
  if (!konular.length) return "";
  const ids = kullanilanKaynaklar(konular);
  return `<div class="konular">${konularHtml(konular, kaynaklar)}</div>
    <details class="kaynakca">
      <summary>Kaynakça (${ids.length})</summary>
      <ol>${kaynakcaHtml(ids, kaynaklar)}</ol>
    </details>`;
}

function devletKarti(d, ayrintili, kaynaklar, yil) {
  // Haritada şu an hangi yılın sınırının gösterildiği (devlet o yılda yoksa yazılmaz)
  const asama = yildaVarMi(d, yil) ? devletAsamasi(d, yil) : null;
  return `<p class="eyebrow">Devlet</p>
    <h2>${d.ad}</h2>
    <div class="years">${yillar(d)}</div>
    <dl>
      <dt>Başkent</dt><dd>${d.baskent}</dd>
      <dt>Kurucu</dt><dd>${d.kurucu}</dd>
      ${asama ? `<dt>Haritadaki sınır</dt><dd>${asama.not}</dd>` : ""}
    </dl>
    <p>${d.aciklama}</p>
    ${ayrintili ? `<button class="makale-linki devlet-ayrinti" data-id="${d.id}">Ayrıntılı bilgi (Devletler paneli) →</button>` : ""}
    ${bilgiler(d, kaynaklar)}`;
}

function kavimKarti(k, yollar, kaynaklar) {
  const kol = KOLLAR[k.kol] ?? KOLLAR.eski;
  const gocleri = yollar.filter((g) => g.kavim === k.id);
  return `<p class="eyebrow">Kavim / topluluk</p>
    <h2>${k.ad}</h2>
    <div class="years">${yillar(k)}</div>
    <dl>
      <dt>Dil kolu</dt><dd>${kol.ad}</dd>
      ${gocleri.length ? `<dt>Göçleri</dt><dd>${gocleri.map((g) => `${g.ad} <span class="yr">(${yilYazisi(g.baslangic)})</span>`).join("<br>")}</dd>` : ""}
    </dl>
    <p>${k.aciklama}</p>
    ${bilgiler(k, kaynaklar)}`;
}

// turAdi yazılmış kayıtlarda kartın üstünde o yazı görünür (ör. Orhun Yazıtlarında geçmeyen bir "yer")
const BOLGE_TURLERI = { bolge: "Tarihî bölge", gecit: "Geçit / kapı", yer: "Orhun Yazıtlarında geçen yer", hat: "Sınır hattı" };

function bolgeKarti(b, kaynaklar) {
  return `<p class="eyebrow">${b.turAdi ?? BOLGE_TURLERI[b.tur]}</p>
    <h2>${b.ad}</h2>
    ${b.digerAdlar ? `<div class="diger-adlar">${b.digerAdlar}</div>` : ""}
    <dl>
      <dt>Geçtiği kaynaklar</dt><dd>${b.kaynak}</dd>
    </dl>
    <p>${b.aciklama}</p>
    ${b.konumNotu ? `<p class="not"><strong>Yaklaşık konum:</strong> ${b.konumNotu}</p>` : ""}
    ${bilgiler(b, kaynaklar)}`;
}

// Yazıt kartı: yer, yazı, satır sayısı, buluntu bilgisi ve tıklanabilir kaynak listesi
function yazitKarti(y, kaynaklar) {
  const satir = (baslik, deger) => (deger ? `<dt>${baslik}</dt><dd>${deger}</dd>` : "");
  const kaynakListesi = y.kaynaklar
    .map((id) => kaynaklar[id])
    .filter(Boolean)
    .map((k) => `<li>${k.url ? `<a href="${k.url}" target="_blank" rel="noopener noreferrer">${k.kunye} ↗</a>` : k.kunye}</li>`)
    .join("");
  return `<p class="eyebrow">Yazıt · ${y.donem}</p>
    <h2>${y.ad}</h2>
    ${y.digerAdlar ? `<div class="diger-adlar">${y.digerAdlar}</div>` : ""}
    <div class="years">${y.tarihYazi}</div>
    <dl>
      ${satir("Yer", y.yer)}
      ${satir("Yazı ve dil", y.yazi)}
      ${satir("Boyut", y.satir)}
      ${satir("Bulunuşu", y.bulunus)}
      ${satir("Bugün", y.bugun)}
    </dl>
    <p>${y.aciklama}</p>
    ${y.konumKesin ? "" : `<p class="not"><strong>Yaklaşık konum:</strong> ${y.konumNotu}</p>`}
    <section class="yazit-kaynaklari">
      <p class="eyebrow">Kaynaklar</p>
      <ol>${kaynakListesi}</ol>
    </section>`;
}

function cipler(liste, tur, secili) {
  return liste
    .map((x) => {
      const nokta = renkNoktasi(x.renk);
      const acik = secili?.tur === tur && secili.id === x.id;
      // Kaynaklı bilgisi (konuları) olan kayıtların çipinde küçük bir işaret görünür
      const notlu = x.konular?.length ? "notlu" : "";
      const ipucu = notlu ? ` title="Kaynaklı bilgi var"` : "";
      return `<button class="chip ${acik ? "on" : ""} ${notlu}" data-tur="${tur}" data-id="${x.id}"${ipucu}>${nokta}${x.ad}</button>`;
    })
    .join("");
}

export function paneliCiz({ devletler, kavimler, yollar, bolgeler, yazitlar = [], yazitKaynaklari = {}, kaynaklar = {}, ayrintiliDevletler = new Set(), yil, secili, sec }) {
  // 1) Seçili devletin, kavimin, bölgenin ya da yazıtın bilgi kartı
  const kart = document.getElementById("card");
  const d = secili?.tur === "devlet" && devletler.find((x) => x.id === secili.id);
  const k = secili?.tur === "kavim" && kavimler.find((x) => x.id === secili.id);
  const b = secili?.tur === "bolge" && bolgeler.find((x) => x.id === secili.id);
  const y = secili?.tur === "yazit" && yazitlar.find((x) => x.id === secili.id);
  kart.innerHTML = d ? devletKarti(d, ayrintiliDevletler.has(d.id), kaynaklar, yil)
    : k ? kavimKarti(k, yollar, kaynaklar)
    : b ? bolgeKarti(b, kaynaklar)
    : y ? yazitKarti(y, yazitKaynaklari)
    : `<p class="eyebrow">Seçim yok</p><p>Haritada bir devlete ya da kavime tıklayın.</p>`;

  // 2) Bu yılda haritada olan devletler ve kavimler
  const aktifDevletler = devletler.filter((x) => yildaVarMi(x, yil));
  const aktifKavimler = kavimler.filter((x) => yildaVarMi(x, yil));
  document.getElementById("chips").innerHTML =
    (aktifDevletler.length ? `<p class="alt-baslik">Devletler</p><div class="chips">${cipler(aktifDevletler, "devlet", secili)}</div>` : "") +
    `<p class="alt-baslik">Kavimler (${aktifKavimler.length})</p><div class="chips">${cipler(aktifKavimler, "kavim", secili)}</div>`;
  document.querySelectorAll("#chips button").forEach((b) => (b.onclick = () => sec(b.dataset.tur, b.dataset.id)));

  // 3) Süren ve yakın zamanda biten göçler
  const sureler = yollar.filter((g) => yil >= g.baslangic && yil <= g.bitis);
  const bitenler = yollar.filter((g) => yil > g.bitis && yil <= g.bitis + SOLMA_SURESI);
  const aralik = (a, b) => (b < 0 ? `MÖ ${-a}–${-b}` : a < 0 ? `MÖ ${-a}–MS ${b}` : `${a}–${b}`);
  const gocRengi = (g) => kavimler.find((k) => k.id === g.kavim)?.renk ?? "#e3b04b";
  const satir = (g, sinif) =>
    `<div class="${sinif}"><span class="goc-adi">${renkNoktasi(gocRengi(g))}${g.ad}</span><span class="yr">${aralik(g.baslangic, g.bitis)}</span></div>`;
  document.getElementById("routes").innerHTML =
    sureler.length || bitenler.length
      ? sureler.map((g) => satir(g, "aktif")).join("") + bitenler.map((g) => satir(g, "pasif")).join("")
      : `<span class="pasif">Bu yıllarda kayıtlı bir göç yok.</span>`;
}
