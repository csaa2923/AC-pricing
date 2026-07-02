const HOURLY_RATE = 150;
const VAT_RATE = 0.20;
const STORAGE_KEY = "act_anfragen_v1";

const services = [
  "Erleben & Entdecken",
  "Genuss & Kulinarik",
  "Ruhe & Wellness",
  "Familie & Kinder",
  "Romantik",
  "Kunst & Kultur",
  "Sport & Action",
  "Natur authentisch erleben",
  "Exklusive Services",
  "Gruppen & Events",
  "Mobilität & Transfers",
  "Individuelle Anfrage"
];

const regions = [
  "Innsbruck",
  "Seefeld",
  "Ötztal",
  "Zillertal",
  "Kitzbühel",
  "Telfs",
  "Tirol allgemein",
  "andere Region"
];

const statuses = [
  "Anfrage erhalten",
  "Anfrage geprüft",
  "Angebot erstellt",
  "Angebot gesendet",
  "Kunde bestätigt",
  "Zahlung angefordert",
  "Zahlung eingegangen",
  "Programm in Ausarbeitung",
  "Programm abgeschlossen",
  "Abgeschlossen",
  "Abgelehnt"
];

const structuredKeys = [
  ["leistung", "Hauptleistung"],
  ["genaueLeistung", "Genaue Leistung"],
  ["region", "Region"],
  ["ort", "Ort"],
  ["datumVon", "Datum von"],
  ["datumBis", "Datum bis"],
  ["uhrzeit", "Uhrzeit"],
  ["erwachsene", "Erwachsene"],
  ["kinder", "Kinder"],
  ["alterKinder", "Alter Kinder"],
  ["budget", "Budget"],
  ["sprache", "Sprache"],
  ["besondereWuensche", "Besondere Wünsche"],
  ["einschraenkungen", "Einschränkungen"],
  ["allergien", "Allergien"],
  ["mobilitaetswuensche", "Mobilitätswünsche"],
  ["hotel", "Hotel"],
  ["transferbedarf", "Transferbedarf"],
  ["dringlichkeit", "Dringlichkeit"],
  ["vipLevel", "VIP-Level"],
  ["fehlendeInformationen", "Fehlende Informationen"],
  ["unsicherheiten", "Unsicherheiten"],
  ["naechsterSchritt", "Nächster Schritt"],
  ["schwierigkeitsgrad", "Schwierigkeitsgrad"]
];

const ids = [
  "statusSelect",
  "quickModeButton",
  "analysisModeButton",
  "quickMode",
  "analysisMode",
  "alertBox",
  "leistung",
  "genaueLeistung",
  "region",
  "andereRegion",
  "datumVon",
  "datumBis",
  "erwachsene",
  "kinder",
  "alterKinder",
  "aufwandStunden",
  "unsicherheitProzent",
  "bruttoAktiv",
  "beschreibung",
  "kundentext",
  "quickAiButton",
  "analyseButton",
  "calculateButton",
  "saveButton",
  "newRequestButton",
  "savedRequests",
  "basisNetto",
  "preisVon",
  "preisBis",
  "minAufwand",
  "maxAufwand",
  "bruttoPreis",
  "structuredFields",
  "angebotText",
  "whatsappText",
  "emailText",
  "rueckfragen",
  "interneNotizen",
  "zusatzleistungen"
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const state = { mode: "quick", activeId: null, structured: {} };

function fillSelect(select, values) {
  select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function numberValue(id, fallback = 0) {
  const value = Number.parseFloat(el[id].value);
  return Number.isFinite(value) ? value : fallback;
}

function setMode(mode) {
  state.mode = mode;
  el.quickMode.classList.toggle("hidden", mode !== "quick");
  el.analysisMode.classList.toggle("hidden", mode !== "analysis");
  el.quickModeButton.classList.toggle("active", mode === "quick");
  el.analysisModeButton.classList.toggle("active", mode === "analysis");
}

function showAlert(message, type = "info") {
  el.alertBox.textContent = message;
  el.alertBox.classList.remove("hidden", "error");
  if (type === "error") el.alertBox.classList.add("error");
}

function clearAlert() {
  el.alertBox.classList.add("hidden");
  el.alertBox.textContent = "";
}

function getFormData() {
  return {
    leistung: el.leistung.value,
    genaueLeistung: el.genaueLeistung.value.trim(),
    region: el.region.value === "andere Region" ? el.andereRegion.value.trim() || "andere Region" : el.region.value,
    andereRegion: el.andereRegion.value.trim(),
    datumVon: el.datumVon.value,
    datumBis: el.datumBis.value,
    erwachsene: numberValue("erwachsene"),
    kinder: numberValue("kinder"),
    alterKinder: el.alterKinder.value.trim(),
    beschreibung: el.beschreibung.value.trim(),
    kundentext: el.kundentext.value.trim(),
    aufwandStunden: numberValue("aufwandStunden"),
    unsicherheitProzent: numberValue("unsicherheitProzent", 20),
    status: el.statusSelect.value,
    angebotText: el.angebotText.value,
    whatsappText: el.whatsappText.value,
    emailText: el.emailText.value,
    rueckfragen: el.rueckfragen.value,
    interneNotizen: el.interneNotizen.value,
    zusatzleistungen: el.zusatzleistungen.value,
    structured: readStructuredFields()
  };
}

function calculate(data = getFormData()) {
  const effort = Math.max(Number(data.aufwandStunden) || 0, 0);
  const uncertainty = Math.max(Number(data.unsicherheitProzent) || 0, 0) / 100;
  const minEffort = Math.max(effort * (1 - uncertainty), 0.5);
  const maxEffort = Math.max(effort * (1 + uncertainty), minEffort);
  const base = effort * HOURLY_RATE;
  const from = minEffort * HOURLY_RATE;
  const to = maxEffort * HOURLY_RATE;
  const grossTo = to * (1 + VAT_RATE);

  el.basisNetto.textContent = formatCurrency(base);
  el.preisVon.textContent = formatCurrency(from);
  el.preisBis.textContent = formatCurrency(to);
  el.minAufwand.textContent = `${minEffort.toFixed(2).replace(".", ",")} h`;
  el.maxAufwand.textContent = `${maxEffort.toFixed(2).replace(".", ",")} h`;
  el.bruttoPreis.textContent = el.bruttoAktiv.value === "true" ? formatCurrency(grossTo) : "nicht angezeigt";

  return { basisNetto: base, preisVon: from, preisBis: to, minAufwand: minEffort, maxAufwand: maxEffort, bruttoBis: grossTo };
}

function buildManualTexts(data = getFormData()) {
  const calculation = calculate(data);
  const title = data.genaueLeistung || data.leistung || "Ihre Anfrage";
  const datePart = data.datumVon ? ` am ${data.datumVon}${data.datumBis && data.datumBis !== data.datumVon ? ` bis ${data.datumBis}` : ""}` : "";
  const pricePart = `${formatCurrency(calculation.preisVon)} bis ${formatCurrency(calculation.preisBis)} netto`;

  if (!el.angebotText.value.trim()) {
    el.angebotText.value = `Angebotsindikation für ${title}${datePart}\n\nLeistung: ${data.leistung}\nRegion: ${data.region}\nPersonen: ${data.erwachsene} Erwachsene, ${data.kinder} Kinder\nGeschätzter Organisationsaufwand: ${data.aufwandStunden} Stunden\nPreisband: ${pricePart}\n\nHinweis: Interne Richtkalkulation; externe Kosten, Verfügbarkeiten und verbindliche Reservierungen werden gesondert geprüft.`;
  }

  if (!el.whatsappText.value.trim()) {
    el.whatsappText.value = `Vielen Dank für Ihre Anfrage. Sehr gerne prüfen wir ${title}${datePart} für Sie. Als erste Orientierung liegt unser Organisationsaufwand voraussichtlich bei ${pricePart}. Für ein verbindliches Angebot prüfen wir nun Verfügbarkeit, Details und mögliche Zusatzleistungen.`;
  }

  if (!el.emailText.value.trim()) {
    el.emailText.value = `Guten Tag,\n\nvielen Dank für Ihre Anfrage an Alpine Concierge Tirol.\n\nGerne prüfen wir ${title}${datePart} in der Region ${data.region}. Auf Basis der vorliegenden Informationen liegt die interne Preisindikation für die Organisation derzeit bei ${pricePart}.\n\nFür die weitere Ausarbeitung prüfen wir Verfügbarkeiten, externe Kosten und noch offene Details.\n\nMit freundlichen Grüßen\nAlpine Concierge Tirol`;
  }

  if (!el.rueckfragen.value.trim()) {
    el.rueckfragen.value = [
      "Welche Uhrzeit wünschen Sie?",
      "Gibt es ein Wunschbudget?",
      "Benötigen Sie einen Transfer?",
      "Soll die Reservierung verbindlich erfolgen?",
      "Gibt es besondere Wünsche oder Einschränkungen?"
    ].join("\n");
  }
}

function renderStructuredFields(data = state.structured) {
  state.structured = { ...data };
  el.structuredFields.innerHTML = structuredKeys
    .map(([key, label]) => {
      const value = Array.isArray(state.structured[key]) ? state.structured[key].join(", ") : state.structured[key] ?? "";
      return `<label class="structured-field"><span>${escapeHtml(label)}</span><input data-structured-key="${escapeHtml(key)}" value="${escapeHtml(value)}" /></label>`;
    })
    .join("");
}

function readStructuredFields() {
  const values = {};
  document.querySelectorAll("[data-structured-key]").forEach((input) => {
    values[input.dataset.structuredKey] = input.value;
  });
  return values;
}

function readFilledStructuredFields() {
  return Object.fromEntries(
    Object.entries(readStructuredFields()).filter(([, value]) => String(value ?? "").trim() !== "")
  );
}

function applyAiResult(result) {
  const data = result || {};
  if (data.leistung && services.includes(data.leistung)) el.leistung.value = data.leistung;
  if (data.genaueLeistung) el.genaueLeistung.value = data.genaueLeistung;
  if (data.region) {
    if (regions.includes(data.region)) {
      el.region.value = data.region;
    } else {
      el.region.value = "andere Region";
      el.andereRegion.value = data.region;
    }
  }
  if (data.datumVon) el.datumVon.value = normalizeDate(data.datumVon);
  if (data.datumBis) el.datumBis.value = normalizeDate(data.datumBis);
  if (data.erwachsene !== undefined) el.erwachsene.value = data.erwachsene;
  if (data.kinder !== undefined) el.kinder.value = data.kinder;
  if (data.alterKinder) el.alterKinder.value = data.alterKinder;
  if (data.wunsch || data.beschreibung) el.beschreibung.value = data.wunsch || data.beschreibung;
  if (data.aufwandStunden !== undefined) el.aufwandStunden.value = data.aufwandStunden;
  if (data.unsicherheitProzent !== undefined) el.unsicherheitProzent.value = data.unsicherheitProzent;
  if (data.angebotText || data.angebotsvorschlag) el.angebotText.value = data.angebotText || data.angebotsvorschlag;
  if (data.whatsappText) el.whatsappText.value = data.whatsappText;
  if (data.emailText) el.emailText.value = data.emailText;
  if (data.interneNotizen) el.interneNotizen.value = data.interneNotizen;
  if (data.zusatzleistungen) el.zusatzleistungen.value = Array.isArray(data.zusatzleistungen) ? data.zusatzleistungen.join("\n") : data.zusatzleistungen;
  if (data.rueckfragen) el.rueckfragen.value = Array.isArray(data.rueckfragen) ? data.rueckfragen.join("\n") : data.rueckfragen;

  renderStructuredFields({ ...data, ...readFilledStructuredFields() });
  calculate();
}

function normalizeDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

async function callGemini(mode) {
  clearAlert();
  const data = getFormData();
  const customerText = mode === "analysis" ? data.kundentext : [data.leistung, data.genaueLeistung, data.region, data.beschreibung].filter(Boolean).join("\n");
  if (!customerText.trim()) {
    showAlert("Bitte zuerst eine Kundenanfrage oder Beschreibung eingeben.", "error");
    return;
  }

  const button = mode === "analysis" ? el.analyseButton : el.quickAiButton;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "KI arbeitet ...";

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, customerText, formData: data })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "Die KI-Anfrage konnte nicht verarbeitet werden.");
      error.rawResponse = payload.rawResponse;
      error.parseError = payload.parseError;
      throw error;
    }
    if (!payload.data || typeof payload.data !== "object") throw new Error("Gemini hat keine auswertbare Antwort geliefert.");

    applyAiResult(payload.data);
    showAlert("KI-Analyse übernommen. Alle Felder bleiben manuell überschreibbar.");
  } catch (error) {
    const details = [];
    if (error.parseError) details.push(`Parser-Detail: ${error.parseError}`);
    if (error.rawResponse) details.push(`Gemini-Rohantwort:\n${error.rawResponse}`);
    showAlert(
      [error.message || "Netzwerkfehler bei der KI-Anfrage. Die App bleibt manuell nutzbar.", ...details].join("\n\n"),
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function getSavedRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRequests(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function saveCurrentRequest() {
  const calculation = calculate();
  const data = getFormData();
  const record = {
    id: state.activeId || crypto.randomUUID(),
    createdAt: state.activeId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calculation,
    ...data
  };
  const existing = getSavedRequests();
  const previous = existing.find((item) => item.id === record.id);
  record.createdAt = previous?.createdAt || record.createdAt || new Date().toISOString();
  const next = [record, ...existing.filter((item) => item.id !== record.id)];
  saveRequests(next);
  state.activeId = record.id;
  renderSavedRequests();
  showAlert("Anfrage lokal im Browser gespeichert.");
}

function renderSavedRequests() {
  const items = getSavedRequests();
  if (!items.length) {
    el.savedRequests.innerHTML = '<p class="hint">Noch keine gespeicherten Anfragen.</p>';
    return;
  }

  el.savedRequests.innerHTML = items
    .map((item) => {
      const title = item.genaueLeistung || item.structured?.genaueLeistung || item.leistung || "Anfrage";
      const created = new Date(item.createdAt).toLocaleString("de-AT", { dateStyle: "medium", timeStyle: "short" });
      return `<button class="saved-item" type="button" data-load-id="${escapeHtml(item.id)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(item.status || "Anfrage erhalten")} · ${escapeHtml(created)}</span></button>`;
    })
    .join("");
}

function loadRequest(id) {
  const item = getSavedRequests().find((request) => request.id === id);
  if (!item) return;
  state.activeId = id;
  el.statusSelect.value = item.status || statuses[0];
  el.leistung.value = services.includes(item.leistung) ? item.leistung : services[0];
  el.genaueLeistung.value = item.genaueLeistung || "";
  el.region.value = regions.includes(item.region) ? item.region : "andere Region";
  el.andereRegion.value = item.andereRegion || (regions.includes(item.region) ? "" : item.region || "");
  el.datumVon.value = item.datumVon || "";
  el.datumBis.value = item.datumBis || "";
  el.erwachsene.value = item.erwachsene ?? 0;
  el.kinder.value = item.kinder ?? 0;
  el.alterKinder.value = item.alterKinder || "";
  el.beschreibung.value = item.beschreibung || "";
  el.kundentext.value = item.kundentext || "";
  el.aufwandStunden.value = item.aufwandStunden ?? 0;
  el.unsicherheitProzent.value = item.unsicherheitProzent ?? 20;
  el.angebotText.value = item.angebotText || "";
  el.whatsappText.value = item.whatsappText || "";
  el.emailText.value = item.emailText || "";
  el.rueckfragen.value = item.rueckfragen || "";
  el.interneNotizen.value = item.interneNotizen || "";
  el.zusatzleistungen.value = item.zusatzleistungen || "";
  renderStructuredFields(item.structured || {});
  calculate();
  showAlert("Gespeicherte Anfrage geladen.");
}

function newRequest() {
  state.activeId = null;
  state.structured = {};
  document.querySelectorAll("input, textarea").forEach((field) => {
    if (field.type !== "number") field.value = "";
  });
  el.leistung.value = services[0];
  el.region.value = regions[0];
  el.erwachsene.value = 2;
  el.kinder.value = 0;
  el.aufwandStunden.value = 2;
  el.unsicherheitProzent.value = 20;
  el.bruttoAktiv.value = "true";
  el.statusSelect.value = statuses[0];
  renderStructuredFields({});
  calculate();
  clearAlert();
}

async function copyText(id) {
  const value = el[id].value.trim();
  if (!value) {
    showAlert("Dieses Textfeld ist noch leer.", "error");
    return;
  }
  await navigator.clipboard.writeText(value);
  showAlert("Text kopiert.");
}

function bindEvents() {
  el.quickModeButton.addEventListener("click", () => setMode("quick"));
  el.analysisModeButton.addEventListener("click", () => setMode("analysis"));
  el.quickAiButton.addEventListener("click", () => callGemini("quick"));
  el.analyseButton.addEventListener("click", () => callGemini("analysis"));
  el.calculateButton.addEventListener("click", () => {
    buildManualTexts();
    showAlert("Kalkulation aktualisiert.");
  });
  el.saveButton.addEventListener("click", saveCurrentRequest);
  el.newRequestButton.addEventListener("click", newRequest);
  el.savedRequests.addEventListener("click", (event) => {
    const button = event.target.closest("[data-load-id]");
    if (button) loadRequest(button.dataset.loadId);
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copy));
  });
  ["aufwandStunden", "unsicherheitProzent", "bruttoAktiv"].forEach((id) => {
    el[id].addEventListener("input", () => calculate());
  });
}

function init() {
  fillSelect(el.leistung, services);
  fillSelect(el.region, regions);
  fillSelect(el.statusSelect, statuses);
  renderStructuredFields({});
  bindEvents();
  renderSavedRequests();
  newRequest();
}

init();
