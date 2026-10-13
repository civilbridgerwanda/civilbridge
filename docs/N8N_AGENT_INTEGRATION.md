# AI agent integration (n8n today, your own model later)

CivilBridge splits AI work into two layers. This document is the contract for
the second one - the heavy-duty agent - and explains how the chat hands work
over to it.

```
                    ┌────────────────────────── browser ──────────────────────────┐
  Estimator upload ─┤                                                             │
  AI Studio chat   ─┤  React app  ◄── socket "agent:job_updated" ── progress/done │
                    └───────────────┬─────────────────────────────────────────────┘
                                    │ REST
                    ┌───────────────▼────────────── CivilBridge API ──────────────┐
                    │  chat/intent.js   Layer 1 (instant)  ─► chat/providers/*    │
                    │        │ needs data / heavy compute                         │
                    │  agent/jobs.js    creates an AgentJob (queued) ─┐           │
                    │  agent/index.js   picks the provider            │           │
                    │  agent/providers/n8n.js  ── POST webhook ───────┼──► n8n    │
                    │  routes/agent.js  ◄── signed POST callback ─────┘  workflow │
                    │  agent/jobs.js    applies the result (DB, notify, socket)   │
                    └──────────────────────────────────────────────────────────────┘
```

Everything the app knows about the agent is the *job* (`agent_jobs`), its
*result shape* (below) and the *provider interface*. It never knows what is
behind it - which is what makes the swap to your own model a one-file change.

---

## 1. Turning it on (and keeping it off)

All keys live in the server's environment (`server/.env`, or the process
manager on the VPS). They are never stored in the database and never sent to
the browser. The admin dashboard's **Integrations** tab shows status only
(booleans and variable *names*).

| Variable | Purpose |
|---|---|
| `AGENT_ENABLED` | The on-switch. `false` = idle: **nothing is ever sent**, whatever else is set. |
| `AGENT_PROVIDER` | `n8n` (default). A new provider registers under its own name. |
| `N8N_WEBHOOK_URL` | The n8n Webhook node's *production* URL. |
| `N8N_WEBHOOK_SECRET` | Sent on every request as header `X-CivilBridge-Secret`. n8n checks it. |
| `N8N_CALLBACK_SECRET` | n8n signs its replies with this; we verify. Use a *different* value. |
| `N8N_TIMEOUT_MS` | How long to wait for n8n to *accept* a job (default 15000). |
| `SERVER_URL` | This API's public origin. Becomes the `callback_url` and the base of uploaded-file links. **Must be the public https URL in production.** |
| `CHAT_PROVIDER` / `CHAT_LLM_API_KEY` / `CHAT_LLM_MODEL` / `CHAT_LLM_BASE_URL` | Layer 1 language model (section 6). `rules` = built-in, no key. |

States you'll see in the admin tab: **Not configured** → **Idle** (keys stored,
switch off) → **Active**; or **Needs attention** (switched on but a key is missing).

**Going live checklist**

1. Build the workflow in n8n (section 4) and copy its production webhook URL.
2. Set `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `N8N_CALLBACK_SECRET`, and
   `SERVER_URL` in `.env`; put the same secrets in the workflow.
3. Set `AGENT_ENABLED=true`, restart the API (`pm2 restart civilbridge-prod-api`).
4. Open Admin → Integrations: it should read **Active**. Press *Send waiting
   jobs now* to release anything that queued while it was idle (this also
   happens automatically within a minute).

While the agent is off, nothing breaks: estimate requests wait in the queue, the
admins are alerted (in-app + email), assign a verified expert from **Admin →
Estimates**, and that expert types the results in by hand (*Enter results*).
Chat requests that need the agent get an honest "not switched on yet" reply
instead of a promise.

**Who works on what.** Admins assign every estimate - when a request needs a
person (agent off), and again when the agent's analysis finishes or fails. Only
the assigned expert can see or touch it; the client is told to wait and is
notified once, when everything is done. `OPS_EMAIL` (optional) routes the alert
email to whoever triages; otherwise every admin is emailed. All of this lives in
`server/src/lib/assignment.js`, so moving to "alert every capable expert, first
to accept takes it" later is a change to that one file.

---

## 2. Request: CivilBridge → n8n

`POST {N8N_WEBHOOK_URL}` with headers `Content-Type: application/json` and
`X-CivilBridge-Secret: <N8N_WEBHOOK_SECRET>`. Configure the Webhook node with
**Respond: Immediately** - analysis takes far longer than an HTTP request
should stay open; results come back through the callback.

```jsonc
{
  "contract_version": 1,
  "job_id": "6f1c…",                      // echo this in every callback
  "kind": "estimate_analysis",            // or "chat_task"
  "callback_url": "https://api.example.com/api/agent/callback",
  "submitted_at": "2026-09-25T20:15:00.000Z",
  "input": { … }                          // depends on kind, below
}
```

**`kind: "estimate_analysis"`** (an Estimator upload)

```jsonc
"input": {
  "estimate_id": "…",
  "project_name": "Kimironko family house",
  "project_type": "house",                // house|apartment|commercial|land|renovation|""
  "description": "free-text notes from the client",
  "location": { "country": "RW", "district": "Gasabo", "sector": "Kimironko" },
  "details": { "budget_rwf": 60000000, "land_size_sqm": 500, "upi": "1/02/03/04/567" },  // any may be null
  "files": [ { "url": "https://api.example.com/uploads/<uuid>.dwg" } ],   // fetch this
  "requested_deliverables": {
    "cost":     ["boq", "cost_breakdown", "timeline"],
    "drawings": ["floor_plan", "elevation", "section", "roof_plan", "foundation_plan", "site_plan"],
    "visuals":  ["render_2d", "render_3d"],
    "drawing_formats": ["dwg", "dxf", "ifc", "pdf"],
    "visual_formats":  ["png", "jpg"]
  }
}
```

**`kind: "chat_task"`** (a message the chat routed to Layer 2)

```jsonc
"input": {
  "intent": "estimate",                   // estimate | drawings | pricing_lookup | planning
  "message": "Estimate the cost of a 3-bedroom house in Musanze…",
  "history": [ { "role": "user", "content": "…" }, { "role": "assistant", "content": "…" } ]  // last ≤10
}
```

No email addresses, names, tokens or passwords are ever included.

n8n's answer to this request only needs to be HTTP 2xx. If it returns JSON with
`execution_id` (or `id`) it's stored on the job for traceability.
A non-2xx or a timeout re-queues the job (3 attempts, retried every minute),
then marks it failed - and a failed estimate falls back to the expert queue.

---

## 3. Callback: n8n → CivilBridge

`POST {callback_url}` - no user login; the **signature is the credential**.

```
Content-Type: application/json
X-CivilBridge-Signature: sha256=<hex HMAC-SHA256 of the raw request body, key = N8N_CALLBACK_SECRET>
```

The signature covers the *exact bytes* sent, so compute it over the same string
you send (in n8n: build the body with a Code node, sign that string, and send it
with the HTTP Request node in *Raw* mode - don't let n8n re-serialise it).

```js
// n8n Code node
const crypto = require('crypto');
const payload = { job_id: $json.job_id, status: 'completed', result: { /* … */ } };
const body = JSON.stringify(payload);
return [{ json: { body, signature: 'sha256=' + crypto
  .createHmac('sha256', $env.CIVILBRIDGE_CALLBACK_SECRET).update(body).digest('hex') } }];
```

Body:

```jsonc
{ "job_id": "…", "status": "running" | "completed" | "failed",
  "stage": "Drafting the floor plan",   // optional, running only - shown to the user
  "progress": 40,                        // optional 0-99
  "result": { … },                       // completed only
  "error": "why it failed" }             // failed only (never shown verbatim to users)
```

Send `running` updates as often as is useful - they drive the progress bar the
user sees. Replays are safe: once a job is `completed` or `failed`, further
callbacks return `{ "ignored": true }`.

Responses: `200` ok · `400` malformed · `401` bad/missing signature · `404`
unknown job · `503` integration switched off.

### The `result` object

Everything is validated and clamped on our side; unknown fields are ignored.

```jsonc
"result": {
  "summary": "Two-storey villa, reinforced concrete frame.",   // shown to the client
  "timeline": "10-12 months",
  "notes": "Assumes standard soil conditions.",
  "currency": "RWF",
  "estimated_cost": 123456789,          // optional - if omitted, the sum of items
  "items": [                            // the bill of quantities (max 500)
    { "item_name": "Concrete C25", "unit": "m3", "quantity": 120, "unit_price": 180000 }
    // total_price is computed if you leave it out
  ],
  "deliverables": [                     // files you produced (max 100) - http(s) links only
    { "kind": "floor_plan",  "format": "dxf", "label": "Ground floor",  "url": "https://…/ground.dxf" },
    { "kind": "render_3d",   "format": "png", "label": "Front view",    "url": "https://…/front.png" }
  ],
  "reply": "Here is your drawing set…"  // chat_task only - replaces the "working on it" message
}
```

**Deliverable `kind`s:** `floor_plan · elevation · section · roof_plan ·
foundation_plan · site_plan · structural · mep · render_2d · render_3d · boq ·
report · other`.

**Formats for the daily-use CAD tools.** AutoCAD reads **DWG/DXF**;
ArchiCAD and Revit import **DWG/DXF/IFC**; everything opens **PDF**. So emit each
drawing as DXF or DWG (2D), IFC (BIM model), plus PDF for printing, PNG/JPG for
renders. (`.pln` is ArchiCAD's proprietary project format - produce IFC/DWG
instead and let ArchiCAD import it.) The Results page shows CAD formats with an
indigo badge and explains which tool opens what.

`javascript:`, `data:` and other non-http(s) links are dropped. Host the files
somewhere the *client's browser* can open (a signed URL, your storage, or
upload them to CivilBridge and pass the link).

### What the client sees, and when

The numbers, bill of quantities and files are **never released to the client
until a human expert verifies them** - enforced in the API, not just the UI.
The agent's result moves the estimate to *Analysed*; an expert then verifies
(after correcting anything via *Enter / edit results*), and only then does the
client's Results Dashboard show the cost, drawings and downloads.

---

## 4. Suggested n8n workflow

```
Webhook (POST, Respond: Immediately, Header Auth = N8N_WEBHOOK_SECRET)
  └─► Switch on {{ $json.body.kind }}
        ├─ estimate_analysis
        │    ├─ HTTP Request: download input.files[0].url
        │    ├─ (callback: running, "Reading your drawings", 15)
        │    ├─ AI Agent node  ── tools ──► pricing database(s), material rates,
        │    │                             quantity-takeoff / reasoning tools
        │    ├─ (callback: running, "Pricing the bill of quantities", 55)
        │    ├─ Drawing generation ─► DXF/DWG/IFC/PDF + 2D/3D renders ─► store files
        │    └─ Code: build { summary, timeline, items, deliverables } ─► sign ─► callback completed
        └─ chat_task
             ├─ AI Agent node (DB queries / tools) using input.message + input.history
             └─ Code: build { reply, summary, deliverables? } ─► sign ─► callback completed
  (Error trigger ─► callback failed)
```

Pricing-database credentials, model API keys and tool access belong in **n8n's
own credential store** - they're the workflow's, so CivilBridge never holds them.

---

## 5. Structural advice: the chat ⇄ agent handoff

The hybrid chat is built so the two layers never share code paths and the
handoff is a single, boring seam.

1. **One decision point.** `chat/intent.js → routeMessage()` returns
   `{ layer: 1 | 2, intent }`. It is deterministic rules (free, instant,
   unit-testable, can't be talked into burning agent time on small talk).
   When Layer 1 becomes a real language model, replace *only this function*: give
   the model one tool, `request_agent_task(intent, message)`, and let it decide.
   Nothing downstream changes because nothing downstream sees the model.
2. **Layer 1 is a provider, with a fallback.** `chat/index.js → converse()` uses
   the LLM when `CHAT_PROVIDER=llm` and a key exist, and otherwise (or on any
   failure) the built-in rules responder. The user always gets an answer.
3. **Layer 2 is a job, not a call.** The chat never awaits the agent. It writes
   a placeholder assistant message that already points at a job id, creates the
   job, and returns immediately. (The placeholder is created *first* with a
   pre-assigned job id, so even an instant callback can't arrive before the row
   it needs to update.)
4. **The answer replaces the placeholder in place.** When the callback lands,
   the *same* message row is rewritten with the reply and its files attached.
   One row per turn keeps history ordered, survives a page reload mid-task, and
   means "working on it" and "done" are the same message in different states.
5. **Two ways to hear back, one source of truth.** The server pushes
   `agent:job_updated` to the user's socket room (no payload beyond status);
   the client re-reads the conversation on that event, and polls every 5 s only
   while something is pending, as a net for a missed event. The database is
   always the truth - the socket is just a nudge.
6. **Graceful when the agent is off or fails.** Off → an honest reply that
   points to what works today (the Estimator, Plans, Experts) and *no job is
   created* (nothing would ever fulfil it). Failed → the bubble is rewritten to a
   plain apology and the estimate flow falls back to the expert queue.
7. **Context in, no PII out.** The job carries the last few messages for
   context; never emails, names or tokens.

## 6. Layer 1 language model

`CHAT_PROVIDER=llm` + `CHAT_LLM_API_KEY` uses the Anthropic Messages API
(`CHAT_LLM_MODEL`, default a small fast model). The system prompt forbids stating
prices, quantities or timelines as fact - those must come from Layer 2 or an
expert. Messages are capped at 2,000 characters and 20 per minute per user.

## 7. Swapping in your own trained model

1. Create `server/src/agent/providers/<name>.js` exporting
   `{ name, dispatch(request) }` - `request` is exactly the JSON in section 2;
   resolve `{ externalRef }` once the model has *accepted* the job.
2. Register it in `server/src/agent/index.js`.
3. Set `AGENT_PROVIDER=<name>`.
4. Deliver results by calling `completeJob(job, result)` /
   `reportProgress()` / `failJob()` from `agent/jobs.js` (or keep using the HTTP
   callback if the model is a separate service).

Jobs, results, the database, chat handoff, notifications, the Results Dashboard
and the admin panel are all untouched - they only ever see the job and result
shapes above.

## 8. Security notes

- Callbacks are HMAC-verified in constant time; wrong/missing signature → 401.
- Agent output is untrusted: strings clamped, numbers coerced, links restricted
  to http(s), items/files capped, all before touching the database.
- The agent can only write to the job it was given; it can't reach other data.
- Uploaded plans are stored on the API server's own disk (not a third-party CDN)
  under unguessable names. Nginx must allow the upload size
  (`client_max_body_size 55M`, see `deploy/nginx-prod.conf.example`).
