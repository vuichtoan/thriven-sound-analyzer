export function scoreFile(file, config) {
  const w = config?.scoring?.weights ?? { duration_fit: 0.35, loudness_fit: 0.30, loopability: 0.25, user_rating: 0.10 };
  const ideal = config?.scoring?.loudness_targets?.ideal_lufs ?? -14;
  const tol = config?.scoring?.loudness_targets?.tolerance ?? 2;

  const dur = Number(file.duration_sec ?? 0);
  const lufs = file.audio_analysis?.loudness_lufs;
  const loop = Number(file.audio_analysis?.loopability_heuristic ?? 0);

  let durationFit = 0;
  if (dur >= 8 && dur <= 32) durationFit = 1.0;
  else if (dur >= 4 && dur < 8) durationFit = 0.6;
  else if (dur > 32 && dur <= 64) durationFit = 0.9;
  else if (dur > 64 && dur <= 120) durationFit = 0.4;
  else durationFit = 0.0;

  let loudnessFit = 0.5;
  if (typeof lufs === "number" && Number.isFinite(lufs)) {
    const diff = Math.abs(lufs - ideal);
    if (diff <= tol) loudnessFit = 1.0;
    else if (diff <= tol + 2) loudnessFit = 0.7;
    else if (diff <= tol + 4) loudnessFit = 0.4;
    else loudnessFit = 0.0;
  }

  const r = Number(file.user_rating ?? 0);
  let ratingFit = 0;
  if (r >= 5) ratingFit = 1.0;
  else if (r >= 4) ratingFit = 0.5;

  const score01 =
    durationFit * w.duration_fit +
    loudnessFit * w.loudness_fit +
    loop * w.loopability +
    ratingFit * w.user_rating;

  const score = Math.max(0, Math.min(100, score01 * 100));
  return Number(score.toFixed(2));
}

export function rankFiles(analysisIndex, config) {
  const ranked = analysisIndex.files.map((f) => ({ ...f, score: scoreFile(f, config) }))
    .sort((a,b) => b.score - a.score);

  return {
    metadata: { ranked_date: new Date().toISOString(), total_files: ranked.length },
    files: ranked,
  };
}
