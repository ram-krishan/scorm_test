# SCORM Test Kit (scorm-again, no SCORM Cloud)

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000, pick a course, take the quiz, click Exit, reopen to see resume.

`npm start` runs `scripts/build.js` (unzips packages, copies scorm-again, writes `courses.json`), then starts `server.js`.
Without Redis env vars, progress is saved to `./data`.

## Deploy to Vercel
1. Push this repo to GitHub and import it at https://vercel.com/new (no settings to change — Vercel detects Express and runs `npm run build`).
2. In the Vercel project: **Storage → Create / Connect → Upstash (Redis)** and connect it to the project.
   This adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which `progress-store.js` uses automatically.
3. Redeploy so the new env vars are picked up.

Vercel's filesystem is read-only, which is why progress lives in Redis there, and why courses are unzipped at build time.

## Folders
- `packages/` – put SCORM .zip files here (samples included). Re-run `npm start` / redeploy to pick up new ones.
- `public/` – static files: `index.html` (course list), `player.html` (the player)
  - `public/courses/` – extracted courses (generated, served on the same origin as the player)
  - `public/lib/` – scorm-again (generated)
- `scripts/build.js` – build step described above
- `progress-store.js` – progress storage: Upstash Redis if configured, else `./data`
- `data/` – local learner progress, one JSON per course + learner
- `samples/` – unzipped source of the two sample courses

`public/player.html` creates `window.API` (1.2) or `window.API_1484_11` (2004) with scorm-again, then loads the course in an iframe.

## Sample packages
- `sample-scorm12.zip`   – SCORM 1.2 quiz (score, pass/fail, suspend_data, resume)
- `sample-scorm2004.zip` – same quiz in SCORM 2004 (completion + success status)

More free test packages: Rustici "Golf Examples"
https://scorm.com/scorm-explained/technical-scorm/golf-examples/
(start with "SCORM 2004 Basic Run-time" or the SCORM 1.2 run-time examples).
Multi-SCO / sequencing examples will only launch the first SCO in this kit.
