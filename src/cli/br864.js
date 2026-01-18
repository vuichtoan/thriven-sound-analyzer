import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { createLogger } from "../utils/logger.js";
import { prepBR864 } from "../core/br864.js";

const br864Command = new Command("prep-br864");

br864Command
  .description("Prepare stems_8/ for BR-864: convert to 44.1kHz 16-bit WAV (+ optional pad/trim)")
  .argument("<packDir>", "Path to pack folder")
  .option("--in <dir>", "Input folder", "stems_8")
  .option("--out <dir>", "Output folder", "br864_ready")
  .option("--pad-to-longest", "Pad all stems to the longest duration (best for alignment)", false)
  .option("--trim-to-shortest", "Trim all stems to the shortest duration", false)
  .option("-v, --verbose", "Verbose", false)
  .action(async (packDir, opt) => {
    const logger = createLogger(opt.verbose);
    logger.info(chalk.cyan("🎛️ Thriven – BR-864 Prep"));
    try {
      const res = await prepBR864({
        packDir: path.resolve(packDir),
        inDir: opt.in,
        outDir: opt.out,
        padToLongest: Boolean(opt.padToLongest),
        trimToShortest: Boolean(opt.trimToShortest),
        logger,
      });
      logger.info(chalk.green(`✅ br864_ready erstellt: ${res.outputPath}`));
      logger.info(chalk.gray(`Manifest: ${path.join(res.outputPath, "manifest.md")}`));
    } catch (e) {
      logger.error(chalk.red(`❌ ${e?.message ?? e}`));
      process.exit(1);
    }
  });

export { br864Command };
