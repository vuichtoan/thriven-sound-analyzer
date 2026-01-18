import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { createLogger } from "../utils/logger.js";
import { loadConfig } from "../utils/config-loader.js";
import { saveJson } from "../utils/file-utils.js";
import { scanFolder } from "../core/scanner.js";
import { analyzeBatch } from "../core/analyzer.js";
import { rankFiles } from "../core/scorer.js";
import { exportTop } from "../core/exporter.js";

const processCommand = new Command("process");

processCommand
  .description("All-in-one: scan → analyze → rank → export")
  .argument("<folder>", "Path to audio folder")
  .option("-c, --config <profile>", "Config profile", "mvp")
  .option("--top <n>", "Top N", "10")
  .option("--out <dir>", "Output base dir", "./thriven_out")
  .option("-p, --parallel <n>", "Parallel workers", "4")
  .option("--no-loudness", "Skip loudness analysis")
  .option("--no-silence", "Skip silence detection")
  .option("-v, --verbose", "Verbose", false)
  .action(async (folder, opt) => {
    const logger = createLogger(opt.verbose);
    logger.info(chalk.cyan("🎛️ Thriven – Process"));
    try {
      const cfg = await loadConfig(opt.config);

      const scan = await scanFolder(folder, { formats: cfg.scan.formats, recursive: cfg.scan.recursive, logger });
      const scanPath = path.join(opt.out, "analysis", "raw_index.json");
      await saveJson(scanPath, scan);

      const analysis = await analyzeBatch(scan, {
        extractLoudness: opt.loudness !== false,
        extractSilence: opt.silence !== false,
        parallelWorkers: parseInt(opt.parallel, 10),
        logger,
      });
      const analysisPath = path.join(opt.out, "analysis", "analysis_index.json");
      await saveJson(analysisPath, analysis);

      const ranked = rankFiles(analysis, cfg);
      const rankedPath = path.join(opt.out, "analysis", "ranked_index.json");
      await saveJson(rankedPath, ranked);

      const exportsDir = path.join(opt.out, "exports");
      await exportTop(ranked, { outDir: exportsDir, topN: parseInt(opt.top, 10), rename: true });

      logger.info(chalk.green("✅ Done"));
      logger.info(chalk.gray(`Ranked: ${rankedPath}`));
      logger.info(chalk.gray(`Exports: ${exportsDir}`));
    } catch (e) {
      logger.error(chalk.red(`❌ ${e?.message ?? e}`));
      process.exit(1);
    }
  });

export { processCommand };
