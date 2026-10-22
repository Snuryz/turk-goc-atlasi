// Açılışta haritanın köşesinde kısa süre görünen "Türkler hakkında söylenenler" kutusu.
// Sözler: public/data/sozler.json (her açılışta rastgele biri seçilir).
// Kutu çarpıya tıklanınca hemen, tıklanmazsa altındaki çubuk bitince kendiliğinden kapanır.
// Fare kutunun üzerindeyken ya da kutuya klavyeyle gelindiğinde çubuk durur (süre işlemez).

const SURE_MS = 14000;

const kacis = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function sozKutusu(sozler) {
  if (!sozler?.length) return;
  const soz = sozler[Math.floor(Math.random() * sozler.length)];

  const kutu = document.createElement("div");
  kutu.className = "soz-kutusu";
  kutu.setAttribute("role", "status");
  kutu.style.setProperty("--soz-suresi", `${SURE_MS}ms`);
  kutu.innerHTML = `
    <button class="soz-kapat" aria-label="Kapat">✕</button>
    <p class="soz-etiketi">Türkler hakkında söylenenler</p>
    <blockquote><p>“${kacis(soz.metin)}”</p><cite>${kacis(soz.kim)}</cite></blockquote>
    ${soz.kaynak ? `<p class="soz-kaynagi"><span class="soz-ceviri">${kacis(soz.kaynak)}${soz.url ? " · " : ""}</span>${soz.url ? `<a href="${soz.url}" target="_blank" rel="noopener noreferrer">Kaynak ↗</a>` : ""}</p>` : ""}
    <span class="soz-suresi" aria-hidden="true"></span>`;

  // Kapanırken kısa bir solma; hareket azaltma tercihinde hemen kaldırılır
  let kapandi = false;
  function kapat() {
    if (kapandi) return;
    kapandi = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return kutu.remove();
    kutu.classList.add("kapaniyor");
    kutu.addEventListener("animationend", () => kutu.remove(), { once: true });
  }

  kutu.querySelector(".soz-kapat").addEventListener("click", kapat);
  // Süre, çubuğun CSS animasyonuyla tutulur: animasyon bitince kutu kapanır, üzerine gelince durur
  kutu.querySelector(".soz-suresi").addEventListener("animationend", kapat);

  document.querySelector(".stage").appendChild(kutu);
}
