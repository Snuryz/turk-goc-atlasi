// Alttaki zaman çubuğunu ve ▶ oynat düğmesini yönetir.

const DONEMLER = [
  [-700, "İskit"],
  [-220, "Asya Hun"],
  [552, "Göktürk"],
  [1040, "Selçuklu"],
  [1299, "Osmanlı"],
  [1923, "Cumhuriyet"],
];
// Hız seçenekleri: saniyede kaç yıl ilerlesin
const HIZLAR = [10, 30, 60, 120, 250];
const VARSAYILAN_HIZ = 60;

export function zamanCubugu(yilDegisti) {
  const kaydirici = document.getElementById("yearRange");
  const yazi = document.getElementById("yearLabel");
  const dugme = document.getElementById("play");
  const hizKutusu = document.getElementById("hiz");
  const enAz = +kaydirici.min;
  const enCok = +kaydirici.max;

  // Hız düğmeleri (oynatma sürerken de değiştirilebilir)
  let hiz = VARSAYILAN_HIZ;
  hizKutusu.innerHTML = HIZLAR.map(
    (h) => `<button data-hiz="${h}" aria-pressed="${h === hiz}">${h}</button>`
  ).join("");
  hizKutusu.addEventListener("click", (e) => {
    const secilen = e.target.closest("button");
    if (!secilen) return;
    hiz = +secilen.dataset.hiz;
    hizKutusu.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === secilen));
  });

  // Dönem işaretlerini çubuğun altına yerleştir
  document.getElementById("ticks").innerHTML = DONEMLER.map(([y, ad]) => {
    const yuzde = ((y - enAz) / (enCok - enAz)) * 100;
    return `<span class="${yuzde > 85 ? "sag" : ""}" style="left:${yuzde}%">${ad}</span>`;
  }).join("");

  let yil = +kaydirici.value;
  let oynuyor = false;

  function yilAyarla(yeni) {
    yil = Math.min(enCok, Math.max(enAz, yeni));
    const tam = Math.round(yil);
    kaydirici.value = tam;
    yazi.innerHTML = tam < 0 ? `<small>MÖ</small>${-tam}` : `<small>MS</small>${tam}`;
    yilDegisti(tam);
  }

  kaydirici.addEventListener("input", () => yilAyarla(+kaydirici.value));

  dugme.addEventListener("click", () => {
    oynuyor = !oynuyor;
    if (oynuyor && yil >= enCok) yil = enAz;
    dugme.textContent = oynuyor ? "❚❚" : "▶";
    dugme.setAttribute("aria-label", oynuyor ? "Durdur" : "Zamanı oynat");
    if (oynuyor) requestAnimationFrame(adim);
  });

  let oncekiZaman = null;
  function adim(simdi) {
    if (!oynuyor) { oncekiZaman = null; return; }
    if (oncekiZaman !== null) {
      const gecen = (simdi - oncekiZaman) / 1000;
      const onceki = Math.round(yil);
      yil += gecen * hiz;
      if (Math.round(yil) !== onceki) yilAyarla(yil);
      if (yil >= enCok) { dugme.click(); return; }
    }
    oncekiZaman = simdi;
    requestAnimationFrame(adim);
  }

  yilAyarla(yil);
}
