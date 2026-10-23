// Bilgileri konu başlıkları altında, kaynağın türüne göre gruplayarak gösterir.
// Veri: her kayıtta "konular" listesi; her konunun "gorusler"i vardır.
//   { "baslik": "Kökeni ve dili",
//     "gorusler": [ { "grup": "uluslararasi", "metin": "...", "kaynaklar": ["iranica-iskitler"] } ] }
// "kaynaklar" listesindeki kimlikler public/data/kaynaklar.json dosyasındadır.
// Sayfa numarası kimliğin sonuna "|" ile eklenir: "durmus-iskit|s. 245".

// Grupların sırası ve başlıkları
export const GRUPLAR = [
  ["ana", "Dönemin kaynaklarında"],
  ["uluslararasi", "Uluslararası literatürde"],
  ["turk", "Türk akademisyenlere göre"],
  ["makale", "Makalelerde"],
];

const kacis = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ayir = (ref) => {
  const [id, sayfa] = ref.split("|");
  return { id, sayfa };
};

// Görüşün altındaki kısa kaynak satırı: "Durmuş (2017), s. 39 · ders notları"
export function kaynakSatiri(refler, kaynaklar) {
  return refler
    .map(ayir)
    .filter(({ id }) => kaynaklar[id])
    .map(({ id, sayfa }) => {
      const k = kaynaklar[id];
      const ad = `${k.kisa}${sayfa ? `, ${sayfa}` : ""}`;
      return k.url
        ? `<a href="${k.url}" target="_blank" rel="noopener noreferrer" title="${kacis(k.kunye)}">${ad} ↗</a>`
        : `<span title="${kacis(k.kunye)}">${ad}</span>`;
    })
    .join(" · ");
}

// Devletin başlangıç-bitiş yıllarının kaynağı: devletler.json'daki "yilKaynagi" alanından (yoksa boş).
// Açılır kutunun başlığında kaynak, içinde farklı görüşlerin açıklaması durur.
export function yilKaynagiHtml(d, kaynaklar) {
  const y = d.yilKaynagi;
  if (!y?.kaynaklar?.length) return "";
  return `<details class="yil-kaynagi">
      <summary>Yılların kaynağı: ${kaynakSatiri(y.kaynaklar, kaynaklar)}</summary>
      ${y.not ? `<p>${y.not}</p>` : ""}
    </details>`;
}

// Bir kayıtta geçen bütün kaynak kimlikleri (tekrarsız, ilk geçiş sırasıyla)
export function kullanilanKaynaklar(konular = []) {
  const ids = [];
  for (const k of konular) for (const g of k.gorusler) for (const r of g.kaynaklar) {
    const { id } = ayir(r);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

// Konuların HTML'i. capa verilirse her konuya "capa-0", "capa-1"... kimliği verilir (içindekiler bağlantıları için)
export function konularHtml(konular = [], kaynaklar, { capa } = {}) {
  return konular.map((konu, i) => {
    const gruplar = GRUPLAR
      .map(([grup, ad]) => [ad, konu.gorusler.filter((g) => g.grup === grup), grup])
      .filter(([, liste]) => liste.length);
    return `<section class="konu"${capa ? ` id="${capa}-${i}"` : ""}>
        <h3 class="konu-basligi">${konu.baslik}</h3>
        ${gruplar.map(([ad, liste, grup]) => `
          <div class="gorus-grubu grup-${grup}">
            <p class="grup-adi">${ad}</p>
            ${liste.map((g) => `<div class="gorus">
                <p>${g.metin}</p>
                <p class="gorus-kaynagi">${kaynakSatiri(g.kaynaklar, kaynaklar)}</p>
              </div>`).join("")}
          </div>`).join("")}
        ${konu.alinti ? `<blockquote class="devlet-alinti"><p>“${kacis(konu.alinti.metin)}”</p><cite>${konu.alinti.kim}</cite></blockquote>` : ""}
      </section>`;
  }).join("");
}

// Tam künye listesi (PDF'i olan makaleler için indirme düğmesi ve lisans notuyla)
export function kaynakcaHtml(ids, kaynaklar) {
  return ids
    .map((id) => kaynaklar[id])
    .filter(Boolean)
    .map((k) => `<li>${k.url ? `<a href="${k.url}" target="_blank" rel="noopener noreferrer">${k.kunye} ↗</a>` : k.kunye}
        ${k.pdf ? `<a class="makale-linki" href="${k.pdf}" download>PDF indir ↓</a>` : ""}
        ${k.lisans ? `<span class="makale-lisansi">PDF, <a href="${k.lisansUrl}" target="_blank" rel="noopener noreferrer">${k.lisans}</a> lisansıyla, değiştirilmeden paylaşılmıştır.</span>` : ""}</li>`)
    .join("");
}
