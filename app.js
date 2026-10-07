/* ===== KONFIGURASI PLATFORM =====
   Angka di bawah hanya nilai awal. Aturan platform bisa berubah,
   jadi cek aturan terbaru lalu ubah angkanya di sini. */
const PLATFORMS = {
  generic:       { name: "Generic Microstock", keywords: 50, title: 200, desc: 200 },
  shutterstock:  { name: "Shutterstock",       keywords: 50, title: 200, desc: 200 },
  adobe:         { name: "Adobe Stock",        keywords: 49, title: 70,  desc: 200 },
  freepik:       { name: "Freepik",            keywords: 50, title: 100, desc: 200 },
  istock:        { name: "iStock",             keywords: 50, title: 200, desc: 200 },
  dreamstime:    { name: "Dreamstime",         keywords: 80, title: 100, desc: 200 },
  depositphotos: { name: "Depositphotos",      keywords: 50, title: 200, desc: 200 },
};
const CATEGORIES = ["Business", "Technology", "Lifestyle", "Nature", "Food", "Education", "People", "Animals", "Buildings", "Background", "Abstract", "Other"];
const TYPES = ["Photo", "Illustration", "Vector", "AI-generated", "3D Render", "Background", "Pattern", "Icon"];

const SAMPLE = {
  filename: "business-woman-laptop.jpg",
  title: "Professional woman working on laptop in modern office",
  desc: "Professional woman working on a laptop at a modern office desk, representing business, productivity, technology, and professional lifestyle.",
  kw: "woman, laptop, working, office, business, professional, technology, computer, employee, workplace, productivity, career, corporate, workspace, digital, modern, desk, indoors, communication, internet",
  cat: "Business", type: "Photo",
};

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let settings = Object.assign({ platform: "generic", lang: "en", count: 30, demo: true, theme: "system" }, store.get("settings", {}));
let currentFile = null;

/* ===== TOAST ===== */
let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 2500);
}

/* ===== TEMA ===== */
function applyTheme() {
  const dark = settings.theme === "dark" || (settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  $("themeBtn").textContent = { light: "Tema: Terang", dark: "Tema: Gelap", system: "Tema: Sistem" }[settings.theme];
}
$("themeBtn").onclick = () => {
  settings.theme = { light: "dark", dark: "system", system: "light" }[settings.theme];
  saveSettings(); applyTheme();
};

function saveSettings() {
  settings.platform = $("platform").value;
  settings.lang = $("lang").value;
  settings.count = Math.min(50, Math.max(10, parseInt($("count").value) || 30));
  settings.demo = $("demo").checked;
  store.set("settings", settings);
}

/* ===== INISIALISASI FORM ===== */
function fillSelect(id, items, labelFn) {
  $(id).innerHTML = items.map((v) => `<option value="${v}">${labelFn ? labelFn(v) : v}</option>`).join("");
}
fillSelect("platform", Object.keys(PLATFORMS), (k) => PLATFORMS[k].name);
fillSelect("cat", CATEGORIES);
fillSelect("type", TYPES);
$("platform").value = settings.platform;
$("lang").value = settings.lang;
$("count").value = settings.count;
$("demo").checked = settings.demo;
["platform", "lang", "count", "demo"].forEach((id) => $(id).addEventListener("change", () => { saveSettings(); validate(); }));
applyTheme();

/* ===== UPLOAD GAMBAR ===== */
function formatSize(b) { return b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : Math.round(b / 1024) + " KB"; }
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function loadFile(f) {
  if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast("Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.");
  if (f.size > 25 * 1024 * 1024) return toast("Gambar terlalu besar (maksimal 25 MB).");
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const g = gcd(img.naturalWidth, img.naturalHeight);
    currentFile = f;
    $("previewImg").src = url;
    $("fName").textContent = f.name;
    $("fSize").textContent = formatSize(f.size);
    $("fRes").textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
    $("fRatio").textContent = `${img.naturalWidth / g}:${img.naturalHeight / g}` + (g < 10 ? ` (≈ ${(img.naturalWidth / img.naturalHeight).toFixed(2)}:1)` : "");
    $("preview").classList.remove("hidden");
  };
  img.onerror = () => toast("Gambar tidak bisa dibaca.");
  img.src = url;
}
$("fileInput").onchange = (e) => loadFile(e.target.files[0]);
$("removeImg").onclick = () => { currentFile = null; $("fileInput").value = ""; $("preview").classList.add("hidden"); };
const drop = $("drop");
["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => loadFile(e.dataTransfer.files[0]));

/* ===== KEYWORD HELPER ===== */
const parseKw = (t) => t.split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
const norm = (k) => k.replace(/([^s])s$/, "$1");

function findDuplicates(list) {
  const seen = new Set(), dupes = [];
  list.forEach((k) => { const n = norm(k); seen.has(n) ? dupes.push(k) : seen.add(n); });
  return dupes;
}
function dedupe(list) {
  const seen = new Set();
  return list.filter((k) => { const n = norm(k); if (seen.has(n)) return false; seen.add(n); return true; });
}

/* ===== VALIDASI ===== */
function validate() {
  const p = PLATFORMS[$("platform").value];
  const title = $("title").value.trim(), desc = $("desc").value.trim(), kws = parseKw($("kw").value);
  $("titleCnt").textContent = `${title.length}/${p.title}`;
  $("descCnt").textContent = `${desc.length}/${p.desc}`;
  $("kwCnt").textContent = `${kws.length}/${p.keywords} keywords`;
  $("aiNote").classList.toggle("hidden", $("ai").value !== "Yes" && $("type").value !== "AI-generated");

  const dupes = findDuplicates(kws);
  const items = [];
  const add = (ok, msg) => items.push(`<li>${ok === true ? "✅" : ok === false ? "⚠️" : "ℹ️"} ${msg}</li>`);

  if (!title) add(false, "Judul masih kosong.");
  else if (title.length > p.title) add(false, `Judul terlalu panjang (${title.length}/${p.title}).`);
  else if (title.length < 20) add(false, "Judul terlalu pendek, tambahkan detail subjek.");
  else add(true, "Panjang judul sudah baik.");

  if (!desc) add(false, "Deskripsi masih kosong.");
  else if (desc.length > p.desc) add(false, `Deskripsi terlalu panjang (${desc.length}/${p.desc}).`);
  else if (desc.length < 30) add(false, "Deskripsi terlalu pendek.");
  else add(true, "Panjang deskripsi sudah baik.");

  if (!kws.length) add(false, "Keywords masih kosong.");
  else if (kws.length > p.keywords) add(false, `Keywords melebihi batas platform (${kws.length}/${p.keywords}).`);
  else if (kws.length < 10) add(false, `Hanya ${kws.length} keywords. Disarankan minimal 10.`);
  else add(true, `${kws.length} keywords.`);

  add(dupes.length ? false : true, dupes.length ? `Kemungkinan keyword duplikat: ${dupes.join(", ")}` : "Tidak ada duplikat.");
  if (kws.length && title) {
    const words = title.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    add(words.some((w) => kws.map(norm).includes(norm(w))) ? true : false, "Judul dan keywords saling berkaitan.");
  }
  add(null, "Periksa manual: merek/logo, orang yang bisa dikenali (model release), dan aturan platform.");
  $("valList").innerHTML = items.join("");
}
["title", "desc", "kw"].forEach((id) => $(id).addEventListener("input", validate));
["ai", "type", "cat"].forEach((id) => $(id).addEventListener("change", validate));

$("dedupBtn").onclick = () => {
  const list = parseKw($("kw").value), out = dedupe(list);
  $("kw").value = out.join(", "); validate();
  toast(list.length === out.length ? "Tidak ada duplikat." : `${list.length - out.length} duplikat dihapus.`);
};
$("trimBtn").onclick = () => {
  const max = PLATFORMS[$("platform").value].keywords, list = parseKw($("kw").value);
  $("kw").value = list.slice(0, max).join(", "); validate();
  toast(list.length > max ? `Dipotong menjadi ${max} keywords (urutan awal dipertahankan).` : "Jumlah keywords sudah sesuai.");
};
$("clearBtn").onclick = () => { ["title", "desc", "kw"].forEach((id) => ($(id).value = "")); validate(); };

/* ===== GENERATE ===== */
const STOP = new Set(["a", "an", "the", "in", "on", "at", "of", "with", "and", "or", "to", "for", "di", "dan", "yang", "dengan", "ke", "dari"]);
function msg(text) { const m = $("genMsg"); m.textContent = text; m.classList.toggle("hidden", !text); }

function demoGenerate() {
  const v = (id) => $(id).value.trim();
  const s = v("subject"), l = v("location"), c = v("concept"), d = v("details");
  if (!s) { // tanpa input: pakai data contoh
    $("title").value = SAMPLE.title; $("desc").value = SAMPLE.desc;
    $("kw").value = parseKw(SAMPLE.kw).slice(0, settings.count).join(", ");
    $("cat").value = SAMPLE.cat; $("type").value = SAMPLE.type; $("ai").value = "No";
    return msg("Demo Mode: memakai data contoh. Isi Informasi Gambar agar hasil mengikuti teks Anda.");
  }
  const id = $("lang").value === "id";
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  $("title").value = cap(s) + (l ? (id ? " di " : " in ") + l : "");
  $("desc").value = cap(s) + (l ? (id ? " di " : " in ") + l : "") + (c ? (id ? ", mewakili " : ", representing ") + c : "") + (d ? (id ? ". Detail: " : ". Details: ") + d : "") + ".";
  const words = [s, l, c, d].join(",").toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2 && !STOP.has(w));
  $("kw").value = dedupe(words).slice(0, settings.count).join(", ");
  msg("Demo Mode: hasil dibuat dari teks yang Anda isi, gambar TIDAK dianalisis. Periksa dan edit sebelum dipakai.");
}

$("genBtn").onclick = () => {
  saveSettings();
  if (settings.demo) demoGenerate();
  else msg("AI provider belum dikonfigurasi. Analisis gambar dengan AI tersedia di Phase 2. Sementara itu, aktifkan Demo Mode atau isi metadata secara manual.");
  validate();
};

/* ===== COPY & EXPORT ===== */
const filename = () => (currentFile ? currentFile.name : "image01.jpg");
function csvCell(t) { return `"${String(t).replace(/"/g, '""')}"`; }
function csvText(withHeader) {
  const row = [filename(), $("title").value.trim(), $("desc").value.trim(), parseKw($("kw").value).join(","), $("cat").value, $("type").value, $("ai").value]
    .map(csvCell).join(",");
  return (withHeader ? "Filename,Title,Description,Keywords,Category,Content Type,AI Generated\n" : "") + row;
}
function textFor(what) {
  const kws = parseKw($("kw").value).join(", ");
  if (what === "title") return $("title").value.trim();
  if (what === "desc") return $("desc").value.trim();
  if (what === "kw") return kws;
  if (what === "csv") return csvText(false);
  return `Title:\n${$("title").value.trim()}\n\nDescription:\n${$("desc").value.trim()}\n\nKeywords:\n${kws}\n\nCategory: ${$("cat").value}\nContent Type: ${$("type").value}\nAI Generated: ${$("ai").value}`;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); }
  toast("Tersalin ke clipboard.");
}
document.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => {
  const t = textFor(b.dataset.copy);
  t ? copyText(t) : toast("Belum ada isi untuk disalin.");
}));
$("csvBtn").onclick = () => {
  if (!$("title").value.trim() && !$("kw").value.trim()) return toast("Isi metadata terlebih dahulu.");
  const blob = new Blob(["\ufeff" + csvText(true)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "metadata.csv"; a.click();
  URL.revokeObjectURL(a.href);
};

validate();
