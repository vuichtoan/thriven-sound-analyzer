import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { createLogger } from "../utils/logger.js";
import { generateStemmap, applyStemmap } from "../core/stemmap.js";

const stemmapCommand = new Command("stemmap");

stemmapCommand
  .description("Generate stemmap.yaml template from stems_raw/")
  .argument("<packDir>", "Path to pack folder")
  .option("--in <dir>", "Input folder inside pack", "stems_raw")
  .option("--out <file>", "Output yaml path inside pack", "stemmap.yaml")
  .option("--bpm-min <n>", "Min BPM", "90")
  .option("--bpm-max <n>", "Max BPM", "190")
  .option("--title <t>", "Pack title", "PACK")
  .option("-v, --verbose", "Verbose", false)
  .action(async (packDir, opt) => {
    const logger = createLogger(opt.verbose);
    logger.info(chalk.cyan("🧩 Thriven – stemmap (generate)"));
    const res = await generateStemmap({
      packDir: path.resolve(packDir),
      inDir: opt.in,
      outPath: opt.out,
      bpmMin: Number(opt.bpmMin),
      bpmMax: Number(opt.bpmMax),
      title: opt.title,
    });
    logger.info(chalk.green(`✅ stemmap.yaml erstellt: ${res.outFull} (${res.count} files)`));
    logger.info(chalk.gray("➡️ stemmap.yaml ausfüllen → dann apply-stemmap"));
  });

const applyStemmapCommand = new Command("apply-stemmap");

applyStemmapCommand
  .description("Apply stemmap.yaml: copy/rename into stems_8/")
  .argument("<packDir>", "Path to pack folder")
  .option("--map <file>", "stemmap.yaml path inside pack", "stemmap.yaml")
  .option("--in <dir>", "Input folder inside pack", "stems_raw")
  .option("--out <dir>", "Output folder inside pack", "stems_8")
  .option("-v, --verbose", "Verbose", false)
  .action(async (packDir, opt) => {
    const logger = createLogger(opt.verbose);
    logger.info(chalk.cyan("🧩 Thriven – apply-stemmap"));
    const res = await applyStemmap({
      packDir: path.resolve(packDir),
      stemmapPath: opt.map,
      inDir: opt.in,
      outDir: opt.out,
    });
    logger.info(chalk.green(`✅ Fertig: ${res.done} Dateien nach ${opt.out}/`));
    if (res.errors.length) {
      logger.warn(chalk.yellow(`⚠️ ${res.errors.length} Probleme:`));
      for (const e of res.errors.slice(0, 20)) logger.warn(chalk.yellow(`- ${e}`));
    }
  });

export { stemmapCommand, applyStemmapCommand };
