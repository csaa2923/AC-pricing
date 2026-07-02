const HOURLY_RATE = 150;

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
].filter(Boolean);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function extractJson(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Ungültiges JSON in der Gemini-Antwort.");
    return JSON.parse(match[0]);
  }
}

function buildPrompt(mode, customerText, formData) {
  const baseSchema = {
    leistung: "",
    genaueLeistung: "",
    region: "",
    ort: "",
    datumVon: "",
    datumBis: "",
    uhrzeit: "",
    erwachsene: 0,
    kinder: 0,
    alterKinder: "",
    budget: "",
    sprache: "",
    besondereWuensche: "",
    einschraenkungen: "",
    allergien: "",
    mobilitaetswuensche: "",
    hotel: "",
    transferbedarf: "",
    dringlichkeit: "",
    vipLevel: "",
    fehlendeInformationen: [],
    unsicherheiten: [],
    schwierigkeitsgrad: "",
    wunsch: "",
    aufwandStunden: 0,
    unsicherheitProzent: 20,
    preisVon: 0,
    preisBis: 0,
    rueckfragen: [],
    whatsappText: "",
    emailText: "",
    angebotText: "",
    angebotsvorschlag: "",
    interneNotizen: "",
    zusatzleistungen: [],
    naechsterSchritt: ""
  };

  return [
    "Du bist ein erfahrener interner Angebots- und Concierge-Assistent für Alpine Concierge Tirol.",
    "Antworte ausschließlich mit gültigem JSON. Keine Markdown-Zäune, keine Kommentare, kein Begleittext.",
    "Nutze Deutsch für Texte an den Kunden. Datumswerte wenn möglich als YYYY-MM-DD.",
    `Modus: ${mode === "quick" ? "Schnellabfrage mit optionaler Aufwandsschätzung" : "Genaue Analyse einer vollständigen Kundenanfrage"}.`,
    `Stundensatz: ${HOURLY_RATE} EUR netto. Berechne Preisband mit Aufwand und Unsicherheitsfaktor, wenn möglich.`,
    "Alle Werte sind interne Vorschläge und sollen konservativ, hochwertig und concierge-tauglich formuliert sein.",
    "Erzeuge Rückfragen, WhatsApp-Text, E-Mail-Text, Angebotsvorschlag, interne Notizen und Zusatzleistungen.",
    `JSON-Schema mit allen gewünschten Feldern: ${JSON.stringify(baseSchema)}`,
    `Aktuelle Formularwerte: ${JSON.stringify(formData || {})}`,
    `Kunden-/Anfragetext: ${customerText}`
  ].join("\n\n");
}

async function callModel(model, apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini-Fehler mit Modell ${model}.`;
    const code = payload?.error?.status || payload?.error?.code || response.status;
    const error = new Error(message);
    error.code = code;
    error.status = response.status;
    throw error;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Keine Antwort von Gemini erhalten.");
  return extractJson(text);
}

function friendlyError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  if (code.includes("API_KEY") || message.toLowerCase().includes("api key")) return "Ungültiger Gemini API-Key. Bitte GEMINI_API_KEY in Vercel prüfen.";
  if (code.includes("RESOURCE_EXHAUSTED") || error?.status === 429) return "Das Gemini API-Limit wurde erreicht. Bitte später erneut versuchen.";
  if (message.includes("Ungültiges JSON")) return "Gemini hat ungültiges JSON geliefert. Bitte erneut versuchen oder manuell weiterarbeiten.";
  if (message.includes("Keine Antwort")) return "Gemini hat keine Antwort geliefert. Bitte erneut versuchen.";
  return message || "Netzwerkfehler bei der Gemini-Anfrage.";
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Nur POST-Anfragen sind erlaubt." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "GEMINI_API_KEY fehlt serverseitig. Bitte Environment Variable in Vercel setzen." });
    return;
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch {
    sendJson(res, 400, { error: "Ungültiger JSON-Request." });
    return;
  }

  const { mode = "analysis", customerText = "", formData = {} } = body || {};
  if (!String(customerText).trim()) {
    sendJson(res, 400, { error: "Leere Kundeneingabe. Bitte zuerst einen Text oder eine Beschreibung eingeben." });
    return;
  }

  const prompt = buildPrompt(mode, customerText, formData);
  const tried = [];

  for (const model of MODEL_CANDIDATES) {
    try {
      const data = await callModel(model, apiKey, prompt);
      sendJson(res, 200, { data, model });
      return;
    } catch (error) {
      tried.push(model);
      const isModelProblem = error?.status === 404 || String(error?.message || "").toLowerCase().includes("not found");
      if (!isModelProblem) {
        sendJson(res, error?.status === 429 ? 429 : 502, { error: friendlyError(error), triedModels: tried });
        return;
      }
    }
  }

  sendJson(res, 502, {
    error: "Keines der konfigurierten Gemini-Flash-Modelle ist verfügbar. Bitte GEMINI_MODEL auf ein verfügbares Flash-Modell setzen.",
    triedModels: tried
  });
};
