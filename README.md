# SCORM Test Kit (scorm-again, no SCORM Cloud)

## Run
```bash
npm install
node server.js
```
Open http://localhost:3000, pick a course, take the quiz, click Exit, reopen to see resume.

## Folders
- `packages/` – put SCORM .zip files here (two samples included). Restart the server to extract them.
- `courses/`  – extracted courses (auto-created, served on the same origin as the player)
- `data/`     – saved learner progress, one JSON per course + learner
- `public/player.html` – the player: creates `window.API` (1.2) or `window.API_1484_11` (2004) with scorm-again, then loads the course in an iframe
- `samples/`  – unzipped source of the two sample courses

## Sample packages
- `sample-scorm12.zip`   – SCORM 1.2 quiz (score, pass/fail, suspend_data, resume)
- `sample-scorm2004.zip` – same quiz in SCORM 2004 (completion + success status)

More free test packages: Rustici "Golf Examples"
https://scorm.com/scorm-explained/technical-scorm/golf-examples/
(start with "SCORM 2004 Basic Run-time" or the SCORM 1.2 run-time examples).
Multi-SCO / sequencing examples will only launch the first SCO in this kit.
