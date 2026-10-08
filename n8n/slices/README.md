# Legacy Slices

Diese Einzel-Workflows sind ältere Beispiele. Maßgeblich ist der aktuelle Stand unter [`../systembrief-creation-process.json`](../systembrief-creation-process.json) beziehungsweise die Cloud-Variante `../systembrief-creation-process.cloud.json`.

| Datei | Rolle | Einschränkung |
|---|---|---|
| `systembrief-daily-release.json` | 09:00 Dispatch über GitHub Actions | referenziert `release-scheduled.yml`, das in diesem Repository nicht vorhanden ist; veröffentlicht daher nachweislich nichts in diesem Repo-Stand |
| `systembrief-produce-topic.json` | ein Topic bauen | Legacy |
| `systembrief-topic-ingest.json` | Queue befüllen | Legacy |
| `systembrief-pipeline-status.json` | Status lesen | Legacy |

Die Slices sind nicht der Beleg dafür, dass ein Artikel auf der Website veröffentlicht oder ein YouTube-Video public geschaltet wurde. Die Website-Sichtbarkeit ist separat; bereits bewusst öffentliche Artikel bleiben online. YouTube folgt dem jeweils gesetzten `publishAt`.
