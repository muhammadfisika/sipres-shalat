/* =========================================================
   KONFIGURASI
========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbzOSXoZM2rPe0TnbnuK8yl_VZu2S-HbuIx27eEboJ9YfASrBnP2CgIoDXeHeYZLEdwe/exec";

let html5QrCode = null;
let scannerRunning = false;

let guruLogin = false;
let namaGuruAktif = "";

let qrProcessing = false;
let lastQR = "";
let lastQRTime = 0;


/* =========================================================
   UTILITAS HALAMAN
========================================================= */

function hideAllPages() {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove("active");

    });

}


function showRolePage() {

  hideAllPages();

  document
    .getElementById("pageRole")
    .classList.add("active");

}


function showGuruLogin() {

  hideAllPages();

  document
    .getElementById("pageLogin")
    .classList.add("active");

}


function showGuruPage() {

  hideAllPages();

  document
    .getElementById("pageGuru")
    .classList.add("active");

}


function showUmumPage() {

  hideAllPages();

  document
    .getElementById("pageUmum")
    .classList.add("active");

  loadDaftarSiswa();
  loadDaftarKelas();

}


/* =========================================================
   NOTIFIKASI MELAYANG
========================================================= */

function showNotification(message, type = "success") {

  const box =
    document.getElementById("floatingNotification");

  box.innerText = message;

  box.className =
    "floating-notification show " + type;

  setTimeout(() => {

    box.classList.remove("show");

  }, 2500);

}


/* =========================================================
   BUNYI BIP
========================================================= */

function bunyiBip() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const audioContext =
      new AudioContext();

    const oscillator =
      audioContext.createOscillator();

    const gainNode =
      audioContext.createGain();

    oscillator.connect(gainNode);

    gainNode.connect(
      audioContext.destination
    );

    oscillator.frequency.value = 1000;

    oscillator.type = "sine";

    gainNode.gain.value = 0.2;

    oscillator.start();

    setTimeout(() => {

      oscillator.stop();

      audioContext.close();

    }, 120);

  } catch (error) {

    console.log(
      "Audio tidak tersedia:",
      error
    );

  }

}


/* =========================================================
   LOGIN GURU
========================================================= */

async function loginGuru() {

  const username =
    document
      .getElementById("username")
      .value
      .trim();

  const password =
    document
      .getElementById("password")
      .value
      .trim();


  if (!username || !password) {

    showNotification(
      "Username dan password wajib diisi.",
      "error"
    );

    return;
  }


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action: "login",

          username: username,

          password: password

        })

      });


    const result =
      await response.json();


    if (result.success) {

      guruLogin = true;

      namaGuruAktif =
        result.nama || username;

      document
        .getElementById("namaGuru")
        .innerText =
        "Guru: " + namaGuruAktif;


      const tanggal =
        document
          .getElementById("tanggal");

      if (!tanggal.value) {

        tanggal.value =
          tanggalHariIni();

      }


      showGuruPage();

      showNotification(
        "Login berhasil.",
        "success"
      );

    } else {

      showNotification(
        result.message ||
        "Login gagal.",
        "error"
      );

    }

  } catch (error) {

    console.error(error);

    showNotification(
      "Tidak dapat terhubung ke server.",
      "error"
    );

  }

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutGuru() {

  stopScan();

  guruLogin = false;

  namaGuruAktif = "";

  showRolePage();

}


/* =========================================================
   TANGGAL HARI INI
========================================================= */

function tanggalHariIni() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


/* =========================================================
   MULAI SCAN
========================================================= */

async function mulaiScan() {

  if (!guruLogin) {

    showNotification(
      "Silakan login sebagai guru.",
      "error"
    );

    return;

  }


  if (scannerRunning) {

    showNotification(
      "Kamera sudah aktif.",
      "error"
    );

    return;

  }


  const tanggal =
    document
      .getElementById("tanggal")
      .value;

  if (!tanggal) {

    showNotification(
      "Silakan pilih tanggal.",
      "error"
    );

    return;

  }


  const jenisShalat =
    document.querySelector(
      'input[name="jenisShalat"]:checked'
    ).value;


  const status =
    document.querySelector(
      'input[name="status"]:checked'
    ).value;


  console.log(
    "Mulai scan:",
    tanggal,
    jenisShalat,
    status
  );


  const statusBox =
    document
      .getElementById("scannerStatus");

  statusBox.innerText =
    "Meminta izin kamera...";


  document
    .getElementById("btnScan")
    .style.display = "none";


  document
    .getElementById("btnStopScan")
    .style.display = "block";


  try {

    html5QrCode =
      new Html5Qrcode("reader");


    const config = {

      fps: 10,

      qrbox: function(
        viewfinderWidth,
        viewfinderHeight
      ) {

        const minEdge =
          Math.min(
            viewfinderWidth,
            viewfinderHeight
          );

        return {

          width:
            Math.floor(minEdge * 0.70),

          height:
            Math.floor(minEdge * 0.70)

        };

      },

      aspectRatio: 1.0

    };


    await html5QrCode.start(

      {
        facingMode: "environment"
      },

      config,

      qrCodeMessage => {

        prosesQR(qrCodeMessage);

      },

      errorMessage => {

        // Error scanning normal
        // tidak perlu ditampilkan
        // agar tidak mengganggu kamera.

      }

    );


    scannerRunning = true;

    statusBox.innerText =
      "📷 Kamera aktif — arahkan QR Code siswa ke kotak scan.";

  } catch (error) {

    console.error(
      "Gagal membuka kamera:",
      error
    );


    document
      .getElementById("btnScan")
      .style.display = "block";


    document
      .getElementById("btnStopScan")
      .style.display = "none";


    statusBox.innerText =
      "Kamera gagal dibuka.";


    showNotification(
      "❌ Kamera gagal dibuka. Pastikan izin kamera diberikan.",
      "error"
    );

  }

}


/* =========================================================
   PROSES QR
========================================================= */

async function prosesQR(qrText) {

  if (!qrText) {
    return;
  }


  qrText =
    qrText.trim();


  /*
     Mencegah satu QR terbaca
     berkali-kali dalam waktu singkat.
  */

  const sekarang =
    Date.now();


  if (
    qrText === lastQR &&
    sekarang - lastQRTime < 3000
  ) {

    return;

  }


  if (qrProcessing) {

    return;

  }


  lastQR =
    qrText;

  lastQRTime =
    sekarang;


  qrProcessing = true;


  const tanggal =
    document
      .getElementById("tanggal")
      .value;


  const jenisShalat =
    document.querySelector(
      'input[name="jenisShalat"]:checked'
    ).value;


  const status =
    document.querySelector(
      'input[name="status"]:checked'
    ).value;


  const statusBox =
    document
      .getElementById("scannerStatus");


  statusBox.innerText =
    "⏳ Memproses QR Code...";


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action: "simpanPresensi",

          tanggal: tanggal,

          qrId: qrText,

          jenisShalat: jenisShalat,

          status: status,

          guru: namaGuruAktif

        })

      });


    const result =
      await response.json();


    console.log(
      "Hasil server:",
      result
    );


    if (result.success) {

      /*
         BUNYI BIP
      */

      bunyiBip();


      /*
         NOTIFIKASI
      */

      showNotification(
        "✓ Input kehadiran berhasil",
        "success"
      );


      /*
         TAMPILKAN SISWA
      */

      const studentName =
        result.nama ||
        result.namaSiswa ||
        qrText;


      document
        .getElementById(
          "lastStudent"
        )
        .style.display =
        "block";


      document
        .getElementById(
          "lastStudentName"
        )
        .innerText =
        studentName;


      statusBox.innerText =
        "📷 Kamera tetap aktif — silakan scan QR berikutnya.";

    }

    else if (
      result.duplicate === true
    ) {

      showNotification(
        "⚠️ Presensi siswa sudah ada.",
        "warning"
      );


      statusBox.innerText =
        "⚠️ QR sudah tercatat. Kamera tetap aktif.";

    }

    else {

      showNotification(
        result.message ||
        "❌ Presensi gagal.",
        "error"
      );


      statusBox.innerText =
        "📷 Kamera tetap aktif.";

    }

  } catch (error) {

    console.error(error);


    showNotification(
      "❌ Gagal terhubung ke server.",
      "error"
    );


    statusBox.innerText =
      "📷 Kamera tetap aktif.";

  }


  /*
     Jangan matikan kamera.

     Scanner langsung kembali
     siap membaca QR berikutnya.
  */

  setTimeout(() => {

    qrProcessing = false;

  }, 500);

}


/* =========================================================
   STOP SCANNER
========================================================= */

async function stopScan() {

  if (!html5QrCode) {

    return;

  }


  try {

    if (scannerRunning) {

      await html5QrCode.stop();

    }

  } catch (error) {

    console.log(
      "Stop scanner:",
      error
    );

  }


  try {

    html5QrCode.clear();

  } catch (error) {

    console.log(
      "Clear scanner:",
      error
    );

  }


  html5QrCode =
    null;

  scannerRunning =
    false;

  qrProcessing =
    false;

  lastQR =
    "";

  lastQRTime =
    0;


  document
    .getElementById("btnScan")
    .style.display =
    "block";


  document
    .getElementById("btnStopScan")
    .style.display =
    "none";


  document
    .getElementById("scannerStatus")
    .innerText =
    "Kamera belum aktif.";

}


/* =========================================================
   DAFTAR SISWA
========================================================= */

async function loadDaftarSiswa() {

  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action: "getSiswa"

        })

      });


    const result =
      await response.json();


    if (!result.success) {

      return;

    }


    const select =
      document
        .getElementById(
          "siswaRekap"
        );


    if (!select) {
      return;
    }


    select.innerHTML =
      '<option value="">Pilih Siswa</option>';


    (result.siswa || []).forEach(
      siswa => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          siswa.qrId ||
          siswa.nisn ||
          siswa.id;

        option.textContent =
          siswa.nama +
          " - " +
          (siswa.kelas || "");

        select.appendChild(
          option
        );

      }
    );

  } catch (error) {

    console.error(
      "Load siswa:",
      error
    );

  }

}


/* =========================================================
   DAFTAR KELAS
========================================================= */

async function loadDaftarKelas() {

  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action: "getSiswa"

        })

      });


    const result =
      await response.json();


    if (!result.success) {
      return;
    }


    const kelasSet =
      new Set();


    (result.siswa || []).forEach(
      siswa => {

        if (siswa.kelas) {

          kelasSet.add(
            siswa.kelas
          );

        }

      }
    );


    const selects = [

      document.getElementById(
        "rekapKelas"
      ),

      document.getElementById(
        "kelasPersentase"
      )

    ];


    selects.forEach(select => {

      if (!select) {
        return;
      }


      select.innerHTML =
        '<option value="">Semua Kelas</option>';


      [...kelasSet]
        .sort()
        .forEach(kelas => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            kelas;

          option.textContent =
            kelas;

          select.appendChild(
            option
          );

        });

    });

  } catch (error) {

    console.error(
      "Load kelas:",
      error
    );

  }

}


/* =========================================================
   REKAP HARIAN
========================================================= */

function showRekapHarian() {

  hideAllPages();

  document
    .getElementById(
      "pageRekapHarian"
    )
    .classList.add("active");

  document
    .getElementById(
      "rekapTanggal"
    ).value =
    tanggalHariIni();

}


async function loadRekapHarian() {

  const tanggal =
    document
      .getElementById(
        "rekapTanggal"
      ).value;


  const kelas =
    document
      .getElementById(
        "rekapKelas"
      ).value;


  const shalat =
    document
      .getElementById(
        "rekapShalat"
      ).value;


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action: "getRekapHarian",

          tanggal: tanggal,

          kelas: kelas,

          jenisShalat: shalat

        })

      });


    const result =
      await response.json();


    if (!result.success) {

      showNotification(
        result.message ||
        "Gagal mengambil data.",
        "error"
      );

      return;

    }


    renderRekapHarian(
      result
    );

  } catch (error) {

    console.error(error);

    showNotification(
      "Gagal mengambil rekap.",
      "error"
    );

  }

}


function renderRekapHarian(result) {

  const container =
    document
      .getElementById(
        "hasilRekapHarian"
      );


  const rows =
    result.data ||
    result.rows ||
    [];


  if (!rows.length) {

    container.innerHTML =
      "<p>Belum ada data.</p>";

    return;

  }


  let html = `

    <div class="table-wrapper">

      <table>

        <thead>

          <tr>

            <th>No</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>Status</th>

          </tr>

        </thead>

        <tbody>

  `;


  rows.forEach(
    (row, index) => {

      html += `

        <tr>

          <td>${index + 1}</td>

          <td>
            ${row.nama || "-"}
          </td>

          <td>
            ${row.kelas || "-"}
          </td>

          <td>
            ${row.status || "-"}
          </td>

        </tr>

      `;

    }
  );


  html += `

        </tbody>

      </table>

    </div>

  `;


  container.innerHTML =
    html;

}


/* =========================================================
   REKAP PERSENTASE
========================================================= */

function showRekapPersentase() {

  hideAllPages();

  document
    .getElementById(
      "pageRekapPersentase"
    )
    .classList.add("active");


  const periode =
    document
      .getElementById(
        "periodePersentase"
      );


  const now =
    new Date();


  periode.value =
    now.getFullYear() +
    "-" +
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

}


async function loadRekapPersentase() {

  const periode =
    document
      .getElementById(
        "periodePersentase"
      ).value;


  const kelas =
    document
      .getElementById(
        "kelasPersentase"
      ).value;


  const shalat =
    document
      .getElementById(
        "shalatPersentase"
      ).value;


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action:
            "getRekapPersentase",

          periode:
            periode,

          kelas:
            kelas,

          jenisShalat:
            shalat

        })

      });


    const result =
      await response.json();


    if (!result.success) {

      showNotification(
        result.message ||
        "Gagal mengambil data.",
        "error"
      );

      return;

    }


    renderRekapPersentase(
      result
    );

  } catch (error) {

    console.error(error);

    showNotification(
      "Gagal mengambil data.",
      "error"
    );

  }

}


function renderRekapPersentase(result) {

  const container =
    document
      .getElementById(
        "hasilRekapPersentase"
      );


  const rows =
    result.data ||
    result.rows ||
    [];


  if (!rows.length) {

    container.innerHTML =
      "<p>Belum ada data.</p>";

    return;

  }


  let html = `

    <div class="table-wrapper">

      <table>

        <thead>

          <tr>

            <th>Kelas</th>
            <th>Jumlah Siswa</th>
            <th>Hadir</th>
            <th>Haid</th>
            <th>Belum</th>
            <th>Persentase</th>

          </tr>

        </thead>

        <tbody>

  `;


  rows.forEach(row => {

    html += `

      <tr>

        <td>${row.kelas || "-"}</td>

        <td>
          ${row.jumlahSiswa || 0}
        </td>

        <td>
          ${row.hadir || 0}
        </td>

        <td>
          ${row.haid || 0}
        </td>

        <td>
          ${row.belum || 0}
        </td>

        <td>
          ${row.persentase || 0}%
        </td>

      </tr>

    `;

  });


  html += `

        </tbody>

      </table>

    </div>

  `;


  container.innerHTML =
    html;

}


/* =========================================================
   REKAP SISWA
========================================================= */

function showRekapSiswa() {

  hideAllPages();

  document
    .getElementById(
      "pageRekapSiswa"
    )
    .classList.add("active");


  const periode =
    document
      .getElementById(
        "periodeSiswa"
      );


  const now =
    new Date();


  periode.value =
    now.getFullYear() +
    "-" +
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

}


async function loadRekapSiswa() {

  const qrId =
    document
      .getElementById(
        "siswaRekap"
      ).value;


  const periode =
    document
      .getElementById(
        "periodeSiswa"
      ).value;


  if (!qrId) {

    showNotification(
      "Silakan pilih siswa.",
      "error"
    );

    return;

  }


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action:
            "getRekapSiswa",

          qrId:
            qrId,

          periode:
            periode

        })

      });


    const result =
      await response.json();


    if (!result.success) {

      showNotification(
        result.message ||
        "Gagal mengambil data.",
        "error"
      );

      return;

    }


    renderRekapSiswa(
      result
    );

  } catch (error) {

    console.error(error);

    showNotification(
      "Gagal mengambil data.",
      "error"
    );

  }

}


function renderRekapSiswa(result) {

  const container =
    document
      .getElementById(
        "hasilRekapSiswa"
      );


  const statistik =
    result.statistik ||
    {};


  const detail =
    result.detail ||
    [];


  let html = `

    <div class="student-summary">

      <h3>
        ${result.siswa?.nama || "-"}
      </h3>

      <p>
        Kelas:
        ${result.siswa?.kelas || "-"}
      </p>

    </div>


    <div class="table-wrapper">

      <table>

        <thead>

          <tr>

            <th>Shalat</th>
            <th>Hadir</th>
            <th>Haid</th>
            <th>Belum</th>
            <th>Persentase</th>

          </tr>

        </thead>

        <tbody>

  `;


  ["Dhuha", "Dhuhur", "Ashar"]
    .forEach(shalat => {

      const s =
        statistik[shalat] ||
        {};

      html += `

        <tr>

          <td>
            ${shalat}
          </td>

          <td>
            ${s.hadir || 0}
          </td>

          <td>
            ${s.haid || 0}
          </td>

          <td>
            ${s.belum || 0}
          </td>

          <td>
            ${s.persentase || 0}%
          </td>

        </tr>

      `;

    });


  html += `

        </tbody>

      </table>

    </div>

  `;


  if (detail.length) {

    html += `

      <h3>
        Detail Presensi
      </h3>

      <div class="table-wrapper">

        <table>

          <thead>

            <tr>

              <th>Tanggal</th>
              <th>Shalat</th>
              <th>Status</th>
              <th>Guru</th>

            </tr>

          </thead>

          <tbody>

    `;


    detail.forEach(row => {

      html += `

        <tr>

          <td>
            ${row.tanggal || "-"}
          </td>

          <td>
            ${row.jenisShalat || "-"}
          </td>

          <td>
            ${row.status || "-"}
          </td>

          <td>
            ${row.guru || "-"}
          </td>

        </tr>

      `;

    });


    html += `

          </tbody>

        </table>

      </div>

    `;

  }


  container.innerHTML =
    html;

}


/* =========================================================
   SAAT HALAMAN DIBUKA
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    showRolePage();


    const tanggal =
      document
        .getElementById(
          "tanggal"
        );


    if (tanggal) {

      tanggal.value =
        tanggalHariIni();

    }

  }
);
