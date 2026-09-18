const STORAGE_KEY = "remedios_v1";
const LOG_PREFIX = "remedios_log_";
const NOTIF_COOLDOWN_MS = 5 * 60 * 1000; // não repete lembrete do mesmo horário antes disso
const DUE_WINDOW_MS = 60 * 60 * 1000; // considera "atrasado" até 1h após o horário

const COLORS = ["#2f6f4f", "#3d6fa8", "#a8663d", "#7d4fa8", "#c0392b", "#1f9c8a", "#b8860b"];

let meds = loadMeds();
let lastNotified = {}; // chave `${medId}_${time}_${dateKey}` -> timestamp
let editingMedId = null;

function uid() {
  return "m_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadMeds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMeds() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
}

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadLog(dateKey) {
  try {
    return JSON.parse(localStorage.getItem(LOG_PREFIX + dateKey)) || {};
  } catch {
    return {};
  }
}

function saveLog(dateKey, log) {
  localStorage.setItem(LOG_PREFIX + dateKey, JSON.stringify(log));
}

function colorForMed(medId) {
  const idx = meds.findIndex((m) => m.id === medId);
  return COLORS[Math.max(idx, 0) % COLORS.length];
}

function formatDateLabel(d = new Date()) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ---------- Render: hoje ----------

function renderToday() {
  const container = document.getElementById("today-list");
  const emptyMsg = document.getElementById("empty-today");
  container.innerHTML = "";

  const dateKey = todayKey();
  const log = loadLog(dateKey);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const doses = [];
  meds.forEach((med) => {
    (med.times || []).forEach((time) => {
      doses.push({ med, time });
    });
  });

  if (doses.length === 0) {
    emptyMsg.classList.remove("hidden");
  } else {
    emptyMsg.classList.add("hidden");
  }

  doses.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  let anyDue = false;

  doses.forEach(({ med, time }) => {
    const logKey = `${med.id}_${time}`;
    const taken = !!log[logKey];
    const scheduledMin = timeToMinutes(time);
    const diffMin = nowMin - scheduledMin;

    let status = "pending";
    let statusLabel = "Ainda vem aí";
    if (taken) {
      status = "taken";
      const takenAt = log[logKey].at ? new Date(log[logKey].at) : null;
      statusLabel = takenAt
        ? `Tomado às ${takenAt.getHours().toString().padStart(2, "0")}:${takenAt
            .getMinutes()
            .toString()
            .padStart(2, "0")}`
        : "Tomado";
    } else if (diffMin >= 0) {
      status = "due";
      statusLabel = diffMin === 0 ? "Agora" : `Atrasado ${diffMin} min`;
      anyDue = true;
    }

    const card = document.createElement("div");
    card.className = "dose-card";
    card.innerHTML = `
      <div class="dose-color" style="background:${colorForMed(med.id)}"></div>
      <div class="dose-info">
        <div class="dose-time">${time}</div>
        <div class="dose-name">${escapeHtml(med.name)}</div>
        ${med.dose ? `<div class="dose-dose">${escapeHtml(med.dose)}</div>` : ""}
        <div class="dose-status ${status}">${statusLabel}</div>
      </div>
      <button class="dose-toggle ${taken ? "taken" : ""}" data-med="${med.id}" data-time="${time}">
        ${taken ? "✓ Tomei" : "Marcar"}
      </button>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".dose-toggle").forEach((btn) => {
    btn.addEventListener("click", () => toggleTaken(btn.dataset.med, btn.dataset.time));
  });

  updateAlertBanner(anyDue);
}

function toggleTaken(medId, time) {
  const dateKey = todayKey();
  const log = loadLog(dateKey);
  const key = `${medId}_${time}`;
  if (log[key]) {
    delete log[key];
  } else {
    log[key] = { at: new Date().toISOString() };
  }
  saveLog(dateKey, log);
  renderToday();
}

function updateAlertBanner(anyDue) {
  const banner = document.getElementById("alert-banner");
  if (anyDue) {
    banner.textContent = "⏰ Você tem remédio pendente no horário. Não esqueça!";
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---------- Render: lista de remédios cadastrados ----------

function renderMedsList() {
  const container = document.getElementById("meds-list");
  container.innerHTML = "";

  if (meds.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-msg";
    p.textContent = "Nenhum remédio cadastrado. Toque em \"Novo remédio\" para começar.";
    container.appendChild(p);
    return;
  }

  meds.forEach((med) => {
    const card = document.createElement("div");
    card.className = "med-card";
    card.innerHTML = `
      <div class="dose-color" style="background:${colorForMed(med.id)}"></div>
      <div class="med-info">
        <div class="med-name">${escapeHtml(med.name)}</div>
        ${med.dose ? `<div class="med-dose">${escapeHtml(med.dose)}</div>` : ""}
        <div class="med-times">${(med.times || []).join("  •  ")}</div>
      </div>
      <div class="med-chevron">›</div>
    `;
    card.addEventListener("click", () => openMedModal(med.id));
    container.appendChild(card);
  });
}

// ---------- Modal de cadastro/edição ----------

const modal = document.getElementById("med-modal");
const form = document.getElementById("med-form");
const timesList = document.getElementById("times-list");

function openMedModal(medId = null) {
  editingMedId = medId;
  const med = medId ? meds.find((m) => m.id === medId) : null;

  document.getElementById("modal-title").textContent = med ? "Editar remédio" : "Novo remédio";
  document.getElementById("med-name").value = med ? med.name : "";
  document.getElementById("med-dose").value = med ? med.dose || "" : "";
  document.getElementById("btn-delete-med").classList.toggle("hidden", !med);

  timesList.innerHTML = "";
  const times = med && med.times && med.times.length ? med.times : ["08:00"];
  times.forEach((t) => addTimeRow(t));

  modal.classList.remove("hidden");
}

function closeMedModal() {
  modal.classList.add("hidden");
  editingMedId = null;
}

function addTimeRow(value = "") {
  const row = document.createElement("div");
  row.className = "time-row";
  row.innerHTML = `
    <input type="time" value="${value}" required />
    <button type="button" class="btn-remove-time">✕</button>
  `;
  row.querySelector(".btn-remove-time").addEventListener("click", () => {
    if (timesList.children.length > 1) row.remove();
  });
  timesList.appendChild(row);
}

document.getElementById("btn-new-med").addEventListener("click", () => openMedModal());
document.getElementById("btn-cancel-med").addEventListener("click", closeMedModal);
document.getElementById("btn-add-time").addEventListener("click", () => addTimeRow());

document.getElementById("btn-delete-med").addEventListener("click", () => {
  if (!editingMedId) return;
  if (!confirm("Excluir este remédio? Isso não apaga o histórico já registrado.")) return;
  meds = meds.filter((m) => m.id !== editingMedId);
  saveMeds();
  closeMedModal();
  renderAll();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("med-name").value.trim();
  const dose = document.getElementById("med-dose").value.trim();
  const times = Array.from(timesList.querySelectorAll('input[type="time"]'))
    .map((i) => i.value)
    .filter(Boolean)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

  if (!name || times.length === 0) return;

  if (editingMedId) {
    const med = meds.find((m) => m.id === editingMedId);
    med.name = name;
    med.dose = dose;
    med.times = times;
  } else {
    meds.push({ id: uid(), name, dose, times });
  }

  saveMeds();
  closeMedModal();
  renderAll();
});

// ---------- Notificações / alarme ----------

function requestNotifications() {
  if (!("Notification" in window)) {
    alert("Este navegador não suporta notificações.");
    return;
  }
  Notification.requestPermission().then((perm) => {
    updateNotifBarState();
    if (perm === "granted") {
      beep(); // confirma que o som funciona
    }
  });
}

function updateNotifBarState() {
  const bar = document.getElementById("notif-bar");
  if ("Notification" in window && Notification.permission === "granted") {
    bar.classList.add("hidden");
  } else {
    bar.classList.remove("hidden");
  }
}

document.getElementById("btn-enable-notif").addEventListener("click", requestNotifications);

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    };
    playTone(0);
    playTone(0.35);
  } catch {
    // ambiente sem suporte a áudio; ignora
  }
}

function checkDueMeds() {
  const dateKey = todayKey();
  const log = loadLog(dateKey);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  meds.forEach((med) => {
    (med.times || []).forEach((time) => {
      const logKey = `${med.id}_${time}`;
      if (log[logKey]) return; // já tomou

      const scheduledMin = timeToMinutes(time);
      const diffMs = (nowMin - scheduledMin) * 60000;
      if (diffMs < 0 || diffMs > DUE_WINDOW_MS) return; // ainda não chegou ou passou muito

      const notifKey = `${logKey}_${dateKey}`;
      const last = lastNotified[notifKey] || 0;
      if (Date.now() - last < NOTIF_COOLDOWN_MS) return;

      lastNotified[notifKey] = Date.now();
      fireReminder(med, time);
    });
  });
}

function fireReminder(med, time) {
  beep();
  if ("Notification" in window && Notification.permission === "granted") {
    const n = new Notification(`💊 Hora do remédio: ${med.name}`, {
      body: `${time}${med.dose ? " • " + med.dose : ""}`,
      tag: `${med.id}_${time}`,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }
}

// ---------- Init ----------

function renderAll() {
  document.getElementById("today-label").textContent = formatDateLabel();
  renderToday();
  renderMedsList();
}

renderAll();
updateNotifBarState();
setInterval(checkDueMeds, 20000);
setInterval(renderToday, 60000); // atualiza status (atrasado etc.) mesmo sem interação
checkDueMeds();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
