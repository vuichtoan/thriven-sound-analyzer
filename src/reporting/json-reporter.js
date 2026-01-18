export function generateJsonReport(rankedIndex, { topN = 10 } = {}) {
  return {
    generated_at: new Date().toISOString(),
    total_files: rankedIndex.files.length,
    top_n: topN,
    top: rankedIndex.files.slice(0, topN),
  };
}
