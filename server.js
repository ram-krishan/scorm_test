// Minimal self-hosted SCORM player using scorm-again (no SCORM Cloud).
// 1. Put SCORM .zip files in ./packages
// 2. npm install && node server.js
// 3. Open http://localhost:3000

const express = require("express");
const AdmZip = require("adm-zip");
const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PKG_DIR = path.join(__dirname, "packages");
const COURSE_DIR = path.join(__dirname, "courses");
const DATA_DIR = path.join(__dirname, "data");
[PKG_DIR, COURSE_DIR, DATA_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// --- 1. Unzip every package in ./packages into ./courses/<name> ---
for (const file of fs.readdirSync(PKG_DIR)) {
  if (!file.toLowerCase().endsWith(".zip")) continue;
  const dest = path.join(COURSE_DIR, path.basename(file, ".zip"));
  if (fs.existsSync(dest)) continue;
  new AdmZip(path.join(PKG_DIR, file)).extractAllTo(dest, true);
  console.log("Extracted", file);
}

// --- 2. Read imsmanifest.xml -> title, SCORM version, launch file ---
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
function readManifest(courseId) {
  const file = path.join(COURSE_DIR, courseId, "imsmanifest.xml");
  if (!fs.existsSync(file)) return null;
  const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: true })
    .parse(fs.readFileSync(file, "utf8"));
  const m = xml.manifest;
  const schemaVersion = String(m.metadata?.schemaversion ?? "1.2");
  const version = schemaVersion.includes("1.2") ? "1.2" : "2004";

  const orgs = m.organizations;
  const org = arr(orgs.organization).find((o) => o["@identifier"] === orgs["@default"]) || arr(orgs.organization)[0];

  // first item (depth-first) that points to a resource = launch SCO
  const firstItem = (items) => {
    for (const it of arr(items)) {
      if (it["@identifierref"]) return it;
      const child = firstItem(it.item);
      if (child) return child;
    }
  };
  const item = firstItem(org.item);
  const res = arr(m.resources.resource).find((r) => r["@identifier"] === item["@identifierref"]);
  const base = (m.resources["@base"] || "") + (res["@base"] || "");
  const launch = base + res["@href"] + (item["@parameters"] || "");

  return { id: courseId, title: org.title || courseId, version, launch };
}

// --- 3. Routes ---
// type "*/*": the final save on exit is sent via navigator.sendBeacon as text/plain
app.use("/api", express.json({ limit: "5mb", type: "*/*" }));
app.use("/courses", express.static(COURSE_DIR));          // course files (same origin!)
app.use("/lib", express.static(path.join(__dirname, "node_modules/scorm-again/dist")));
app.use(express.static(path.join(__dirname, "public")));  // player.html

app.get("/api/courses", (req, res) => {
  const list = fs.readdirSync(COURSE_DIR).map(readManifest).filter(Boolean);
  res.json(list);
});

app.get("/api/courses/:id", (req, res) => {
  const c = readManifest(req.params.id);
  c ? res.json(c) : res.status(404).json({ error: "Course not found" });
});

const dataFile = (id, user) => path.join(DATA_DIR, `${id}__${user}.json`.replace(/[^\w.-]/g, "_"));

// saved progress for resume
app.get("/api/progress/:id/:user", (req, res) => {
  const f = dataFile(req.params.id, req.params.user);
  res.json(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
});

// scorm-again POSTs here on every commit
app.post("/api/progress/:id/:user", (req, res) => {
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ result: false, errorCode: 101 });
  fs.writeFileSync(dataFile(req.params.id, req.params.user), JSON.stringify(req.body, null, 2));
  const core = req.body?.cmi?.core;
  console.log(`[commit] ${req.params.id} / ${req.params.user}`,
    core ? `status=${core.lesson_status} score=${core.score?.raw ?? ""}` :
           `completion=${req.body?.cmi?.completion_status} success=${req.body?.cmi?.success_status}`);
  res.json({ result: true, errorCode: 0 });
});

app.listen(PORT, () => console.log(`SCORM player running: http://localhost:${PORT}`));
