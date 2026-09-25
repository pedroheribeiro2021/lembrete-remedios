const STORAGE_KEY = "remedios_v1";
const LOG_PREFIX = "remedios_log_";

const COLORS = ["#2f6f4f", "#3d6fa8", "#a8663d", "#7d4fa8", "#c0392b", "#1f9c8a", "#b8860b"];

let meds = loadMeds();
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

// ---------- Alarme nativo do Android ----------

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

// Abre a tela de "Novo alarme" do app de Relógio do Android, já preenchida
// com o horário e o nome do remédio. O usuário confirma o salvamento (e pode
// marcar "repetir todos os dias") — dali em diante é o alarme nativo do
// aparelho, com som, vibração e prioridade sobre o silencioso.
function alarmLabel(med) {
  return med.dose ? `${med.name} - ${med.dose}` : med.name;
}

function buildAlarmIntentUrl(med, time) {
  const [hour, minute] = time.split(":").map(Number);
  const parts = [
    "action=android.intent.action.SET_ALARM",
    `S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(alarmLabel(med))}`,
    `i.android.intent.extra.alarm.HOUR=${hour}`,
    `i.android.intent.extra.alarm.MINUTES=${minute}`,
    "B.android.intent.extra.alarm.SKIP_UI=false",
  ];
  return `intent:#Intent;${parts.join(";")};end`;
}

// Abre a lista de alarmes do app de Relógio nativo — é o único jeito de
// editar ou apagar um alarme já criado: nenhum site (nem app de terceiros)
// tem permissão do Android para ler/alterar os alarmes de outro app.
function buildShowAlarmsIntentUrl() {
  return "intent:#Intent;action=android.intent.action.SHOW_ALARMS;end";
}

// Alguns apps de Relógio de fabricante (Xiaomi, algumas versões de
// Samsung/Motorola) não respondem a SET_ALARM e o Android não avisa nada —
// o toque simplesmente não faz efeito. Por isso copiamos o horário e o nome
// do remédio para a área de transferência antes de tentar abrir o alarme:
// se o preenchimento automático falhar, o usuário já tem o que colar/digitar
// ao abrir o Relógio manualmente (ou pelo botão "Ver alarmes no Relógio").
async function handleCreateAlarmClick(med, time) {
  try {
    await navigator.clipboard.writeText(`${time} - ${alarmLabel(med)}`);
  } catch {
    // clipboard indisponível; segue sem copiar
  }
  window.location.href = buildAlarmIntentUrl(med, time);
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
      <div class="dose-actions">
        <button class="dose-toggle ${taken ? "taken" : ""}" data-med="${med.id}" data-time="${time}">
          ${taken ? "✓ Tomei" : "Marcar"}
        </button>
        ${isAndroid() ? `<button class="dose-alarm-link" data-med="${med.id}" data-time="${time}">⏰ Criar alarme</button>` : ""}
      </div>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".dose-toggle").forEach((btn) => {
    btn.addEventListener("click", () => toggleTaken(btn.dataset.med, btn.dataset.time));
  });

  document.querySelectorAll(".dose-alarm-link").forEach((btn) => {
    const med = meds.find((m) => m.id === btn.dataset.med);
    btn.addEventListener("click", () => handleCreateAlarmClick(med, btn.dataset.time));
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

// ---------- Init ----------

if (isAndroid()) {
  document.getElementById("clock-bar").classList.remove("hidden");
  document.getElementById("btn-open-clock").href = buildShowAlarmsIntentUrl();
}

function renderAll() {
  document.getElementById("today-label").textContent = formatDateLabel();
  renderToday();
  renderMedsList();
}

renderAll();
setInterval(renderToday, 60000); // atualiza status (atrasado etc.) mesmo sem interação

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
