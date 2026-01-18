export function generateMarkdownReport(rankedIndex, { topN = 10, title = "Thriven Sound Analyzer – Report" } = {}) {
  const top = rankedIndex.files.slice(0, topN);
  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Total:** ${rankedIndex.files.length}`);
  lines.push(`**Top-N:** ${topN}`);
  lines.push("");
  lines.push("| Rank | File | Dur(s) | LUFS | Peak(dB) | Silence% | Loop | Score |");
  lines.push("|---:|---|---:|---:|---:|---:|---:|---:|");
  top.forEach((f, i) => {
    const a = f.audio_analysis ?? {};
    lines.push(`| ${i+1} | ${f.filename} | ${Number(f.duration_sec ?? 0).toFixed(2)} | ${a.loudness_lufs ?? ""} | ${a.peak_db ?? a.true_peak_db ?? ""} | ${a.silence_percent != null ? a.silence_percent.toFixed(2) : ""} | ${a.loopability_heuristic ?? ""} | **${f.score}** |`);
  });
  lines.push("");
  lines.push("## Notes");
  lines.push("- Loop ist im MVP eine Heuristik (Silence/Peak/Duration).");
  lines.push("- Suno gleiche Länge bei Stems = Alignment-Vorteil.");
  lines.push("");
  return lines.join("\n");
}
