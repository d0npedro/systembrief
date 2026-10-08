# Creation Process

Der gesamte Weg von der Idee zum öffentlichen Briefing. n8n bildet genau diese Kette ab: [`n8n/systembrief-creation-process.json`](../n8n/systembrief-creation-process.json).

## Prinzip

| Spur | Tempo | Sichtbarkeit |
|---|---|---|
| Produktion | so schnell der Vorrat wächst | YouTube zunächst **private**, neuer Blog-Text als Entwurf |
| Website | nach bewusster Veröffentlichungsentscheidung | veröffentlichte Artikel bleiben online; unabhängig vom YouTube-Termin |
| YouTube | gemäß `release_date`, 09:00 Europe/Berlin | Video bleibt bis zum Termin **private**, danach separat public |

Ein erzeugtes `draft: true` kennzeichnet den neuen Text als Entwurf. Es ist keine websiteweite Veröffentlichungssperre und darf nicht dazu führen, dass ein bereits bewusst öffentlicher Artikel verborgen wird. Der 09:00-Dispatch verarbeitet nur Queue-Einträge mit einem expliziten, fälligen `release_date`; Website-Sichtbarkeit und YouTube-Termin bleiben getrennte Zustände.

Website- und YouTube-Veröffentlichung sind unabhängig. Social und Newsletter folgen den jeweils tatsächlich veröffentlichten Inhalten.

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
9  Blog-Entwurf für neu produzierten Inhalt
10 Release-Dispatch 09:00 Berlin für explizit fällige Queue-Einträge
11 Website-Veröffentlichung separat; YouTube nach eigenem `publishAt`
12 Healthcheck
```

Schritt 2 ist kein Blind-Build. Fehlt eine der Pflicht dateien, stoppt n8n mit `content_missing`.

## Zustände

```
backlog → producing → produced → scheduled → release_checked → (separate Website-/YouTube-Status)
```

**Produziert:** MP4 + private `video_id` + Blog `draft: true`.  
**Release geprüft:** Der Cloud-Workflow aktualisiert den Queue-Status, veröffentlicht aber weder Blog noch YouTube. Die Website-Veröffentlichung erfolgt separat. Ein vorhandener öffentlicher Artikel bleibt öffentlich; YouTube folgt seinem eigenen `publishAt`.

## Wer was ausführt

| Schritt | Runtime |
|---|---|
| 1, 3–9 | self-hosted n8n → `scripts/n8n-pipeline.ps1` auf dem Studio |
| 2 | Mensch oder Schreib-Agent |
| 10–12 | n8n Cloud prüft Queue und Website-Health; der selbstgehostete `-Action release`-Runner ist extern und in diesem Repository nicht enthalten |

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
`full` = Gate → Build → private YouTube-Vorbereitung. Kein Website-Publish und kein Public-Flip im Cloud-Workflow.

Leerer `slug` nimmt das nächste Queue-Item.

## Weiter

- [YouTube-Paper](../papers/youtube-data-api.md)
- [API-Keys](../papers/credentials-and-api-keys.md)
- [n8n](../n8n/README.md)
