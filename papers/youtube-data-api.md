# YouTube Data API v3 — Systembrief Interface Paper

**Status:** verbindlich  
**Kanal:** Systembrief (`@systembrief_de`) · `UCoQCmCjdGUC9wT57DXJUKcg`  
**Fassade:** `YouTubeClient` (ein Objekt, injizierbarer Service)  
**Default:** Dry-run. Live-Uploads sind **private**.

Dieses Paper beschreibt die *programmatische* Kanalschnittstelle. Manuelles Studio-Hochladen braucht sie nicht.

---

## 1. Zweck

Die Pipeline muss ein fertiges Briefing **ohne Studio-Klick** auf den Kanal legen — und es dort **privat** halten, bis der Release-Kalender den Tag freigibt.

| Anforderung | Umsetzung |
|---|---|
| Ein Objekt spricht mit der API | `YouTubeClient` |
| Tests ohne Netz | `service=` injizieren |
| Kein unbeabsichtigter Public-Upload | `privacy_status=private`, `--live` explizit |
| Quota darf die Website nicht stoppen | Upload-Fehler → Blog/Kalender weiter |
| Refresh-Token stirbt (Testing-App) | Fallback auf Browser-Consent, Video nicht löschen |

---

## 2. Authentifizierung

YouTube Data API v3 akzeptiert für Uploads **kein** einfaches API-Key-Feld. Es ist **OAuth 2.0 Desktop**.

```
Google-Konto (Kanalbesitz)
        │
        ▼
Cloud-Projekt  →  YouTube Data API v3 enable
        │
        ▼
OAuth Consent Screen  (Testing + Testuser  oder  Production)
        │
        ▼
OAuth Client ID  Typ: Desktop
        │
        ▼
client_secret.json     # App-Identität
        │  erster --live öffnet Browser
        ▼
token.json             # refresh_token + access_token
        │
        ▼
YouTubeAuth.credentials()  →  discovery build("youtube", "v3")
```

### Scopes

| Scope | Wofür |
|---|---|
| `https://www.googleapis.com/auth/youtube.upload` | `videos.insert` |
| `https://www.googleapis.com/auth/youtube` | Privacy, Playlists, Thumbnails, Channel |
| `https://www.googleapis.com/auth/youtube.force-ssl` | `captions.insert` / `captions.list` |

Fehlt `force-ssl` im Token, liefert Captions `insufficientPermissions`. Dann `token.json` löschen und neu einloggen — **nicht** das Video löschen.

### Token-Leben

- Access-Token: kurz, wird mit Refresh-Token erneuert.
- App im Status **Testing:** Refresh-Token oft nach **~7 Tagen** `invalid_grant`.
- Dann: Browser-Consent erneut. Upload-Skript fällt darauf zurück.
- Dauerbetrieb: App in Production (ggf. Verifizierung) oder periodisch re-auth.

Schritt-für-Schritt: [credentials-and-api-keys.md](credentials-and-api-keys.md).

---

## 3. Fassade

`YouTubeClient` ist die einzige Stelle, die `googleapiclient` spricht. Skripte orchestrieren nur.

```text
YouTubeClient.from_secrets()          # Produktion
YouTubeClient(service=fake)           # Unit-Test

get_my_channel() / assert_channel(id)
get_video / get_video_status
upload_video                          # resumable videos.insert
set_privacy / schedule_publish / set_embeddable
set_thumbnail                         # 50 units
list_captions / upload_caption        # 400 units
create_playlist / add_to_playlist
delete_video                          # irreversibel, nie in der Default-Spur
```

`assert_channel("UCoQCmCjdGUC9wT57DXJUKcg")` verhindert Uploads auf den privaten Zufalls-Kanal des Google-Kontos.

---

## 4. Maschinenvertrag

Vor jedem Upload existiert `dist/<slug>/youtube/upload.json`.

Pflichtfelder:

| Feld | Regel |
|---|---|
| `topic` | kebab-case Slug |
| `video_path` | MP4, ≥ 50 KB |
| `title` | ≤ 100 Zeichen |
| `description` | ≤ 5000 Zeichen, Kapitel erlaubt |
| `tags` | 1–30 |
| `category_id` | Default `27` (Bildung) |
| `privacy_status` | `private` \| `unlisted` \| `public` — Default **private** |

Dry-run schreibt `upload-plan.json` und ruft **kein** Netz auf.  
Live schreibt `STATE.json` mit `video_id`, URL, `uploaded_at`.  
Existiert `video_id` bereits, kein zweiter Upload (außer `--force`).

---

## 5. Operationen und Quota

Projekt-Default: **10 000 Units / Tag**. Zusätzlich gibt es ein separates **Upload-Tageslimit** (`uploadLimitExceeded`) unabhängig von Units.

| Methode | Units | Wann |
|---|---:|---|
| `videos.insert` | 100 | Erstupload |
| `videos.update` | 50 | Privacy, `publishAt`, embeddable |
| `videos.list` | 1 | Status lesen |
| `videos.delete` | 50 | Nur Replace-Pfad, nie Default |
| `thumbnails.set` | 50 | Custom 1280×720 |
| `captions.insert` | 400 | `captions.de.srt` |
| `captions.list` | 50 | Deduplizieren |
| `playlistItems.insert` | 50 | Serie + Alle Briefings |
| `playlists.list` / `channels.list` | 1 | Identität, IDs |

Nach vielen Thumbnail-Sets hintereinander: `uploadRateLimitExceeded` — sauber abbrechen, später fortsetzen.

---

## 6. Sequenzen

### 6.1 Produziert (Vorrat)

```
prepare → dry-run → videos.insert (private)
       → thumbnails.set
       → captions.insert (de)
       → playlistItems.insert (System|Zahl + Alle Briefings)
       → videos.update (private + publishAt am release_date 09:00 Berlin)
```

Ergebnis: Video existiert, ist unsichtbar, Kalender kennt `video_id`.

### 6.2 Released (Kalendertag)

```
Blog draft → false, date = release_date
Site sync + Cloudflare Pages deploy
wenn Deploy ok:
    videos.update privacyStatus=public
    (publishAt auf öffentlichem Video ist ungültig → Feld weglassen)
Kalender → released
```

Atomar: **Deploy-Fail ⇒ YouTube bleibt privat.**

### 6.3 Quota-Umgehung

```
MP4 + dist packs + Blog draft + Kalender scheduled
        │
        └── YouTube später: backfill video_id → Links in Posts
```

Die Website wartet nicht auf Units.

---

## 7. Fehler, die man nicht noch einmal suchen soll

| Symptom | Ursache | Handlung |
|---|---|---|
| `invalid_grant` | Testing-Refresh tot | Browser-Consent, Token neu schreiben |
| `insufficientPermissions` | Scope fehlt (oft Captions) | Token löschen, Scopes inkl. `force-ssl` |
| `quotaExceeded` | 10k Units | Tag warten, Reads vor Writes |
| `uploadLimitExceeded` | Tages-Upload-Cap | Site trotzdem releasen |
| `invalidPublishAt` | `publishAt` auf public oder Vergangenheit falsch | Public lassen oder erst private setzen |
| `uploadRateLimitExceeded` | zu viele Thumbnail-Sets | Stop, Resume-Skript |
| Falscher Kanal | OAuth auf privatem Konto | `assert_channel` |

---

## 8. Playlists

| Playlist | Rolle |
|---|---|
| System | Serie ESSAY |
| Zahl | Serie DATEN |
| Alle Briefings | Umbrella |

IDs gehören in den Kanalvertrag, nicht in Hardcode einzelner Topics.

---

## 9. Was diese Schnittstelle nicht ist

- Kein Data-API-Weg für Banner/Icon (Studio / Channel-Setup-Skill).
- Keine Anlageberatung, keine Kauf-/Verkaufssprache in Titeln.
- Kein unüberwachter Public-Upload.
- Kein paralleles Envelope-Replace (ein Supervisor).

---

## 10. Referenzen

- Google: [YouTube Data API v3](https://developers.google.com/youtube/v3)
- Quota: [calculate quota usage](https://developers.google.com/youtube/v3/determine_quota_cost)
- Dieses Repo: [API-Keys](credentials-and-api-keys.md) · [Creation Process](../docs/creation-process.md) · [n8n](../n8n/README.md)
