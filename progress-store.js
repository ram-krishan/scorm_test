// Saved learner progress, one JSON object per course + learner.
// On Vercel the filesystem is read-only, so progress goes to Upstash Redis.
// Locally (no Redis env vars) it falls back to ./data/<course>__<user>.json.

const fs = require("fs");
const path = require("path");

const key = (id, user) => `${id}__${user}`.replace(/[^\w.-]/g, "_");

// The Vercel Marketplace integration sets KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

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
