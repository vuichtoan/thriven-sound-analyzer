import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadConfig(profile = "mvp") {
  const p = path.join(__dirname, "..", "..", "config", "profiles", `${profile}.yaml`);
  const raw = await fs.readFile(p, "utf-8");
  return yaml.load(raw);
}
