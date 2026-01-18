import path from "path";
import { glob } from "glob";
import { ensureDir, saveText } from "../utils/file-utils.js";
import { getDurationSec, convertToWav } from "../audio/ffmpeg.js";

function slotFromName(filename) {
  const m = filename.match(/^(\d{2})_/);
  return m ? m[1] : null;
}

export async function prepBR864({ packDir, inDir = "stems_8", outDir = "br864_ready", padToLongest = false, trimToShortest = false, logger } = {}) {
  if (padToLongest && trimToShortest) throw new Error("Wähle nur eins: --pad-to-longest ODER --trim-to-shortest");

  const inputPath = path.join(packDir, inDir);
  const outputPath = path.join(packDir, outDir);
  await ensureDir(outputPath);

  const files = await glob(path.join(inputPath, "*.{wav,mp3,m4a,flac}"), { nocase: true });
  if (!files.length) throw new Error(`Keine Dateien in ${inputPath}`);

  const bySlot = new Map();
  for (const fp of files) {
    const name = path.basename(fp);
    const slot = slotFromName(name);
    if (slot) bySlot.set(slot, fp);
  }

  const required = ["01","02","03","04","05","06","07","08"];
  const missing = required.filter((s) => !bySlot.has(s));
  if (missing.length) throw new Error(`Fehlende Slots in ${inDir}: ${missing.join(", ")} (Tipp: erst apply-stemmap)`);

  const durations = {};
  for (const s of required) durations[s] = await getDurationSec(bySlot.get(s));

  const lens = Object.values(durations).filter((x) => Number.isFinite(x) && x > 0);
  const maxDur = lens.length ? Math.max(...lens) : null;
  const minDur = lens.length ? Math.min(...lens) : null;
  const target = padToLongest ? maxDur : (trimToShortest ? minDur : null);

  logger?.info?.(`BR-864 prep: mode=${padToLongest ? "pad-to-longest" : (trimToShortest ? "trim-to-shortest" : "as-is")} targetSec=${target ?? "none"}`);

  const results = [];
  for (const s of required) {
    const src = bySlot.get(s);
    const srcName = path.basename(src);
    const dstName = `${s}_${srcName.replace(/^\d{2}_/, "").replace(/\.(mp3|m4a|flac)$/i, ".wav")}`;
    const dst = path.join(outputPath, dstName);

    await convertToWav({ src, dst, targetSec: target, pad: padToLongest, trim: trimToShortest });

    results.push({ slot: s, source: srcName, out: dstName, duration_sec: durations[s] });
  }

  const now = new Date().toISOString();
  const manifest = [];
  manifest.push(`# BR-864 Ready Pack`);
  manifest.push("");
  manifest.push(`**Generated:** ${now}`);
  manifest.push(`**Input:** ${inDir}/`);
  manifest.push(`**Output:** ${outDir}/`);
  manifest.push(`**Mode:** ${padToLongest ? "pad-to-longest" : (trimToShortest ? "trim-to-shortest" : "as-is")}`);
  manifest.push("");
  manifest.push("## Slots (BR-864 / 8 Tracks)");
  manifest.push("| Slot | Source | Output WAV | Duration(s) |");
  manifest.push("|---:|---|---|---:|");
  for (const r of results) manifest.push(`| ${r.slot} | ${r.source} | ${r.out} | ${Number(r.duration_sec).toFixed(2)} |`);
  manifest.push("");
  manifest.push("## Ableton Import Hinweis");
  manifest.push("- Gleiche Länge = direkt aligned (Suno meistens).");
  manifest.push("- Wenn nicht: nutze `--pad-to-longest`.");
  manifest.push("");
  manifest.push("## BR-864 Hinweis");
  manifest.push("- Diese Stufe erzeugt **saubere WAVs**: 44.1kHz / 16-bit.");
  manifest.push("- Der genaue Import in den BR-864 hängt von deinem Transfer/Converter-Workflow ab.");
  manifest.push("");

  await saveText(path.join(outputPath, "manifest.md"), manifest.join("\n"));
  return { outputPath, results, targetSec: target };
}
