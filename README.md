# Systembrief

Strukturierte deutsche Briefings zu Wirtschaft, Tech und den Regeln, die Wertschöpfung ermöglichen — oder ersticken.

**Essays & Zahlen. Klar in Minuten.**

| | |
|---|---|
| Blog | [www.systembrief.de](https://www.systembrief.de) |
| YouTube | [@systembrief_de](https://www.youtube.com/@systembrief_de) |
| Serien | **System** (Essays) · **Zahl** (Daten) |
| Schedule | [systembrief.de/schedule](https://www.systembrief.de/schedule/) |

Dieses Repo ist die **öffentliche Operations-Schicht**: n8n-Workflows und der Vertrag der Content-Pipeline. Renderer, OAuth und unveröffentlichte Entwürfe bleiben im privaten Studio-Repo.

## Pipeline

```
Thema in der Queue
        │
        ▼
  Content (ANALYSE, Skript, Folien)
        │
        ▼
  Video (PPTX → Stimme → MP4)
        │
        ▼
  Produziert = MP4 + YouTube private + Blog-Entwurf
        │
        ▼
  Release-Tag 09:00 Europe/Berlin
        │
        ▼
  Blog live → YouTube public → Social
```

Produktion darf den Kalender überholen. Sichtbar wird nur, was der Kalender am Tag freigibt.

YouTube-Quota blockiert die Website nicht: Blog und Kalender gehen auch ohne `video_id`.

## n8n

Import unter [`n8n/`](n8n/README.md). Vier Workflows:

1. **Daily Release** — 09:00 Berlin, GitHub Action dispatchen + Healthcheck  
2. **Produce Topic** — ein Briefing bauen/veröffentlichen (self-hosted)  
3. **Topic Ingest** — Queue füllen, alle 2 Stunden  
4. **Pipeline Status** — Queue, fällige Releases, Site-Health  

Setup: [`docs/N8N.md`](docs/N8N.md) · Vertrag: [`docs/PIPELINE.md`](docs/PIPELINE.md)

## Mitmachen

Issues und PRs zu den Workflows und zur Doku sind willkommen. Keine Secrets, keine unveröffentlichten Texte, keine OAuth-Dateien.

## Lizenz

[MIT](LICENSE)
