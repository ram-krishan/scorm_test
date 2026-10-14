// Build step (runs locally via `npm start` and on Vercel via `npm run build`).
// Vercel's filesystem is read-only at runtime and ignores express.static(),
// so everything static must be prepared here, inside ./public:
// 1. Unzip every package in ./packages into ./public/courses/<name>
// 2. Copy scorm-again into ./public/lib
// 3. Read each imsmanifest.xml -> ./courses.json (title, SCORM version, launch file, tags from packages/tags.json,
//    download URL from packages/sources.json)

const AdmZip = require("adm-zip");
const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PKG_DIR = path.join(ROOT, "packages");
const COURSE_DIR = path.join(ROOT, "public", "courses");
const LIB_DIR = path.join(ROOT, "public", "lib");
[PKG_DIR, COURSE_DIR, LIB_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// --- 1. Unzip packages ---
for (const file of fs.readdirSync(PKG_DIR)) {
  if (!file.toLowerCase().endsWith(".zip")) continue;
  const dest = path.join(COURSE_DIR, path.basename(file, ".zip"));
  fs.rmSync(dest, { recursive: true, force: true }); // always re-extract so an updated zip replaces the old files
  new AdmZip(path.join(PKG_DIR, file)).extractAllTo(dest, true);
  console.log("Extracted", file);
}

// --- 2. Copy scorm-again ---
const SCORM_AGAIN = path.join(ROOT, "node_modules", "scorm-again", "dist");
for (const f of ["scorm-again.min.js", "scorm-again.min.js.map"]) {
  fs.copyFileSync(path.join(SCORM_AGAIN, f), path.join(LIB_DIR, f));
}

// --- 3. Read imsmanifest.xml -> courses.json ---
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

// optional labels shown on the course list, e.g. { "sample-scorm12": ["AI generated"] }
const TAGS_FILE = path.join(PKG_DIR, "tags.json");
const tags = fs.existsSync(TAGS_FILE) ? JSON.parse(fs.readFileSync(TAGS_FILE, "utf8")) : {};

// optional URL each downloaded package came from, e.g. { "RuntimeBasicCalls_SCORM12": "https://scorm.com/..." }
const SOURCES_FILE = path.join(PKG_DIR, "sources.json");
const sources = fs.existsSync(SOURCES_FILE) ? JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8")) : {};

const courses = fs.readdirSync(COURSE_DIR).map(readManifest).filter(Boolean)
  .map((c) => ({ ...c, tags: tags[c.id] || [], source: sources[c.id] || null }));
fs.writeFileSync(path.join(ROOT, "courses.json"), JSON.stringify(courses, null, 2));
console.log(`Wrote courses.json (${courses.length} courses)`);
