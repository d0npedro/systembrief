# Credentials

Alles lokal oder in n8n / GitHub Actions Secrets. **Nie committen.**

| Secret | Wo | Wofür |
|---|---|---|
| `SYSTEMBRIEF_GITHUB_TOKEN` | n8n Env | Daily Release dispatch |
| `SYSTEMBRIEF_WEBHOOK_SECRET` | n8n Env | Produce-Webhook absichern |
| `SYSTEMBRIEF_NOTIFY_WEBHOOK` | n8n Env | Slack/Discord (optional) |
| YouTube OAuth (`client_secret`, `token`) | privates Repo / Actions | Upload, Privacy, Schedule |
| `CLOUDFLARE_API_TOKEN` / Account | Actions | Pages-Deploy |
| TTS-Provider-Key | Studio-Env / Datei | Stimme |

GitHub PAT (Fine-grained oder classic):

- Zugriff auf das **private** Pipeline-Repo
- Permissions: Contents read, Actions write (`workflow` bei classic)

YouTube-Uploads bleiben default **private**. Public nur über den Release-Kalender.
