// Soldaki "Tarihî Bölgeler" panelini yönetir:
// - her bölgenin yanında göster/gizle kutucuğu,
// - "Tümünü göster" ve "Tümünü gizle" düğmeleri,
// - bölgenin adına tıklayınca bölgeyi gösterip seçer (harita oraya uçar).

export function bolgePaneli({ bolgeler, katman, sec }) {
  const liste = document.getElementById("bolgeListesi");
  const sayac = document.getElementById("bolgeSayaci");

  // Bölgeleri gruplarına göre sırala (veri dosyasındaki sırayla)
  const gruplar = [...new Set(bolgeler.map((b) => b.grup))];
  liste.innerHTML = gruplar
    .map((g) => `
      <section class="bolge-grubu">
        <p class="eyebrow">${g}</p>
        ${bolgeler.filter((b) => b.grup === g).map((b) => `
          <div class="bolge-satiri" data-id="${b.id}">
            <input type="checkbox" id="bolge-${b.id}" aria-label="${b.ad} haritada gösterilsin">
            <button class="bolge-adi" data-id="${b.id}">
              <span class="simge simge-${b.tur}" aria-hidden="true"></span>${b.ad}
            </button>
          </div>`).join("")}
      </section>`)
    .join("");

  function sayaciGuncelle() {
    const acik = bolgeler.filter((b) => katman.gorunurMu(b.id)).length;
    sayac.textContent = `${acik} / ${bolgeler.length} gösteriliyor`;
  }

  function goster(id, acik) {
    katman.goster(id, acik);
    document.getElementById(`bolge-${id}`).checked = acik;
    sayaciGuncelle();
  }

  // Kutucuk: sadece göster / gizle
  liste.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") goster(e.target.closest(".bolge-satiri").dataset.id, e.target.checked);
  });

  // Ada tıklama: göster + seç (harita oraya uçar, sağ panelde bilgisi açılır)
  liste.addEventListener("click", (e) => {
    const dugme = e.target.closest(".bolge-adi");
    if (!dugme) return;
    goster(dugme.dataset.id, true);
    sec("bolge", dugme.dataset.id);
  });

  document.getElementById("tumunuGoster").addEventListener("click", () => bolgeler.forEach((b) => goster(b.id, true)));
  document.getElementById("tumunuGizle").addEventListener("click", () => bolgeler.forEach((b) => goster(b.id, false)));

  sayaciGuncelle();

  return {
    // Seçili bölgenin satırını panelde vurgula
    isaretle(seciliId) {
      liste.querySelectorAll(".bolge-satiri").forEach((s) => s.classList.toggle("on", s.dataset.id === seciliId));
    },
  };
}
