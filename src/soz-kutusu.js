// Açılışta haritanın köşesinde kısa süre görünen "Türkler hakkında söylenenler" kutusu.
// Sözler: public/data/sozler.json. Sözler karışık bir sırayla gösterilir; bütün sözler bir kez görülmeden
// aynı söz tekrar gelmez (sıra tarayıcıda saklanır; saklanamıyorsa rastgele seçilir).
// Kutu çarpıya tıklanınca hemen, tıklanmazsa altındaki çubuk bitince kendiliğinden kapanır.
// Fare kutunun üzerindeyken ya da kutuya klavyeyle gelindiğinde çubuk durur (süre işlemez).

const SURE_MS = 14000;

const SIRA_ANAHTARI = "sozSirasi";

const kacis = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Sıradaki sözün numarasını verir: kalan sözler bitince yeni bir karışık sıra kurulur
function siradakiSoz(adet) {
  const karistir = () => {
    const sira = [...Array(adet).keys()];
    for (let i = sira.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sira[i], sira[j]] = [sira[j], sira[i]]; }
    return sira;
  };
  try {
    // Kayıtlı sıra { adet, kalan } biçimindedir; söz sayısı değiştiyse (yeni söz eklendiyse) sıra yeniden kurulur
    const kayit = JSON.parse(localStorage.getItem(SIRA_ANAHTARI) || "null");
    let kalan = kayit && kayit.adet === adet && Array.isArray(kayit.kalan) ? kayit.kalan.filter((i) => Number.isInteger(i) && i < adet) : [];
    if (!kalan.length) kalan = karistir();
    const secilen = kalan.shift();
    localStorage.setItem(SIRA_ANAHTARI, JSON.stringify({ adet, kalan }));
    return secilen;
  } catch {
    return Math.floor(Math.random() * adet);
  }
}

export function sozKutusu(sozler) {
  if (!sozler?.length) return;
  const soz = sozler[siradakiSoz(sozler.length)];

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
