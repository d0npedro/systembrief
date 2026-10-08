# Architektur

```
                 n8n  (Orchestrierung)
                    │
     ┌──────────────┼──────────────┐
     │              │              │
 ingest         produce      release-check
     │              │              │
     ▼              ▼              ▼
  Queue        Studio-Host   Queue + Health
               PPTX/TTS/MP4   kein Publish
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 Website separat          YouTubeClient
 Artikel bleiben live     private → publishAt
```

| Schicht | Verantwortung |
|---|---|
| n8n | Trigger, Mode-Switch, Notify, kein Rendern |
| `n8n-pipeline.ps1` | externer Runner-Aufruf; Quelldatei fehlt in diesem Repository |
| n8n Cloud | Queue-Fälligkeit + Site-Health; kein Website- oder YouTube-Publish |
| Website | eigene Veröffentlichungsentscheidung; öffentliche Artikel bleiben online |
| YouTube | private bis zum eigenen `publishAt` (09:00 Europe/Berlin) |

Geheimnisse nie in Workflow-JSON. Siehe [papers/](../papers/).
