import fs from "fs/promises";
import path from "path";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function loadJson(p) {
  const s = await fs.readFile(p, "utf-8");
  return JSON.parse(s);
}

export async function saveJson(p, obj) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf-8");
}

export async function saveText(p, text) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, text, "utf-8");
}

export async function copyFileSafe(src, dst) {
  await ensureDir(path.dirname(dst));
  await fs.copyFile(src, dst);
}
