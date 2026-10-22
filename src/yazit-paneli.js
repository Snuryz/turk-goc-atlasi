// Soldaki paneldeki "Yazıtlar" listesi: yazıtlar tarih sırasıyla listelenir,
// ada tıklanınca harita yazıta uçar ve sağ panelde bilgisi açılır.

export function yazitPaneli({ yazitlar, sec }) {
  const liste = document.getElementById("yazitListesi");

  // Tarihli yazıtlar tarih sırasıyla, tarihsiz yazıt grupları en sonda
  const sirali = [...yazitlar].sort((a, b) => (a.tarih ?? 9999) - (b.tarih ?? 9999));
  liste.innerHTML = `
    <p class="eyebrow">Yazıtlar (${yazitlar.length})</p>
    ${sirali.map((y) => `
      <div class="bolge-satiri yazit-satiri" data-id="${y.id}">
        <button class="bolge-adi" data-id="${y.id}">
          <span class="simge simge-yazit" aria-hidden="true"></span>
          <span class="yazit-adi">${y.ad}</span>
          <span class="yazit-tarihi">${y.tarih ?? "—"}</span>
        </button>
      </div>`).join("")}`;

  liste.addEventListener("click", (e) => {
    const dugme = e.target.closest(".bolge-adi");
    if (dugme) sec("yazit", dugme.dataset.id);
  });

  return {
    isaretle(seciliId) {
      liste.querySelectorAll(".yazit-satiri").forEach((s) => s.classList.toggle("on", s.dataset.id === seciliId));
    },
  };
}
