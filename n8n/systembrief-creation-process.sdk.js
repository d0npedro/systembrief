import { workflow, node, trigger, sticky, newCredential, ifElse, switchCase, languageModel, outputParser, expr } from '@n8n/workflow-sdk';

const queueTable = { __rl: true, mode: 'list', value: 'ene9FgeuzWlJW3So', cachedResultName: 'Systembrief Queue' };
const myDrive = { __rl: true, mode: 'list', value: 'My Drive', cachedResultName: 'My Drive' };
const rootFolder = { __rl: true, mode: 'list', value: 'root', cachedResultName: '/ (Root folder)' };
const gpt54 = { __rl: true, mode: 'list', value: 'gpt-5.4', cachedResultName: 'gpt-5.4' };
const imageMini = { __rl: true, mode: 'list', value: 'gpt-image-1-mini', cachedResultName: 'GPT-IMAGE-1-MINI' };

const colSlug = { id: 'slug', displayName: 'slug', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true };
const colTitle = { id: 'title', displayName: 'title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colSeries = { id: 'series', displayName: 'series', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colState = { id: 'state', displayName: 'state', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colPrivacy = { id: 'privacy', displayName: 'privacy', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colRelease = { id: 'release_date', displayName: 'release_date', required: false, defaultMatch: false, display: true, type: 'date', canBeUsedToMatch: true };
const colVideo = { id: 'video_id', displayName: 'video_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colDrive = { id: 'drive_folder', displayName: 'drive_folder', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colGmail = { id: 'gmail_draft_id', displayName: 'gmail_draft_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const colReason = { id: 'reason', displayName: 'reason', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true };
const queueSchema = [colSlug, colTitle, colSeries, colState, colPrivacy, colRelease, colVideo, colDrive, colGmail, colReason];

const stringEq = { type: 'string', operation: 'equals' };
const condOpts = { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 };

const noteProcess = sticky({
  config: {
    name: 'Prozess',
    parameters: {
      content: '## Systembrief - Creation Process\n\nEin n8n-Workflow fuer Stoff, Video-Pack, privat, Release.\n\n`mode`: ingest | produce | release | status | full\n\nWebhook `POST /webhook/systembrief`\n```json\n{ "mode": "full", "slug": "mein-thema", "privacy": "private" }\n```\n\nQueue: Data Table **Systembrief Queue**.\nProduce schreibt ANALYSE, SKRIPT, 12 Folien, Blog-Entwurf, TTS, Thumbnail.\nYouTube bleibt **private** (kein Public-Flip in produce/full).\nRelease 09:00 Europe/Berlin: Kalendertag + Site-Health. Kein implizites Public.\n\nHeader `x-systembrief-secret` wenn `SYSTEMBRIEF_WEBHOOK_SECRET` gesetzt.',
      height: 480,
      width: 380,
      color: 5
    },
    position: [40, 180]
  }
});

const noteLanes = sticky({
  config: {
    name: 'Bahnen',
    parameters: {
      content: '### Bahnen\n\n1 Ingest -> Queue\n2 Content-Gate\n3-7 Packs (Drive + Gmail Draft)\n5 TTS + Thumbnail\n8 YT private (nur Metadaten, kein Upload ohne OAuth)\n9 Blog draft\n10-11 Release-Tag + Health\n12 Status\n\nQuota blockiert die Site nicht.',
      height: 280,
      width: 300,
      color: 4
    },
    position: [40, 700]
  }
});

const webhookIn = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Webhook',
    parameters: {
      httpMethod: 'POST',
      path: 'systembrief',
      responseMode: 'responseNode',
      options: {}
    },
    position: [480, 80]
  },
  output: [{ headers: {}, body: { mode: 'status', slug: '' }, webhookUrl: 'https://n8n.d0npedro.com/webhook/systembrief' }]
});

const manualIn = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manuell', position: [480, 280] },
  output: [{}]
});

const cronIngest = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cron Ingest 2h',
    parameters: {
      rule: { interval: [{ field: 'hours', hoursInterval: 2 }] }
    },
    position: [480, 480]
  },
  output: [{}]
});

const cronRelease = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cron Release 09:00',
    parameters: {
      rule: { interval: [{ field: 'cronExpression', expression: '0 9 * * *' }] }
    },
    position: [480, 680]
  },
  output: [{}]
});

const normalize = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const item = $input.first().json || {};\nconst body = item.body && typeof item.body === "object" ? item.body : item;\nconst inferred = String(body.mode || item.mode || "status");\nconst allowed = ["ingest", "produce", "release", "status", "full"];\nconst mode = allowed.includes(inferred) ? inferred : "status";\nconst slug = (body.slug || item.slug || "").toString().trim();\nconst rawPrivacy = (body.privacy || item.privacy || "private").toString().trim().toLowerCase();\nconst privacy = ["private", "unlisted", "public"].includes(rawPrivacy) ? rawPrivacy : "private";\nconst brief = (body.brief || body.source || item.brief || item.source || "").toString();\nreturn [{\n  json: {\n    mode: mode,\n    slug: slug,\n    privacy: privacy,\n    brief: brief,\n    skip_build: Boolean(body.skip_build || item.skip_build),\n    skip_publish: Boolean(body.skip_publish || item.skip_publish)\n  }\n}];'
    },
    position: [760, 280]
  },
  output: [{ mode: 'status', slug: '', privacy: 'private', skip_build: false, skip_publish: false }]
});

const setIngest = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'mode=ingest',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'm1', name: 'mode', value: 'ingest', type: 'string' },
          { id: 's1', name: 'slug', value: '', type: 'string' },
          { id: 'p1', name: 'privacy', value: 'private', type: 'string' },
          { id: 'b1', name: 'skip_build', value: false, type: 'boolean' },
          { id: 'u1', name: 'skip_publish', value: false, type: 'boolean' }
        ]
      },
      options: {}
    },
    position: [760, 480]
  },
  output: [{ mode: 'ingest', slug: '', privacy: 'private', skip_build: false, skip_publish: false }]
});

const setRelease = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'mode=release',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'm2', name: 'mode', value: 'release', type: 'string' },
          { id: 's2', name: 'slug', value: '', type: 'string' },
          { id: 'p2', name: 'privacy', value: 'private', type: 'string' },
          { id: 'b2', name: 'skip_build', value: false, type: 'boolean' },
          { id: 'u2', name: 'skip_publish', value: false, type: 'boolean' }
        ]
      },
      options: {}
    },
    position: [760, 680]
  },
  output: [{ mode: 'release', slug: '', privacy: 'private', skip_build: false, skip_publish: false }]
});

const switchMode = switchCase({
  version: 3.4,
  config: {
    name: 'Switch mode',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { outputKey: 'ingest', renameOutput: true, conditions: { options: condOpts, combinator: 'and', conditions: [{ id: 'c-ing', leftValue: expr('{{ $json.mode }}'), rightValue: 'ingest', operator: stringEq }] } },
          { outputKey: 'produce', renameOutput: true, conditions: { options: condOpts, combinator: 'and', conditions: [{ id: 'c-pro', leftValue: expr('{{ $json.mode }}'), rightValue: 'produce', operator: stringEq }] } },
          { outputKey: 'release', renameOutput: true, conditions: { options: condOpts, combinator: 'and', conditions: [{ id: 'c-rel', leftValue: expr('{{ $json.mode }}'), rightValue: 'release', operator: stringEq }] } },
          { outputKey: 'status', renameOutput: true, conditions: { options: condOpts, combinator: 'and', conditions: [{ id: 'c-sta', leftValue: expr('{{ $json.mode }}'), rightValue: 'status', operator: stringEq }] } },
          { outputKey: 'full', renameOutput: true, conditions: { options: condOpts, combinator: 'and', conditions: [{ id: 'c-ful', leftValue: expr('{{ $json.mode }}'), rightValue: 'full', operator: stringEq }] } }
        ]
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'status-fallback' }
    },
    position: [1000, 360]
  }
});

const scoutModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'Scout Modell',
    parameters: {
      model: gpt54,
      responsesApiEnabled: false,
      options: { temperature: 0.3 }
    },
    credentials: { openAiApi: newCredential('OpenAI account') },
    position: [1240, -40]
  }
});

const scoutParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Themen Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{"topics":[{"slug":"prozessklarheit-als-grundrecht","title":"Prozessklarheit als Grundrecht","series":"System"}]}'
    },
    position: [1400, -40]
  }
});

const topicScout = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: '1 Ingest Queue',
    parameters: {
      promptType: 'define',
      text: expr('Slug-Hinweis: {{ $json.slug }}\nErzeuge Themen fuer Systembrief.'),
      hasOutputParser: true,
      options: {
        systemMessage: 'Du bist der Stoff-Scout fuer Systembrief.de. Deutsche Briefings zu Wirtschaft, Tech und den Regeln, die Wertschoepfung ermoeglichen oder ersticken. Serien nur System oder Zahl. Keine Produktnamen in oeffentlichen Texten. Wenn ein Slug gesetzt ist, erzeuge genau ein Thema mit diesem Slug. Sonst erzeuge bis zu 8 konkrete, aktuelle Themen. Antwort nur ueber den Parser. slug in kebab-case, title auf Deutsch, series genau System oder Zahl.',
        maxIterations: 3,
        enableStreaming: false
      }
    },
    subnodes: { model: scoutModel, outputParser: scoutParser },
    position: [1280, 80]
  },
  output: [{ output: { topics: [{ slug: 'prozessklarheit-als-grundrecht', title: 'Prozessklarheit als Grundrecht', series: 'System' }] } }]
});

const splitTopics = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Themen aufteilen',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const raw = $input.first().json || {};\nconst payload = raw.output || raw;\nconst topics = payload.topics || [];\nif (!topics.length) {\n  return [{ json: { ok: false, action: "ingest", reason: "no_topics" } }];\n}\nreturn topics.map(function (topic) {\n  return {\n    json: {\n      slug: String(topic.slug || "").trim(),\n      title: String(topic.title || "").trim(),\n      series: topic.series === "Zahl" ? "Zahl" : "System",\n      state: "backlog",\n      privacy: "private"\n    }\n  };\n});'
    },
    position: [1520, 80]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', title: 'Prozessklarheit als Grundrecht', series: 'System', state: 'backlog', privacy: 'private' }]
});

const upsertIngest = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Queue speichern',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: queueTable,
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'slug', condition: 'eq', keyValue: expr('{{ $json.slug }}') }]
      },
      columns: {
        mappingMode: 'defineBelow',
        matchingColumns: ['slug'],
        value: {
          slug: expr('{{ $json.slug }}'),
          title: expr('{{ $json.title }}'),
          series: expr('{{ $json.series }}'),
          state: 'backlog',
          privacy: 'private',
          video_id: '',
          drive_folder: '',
          gmail_draft_id: '',
          reason: ''
        },
        schema: queueSchema
      }
    },
    position: [1760, 80]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', title: 'Prozessklarheit als Grundrecht', series: 'System', state: 'backlog', privacy: 'private' }]
});

const ingestReport = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ingest Report',
    executeOnce: true,
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const items = $input.all();\nconst first = items[0] ? items[0].json : {};\nif (first.reason === "no_topics") {\n  return [{ json: { ok: false, action: "ingest", reason: "no_topics" } }];\n}\nconst slugs = items.map(function (item) { return item.json.slug; }).filter(Boolean);\nreturn [{ json: { ok: true, action: "ingest", topic: slugs[0] || "", count: slugs.length, topics: slugs, privacy: "private" } }];'
    },
    position: [2000, 80]
  },
  output: [{ ok: true, action: 'ingest', topic: 'prozessklarheit-als-grundrecht', count: 1, privacy: 'private' }]
});

const readQueue = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Queue lesen',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: queueTable,
      matchType: 'anyCondition',
      returnAll: true,
      orderBy: true,
      orderByColumn: 'createdAt',
      orderByDirection: 'ASC'
    },
    position: [1280, 280]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', title: 'Prozessklarheit als Grundrecht', series: 'System', state: 'backlog', privacy: 'private' }]
});

const pickTopic = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Naechstes Topic',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const wanted = $("Normalize").isExecuted ? String($("Normalize").item.json.slug || "") : String($json.slug || "");\nlet brief = "";\nlet fromNormPrivacy = "";\ntry {\n  if ($("Normalize").isExecuted) {\n    const n = $("Normalize").item.json || {};\n    brief = String(n.brief || n.source || "");\n    fromNormPrivacy = String(n.privacy || "");\n  }\n} catch (e) {}\nconst rows = $input.all().map(function (item) { return item.json; }).filter(function (row) { return row && row.slug; });\nlet picked = null;\nif (wanted) {\n  picked = rows.find(function (row) { return row.slug === wanted; }) || null;\n}\nif (!picked) {\n  picked = rows.find(function (row) { return row.state === "backlog"; }) || null;\n}\nif (!picked) {\n  return [{ json: { empty: true, reason: "queue_empty", mode: "produce", privacy: fromNormPrivacy || "private", brief: brief } }];\n}\nconst raw = String(picked.privacy || fromNormPrivacy || "private").trim().toLowerCase();\nconst privacy = ["private", "unlisted", "public"].includes(raw) ? raw : "private";\nreturn [{ json: { empty: false, mode: "produce", slug: picked.slug, title: picked.title || picked.slug, series: picked.series || "System", state: picked.state, privacy: privacy, brief: brief } }];'
    },
    position: [1520, 280]
  },
  output: [{ empty: false, mode: 'produce', slug: 'prozessklarheit-als-grundrecht', title: 'Prozessklarheit als Grundrecht', series: 'System', state: 'backlog', privacy: 'private' }]
});

const hasTopic = ifElse({
  version: 2.3,
  config: {
    name: 'Topic vorhanden?',
    parameters: {
      conditions: {
        options: condOpts,
        combinator: 'and',
        conditions: [{ id: 'empty', leftValue: expr('{{ $json.empty }}'), operator: { type: 'boolean', operation: 'true' } }]
      }
    },
    position: [1760, 280]
  }
});

const emptyQueue = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Queue leer',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'ok', name: 'ok', value: false, type: 'boolean' },
          { id: 'act', name: 'action', value: 'produce', type: 'string' },
          { id: 'rs', name: 'reason', value: 'queue_empty', type: 'string' },
          { id: 'pv', name: 'privacy', value: 'private', type: 'string' }
        ]
      },
      options: {}
    },
    position: [2000, 400]
  },
  output: [{ ok: false, action: 'produce', reason: 'queue_empty', privacy: 'private' }]
});

const writerModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'Redakteur',
    parameters: {
      model: gpt54,
      responsesApiEnabled: false,
      options: { temperature: 0.2 }
    },
    credentials: { openAiApi: newCredential('OpenAI account') },
    position: [1960, 520]
  }
});

const writerParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Briefing Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{"status":"success","slug":"prozessklarheit-als-grundrecht","title":"Titel","series":"System","analyse":"ANALYSE.md Inhalt","skript":"SKRIPT.md Inhalt","slides":"1. Folie\\n2. Folie","blog_draft":"Blog mit draft true","youtube_title":"Titel max 100","youtube_description":"Beschreibung","social":"Kurzer Social-Text","image_prompt":"Navy cyan editorial thumbnail, no text","tts_text":"Gesprochener Text","missing":"","summary":"Kurz"}'
    },
    position: [2140, 520]
  }
});

const briefingWriter = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: '2-9 Produce (Gate)',
    parameters: {
      promptType: 'define',
      text: expr('Thema: {{ $json.title }}\nSlug: {{ $json.slug }}\nSerie: {{ $json.series }}\nPrivacy: {{ $json.privacy }}\nVorgegebener Stoff (brief/source). Wenn nicht leer: diesen Stoff ausarbeiten, nicht neu erfinden.\n\n{{ $json.brief }}\n\nSchreibe das komplette Briefing.'),
      hasOutputParser: true,
      options: {
        systemMessage: 'Du bist der Systembrief-Redakteur. Essays und Zahlen, klar in Minuten, auf Deutsch. Pflichtfelder: ANALYSE.md, SKRIPT.md, genau 12 Folientexte, Blog-Entwurf mit draft: true, YouTube-Titel (max 100 Zeichen), YouTube-Beschreibung (max 5000), Social-Text. Design der Folien: 12 x 16:9, Navy #0B1220, Cyan #38BDF8. Keine Produktnamen. Keine erfundenen Zahlen. status ist success nur wenn analyse, skript, slides und blog_draft gefuellt sind, sonst needs_info und missing listen. privacy bleibt private. tts_text ist die gesprochene deutsche Narration, gekuerzt auf unter 4000 Zeichen. image_prompt auf Englisch, editorial, ohne Text im Bild.',
        maxIterations: 4,
        enableStreaming: false
      }
    },
    subnodes: { model: writerModel, outputParser: writerParser },
    position: [2000, 200]
  },
  output: [{ output: { status: 'success', slug: 'prozessklarheit-als-grundrecht', title: 'Titel', series: 'System', analyse: 'Analyse', skript: 'Skript', slides: '1. Folie', blog_draft: 'Blog', youtube_title: 'Titel', youtube_description: 'Desc', social: 'Social', image_prompt: 'thumb', tts_text: 'Narration', missing: '', summary: 'ok' } }]
});

const contentGate = ifElse({
  version: 2.3,
  config: {
    name: 'Content fehlt?',
    parameters: {
      conditions: {
        options: condOpts,
        combinator: 'and',
        conditions: [
          { id: 'st', leftValue: expr('{{ $json.output.status }}'), rightValue: 'success', operator: stringEq },
          { id: 'an', leftValue: expr('{{ $json.output.analyse }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { id: 'sk', leftValue: expr('{{ $json.output.skript }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { id: 'sl', leftValue: expr('{{ $json.output.slides }}'), operator: { type: 'string', operation: 'notEmpty' } },
          { id: 'bl', leftValue: expr('{{ $json.output.blog_draft }}'), operator: { type: 'string', operation: 'notEmpty' } }
        ]
      }
    },
    position: [2240, 200]
  }
});

const operatorHint = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Operator-Hinweis',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          { id: 'ok', name: 'ok', value: false, type: 'boolean' },
          { id: 'act', name: 'action', value: 'produce', type: 'string' },
          { id: 'rs', name: 'reason', value: 'content_missing', type: 'string' },
          { id: 'tp', name: 'topic', value: expr('{{ $json.output.slug || $json.slug || "kein slug" }}'), type: 'string' },
          { id: 'om', name: 'operator_message', value: expr('{{ "Content-Gate: " + ($json.output.slug || "kein slug") + " braucht ANALYSE.md, SKRIPT.md, Folien, Blog-Entwurf. Fehlend: " + ($json.output.missing || "unbekannt") }}'), type: 'string' },
          { id: 'pv', name: 'privacy', value: 'private', type: 'string' }
        ]
      },
      options: {}
    },
    position: [2480, 360]
  },
  output: [{ ok: false, action: 'produce', reason: 'content_missing', topic: 'prozessklarheit-als-grundrecht', operator_message: 'Content-Gate', privacy: 'private' }]
});

const packFolder = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Pack-Ordner',
    parameters: {
      resource: 'folder',
      operation: 'create',
      name: expr('{{ "systembrief-" + $json.output.slug }}'),
      driveId: myDrive,
      folderId: rootFolder,
      options: { simplifyOutput: true }
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
    position: [2480, 80]
  },
  output: [{ id: 'folder1', name: 'systembrief-prozessklarheit-als-grundrecht' }]
});

const writePack = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'PACK.md',
    parameters: {
      resource: 'file',
      operation: 'createFromText',
      name: 'PACK.md',
      content: expr('{{ "# " + $("2-9 Produce (Gate)").item.json.output.title + "\\n\\n## ANALYSE.md\\n" + $("2-9 Produce (Gate)").item.json.output.analyse + "\\n\\n## SKRIPT.md\\n" + $("2-9 Produce (Gate)").item.json.output.skript + "\\n\\n## Folien\\n" + $("2-9 Produce (Gate)").item.json.output.slides + "\\n\\n## YouTube (private)\\n" + $("2-9 Produce (Gate)").item.json.output.youtube_title + "\\n\\n" + $("2-9 Produce (Gate)").item.json.output.youtube_description + "\\n\\n## Social\\n" + $("2-9 Produce (Gate)").item.json.output.social }}'),
      driveId: myDrive,
      folderId: { __rl: true, mode: 'id', value: expr('{{ $json.id }}') }
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
    position: [2720, 80]
  },
  output: [{ id: 'file1' }]
});

const writeBlog = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'POST.md',
    parameters: {
      resource: 'file',
      operation: 'createFromText',
      name: 'POST.md',
      content: expr('{{ $("2-9 Produce (Gate)").item.json.output.blog_draft }}'),
      driveId: myDrive,
      folderId: { __rl: true, mode: 'id', value: expr('{{ $("Pack-Ordner").item.json.id }}') }
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
    position: [2960, 80]
  },
  output: [{ id: 'file2' }]
});

const gmailDraft = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Blog Gmail Draft',
    parameters: {
      resource: 'draft',
      operation: 'create',
      subject: expr('{{ "[Systembrief draft] " + $("2-9 Produce (Gate)").item.json.output.title }}'),
      emailType: 'text',
      message: expr('{{ $("2-9 Produce (Gate)").item.json.output.blog_draft }}'),
      options: { sendTo: 'ph@d0npedro.com' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail account') },
    position: [3200, 80]
  },
  output: [{ id: 'draft1' }]
});

const slideTts = node({
  type: '@n8n/n8n-nodes-langchain.openAi',
  version: 2.3,
  config: {
    name: 'Folien TTS',
    parameters: {
      resource: 'audio',
      operation: 'generate',
      model: 'tts-1-hd',
      voice: 'onyx',
      input: expr('{{ $("2-9 Produce (Gate)").item.json.output.tts_text }}'),
      options: { response_format: 'mp3' }
    },
    credentials: { openAiApi: newCredential('OpenAI account') },
    position: [3440, 80]
  },
  output: [{ ok: true }]
});

const thumbImage = node({
  type: '@n8n/n8n-nodes-langchain.openAi',
  version: 2.3,
  config: {
    name: 'Thumbnail',
    parameters: {
      resource: 'image',
      operation: 'generate',
      modelId: imageMini,
      prompt: expr('{{ $("2-9 Produce (Gate)").item.json.output.image_prompt }}'),
      options: { quality: 'medium', size: '1536x1024' }
    },
    credentials: { openAiApi: newCredential('OpenAI account') },
    position: [3680, 80]
  },
  output: [{ ok: true }]
});

const markProduced = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Queue produced',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: queueTable,
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'slug', condition: 'eq', keyValue: expr('{{ $("2-9 Produce (Gate)").item.json.output.slug }}') }]
      },
      columns: {
        mappingMode: 'defineBelow',
        matchingColumns: ['slug'],
        value: {
          slug: expr('{{ $("2-9 Produce (Gate)").item.json.output.slug }}'),
          title: expr('{{ $("2-9 Produce (Gate)").item.json.output.title }}'),
          series: expr('{{ $("2-9 Produce (Gate)").item.json.output.series }}'),
          state: 'produced',
          privacy: 'private',
          release_date: expr('{{ $now.setZone("Europe/Berlin").plus({ days: 1 }).toISO() }}'),
          video_id: '',
          drive_folder: expr('{{ $("Pack-Ordner").item.json.id }}'),
          gmail_draft_id: expr('{{ $("Blog Gmail Draft").item.json.id }}'),
          reason: ''
        },
        schema: queueSchema
      }
    },
    position: [3920, 80]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', state: 'produced', privacy: 'private' }]
});

const produceReport = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Produce Report',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'ok', name: 'ok', value: true, type: 'boolean' },
          { id: 'act', name: 'action', value: 'produce', type: 'string' },
          { id: 'tp', name: 'topic', value: expr('{{ $("2-9 Produce (Gate)").item.json.output.slug }}'), type: 'string' },
          { id: 'pv', name: 'privacy', value: 'private', type: 'string' },
          { id: 'st', name: 'state', value: 'produced', type: 'string' },
          { id: 'df', name: 'drive_folder', value: expr('{{ $("Pack-Ordner").item.json.id }}'), type: 'string' },
          { id: 'gm', name: 'gmail_draft_id', value: expr('{{ $("Blog Gmail Draft").item.json.id }}'), type: 'string' },
          { id: 'sm', name: 'summary', value: expr('{{ $("2-9 Produce (Gate)").item.json.output.summary }}'), type: 'string' }
        ]
      },
      options: {}
    },
    position: [4160, 80]
  },
  output: [{ ok: true, action: 'produce', topic: 'prozessklarheit-als-grundrecht', privacy: 'private', state: 'produced' }]
});

const readProduced = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Produzierte lesen',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: queueTable,
      matchType: 'anyCondition',
      filters: {
        conditions: [
          { keyName: 'state', condition: 'eq', keyValue: 'produced' },
          { keyName: 'state', condition: 'eq', keyValue: 'scheduled' }
        ]
      },
      returnAll: true,
      orderBy: true,
      orderByColumn: 'release_date',
      orderByDirection: 'ASC'
    },
    position: [1280, 480]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', state: 'produced', release_date: '2026-08-20', privacy: 'private' }]
});

const pickRelease = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Kalendertag waehlen',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const today = $now.setZone("Europe/Berlin").toISODate();\nconst rows = $input.all().map(function (item) { return item.json; }).filter(function (row) { return row && row.slug; });\nconst due = rows.filter(function (row) {\n  if (!row.release_date) { return true; }\n  const day = String(row.release_date).slice(0, 10);\n  return day <= today;\n});\nif (!due.length) {\n  return [{ json: { empty: true, reason: "nothing_due", action: "release", privacy: "private" } }];\n}\nconst picked = due[0];\nreturn [{ json: { empty: false, action: "release", slug: picked.slug, title: picked.title || picked.slug, state: picked.state, privacy: "private", release_date: picked.release_date } }];'
    },
    position: [1520, 480]
  },
  output: [{ empty: false, action: 'release', slug: 'prozessklarheit-als-grundrecht', privacy: 'private' }]
});

const hasRelease = ifElse({
  version: 2.3,
  config: {
    name: 'Release faellig?',
    parameters: {
      conditions: {
        options: condOpts,
        combinator: 'and',
        conditions: [{ id: 're', leftValue: expr('{{ $json.empty }}'), operator: { type: 'boolean', operation: 'true' } }]
      }
    },
    position: [1760, 480]
  }
});

const nothingDue = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Nichts faellig',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'ok', name: 'ok', value: true, type: 'boolean' },
          { id: 'act', name: 'action', value: 'release', type: 'string' },
          { id: 'rs', name: 'reason', value: 'nothing_due', type: 'string' },
          { id: 'pv', name: 'privacy', value: 'private', type: 'string' }
        ]
      },
      options: {}
    },
    position: [2000, 600]
  },
  output: [{ ok: true, action: 'release', reason: 'nothing_due', privacy: 'private' }]
});

const siteHealth = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Site Health',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://www.systembrief.de/',
      authentication: 'none',
      options: {
        timeout: 15000,
        response: { response: { neverError: true, fullResponse: true, responseFormat: 'text' } }
      }
    },
    position: [2000, 480]
  },
  output: [{ statusCode: 200 }]
});

const scheduleHealth = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Schedule Health',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://www.systembrief.de/schedule/',
      authentication: 'none',
      options: {
        timeout: 15000,
        response: { response: { neverError: true, fullResponse: true, responseFormat: 'text' } }
      }
    },
    position: [2240, 480]
  },
  output: [{ statusCode: 200 }]
});

const markReleased = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Queue released',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: queueTable,
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'slug', condition: 'eq', keyValue: expr('{{ $("Kalendertag waehlen").item.json.slug }}') }]
      },
      columns: {
        mappingMode: 'defineBelow',
        matchingColumns: ['slug'],
        value: {
          state: 'released',
          privacy: 'private',
          reason: 'released_n8n_native'
        },
        schema: queueSchema
      }
    },
    position: [2480, 480]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', state: 'released', privacy: 'private' }]
});

const releaseReport = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Release Report',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const picked = $("Kalendertag waehlen").item.json;\nconst site = $("Site Health").item.json || {};\nconst schedule = $("Schedule Health").item.json || {};\nconst siteOk = Number(site.statusCode || 0) >= 200 && Number(site.statusCode || 0) < 400;\nconst scheduleOk = Number(schedule.statusCode || 0) >= 200 && Number(schedule.statusCode || 0) < 400;\nreturn [{\n  json: {\n    ok: siteOk,\n    action: "release",\n    topic: picked.slug,\n    privacy: "private",\n    state: "released",\n    youtube_public: false,\n    health: { site: siteOk, schedule: scheduleOk },\n    summary: "Kalendertag markiert. YouTube bleibt private, weil dieser n8n-Host kein YouTube-OAuth hat. Site-Health blockiert nicht."\n  }\n}];'
    },
    position: [2720, 480]
  },
  output: [{ ok: true, action: 'release', topic: 'prozessklarheit-als-grundrecht', privacy: 'private', youtube_public: false }]
});

const readStatus = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: '12 Status Queue',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: queueTable,
      matchType: 'anyCondition',
      returnAll: true,
      orderBy: true,
      orderByColumn: 'createdAt',
      orderByDirection: 'DESC'
    },
    position: [1280, 680]
  },
  output: [{ slug: 'prozessklarheit-als-grundrecht', state: 'backlog' }]
});

const statusSite = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Status Site',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://www.systembrief.de/',
      authentication: 'none',
      options: {
        timeout: 15000,
        response: { response: { neverError: true, fullResponse: true, responseFormat: 'text' } }
      }
    },
    position: [1520, 680]
  },
  output: [{ statusCode: 200 }]
});

const statusSchedule = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Status Schedule',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://www.systembrief.de/schedule/',
      authentication: 'none',
      options: {
        timeout: 15000,
        response: { response: { neverError: true, fullResponse: true, responseFormat: 'text' } }
      }
    },
    position: [1760, 680]
  },
  output: [{ statusCode: 200 }]
});

const statusReport = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Status Report',
    executeOnce: true,
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: 'const rows = $("12 Status Queue").all().map(function (item) { return item.json; }).filter(function (row) { return row && row.slug; });\nconst site = $("Status Site").item.json || {};\nconst schedule = $("Status Schedule").item.json || {};\nconst siteOk = Number(site.statusCode || 0) >= 200 && Number(site.statusCode || 0) < 400;\nconst scheduleOk = Number(schedule.statusCode || 0) >= 200 && Number(schedule.statusCode || 0) < 400;\nreturn [{\n  json: {\n    ok: true,\n    action: "status",\n    privacy: "private",\n    count: rows.length,\n    next_content: rows.filter(function (row) { return row.state === "backlog"; }).slice(0, 8).map(function (row) { return row.slug; }),\n    due_today: rows.filter(function (row) { return row.state === "produced" || row.state === "scheduled"; }).slice(0, 8).map(function (row) { return row.slug; }),\n    health: { site: siteOk, schedule: scheduleOk }\n  }\n}];'
    },
    position: [2000, 680]
  },
  output: [{ ok: true, action: 'status', count: 1, health: { site: true, schedule: true } }]
});

const notifySet = ifElse({
  version: 2.3,
  config: {
    name: 'Notify gesetzt?',
    parameters: {
      conditions: {
        options: condOpts,
        combinator: 'and',
        conditions: [{ id: 'n1', leftValue: '', operator: { type: 'string', operation: 'notEmpty' } }]
      }
    },
    position: [4400, 360]
  }
});

const notifyHttp = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Notify',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://127.0.0.1/disabled-notify',
      authentication: 'none',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ text: ($json.ok ? ("Systembrief " + ($json.action || "ok") + ": " + ($json.topic || "")) : ("Systembrief: " + ($json.operator_message || $json.reason || "Fehler"))), report: $json }) }}'),
      options: {
        response: { response: { neverError: true, responseFormat: 'text' } }
      }
    },
    position: [4640, 240]
  },
  output: [{ ok: true }]
});

const fromWebhook = ifElse({
  version: 2.3,
  config: {
    name: 'Vom Webhook?',
    parameters: {
      conditions: {
        options: condOpts,
        combinator: 'and',
        conditions: [{ id: 'wh', leftValue: expr("{{ String($('Webhook').isExecuted) }}"), rightValue: 'true', operator: stringEq }]
      }
    },
    position: [4400, 560]
  }
});

const respondHook = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond',
    parameters: {
      respondWith: 'firstIncomingItem',
      options: { responseCode: 200, enableStreaming: false }
    },
    position: [4640, 520]
  },
  output: [{ ok: true }]
});

export default workflow('systembrief-creation-process', 'Systembrief - Creation Process')
  .add(noteProcess)
  .add(noteLanes)
  .add(webhookIn)
  .to(normalize)
  .add(manualIn)
  .to(normalize)
  .add(cronIngest)
  .to(setIngest)
  .add(cronRelease)
  .to(setRelease)
  .add(normalize)
  .to(switchMode)
  .add(setIngest)
  .to(switchMode)
  .add(setRelease)
  .to(switchMode)
  .add(switchMode
    .onCase(0, topicScout.to(splitTopics.to(upsertIngest.to(ingestReport))))
    .onCase(1, readQueue.to(pickTopic.to(hasTopic.onTrue(emptyQueue).onFalse(briefingWriter.to(contentGate.onTrue(packFolder.to(writePack.to(writeBlog.to(gmailDraft.to(slideTts.to(thumbImage.to(markProduced.to(produceReport)))))))).onFalse(operatorHint))))))
    .onCase(2, readProduced.to(pickRelease.to(hasRelease.onTrue(nothingDue).onFalse(siteHealth.to(scheduleHealth.to(markReleased.to(releaseReport)))))))
    .onCase(3, readStatus.to(statusSite.to(statusSchedule.to(statusReport))))
    .onCase(4, readQueue)
    .onCase(5, readStatus)
  )
  .add(ingestReport)
  .to(notifySet)
  .add(ingestReport)
  .to(fromWebhook)
  .add(emptyQueue)
  .to(notifySet)
  .add(emptyQueue)
  .to(fromWebhook)
  .add(produceReport)
  .to(notifySet)
  .add(produceReport)
  .to(fromWebhook)
  .add(operatorHint)
  .to(notifySet)
  .add(operatorHint)
  .to(fromWebhook)
  .add(nothingDue)
  .to(notifySet)
  .add(nothingDue)
  .to(fromWebhook)
  .add(releaseReport)
  .to(notifySet)
  .add(releaseReport)
  .to(fromWebhook)
  .add(statusReport)
  .to(notifySet)
  .add(statusReport)
  .to(fromWebhook)
  .add(notifySet.onTrue(notifyHttp))
  .add(fromWebhook.onTrue(respondHook));
