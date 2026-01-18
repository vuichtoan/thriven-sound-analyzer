import { Command } from "commander";
import chalk from "chalk";
import { scanFolder } from "../core/scanner.js";
import { saveJson } from "../utils/file-utils.js";
import { loadConfig } from "../utils/config-loader.js";
import { createLogger } from "../utils/logger.js";

const scanCommand = new Command("scan");

scanCommand
  .description("Scan audio folder and extract metadata + hash")
  .argument("<folder>", "Path to audio folder")
  .option("-o, --output <path>", "Output JSON path", "./analysis/raw_index.json")
  .option("-c, --config <profile>", "Config profile", "mvp")
  .option("--formats <list>", "Audio formats (comma-separated)", "wav,mp3,m4a,flac")
  .option("-r, --recursive", "Scan subdirectories", true)
  .option("-v, --verbose", "Verbose", false)
  .action(async (folder, options) => {
    const logger = createLogger(options.verbose);
    logger.info(chalk.cyan("🎵 Thriven – Scan"));
    try {
      await loadConfig(options.config);
      const formats = options.formats.split(",").map((f) => f.trim().toLowerCase());
      const result = await scanFolder(folder, { formats, recursive: options.recursive, logger });
      await saveJson(options.output, result);
      logger.info(chalk.green(`✅ Saved: ${options.output} (${result.files.length} files)`));
    } catch (e) {
      logger.error(chalk.red(`❌ ${e?.message ?? e}`));
      process.exit(1);
    }
  });

export { scanCommand };
