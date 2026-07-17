// Loads .env before any other module reads process.env.
// Must be the FIRST import in server/index.js — ESM evaluates imports
// before the importing module's body, so inline loading is too late.
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  // no .env file — defaults apply, mail stays disabled
}
