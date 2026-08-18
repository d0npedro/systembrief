# Architektur

```
                 n8n  (Dirigent)
                    │
     ┌──────────────┼──────────────┐
     │              │              │
 ingest         produce         release
     │              │              │
     ▼              ▼              ▼
  Queue        Studio-Host     GitHub Action
               PPTX/TTS/MP4    + Cloudflare
                    │
                    ▼
              YouTubeClient
              (private first)
```

| Schicht | Verantwortung |
|---|---|
| n8n | Trigger, Mode-Switch, Notify, kein Rendern |
| `n8n-pipeline.ps1` | Maschinenvertrag, `N8N_RESULT=` |
| Studio-Repo | Content, Build, OAuth, Dist-Packs |
| `YouTubeClient` | einzige Data-API-Fassade |
| Astro + Pages | öffentliche Site |

Geheimnisse nie in Workflow-JSON. Siehe [papers/](../papers/).
