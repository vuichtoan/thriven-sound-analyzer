import path from "path";
import { copyFileSafe, ensureDir, saveText, saveJson } from "../utils/file-utils.js";
import { generateMarkdownReport } from "../reporting/markdown-reporter.js";
import { generateJsonReport } from "../reporting/json-reporter.js";

function filenameSafe(s) {
  return (s || "UNTITLED")
    .replace(/[^\w\d\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function exportTop(rankedIndex, { outDir = "./exports", topN = 10, rename = true } = {}) {
  const bestDir = path.join(outDir, "best_of_pack");
  await ensureDir(bestDir);

  const top = rankedIndex.files.slice(0, topN);
  for (let i = 0; i < top.length; i++) {
    const f = top[i];
    const ext = path.extname(f.filename) || ".wav";
    const baseTitle = f.metadata?.title || path.basename(f.filename, ext);
    const base = rename ? `${String(i+1).padStart(2,"0")}_${filenameSafe(baseTitle)}${ext}` : f.filename;
    await copyFileSafe(f.path, path.join(bestDir, base));
  }

  const md = generateMarkdownReport(rankedIndex, { topN });
  const jr = generateJsonReport(rankedIndex, { topN });
  await saveText(path.join(outDir, "report.md"), md);
  await saveJson(path.join(outDir, "report.json"), jr);

  return { bestDir, topN };
}
