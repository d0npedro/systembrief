# Contributing

PRs zu Workflows, Papers und Diagrammen sind willkommen.

1. Keine Secrets, keine unveröffentlichten Texte, keine OAuth-Dateien.
2. n8n-JSON muss parsen: `name`, `nodes`, `connections`, `settings`. Knotennamen eindeutig.
3. Papers bleiben konkret (Units, Scopes, Fehlernamen) — keine Motivationsprosa.
4. Screenshots nur aus `assets/visuals/` oder der öffentlichen Site, nie aus Studio mit Token-UI.
5. `full` macht kein Video öffentlich.

Lokal:

```powershell
python -m json.tool n8n/systembrief-creation-process.json
```
