import { Command } from "commander";
import chalk from "chalk";
import { loadJson, saveJson } from "../utils/file-utils.js";
import { loadConfig } from "../utils/config-loader.js";
import { createLogger } from "../utils/logger.js";
import { rankFiles } from "../core/scorer.js";
import { exportTop } from "../core/exporter.js";

const exportCommand = new Command("export");

exportCommand
  .description("Rank analysis_index.json and export top N + reports")
  .argument("<analysisIndex>", "Path to analysis_index.json")
  .option("-t, --top <n>", "Top N to export", "10")
  .option("-o, --output <dir>", "Export folder", "./exports")
  .option("--save-ranked <path>", "Also save ranked_index.json", "")
  .option("-c, --config <profile>", "Config profile", "mvp")
  .option("-v, --verbose", "Verbose", false)
  .action(async (analysisPath, opt) => {
    const logger = createLogger(opt.verbose);
    logger.info(chalk.cyan("🎵 Thriven – Export"));
    try {
      const analysisIndex = await loadJson(analysisPath);
      const cfg = await loadConfig(opt.config);
      const ranked = rankFiles(analysisIndex, cfg);
      if (opt.saveRanked) await saveJson(opt.saveRanked, ranked);
      const res = await exportTop(ranked, { outDir: opt.output, topN: parseInt(opt.top, 10), rename: true });
      logger.info(chalk.green(`✅ Exported Top-${res.topN} to ${res.bestDir}`));
    } catch (e) {
      logger.error(chalk.red(`❌ ${e?.message ?? e}`));
      process.exit(1);
    }
  });

export { exportCommand };
