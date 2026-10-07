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
let settings = Object.assign({ platform: "generic", lang: "en", count: 30, demo: true, theme: "system", provider: "gemini", model: "", style: "professional", remember: false }, store.get("settings", {}));
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
  settings.provider = $("provider").value || settings.provider;
  settings.model = $("model").value.trim();
  settings.style = $("style").value;
  settings.remember = $("remember").checked;
  try {
    localStorage.removeItem("apiKey"); sessionStorage.removeItem("apiKey");
    (settings.remember ? localStorage : sessionStorage).setItem("apiKey", $("apiKey").value.trim());
  } catch {}
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
["platform", "lang", "count", "demo", "style", "provider", "model", "remember", "apiKey"].forEach((id) => $(id).addEventListener("change", () => { saveSettings(); validate(); }));
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
  else if (kws.length < p.min) add(false, `Hanya ${kws.length} keywords. Minimal yang disarankan: ${p.min}.`);
  else add(true, `${kws.length} keywords.`);

  add(dupes.length ? false : true, dupes.length ? `Kemungkinan keyword duplikat: ${dupes.join(", ")}` : "Tidak ada duplikat.");
  if (kws.length && title) {
    const words = title.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    add(words.some((w) => kws.map(norm).includes(norm(w))) ? true : false, "Judul dan keywords saling berkaitan.");
  }
  add(null, "Periksa manual: merek/logo, orang yang bisa dikenali (model release), dan aturan platform.");
  $("valList").innerHTML = items.join("");
  renderExtras(title, desc, kws, dupes);
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

$("genBtn").onclick = async () => {
  saveSettings();
  kwRel = {}; flags = null;
  if (settings.demo) demoGenerate(); else await aiGenerate();
  validate();
};

/* ===== COPY & EXPORT ===== */
let loadedName = "";
const filename = () => (currentFile ? currentFile.name : loadedName || "image01.jpg");
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

/* ===== AI PROVIDER (Phase 2) ===== */
const PROVIDERS = {
  gemini: { name: "Gemini (ada tier gratis)", model: "gemini-3.8-flash" },
  openai: { name: "OpenAI", model: "gpt-4o-mini" },
  claude: { name: "Claude", model: "claude-haiku-4-5-20251001" },
};
let kwRel = {};      // keyword -> high | medium | low
let flags = null;    // saran AI: lisensi, orang, merek
let b64cache = { file: null, data: null };

fillSelect("provider", Object.keys(PROVIDERS), (k) => PROVIDERS[k].name);
$("provider").value = PROVIDERS[settings.provider] ? settings.provider : "gemini";
$("model").value = settings.model;
$("style").value = settings.style;
$("remember").checked = settings.remember;
$("apiKey").value = sessionStorage.getItem("apiKey") || localStorage.getItem("apiKey") || "";
const setModelHint = () => ($("model").placeholder = PROVIDERS[$("provider").value].model);
$("provider").addEventListener("change", setModelHint); setModelHint();

const SYSTEM_PROMPT = `You are an expert microstock metadata specialist.
Analyze the provided image carefully. Identify only visible and reasonably inferable elements. Generate accurate microstock metadata.
Do not invent locations, brands, people names, events, organizations, products or trademarks.
Prioritize accuracy, relevance, searchability, natural language and commercial usefulness.
Avoid keyword stuffing, repetitive keywords, irrelevant keywords, subjective claims and exaggerated descriptions.
Title: clear, descriptive, natural. Description: 1-2 factual sentences. Keywords: ordered from most to least relevant, no duplicates, no singular/plural pairs.
Reply with JSON only, no markdown.`;

function buildPrompt(useInfo = true) {
  const p = PLATFORMS[$("platform").value], lang = $("lang").value === "id" ? "Indonesian" : "English";
  const info = !useInfo ? "" : ["subject", "location", "concept", "details"].map((id) => ($(id).value.trim() ? `${id}: ${$(id).value.trim()}` : "")).filter(Boolean).join("\n");
  return `Platform: ${p.name}. Language for title, description and keywords: ${lang}. Style: ${$("style").value}.
Platform guidance (general style hints, not official rules): ${p.notes || "none"}
Title max ${p.title} characters, description max ${p.desc} characters. Return ${settings.count} keywords (never more than ${p.keywords}).
${tplHint()}User hints (may be empty):
${info || "none"}
Return JSON exactly in this shape: {"title":"","description":"","keywords":[{"k":"","relevance":"high|medium|low"}],"category":"one of: ${CATEGORIES.join(", ")}","contentType":"one of: ${TYPES.join(", ")}","aiGenerated":"Yes|No|Unknown","commercialEditorial":"Commercial|Editorial|Uncertain","peopleCount":0,"trademarkWarning":"empty if none","notes":""}`;
}

function compressImage(file) { // kecilkan gambar (maks 1024 px) agar hemat kuota
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = () => rej(new Error("Gambar tidak bisa dibaca."));
    img.src = url;
  });
}

async function callAI(b64, useInfo = true) {
  const prov = $("provider").value, key = $("apiKey").value.trim();
  const model = $("model").value.trim() || PROVIDERS[prov].model, prompt = buildPrompt(useInfo);
  let r, j;
  if (prov === "gemini") {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: b64 } }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    j = await r.json(); if (!r.ok) throw new Error(j.error?.message || r.status);
    if (!j.candidates?.[0]?.content) throw new Error("AI tidak mengembalikan hasil" + (j.promptFeedback?.blockReason ? " (diblokir: " + j.promptFeedback.blockReason + ")" : "") + ".");
    return j.candidates[0].content.parts.map((x) => x.text || "").join("");
  }
  if (prov === "openai") {
    r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model, response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64 } }] }],
      }),
    });
    j = await r.json(); if (!r.ok) throw new Error(j.error?.message || r.status);
    return j.choices[0].message.content;
  }
  r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model, max_tokens: 1500, system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }, { type: "text", text: prompt }] }],
    }),
  });
  j = await r.json(); if (!r.ok) throw new Error(j.error?.message || r.status);
  return j.content.map((x) => x.text || "").join("");
}

function applyAI(d) {
  const kws = (d.keywords || []).map((x) => (typeof x === "string" ? { k: x, relevance: "medium" } : x)).filter((x) => x && x.k);
  kws.forEach((x) => (kwRel[String(x.k).trim().toLowerCase()] = x.relevance));
  $("title").value = d.title || ""; $("desc").value = d.description || "";
  $("kw").value = dedupe(kws.map((x) => String(x.k).trim().toLowerCase())).slice(0, PLATFORMS[$("platform").value].keywords).join(", ");
  if (CATEGORIES.includes(d.category)) $("cat").value = d.category;
  if (TYPES.includes(d.contentType)) $("type").value = d.contentType;
  $("ai").value = d.aiGenerated === "Yes" ? "Yes" : "No";
  flags = { commercial: d.commercialEditorial || "Uncertain", people: Number(d.peopleCount) || 0, trademark: d.trademarkWarning || "", ai: d.aiGenerated || "Unknown" };
}

async function aiGenerate() {
  if (!$("apiKey").value.trim()) return msg("AI provider is not configured. Isi API key di bagian Konfigurasi AI, atau aktifkan Demo Mode.");
  if (!currentFile) return msg("Upload gambar terlebih dahulu.");
  const btn = $("genBtn"); btn.disabled = true; btn.textContent = "Menganalisis...";
  msg("");
  try {
    if (b64cache.file !== currentFile) b64cache = { file: currentFile, data: await compressImage(currentFile) };
    const d = JSON.parse((await callAIRetry(b64cache.data, true, (n) => msg("Server sibuk, mencoba lagi (" + n + "/3)..."))).replace(/```json|```/g, "").trim());
    applyAI(d);
    msg("Selesai. Periksa dan edit hasil sebelum dipakai.");
  } catch (e) {
    msg("Unable to generate metadata. " + e.message + " Tekan Generate Metadata untuk mencoba lagi.");
  } finally { btn.disabled = false; btn.textContent = "Generate Metadata"; }
}

/* ===== SKOR, RELEVANSI, SARAN ===== */
function renderExtras(title, desc, kws, dupes) {
  renderScore(title, desc, kws, dupes);
  renderAnalysis(title, desc, kws);
  const box = $("chips"); box.innerHTML = "";
  kws.forEach((k) => {
    const b = document.createElement("button");
    b.className = "chip chip-" + (kwRel[k] || "unknown"); b.textContent = k + " ×"; b.title = "Klik untuk hapus";
    b.onclick = () => { $("kw").value = parseKw($("kw").value).filter((x) => x !== k).join(", "); validate(); };
    box.appendChild(b);
  });
  const known = kws.filter((k) => kwRel[k]);
  $("kq").textContent = known.length ? `Kualitas keyword: ${keywordQuality(known)}/100` : "";
  $("flagsCard").classList.toggle("hidden", !flags);
  if (flags) {
    const li = [`ℹ️ Saran lisensi: ${flags.commercial}. Ini hanya perkiraan, bukan saran hukum.`];
    if (flags.people > 0) li.push(`⚠️ Terdeteksi sekitar ${flags.people} orang. Periksa apakah model release diperlukan untuk penggunaan komersial.`);
    if (flags.trademark) li.push("⚠️ Kemungkinan merek/logo: " + flags.trademark + " Periksa manual.");
    li.push(`ℹ️ Perkiraan AI untuk konten AI-generated: ${flags.ai}. Anda yang menentukan asal konten.`);
    $("flags").innerHTML = ""; li.forEach((t) => { const e = document.createElement("li"); e.textContent = t; $("flags").appendChild(e); });
  }
}
const W = { high: 1, medium: 0.6, low: 0.2 };
const keywordQuality = (known) => Math.round(known.reduce((s, x) => s + (W[kwRel[x]] ?? 0.6), 0) / known.length * 100);

function renderScore(title, desc, kws, dupes) {
  const p = PLATFORMS[$("platform").value], tips = [];
  const words = title.split(/\s+/).filter(Boolean).length;
  const A = analyze(title, desc, kws);
  const t = !title ? 0 : (title.length > p.title || title.length < 20 || A.stuffed) ? 8 : words >= 5 ? 20 : 16;
  const d = !desc ? 0 : (desc.length > p.desc || desc.length < 30) ? 8 : desc.length >= 60 ? 20 : 15;
  const k = Math.max(0, Math.min(kws.length, 25) / 25 * 30 - dupes.length * 2 - (kws.length > p.keywords ? 8 : 0) - Math.min(4, A.generic.length) - Math.min(4, A.nearDup.length));
  const known = kws.filter((x) => kwRel[x]);
  let rel = 0;
  if (known.length) rel = keywordQuality(known) / 100 * 20;
  else if (kws.length) {
    const text = (title + " " + desc).toLowerCase(), top = kws.slice(0, 5);
    rel = 8 + top.filter((x) => text.includes(norm(x))).length / top.length * 12;
  }
  const c = (title ? 3 : 0) + (desc ? 3 : 0) + (kws.length >= 10 ? 3 : 0) + ($("subject").value.trim() || currentFile ? 1 : 0);
  if (!title || title.length < 20) tips.push("Tambahkan detail subjek pada judul.");
  if (!desc) tips.push("Isi deskripsi 1–2 kalimat."); else if (desc.length < 30) tips.push("Perpanjang deskripsi sedikit.");
  if (kws.length < 15) tips.push("Tambahkan keyword yang lebih spesifik tentang subjek.");
  if (dupes.length) tips.push("Hapus keyword duplikat.");
  if (known.some((x) => kwRel[x] === "low")) tips.push("Hapus keyword berelevansi rendah.");
  A.tips.slice(0, 3).forEach((x) => tips.push(x));
  const rows = [["Judul", t, 20], ["Deskripsi", d, 20], ["Keywords", k, 30], ["Relevansi", rel, 20], ["Kelengkapan", c, 10]];
  const total = Math.round(rows.reduce((s, r) => s + r[1], 0));
  $("score").innerHTML = `<p class="text-3xl font-bold">${total} <span class="text-base font-normal text-slate-500">/ 100</span></p>` +
    rows.map((r) => `<div class="mt-2 text-sm"><div class="flex justify-between"><span>${r[0]}</span><span>${Math.round(r[1])}/${r[2]}</span></div><div class="bar"><i style="width:${r[1] / r[2] * 100}%"></i></div></div>`).join("") +
    (tips.length ? `<ul class="mt-3 text-sm list-disc pl-5">${tips.map((x) => `<li>${x}</li>`).join("")}</ul>` : "");
}

/* ===== PHASE 3: NAVIGASI, RIWAYAT, FAVORIT, TEMPLATE, BATCH ===== */
let page = "generate", editingId = null;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hist = { get: () => store.get("history", []), set: (v) => setList("history", v) };

function showPage(name) {
  page = name;
  const id = name === "history" || name === "favorites" ? "list" : name;
  ["generate", "batch", "list", "templates", "account"].forEach((p) => $("page-" + p).classList.toggle("hidden", p !== id));
  document.querySelectorAll("[data-page]").forEach((b) => b.setAttribute("aria-current", b.dataset.page === name ? "page" : "false"));
  if (id === "list") renderList();
  if (id === "templates") renderTemplates();
  if (id === "batch") renderBatch();
  if (id === "account") renderAccount();
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-page]").forEach((b) => (b.onclick = () => showPage(b.dataset.page)));

function mkRow(cells, actions) {
  const tr = document.createElement("tr");
  tr.className = "border-t border-slate-200 dark:border-slate-700 align-top";
  cells.forEach((c) => { const td = document.createElement("td"); td.className = "p-2"; c instanceof Node ? td.appendChild(c) : (td.textContent = c); tr.appendChild(td); });
  const td = document.createElement("td"); td.className = "p-2 whitespace-nowrap";
  actions.forEach(([label, fn]) => { const b = document.createElement("button"); b.className = "btn mr-1 mb-1"; b.textContent = label; b.onclick = fn; td.appendChild(b); });
  tr.appendChild(td); return tr;
}
const recText = (r) => `Title:\n${r.title}\n\nDescription:\n${r.desc}\n\nKeywords:\n${r.kw.join(", ")}\n\nCategory: ${r.cat}\nContent Type: ${r.type}\nAI Generated: ${r.ai}`;
const recRow = (r) => [r.filename, r.title, r.desc, r.kw.join(","), r.cat, r.type, r.ai].map(csvCell).join(",");
function downloadCsv(rows, name) {
  const blob = new Blob(["\ufeffFilename,Title,Description,Keywords,Category,Content Type,AI Generated\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/* --- simpan, favorit, riwayat --- */
function currentRecord() {
  return { id: uid(), date: new Date().toISOString(), filename: filename(), platform: $("platform").value, title: $("title").value.trim(), desc: $("desc").value.trim(), kw: parseKw($("kw").value), cat: $("cat").value, type: $("type").value, ai: $("ai").value, fav: false };
}
function saveCurrent(toggleFav) {
  if (!$("title").value.trim() && !$("kw").value.trim()) { toast("Isi metadata terlebih dahulu."); return null; }
  const list = hist.get(), rec = currentRecord(), i = list.findIndex((x) => x.id === editingId);
  if (i >= 0) { rec.id = list[i].id; rec.fav = list[i].fav; list[i] = rec; } else list.unshift(rec);
  if (toggleFav) rec.fav = !rec.fav;
  hist.set(list.slice(0, 500)); editingId = rec.id; return rec;
}
$("saveBtn").onclick = () => saveCurrent(false) && toast("Disimpan ke Riwayat.");
$("favBtn").onclick = () => { const r = saveCurrent(true); if (r) toast(r.fav ? "Ditambahkan ke Favorit." : "Dihapus dari Favorit."); };
$("fileInput").addEventListener("change", () => { editingId = null; loadedName = ""; });
$("clearBtn").addEventListener("click", () => { editingId = null; kwRel = {}; flags = null; validate(); });

function loadRecord(r, file) {
  $("platform").value = r.platform; $("title").value = r.title; $("desc").value = r.desc; $("kw").value = r.kw.join(", ");
  $("cat").value = r.cat; $("type").value = r.type; $("ai").value = r.ai;
  kwRel = r.rel || {}; flags = r.flags || null; editingId = null; loadedName = r.filename;
  if (file) loadFile(file);
  msg(""); validate(); showPage("generate");
}
function renderList() {
  const fav = page === "favorites";
  $("listTitle").textContent = fav ? "Favorit" : "Riwayat";
  const items = hist.get().filter((r) => !fav || r.fav), body = $("listBody"); body.innerHTML = "";
  $("listEmpty").classList.toggle("hidden", items.length > 0);
  items.forEach((r) => body.appendChild(mkRow(
    [new Date(r.date).toLocaleString("id-ID"), r.filename, PLATFORMS[r.platform]?.name || r.platform, r.title, String(r.kw.length)],
    [[r.fav ? "★" : "☆", () => { const l = hist.get(), x = l.find((y) => y.id === r.id); x.fav = !x.fav; hist.set(l); renderList(); }],
     ["Buka/Edit", () => { loadRecord(r); editingId = r.id; }],
     ["Salin", () => copyText(recText(r))],
     ["Hapus", () => { if (confirm("Hapus data ini?")) { hist.set(hist.get().filter((y) => y.id !== r.id)); renderList(); } }]]
  )));
}

/* --- template --- */
const BUILTIN_TPL = [
  { id: "b1", name: "Photo Metadata", cat: "Lifestyle", type: "Photo", hint: "Treat as a real photograph. Mention composition (copy space, close up, natural light) only if visible." },
  { id: "b2", name: "AI Illustration", cat: "Other", type: "AI-generated", hint: "Treat as an AI-generated illustration. Describe the art style and the subject." },
  { id: "b3", name: "Business", cat: "Business", type: "Photo", hint: "Focus on business concepts such as teamwork, office and productivity, only when visible." },
  { id: "b4", name: "Nature", cat: "Nature", type: "Photo", hint: "Focus on landscape, plants, animals, weather, season and time of day when visible." },
  { id: "b5", name: "Food", cat: "Food", type: "Photo", hint: "Focus on the dish, ingredients, cuisine and presentation when visible." },
  { id: "b6", name: "Education", cat: "Education", type: "Photo", hint: "Focus on learning, school, study and teaching concepts when visible." },
  { id: "b7", name: "Children", cat: "People", type: "Photo", hint: "Describe children neutrally and factually, without identifying details." },
  { id: "b8", name: "Background", cat: "Background", type: "Background", hint: "Describe texture, colors, pattern and mood. Mention copy space and suitable uses." },
];
const tpls = () => BUILTIN_TPL.concat(store.get("templates", []));
const tplHint = () => { const t = tpls().find((x) => x.id === $("template").value); return t ? `Template guidance (${t.name}): ${t.hint}\n` : ""; };
function refreshTplSelect() {
  const cur = $("template").value;
  $("template").innerHTML = `<option value="">Tanpa template</option>` + tpls().map((t) => `<option value="${t.id}">${t.name.replace(/[<>&"]/g, "")}</option>`).join("");
  $("template").value = tpls().some((t) => t.id === cur) ? cur : "";
}
$("template").onchange = () => { const t = tpls().find((x) => x.id === $("template").value); if (t) { $("cat").value = t.cat; $("type").value = t.type; validate(); } };
fillSelect("tplCat", CATEGORIES); fillSelect("tplType", TYPES);
function renderTemplates() {
  const ul = $("tplList"); ul.innerHTML = "";
  tpls().forEach((t) => {
    const li = document.createElement("li"); li.className = "flex items-start justify-between gap-2 border-t border-slate-200 dark:border-slate-700 pt-2";
    const d = document.createElement("div"); d.textContent = `${t.name} (${t.cat} / ${t.type}). ${t.hint}`; li.appendChild(d);
    if (!t.id.startsWith("b")) {
      const b = document.createElement("button"); b.className = "btn"; b.textContent = "Hapus";
      b.onclick = () => { setList("templates", store.get("templates", []).filter((x) => x.id !== t.id)); refreshTplSelect(); renderTemplates(); };
      li.appendChild(b);
    }
    ul.appendChild(li);
  });
}
$("tplAdd").onclick = () => {
  const name = $("tplName").value.trim();
  if (!name) return toast("Isi nama template.");
  setList("templates", store.get("templates", []).concat({ id: "c" + uid(), name, cat: $("tplCat").value, type: $("tplType").value, hint: $("tplHint").value.trim() }));
  $("tplName").value = ""; $("tplHint").value = ""; refreshTplSelect(); renderTemplates(); toast("Template disimpan.");
};
refreshTplSelect();

/* --- batch --- */
let batch = [], running = false;
function toRecord(d, name) {
  const ks = (d.keywords || []).map((x) => (typeof x === "string" ? { k: x, relevance: "medium" } : x)).filter((x) => x && x.k), rel = {};
  ks.forEach((x) => (rel[String(x.k).trim().toLowerCase()] = x.relevance));
  return { id: uid(), date: new Date().toISOString(), filename: name, platform: $("platform").value, title: d.title || "", desc: d.description || "",
    kw: dedupe(ks.map((x) => String(x.k).trim().toLowerCase())).slice(0, PLATFORMS[$("platform").value].keywords),
    cat: CATEGORIES.includes(d.category) ? d.category : "Other", type: TYPES.includes(d.contentType) ? d.contentType : "Photo",
    ai: d.aiGenerated === "Yes" ? "Yes" : "No", fav: false, rel,
    flags: { commercial: d.commercialEditorial || "Uncertain", people: Number(d.peopleCount) || 0, trademark: d.trademarkWarning || "", ai: d.aiGenerated || "Unknown" } };
}
$("batchInput").onchange = (e) => {
  const all = [...e.target.files], ok = all.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 25 * 1024 * 1024);
  const room = 50 - batch.length;
  ok.slice(0, room).forEach((f) => batch.push({ id: uid(), file: f, url: URL.createObjectURL(f), status: "Pending", rec: null }));
  if (ok.length < all.length) toast("Beberapa file dilewati (format atau ukuran tidak didukung).");
  else if (ok.length > room) toast("Maksimal 50 gambar.");
  e.target.value = ""; renderBatch();
};
const STATUS_CLS = { Pending: "unknown", Analyzing: "medium", Completed: "high", Error: "low" };
function renderBatch() {
  const body = $("batchBody"); body.innerHTML = ""; $("batchEmpty").classList.toggle("hidden", batch.length > 0);
  batch.forEach((it) => {
    const img = document.createElement("img"); img.src = it.url; img.loading = "lazy"; img.alt = it.file.name; img.className = "w-14 h-14 object-cover rounded";
    const st = document.createElement("span"); st.className = "chip chip-" + STATUS_CLS[it.status]; st.textContent = it.status; if (it.err) st.title = it.err;
    const stBox = document.createElement("div"); stBox.appendChild(st);
    if (it.err) { const p = document.createElement("p"); p.className = "text-xs text-red-600 dark:text-red-400 mt-1 max-w-[14rem]"; p.textContent = it.err; stBox.appendChild(p); }
    const r = it.rec, desc = document.createElement("div"); desc.className = "line-clamp-2 max-w-xs"; desc.textContent = r ? r.desc : "";
    const acts = [["Generate Ulang", () => runItem(it)], ["Hapus", () => { URL.revokeObjectURL(it.url); batch = batch.filter((x) => x !== it); renderBatch(); }]];
    if (r) acts.unshift(["Edit", () => loadRecord(r, it.file)], ["Salin", () => copyText(recText(r))]);
    body.appendChild(mkRow([img, r ? r.title : it.file.name, desc, r ? String(r.kw.length) : "", r ? r.cat : "", stBox], acts));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function callAIRetry(b64, useInfo, onWait) { // coba ulang otomatis untuk error sementara (server sibuk, batas permintaan)
  for (let a = 0; ; a++) {
    try { return await callAI(b64, useInfo); }
    catch (e) {
      if (a >= 3 || !/high demand|overload|unavailable|429|quota|rate|try again|busy/i.test(e.message || "")) throw e;
      onWait(a + 1); await sleep((a + 1) * 5000);
    }
  }
}
async function runItem(it) {
  if (settings.demo || !$("apiKey").value.trim()) return toast("Batch butuh AI: matikan Demo Mode dan isi API key.");
  it.status = "Analyzing"; it.err = ""; renderBatch();
  try {
    if (!it.b64) it.b64 = await compressImage(it.file);
    const raw = await callAIRetry(it.b64, false, (n) => { it.err = `Server sibuk, mencoba lagi (${n}/3)...`; renderBatch(); });
    it.rec = toRecord(JSON.parse(raw.replace(/```json|```/g, "").trim()), it.file.name); it.status = "Completed"; it.err = "";
  } catch (e) { it.status = "Error"; it.err = e.message; }
  renderBatch();
}
$("batchGen").onclick = async () => {
  saveSettings();
  if (settings.demo) return ($("batchMsg").textContent = "Batch membutuhkan AI. Matikan Demo Mode di halaman Generate dan isi API key.");
  if (!$("apiKey").value.trim()) return ($("batchMsg").textContent = "AI provider is not configured. Isi API key di halaman Generate.");
  if (running) return; running = true; $("batchMsg").textContent = "Memproses...";
  for (const it of batch.filter((x) => x.status !== "Completed")) { await runItem(it); await new Promise((r) => setTimeout(r, 2000)); }
  running = false;
  const n = batch.filter((x) => x.status === "Completed").length, e = batch.filter((x) => x.status === "Error").length;
  $("batchMsg").textContent = `Selesai: ${n} berhasil, ${e} error. Tekan Generate Semua lagi untuk mengulang yang error.`;
};
$("batchSave").onclick = () => {
  const todo = batch.filter((x) => x.rec && !x.saved); if (!todo.length) return toast("Tidak ada hasil baru untuk disimpan.");
  hist.set(todo.map((x) => ({ ...x.rec, id: uid() })).concat(hist.get()).slice(0, 500)); todo.forEach((x) => (x.saved = true)); toast(`${todo.length} data disimpan ke Riwayat.`);
};
$("batchCsv").onclick = () => { const rows = batch.filter((x) => x.rec).map((x) => recRow(x.rec)); rows.length ? downloadCsv(rows, "metadata-batch.csv") : toast("Belum ada hasil."); };
$("batchClear").onclick = () => { batch.forEach((x) => URL.revokeObjectURL(x.url)); batch = []; $("batchMsg").textContent = ""; renderBatch(); };

/* ===== PHASE 4: AKUN & SINKRONISASI CLOUD ===== */
const cloudOn = () => !!(window.Cloud && window.Cloud.configured && window.Cloud.user && store.get("cloudSync", true));
const cloudErr = (e) => toast("Cloud: " + (e.message || e));
function cloudDiff(key, old, nu) {
  if (!cloudOn()) return;
  const om = new Map(old.map((r) => [r.id, r])), nm = new Set(nu.map((r) => r.id));
  nu.forEach((r) => { const o = om.get(r.id); if (!o || o.updatedAt !== r.updatedAt) window.Cloud.put(key, r).catch(cloudErr); });
  old.forEach((r) => { if (!nm.has(r.id)) window.Cloud.remove(key, r.id).catch(cloudErr); });
}
function setList(key, v) { // satu pintu untuk menulis riwayat dan template (lokal + cloud)
  const old = store.get(key, []), om = new Map(old.map((r) => [r.id, r]));
  v.forEach((r) => { const o = om.get(r.id); if (!o || JSON.stringify({ ...o, updatedAt: 0 }) !== JSON.stringify({ ...r, updatedAt: 0 })) r.updatedAt = Date.now(); });
  store.set(key, v); cloudDiff(key, old, v);
}
async function syncKind(key, lastSync) {
  const local = store.get(key, []), remote = await window.Cloud.list(key);
  const rm = new Map(remote.map((r) => [r.id, r])), lm = new Map(local.map((r) => [r.id, r])), out = [], ups = [];
  local.forEach((r) => { if (!r.updatedAt) r.updatedAt = Date.now(); });
  remote.forEach((r) => {
    const l = lm.get(r.id);
    if (!l || (r.updatedAt || 0) > (l.updatedAt || 0)) out.push(r);
    else { out.push(l); if (l.updatedAt > (r.updatedAt || 0)) ups.push(l); }
  });
  local.forEach((r) => { if (!rm.has(r.id) && r.updatedAt > lastSync) { out.push(r); ups.push(r); } }); // sisanya dihapus di perangkat lain
  await Promise.all(ups.map((r) => window.Cloud.put(key, r)));
  if (key === "history") out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  store.set(key, out.slice(0, 500));
  return { down: remote.filter((r) => !lm.has(r.id)).length, up: ups.length };
}
async function syncNow() {
  if (!window.Cloud || !window.Cloud.user) return;
  const last = store.get("lastSync", 0), t = Date.now();
  $("accMsg").textContent = "Menyinkronkan...";
  try {
    const a = await syncKind("history", last), b = await syncKind("templates", last);
    store.set("lastSync", t); refreshTplSelect();
    $("accMsg").textContent = `Sinkronisasi selesai: ${a.down + b.down} data diterima, ${a.up + b.up} dikirim.`;
    if (page === "history" || page === "favorites") renderList();
  } catch (e) { $("accMsg").textContent = "Sinkronisasi gagal: " + (e.message || e); }
}
const authErr = (e) => ({ "auth/invalid-credential": "Email atau password salah.", "auth/email-already-in-use": "Email sudah terdaftar.", "auth/weak-password": "Password minimal 6 karakter.", "auth/invalid-email": "Format email tidak valid.", "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti." }[e.code] || e.message);
async function doAuth(fn) {
  const em = $("accMail").value.trim(), pw = $("accPass").value;
  if (!em || !pw) return ($("accMsg").textContent = "Isi email dan password.");
  try { await fn(em, pw); $("accMsg").textContent = ""; $("accPass").value = ""; } catch (e) { $("accMsg").textContent = authErr(e); }
}
function renderAccount() {
  const C = window.Cloud, ok = C && C.configured, u = C && C.user;
  $("accNote").textContent = !C ? "Memuat... Jika tidak selesai, buka aplikasi lewat server (lihat README Phase 4)." : !ok ? "Firebase belum dikonfigurasi. Isi firebase-config.js (lihat README, bagian Phase 4). Aplikasi tetap berfungsi tanpa akun." : u ? "" : "Masuk untuk menyimpan riwayat dan template di cloud dan memakainya di perangkat lain. Opsional.";
  $("accIn").classList.toggle("hidden", !(ok && !u)); $("accOut").classList.toggle("hidden", !(ok && u));
  if (u) { $("accEmail").textContent = "Masuk sebagai " + u.email; $("cloudSync").checked = store.get("cloudSync", true); }
}
window.addEventListener("cloud-auth", () => { renderAccount(); if (cloudOn()) syncNow(); });
$("accLogin").onclick = () => doAuth((e, p) => window.Cloud.signIn(e, p));
$("accSignup").onclick = () => doAuth((e, p) => window.Cloud.signUp(e, p));
$("accReset").onclick = async () => {
  const em = $("accMail").value.trim(); if (!em) return ($("accMsg").textContent = "Isi email terlebih dahulu.");
  try { await window.Cloud.reset(em); $("accMsg").textContent = "Jika email terdaftar, tautan reset password sudah dikirim."; } catch (e) { $("accMsg").textContent = authErr(e); }
};
$("accLogout").onclick = () => window.Cloud.signOut();
$("accSync").onclick = syncNow;
$("cloudSync").onchange = (e) => { store.set("cloudSync", e.target.checked); if (e.target.checked) syncNow(); };

/* ===== PHASE 5: PRESET PLATFORM & ANALISIS KEYWORD LANJUTAN ===== */
// Catatan gaya umum (BUKAN aturan resmi). Selalu cek panduan resmi tiap platform.
const PLATFORM_NOTES = {
  generic: "Natural descriptive title; keywords ordered by relevance.",
  shutterstock: "Descriptive title as a plain sentence; specific, relevant keywords.",
  adobe: "Short descriptive title without keyword lists; most important keywords first.",
  freepik: "Descriptive title; mention style or format (illustration, vector, background) when applicable.",
  istock: "Accurate title and description; concept keywords only if clearly conveyed.",
  dreamstime: "Descriptive title and description; relevant keywords ordered by importance.",
  depositphotos: "Descriptive title; relevant keywords ordered by importance.",
};
Object.keys(PLATFORMS).forEach((k) => { PLATFORMS[k].notes = PLATFORM_NOTES[k] || ""; PLATFORMS[k].min = 10; });
const PLAT_DEFAULTS = JSON.parse(JSON.stringify(PLATFORMS));
function applyOverrides() {
  const ov = store.get("platformOverrides", {});
  Object.keys(PLATFORMS).forEach((k) => Object.assign(PLATFORMS[k], PLAT_DEFAULTS[k], ov[k] || {}));
}
applyOverrides();
fillSelect("ppPlat", Object.keys(PLATFORMS), (k) => PLATFORMS[k].name);
function loadPP() { const p = PLATFORMS[$("ppPlat").value]; $("ppMax").value = p.keywords; $("ppMin").value = p.min; $("ppTitle").value = p.title; $("ppDesc").value = p.desc; }
$("ppPlat").onchange = loadPP; loadPP();
$("ppSave").onclick = () => {
  const k = $("ppPlat").value, ov = store.get("platformOverrides", {}), n = (id, d) => Math.max(0, parseInt($(id).value) || d);
  ov[k] = { keywords: Math.max(1, n("ppMax", 50)), min: n("ppMin", 10), title: Math.max(10, n("ppTitle", 200)), desc: Math.max(10, n("ppDesc", 200)) };
  store.set("platformOverrides", ov); applyOverrides(); loadPP(); validate(); toast("Preset disimpan.");
};
$("ppReset").onclick = () => {
  const ov = store.get("platformOverrides", {}); delete ov[$("ppPlat").value];
  store.set("platformOverrides", ov); applyOverrides(); loadPP(); validate(); toast("Preset dikembalikan ke bawaan.");
};

const GENERIC = new Set(["image", "photo", "picture", "stock", "beautiful", "nice", "amazing", "good", "great", "best", "awesome", "cool", "hd", "quality", "design", "photography"]);
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w);
function analyze(title, desc, kws) {
  const tips = [], generic = kws.filter((k) => GENERIC.has(k)), seen = new Map(), nearDup = [];
  kws.forEach((k) => {
    const key = k.split(/\s+/).map(stem).sort().join(" ");
    seen.has(key) ? nearDup.push(k + " ≈ " + seen.get(key)) : seen.set(key, k);
  });
  const tstems = new Set((title + " " + desc).toLowerCase().split(/\W+/).filter((w) => w.length > 2).map(stem));
  const top = kws.slice(0, 10), topIn = top.filter((k) => k.split(/\s+/).some((w) => tstems.has(stem(w)))).length;
  const kstems = new Set(kws.flatMap((k) => k.split(/\s+/).map(stem)));
  const tw = title.toLowerCase().split(/\W+/).filter(Boolean);
  const missing = [...new Set(tw.filter((w) => w.length > 3 && !STOP.has(w)))].filter((w) => !kstems.has(stem(w)));
  const stuffed = (title.match(/,/g) || []).length >= 3 || tw.length > 18 || tw.filter((w, i) => w.length > 3 && tw.indexOf(w) !== i).length > 1;
  if (generic.length) tips.push("Ganti keyword yang terlalu umum: " + generic.join(", ") + ".");
  if (nearDup.length) tips.push("Keyword hampir sama: " + nearDup.slice(0, 3).join("; ") + ".");
  if (kws.length && missing.length) tips.push("Kata di judul belum ada di keywords: " + missing.slice(0, 5).join(", ") + ".");
  if (stuffed) tips.push("Judul terlihat seperti daftar keyword. Tulis sebagai kalimat deskriptif.");
  if (top.length && topIn < Math.ceil(top.length / 2)) tips.push("Kurang dari separuh 10 keyword teratas muncul di judul/deskripsi. Periksa relevansinya.");
  return { generic, nearDup, missing, stuffed, phrases: kws.filter((k) => k.includes(" ")).length, topIn, topN: top.length, tips };
}
function renderAnalysis(title, desc, kws) {
  const A = analyze(title, desc, kws), ul = $("anaList"); ul.innerHTML = "";
  const add = (t) => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); };
  if (!kws.length) return add("Isi keywords untuk melihat analisis.");
  add(`ℹ️ Keyword berupa frasa (2+ kata): ${A.phrases} dari ${kws.length}.`);
  add(`ℹ️ Keyword teratas yang muncul di judul/deskripsi: ${A.topIn} dari ${A.topN}.`);
  A.tips.length ? A.tips.forEach((t) => add("⚠️ " + t)) : add("✅ Tidak ada masalah keyword yang terdeteksi.");
}

showPage("generate");

validate();
