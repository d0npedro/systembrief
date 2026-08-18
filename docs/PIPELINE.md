# Content Pipeline

Systembrief trennt **Produktion** und **Release**.

| Spur | Tempo | Sichtbarkeit |
|---|---|---|
| Produktion | so schnell der Vorrat wächst | YouTube **private**, Blog **Entwurf** |
| Release | **1 Briefing / Tag**, 09:00 Europe/Berlin | Blog live, dann YouTube public |

Kanonische Reihenfolge: **Blog → YouTube → Social → Newsletter**.

## Zustände

```
backlog → producing → produced → scheduled → releasing → released
```

| State | Bedeutung |
|---|---|
| `planned` | Datum reserviert, Video noch nicht fertig |
| `scheduled` | MP4 + private YT + Blog-Entwurf, wartet auf den Tag |
| `released_partial` | Blog live, YouTube folgt |
| `released` | Blog live + YouTube public |

## Done (produziert)

- Analyse, Skript, Folientext, 12 Folien 16:9
- MP4 + Kanalpacks (Blog / YouTube / Social)
- YouTube-Upload **private**
- Blog-Post `draft: true`

Content (Analyse/Skript/Folien) schreibt ein Mensch oder Agent. n8n startet den Build erst, wenn diese Dateien liegen.

## Done (released)

Täglicher Job, Topics mit `release_date ≤ heute`:

1. Blog: Entwurf aufheben, Datum setzen  
2. Site bauen und auf Cloudflare Pages deployen  
3. YouTube → public (oder vorher `publishAt`)  
4. Kalender → `released`

Bei Deploy-Fehler bleibt YouTube privat.

## n8n-Rolle

n8n **orchestriert**. Der Host-Vertrag ist `n8n-pipeline.ps1` im privaten Studio-Repo:

| Action | Wirkung |
|---|---|
| `next` | nächste unfertige Topics |
| `status` | Queue + fällige Releases + Health |
| `ingest` | Queue aus konfigurierten Quellen füllen |
| `produce` | ein Topic bauen und privat veröffentlichen |
| `release` | fällige Releases lokal (Fallback) |
| `health` | GET www.systembrief.de |

YouTube-Quota: Produce markiert `quota_blocked` und macht mit der Site weiter.

Siehe [N8N.md](N8N.md).
