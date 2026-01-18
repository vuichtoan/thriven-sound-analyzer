import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import yaml from "js-yaml";

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function norm(s) {
  return (s || "").toLowerCase();
}

function guessTypeFromFilename(filename) {
  const f = norm(filename);
  const has = (...keys) => keys.some((k) => f.includes(k));
  if (has("kick")) return "KICK";
  if (has("bass", "sub")) return "BASS";
  if (has("drum", "beat", "groove", "break")) return "DRUMS";
  if (has("perc", "hat", "hihat", "shaker", "clap", "snare", "ride")) return "PERC";
  if (has("pad", "atmo", "ambient")) return "PADS";
  if (has("fx", "rise", "down", "sweep", "impact")) return "FX";
  if (has("vocal", "vox", "voice", "bvx", "hook")) return "VOCALS";
  if (has("synth", "lead", "stab", "arp", "acid")) return "SYNTH";
  return "UNKNOWN";
}

function slotPolicy() {
  return [
    { slot: "01", type: "KICK" },
    { slot: "02", type: "BASS" },
    { slot: "03", type: "DRUMS" },
    { slot: "04", type: "PERC" },
    { slot: "05", type: "SYNTH" },
    { slot: "06", type: "PADS" },
    { slot: "07", type: "FX" },
    { slot: "08", type: "VOCALS" },
  ];
}

function filenameSafe(s) {
  return (s || "UNTITLED")
    .replace(/[^\w\d\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildTargetName({ slot, type, bpm, key, title, ext }) {
  const bpmTag = bpm ? `BPM${bpm}` : "BPMx";
  const keyTag = key ? `KEY${key}` : "KEYx";
  const t = filenameSafe(title);
  return `${slot}_${type}_${bpmTag}_${keyTag}_${t}${ext}`;
}

export async function generateStemmap({ packDir, inDir = "stems_raw", outPath = "stemmap.yaml", bpmMin = 90, bpmMax = 190, title = "PACK" }) {
  const inputPath = path.join(packDir, inDir);
  const files = await glob(path.join(inputPath, "*.{wav,mp3,m4a,flac}"), { nocase: true });
  if (!files.length) throw new Error(`Keine Audio-Dateien gefunden in: ${inputPath}`);

  const map = {
    meta: {
      generated_at: new Date().toISOString(),
      pack_title: title,
      bpm_range: { min: bpmMin, max: bpmMax },
      policy: "BR-864 8-slot",
      note: "Ordne jede Datei einem Slot/Type zu. Slot 08 ist VOCALS/Backing Vocals.",
      in_dir: inDir,
      out_dir: "stems_8",
    },
    slots: slotPolicy(),
    items: files.sort((a, b) => a.localeCompare(b)).map((fp) => {
      const base = path.basename(fp);
      const ext = path.extname(base);
      const guess = guessTypeFromFilename(base);
      return {
        file: base,
        guess_type: guess,
        slot: null,
        type: null,
        bpm: null,
        key: null,
        title: base.slice(0, -ext.length),
        enabled: true,
        notes: "",
      };
    }),
  };

  const outFull = path.join(packDir, outPath);
  await ensureDir(path.dirname(outFull));
  await fs.writeFile(outFull, yaml.dump(map, { lineWidth: 120 }), "utf-8");
  return { outFull, count: map.items.length };
}

export async function applyStemmap({ packDir, stemmapPath = "stemmap.yaml", inDir = "stems_raw", outDir = "stems_8" }) {
  const mapFull = path.join(packDir, stemmapPath);
  const raw = await fs.readFile(mapFull, "utf-8");
  const data = yaml.load(raw);
  if (!data?.items?.length) throw new Error("stemmap.yaml hat keine items.");

  const inputPath = path.join(packDir, inDir);
  const outputPath = path.join(packDir, outDir);
  await ensureDir(outputPath);

  const errors = [];
  let done = 0;

  for (const item of data.items) {
    if (item.enabled === false) continue;
    const slot = item.slot;
    const type = item.type;
    if (!slot || !type) { errors.push(`Mapping fehlt (slot/type) für: ${item.file}`); continue; }

    const src = path.join(inputPath, item.file);
    const ext = path.extname(item.file);
    const targetName = buildTargetName({ slot, type, bpm: item.bpm || null, key: item.key || null, title: item.title || "UNTITLED", ext });
    const dst = path.join(outputPath, targetName);

    try {
      await fs.copyFile(src, dst);
      done++;
    } catch (e) {
      errors.push(`Copy failed ${item.file} -> ${targetName}: ${e?.message ?? e}`);
    }
  }

  return { done, errors };
}
