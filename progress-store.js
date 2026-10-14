// Saved learner progress, one JSON object per course + learner.
// On Vercel the filesystem is read-only, so progress goes to Upstash Redis.
// Locally (no Redis env vars) it falls back to ./data/<course>__<user>.json.

const fs = require("fs");
const path = require("path");

const key = (id, user) => `${id}__${user}`.replace(/[^\w.-]/g, "_");

// The Vercel Marketplace integration sets <prefix>KV_REST_API_URL / <prefix>KV_REST_API_TOKEN,
// where <prefix> is the optional custom prefix chosen when connecting (e.g. "scorm_test_").
// A direct Upstash setup uses UPSTASH_REDIS_REST_*.
const kvPrefix = Object.keys(process.env).find((k) => k.endsWith("KV_REST_API_URL"))?.slice(0, -"KV_REST_API_URL".length);
const url = process.env.UPSTASH_REDIS_REST_URL || (kvPrefix != null && process.env[`${kvPrefix}KV_REST_API_URL`]);
const token = process.env.UPSTASH_REDIS_REST_TOKEN || (kvPrefix != null && process.env[`${kvPrefix}KV_REST_API_TOKEN`]);

function redisStore() {
  const { Redis } = require("@upstash/redis");
  const redis = new Redis({ url, token });
  return {
    name: "Upstash Redis",
    get: (id, user) => redis.get(`progress:${key(id, user)}`),
    set: (id, user, data) => redis.set(`progress:${key(id, user)}`, data),
  };
}

function fileStore() {
  const DATA_DIR = path.join(__dirname, "data");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = (id, user) => path.join(DATA_DIR, `${key(id, user)}.json`);
  return {
    name: "local files (./data)",
    get: async (id, user) => {
      const f = file(id, user);
      return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
    },
    set: async (id, user, data) => fs.writeFileSync(file(id, user), JSON.stringify(data, null, 2)),
  };
}

module.exports = url && token ? redisStore() : fileStore();
