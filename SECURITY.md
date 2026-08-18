# Security

Dieses Repository enthält **keine** Produktions-Secrets.

| Darf ins Git | Darf nicht ins Git |
|---|---|
| Workflow-JSON ohne Credentials | `client_secret.json`, `token.json` |
| `.env.example` | `.env`, `publish/secrets/*` |
| Papers und Diagramme | API-Keys in Issues oder Screenshots |
| Öffentliche Blog-URLs | Unveröffentlichte Entwürfe, OAuth-Dumps |

Gefundene Secrets: das Secret rotieren, dann eine private Mail an den Maintainer. Kein Key in einem öffentlichen Issue stehen lassen.

YouTube-Uploads sind default **private**. Public nur über den Release-Kalender.

Siehe [papers/credentials-and-api-keys.md](papers/credentials-and-api-keys.md).
