/* loader.js — layar loading dengan logo SMK Bagimu Negeriku (dipakai di semua halaman) */
(function () {
  const DURASI = 1800; // lama tampil dalam milidetik, boleh diubah
  const el = document.createElement('div');
  el.className = 'loader';
  el.innerHTML = `<div class="loader-logo"><img src="assets/images/logo-sekolah.jpg" alt="Logo SMK Bagimu Negeriku"></div>
    <h2>SMK Bagimu Negeriku</h2><p>Berbudi · Berkualitas · Berdaya · Berhasil</p>
    <div class="loader-bar"><i style="animation-duration:${DURASI - 200}ms"></i></div>`;
  document.documentElement.appendChild(el);
  const mulai = Date.now();
  window.addEventListener('load', () => {
    const sisa = Math.max(0, DURASI - (Date.now() - mulai));
    setTimeout(() => { el.classList.add('selesai'); setTimeout(() => el.remove(), 600); }, sisa);
  });
})();
