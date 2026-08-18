# API-Keys und OAuth hinzufügen

**Ziel:** Ein neuer Rechner oder eine neue Marke kommt in unter einer Stunde zu einer *trockenen* Pipeline. Live-YouTube erst nach Dry-Run.

Drei Klassen von Geheimnissen:

| Klasse | Beispiele | Form |
|---|---|---|
| OAuth Desktop | YouTube | `client_secret.json` + `token.json` |
| Bearer-Key | OpenAI, ElevenLabs, n8n-PAT | eine Zeile |
| Plattform-Secret | Cloudflare, GitHub Actions | Secret Store |

Nichts davon wird committet. Vorlagen: [`.env.example`](../.env.example).

---

## 1. YouTube — kein API-Key

Die Data API braucht für Uploads **OAuth**, nicht den gelben „API key“ in der Cloud Console (der reicht nur für öffentliche Reads).

### 1.1 Cloud-Projekt

1. [Google Cloud Console](https://console.cloud.google.com) mit dem Konto, das den **Brand-Kanal** besitzt.
2. Projekt anlegen, z. B. `systembrief-publish`.
3. **APIs & Services → Library → YouTube Data API v3 → Enable**.

### 1.2 Consent Screen

1. **OAuth consent screen**
2. User Type: External (oder Internal in Workspace).
3. App-Name: `Systembrief Upload`.
4. Test users: die eigene Google-Adresse (pflicht im Testing-Modus).
5. Scopes später: `youtube.upload`, `youtube`, `youtube.force-ssl`.

### 1.3 Desktop-Client

1. **Credentials → Create credentials → OAuth client ID**
2. Application type: **Desktop app**
3. JSON herunterladen → im *privaten* Studio-Repo:

```text
publish/secrets/client_secret.json
```

Gitignored.

### 1.4 Erster Consent

```powershell
python -m publish.youtube.upload --topic <slug>          # dry-run, kein Netz
python -m publish.youtube.upload --topic <slug> --live   # öffnet Browser
```

Im Browser:

1. Konto mit Zugriff auf den Brand-Kanal wählen.
2. Im Testing-Modus oft: Advanced → zur App (unsafe) → zulassen.
3. Falls gefragt: **Kanal Systembrief** wählen, nicht den privaten Upload-Kanal.
4. Es entsteht `publish/secrets/token.json`.

### 1.5 CI

GitHub Secrets (gesamter Dateiinhalt):

| Secret | Quelle |
|---|---|
| `YT_CLIENT_SECRET_JSON` | `client_secret.json` |
| `YT_TOKEN_JSON` | `token.json` |

Workflow **Publish YouTube** bleibt `live=false`, bis jemand den Haken setzt.

### 1.6 Rotation

Testing-Apps: Refresh-Token stirbt ~7 Tage. Symptom `invalid_grant`.  
**Nicht** das bereits hochgeladene Video löschen. Consent wiederholen, Token überschreiben.

Captions-Fehler `insufficientPermissions`: Token löschen, Scopes inkl. `force-ssl`, neu einloggen.

---

## 2. Sprachsynthese

### OpenAI

1. Key: https://platform.openai.com/api-keys  
2. Eine Zeile, keine Anführungszeichen:

```text
publish/secrets/openai_api_key
```

oder `OPENAI_API_KEY` in der Umgebung / `.env`.

### ElevenLabs

1. Key: https://elevenlabs.io/app/settings/api-keys  
2. Datei `publish/secrets/elevenlabs_api_key` oder `ELEVENLABS_API_KEY`.
3. Optional: `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL`.

---

## 3. n8n

Umgebung des **self-hosted** n8n-Prozesses, nicht in die Workflow-JSON.

| Variable | Pflicht | Zweck |
|---|---|---|
| `SYSTEMBRIEF_PIPELINE_ROOT` | Produce/Ingest | Pfad zum privaten Studio-Repo |
| `SYSTEMBRIEF_GITHUB_OWNER` | Daily Release | GitHub-User |
| `SYSTEMBRIEF_GITHUB_REPO` | Daily Release | privates Pipeline-Repo |
| `SYSTEMBRIEF_GITHUB_TOKEN` | Daily Release | PAT: `repo` + Actions write |
| `SYSTEMBRIEF_NOTIFY_WEBHOOK` | nein | Slack/Discord Incoming |
| `SYSTEMBRIEF_WEBHOOK_SECRET` | empfohlen | Header `x-systembrief-secret` |

PAT anlegen: GitHub → Settings → Developer settings → Fine-grained (nur das Pipeline-Repo) oder classic mit `repo` und `workflow`.

---

## 4. Cloudflare Pages

Nur in GitHub Actions, nicht lokal nötig für Dry-Runs.

| Secret | Zweck |
|---|---|
| `CLOUDFLARE_API_TOKEN` | `pages deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | Account |

Token-Rechte: Account.Cloudflare Pages — Edit.

---

## 5. Check nach dem Hinzufügen

| Beweis | Befehl / Aktion |
|---|---|
| YouTube OAuth gültig | `python -m publish.youtube.client --smoke` (read-only) |
| Upload-Vertrag ok | `python -m publish.youtube.upload --topic <slug>` ohne `--live` |
| Stimme | ein Topic mit `-SkipRender`, Audio-Dateien > 0 |
| Site | `n8n-pipeline.ps1 -Action health` |
| n8n | Workflow **Creation Process** manuell, `mode=status` |

Kein `--live`, kein `privacy=public`, kein Deploy in diesem Check.

---

## 6. Verbote

- Secrets in `n8n/*.json`, Issues, Screenshots, Commit-Messages
- API-Key statt OAuth für YouTube-Uploads
- `token.json` ins öffentliche Repo
- Video löschen, nur weil der Refresh-Token tot ist
- Zweites Cloud-Projekt „schnell neu“, während das alte Token noch der Kanalidentität entspricht — erst `assert_channel`

Weiter: [youtube-data-api.md](youtube-data-api.md).
