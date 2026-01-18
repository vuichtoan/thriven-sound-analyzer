import { spawn } from "child_process";

function run(cmd, args, { timeoutMs = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let killed = false;

    let t = null;
    if (timeoutMs > 0) {
      t = setTimeout(() => {
        killed = true;
        p.kill("SIGKILL");
      }, timeoutMs);
    }

    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));

    p.on("error", (e) => {
      if (t) clearTimeout(t);
      reject(e);
    });

    p.on("close", (code) => {
      if (t) clearTimeout(t);
      if (killed) return reject(new Error(`${cmd} timeout`));
      if (code !== 0) return reject(new Error(`${cmd} exited ${code}: ${err.slice(0, 4000)}`));
      resolve({ out, err });
    });
  });
}

export async function ffprobeJson(filePath) {
  const args = [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ];
  const { out } = await run("ffprobe", args);
  return JSON.parse(out);
}

export async function getDurationSec(filePath) {
  const j = await ffprobeJson(filePath);
  const d = Number(j?.format?.duration ?? 0);
  return Number.isFinite(d) ? d : 0;
}

// LUFS via loudnorm JSON (stderr)
export async function analyzeLoudness(filePath) {
  const args = [
    "-hide_banner", "-nostats",
    "-i", filePath,
    "-af", "loudnorm=print_format=json",
    "-f", "null",
    "-"
  ];
  const { err } = await run("ffmpeg", args, { timeoutMs: 5 * 60 * 1000 });
  const jsonMatch = err.match(/\{[\s\S]*?\}\s*$/m);
  if (!jsonMatch) return { lufs: null, truePeak: null, lra: null };
  const j = JSON.parse(jsonMatch[0]);
  return {
    lufs: j?.input_i != null ? Number(j.input_i) : null,
    truePeak: j?.input_tp != null ? Number(j.input_tp) : null,
    lra: j?.input_lra != null ? Number(j.input_lra) : null,
  };
}

// Peak/RMS via astats
export async function analyzeAstats(filePath) {
  const args = [
    "-hide_banner", "-nostats",
    "-i", filePath,
    "-af", "astats=metadata=1:reset=1",
    "-f", "null",
    "-"
  ];
  const { err } = await run("ffmpeg", args, { timeoutMs: 5 * 60 * 1000 });

  const peakMatch = err.match(/Overall\s+peak_level\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const rmsMatch = err.match(/Overall\s+RMS\s+level\s*dB\s*:\s*(-?\d+(?:\.\d+)?)/i);

  return {
    peakDb: peakMatch ? Number(peakMatch[1]) : null,
    rmsDb: rmsMatch ? Number(rmsMatch[1]) : null,
  };
}

// Silence percent via silencedetect
export async function analyzeSilence(filePath, durationSec) {
  const args = [
    "-hide_banner", "-nostats",
    "-i", filePath,
    "-af", "silencedetect=noise=-50dB:d=0.20",
    "-f", "null",
    "-"
  ];
  const { err } = await run("ffmpeg", args, { timeoutMs: 5 * 60 * 1000 });
  const ends = [...err.matchAll(/silence_end:\s*(\d+(?:\.\d+)?)\s*\|\s*silence_duration:\s*(\d+(?:\.\d+)?)/g)]
    .map((m) => ({ dur: Number(m[2]) }));
  const totalSilence = ends.reduce((a, x) => a + (Number.isFinite(x.dur) ? x.dur : 0), 0);
  const dur = durationSec > 0 ? durationSec : 0;
  const percent = dur > 0 ? (totalSilence / dur) * 100 : null;
  return { silenceSec: totalSilence, silencePercent: percent };
}

export async function convertToWav({ src, dst, targetSec = null, pad = false, trim = false }) {
  const filters = [];
  if (pad) filters.push("apad");
  const af = filters.length ? filters.join(",") : null;

  const args = ["-y", "-hide_banner", "-nostats", "-i", src];
  if (af) args.push("-af", af);
  if (targetSec != null && (pad || trim)) args.push("-t", String(targetSec));
  args.push("-ar", "44100", "-acodec", "pcm_s16le", dst);

  await run("ffmpeg", args, { timeoutMs: 10 * 60 * 1000 });
}
