import PQueue from "p-queue";
import { analyzeLoudness, analyzeAstats, analyzeSilence, getDurationSec } from "../audio/ffmpeg.js";

export async function analyzeBatch(rawIndex, {
  extractLoudness = true,
  extractSilence = true,
  parallelWorkers = 4,
  logger,
} = {}) {
  const q = new PQueue({ concurrency: Math.max(1, Number(parallelWorkers) || 1) });

  const tasks = rawIndex.files.map((f) =>
    q.add(async () => {
      const duration = f.duration_sec ?? await getDurationSec(f.path).catch(() => 0);

      let loud = { lufs: null, truePeak: null, lra: null };
      let ast = { peakDb: null, rmsDb: null };
      let sil = { silenceSec: null, silencePercent: null };

      if (extractLoudness) {
        try { loud = await analyzeLoudness(f.path); } catch (e) { logger?.warn?.(`loudness fail ${f.filename}: ${e?.message ?? e}`); }
        try { ast = await analyzeAstats(f.path); } catch (e) { logger?.warn?.(`astats fail ${f.filename}: ${e?.message ?? e}`); }
      }

      if (extractSilence) {
        try { sil = await analyzeSilence(f.path, Number(duration) || 0); } catch (e) { logger?.warn?.(`silence fail ${f.filename}: ${e?.message ?? e}`); }
      }

      const peak = ast.peakDb ?? loud.truePeak ?? null;

      // Loopability (MVP-Heuristik)
      const silenceOk = sil.silencePercent != null ? sil.silencePercent < 2.0 : true;
      const peakOk = peak != null ? peak < -0.3 : true;
      const durOk = duration != null ? duration >= 10 && duration <= 120 : true;

      const loopability = (
        (silenceOk ? 0.35 : 0.0) +
        (peakOk ? 0.35 : 0.0) +
        (durOk ? 0.30 : 0.0)
      );

      return {
        ...f,
        duration_sec: duration,
        audio_analysis: {
          loudness_lufs: loud.lufs,
          true_peak_db: loud.truePeak,
          peak_db: ast.peakDb,
          rms_db: ast.rmsDb,
          lra: loud.lra,
          silence_percent: sil.silencePercent,
          loopability_heuristic: Number(loopability.toFixed(3)),
        },
      };
    })
  );

  const files = await Promise.all(tasks);
  return {
    metadata: {
      analysis_date: new Date().toISOString(),
      total_files: files.length,
      options: { extractLoudness, extractSilence, parallelWorkers },
    },
    files,
  };
}
