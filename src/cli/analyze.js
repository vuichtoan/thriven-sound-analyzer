import { Command } from "commander";
import chalk from "chalk";
import { analyzeBatch } from "../core/analyzer.js";
import { loadJson, saveJson } from "../utils/file-utils.js";
import { loadConfig } from "../utils/config-loader.js";
import { createLogger } from "../utils/logger.js";

const analyzeCommand = new Command("analyze");

analyzeCommand
  .description("Analyze audio features from raw_index.json")
  .argument("<index>", "Path to raw_index.json")
  .option("-o, --output <path>", "Output analysis JSON", "./analysis/analysis_index.json")
  .option("--no-loudness", "Skip loudness analysis")
  .option("--no-silence", "Skip silence detection")
  .option("-p, --parallel <n>", "Parallel workers", "4")
  .option("-c, --config <profile>", "Config profile", "mvp")
  .option("-v, --verbose", "Verbose", false)
  .action(async (indexPath, options) => {
    const logger = createLogger(options.verbose);
    logger.info(chalk.cyan("🎵 Thriven – Analyze"));
    try {
      await loadConfig(options.config);
      const rawIndex = await loadJson(indexPath);
      const result = await analyzeBatch(rawIndex, {
        extractLoudness: options.loudness !== false,
        extractSilence: options.silence !== false,
        parallelWorkers: parseInt(options.parallel, 10),
        logger,
      });
      await saveJson(options.output, result);
      logger.info(chalk.green(`✅ Saved: ${options.output}`));
    } catch (e) {
      logger.error(chalk.red(`❌ ${e?.message ?? e}`));
      process.exit(1);
    }
  });

export { analyzeCommand };
