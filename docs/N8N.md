# n8n einrichten

Workflows liegen unter [`n8n/`](../n8n/). n8n speichert Workflows als JSON — **Import from File**.

## Was wo läuft

| Workflow | n8n Cloud | Self-hosted Windows |
|---|---|---|
| Daily Release | ja (nur HTTP) | ja |
| Produce Topic | nein (Execute Command) | ja |
| Topic Ingest | nein | ja |
| Pipeline Status | nein | ja |

Self-hosted braucht `EXECUTIONS_TIMEOUT=7200` (Produce kann mehrere Minuten dauern).

## Schritte

1. n8n auf dem Studio-Rechner (Docker oder Desktop).
2. Umgebung setzen — Vorlage: [`.env.example`](../.env.example).
3. `SYSTEMBRIEF_PIPELINE_ROOT` zeigt auf das **private** Pipeline-Repo (dort liegt `scripts/n8n-pipeline.ps1`).
4. In n8n jede Datei unter `n8n/*.json` importieren.
5. Workflows bleiben **inactive**. Einmal **Manuell** ausführen:
   - zuerst **Pipeline Status**
   - dann **Topic Ingest** (oder lokal ` -Action ingest` mit `-DryRun` im Host-Skript)
   - **Produce** nur, wenn Content für ein Topic liegt
6. Aktivieren.
7. Wenn **Daily Release** aktiv ist: den Cron in `release-scheduled.yml` des privaten Repos abschalten, sonst läuft das Release doppelt.

## Daily Release

09:00 Europe/Berlin:

1. `workflow_dispatch` auf `release-scheduled.yml`
2. 90 Sekunden warten
3. letzten Actions-Run lesen
4. `GET https://www.systembrief.de/`
5. optional Notify-Webhook

PAT braucht `repo` und `workflow` / `actions:write`.

## Produce

```http
POST /webhook/systembrief-produce
Content-Type: application/json
x-systembrief-secret: <optional>

{
  "slug": "mein-thema",
  "skip_build": false,
  "skip_publish": false,
  "privacy": "private"
}
```

Leerer `slug` → nächstes Queue-Item. Fehlt Analyse/Skript/Folien → `reason: content_missing`, kein Blind-Build.

Default-Privacy ist **private**.

## Status

```http
GET /webhook/systembrief-status
```

## Secrets

Nichts davon gehört ins Git:

- GitHub PAT
- YouTube OAuth
- OpenAI / TTS-Keys
- Cloudflare-Token
- Webhook-Secrets

Die JSON-Workflows enthalten **keine** Credentials — nach dem Import nur Env oder n8n-Credentials setzen.
