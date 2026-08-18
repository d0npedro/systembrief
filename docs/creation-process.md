# Creation Process

Der gesamte Weg von der Idee zum öffentlichen Briefing. n8n bildet genau diese Kette ab: [`n8n/systembrief-creation-process.json`](../n8n/systembrief-creation-process.json).

## Prinzip

| Spur | Tempo | Sichtbarkeit |
|---|---|---|
| Produktion | so schnell der Vorrat wächst | YouTube **private**, Blog **draft** |
| Release | 1 Briefing / Tag, 09:00 Europe/Berlin | Blog live, dann YouTube public |

Produktion darf den Kalender überholen. Sichtbar wird nur der Kalendertag.

Kanonische Reihenfolge: **Blog → YouTube → Social → Newsletter**.

YouTube-Quota blockiert die Website nicht.

## Die zwölf Schritte

```
1  Quelle → Queue
2  ANALYSE.md + SKRIPT.md + Folientexte     ← Mensch / Agent
3  Content-Gate
4  PPTX (12 × 16:9, Navy/Cyan)
5  TTS (eine Datei pro Folie)
6  Slide-PNG + ffmpeg-MP4 (+ optionale Avatar-Schiene)
7  dist/<slug>/{blog,youtube,social}
8  YouTube private (insert, Thumb, SRT, Playlists, publishAt)
9  Blog-Entwurf
10 Kalender 09:00 Berlin
11 Blog live → Deploy → YouTube public
12 Healthcheck
```

Schritt 2 ist kein Blind-Build. Fehlt eine der Pflicht dateien, stoppt n8n mit `content_missing`.

## Zustände

```
backlog → producing → produced → scheduled → releasing → released
```

**Produziert:** MP4 + private `video_id` + Blog `draft: true`.  
**Released:** Blog öffentlich + YouTube public am selben Kalendertag.

## Wer was ausführt

| Schritt | Runtime |
|---|---|
| 1, 3–9 | self-hosted n8n → `scripts/n8n-pipeline.ps1` auf dem Studio |
| 2 | Mensch oder Schreib-Agent |
| 10–12 | n8n Daily Release → GitHub Action `release-scheduled.yml` *oder* lokales `-Action release` |

n8n Cloud kann nur 10–12 (HTTP). Video-Build braucht Windows, PowerPoint, ffmpeg, lokale Secrets.

## Webhook

```http
POST /webhook/systembrief
Content-Type: application/json
x-systembrief-secret: <optional>

{
  "mode": "full",
  "slug": "prozessklarheit-als-grundrecht",
  "privacy": "private"
}
```

`mode`: `ingest` | `produce` | `release` | `status` | `full`.  
`full` = Gate → Build → private Publish → Schedule. Kein Public-Flip.

Leerer `slug` nimmt das nächste Queue-Item.

## Weiter

- [YouTube-Paper](../papers/youtube-data-api.md)
- [API-Keys](../papers/credentials-and-api-keys.md)
- [n8n](../n8n/README.md)
