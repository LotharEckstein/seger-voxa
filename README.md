# VOXA AI - Seger Support

Professionelle Voice AI Support Demo für Seger.

## Features

- **Voice Call**: Volle programmatische Kontrolle über ElevenLabs Conversational AI
- **Text Chat**: Transkript der Konversation in Echtzeit
- **Error Code Detection**: Automatische Anzeige von Fehlercode-Informationen aus Supabase
- **Original Design**: 1:1 Nachbau des Demo-Designs mit eckigen Buttons

## Tech Stack

- **Vite** - Build Tool
- **@elevenlabs/client** - ElevenLabs Conversational AI SDK
- **Supabase** - Database für Fehlercodes
- **Vercel** - Deployment

## Deployment auf Vercel (NEUE Methode)

Da dies ein neues Projekt ist mit Vite Build, empfehle ich ein **neues Vercel Projekt**:

### Option A: Neues GitHub Repo (empfohlen)

1. **Entpacke das ZIP** und erstelle ein neues GitHub Repo:
   ```bash
   unzip seger-voxa-app.zip
   cd seger-voxa-app
   git init
   git add .
   git commit -m "Initial commit - VOXA AI with ElevenLabs SDK"
   ```

2. **Erstelle neues Repo auf GitHub** (z.B. `seger-voxa`)

3. **Push**:
   ```bash
   git remote add origin https://github.com/LotharEckstein/seger-voxa.git
   git push -u origin main
   ```

4. **Vercel importieren**:
   - Geh zu vercel.com → New Project
   - Importiere `seger-voxa`
   - Framework: Vite (sollte automatisch erkannt werden)
   - Deploy!

### Option B: Ins bestehende Seger Repo

Falls du das bestehende Repo nutzen willst:

1. **Lösche** oder verschiebe den alten `seger-frontend` Ordner

2. **Kopiere** den `seger-voxa-app` Inhalt:
   ```bash
   cd ~/Desktop/Seger
   rm -rf seger-frontend
   unzip ~/Downloads/seger-voxa-app.zip
   mv seger-voxa-app seger-frontend
   cd seger-frontend
   ```

3. **Vercel Root Directory anpassen**:
   - Vercel Dashboard → seger → Settings → Build & Deployment
   - Root Directory: `seger-frontend`
   - Framework: Vite

## Lokales Testen

```bash
cd seger-voxa-app
npm install
npm run dev
```

Öffne http://localhost:3000

## Konfiguration

Die ElevenLabs Agent ID ist in `src/main.js`:
```javascript
const AGENT_ID = 'agent_6701kbsa6cjtft8rzd1jkg8n4fqc';
```

## Button Flow

1. **CALL VOXA** → Zeigt Auswahl
2. **VOICE CALL** / **TEXT CHAT** → Startet jeweiligen Modus
3. Im Voice Modus:
   - **END CALL** - Beendet Gespräch
   - **SWITCH TO TEXT** - Öffnet Chat-Panel
   - **MUTE MICROPHONE** - Stummschalten
4. Im Chat Modus:
   - **END CHAT** - Beendet Session
   - **SWITCH TO VOICE** - Zurück zum Voice
   - **MUTE VOXA** - VOXA stumm

## Wichtig für die Demo

- Mikrofon-Berechtigung muss erteilt werden
- Funktioniert am besten in Chrome/Edge
- VOXA beginnt automatisch mit Greeting nach Verbindungsaufbau
