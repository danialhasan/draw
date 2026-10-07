# Draw

A shared whiteboard that turns rough ink into editable shapes. Built with Excalidraw, React, Vinext, and Cloudflare D1.

[Live demo](https://ink-to-form.dev717443.chatgpt.site/)

Draw shapes and arrows, add text, and share a board link to edit together. Sketch recognition groups nearby strokes, preserves arrowheads, and keeps the original ink when recognition is uncertain. You can also choose a shape explicitly without calling an AI service, and Undo restores the source strokes.

## Run locally

Requires Node.js 22.13 or later and npm.

```sh
git clone https://github.com/danialhasan/draw.git
cd draw
npm ci
npm run build
npx wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_green_shocker.sql
npm run dev
```

Open http://localhost:5173. Local D1 state lives in the ignored `.wrangler` directory. The database starts empty; create a board from the lobby. Do not run the initial schema SQL again against an existing database.

Drawing, collaboration, and explicit shape conversion work without an API key. For optional AI recognition, copy `.dev.vars.example` to `.dev.vars`, provide your own `OPENAI_API_KEY`, and restart the server. The current adapter uses the OpenAI Decisions API and model specified in `lib/decision.mjs`; your account must have access to that endpoint and model. A general OpenAI key alone does not guarantee access. Sketch images are sent to that service only when recognition runs. No API credentials are included in this repository.

## Collaboration and access

Anyone with a board link can edit it. Guest identities use a browser cookie, and the lobby lists boards that identity has joined. Clients poll for updates, reconcile element versions, and retain a browser recovery copy. Concurrent changes to different objects are merged; simultaneous edits to the same object resolve deterministically. Text is not a character-level CRDT. Image uploads are disabled.

Recognition is limited to 100 attempts per board per UTC day. This is a per-board limit, not an account spending cap. Uncertain or failed recognition preserves the ink and allows manual conversion.

## Deployment

The original demo runs on ChatGPT Sites. This source includes its Cloudflare/Vinext runtime adapter and a portable local preview. The `.openai/hosting.json` file declares the `DB` binding but intentionally contains no existing deployment identity.

A separate production deployment needs its own D1 database, schema initialization, runtime secrets, and hosting configuration. ChatGPT sign-in routes and identity headers depend on a trusted Sites hosting boundary; another host must implement that boundary or strip incoming `oai-authenticated-user-*` headers and use guest identities. Local mock sign-in is only for development. `npm run build` builds artifacts; it does not provision or deploy a production service.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests cover ink geometry and grouping, arrowheads, stroke continuation, idle recognition, stale conversions, deletion tombstones, and concurrent element revisions. They do not call the recognition service.

## License

MIT, copyright 2026 Danial Hasan. Third-party code retains its own license. See the notices in `build/sites-vite-plugin.LICENSE` and `vendor/shadcn-tailwind-4.13.0.LICENSE.md`; installed dependencies retain their respective licenses.
