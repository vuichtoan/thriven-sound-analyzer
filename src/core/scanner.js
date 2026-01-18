import path from "path";
import fs from "fs/promises";
import { glob } from "glob";
import { parseFile } from "music-metadata";
import { v4 as uuidv4 } from "uuid";
import { sha256File } from "../utils/hash-utils.js";
import { ffprobeJson } from "../audio/ffmpeg.js";

export async function scanFolder(folderPath, { formats = ["wav","mp3","m4a","flac"], recursive = true, logger } = {}) {
  const pattern = recursive ? "**/*" : "*";
  const exts = formats.map((f) => f.replace(".", "").toLowerCase());
  const files = await glob(path.join(folderPath, `${pattern}.{${exts.join(",")}}`), { nocase: true });

  const items = [];
  const hashMap = new Map();
  let totalSize = 0;

  for (const fp of files) {
    try {
      const stat = await fs.stat(fp);
      totalSize += stat.size;

      const mm = await parseFile(fp, { duration: false }).catch(() => null);
      const tags = mm?.common ?? {};
      const hash = await sha256File(fp);

      const probe = await ffprobeJson(fp).catch(() => null);
      const durationSec = probe?.format?.duration ? Number(probe.format.duration) : null;
      const codec = probe?.streams?.[0]?.codec_name ?? null;
      const bitrate = probe?.format?.bit_rate ? Math.round(Number(probe.format.bit_rate) / 1000) : null;

      const id = uuidv4();
      items.push({
        id,
        path: fp,
        filename: path.basename(fp),
        size_bytes: stat.size,
        hash,
        codec,
        bitrate_kbps: bitrate,
        duration_sec: durationSec,
        metadata: {
          title: tags.title ?? null,
          artist: tags.artist ?? null,
          album: tags.album ?? null,
          genre: Array.isArray(tags.genre) ? tags.genre : (tags.genre ? [tags.genre] : []),
        },
        user_rating: null
      });

      const list = hashMap.get(hash) ?? [];
      list.push(id);
      hashMap.set(hash, list);
    } catch (e) {
      logger?.warn?.(`scan skip ${fp}: ${e?.message ?? e}`);
    }
  }

  const duplicates = [];
  for (const [hash, ids] of hashMap.entries()) {
    if (ids.length > 1) duplicates.push({ hash, files: ids });
  }

  return {
    metadata: {
      scan_date: new Date().toISOString(),
      folder: folderPath,
      total_files: items.length,
      total_size_bytes: totalSize,
    },
    files: items,
    duplicates,
  };
}
