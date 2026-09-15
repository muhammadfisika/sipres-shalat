/* =====================================================
   SIPRES SHALAT
   APP.JS
===================================================== */


/* =====================================================
   URL APPS SCRIPT
===================================================== */

const API_URL =
  "GANTI_DENGAN_URL_APPS_SCRIPT";


/* =====================================================
   DATA GLOBAL
===================================================== */

let currentGuru = null;

let scanner = null;

let scannerRunning = false;

let scannerProcessing = false;

let daftarSiswaGlobal = [];


/* =====================================================
   INIT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const today =
      getTodayString();

    setValue(
      "tanggalPresensi",
      today
    );

    setValue(
      "rekapTanggal",
      today
    );

    setValue(
      "persentaseMulai",
      today
    );

    setValue(
      "persentaseSampai",
      today
    );

    setValue(
      "siswaMulai",
      today
    );

    setValue(
      "siswaSampai",
      today
    );

  }
);


/* =====================================================
   NAVIGASI HALAMAN
===================================================== */

function hideAllPages() {

  document
    .querySelectorAll(".page")
    .forEach(function (page) {

      page.classList.remove(
        "active"
      );

    });

}


function showRolePage() {

  hideAllPages();

  document
    .getElementById("rolePage")
    .classList.add("active");

}


function showGuruLogin() {

  hideAllPages();

  document
    .getElementById("loginPage")
    .classList.add("active");

}


function showUmumPage() {

  hideAllPages();

  document
    .getElementById("umumPage")
    .classList.add("active");

  loadDaftarSiswa();

}


/* =====================================================
   LOGIN GURU
===================================================== */

async function loginGuru() {

  const username =
    getValue("username");

  const password =
    getValue("password");

  const message =
    document.getElementById(
      "loginMessage"
    );

  if (!username || !password) {

    showMessage(
      message,
      "Username dan password wajib diisi.",
      "error"
    );

    return;
  }


  if (
    API_URL.includes(
      "GANTI_DENGAN"
    )
  ) {

    showMessage(
      message,
      "URL Apps Script belum dimasukkan.",
      "error"
    );

    return;
  }


  showLoading(true);

  try {

    const result =
      await apiRequest(
        "login",
        {
          username:
            username,

          password:
            password
        }
      );


    if (
      result.success
    ) {

      currentGuru =
        result.guru;

      localStorage.setItem(
        "sipresGuru",
        JSON.stringify(
          currentGuru
        )
      );


      document.getElementById(
        "namaGuru"
      ).textContent =
        currentGuru.nama;


      hideAllPages();

      document
        .getElementById(
          "guruPage"
        )
        .classList.add(
          "active"
        );


      showMessage(
        message,
        "",
        ""
      );

    } else {

      showMessage(
        message,
        result.message ||
          "Login gagal.",
        "error"
      );

    }

  } catch (error) {

    showMessage(
      message,
      "Gagal terhubung ke server: " +
        error.message,
      "error"
    );

  } finally {

    showLoading(false);

  }

}


/* =====================================================
   LOGOUT
===================================================== */

function logoutGuru() {

  hentikanScan();

  currentGuru = null;

  localStorage.removeItem(
    "sipresGuru"
  );

  setValue(
    "username",
    ""
  );

  setValue(
    "password",
    ""
  );

  showRolePage();

}


/* =====================================================
   SCANNER
===================================================== */

async function mulaiScan() {

  if (!currentGuru) {

    showRolePage();

    return;

  }


  const tanggal =
    getValue(
      "tanggalPresensi"
    );

  if (!tanggal) {

    showFloatingNotification(
      "Tanggal belum dipilih.",
      "error"
    );

    return;

  }


  const jenisShalat =
    getRadioValue(
      "jenisShalat"
    );

  const status =
    getRadioValue(
      "statusPresensi"
    );


  if (!jenisShalat) {

    showFloatingNotification(
      "Jenis shalat belum dipilih.",
      "error"
    );

    return;

  }


  if (!status) {

    showFloatingNotification(
      "Status belum dipilih.",
      "error"
    );

    return;

  }


  const section =
    document.getElementById(
      "scannerSection"
    );

  section.classList.remove(
    "hidden"
  );


  setText(
    "scanStatus",
    "Menyiapkan kamera..."
  );


  /*
   * Scanner QR akan diaktifkan
   * pada tahap berikutnya.
   */

  showFloatingNotification(
    "Scanner QR akan diaktifkan pada tahap berikutnya.",
    "warning"
  );

}


/* =====================================================
   HENTIKAN SCAN
===================================================== */

function hentikanScan() {

  scannerRunning = false;

  scannerProcessing = false;

  if (scanner) {

    try {

      scanner.clear();

    } catch (error) {

      console.log(
        "Scanner clear:",
        error
      );

    }

    scanner = null;

  }

  const section =
    document.getElementById(
      "scannerSection"
    );

  if (section) {

    section.classList.add(
      "hidden"
    );

  }

  setText(
    "scanStatus",
    "Scanner berhenti."
  );

}


/* =====================================================
   PROSES HASIL QR
===================================================== */

async function prosesQR(qrText) {

  if (
    scannerProcessing
  ) {

    return;

  }

  scannerProcessing = true;

  const tanggal =
    getValue(
      "tanggalPresensi"
    );

  const jenisShalat =
    getRadioValue(
      "jenisShalat"
    );

  const status =
    getRadioValue(
      "statusPresensi"
    );


  try {

    const result =
      await apiRequest(
        "simpanPresensi",
        {

          tanggal:
            tanggal,

          qrId:
            qrText,

          jenisShalat:
            jenisShalat,

          status:
            status,

          guru:
            currentGuru
              ? currentGuru.nama
              : ""

        }
      );


    if (
      result.success
    ) {

      bunyiBip();

      showFloatingNotification(
        "✓ Input kehadiran berhasil",
        "success"
      );

      tampilkanSiswaTerakhir(
        result.data
      );


    } else if (
      result.duplicate
    ) {

      showFloatingNotification(
        "⚠️ Presensi siswa sudah ada.",
        "warning"
      );


    } else {

      showFloatingNotification(
        result.message ||
          "Presensi gagal.",
        "error"
      );

    }

  } catch (error) {

    showFloatingNotification(
      "Gagal terhubung ke server.",
      "error"
    );

  } finally {

    /*
     * Scanner tidak dihentikan.
     * Kamera tetap menyala.
     */

    scannerProcessing =
      false;

  }

}


/* =====================================================
   TAMPILKAN SISWA TERAKHIR
===================================================== */

function tampilkanSiswaTerakhir(
  data
) {

  const box =
    document.getElementById(
      "lastStudent"
    );

  const content =
    document.getElementById(
      "lastStudentContent"
    );


  if (
    !box ||
    !content
  ) {
    return;
  }


  box.classList.remove(
    "hidden"
  );


  content.innerHTML = `

    <div class="student-info">

      <div class="student-item">
        <strong>Nama</strong>
        ${escapeHtml(data.nama)}
      </div>

      <div class="student-item">
        <strong>Kelas</strong>
        ${escapeHtml(data.kelas)}
      </div>

      <div class="student-item">
        <strong>Jenis Shalat</strong>
        ${escapeHtml(data.jenisShalat)}
      </div>

      <div class="student-item">
        <strong>Status</strong>
        ${escapeHtml(data.status)}
      </div>

    </div>

  `;

}


/* =====================================================
   REKAP UMUM
===================================================== */

function hideRekap() {

  document
    .querySelectorAll(
      ".rekap-section"
    )
    .forEach(function (element) {

      element.classList.add(
        "hidden"
      );

    });

  document
    .querySelector(
      ".menu-grid"
    )
    .classList.remove(
      "hidden"
    );

}


function showRekapHarian() {

  hideRekapSections();

  document
    .getElementById(
      "rekapHarian"
    )
    .classList.remove(
      "hidden"
    );

}


function showRekapPersentase() {

  hideRekapSections();

  document
    .getElementById(
      "rekapPersentase"
    )
    .classList.remove(
      "hidden"
    );

}


function showRekapSiswa() {

  hideRekapSections();

  document
    .getElementById(
      "rekapSiswa"
    )
    .classList.remove(
      "hidden"
    );

}


function hideRekapSections() {

  document
    .querySelector(
      ".menu-grid"
    )
    .classList.add(
      "hidden"
    );

  document
    .querySelectorAll(
      ".rekap-section"
    )
    .forEach(function (
      element
    ) {

      element.classList.add(
        "hidden"
      );

    });

}


/* =====================================================
   LOAD SISWA
===================================================== */

async function loadDaftarSiswa() {

  try {

    const result =
      await apiRequest(
        "getSiswa",
        {}
      );


    if (
      !result.success
    ) {

      return;

    }


    daftarSiswaGlobal =
      result.data || [];


    isiDropdownSiswa(
      daftarSiswaGlobal
    );


    isiDropdownKelas(
      daftarSiswaGlobal
    );


  } catch (error) {

    console.log(
      "Load siswa:",
      error
    );

  }

}


/* =====================================================
   DROPDOWN SISWA
===================================================== */

function isiDropdownSiswa(
  data
) {

  const select =
    document.getElementById(
      "siswaRekap"
    );

  if (!select) {
    return;
  }


  select.innerHTML = `

    <option value="">
      Pilih siswa
    </option>

  `;


  data.forEach(function (
    siswa
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      siswa.qrId;

    option.textContent =
      siswa.nama +
      " — " +
      siswa.kelas;

    select.appendChild(
      option
    );

  });

}


/* =====================================================
   DROPDOWN KELAS
===================================================== */

function isiDropdownKelas(
  data
) {

  const kelasSet =
    new Set();


  data.forEach(function (
    siswa
  ) {

    if (siswa.kelas) {

      kelasSet.add(
        siswa.kelas
      );

    }

  });


  const selects = [

    document.getElementById(
      "rekapKelas"
    ),

    document.getElementById(
      "persentaseKelas"
    )

  ];


  selects.forEach(
    function (select) {

      if (!select) {
        return;
      }

      select.innerHTML = `

        <option value="">
          Semua Kelas
        </option>

      `;


      Array.from(
        kelasSet
      )
        .sort()
        .forEach(
          function (kelas) {

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

          }
        );

    }
  );

}


/* =====================================================
   REKAP HARIAN
===================================================== */

async function loadRekapHarian() {

  const tanggal =
    getValue(
      "rekapTanggal"
    );

  const kelas =
    getValue(
      "rekapKelas"
    );

  const jenisShalat =
    getValue(
      "rekapShalat"
    );


  if (!tanggal) {

    showResult(
      "rekapHarianResult",
      "Tanggal belum dipilih."
    );

    return;

  }


  showLoading(true);

  try {

    const result =
      await apiRequest(
        "getRekapHarian",
        {

          tanggal:
            tanggal,

          kelas:
            kelas,

          jenisShalat:
            jenisShalat

        }
      );


    if (
      !result.success
    ) {

      showResult(
        "rekapHarianResult",
        result.message
      );

      return;

    }


    renderRekapHarian(
      result
    );


  } catch (error) {

    showResult(
      "rekapHarianResult",
      "Gagal mengambil data."
    );

  } finally {

    showLoading(false);

  }

}


/* =====================================================
   RENDER REKAP HARIAN
===================================================== */

function renderRekapHarian(
  result
) {

  const data =
    result.data || [];


  if (!data.length) {

    showResult(
      "rekapHarianResult",
      "Tidak ada data siswa."
    );

    return;

  }


  let html = `

    <div class="table-wrapper">

      <table>

        <thead>

          <tr>

            <th>No</th>
            <th>NISN</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>Status</th>

          </tr>

        </thead>

        <tbody>

  `;


  data.forEach(
    function (
      siswa,
      index
    ) {

      html += `

        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            ${escapeHtml(
              siswa.nisn
            )}
          </td>

          <td>
            ${escapeHtml(
              siswa.nama
            )}
          </td>

          <td>
            ${escapeHtml(
              siswa.kelas
            )}
          </td>

          <td>
            ${escapeHtml(
              siswa.status
            )}
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


  showResult(
    "rekapHarianResult",
    html,
    true
  );

}


/* =====================================================
   REKAP PERSENTASE
===================================================== */

async function loadRekapPersentase() {

  const mulai =
    getValue(
      "persentaseMulai"
    );

  const sampai =
    getValue(
      "persentaseSampai"
    );

  const kelas =
    getValue(
      "persentaseKelas"
    );

  const jenisShalat =
    getValue(
      "persentaseShalat"
    );


  if (
    !mulai ||
    !sampai
  ) {

    showResult(
      "rekapPersentaseResult",
      "Periode belum lengkap."
    );

    return;

  }


  showLoading(true);

  try {

    const result =
      await apiRequest(
        "getRekapPersentase",
        {

          mulai:
            mulai,

          sampai:
            sampai,

          kelas:
            kelas,

          jenisShalat:
            jenisShalat

        }
      );


    if (
      !result.success
    ) {

      showResult(
        "rekapPersentaseResult",
        result.message
      );

      return;

    }


    renderRekapPersentase(
      result
    );


  } catch (error) {

    showResult(
      "rekapPersentaseResult",
      "Gagal mengambil data."
    );

  } finally {

    showLoading(false);

  }

}


/* =====================================================
   RENDER PERSENTASE
===================================================== */

function renderRekapPersentase(
  result
) {

  const data =
    result.data || [];


  if (!data.length) {

    showResult(
      "rekapPersentaseResult",
      "Tidak ada data."
    );

    return;

  }


  let html = `

    <div class="table-wrapper">

      <table>

        <thead>

          <tr>

            <th>No</th>
            <th>Kelas</th>
            <th>Siswa</th>
            <th>Hadir</th>
            <th>Haid</th>
            <th>Belum</th>
            <th>Persentase</th>

          </tr>

        </thead>

        <tbody>

  `;


  data.forEach(
    function (
      item,
      index
    ) {

      html += `

        <tr>

          <td>
            ${index + 1}
          </td>

          <td>
            ${escapeHtml(
              item.kelas
            )}
          </td>

          <td>
            ${item.jumlahSiswa}
          </td>

          <td>
            ${item.hadir}
          </td>

          <td>
            ${item.haid}
          </td>

          <td>
            ${item.belum}
          </td>

          <td>
            <strong>
              ${item.persentase}%
            </strong>
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


  showResult(
    "rekapPersentaseResult",
    html,
    true
  );

}


/* =====================================================
   REKAP PER SISWA
===================================================== */

async function loadRekapSiswa() {

  const qrId =
    getValue(
      "siswaRekap"
    );

  const mulai =
    getValue(
      "siswaMulai"
    );

  const sampai =
    getValue(
      "siswaSampai"
    );


  if (
    !qrId ||
    !mulai ||
    !sampai
  ) {

    showResult(
      "rekapSiswaResult",
      "Siswa dan periode wajib dipilih."
    );

    return;

  }


  showLoading(true);

  try {

    const result =
      await apiRequest(
        "getRekapSiswa",
        {

          qrId:
            qrId,

          mulai:
            mulai,

          sampai:
            sampai

        }
      );


    if (
      !result.success
    ) {

      showResult(
        "rekapSiswaResult",
        result.message
      );

      return;

    }


    renderRekapSiswa(
      result
    );


  } catch (error) {

    showResult(
      "rekapSiswaResult",
      "Gagal mengambil data."
    );

  } finally {

    showLoading(false);

  }

}


/* =====================================================
   RENDER REKAP SISWA
===================================================== */

function renderRekapSiswa(
  result
) {

  const siswa =
    result.siswa;

  const statistik =
    result.statistik;

  const total =
    result.total;

  const detail =
    result.detail || [];


  let html = `

    <div class="card">

      <h3>
        ${escapeHtml(
          siswa.nama
        )}
      </h3>

      <p>
        Kelas:
        <strong>
          ${escapeHtml(
            siswa.kelas
          )}
        </strong>
      </p>

      <div class="summary-grid">

        <div class="summary-box">
          Hadir
          <strong>
            ${total.hadir}
          </strong>
        </div>

        <div class="summary-box">
          Haid
          <strong>
            ${total.haid}
          </strong>
        </div>

        <div class="summary-box">
          Belum
          <strong>
            ${total.belum}
          </strong>
        </div>

        <div class="summary-box">
          Persentase
          <strong>
            ${total.persentase}%
          </strong>
        </div>

      </div>


      <h3>
        Rekap Per Jenis Shalat
      </h3>

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


  [
    "Dhuha",
    "Dhuhur",
    "Ashar"
  ].forEach(
    function (shalat) {

      const item =
        statistik[shalat];

      html += `

        <tr>

          <td>
            ${shalat}
          </td>

          <td>
            ${item.hadir}
          </td>

          <td>
            ${item.haid}
          </td>

          <td>
            ${item.belum}
          </td>

          <td>
            <strong>
              ${item.persentase}%
            </strong>
          </td>

        </tr>

      `;

    }
  );


  html += `

          </tbody>

        </table>

      </div>


      <h3>
        Detail Presensi
      </h3>

      <div class="table-wrapper">

        <table>

          <thead>

            <tr>

              <th>Tanggal</th>
              <th>Dhuha</th>
              <th>Dhuhur</th>
              <th>Ashar</th>

            </tr>

          </thead>

          <tbody>

  `;


  detail.forEach(
    function (row) {

      html += `

        <tr>

          <td>
            ${escapeHtml(
              row.tanggal
            )}
          </td>

          <td>
            ${escapeHtml(
              row.Dhuha
            )}
          </td>

          <td>
            ${escapeHtml(
              row.Dhuhur
            )}
          </td>

          <td>
            ${escapeHtml(
              row.Ashar
            )}
          </td>

        </tr>

      `;

    }
  );


  html += `

          </tbody>

        </table>

      </div>

    </div>

  `;


  showResult(
    "rekapSiswaResult",
    html,
    true
  );

}


/* =====================================================
   API REQUEST
===================================================== */

async function apiRequest(
  action,
  data
) {

  const response =
    await fetch(
      API_URL,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body:
          JSON.stringify({

            action:
              action,

            ...data

          })

      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      "HTTP " +
      response.status
    );

  }


  return await response.json();

}


/* =====================================================
   BUNYI BIP
===================================================== */

function bunyiBip() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const audioContext =
      new AudioContext();

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();


    oscillator.type =
      "sine";

    oscillator.frequency.value =
      900;

    gain.gain.value =
      0.15;


    oscillator.connect(
      gain
    );

    gain.connect(
      audioContext.destination
    );


    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
      0.12
    );

  } catch (error) {

    console.log(
      "Audio:",
      error
    );

  }

}


/* =====================================================
   FLOATING NOTIFICATION
===================================================== */

function showFloatingNotification(
  message,
  type
) {

  const notification =
    document.getElementById(
      "scanNotification"
    );

  if (!notification) {
    return;
  }


  notification.textContent =
    message;


  notification.className =
    "floating-notification " +
    type +
    " show";


  setTimeout(
    function () {

      notification.classList.remove(
        "show"
      );

    },
    2500
  );

}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
  element,
  message,
  type
) {

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.className =
    "message " +
    type;

}


/* =====================================================
   RESULT
===================================================== */

function showResult(
  id,
  content,
  isHtml
) {

  const element =
    document.getElementById(
      id
    );

  if (!element) {
    return;
  }


  if (isHtml) {

    element.innerHTML =
      content;

  } else {

    element.textContent =
      content;

  }

}


/* =====================================================
   LOADING
===================================================== */

function showLoading(
  show
) {

  const loading =
    document.getElementById(
      "loading"
    );

  if (!loading) {
    return;
  }


  if (show) {

    loading.classList.remove(
      "hidden"
    );

  } else {

    loading.classList.add(
      "hidden"
    );

  }

}


/* =====================================================
   UTILITAS
===================================================== */

function getValue(id) {

  const element =
    document.getElementById(
      id
    );

  return element
    ? element.value.trim()
    : "";

}


function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (element) {

    element.value =
      value;

  }

}


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (element) {

    element.textContent =
      value;

  }

}


function getRadioValue(
  name
) {

  const element =
    document.querySelector(
      `input[name="${name}"]:checked`
    );

  return element
    ? element.value
    : "";

}


function getTodayString() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    year +
    "-" +
    month +
    "-" +
    day
  );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =====================================================
   RESTORE LOGIN
===================================================== */

(function restoreLogin() {

  try {

    const saved =
      localStorage.getItem(
        "sipresGuru"
      );


    if (!saved) {
      return;
    }


    const guru =
      JSON.parse(
        saved
      );


    if (
      guru &&
      guru.nama
    ) {

      currentGuru =
        guru;

      setText(
        "namaGuru",
        guru.nama
      );

    }

  } catch (error) {

    localStorage.removeItem(
      "sipresGuru"
    );

  }

})();
