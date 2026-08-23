import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// The integration suite's resetDb() truncates every table between tests —
// running that against the same database used for local dev/demo data
// would silently wipe seeded users/services on every `npm test`. Redirect
// to a dedicated `<name>_test` database instead, derived from the real
// DATABASE_URL so there is still only one password/host to maintain in .env.
const base = process.env.DATABASE_URL;
if (base) {
  process.env.DATABASE_URL = base.replace(/\/([\w-]+)(\?|$)/, "/$1_test$2");
}
