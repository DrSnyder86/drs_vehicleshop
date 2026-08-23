# DRS Vehicle Shop UI Previewer

This developer-only previewer loads the real `html/index.html`, `html/style.css`,
`html/script.js`, and bundled vehicle artwork. It supplies representative car, boat, and
air-shop data and intercepts the browser-side NUI callbacks with local mock responses.
It cannot call FiveM, Lua, oxmysql, or the database.

## Start it

From the `drs_vehicleshop` resource folder, run:

```powershell
node preview/server.mjs
```

Then open:

```text
http://127.0.0.1:4173/preview/
```

No package installation or build step is required. Use `Ctrl+C` to stop the server. To
use another port:

```powershell
node preview/server.mjs --port 4174
```

Opening `preview/index.html` directly with `file://` is intentionally unsupported. The
local HTTP origin is what lets the control panel safely mock the real UI iframe without
adding preview code to the production NUI.

## What it can preview

- automotive, marine, and aviation shop payloads;
- catalogue, details, checkout configuration, quote review, processing, and errors;
- no-results, hidden/handoff, test-drive timer, and legacy dealer-form states;
- the production responsive breakpoints at several exact CSS viewport sizes;
- different simulated game-canvas backdrops;
- live CSS overrides, with buttons to copy or reset the override block;
- successful, failed, delayed, and intentionally pending NUI callback responses; and
- the exact callback endpoint and payload emitted by UI interactions.

The fixture catalogue lives in `preview/fixtures.js`. Keep its payload shape aligned with
the client `open` message when the production NUI contract changes.

## Production isolation

The `preview` directory is not listed in `fxmanifest.lua`, and none of its scripts are
loaded by `html/index.html`. The local server binds only to `127.0.0.1`, serves only the
`preview/` and `html/` directories, accepts only `GET` and `HEAD`, and disables caching.
All five UI callbacks are handled in memory with mock data.
