// Birden çok dosyada kullanılan küçük yardımcı fonksiyonlar.

// Telefon ekranında harita yazıları küçültülür ki haritayı kaplamasın
// TELEFON_SORGUSU ekran genişliği değiştikçe haber verir (bkz. main.js); TELEFON ve YAZI_OLCEGI açılıştaki durumdur.
export const TELEFON_SORGUSU = window.matchMedia("(max-width: 600px)");
export const TELEFON = TELEFON_SORGUSU.matches;
export const yaziOlcegi = (telefon) => (telefon ? 0.8 : 1);
export const YAZI_OLCEGI = yaziOlcegi(TELEFON);

// Bir devlet ya da kavim, verilen yılda var mı? (bitis: null → günümüzde de var)
export const yildaVarMi = (kayit, yil) => yil >= kayit.baslangic && yil <= (kayit.bitis ?? Infinity);

// Bir devletin sınır aşamaları ({ yil, not, parcalar }); "sinirlar" yoksa eski tek "sinir" tek aşama sayılır
export const devletAsamalari = (d) => d.sinirlar ?? [{ yil: d.baslangic, not: "Temsili sınır", parcalar: [d.sinir] }];

// Verilen yılda gösterilecek aşama: yılı o yıla eşit ya da ondan küçük olan son aşama
export function devletAsamasi(d, yil) {
  const asamalar = devletAsamalari(d);
  let secilen = asamalar[0];
  for (const a of asamalar) if (a.yil <= yil) secilen = a;
  return secilen;
}

// -220 → "MÖ 220", 552 → "MS 552", null → "günümüz"
export const yilYazisi = (yil) => (yil === null ? "günümüz" : yil < 0 ? `MÖ ${-yil}` : `MS ${yil}`);

// Bir rotada, yolun "oran" kadarı (0–1) gidildiğinde varılan nokta.
// Göç okunun ucuyla aynı hesabı yapar: her ara bölüm eşit sürede geçilir.
export function yolUzerindeNokta(yol, oran) {
  const bolum = Math.min(yol.length - 2, Math.floor(oran * (yol.length - 1)));
  const t = oran * (yol.length - 1) - bolum;
  const [b1, e1] = yol[bolum];
  const [b2, e2] = yol[bolum + 1];
  return [b1 + (b2 - b1) * t, e1 + (e2 - e1) * t];
}

// Kavimin verilen yıldaki yeri:
// - o sırada süren bir göçü varsa, göç okunun ucunda,
// - yoksa o yıla kadarki son "yurtlar" kaydında.
export function kavimKonumu(kavim, yil, yollar = []) {
  const goc = yollar.find((g) => g.kavim === kavim.id && yil >= g.baslangic && yil < g.bitis);
  if (goc) return yolUzerindeNokta(goc.yol, (yil - goc.baslangic) / (goc.bitis - goc.baslangic));

  let konum = kavim.yurtlar[0][1];
  for (const [y, k] of kavim.yurtlar) if (y <= yil) konum = k;
  return konum;
}

// Bir JSON dosyasını yükler
export async function veriYukle(adres) {
  const yanit = await fetch(adres);
  if (!yanit.ok) throw new Error(`${adres} yüklenemedi (${yanit.status})`);
  return yanit.json();
}
