# Alpine Concierge Tirol Anfrage Cockpit

Interne Web-App für schnelle Preisindikationen, genaue KI-Analyse von Kundenanfragen, Angebotsvorschläge, Statusverwaltung und lokale Speicherung im Browser.

## Funktionen

- Schnellabfrage mit Richtkalkulation auf Basis von 150 EUR netto pro Stunde
- Genaue Kundenanalyse über Google Gemini / Google AI
- Serverlose API-Route `/api/gemini.js`, damit der API-Key nie im Frontend steht
- Manuell überschreibbare KI-Ergebnisse
- WhatsApp-, E-Mail- und Angebotsvorschläge zum Kopieren
- Statusworkflow vom Anfrageeingang bis Abschluss
- LocalStorage-Archiv für gespeicherte Anfragen

## Lokale Nutzung

Die Oberfläche ist statisch und kann direkt geöffnet werden. Für die Gemini-API wird eine Vercel-kompatible lokale Umgebung empfohlen:

```bash
npm install -g vercel
vercel dev
```

Danach die lokale URL aus dem Terminal öffnen.

## Environment Variable

In Vercel muss gesetzt werden:

```text
GEMINI_API_KEY=...
```

Optional kann ein konkretes Flash-Modell gesetzt werden:

```text
GEMINI_MODEL=gemini-2.5-flash
```

Der API-Key darf niemals in `index.html`, `style.css` oder `script.js` eingetragen werden. Er wird ausschließlich in `/api/gemini.js` über `process.env.GEMINI_API_KEY` gelesen.

## Deployment auf Vercel

1. Projekt in ein GitHub-Repository legen.
2. Repository in Vercel importieren.
3. Environment Variable `GEMINI_API_KEY` setzen.
4. Deploy ausführen.
5. App öffnen und eine Testanfrage analysieren.

Ein Build-Schritt ist nicht notwendig.

## Testcheckliste

- App startet lokal
- Schnellabfrage funktioniert
- Genaue KI-Analyse funktioniert mit gesetztem `GEMINI_API_KEY`
- Kundentext wird automatisch eingelesen
- Manuelle Korrektur funktioniert
- Kalkulation mit 150 EUR netto funktioniert
- Preisband wird korrekt berechnet
- WhatsApp-Text wird erzeugt
- E-Mail-Text wird erzeugt
- Status kann geändert werden
- LocalStorage speichert und lädt Anfragen
- Vercel Deployment funktioniert
- `GEMINI_API_KEY` ist serverseitig gesetzt
- API-Key ist im Browser nicht sichtbar
