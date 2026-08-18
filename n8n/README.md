# n8n

## Der Workflow

[`systembrief-creation-process.json`](systembrief-creation-process.json) ist der **gesamte** Creation Process in einem Graphen.

Import: n8n → **⋯ → Import from File** → inactive lassen → `mode=status` manuell → erst dann aktivieren.

| `mode` | Wirkung |
|---|---|
| `status` | Queue, fällige Releases, Site-Health (Default beim Knopf) |
| `ingest` | Queue füllen (auch Cron alle 2 h) |
| `produce` | Content-Gate → PPTX → TTS → MP4 → YouTube **private** → Blog-Entwurf |
| `full` | wie produce; **kein** Public-Flip |
| `release` | Kalendertag: Blog live → Deploy → YouTube public (auch Cron 09:00 Berlin) |

```http
POST /webhook/systembrief
Content-Type: application/json
x-systembrief-secret: <optional>

{ "mode": "full", "slug": "mein-thema", "privacy": "private" }
```

## Slices

Die älteren Einzel-Workflows liegen unter [`slices/`](slices/) (Release, Produce, Ingest, Status). Der Master ersetzt sie im Alltag.

## Runtime

Produce / Ingest / full brauchen **self-hosted n8n auf Windows** (`Execute Command` → `scripts/n8n-pipeline.ps1`).

`EXECUTIONS_TIMEOUT=7200`

Wenn der 09:00-Cron hier aktiv ist: GitHub-Cron in `release-scheduled.yml` abschalten.

Env: [`.env.example`](../.env.example) · Keys: [papers/credentials-and-api-keys.md](../papers/credentials-and-api-keys.md)
