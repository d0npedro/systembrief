# n8n Workflows

Import in n8n: **⋯ → Import from File**.

| Datei | Trigger | Runtime |
|---|---|---|
| [`systembrief-daily-release.json`](systembrief-daily-release.json) | 09:00 Europe/Berlin + manuell | Cloud oder self-hosted |
| [`systembrief-produce-topic.json`](systembrief-produce-topic.json) | Webhook `/webhook/systembrief-produce` + manuell | self-hosted |
| [`systembrief-topic-ingest.json`](systembrief-topic-ingest.json) | alle 2 Stunden + manuell | self-hosted |
| [`systembrief-pipeline-status.json`](systembrief-pipeline-status.json) | 08:30 + `GET /webhook/systembrief-status` | self-hosted |

Anleitung: [docs/N8N.md](../docs/N8N.md)

Workflows starten **inactive**. Keine Secrets in den Dateien.
