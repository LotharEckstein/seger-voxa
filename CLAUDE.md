# VOXA Frontend — seger-voxa (Vite / Vercel)

---

## Tech Stack

| Layer | Technology | Key Detail |
|-------|-----------|-----------|
| Voice Orchestration | ElevenLabs Conversational AI | Agent ID: `agent_6701kbsa6cjtft8rzd1jkg8n4fqc` |
| LLM | Claude Sonnet 4.5 (via ElevenLabs) | Anthropic provider inside ElevenLabs |
| Voice | Daniel (Eleven Turbo v2.5) | Handles German + English naturally |
| Frontend | Vite + Vanilla JS | @elevenlabs/client, @supabase/supabase-js |
| Frontend Hosting | Vercel | Auto-deploy from GitHub main |

---

## Environment Variables (set in Vercel dashboard + local .env)

```bash
VITE_API_URL=https://seger-voice-agent.onrender.com
VITE_ELEVENLABS_AGENT_ID=agent_6701kbsa6cjtft8rzd1jkg8n4fqc
VITE_SUPABASE_URL=https://lxjnrgohlvuqeqgwwecj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon/public key>
```

Tenant ID for all API calls: `X-Tenant-ID: seger`

---

## ElevenLabs SDK Integration

### ⚠️ CRITICAL: `sendUserMessage()` NOT `sendUserText()`
The ElevenLabs SDK method is `sendUserMessage`. `sendUserText` does NOT exist — this caused hours of debugging. Never use `sendUserText`.

### Conversation.startSession
The frontend uses `Conversation.startSession()` from `@elevenlabs/client` to initiate a WebSocket connection with the ElevenLabs agent.

### textOnly mode
The SDK supports a text-only mode for testing without microphone access. Useful for development and debugging.

---

## ElevenLabs Agent Configuration

| Setting | Value |
|---------|-------|
| Agent ID | `agent_6701kbsa6cjtft8rzd1jkg8n4fqc` |
| LLM Provider | Anthropic (Claude Sonnet 4.5) |
| Voice | Daniel (Eleven Turbo v2.5) |
| Default Language | German (+ EN, FR, IT) |
| Interruptible | Yes |
| Tool timeout | 10s (15s for calendar) |
| Execution mode | Immediate |

### Agent Behavior Rules (System Prompt)
- Identifies as "Seger AI Support"
- Max 2 sentences per response, then waits
- German formal address ("Sie")
- Always confirms error code before searching
- Never reads URLs aloud — says "image available" instead
- Collects name + phone BEFORE creating support ticket
- Natural speech: "Verstanden", "Einen Moment", "Genau"
- Spells numbers aloud: "eins null null fünf" not "1005"
- Trade fair version prompt: `PROMPT_SEGER_MESSE_VERSION.pdf` (needs integration with new wiki architecture)

---

## Error Overlay & Media Gallery

The `wiki_search` tool returns image URLs but the frontend does NOT automatically display them. VOXA is prompted to say "image available" instead of reading URLs aloud. This is a known open issue — auto-displaying images based on error code detection is a planned feature.

---

## Repository Structure

```
~/Desktop/Seger/seger-voxa/    ← standalone git repo (github.com/LotharEckstein/seger-voxa)
├── src/
│   ├── main.js
│   └── style.css
├── public/
│   └── SegerVoxaHero.jpg
├── index.html
├── package.json
└── vercel.json
```

---

## Deployment

```bash
cd ~/Desktop/Seger/seger-voxa/
git add .
git commit -m "Description of changes"
git push
# Vercel auto-deploys from main branch
```

---

## Gotchas & Hard-Won Lessons

1. **`sendUserMessage()` NOT `sendUserText()`.** The ElevenLabs SDK method is `sendUserMessage`. `sendUserText` does not exist. This caused hours of debugging.
2. **Frontend images not auto-displayed.** The `wiki_search` tool returns image URLs but the frontend does NOT automatically display them. This is a known open issue.
3. **X-Tenant-ID must be 'Value' type** in ElevenLabs tool config, NOT 'Secret'. Secret type causes auth failures.
4. **Both active repos are under ~/Desktop/Seger/.** Frontend: `~/Desktop/Seger/seger-voxa/`. This is a standalone git repo gitignored from the root. `_archive/` holds dead code — ignore it.

---

## Open Tasks (Frontend)

### Pre-Trade Fair Stuttgart (March 22–24)
- [ ] Live dashboard: real-time sensor visualization (large screen, 3m display)
- [ ] Interactive demo simulator for booth visitors
- [ ] Industrial warning lights (red/yellow/green)
- [ ] German voice announcements via ElevenLabs over speakers

### Post-Trade Fair
- [ ] Frontend image auto-display based on error code detection
- [ ] Admin Panel UI for content management (error codes, media, call logs)
- [ ] Analytics dashboard

---

*Last updated: March 11, 2026 — split from root CLAUDE.md*
